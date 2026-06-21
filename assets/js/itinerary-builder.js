/**
 * itinerary-builder.js — BackpackersBible.com "Build your own itinerary" tool
 *
 * Loaded ONLY when the person clicks the "Build your own itinerary" button
 * below the map — never on page load — so it has zero effect on initial
 * page weight or Lighthouse score.
 *
 * Depends on:
 *   /assets/data/hostels.json
 *   /assets/data/regions.json
 * and talks to the already-embedded MapLibre map iframe via postMessage
 * (BB_SELECT_MODE / BB_REGION_TOGGLED / BB_OPEN_HOSTEL — see hostel-map.js).
 *
 * Usage (already wired into the button below the map on every page):
 *   <script src="/assets/js/itinerary-builder.js" defer></script>
 *   window.BB_ITINERARY_INIT({ mount: '#bb-itinerary-mount',
 *                               mapFrame: document.querySelector('.bb-map-iframe'),
 *                               currentRegion: 'cederberg' });
 */
(function () {
  'use strict';

  // ───────────────────────────────────────────────────────────────────────
  // BRAND / DESIGN TOKENS — pulled from style-2.css so this file matches
  // the rest of the site even though its CSS lives in its own <style> tag
  // (one network request, per Geoff's preference, instead of a separate
  // .css file).
  // ───────────────────────────────────────────────────────────────────────
  const BRAND_RED    = '#bc1d23';
  const BRAND_YELLOW = '#FFD700';
  const GOLD         = '#c9961f'; // deeper, more golden yellow — used for circles (step dots, route numbers) so they read distinctly against the brand-yellow panel background
  const BLUE_LINK    = '#0000e0';
  const FONT_STACK   = "'Century Gothic', 'CenturyGothic', AppleGothic, sans-serif";

  // Approximate EUR conversion for ZAR prices shown to international
  // readers. Updated occasionally — not live-fetched, to avoid an extra
  // network dependency for a "roughly how much is that" figure.
  const ZAR_TO_EUR = 0.0531; // ≈ R18.85 / €1, June 2026

  function zar(n) { return 'R' + Math.round(n).toLocaleString('en-ZA'); }
  function eur(n) { return '€' + Math.round(n * ZAR_TO_EUR).toLocaleString('en-ZA'); }
  function money(n) { return `${zar(n)} <span class="bb-it-eur">(${eur(n)})</span>`; }

  // ───────────────────────────────────────────────────────────────────────
  // COST MODEL
  // All figures researched June 2026. Geoff: these live in one place
  // (COST_MODEL below) so updating a price later is a one-line edit.
  // ───────────────────────────────────────────────────────────────────────
  const COST_MODEL = {

    // ── Accommodation (per person, per night) ──────────────────────────
    accommodation: {
      camping:      { label: 'Camping (own tent)',        price: 190 },
      dorm:         { label: 'Dorm bed',                  price: 350 },
      privateRoom:  { label: 'Double private room (pp)',  price: 350 } // 700/room ÷ 2 people
    },

    // ── Food (per person, per day) — drinks are now a separate line item,
    // calculated from the "what's the vibe?" slider below.
    food: {
      frugal:   { label: 'Frugal — self-cater',                           price: 75 },
      mid:      { label: 'Mixed — mostly self-cater, occasional treat',   price: 200 },
      flash:    { label: 'Flashpacker — restaurants & takeaways',         price: 500 }
    },

    // ── Drinks (per person, per day) — driven by the "what's the vibe?"
    // slider (0-4: Chill → Mostly chill → Balanced → Mostly party →
    // Let's party). Average hostel bar prices, June 2026: beer/wine R50,
    // soft drink R22, shooter R30. "Let's party" = 6 beers/wine + 4
    // shooters + 4 soft drinks per day; "Chill" = no drinks. The 2
    // in-between stages are a straight linear split between those two.
    drinks: {
      prices: { beerOrWine: 50, softDrink: 22, shooter: 30 },
      partyDayTotal: 6 * 50 + 4 * 30 + 4 * 22, // 508
      stages: [
        { label: 'Chill — no drinks' },
        { label: 'Mostly chill' },
        { label: 'Balanced' },
        { label: 'Mostly party' },
        { label: "Let's party" }
      ],
      priceForStage(stage) {
        return Math.round((stage / 4) * this.partyDayTotal);
      }
    },

    // ── Tours (one-off prices, ZAR, June 2026) ─────────────────────────
    tours: {
      list: [
        { name: 'Bloukrans bungy jump',        price: 1690 },
        { name: 'Kruger day safari (group)',   price: 2200 },
        { name: 'Shark cage diving (Gansbaai)', price: 2100 },
        { name: 'Cape Town hop-on-hop-off bus', price: 299  },
        { name: 'Tandem paragliding',           price: 1500 },
        { name: 'Surf lesson (2hr, group)',     price: 800  }
      ],
      // Average cost of one "typical" paid tour/activity, used for the
      // budget-tier maths below.
      average: 1430,
      tiers: {
        frugal: { toursPerTrip: 0,    label: 'Free stuff only — hikes, beaches, walks' },
        mid:    { toursPerTrip: 1.5,  label: '1–2 paid tours over a 2-week trip' },
        flash:  { toursPerWeek: 2.5,  label: '2–3 paid tours a week' }
      }
    },

    // ── Transport ───────────────────────────────────────────────────────
    transport: {
      // Mainline long-distance bus (Intercape / Greyhound / City to City).
      // Modelled as base fee + per-km rate, since short fixed costs
      // (terminals, drivers) mean the per-km rate is NOT flat across all
      // distances — and because mainline bus pricing is dynamic/yield-based,
      // these are realistic averages, not live fares.
      mainlineBus: {
        offPeak: { base: 150, perKm: 0.55 },
        peak:    { base: 250, perKm: 1.05 }
      },
      // Baz Bus — IMPORTANT: as of June 2026 this hop-on-hop-off backpacker
      // bus only runs the Garden Route corridor, Cape Town ↔ Gqeberha
      // (Port Elizabeth), DAILY in each direction. The old nationwide
      // network (Durban, Wild Coast, Drakensberg, Johannesburg legs) is
      // still listed by Baz Bus as "not yet reopened". Only offer it for
      // legs that fall within this corridor.
      bazBus: {
        corridor: ['cape-town', 'winelands', 'overberg', 'garden-route'],
        // Approx one-way price scaled by fraction of the full CT–PE route
        fullRoutePrice: 3600,
        fullRouteKm: 770
      },
      // Minibus taxi — Geoff's figures.
      minibusTaxi: {
        perKm: 2.50,
        flatExamples: {
          'port-st-johns–durban': 150,
          'durban–eswatini': 300
        }
      },
      // Car hire (small/economy car).
      carHire: {
        dailyRate: 280,        // R260–300/day typical, June 2026
        fuelPricePerLitre: 28, // 95 unleaded, June 2026 (inland avg)
        fuelConsumptionL100km: 6.0, // small car, combined cycle
        get fuelCostPerKm() { return (this.fuelConsumptionL100km / 100) * this.fuelPricePerLitre; }
      },
      // SANRAL toll fees — flat lookups for the handful of major tolled
      // corridors backpackers actually use. Everything else (most of the
      // N2 Garden Route / Wild Coast / KZN south coast) is toll-free or
      // negligible, so defaults to R0.
      tolls: {
        'cape-town–johannesburg': 252,   // N1, one-way, light vehicle
        'johannesburg–durban': 347.50,   // N3, one-way
        'johannesburg–kruger': 356,      // N4 to Mbombela, one-way
        'durban–cape-town': 114          // N2, Oribi + Tsitsikamma plazas only
      },
      // Domestic flights — flashpackers only. Highly seasonal; peak
      // (Dec/Easter/school holidays) runs roughly 2.5–3x low season.
      flights: {
        offPeakPerKm: 1.55,
        peakPerKm: 4.20,
        minFare: 800, // even short hops rarely go below this
        // Thinner regional routes (not served directly by low-cost
        // carriers) often need a connection — applied as a multiplier.
        thinRouteMultiplier: 1.35,
        airports: ['cape-town', 'george', 'gqeberha', 'east-london', 'mthatha',
                   'durban', 'oribi', 'mbombela', 'johannesburg']
      }
    }
  };

  // Airport-ish coordinates for flight distance estimates (lng, lat) —
  // separate from regions.json centers since these need to be the actual
  // airport, not the region's general centre (e.g. Mbombela ≠ Kruger centre).
  const AIRPORTS = {
    'cape-town':   { name: 'Cape Town Int\'l',        coords: [18.6017, -33.9697] },
    'george':      { name: 'George',                  coords: [22.3789, -34.0056] },
    'gqeberha':    { name: 'Gqeberha (Port Elizabeth)',coords: [25.6173, -33.9849] },
    'east-london': { name: 'East London',              coords: [27.8258, -33.0353] },
    'mthatha':     { name: 'Mthatha',                  coords: [28.6743, -31.5436] },
    'durban':      { name: 'King Shaka (Durban)',      coords: [31.1192, -29.6144] },
    'oribi':       { name: 'Pietermaritzburg (Oribi)', coords: [30.3958, -29.6489] },
    'mbombela':    { name: 'Kruger Mpumalanga (Mbombela)', coords: [31.1056, -25.3831] },
    'johannesburg':{ name: 'O.R. Tambo (Johannesburg)',coords: [28.2461, -26.1392] }
  };

  function haversineKm([lng1, lat1], [lng2, lat2]) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLng/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Road distance is reliably longer than straight-line distance in South
  // Africa's terrain — a simple, honestly-labelled multiplier beats
  // pretending haversine is the road distance.
  const ROAD_FACTOR = 1.3;
  function roadKm(a, b) { return haversineKm(a, b) * ROAD_FACTOR; }

  // ───────────────────────────────────────────────────────────────────────
  // TRAVEL TIME — how many calendar days a leg actually consumes.
  // Self-drive and minibus taxi are capped by realistic daytime driving
  // (stopping overnight rather than driving through the night); mainline
  // bus services (Intercape/Greyhound) routinely run overnight on the
  // long routes, e.g. Cape Town–Johannesburg, so they cover more km per
  // calendar day. Without this, a long leg (most often the final return
  // leg of a round trip — e.g. Kruger back to Cape Town, ~1,700km by
  // road) was being treated as taking zero days, silently inflating how
  // many nights the trip actually has time for.
  // ───────────────────────────────────────────────────────────────────────
  const DAILY_TRAVEL_KM = {
    'Minibus taxi': 450,                          // daytime only, rank-to-rank changeovers
    'Mainline bus (Intercape/Greyhound)': 900,     // long-haul routes run overnight
    'Baz Bus (hop-on-hop-off)': 450,               // daytime hop-on-hop-off, same as taxi pace
    'Self-drive (small rental car)': 500           // honest daytime driving max, SA roads
  };
  function travelDaysForLeg(km, mode) {
    const perDay = DAILY_TRAVEL_KM[mode] || 500;
    return Math.max(1, Math.ceil(km / perDay));
  }

  // ───────────────────────────────────────────────────────────────────────
  // SEASON DETECTION — "peak" = mid-Dec to mid-Jan (SA summer holidays),
  // plus the Easter week and the July school holidays, when mainline bus,
  // flight and accommodation demand (and prices) spike.
  // ───────────────────────────────────────────────────────────────────────
  function isPeakSeason(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return false;
    const month = d.getMonth(); // 0=Jan
    const day = d.getDate();
    // Mid-Dec through mid-Jan
    if (month === 11 && day >= 10) return true;
    if (month === 0 && day <= 15) return true;
    // SA school holidays roughly: late March/early April (Easter-ish),
    // late June–mid July, late Sept/early Oct — approximate windows.
    if (month === 3 && day <= 10) return true;
    if (month === 6) return true;
    if (month === 9 && day <= 7) return true;
    return false;
  }

  // ───────────────────────────────────────────────────────────────────────
  // TRANSPORT LEG COSTING
  // Given two region keys and a travel style, work out realistic options
  // for that leg and recommend the one that matches the person's style.
  // ───────────────────────────────────────────────────────────────────────
  function tollForLeg(fromKey, toKey, regionsData) {
    // Very small flat lookup for the handful of legs where backpackers
    // commonly drive a tolled national route. Order-independent.
    const T = COST_MODEL.transport.tolls;
    const pairs = [
      ['cape-town', 'johannesburg', T['cape-town–johannesburg']],
      ['johannesburg', 'durban', T['johannesburg–durban']],
      ['johannesburg', 'kruger', T['johannesburg–kruger']],
      ['johannesburg', 'mpumalanga', T['johannesburg–kruger']],
      ['durban', 'cape-town', T['durban–cape-town']]
    ];
    for (const [a, b, fee] of pairs) {
      if ((fromKey === a && toKey === b) || (fromKey === b && toKey === a)) return fee;
    }
    return 0;
  }

  function legOptions(fromKey, toKey, km, peak, regionsData) {
    const opts = [];
    const M = COST_MODEL.transport;

    // Minibus taxi — best for short hops, always available.
    const taxiPrice = km <= 80
      ? km * M.minibusTaxi.perKm
      : km * M.minibusTaxi.perKm * 0.65; // longer taxi legs run cheaper per km in practice
    opts.push({ mode: 'Minibus taxi', price: Math.round(taxiPrice), notes: 'Cheapest for short hops; change taxis at ranks for longer trips.' });

    // Mainline bus — base + per-km, peak or off-peak rate.
    const busRate = peak ? M.mainlineBus.peak : M.mainlineBus.offPeak;
    const busPrice = busRate.base + km * busRate.perKm;
    opts.push({
      mode: 'Mainline bus (Intercape/Greyhound)',
      price: Math.round(busPrice),
      notes: peak ? 'Holiday-season pricing — book early, fares rise closer to travel dates.' : 'Off-peak pricing — look out for online specials, often cheaper still.'
    });

    // Baz Bus — only within the Garden Route corridor.
    const corridor = M.bazBus.corridor;
    if (corridor.includes(fromKey) && corridor.includes(toKey)) {
      const bazPrice = (km / M.bazBus.fullRouteKm) * M.bazBus.fullRoutePrice;
      opts.push({
        mode: 'Baz Bus (hop-on-hop-off)',
        price: Math.round(Math.max(bazPrice, 350)),
        notes: 'Currently only runs Cape Town ↔ Gqeberha daily — convenient on this leg, but plan around its one-a-day schedule, not the old nationwide network.'
      });
    }

    // Car hire — shared cost note added by caller (group size matters here).
    const fuelCost = km * M.carHire.fuelCostPerKm;
    const toll = tollForLeg(fromKey, toKey, regionsData);
    opts.push({
      mode: 'Self-drive (small rental car)',
      price: Math.round(fuelCost + toll),
      notes: toll > 0
        ? `Fuel only, this leg — plus ${zar(toll)} in tolls. Daily rental (${zar(M.carHire.dailyRate)}/day) is on top, split between however many people share the car.`
        : `Fuel only, this leg — no major tolls on this route. Daily rental (${zar(M.carHire.dailyRate)}/day) is on top, split between however many people share the car.`
    });

    return opts.sort((a, b) => a.price - b.price);
  }

  // ───────────────────────────────────────────────────────────────────────
  // ROUTE SEQUENCING
  // Person picks a starting region + a set of "must visit" regions on the
  // map. We order them into a sensible loop using simple nearest-neighbour
  // ordering on the regions.json centre coordinates — this avoids
  // zig-zagging across the country and roughly matches the real
  // backpacker trail without needing a hand-curated adjacency table.
  // ───────────────────────────────────────────────────────────────────────
  function sequenceRoute(startKey, selectedKeys, regionsData, endKey) {
    // endKey === null/undefined/startKey → round trip: visit everything,
    // then add a final leg back to the start. A different endKey → open
    // jaw: that region is pinned as the last stop rather than just being
    // nearest-neighboured in like any other selection, so the route
    // actually finishes there instead of possibly passing through it
    // midway and ending somewhere else.
    const isOpenJaw = endKey && endKey !== startKey;
    const remaining = new Set(selectedKeys.filter(k => k !== startKey && k !== endKey));
    const route = [startKey];
    let current = startKey;
    while (remaining.size) {
      let nearest = null, nearestDist = Infinity;
      for (const key of remaining) {
        const a = regionsData[current] && regionsData[current].center;
        const b = regionsData[key] && regionsData[key].center;
        if (!a || !b) continue;
        const d = roadKm(a, b);
        if (d < nearestDist) { nearestDist = d; nearest = key; }
      }
      if (nearest === null) { nearest = remaining.values().next().value; }
      route.push(nearest);
      remaining.delete(nearest);
      current = nearest;
    }

    if (isOpenJaw) {
      // Pinned final stop — only add it if it isn't already the last
      // region visited (e.g. it was also ticked as a "visit" region and
      // happened to end up last anyway through nearest-neighbour order).
      if (route[route.length - 1] !== endKey) route.push(endKey);
    } else if (route.length > 1) {
      // Round trip: head back to the start for the flight home, unless
      // we're already there for some reason.
      route.push(startKey);
    }

    return route;
  }

  // Suggest 2 hostels per region matching the trip's budget tier, pulled
  // straight from hostels.json's existing is_* tags rather than inventing
  // a ranking system.
  function suggestHostelsForRegion(regionKey, hostelsGeoJSON, style, ultraBudget) {
    const inRegion = hostelsGeoJSON.features.filter(f => f.properties.region === regionKey);
    if (!inRegion.length) return [];
    let pool = inRegion;
    if (ultraBudget) {
      // Strict — camping or nothing, no falling back to a regular dorm
      // suggestion if the region happens to have no camping hostels.
      // hasNoCamping() (used by computeTrip) is what surfaces that gap
      // to the person; this function just returns an empty list here.
      return inRegion.filter(f => f.properties.is_camping).slice(0, 2).map(f => f.properties);
    } else if (style === 'frugal') {
      const camping = inRegion.filter(f => f.properties.is_camping || f.properties.is_cheapest);
      if (camping.length) pool = camping;
    } else if (style === 'flash') {
      const nicer = inRegion.filter(f => f.properties.is_best_overall || f.properties.is_amenities);
      if (nicer.length) pool = nicer;
    }
    const sorted = [...pool].sort((a, b) => (b.properties.is_best_overall ? 1 : 0) - (a.properties.is_best_overall ? 1 : 0));
    return sorted.slice(0, 2).map(f => f.properties);
  }

  // Regions (from a route) that have zero camping-tagged hostels — used
  // to warn an ultra-budget traveller before they're surprised on the day.
  function regionsWithNoCamping(route, hostelsGeoJSON) {
    return route.filter(key => {
      const inRegion = hostelsGeoJSON.features.filter(f => f.properties.region === key);
      return inRegion.length > 0 && !inRegion.some(f => f.properties.is_camping);
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // FULL TRIP COST AGGREGATOR
  // ───────────────────────────────────────────────────────────────────────
  function computeTrip(answers, regionsData, hostelsGeoJSON) {
    const { startKey, endKey, selectedRegions, totalDays, style, accomType, ultraBudget, transportPref, travelDate, groupSize, flights, vibeStage: vibeStageInput } = answers;
    const peak = isPeakSeason(travelDate);
    const fullRoute = sequenceRoute(startKey, selectedRegions, regionsData, endKey);

    // A round trip's fullRoute ends with startKey again (e.g.
    // [cape-town, garden-route, wild-coast, cape-town]) purely so the
    // final leg back to the airport gets costed — but that repeated stop
    // doesn't need its own nights, so day-splitting works off the stops
    // BEFORE that final return leg. Open-jaw trips have no such repeat,
    // so nightsRoute is the same as fullRoute there.
    const isRoundTrip = fullRoute.length > 1 && fullRoute[fullRoute.length - 1] === startKey && fullRoute[fullRoute.length - 2] !== startKey;
    const nightsRoute = isRoundTrip ? fullRoute.slice(0, -1) : fullRoute;

    const nStops = nightsRoute.length;
    // Guard against more stops than days — cap stops to totalDays so each
    // gets at least 1 night, rather than showing a negative "extraDays".
    const usableNightsRoute = nStops > totalDays ? nightsRoute.slice(0, Math.max(1, totalDays)) : nightsRoute;

    // The route actually travelled/costed picks back up the final return
    // leg (if any) after the capped nights route — dropped stops (from
    // the too-many-regions guard) apply to nightsRoute only; the return
    // leg home always survives the cap since it's not an extra "stop".
    const usableRoute = isRoundTrip ? [...usableNightsRoute, startKey] : usableNightsRoute;

    // ── Transport mode/distance per leg (computed early — travel time
    //    has to be known BEFORE we can work out how many days are left
    //    over for nights at stops; see "Travel days" note below) ──
    // Person picks ONE primary mode in Step 4 (transportPref: 'taxi' |
    // 'bus' | 'drive') and we apply it across every leg, rather than
    // silently picking whatever's cheapest — that was hiding self-drive
    // and bus options the person actually wanted. Baz Bus still overrides
    // on its own corridor since it's a backpacker-specific option people
    // expect to see there regardless of general preference, and very
    // short hops always fall back to taxi since renting/busing 5km
    // between two spots in the same town isn't realistic.
    const modeMap = {
      taxi:  'Minibus taxi',
      bus:   'Mainline bus (Intercape/Greyhound)',
      drive: 'Self-drive (small rental car)'
    };
    const preferredMode = modeMap[transportPref] || modeMap.bus;

    const legBasics = [];
    for (let i = 0; i < usableRoute.length - 1; i++) {
      const fromKey = usableRoute[i], toKey = usableRoute[i + 1];
      const a = regionsData[fromKey] && regionsData[fromKey].center;
      const b = regionsData[toKey] && regionsData[toKey].center;
      const km = a && b ? roadKm(a, b) : 300; // fallback if a centre is missing
      const options = legOptions(fromKey, toKey, km, peak, regionsData);

      let chosen;
      const bazOption = options.find(o => o.mode === 'Baz Bus (hop-on-hop-off)');
      if (bazOption && transportPref !== 'drive') {
        // Baz Bus is a natural fit for this corridor unless the person
        // specifically wants to self-drive (in which case respect that).
        chosen = bazOption;
      } else if (km < 15) {
        // Too short for a bus booking or a rental car to make sense.
        chosen = options.find(o => o.mode === 'Minibus taxi') || options[0];
      } else {
        chosen = options.find(o => o.mode === preferredMode) || options[0];
      }

      legBasics.push({ fromKey, toKey, fromCoords: a || null, toCoords: b || null, km, options, chosen });
    }

    // ── Travel days ──
    // Each leg eats into the trip's calendar according to how far it is
    // and how fast the chosen mode realistically covers ground (see
    // travelDaysForLeg). This matters most for the final return leg of a
    // round trip — e.g. Kruger back to Cape Town is ~1,700 road km — which
    // previously consumed zero days, silently overstating how many nights
    // the trip actually has time for. Legs under ~150km (a short hop
    // between neighbouring regions) are treated as same-day with the
    // next stop's first night, rather than burning a whole day on a
    // half-day drive.
    const travelDaysPerLeg = legBasics.map(l => l.km < 150 ? 0 : travelDaysForLeg(l.km, l.chosen.mode));
    const totalTravelDays = travelDaysPerLeg.reduce((s, d) => s + d, 0);

    // Days left over for actually staying somewhere, after travel days
    // are taken out. Always leave at least 1 night per stop even if
    // travel days would otherwise eat the whole trip — the headline
    // "tooManyStops"-style warning below covers telling the person their
    // trip is too short for what they've asked for.
    const nightsAvailable = Math.max(usableNightsRoute.length, totalDays - totalTravelDays);
    const daysPerStop = Math.max(1, Math.floor(nightsAvailable / usableNightsRoute.length));
    const extraDays = Math.max(0, nightsAvailable - daysPerStop * usableNightsRoute.length);
    const tripTooShortForTravel = totalTravelDays > 0 && (totalDays - totalTravelDays) < usableNightsRoute.length;

    // ── Accommodation ──
    // privateRoom is priced per person assuming 2 people sharing a double
    // (R700/room ÷ 2 = R350pp). A solo traveller taking a private room
    // pays for the whole room themselves; groups of 3+ are assumed to
    // pair up into rooms of 2 (with one person getting a room to
    // themselves if the group size is odd).
    const accomKey = accomType || (style === 'frugal' ? 'camping' : style === 'flash' ? 'privateRoom' : 'dorm');
    const group = Math.max(1, groupSize || 1);
    let accomRate = COST_MODEL.accommodation[accomKey].price;
    if (accomKey === 'privateRoom') {
      const roomPrice = accomRate * 2; // back out the full per-room rate
      if (group === 1) {
        accomRate = roomPrice; // travelling solo — no one to split the room with
      }
      // group >= 2: pairs share a room at the normal per-person rate,
      // already correct as-is (an odd traveller out is a real-world edge
      // case the headline figure doesn't need to model exactly).
    }
    // Nights actually spent at a stop pay the full accommodation rate.
    // Travel days are charged a flat, much lower "on the road" rate —
    // a basic overnight guesthouse/rest stop, or nothing at all if the
    // chosen mode is an overnight bus (the bus seat IS the bed that
    // night). This is deliberately approximate but far closer to reality
    // than either charging full hostel rate or charging nothing.
    const onRoadNightRate = preferredMode === 'Mainline bus (Intercape/Greyhound)'
      ? 0
      : Math.round(COST_MODEL.accommodation.dorm.price * 0.6);
    const accomTotal = accomRate * nightsAvailable + onRoadNightRate * totalTravelDays;

    // ── Food ──
    const foodRate = COST_MODEL.food[style].price;
    const foodTotal = foodRate * totalDays;

    // ── Drinks (vibe slider, 0-4) ──
    const vibeStage = Math.max(0, Math.min(4, vibeStageInput !== null && vibeStageInput !== undefined ? vibeStageInput : 2));
    const drinksRate = COST_MODEL.drinks.priceForStage(vibeStage);
    const drinksTotal = drinksRate * totalDays;

    // ── Tours ──
    let toursTotal = 0;
    const tourTiers = COST_MODEL.tours.tiers;
    if (style === 'frugal') {
      toursTotal = 0;
    } else if (style === 'mid') {
      toursTotal = COST_MODEL.tours.average * tourTiers.mid.toursPerTrip;
    } else {
      const weeks = totalDays / 7;
      toursTotal = COST_MODEL.tours.average * tourTiers.flash.toursPerWeek * weeks;
    }

    // ── Transport between stops — assign departDay now that
    //    daysPerStop/extraDays are known, and build the final legs[]
    //    the rest of the app (map line, route list, etc.) expects ──
    const legs = legBasics.map((l, i) => ({
      from: regionsData[l.fromKey] ? regionsData[l.fromKey].name : l.fromKey,
      to: regionsData[l.toKey] ? regionsData[l.toKey].name : l.toKey,
      fromKey: l.fromKey, toKey: l.toKey,
      fromCoords: l.fromCoords,
      toCoords: l.toCoords,
      // Day this leg is travelled on, i.e. the last day spent at the
      // "from" stop before moving on — used for "Day X: A to B" labels
      // on the map route line. Stop i gets daysPerStop nights (+1 extra
      // for the first `extraDays` stops), so this leg departs on the
      // day count accumulated through stop i, inclusive.
      departDay: (() => {
        let d = 0;
        for (let s = 0; s <= i; s++) d += daysPerStop + (s < extraDays ? 1 : 0);
        return d;
      })(),
      km: Math.round(l.km),
      options: l.options,
      chosen: l.chosen,
      travelDays: travelDaysPerLeg[i]
    }));
    let transportTotal = legs.reduce((sum, l) => sum + l.chosen.price, 0);

    // If self-drive was chosen for any leg, the rental is realistically
    // kept for the whole trip (not re-hired per leg) — add the daily rate
    // once, split across the group, rather than leaving it out of the
    // total (the per-leg "notes" text mentions it, but the cost itself
    // belongs here).
    const usesCarHire = legs.some(l => l.chosen.mode === 'Self-drive (small rental car)');
    let carRentalTotal = 0;
    if (usesCarHire) {
      carRentalTotal = (COST_MODEL.transport.carHire.dailyRate * totalDays) / group;
      transportTotal += carRentalTotal;
    }

    // ── Optional internal flights (flashpackers) ──
    const flightLegs = [];
    if (flights && flights.length) {
      flights.forEach(([fromAirport, toAirport]) => {
        const a = AIRPORTS[fromAirport], b = AIRPORTS[toAirport];
        if (!a || !b) return;
        const km = haversineKm(a.coords, b.coords); // flights: no road factor
        const rate = peak ? COST_MODEL.transport.flights.peakPerKm : COST_MODEL.transport.flights.offPeakPerKm;
        let price = Math.max(COST_MODEL.transport.flights.minFare, km * rate);
        const thin = ['mthatha', 'oribi', 'east-london'].includes(fromAirport) || ['mthatha', 'oribi', 'east-london'].includes(toAirport);
        if (thin) price *= COST_MODEL.transport.flights.thinRouteMultiplier;
        flightLegs.push({ from: a.name, to: b.name, km: Math.round(km), price: Math.round(price) });
      });
      transportTotal += flightLegs.reduce((s, f) => s + f.price, 0);
    }

    const grandTotal = accomTotal + foodTotal + drinksTotal + toursTotal + transportTotal;

    return {
      route: usableRoute, daysPerStop, extraDays, peak,
      totalTravelDays, nightsAvailable, tripTooShortForTravel,
      tooManyStops: nStops > totalDays,
      droppedStops: nStops > totalDays ? nightsRoute.slice(usableNightsRoute.length) : [],
      isRoundTrip,
      ultraBudget: !!ultraBudget,
      noCampingRegions: ultraBudget ? regionsWithNoCamping(usableNightsRoute, hostelsGeoJSON) : [],
      accomKey, accomRate, accomTotal,
      foodRate, foodTotal,
      vibeStage, drinksRate, drinksTotal,
      toursTotal,
      legs, transportTotal,
      carRentalTotal,
      flightLegs,
      grandTotal,
      perDay: grandTotal / totalDays,
      groupSize: group
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // STYLES — injected once into <head>. Keeps to the site's real tokens:
  // brand red #bc1d23, brand yellow #FFD700, Century Gothic, blue-link
  // #0000e0, and the existing 1100px / 600px breakpoints.
  // ───────────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('bb-itinerary-styles')) return;
    const css = document.createElement('style');
    css.id = 'bb-itinerary-styles';
    css.textContent = `
      .bb-itinerary-panel {
        font-family: ${FONT_STACK};
        color: #000;
        background: ${BRAND_YELLOW};
        border: none;
        border-bottom: 3px solid #000;
        border-radius: 0;
        padding: 32px 36px;
        margin: 0 0 36px;
        position: relative;
        overflow: hidden;
      }
      .bb-it-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
        padding-right: 36px;
        position: relative;
        z-index: 1;
      }
      .bb-it-header h2 {
        font-size: 28px;
        margin: 0;
        color: #000;
        white-space: nowrap;
      }
      .bb-it-close {
        background: ${BRAND_RED};
        border: none;
        border-radius: 0;
        font-size: 22px;
        line-height: 1;
        color: #fff;
        cursor: pointer;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 0;
        right: 0;
        z-index: 2;
      }
      .bb-it-close:hover { background: #9c1318; }

      .bb-it-inline-remove {
        background: none;
        border: none;
        font-size: 16px;
        line-height: 1;
        color: #000;
        cursor: pointer;
        vertical-align: middle;
        padding: 0 4px;
      }
      .bb-it-inline-remove:hover { color: ${BRAND_RED}; }

      .bb-it-steps {
        display: flex;
        gap: 6px;
        margin-bottom: 20px;
        flex-wrap: wrap;
        position: relative;
        z-index: 1;
      }
      .bb-it-step-dot {
        width: 28px; height: 28px;
        border-radius: 50%;
        background: #fff;
        color: #000;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; font-weight: bold;
        border: 2px solid ${BRAND_RED};
      }
      .bb-it-step-dot.is-active { background: ${BRAND_RED}; border-color: ${BRAND_RED}; color: #fff; }
      .bb-it-step-dot.is-done { background: ${BRAND_RED}; border-color: ${BRAND_RED}; color: #fff; }

      .bb-it-field { margin-bottom: 20px; position: relative; z-index: 1; }
      .bb-it-field label, .bb-it-field legend {
        display: block;
        font-weight: bold;
        margin-bottom: 8px;
        font-size: 16px;
        color: #000;
        padding: 0;
      }
      .bb-it-field .bb-it-hint { font-weight: normal; color: #000; font-size: 13px; display: block; margin-top: 2px; }

      .bb-it-field select,
      .bb-it-field input[type="number"],
      .bb-it-field input[type="date"] {
        font-family: ${FONT_STACK};
        font-size: 15px;
        padding: 10px 12px;
        border: 2px solid ${BRAND_RED};
        border-radius: 0;
        width: 100%;
        max-width: 360px;
        box-sizing: border-box;
        background: #fff;
        color: #000;
      }
      .bb-it-field select:focus,
      .bb-it-field input:focus { outline: 3px solid ${BRAND_YELLOW}; outline-offset: 1px; border-color: ${BRAND_RED}; }

      .bb-it-choice-row {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .bb-it-choice {
        border: none;
        border-radius: 0;
        padding: 4px 0;
        cursor: pointer;
        background: none;
        color: #000;
        font-size: 14px;
        line-height: 1.4;
        display: flex;
        align-items: flex-start;
        gap: 10px;
        transition: color 0.15s;
      }
      .bb-it-choice:hover { color: ${BRAND_RED}; }
      .bb-it-choice input { margin: 3px 0 0; flex-shrink: 0; }
      .bb-it-choice.is-checked strong { color: ${BRAND_RED}; }
      .bb-it-choice strong { display: block; margin-bottom: 3px; }

      .bb-it-vibe-row {
        display: flex;
        align-items: center;
        gap: 14px;
        max-width: 480px;
      }
      .bb-it-vibe-row input[type="range"] {
        flex: 1;
        accent-color: ${BRAND_RED};
        height: 6px;
      }
      .bb-it-vibe-end {
        font-size: 12px;
        font-weight: bold;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        color: #000;
        white-space: nowrap;
      }
      .bb-it-choice span.price { color: ${BRAND_RED}; font-weight: bold; }

      .bb-it-map-hint {
        background: #fff;
        border: 2px solid ${BRAND_RED};
        border-radius: 0;
        padding: 12px 16px;
        font-size: 14px;
        margin-bottom: 14px;
        color: #000;
        position: relative;
        z-index: 1;
      }
      .bb-it-selected-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .bb-it-tag {
        background: ${BRAND_RED};
        color: #fff;
        font-size: 13px;
        font-weight: bold;
        padding: 5px 10px;
        border-radius: 14px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .bb-it-tag button {
        background: none; border: none; color: #fff; cursor: pointer;
        font-size: 14px; line-height: 1; padding: 0;
      }

      .bb-it-nav {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 24px;
        position: relative;
        z-index: 1;
      }
      .bb-it-btn {
        font-family: ${FONT_STACK};
        font-weight: bold;
        font-size: 14px;
        padding: 11px 22px;
        border-radius: 0;
        cursor: pointer;
        border: none;
        background: ${BRAND_RED};
        color: #fff;
      }
      .bb-it-btn:hover { background: #f7d6d8; color: ${BRAND_RED}; }
      .bb-it-btn.primary { background: ${BRAND_RED}; color: #fff; }
      .bb-it-btn.primary:hover { background: #f7d6d8; color: ${BRAND_RED}; }
      .bb-it-btn.secondary { background: ${BRAND_RED}; color: #fff; }
      .bb-it-btn.secondary:hover { background: #f7d6d8; color: ${BRAND_RED}; }
      .bb-it-btn:disabled { opacity: 0.45; cursor: not-allowed; }

      .bb-it-results { position: relative; z-index: 1; }
      .bb-it-total-card {
        background: ${BRAND_RED};
        color: #fff;
        border-radius: 0;
        border: 2px solid ${BRAND_RED};
        padding: 20px 24px;
        margin-bottom: 22px;
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
        justify-content: space-between;
        align-items: center;
      }
      .bb-it-total-card .bb-it-total-figure { font-size: 30px; font-weight: bold; line-height: 1.1; color: #fff; }
      .bb-it-total-card .bb-it-eur { font-size: 16px; font-weight: normal; color: #fff; }
      .bb-it-total-card .bb-it-perday { font-size: 14px; color: #fff; }

      .bb-it-breakdown { margin-bottom: 22px; }
      .bb-it-breakdown-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid ${BRAND_RED};
        font-size: 15px;
      }
      .bb-it-breakdown-row strong { color: ${BRAND_RED}; }
      .bb-it-eur { color: #000; font-size: 0.85em; }

      .bb-it-route-list { list-style: none; margin: 0 0 18px; padding: 0; }
      .bb-it-route-stop {
        display: flex;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px dashed ${BRAND_RED};
        align-items: flex-start;
      }
      .bb-it-route-num {
        background: ${BRAND_RED};
        color: #fff;
        font-weight: bold;
        border-radius: 50%;
        width: 26px; height: 26px;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px;
        flex-shrink: 0;
      }
      .bb-it-route-stop-name { font-weight: bold; }
      .bb-it-route-stop-days { color: #000; font-size: 13px; }
      .bb-it-leg {
        font-size: 13px;
        color: #000;
        margin: 4px 0 0 38px;
        padding: 6px 10px;
        background: #f7f7f7;
        border-radius: 6px;
        display: inline-block;
      }

      .bb-it-hostel-suggestion {
        margin: 6px 0 0 38px;
        font-size: 13px;
      }
      .bb-it-hostel-suggestion a { color: ${BLUE_LINK}; font-weight: bold; text-decoration: none; }
      .bb-it-hostel-suggestion a:hover { text-decoration: underline; }

      .bb-it-disclaimer {
        font-size: 12.5px;
        color: #000;
        border-top: 1px solid ${BRAND_RED};
        padding-top: 14px;
        margin-top: 18px;
        line-height: 1.5;
      }

      .bb-it-loading {
        text-align: center;
        padding: 40px 0;
        font-size: 15px;
        color: #000;
      }

      @media (max-width: 600px) {
        .bb-itinerary-panel { padding: 24px 20px; }
        .bb-it-header { padding-right: 44px; }
        .bb-it-header h2 { font-size: 22px; }
        .bb-it-total-card { flex-direction: column; align-items: flex-start; }
      }
    `;
    document.head.appendChild(css);
  }

  // ───────────────────────────────────────────────────────────────────────
  // MAIN CONTROLLER
  // ───────────────────────────────────────────────────────────────────────
  window.BB_ITINERARY_INIT = function (opts) {
    const mount = typeof opts.mount === 'string' ? document.querySelector(opts.mount) : opts.mount;
    const mapFrame = opts.mapFrame;
    const currentRegion = opts.currentRegion || null;
    if (!mount) return;

    injectStyles();

    // The tour guide character (#ma, driven by tourguide.js) can sit
    // invisible-but-clickable over parts of the page. While the wizard
    // is open it must be fully suspended — see closePanel() for the
    // matching resume() call.
    if (window.BB_TourGuide) window.BB_TourGuide.suspend();

    let regionsData = null;
    let hostelsGeoJSON = null;
    let dataReady = false;

    const state = {
      step: 1,
      startKey: currentRegion,
      endKey: null,
      selectedRegions: [],
      totalDays: 14,
      style: 'mid',
      accomType: null,
      ultraBudget: false,
      transportPref: null,
      vibeStage: null,
      travelDate: '',
      groupSize: 2,
      wantsFlights: false,
      flights: []
    };

    function renderLoading() {
      mount.innerHTML = `<div class="bb-itinerary-panel"><div class="bb-it-loading">Loading the itinerary builder…</div></div>`;
    }

    function loadData() {
      renderLoading();
      Promise.all([
        fetch('/assets/data/regions.json').then(r => r.json()),
        fetch('/assets/data/hostels.json').then(r => r.json())
      ]).then(([regions, hostels]) => {
        regionsData = regions;
        hostelsGeoJSON = hostels;
        dataReady = true;
        if (!state.startKey || !regionsData[state.startKey]) {
          state.startKey = 'cape-town';
        }
        enterSelectMode();
        renderStep();
      }).catch(() => {
        mount.innerHTML = `<div class="bb-itinerary-panel"><p>Sorry — the itinerary builder couldn't load. Please check your connection and try again.</p></div>`;
      });
    }

    function enterSelectMode() {
      if (!mapFrame) return;
      const send = () => mapFrame.contentWindow.postMessage(
        { type: 'BB_SELECT_MODE', active: true, selected: state.selectedRegions, current: state.startKey }, '*'
      );
      // Map iframe may still be the poster facade (data-src not yet
      // swapped to src) — wake it if needed, same pattern as Find on map.
      if (mapFrame.getAttribute('src') !== mapFrame.getAttribute('data-src')) {
        mapFrame.src = mapFrame.getAttribute('data-src');
        mapFrame.addEventListener('load', send, { once: true });
      } else {
        send();
      }
    }

    function exitSelectMode() {
      if (!mapFrame || !mapFrame.contentWindow) return;
      mapFrame.contentWindow.postMessage({ type: 'BB_SELECT_MODE', active: false }, '*');
    }

    window.addEventListener('message', (e) => {
      if (!e.data || e.data.type !== 'BB_REGION_TOGGLED') return;
      state.selectedRegions = e.data.selected || [];
      if (state.step === 1) renderStep();
    });

    function regionName(key) {
      return regionsData && regionsData[key] ? regionsData[key].name : key;
    }

    function vibeReadout(stage) {
      const s = COST_MODEL.drinks.stages[stage];
      const price = COST_MODEL.drinks.priceForStage(stage);
      if (stage === 0) return `${s.label} — no extra drinks cost.`;
      return `${s.label} — about ${zar(price)}/day on drinks (${eur(price)}/day).`;
    }

    const TOTAL_STEPS = 6;

    function stepDots() {
      let html = '<div class="bb-it-steps">';
      for (let i = 1; i <= TOTAL_STEPS; i++) {
        const cls = i < state.step ? 'is-done' : i === state.step ? 'is-active' : '';
        html += `<div class="bb-it-step-dot ${cls}">${i < state.step ? '✓' : i}</div>`;
      }
      html += '</div>';
      return html;
    }

    function panelShell(innerHTML) {
      mount.innerHTML = `
        <div class="bb-itinerary-panel" role="region" aria-label="Itinerary builder">
          <div class="bb-it-header">
            <h2>Build your own itinerary</h2>
            <button class="bb-it-close" aria-label="Close itinerary builder" id="bb-it-close-btn">&times;</button>
          </div>
          ${stepDots()}
          ${innerHTML}
        </div>`;
      const closeBtn = document.getElementById('bb-it-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', closePanel);
    }

    function closePanel() {
      exitSelectMode();
      clearRouteFromMap();
      mount.innerHTML = '';
      mount.style.display = 'none';
      if (window.BB_TourGuide) window.BB_TourGuide.resume();
      const openBtn = document.getElementById('bb-it-open-btn');
      if (openBtn) { openBtn.style.display = ''; openBtn.focus(); }
    }

    function clearRouteFromMap() {
      if (mapFrame && mapFrame.contentWindow) {
        mapFrame.contentWindow.postMessage({ type: 'BB_CLEAR_ROUTE' }, '*');
      }
    }

    // ── STEP 1: Starting point + regions to visit ──────────────────────
    function renderStep1() {
      const allKeys = Object.keys(regionsData);
      const airportKeys = ['cape-town', 'johannesburg', 'durban'];
      const otherKeys = allKeys.filter(k => !airportKeys.includes(k)).sort((a, b) => regionsData[a].name.localeCompare(regionsData[b].name));

      // If there's no current-page region to default to (e.g. the
      // national homepage), fall back to Cape Town rather than leaving
      // state.startKey out of sync with whatever the <select> shows.
      if (!state.startKey || !regionsData[state.startKey]) {
        state.startKey = 'cape-town';
      }

      const optionsHTML = [
        `<optgroup label="Main international airports">`,
        ...airportKeys.map(k => `<option value="${k}" ${state.startKey === k ? 'selected' : ''}>${regionsData[k].name}</option>`),
        `</optgroup>`,
        `<optgroup label="All other regions">`,
        ...otherKeys.map(k => `<option value="${k}" ${state.startKey === k ? 'selected' : ''}>${regionsData[k].name}</option>`),
        `</optgroup>`
      ].join('');

      const tagsHTML = state.selectedRegions.length
        ? `<div class="bb-it-selected-tags">${state.selectedRegions.map(k =>
            `<span class="bb-it-tag">${regionName(k)}<button type="button" data-remove-region="${k}" aria-label="Remove ${regionName(k)}">&times;</button></span>`
          ).join('')}</div>`
        : `<p class="bb-it-hint">No regions selected yet — click the coloured areas on the map above to add them.</p>`;

      const endOptionsHTML = [
        `<option value="" ${!state.endKey ? 'selected' : ''}>Same as starting point (round trip)</option>`,
        `<optgroup label="Main international airports">`,
        ...airportKeys.map(k => `<option value="${k}" ${state.endKey === k ? 'selected' : ''}>${regionsData[k].name}</option>`),
        `</optgroup>`,
        `<optgroup label="All other regions">`,
        ...otherKeys.map(k => `<option value="${k}" ${state.endKey === k ? 'selected' : ''}>${regionsData[k].name}</option>`),
        `</optgroup>`
      ].join('');

      panelShell(`
        <div class="bb-it-field">
          <label for="bb-it-start">Where are you starting from?</label>
          <select id="bb-it-start">${optionsHTML}</select>
          <span class="bb-it-hint">Defaults to the region of the page you're on now — change it if you're flying in elsewhere.</span>
        </div>
        <div class="bb-it-field">
          <label for="bb-it-end">Where do you need to end up?</label>
          <select id="bb-it-end">${endOptionsHTML}</select>
          <span class="bb-it-hint">Most people fly home from where they started — but if you're flying out from somewhere else (e.g. in at Cape Town, out from Johannesburg), pick it here.</span>
        </div>
        <div class="bb-it-field">
          <label>Which other regions do you want to visit?</label>
          <div class="bb-it-map-hint">👆 Click the coloured regions on the map above to add or remove them from your trip. Your starting region is shown in gold.</div>
          ${tagsHTML}
        </div>
        <div class="bb-it-nav">
          <span></span>
          <button class="bb-it-btn primary" id="bb-it-next" ${state.selectedRegions.length ? '' : 'disabled'}>Next: trip length & style →</button>
        </div>
      `);

      document.getElementById('bb-it-start').addEventListener('change', (e) => {
        state.startKey = e.target.value;
        state.selectedRegions = state.selectedRegions.filter(k => k !== state.startKey);
        enterSelectMode();
        renderStep();
      });
      document.getElementById('bb-it-end').addEventListener('change', (e) => {
        state.endKey = e.target.value || null;
        renderStep();
      });
      mount.querySelectorAll('[data-remove-region]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-remove-region');
          state.selectedRegions = state.selectedRegions.filter(k => k !== key);
          if (mapFrame && mapFrame.contentWindow) {
            mapFrame.contentWindow.postMessage({ type: 'BB_SELECT_MODE', active: true, selected: state.selectedRegions, current: state.startKey }, '*');
          }
          renderStep();
        });
      });
      const nextBtn = document.getElementById('bb-it-next');
      if (nextBtn) nextBtn.addEventListener('click', () => { state.step = 2; renderStep(); });
    }

    // ── STEP 2: Trip length, travel dates, group size, overall style ────
    function renderStep2() {
      const styles = [
        { key: 'frugal', label: 'Frugal', desc: 'Self-cater, camp or dorm, free activities only' },
        { key: 'mid',    label: 'Mixed',  desc: 'Mostly self-cater, the occasional treat & tour' },
        { key: 'flash',  label: 'Flashpacker', desc: 'Restaurants, bars, several tours, maybe flights' }
      ];
      const styleHTML = styles.map(s => `
        <label class="bb-it-choice ${state.style === s.key ? 'is-checked' : ''}">
          <input type="radio" name="bb-it-style" value="${s.key}" ${state.style === s.key ? 'checked' : ''}>
          <strong>${s.label}</strong>${s.desc}
        </label>`).join('');

      panelShell(`
        <div class="bb-it-field">
          <label for="bb-it-days">How many days is your trip?</label>
          <input type="number" id="bb-it-days" min="3" max="120" value="${state.totalDays}">
        </div>
        <div class="bb-it-field">
          <label for="bb-it-date">Roughly when are you travelling?</label>
          <input type="date" id="bb-it-date" value="${state.travelDate}">
          <span class="bb-it-hint">This lets us check whether you'll be travelling over peak season (mid-Dec–mid-Jan, Easter, July school holidays), since mainline bus and flight prices roughly double then.</span>
        </div>
        <div class="bb-it-field">
          <label for="bb-it-group">How many people are travelling together?</label>
          <input type="number" id="bb-it-group" min="1" max="12" value="${state.groupSize}">
          <span class="bb-it-hint">Used to split self-drive rental costs, and to work out private room rates if you're sharing.</span>
        </div>
        <div class="bb-it-field">
          <legend>Overall travel style</legend>
          <div class="bb-it-choice-row">${styleHTML}</div>
        </div>
        <div class="bb-it-field">
          <label for="bb-it-vibe">What's the vibe?</label>
          <div class="bb-it-vibe-row">
            <span class="bb-it-vibe-end">Chill</span>
            <input type="range" id="bb-it-vibe" min="0" max="4" step="1" value="${state.vibeStage !== null ? state.vibeStage : 2}" aria-describedby="bb-it-vibe-readout">
            <span class="bb-it-vibe-end">Let's party</span>
          </div>
          <span class="bb-it-hint" id="bb-it-vibe-readout">${vibeReadout(state.vibeStage !== null ? state.vibeStage : 2)}</span>
        </div>
        <div class="bb-it-nav">
          <button class="bb-it-btn secondary" id="bb-it-back">← Back</button>
          <button class="bb-it-btn primary" id="bb-it-next">Next: accommodation →</button>
        </div>
      `);

      document.getElementById('bb-it-days').addEventListener('input', e => { state.totalDays = parseInt(e.target.value, 10) || 14; });
      document.getElementById('bb-it-date').addEventListener('input', e => { state.travelDate = e.target.value; });
      document.getElementById('bb-it-group').addEventListener('input', e => { state.groupSize = parseInt(e.target.value, 10) || 1; });
      document.getElementById('bb-it-vibe').addEventListener('input', e => {
        state.vibeStage = parseInt(e.target.value, 10);
        document.getElementById('bb-it-vibe-readout').textContent = vibeReadout(state.vibeStage);
      });
      mount.querySelectorAll('input[name="bb-it-style"]').forEach(r => r.addEventListener('change', e => {
        state.style = e.target.value;
        if (!state.accomType) {
          state.accomType = state.style === 'frugal' ? 'camping' : state.style === 'flash' ? 'privateRoom' : 'dorm';
        }
        if (!state.transportPref) {
          state.transportPref = state.style === 'frugal' ? 'taxi' : state.style === 'flash' ? 'bus' : 'bus';
        }
        if (state.vibeStage === null) {
          state.vibeStage = state.style === 'frugal' ? 0 : state.style === 'flash' ? 4 : 2;
        }
        renderStep2();
      }));
      document.getElementById('bb-it-back').addEventListener('click', () => { state.step = 1; renderStep(); });
      document.getElementById('bb-it-next').addEventListener('click', () => { state.step = 3; renderStep(); });
    }

    // ── STEP 3: Accommodation type ───────────────────────────────────────
    function renderStep3() {
      const A = COST_MODEL.accommodation;
      const solo = state.groupSize === 1;
      const options = [
        { key: 'camping', ...A.camping },
        { key: 'dorm', ...A.dorm },
        { key: 'privateRoom', ...A.privateRoom, price: solo ? A.privateRoom.price * 2 : A.privateRoom.price,
          label: solo ? 'Private room (whole room, travelling solo)' : A.privateRoom.label }
      ];
      const html = options.map(o => `
        <label class="bb-it-choice ${state.accomType === o.key ? 'is-checked' : ''}">
          <input type="radio" name="bb-it-accom" value="${o.key}" ${state.accomType === o.key ? 'checked' : ''}>
          <strong>${o.label}</strong>
          <span class="price">${money(o.price)} pp/night</span>
        </label>`).join('');

      panelShell(`
        <div class="bb-it-field">
          <legend>Where will you mostly be sleeping?</legend>
          <div class="bb-it-choice-row">${html}</div>
          <span class="bb-it-hint">Not every hostel offers camping — we'll only suggest camping-friendly hostels for regions where it's available.</span>
        </div>
        <div class="bb-it-field" ${state.accomType === 'camping' ? '' : 'style="opacity:0.5;"'}>
          <label class="bb-it-choice" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;">
            <input type="checkbox" id="bb-it-ultra-budget" ${state.ultraBudget ? 'checked' : ''} ${state.accomType === 'camping' ? '' : 'disabled'} style="margin-top:3px;">
            <span><strong>Ultra-budget — camp absolutely everywhere I can</strong><br>
            <span class="bb-it-hint">Some regions have very few (or no) hostels with camping — Kruger and Mpumalanga have none at all, and Cape Town only has one. With this on, we'll flag those gaps instead of quietly switching you to a dorm.</span></span>
          </label>
        </div>
        <div class="bb-it-nav">
          <button class="bb-it-btn secondary" id="bb-it-back">← Back</button>
          <button class="bb-it-btn primary" id="bb-it-next">Next: how will you get around? →</button>
        </div>
      `);

      mount.querySelectorAll('input[name="bb-it-accom"]').forEach(r => r.addEventListener('change', e => {
        state.accomType = e.target.value;
        if (state.accomType !== 'camping') state.ultraBudget = false;
        renderStep3();
      }));
      const ultraBudgetCb = document.getElementById('bb-it-ultra-budget');
      if (ultraBudgetCb) ultraBudgetCb.addEventListener('change', e => { state.ultraBudget = e.target.checked; });
      document.getElementById('bb-it-back').addEventListener('click', () => { state.step = 2; renderStep(); });
      document.getElementById('bb-it-next').addEventListener('click', () => { state.step = 4; renderStep(); });
    }

    // ── STEP 4: Transport preference ─────────────────────────────────────
    function renderStep4() {
      const prefs = [
        { key: 'taxi',  label: 'Minibus taxi', desc: 'Cheapest, most flexible — best for short hops, can feel slow over long distances' },
        { key: 'bus',   label: 'Mainline bus', desc: 'Intercape / Greyhound — comfortable, predictable, needs booking ahead' },
        { key: 'drive', label: 'Self-drive', desc: 'Small rental car — most freedom, costs more, splits well between a group' }
      ];
      const html = prefs.map(p => `
        <label class="bb-it-choice ${state.transportPref === p.key ? 'is-checked' : ''}">
          <input type="radio" name="bb-it-transport" value="${p.key}" ${state.transportPref === p.key ? 'checked' : ''}>
          <strong>${p.label}</strong>${p.desc}
        </label>`).join('');

      panelShell(`
        <div class="bb-it-field">
          <legend>How do you want to get between regions?</legend>
          <span class="bb-it-hint">We'll use this for every leg of your trip where it makes sense — e.g. very short hops always use a taxi regardless of what you pick here, and Baz Bus is offered automatically on the Cape Town–Gqeberha corridor unless you've chosen self-drive.</span>
          <div class="bb-it-choice-row" style="margin-top:10px;">${html}</div>
        </div>
        <div class="bb-it-nav">
          <button class="bb-it-btn secondary" id="bb-it-back">← Back</button>
          <button class="bb-it-btn primary" id="bb-it-next">Next: review your trip →</button>
        </div>
      `);

      mount.querySelectorAll('input[name="bb-it-transport"]').forEach(r => r.addEventListener('change', e => {
        state.transportPref = e.target.value;
        renderStep4();
      }));
      document.getElementById('bb-it-back').addEventListener('click', () => { state.step = 3; renderStep(); });
      document.getElementById('bb-it-next').addEventListener('click', () => { state.step = 5; renderStep(); });
    }

    // ── STEP 5: Internal flights (flashpackers only) ─────────────────────
    function renderStep5_flights() {
      if (state.style !== 'flash') {
        // Not relevant for frugal/mid travellers — skip straight to review.
        state.step = 6;
        renderStep();
        return;
      }

      const airportOptions = Object.keys(AIRPORTS)
        .map(k => `<option value="${k}">${AIRPORTS[k].name}</option>`).join('');

      const flightRows = state.flights.map((f, i) => `
        <div class="bb-it-leg" style="display:block;margin:6px 0;">
          ${AIRPORTS[f[0]] ? AIRPORTS[f[0]].name : f[0]} → ${AIRPORTS[f[1]] ? AIRPORTS[f[1]].name : f[1]}
          <button type="button" data-remove-flight="${i}" class="bb-it-inline-remove" aria-label="Remove this flight">&times;</button>
        </div>`).join('');

      panelShell(`
        <div class="bb-it-field">
          <legend>Any internal flights?</legend>
          <span class="bb-it-hint">Optional — only worth it for flashpackers covering big distances quickly. Off-peak vs peak pricing is applied automatically from your travel date.</span>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px;">
            <select id="bb-it-flight-from" style="max-width:220px;"><option value="">From…</option>${airportOptions}</select>
            <select id="bb-it-flight-to" style="max-width:220px;"><option value="">To…</option>${airportOptions}</select>
            <button class="bb-it-btn secondary" id="bb-it-add-flight" type="button">+ Add flight</button>
          </div>
          ${flightRows}
        </div>
        <div class="bb-it-nav">
          <button class="bb-it-btn secondary" id="bb-it-back">← Back</button>
          <button class="bb-it-btn primary" id="bb-it-next">Next: review →</button>
        </div>
      `);

      document.getElementById('bb-it-add-flight').addEventListener('click', () => {
        const from = document.getElementById('bb-it-flight-from').value;
        const to = document.getElementById('bb-it-flight-to').value;
        if (from && to && from !== to) {
          state.flights.push([from, to]);
          renderStep5_flights();
        }
      });
      mount.querySelectorAll('[data-remove-flight]').forEach(btn => {
        btn.addEventListener('click', () => {
          state.flights.splice(parseInt(btn.getAttribute('data-remove-flight'), 10), 1);
          renderStep5_flights();
        });
      });
      document.getElementById('bb-it-back').addEventListener('click', () => { state.step = 4; renderStep(); });
      document.getElementById('bb-it-next').addEventListener('click', () => { state.step = 6; renderStep(); });
    }

    // ── STEP 6: Results ──────────────────────────────────────────────────
    function renderStep6() {
      const answers = {
        startKey: state.startKey,
        endKey: state.endKey,
        selectedRegions: state.selectedRegions,
        totalDays: state.totalDays,
        style: state.style,
        accomType: state.accomType,
        ultraBudget: state.ultraBudget,
        transportPref: state.transportPref,
        vibeStage: state.vibeStage,
        travelDate: state.travelDate,
        groupSize: state.groupSize,
        flights: state.style === 'flash' ? state.flights : []
      };
      const trip = computeTrip(answers, regionsData, hostelsGeoJSON);

      // Draw the route on the map: a dashed line through the chosen
      // regions with a numbered, clickable stage marker per leg showing
      // "Day X — A to B" and the chosen transport mode.
      if (mapFrame && mapFrame.contentWindow) {
        const routeLegs = trip.legs
          .filter(l => l.fromCoords && l.toCoords)
          .map(l => ({
            fromCoords: l.fromCoords, toCoords: l.toCoords,
            fromName: l.from, toName: l.to,
            departDay: l.departDay, km: l.km,
            modeLabel: l.chosen.mode
          }));
        mapFrame.contentWindow.postMessage({ type: 'BB_DRAW_ROUTE', legs: routeLegs }, '*');
      }

      const routeHTML = trip.route.map((key, i) => {
        const isReturnLeg = trip.isRoundTrip && i === trip.route.length - 1;
        const suggestions = isReturnLeg ? [] : suggestHostelsForRegion(key, hostelsGeoJSON, state.style, state.ultraBudget);
        const suggestionsHTML = suggestions.length
          ? suggestions.map(h => `<div class="bb-it-hostel-suggestion">→ <a href="${h.anchor || '#'}">${h.name}</a></div>`).join('')
          : '';
        const legHTML = i < trip.legs.length
          ? `<div class="bb-it-leg">Then: ${trip.legs[i].chosen.mode} to ${trip.legs[i+1] ? regionName(trip.route[i+1]) : ''} (~${trip.legs[i].km}km${trip.legs[i].travelDays > 0 ? `, ~${trip.legs[i].travelDays} day${trip.legs[i].travelDays !== 1 ? 's' : ''} travelling` : ''}) — ${money(trip.legs[i].chosen.price)}${trip.legs[i].chosen.mode.includes('Self-drive') ? ' fuel' : ''}</div>`
          : '';

        const daysLabel = isReturnLeg
          ? `<span class="bb-it-route-stop-days">— fly home from here</span>`
          : (() => {
              const extra = i < trip.extraDays ? 1 : 0;
              const days = trip.daysPerStop + extra;
              return `<span class="bb-it-route-stop-days">— ${days} night${days !== 1 ? 's' : ''}</span>`;
            })();

        return `
          <li class="bb-it-route-stop" style="display:block;">
            <div style="display:flex;gap:12px;align-items:flex-start;">
              <span class="bb-it-route-num">${i + 1}</span>
              <div>
                <span class="bb-it-route-stop-name">${regionName(key)}${isReturnLeg ? ' (back where you started)' : ''}</span>
                ${daysLabel}
                ${suggestionsHTML}
              </div>
            </div>
            ${legHTML}
          </li>`;
      }).join('');

      const flightHTML = trip.flightLegs.length
        ? `<div class="bb-it-breakdown-row"><span>Internal flights (${trip.flightLegs.length})</span><strong>${money(trip.flightLegs.reduce((s,f)=>s+f.price,0))}</strong></div>`
        : '';

      const carRentalHTML = trip.carRentalTotal > 0
        ? `<div class="bb-it-breakdown-row"><span>Car rental (${zar(COST_MODEL.transport.carHire.dailyRate)}/day ÷ ${trip.groupSize} ${trip.groupSize === 1 ? 'person' : 'people'})</span><strong>${money(trip.carRentalTotal)}</strong></div>`
        : '';

      const flightTotal = trip.flightLegs.reduce((s,f)=>s+f.price,0);
      const legsOnlyTotal = trip.transportTotal - flightTotal - trip.carRentalTotal;

      const keptStopsCount = trip.isRoundTrip ? trip.route.length - 1 : trip.route.length;
      const tooManyHTML = trip.tooManyStops
        ? `<div class="bb-it-map-hint">You picked more regions than you have days for at roughly a night each. We've kept the first ${keptStopsCount} stops on your route and left out ${trip.droppedStops.map(k => regionName(k)).join(', ')} — add more days or remove a region to fit them in.</div>`
        : '';

      const travelDaysHTML = trip.totalTravelDays > 0
        ? `<div class="bb-it-map-hint">${trip.totalTravelDays} of your ${state.totalDays} days ${trip.totalTravelDays === 1 ? 'is' : 'are'} spent travelling between regions (including the drive/bus back to ${regionName(trip.route[0])} at the end) rather than at a stop — that's already factored into the nights below.${trip.tripTooShortForTravel ? ' Your trip is quite tight on time for this route — consider adding a few more days, dropping a region, or choosing a faster transport mode.' : ''}</div>`
        : '';

      const noCampingHTML = trip.noCampingRegions.length
        ? `<div class="bb-it-map-hint">Heads up: ${trip.noCampingRegions.map(k => regionName(k)).join(', ')} ${trip.noCampingRegions.length === 1 ? "doesn't have" : "don't have"} any hostels with camping. You'll need a dorm bed there even on ultra-budget — that's not included in the camping-only total below for those nights.</div>`
        : '';

      panelShell(`
        <div class="bb-it-results">
          ${tooManyHTML}
          ${travelDaysHTML}
          ${noCampingHTML}
          <div class="bb-it-total-card">
            <div>
              <div class="bb-it-total-figure">${zar(trip.grandTotal)} <span class="bb-it-eur">(${eur(trip.grandTotal)})</span></div>
              <div class="bb-it-perday">≈ ${zar(trip.perDay)}/day (${eur(trip.perDay)}/day) per person, ${state.totalDays} days${trip.peak ? ' — travelling in PEAK season' : ' — travelling off-peak'}</div>
            </div>
          </div>

          <h3 style="color:${BRAND_RED};margin:0 0 10px;font-size:20px;">Cost breakdown</h3>
          <div class="bb-it-breakdown">
            <div class="bb-it-breakdown-row"><span>Accommodation (${COST_MODEL.accommodation[trip.accomKey].label}, ${trip.nightsAvailable} night${trip.nightsAvailable !== 1 ? 's' : ''}${trip.totalTravelDays > 0 ? ` + ${trip.totalTravelDays} on the road` : ''})</span><strong>${money(trip.accomTotal)}</strong></div>
            <div class="bb-it-breakdown-row"><span>Food (${COST_MODEL.food[state.style].label})</span><strong>${money(trip.foodTotal)}</strong></div>
            <div class="bb-it-breakdown-row"><span>Drinks (${COST_MODEL.drinks.stages[trip.vibeStage].label})</span><strong>${money(trip.drinksTotal)}</strong></div>
            <div class="bb-it-breakdown-row"><span>Tours & activities</span><strong>${money(trip.toursTotal)}</strong></div>
            <div class="bb-it-breakdown-row"><span>Transport between stops</span><strong>${money(legsOnlyTotal)}</strong></div>
            ${carRentalHTML}
            ${flightHTML}
          </div>

          <h3 style="color:${BRAND_RED};margin:0 0 10px;font-size:20px;">Suggested route</h3>
          <ul class="bb-it-route-list">${routeHTML}</ul>

          <div class="bb-it-disclaimer">
            All prices researched June 2026 and are realistic averages, not live fares — actual prices vary by operator, booking date and demand. Mainline bus and flight prices especially can swing well above or below these figures depending on how far ahead you book. Baz Bus currently only operates Cape Town ↔ Gqeberha (Garden Route) daily — it is not yet running its old nationwide network. Use this as a planning guide, then check exact prices closer to your travel dates.
          </div>

          <div class="bb-it-nav">
            <button class="bb-it-btn secondary" id="bb-it-back">← Adjust answers</button>
            <a class="bb-it-btn secondary" id="bb-it-email" href="#" style="text-decoration:none;display:inline-flex;align-items:center;">✉ Email me this itinerary</a>
            <button class="bb-it-btn secondary" id="bb-it-restart">Start over</button>
          </div>
        </div>
      `);

      document.getElementById('bb-it-back').addEventListener('click', () => { state.step = state.style === 'flash' ? 5 : 4; renderStep(); });
      document.getElementById('bb-it-restart').addEventListener('click', () => {
        state.step = 1; state.selectedRegions = []; state.flights = [];
        clearRouteFromMap();
        enterSelectMode();
        renderStep();
      });

      // ── Email me this itinerary ──
      // A plain mailto: link rather than a backend mail service — zero
      // server dependency, works everywhere, and the person reviews/edits
      // the message in their own mail client before sending. mailto: URLs
      // have an inconsistent practical length ceiling across mail
      // clients — well-behaved browser+webmail combos are fine up to
      // ~2,000 characters, but some report much stricter limits — so
      // the body is kept to a compact plain-text summary (no per-leg
      // transport detail, which is already visible on the page above)
      // and checked against a conservative threshold before sending.
      document.getElementById('bb-it-email').addEventListener('click', function (e) {
        e.preventDefault();

        const lines = [];
        lines.push(`My Backpackers Bible itinerary — ${state.totalDays} days, ${zar(trip.grandTotal)} (${eur(trip.grandTotal)}) total, ~${zar(trip.perDay)}/day pp`);
        lines.push('');
        lines.push('ROUTE:');
        trip.route.forEach((key, i) => {
          const isReturnLeg = trip.isRoundTrip && i === trip.route.length - 1;
          if (isReturnLeg) {
            lines.push(`${i + 1}. ${regionName(key)} — back where you started`);
          } else {
            const extra = i < trip.extraDays ? 1 : 0;
            const nights = trip.daysPerStop + extra;
            lines.push(`${i + 1}. ${regionName(key)} (${nights} night${nights !== 1 ? 's' : ''})`);
          }
        });
        if (trip.totalTravelDays > 0) {
          lines.push(`(${trip.totalTravelDays} day${trip.totalTravelDays !== 1 ? 's' : ''} of travel between stops, included above)`);
        }
        lines.push('');
        lines.push('COST BREAKDOWN:');
        lines.push(`Accommodation: ${zar(trip.accomTotal)} | Food: ${zar(trip.foodTotal)} | Drinks: ${zar(trip.drinksTotal)}`);
        lines.push(`Tours: ${zar(trip.toursTotal)} | Transport: ${zar(legsOnlyTotal)}${trip.carRentalTotal > 0 ? ` | Car rental: ${zar(trip.carRentalTotal)}` : ''}${flightTotal > 0 ? ` | Flights: ${zar(flightTotal)}` : ''}`);
        lines.push('');
        lines.push('See the full breakdown at backpackersbible.com — prices researched June 2026, real fares vary by operator and date.');

        const body = lines.join('\n');
        const subject = `My ${state.totalDays}-day South Africa backpacking itinerary`;
        const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // Conservative length guard — some mail clients (older Outlook
        // desktop especially) choke on long mailto: links. Fail
        // gracefully rather than silently producing a dead link.
        if (mailto.length > 1500) {
          alert("This itinerary is a bit long to email directly — try screenshotting this page instead, or removing a few stops to shorten it.");
          return;
        }
        window.location.href = mailto;
      });
    }

    function renderStep() {
      if (!dataReady) { loadData(); return; }
      if (state.step === 1) renderStep1();
      else if (state.step === 2) renderStep2();
      else if (state.step === 3) renderStep3();
      else if (state.step === 4) renderStep4();
      else if (state.step === 5) renderStep5_flights();
      else renderStep6();
    }

    mount.style.display = '';
    renderStep();
  };

})();
