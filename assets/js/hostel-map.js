/**
 * hostel-map.js  —  BackpackersBible.com shared interactive map  (v3: inline, country-neutral, bottom sheet)
 * Requires: MapLibre GL JS 4.1.3 (loaded here from unpkg unless cfg.maplibreJs / cfg.maplibreCss are set)
 *
 * v2 changes from v1 (everything else is unchanged):
 *   - Runs directly in the host page. No iframe. window.top === window, so the existing
 *     BB_* postMessage protocol (BB_FILTER_MAP, BB_OPEN_HOSTEL, BB_SELECT_MODE, BB_DRAW_ROUTE,
 *     BB_CLEAR_ROUTE, BB_MAP_READY, BB_REGION_TOGGLED) keeps working in-page, so the itinerary
 *     builder needs no changes.
 *   - Country-neutral: hostelsUrl, regionsUrl, countryName, height, terrainRegions,
 *     locateBounds, filterThreshold, maplibreJs and maplibreCss are configurable.
 *   - Filters match legacy booleans (is_party: true) OR numeric scores (scores.party >= threshold)
 *     OR yes/no tags (tags: ['camping']) OR a price band (priceBand: 'budget').
 *   - window.BB_MAP_API = { count(filters), filter(filters) } for the page script. 'filters' can be one key,
 *     an array, or a comma-separated list; a hostel must match ALL of them (multi-select).
 *   - Spanish phone numbers formatted (+34 XXX XX XX XX); tel: links now carry the +.
 *   - Double-load guard.
 *
 * v3 changes:
 *   - A pin's name label is never hidden under neighbouring pins (hovered / focused / selected pin rises).
 *   - Larger desktop popups (320px wide, 13px text); long write-ups scroll inside the popup.
 *   - Booking.com / Hostelworld buttons now sit directly under the street address.
 *   - Mobile (<= 768px): popups are replaced by a bottom sheet fixed to the bottom of the screen, outside
 *     the map. It always fills the lower half of the screen (long write-ups scroll inside it) and the page
 *     is scrolled so the map sits in the upper half. Swipe down, tap x, tap empty map, press Esc or scroll the page down to dismiss it.
 *   - cfg.cssSized: when true the wrapper is sized by CSS (.sa-hostel-map-iframe) instead of inline styles.
 *
 * Usage (normally done by /assets/js/bb-map-loader.js on first interaction):
 *   <div id="bb-map-wrap"></div>
 *   window.BB_MAP_CONFIG = { region:'catalonia', center:[1.605,41.845], zoom:7, countryName:'Spain',
 *     hostelsUrl:'/spain/assets/data/hostels.json', regionsUrl:'/spain/assets/data/regions.json' };
 *   then inject <script src="/assets/js/hostel-map.js">
 *
 * PWA offline fallback images (place these in /assets/):
 *   fallback_map_{region}.jpg
 *   fallback_map_{region}_mobile.jpg
 */
(function () {
  'use strict';
  if (window.__BB_MAP_LOADED) return;
  window.__BB_MAP_LOADED = true;

  const ESRI_KEY     = 'AAPTamFHVrEf9zxt8n1GPoheQBg..bZv3-QfiJifUiQeQyM3pXO47eztKbb95jfxtBtNJzl319gr4-Qv_NmXKOOXFf8ChUYYi4lQviyIz1wk3Rpa69Pb2iltlAFf1MU5_iDbiqXIeRP7sUB3raC3mivce3axukBeoiuKssKI2rvflMzNf5GK47nOPgPlwsKPoEPYZZlLUCxOBw3k9nZFYiHkv57Dm7SRYAlRm612dJDve7isWPk6eJ77s5fU1wtpNRtsaTzRbbT4lgsEsG2ElAT1_TZLPnMqZ';
  const MAPTILER_KEY = 'EQ5JVo2nFxFOEjgxpA7x'; // terrain only (Cape Town / Drakensberg)
  const HOSTELS_URL  = (window.BB_MAP_CONFIG && window.BB_MAP_CONFIG.hostelsUrl) || '/assets/data/hostels.json';
  const REGIONS_URL  = (window.BB_MAP_CONFIG && window.BB_MAP_CONFIG.regionsUrl) || '/assets/data/regions.json';
  const BRAND_YELLOW = '#FFD700';
  const BRAND_RED    = '#bc1d23';

  const cfg     = window.BB_MAP_CONFIG || {};
  const REGION  = cfg.region  || 'national';
  const isMobile = window.innerWidth <= 768;

  const CENTER  = cfg.center || [25.0, -29.0];
  const ZOOM    = cfg.zoom   !== undefined ? cfg.zoom : (REGION === 'national' ? (isMobile ? 4 : 5) : 11);
  const PITCH   = isMobile ? 0 : (cfg.pitch   !== undefined ? cfg.pitch   : 55);
  const BEARING = isMobile ? 0 : (cfg.bearing !== undefined ? cfg.bearing : 0);

  const wrap = document.getElementById('bb-map-wrap');
  if (!wrap) return;
  if (!cfg.cssSized) wrap.style.cssText = 'position:relative;width:100%;height:' + (cfg.height || '590px') + ';';

  wrap.innerHTML = `
    <div id="bb-map"
         style="width:100%;height:100%;background:${BRAND_YELLOW};"
         role="application"
         aria-label="Interactive map of backpacker hostels${REGION !== 'national' ? ' in this region' : ' across ' + (cfg.countryName || 'South Africa')}"
         tabindex="0"></div>
    <button id="bb-map-toggle"
            aria-pressed="true"
            aria-label="Switch map to 2D flat view"
            style="position:absolute;top:10px;left:10px;z-index:10;
                   background:#fff;border:2px solid ${BRAND_YELLOW};border-radius:4px;
                   padding:6px 12px;font-family:'Century Gothic',sans-serif;
                   font-size:11px;font-weight:bold;color:#333;cursor:pointer;
                   box-shadow:0 2px 6px rgba(0,0,0,0.25);transition:background 0.2s;">
      Switch to 2D
    </button>
    <button id="bb-map-locate"
            aria-label="Show my location on the map"
            style="position:absolute;top:46px;left:10px;z-index:10;
                   background:#fff;border:2px solid ${BRAND_YELLOW};border-radius:4px;
                   padding:6px 12px;font-family:'Century Gothic',sans-serif;
                   font-size:11px;font-weight:bold;color:#333;cursor:pointer;
                   box-shadow:0 2px 6px rgba(0,0,0,0.25);transition:background 0.2s;">
      📍 My Location
    </button>
    <div id="bb-map-offline"
         style="display:none;position:absolute;top:0;right:0;bottom:0;left:0;overflow:hidden;">
      <picture>
        <source media="(max-width:600px)" srcset="/assets/fallback_map_${REGION}_mobile.jpg">
        <img src="/assets/fallback_map_${REGION}.jpg"
             alt="Static map of ${REGION} hostels"
             style="width:100%;height:100%;object-fit:cover;display:block;"
             onerror="this.style.display='none'">
      </picture>
      <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
                  background:rgba(0,0,0,0.75);color:#ffffff;
                  font-family:'Century Gothic',sans-serif;font-size:13px;text-align:center;
                  padding:10px 18px;white-space:nowrap;pointer-events:none;">
        <strong>Offline</strong> — full interactive map available when online
      </div>
    </div>
    <noscript>
      <p style="padding:1em;">
        This map requires JavaScript. Please enable JavaScript, or scroll down
        to browse the hostel listings below.
      </p>
    </noscript>`;

  const css = document.createElement('style');
  css.textContent = `
    .bb-marker { display:flex;align-items:center;cursor:pointer;filter:drop-shadow(0 3px 4px rgba(0,0,0,0.3)); }
    .bb-marker-icon { width:32px;height:32px;display:block;flex-shrink:0; }
    .bb-marker-label {
      margin-left:8px;background:#fff;padding:2px 8px;border-radius:4px;
      border:1px solid ${BRAND_YELLOW};font-family:'Century Gothic',sans-serif;
      font-size:11px;font-weight:bold;color:#333;white-space:nowrap;
      box-shadow:2px 2px 5px rgba(0,0,0,0.1);
      opacity:0;pointer-events:none;transition:opacity 0.25s ease-in-out;
    }
    .bb-marker:hover .bb-marker-label,
    .bb-marker:focus-within .bb-marker-label { opacity:1;pointer-events:auto; }
    .bb-region-marker {
      display:none;align-items:center;cursor:pointer;gap:8px;
      filter:drop-shadow(0 3px 4px rgba(0,0,0,0.3));
    }
    .bb-region-marker.is-visible { display:flex; }
    .bb-region-marker-dot {
      width:22px;height:22px;border-radius:50%;flex-shrink:0;
      background:${BRAND_RED};border:3px solid #fff;box-sizing:border-box;
      transition:background 0.15s,border-color 0.15s;
    }
    .bb-region-marker.is-selected .bb-region-marker-dot,
    .bb-region-marker.is-current .bb-region-marker-dot { background:${BRAND_RED}; }
    .bb-region-marker:not(.is-selected):not(.is-current) .bb-region-marker-dot { background:#666; }
    .bb-region-marker-label {
      background:#fff;padding:2px 8px;border-radius:4px;
      border:1px solid ${BRAND_YELLOW};font-family:'Century Gothic',sans-serif;
      font-size:11px;font-weight:bold;color:#333;white-space:nowrap;
      box-shadow:2px 2px 5px rgba(0,0,0,0.1);
    }
    .bb-region-marker:hover .bb-region-marker-dot,
    .bb-region-marker:focus-visible .bb-region-marker-dot { outline:3px solid ${BRAND_YELLOW};outline-offset:1px; }
    .bb-route-stage {
      width:26px;height:26px;border-radius:50%;
      background:${BRAND_RED};color:#fff;border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;
      font-family:'Century Gothic',sans-serif;font-size:13px;font-weight:bold;
      cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.4);
    }
    .bb-route-stage:hover,
    .bb-route-stage:focus { outline:3px solid ${BRAND_YELLOW};outline-offset:1px; }
    .maplibregl-popup { opacity:0;transition:opacity 0.4s ease-in-out;pointer-events:none; }
    .maplibregl-popup.bb-fade-in { opacity:1;pointer-events:auto; }
    .bb-popup { width:320px;font-family:'Century Gothic',sans-serif;font-size:13px;color:#333;overflow-wrap:break-word;word-break:break-word;box-sizing:border-box; }
    .bb-popup h3 { margin:0 0 8px;font-size:16px;color:${BRAND_RED};border-bottom:1px solid #eee;padding-bottom:6px;line-height:1.3; }
    .bb-popup-field { margin:3px 0;line-height:1.5; }
    .bb-popup-field b { color:#555; }
    .bb-popup-field a { color:#333;text-decoration:none; }
    .bb-popup-field a:hover { text-decoration:underline; }
    .bb-popup hr { border:none;border-top:1px solid #eee;margin:6px 0; }
    .bb-popup-info { margin:4px 0;line-height:1.5;color:#444; }
    .bb-popup-more { color:${BRAND_RED};font-weight:bold;text-decoration:none; }
    .bb-popup-more:hover { text-decoration:underline; }
    .bb-popup-btns { display:flex;flex-direction:column;gap:5px;margin-top:8px; }
    .bb-popup-btn { display:block;width:100%;text-align:center;text-decoration:none;padding:8px 6px;border-radius:4px;font-family:'Century Gothic',sans-serif;font-size:13px;font-weight:bold;color:#fff;box-sizing:border-box; }
    .bb-popup-btn:hover { opacity:0.88; }
    .bb-btn-booking { background:#003580; }
    .bb-btn-hostelworld { background:#f37022; }
    .bb-region-tags { display:flex;flex-wrap:wrap;gap:5px;margin:6px 0; }
    .bb-region-tag {
      background:${BRAND_YELLOW};color:#333;font-weight:bold;font-size:10px;
      padding:3px 8px;border-radius:10px;line-height:1.3;white-space:nowrap;
    }
    #bb-map-toggle:hover { background:#fff9d6; }
    #bb-map:focus { outline:3px solid ${BRAND_YELLOW};outline-offset:2px; }

    /* v3 — a hovered / focused / selected pin rises above its neighbours so its name is never hidden */
    .maplibregl-marker.bb-marker:hover,
    .maplibregl-marker.bb-marker:focus-within,
    .maplibregl-marker.bb-marker.bb-marker--active { z-index:1000 !important; }
    .maplibregl-popup { z-index:1100; }
    .bb-popup { max-height:var(--bb-popup-max,420px);overflow-y:auto;overscroll-behavior:contain;padding-right:4px; }
    .bb-popup-btns { margin:8px 0 6px; }

    /* v3 — mobile bottom sheet (replaces popups at <= 768px) */
    #bb-sheet {
      position:fixed;left:0;right:0;bottom:0;z-index:10000;box-sizing:border-box;
      height:50vh;height:50dvh;max-height:50vh;max-height:50dvh;
      display:flex;flex-direction:column;background:#fff;
      border-top:4px solid ${BRAND_YELLOW};border-radius:16px 16px 0 0;
      box-shadow:0 -8px 28px rgba(0,0,0,0.35);
      font-family:'Century Gothic',sans-serif;color:#333;
      transform:translateY(110%);visibility:hidden;
      transition:transform 0.3s ease,visibility 0s linear 0.3s;
    }
    #bb-sheet.is-open { transform:translateY(0);visibility:visible;transition:transform 0.3s ease,visibility 0s; }
    #bb-sheet:focus { outline:none; }
    #bb-sheet .bb-sheet-head { flex:0 0 auto;position:relative;padding:8px 0 4px;touch-action:none; }
    #bb-sheet .bb-sheet-grip { width:44px;height:5px;border-radius:3px;background:#ccc;margin:0 auto; }
    #bb-sheet .bb-sheet-close {
      position:absolute;top:0;right:4px;width:44px;height:44px;border:0;background:transparent;
      font-size:30px;line-height:1;color:#555;cursor:pointer;
    }
    #bb-sheet .bb-sheet-close:focus-visible { outline:3px solid ${BRAND_YELLOW};outline-offset:-3px; }
    #bb-sheet .bb-sheet-body {
      flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
      padding:4px 18px calc(18px + env(safe-area-inset-bottom,0px));
    }
    #bb-sheet .bb-popup { width:auto;max-width:none;max-height:none;overflow:visible;font-size:15px;padding:0; }
    #bb-sheet .bb-popup h3 { font-size:20px;padding-right:40px; }
    #bb-sheet .bb-popup-field { margin:6px 0; }
    #bb-sheet .bb-popup-field a { display:inline-block;padding:3px 0; }
    #bb-sheet .bb-popup-btns { gap:8px; }
    #bb-sheet .bb-popup-btn { font-size:15px;padding:13px 6px; }
    #bb-sheet .bb-popup-more { display:inline-block;padding:4px 0; }
    @media (prefers-reduced-motion:reduce) { #bb-sheet,#bb-sheet.is-open { transition:none; } }
  `;
  document.head.appendChild(css);

  const cssLink = document.createElement('link');
  cssLink.rel   = 'stylesheet';
  cssLink.href  = cfg.maplibreCss || 'https://unpkg.com/maplibre-gl@4.1.3/dist/maplibre-gl.css';
  document.head.appendChild(cssLink);

  const mlScript   = document.createElement('script');
  mlScript.src     = cfg.maplibreJs  || 'https://unpkg.com/maplibre-gl@4.1.3/dist/maplibre-gl.js';
  mlScript.onload  = initMap;
  mlScript.onerror = () => showOffline('MapLibre script failed to load');
  document.head.appendChild(mlScript);

  function showOffline(reason) {
    console.warn('BB map: showing fallback image. Reason:', reason && reason.message ? reason.message : reason || 'unknown');
    const m = document.getElementById('bb-map');
    const o = document.getElementById('bb-map-offline');
    if (m) m.style.display = 'none';
    if (o) o.style.display = 'flex';
  }

  function fmtPhone(p) {
    if (!p) return '';
    const d = p.replace(/\D/g,'');
    if (d.startsWith('27')  && d.length===11) return `+${d.slice(0,2)} ${d.slice(2,4)} ${d.slice(4,7)} ${d.slice(7)}`;
    if (d.startsWith('268') && d.length===11) return `+${d.slice(0,3)} ${d.slice(3,7)} ${d.slice(7)}`;
    if (d.startsWith('266') && d.length===11) return `+${d.slice(0,3)} ${d.slice(3,7)} ${d.slice(7)}`;
    if (d.startsWith('34')  && d.length===11) return `+${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5,7)} ${d.slice(7,9)} ${d.slice(9)}`;
    return p;
  }

  // tel: href — keeps the leading + on international numbers so they dial correctly from abroad
  function telDigits(p) {
    const d = (p || '').replace(/\D/g, '');
    return ((p || '').trim().startsWith('+') || d.length >= 11) ? '+' + d : d;
  }

  function buildPopup(h) {
    const wa  = h.whatsapp  ? `<div class="bb-popup-field"><b>WhatsApp:</b> <a href="https://wa.me/${h.whatsapp.replace(/\D/g,'')}">${fmtPhone(h.whatsapp)}</a></div>` : '';
    const em  = h.email     ? `<div class="bb-popup-field"><b>Email:</b> <a href="mailto:${h.email}">${h.email}</a></div>` : '';
    const web = h.website   ? `<div class="bb-popup-field"><b>Website:</b> <a href="https://${h.website}" target="_blank" rel="noopener noreferrer">${h.website}</a></div>` : '';
    const gr  = h.googleRating  ? `<div class="bb-popup-field"><b>Google Rating:</b> ${h.googleRating}</div>` : '';
    const br  = h.bookingRating ? `<div class="bb-popup-field"><b>Booking.com Rating:</b> ${h.bookingRating}</div>` : '';
    const hwr = h.hwRating      ? `<div class="bb-popup-field"><b>Hostelworld Rating:</b> ${h.hwRating}</div>` : '';
    const ratings = (gr||br||hwr) ? `<hr>${gr}${br}${hwr}` : '';
    const anchor  = h.anchor || '';
    const pageSlug = anchor.includes('#') ? '#'+anchor.split('#')[1] : anchor;
    // On national map the anchor is a full path eg /backpacking-south-africa/cape-town#slug
    // so we navigate to it. On regional pages the target is on the same page so we smooth-scroll.
    const isExternalAnchor = anchor.includes('/') && anchor.includes('#');
    const moreClick = isExternalAnchor
      ? `onclick="window.top.location.href='${anchor}';event.preventDefault();"`
      : (pageSlug ? `onclick="event.preventDefault();var t=document.querySelector('${pageSlug}');if(t)t.scrollIntoView({behavior:'smooth'});"` : '');
    const more = anchor ? ` <a href="${anchor}" class="bb-popup-more" ${moreClick} aria-label="More info about ${h.name}">More info ›</a>` : '';
    const btns = (h.booking||h.hostelworld) ? `
      <div class="bb-popup-btns">
        ${h.booking     ? `<a href="${h.booking}"     target="_blank" rel="noopener sponsored" class="bb-popup-btn bb-btn-booking">Book on Booking.com</a>` : ''}
        ${h.hostelworld ? `<a href="${h.hostelworld}" target="_blank" rel="noopener sponsored" class="bb-popup-btn bb-btn-hostelworld">Book on Hostelworld</a>` : ''}
      </div>` : '';
    return `
      <div class="bb-popup" role="region" aria-label="${h.name} hostel information">
        <h3>${h.name}</h3>
        <div class="bb-popup-field"><b>Address:</b> ${h.address||''}</div>
        ${btns}
        <div class="bb-popup-field"><b>Phone:</b> <a href="tel:${telDigits(h.phone)}">${fmtPhone(h.phone)}</a></div>
        ${wa}${em}${web}${ratings}<hr>
        <div class="bb-popup-info">${h.info||''}${more}</div>
      </div>`;
  }

  function buildRegionPopup(r) {
    const tags = (r.bestFor || []).map(t => `<span class="bb-region-tag">${t}</span>`).join('');
    const tagsHTML = tags
      ? `<div class="bb-region-tags">${tags}</div>`
      : `<p class="bb-popup-info">No "best for" info yet for this region.</p>`;
    const more = r.url
      ? `<a href="${r.url}" class="bb-popup-more" onclick="window.top.location.href='${r.url}';event.preventDefault();" aria-label="More info about ${r.name}">More info ›</a>`
      : '';
    return `
      <div class="bb-popup" role="region" aria-label="${r.name} region information">
        <h3>${r.name}</h3>
        <div class="bb-popup-field"><b>Best for:</b></div>
        ${tagsHTML}
        <hr>
        <div class="bb-popup-info">${more}</div>
      </div>`;
  }

  function initMap() {
    Promise.all([
      fetch(HOSTELS_URL).then(r => r.json()),
      // A missing regions file is fine for a single-region page (no polygons are needed): fall back to {}
      fetch(REGIONS_URL).then(r => (r.ok ? r.json() : {})).catch(() => ({}))
    ]).then(([hostelGeoJSON, regions]) => {

      const features = REGION === 'national'
        ? hostelGeoJSON.features
        : hostelGeoJSON.features.filter(f => f.properties.region === REGION);

      const noscriptEl = wrap.querySelector('noscript');
      if (noscriptEl) {
        noscriptEl.innerHTML = `<ul aria-label="Hostel list">${
          features.map(f => `<li><a href="${f.properties.anchor||'#'}">${f.properties.name}</a>${f.properties.address?' — '+f.properties.address:''}</li>`).join('')
        }</ul>`;
      }

      // OpenFreeMap liberty style provides vector roads and labels that
      // stay correctly oriented regardless of map bearing (unlike a raster
      // label overlay, which bakes text into pixel tiles at north-up and
      // goes upside-down when the bearing changes). Esri satellite imagery
      // is injected as a raster layer beneath all OFM layers in map.on('load').
      // TOUCH SCROLL-TRAP FIX (phones/tablets)
      // With cooperativeGestures on, ONE finger scrolls the page as normal and
      // only TWO fingers move/zoom the map; a short hint appears if someone
      // tries to drag with one finger. Desktop mouse behaviour is unchanged.
      const isTouchDevice = isMobile || window.matchMedia('(pointer: coarse)').matches;

      const mapOptions = {
        container: 'bb-map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: CENTER, zoom: ZOOM, pitch: PITCH, bearing: BEARING,
        cooperativeGestures: isTouchDevice,
        locale: {
          'CooperativeGesturesHandler.MobileHelpText': 'Use 2 fingers to move the map, pinch to zoom'
        }
      };

      // Old GPUs/drivers often refuse a WebGL context that asks for
      // antialiasing. Try with it first (best quality), then without it,
      // before giving up and showing the static fallback image.
      let map;
      try {
        map = new maplibregl.Map(Object.assign({}, mapOptions, { antialias: true }));
      } catch (errAA) {
        console.warn('BB map: WebGL with antialias failed, retrying without it.', errAA);
        const mapEl = document.getElementById('bb-map');
        if (mapEl) mapEl.innerHTML = '';
        try {
          map = new maplibregl.Map(Object.assign({}, mapOptions, { antialias: false }));
        } catch (errNoAA) {
          showOffline(errNoAA);
          return;
        }
      }

      // TRACKPAD SCROLL-TRAP FIX
      // Without this, ANY wheel event over the map — including a Mac
      // trackpad's plain two-finger scroll — gets captured by MapLibre's
      // scroll-zoom handler and page-scroll never happens (the classic
      // "stuck on the map" bug). We don't want to lose real mouse-wheel
      // zoom (it's the fastest way to fly around), so instead of disabling
      // scroll-zoom outright, we intercept each wheel event in the capture
      // phase — before it ever reaches MapLibre's own listener on the
      // canvas — and only let genuine mouse-wheel-shaped events through.
      //
      // Heuristic (not perfect, but covers the real-world cases):
      //   - Firefox reports physical wheels as deltaMode 1 (line-based).
      //   - A real wheel spin is a small number of big, fixed-size notches
      //     (deltaY in large integer steps) with no sideways drift.
      //   - A trackpad scroll is a stream of small, smooth, often
      //     fractional deltaY values, usually with some deltaX drift from
      //     finger movement.
      // Anything ambiguous is treated as trackpad — i.e. it defaults to
      // "let the page scroll" rather than risk trapping the user. This
      // does mean a Magic Mouse or a Windows precision trackpad will also
      // scroll the page rather than zoom the map; the on-screen +/−
      // buttons and Cmd/Ctrl+scroll (still zooms in both cases) remain
      // available either way.
      wrap.addEventListener('wheel', function (e) {
        const isRealWheelNotch =
          e.deltaMode === 1 ||                                   // Firefox line mode
          (e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40);
        if (!isRealWheelNotch) {
          e.stopPropagation(); // never reaches MapLibre's handler; page scrolls as normal
        }
      }, { capture: true, passive: true });

      // Only fall back if the map never managed to load AND the browser is
      // genuinely offline. A single failed tile (status 0) on a slow or flaky
      // connection must not replace a working map with the fallback image.
      let mapHasLoaded = false;
      map.on('load', () => { mapHasLoaded = true; });
      map.on('error', e => {
        if (!mapHasLoaded && !navigator.onLine) showOffline('browser offline');
        else console.warn('BB map: non-fatal map error', e && e.error);
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

      document.getElementById('bb-map').addEventListener('keydown', e => {
        const P = 80;
        if (e.key==='ArrowLeft')  map.panBy([-P,0]);
        if (e.key==='ArrowRight') map.panBy([P,0]);
        if (e.key==='ArrowUp')    map.panBy([0,-P]);
        if (e.key==='ArrowDown')  map.panBy([0,P]);
        if (e.key==='+'||e.key==='=') map.zoomIn();
        if (e.key==='-') map.zoomOut();
      });

      const TERRAIN_REGIONS = cfg.terrainRegions || ['cape-town', 'drakensberg'];
      const hasTerrain = TERRAIN_REGIONS.includes(REGION);

      let is3D = true;
      document.getElementById('bb-map-toggle').addEventListener('click', function() {
        is3D = !is3D;
        if (is3D) {
          map.easeTo({ pitch:PITCH, bearing:BEARING, duration:800 });
          if (hasTerrain) map.setTerrain({ source:'terrain-src', exaggeration:1.15 });
          this.textContent = 'Switch to 2D';
          this.setAttribute('aria-pressed','true');
          this.setAttribute('aria-label','Switch map to 2D flat view');
        } else {
          map.easeTo({ pitch:0, bearing:0, duration:800 });
          if (hasTerrain) map.setTerrain(null);
          this.textContent = 'Switch to 3D';
          this.setAttribute('aria-pressed','false');
          this.setAttribute('aria-label','Switch map to 3D view');
        }
      });

      // ── GEOLOCATION ───────────────────────────────────────────────────────
      // Pulsing blue dot CSS — injected once into the iframe document
      (function() {
        const style = document.createElement('style');
        style.textContent = `
          .bb-locate-dot {
            width: 18px; height: 18px;
            border-radius: 50%;
            background: #2979ff;
            border: 2px solid #ffffff;
            box-shadow: 0 0 0 rgba(41,121,255,0.5);
            animation: bb-locate-pulse 2s ease-out infinite;
          }
          @keyframes bb-locate-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(41,121,255,0.5); }
            70%  { box-shadow: 0 0 0 12px rgba(41,121,255,0); }
            100% { box-shadow: 0 0 0 0 rgba(41,121,255,0); }
          }
        `;
        document.head.appendChild(style);
      }());

      let locateMarker = null;
      document.getElementById('bb-map-locate').addEventListener('click', function() {
        if (!navigator.geolocation) {
          alert('Geolocation is not supported by your browser.');
          return;
        }
        const btn = this;
        btn.textContent = '📍 Locating…';
        btn.disabled = true;

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lng = pos.coords.longitude;
            const lat = pos.coords.latitude;

            // Remove previous dot if any
            if (locateMarker) { locateMarker.remove(); locateMarker = null; }

            // Create pulsing dot element
            const dot = document.createElement('div');
            dot.className = 'bb-locate-dot';
            dot.setAttribute('aria-label', 'Your location');

            locateMarker = new maplibregl.Marker({ element: dot, anchor: 'center' })
              .setLngLat([lng, lat])
              .addTo(map);

            // Only fly to location if user is inside the configured area
            // (cfg.locateBounds = [west, south, east, north]; default = southern Africa)
            const lb = cfg.locateBounds || [15, -35, 34, -17];
            const inSA = lng >= lb[0] && lng <= lb[2] && lat >= lb[1] && lat <= lb[3];
            if (inSA) {
              map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 10), duration: 1200 });
            }

            btn.textContent = '📍 My Location';
            btn.disabled = false;
          },
          (err) => {
            btn.textContent = '📍 My Location';
            btn.disabled = false;
            if (err.code !== err.PERMISSION_DENIED) {
              alert('Could not get your location. Please check your device settings.');
            }
          },
          { timeout: 10000, maximumAge: 60000 }
        );
      });

      map.on('load', () => {
        map.resize();

        // Inject Esri satellite between OFM's fill layers and its road/label
        // layers. Background and fills sit below satellite (hidden behind it);
        // road lines and place-name symbols sit above (fully visible).
        map.addSource('esri-satellite', {
          type: 'raster',
          tiles: [`https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${ESRI_KEY}`],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxzoom: 19
        });
        const _firstLineOrSymbol = map.getStyle().layers.find(
          l => l.type === 'line' || l.type === 'symbol'
        );
        map.addLayer(
          { id: 'esri-satellite-layer', type: 'raster', source: 'esri-satellite' },
          _firstLineOrSymbol ? _firstLineOrSymbol.id : undefined
        );

        // OFM liberty places water fills after some line layers, so they
        // land above satellite in the stack. Zero all fills and background
        // regardless of position — satellite + roads + labels is all we want.
        map.getStyle().layers.forEach(layer => {
          try {
            if (layer.type === 'fill')       map.setPaintProperty(layer.id, 'fill-opacity', 0);
            if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-opacity', 0);
          } catch(e) {}
        });

        // Hide dotted/dashed boundary lines (admin regions, country borders)
        // while keeping solid road lines intact.
        map.getStyle().layers.forEach(layer => {
          try {
            if (layer.type === 'line' && layer.paint && layer.paint['line-dasharray']) {
              map.setPaintProperty(layer.id, 'line-opacity', 0);
            }
          } catch(e) {}
        });

        // Tell the parent page this map is fully initialised — without
        // this, the parent's itinerary builder waits forever for a
        // ready signal that never arrives, and as a result never sends
        // BB_SELECT_MODE at all. That left selectModeActive permanently
        // false here, so every region click fell through to the
        // popup-only branch below instead of toggling the region into
        // the trip — popups appeared, but nothing was ever added.
        window.top.postMessage({ type: 'BB_MAP_READY' }, '*');
        const mapIsReady = true;
        window.addEventListener('message', (e) => {
          // The parent may ask "are you ready?" rather than rely on the
          // one-off broadcast above — covers the case where this map
          // finished loading before the parent's own listener for
          // BB_MAP_READY even existed yet (e.g. the map auto-loads on
          // page load, typically before anyone opens the itinerary
          // builder and that script first runs).
          if (e.data && e.data.type === 'BB_MAP_READY_CHECK' && mapIsReady) {
            window.top.postMessage({ type: 'BB_MAP_READY' }, '*');
          }
        });

        // 3D terrain — only loaded for regions where elevation adds real value
        if (hasTerrain) {
          map.addSource('terrain-src', {
            type: 'raster-dem',
            url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${MAPTILER_KEY}`,
            tileSize: 256
          });
          map.setTerrain({ source:'terrain-src', exaggeration:1.15 });
        }

        // ── REGION OVERLAYS ──────────────────────────────────────────────────
        // drawnRegions tracks which region polygons currently exist as map
        // layers, so BB_SELECT_MODE can add the ones missing on a single-
        // region page without re-creating any that already exist.
        const drawnRegions = new Set();

        function drawRegionPolygon(key, withLabel) {
          if (drawnRegions.has(key)) return;
          const r = regions[key];
          if (!r || !r.polygon || r.polygon.length < 2) return;

          const isLine      = r.geom === 'LineString';
          const fillColor   = r.color       || BRAND_RED;
          const lineColor   = r.lineColor   || fillColor;
          const fillOpacity = r.fillOpacity !== undefined ? r.fillOpacity : 0.25;

          if (isLine) {
            map.addSource(`region-${key}`, {
              type:'geojson',
              data:{ type:'Feature', geometry:{ type:'LineString', coordinates:r.polygon }, properties:{ name:r.name, url:r.url, key } }
            });
            map.addLayer({ id:`region-line-${key}`, type:'line', source:`region-${key}`,
              paint:{ 'line-color':lineColor, 'line-width':4, 'line-opacity':0.85 } });
            map.addLayer({ id:`region-hit-${key}`, type:'line', source:`region-${key}`,
              paint:{ 'line-color':lineColor, 'line-width':20, 'line-opacity':0 } });
          } else {
            const ring = [...r.polygon];
            if (ring[0][0]!==ring[ring.length-1][0] || ring[0][1]!==ring[ring.length-1][1]) ring.push(ring[0]);
            map.addSource(`region-${key}`, {
              type:'geojson',
              data:{ type:'Feature', geometry:{ type:'Polygon', coordinates:[ring] }, properties:{ name:r.name, url:r.url, key } }
            });
            map.addLayer({ id:`region-fill-${key}`, type:'fill', source:`region-${key}`,
              paint:{ 'fill-color':fillColor, 'fill-opacity':fillOpacity } });
            map.addLayer({ id:`region-line-${key}`, type:'line', source:`region-${key}`,
              paint:{ 'line-color':lineColor, 'line-width':2, 'line-opacity':0.8 } });
          }

          if (withLabel && !isLine) {
            const pts = r.polygon;
            const cx  = pts.reduce((s,p)=>s+p[0],0)/pts.length;
            const cy  = pts.reduce((s,p)=>s+p[1],0)/pts.length;
            map.addSource(`rlbl-${key}`, {
              type:'geojson',
              data:{ type:'Feature', geometry:{ type:'Point', coordinates:[cx,cy] }, properties:{ name:r.name } }
            });
            map.addLayer({
              id:`region-label-${key}`, type:'symbol', source:`rlbl-${key}`,
              layout:{ 'text-field':r.name, 'text-font':['Open Sans Bold','Arial Unicode MS Bold'], 'text-size':12, 'text-anchor':'center', 'text-max-width':8 },
              paint:{ 'text-color':'#fff', 'text-halo-color':'rgba(0,0,0,0.65)', 'text-halo-width':2 }
            });
          }

          const hitLayer = isLine ? `region-hit-${key}` : `region-fill-${key}`;
          map.on('mouseenter', hitLayer, () => { map.getCanvas().style.cursor='pointer'; });
          map.on('mouseleave', hitLayer, () => { map.getCanvas().style.cursor=''; });

          // Single click router per region — behaviour (popup vs. toggle
          // selection vs. navigate) is decided at click-time by checking
          // selectModeActive, so we never have to add/remove listeners
          // when entering/exiting select mode. Hostel pins are DOM
          // markers (maplibregl.Marker) that call stopPropagation() on
          // click, so a pin sitting inside this region's fill area
          // already never lets this canvas click handler fire at all —
          // no extra guard needed here.
          map.on('click', hitLayer, (e) => {
            e.clickHandled = true;
            if (selectModeActive) {
              toggleRegionSelection(key, e.lngLat);
            } else if (REGION === 'national') {
              // National view: show a "best for…" popup with a link to the
              // region page, instead of navigating straight there — this
              // also resolves the click-priority issue above, since the
              // polygon no longer competes with hostel pins for the
              // immediate navigation.
              showRegionPopup(key, r, e.lngLat);
            } else if (r.url) {
              window.top.location.href = r.url;
            }
          });

          drawnRegions.add(key);
        }

        const regionsToShow = REGION==='national' ? Object.keys(regions) : [REGION];
        regionsToShow.forEach(key => drawRegionPolygon(key, REGION==='national'));

        // ── ITINERARY BUILDER SELECT MODE ───────────────────────────────────
        // Lets the parent page's itinerary builder turn region polygons into
        // a multi-select control. Off by default; only active between a
        // BB_SELECT_MODE {active:true} message and the matching {active:false}.
        let selectModeActive = false;
        let currentSelectKey = null; // person's chosen starting point while select mode is active
        const selectedRegionKeys = new Set();

        // DOM circle markers for regions with no polygon (e.g. Cape Town,
        // Johannesburg, Tshwane/Pretoria, Durban) — these can't be drawn
        // as clickable map areas, so during select mode they get a small
        // clickable dot at their centre point instead, wired into the
        // same toggleRegionSelection()/regionPaint() flow as polygons.
        const regionMarkers = {};

        function regionPaint(key, state) {
          // state: 'current' | 'selected' | 'default'
          const r = regions[key];
          if (!r) return;
          const lineLayer = `region-line-${key}`;
          const isLine = r.geom === 'LineString';
          const fillLayer = `region-fill-${key}`;

          if (!map.getLayer(lineLayer)) {
            // No polygon layer for this region at all — if it has a
            // centre-point marker instead, style that the same way
            // (red dot = current/selected, grey = unselected).
            const m = regionMarkers[key];
            if (m) {
              m.el.classList.toggle('is-current', state === 'current');
              m.el.classList.toggle('is-selected', state === 'selected');
            }
            return;
          }

          if (isLine) {
            // No fill to work with (it's a road corridor, not an area) —
            // the only way to mark it as current/selected is the line
            // itself: colour it opaque red and make it thicker, the same
            // visual language as the fill regions below.
            if (state === 'current') {
              map.setPaintProperty(lineLayer, 'line-color', BRAND_RED);
              map.setPaintProperty(lineLayer, 'line-width', 6);
              map.setPaintProperty(lineLayer, 'line-opacity', 1);
            } else if (state === 'selected') {
              map.setPaintProperty(lineLayer, 'line-color', BRAND_RED);
              map.setPaintProperty(lineLayer, 'line-width', 5);
              map.setPaintProperty(lineLayer, 'line-opacity', 0.85);
            } else {
              map.setPaintProperty(lineLayer, 'line-color', r.lineColor || r.color || BRAND_RED);
              map.setPaintProperty(lineLayer, 'line-width', 4);
              map.setPaintProperty(lineLayer, 'line-opacity', 0.85);
            }
            return;
          }

          if (!map.getLayer(fillLayer)) return;

          if (state === 'current') {
            // Opaque red override, independent of the region's own colour
            // — previously this just raised fill-opacity on whatever
            // colour the region already had (e.g. the Karoo's own gold),
            // which looked like "the starting region is gold" purely by
            // coincidence of which region happened to be selected. An
            // explicit colour override means the starting region always
            // reads the same way regardless of its normal map colour.
            map.setPaintProperty(fillLayer, 'fill-color', BRAND_RED);
            map.setPaintProperty(fillLayer, 'fill-opacity', 0.55);
            map.setPaintProperty(lineLayer, 'line-color', BRAND_RED);
            map.setPaintProperty(lineLayer, 'line-width', 3);
          } else if (state === 'selected') {
            map.setPaintProperty(fillLayer, 'fill-color', r.color || BRAND_RED);
            map.setPaintProperty(fillLayer, 'fill-opacity', 0.55);
            map.setPaintProperty(lineLayer, 'line-color', r.lineColor || r.color || BRAND_RED);
            map.setPaintProperty(lineLayer, 'line-width', 4);
          } else {
            map.setPaintProperty(fillLayer, 'fill-color', r.color || BRAND_RED);
            map.setPaintProperty(fillLayer, 'fill-opacity', r.fillOpacity !== undefined ? r.fillOpacity : 0.25);
            map.setPaintProperty(lineLayer, 'line-color', r.lineColor || r.color || BRAND_RED);
            map.setPaintProperty(lineLayer, 'line-width', 2);
          }
        }

        function toggleRegionSelection(key, lngLat) {
          // Show the "best for…" popup on every click here too — not just
          // in plain national navigate-mode — so someone unfamiliar with
          // South Africa's regions can see what a region actually offers
          // at the same moment they're deciding whether to add it to
          // their trip. Runs regardless of whether this click is adding
          // or removing the region, matching the existing toggle
          // behaviour exactly (one click does both things at once).
          const r = regions[key];
          if (r && lngLat) showRegionPopup(key, r, lngLat);

          if (key === currentSelectKey) return; // current/starting region can't be deselected here
          if (selectedRegionKeys.has(key)) {
            selectedRegionKeys.delete(key);
            regionPaint(key, 'default');
          } else {
            selectedRegionKeys.add(key);
            regionPaint(key, 'selected');
          }
          window.top.postMessage({
            type: 'BB_REGION_TOGGLED',
            key,
            selected: Array.from(selectedRegionKeys)
          }, '*');
        }

        // Build one centre-point marker for every region that has no
        // polygon to click — created once up front (hidden via
        // .is-visible) rather than on each select-mode toggle, same
        // lazy-but-reusable approach as drawRegionPolygon's drawnRegions
        // guard above.
        Object.keys(regions).forEach(key => {
          const r = regions[key];
          if (!r || (r.polygon && r.polygon.length >= 2) || !r.center) return;

          const container = document.createElement('div');
          container.className = 'bb-region-marker';
          container.setAttribute('role', 'button');
          container.setAttribute('tabindex', '0');
          container.setAttribute('aria-label', `${r.name} — click to select for your itinerary`);

          const dot = document.createElement('div');
          dot.className = 'bb-region-marker-dot';
          container.appendChild(dot);

          const label = document.createElement('div');
          label.className = 'bb-region-marker-label';
          label.textContent = r.name;
          container.appendChild(label);

          const onActivate = (e) => {
            if (!selectModeActive) {
              // Outside select mode this behaves like any other region
              // marker on the national page: a "best for…" popup with a
              // link through to the page, not a select toggle.
              if (REGION === 'national') showRegionPopup(key, r, { lng: r.center[0], lat: r.center[1] });
              else if (r.url) window.top.location.href = r.url;
              return;
            }
            e.stopPropagation();
            toggleRegionSelection(key, { lng: r.center[0], lat: r.center[1] });
          };
          container.addEventListener('click', onActivate);
          container.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(e); } });

          const marker = new maplibregl.Marker({ element: container, anchor: 'left' })
            .setLngLat(r.center)
            .addTo(map);

          regionMarkers[key] = { marker, el: container };
        });

        window.addEventListener('message', (e) => {
          if (!e.data || e.data.type !== 'BB_SELECT_MODE') return;
          selectModeActive = !!e.data.active;

          Object.values(regionMarkers).forEach(m => m.el.classList.toggle('is-visible', selectModeActive));

          // Hostel pins already let clicks pass through to the region
          // polygon underneath while select mode is active (see
          // openPopup's selectModeActive guard below), but they were
          // still visible on top, cluttering the polygons the itinerary
          // builder actually wants tapped. Hide them outright here, then
          // restore via applyFilter (not a blanket show-all) so leaving
          // select mode doesn't undo whatever filter was active before
          // the builder was opened.
          allMarkers.forEach(({ marker }) => { marker.getElement().style.display = selectModeActive ? 'none' : ''; });
          if (!selectModeActive) applyFilter(activeFilter);

          if (selectModeActive) {
            // Draw every region polygon (not just the current page's one)
            // so there's something to click everywhere on the map.
            Object.keys(regions).forEach(key => drawRegionPolygon(key, true));

            // "current" comes from the parent's itinerary builder (the
            // person's chosen starting point in its dropdown), which can
            // differ from this iframe's own page region — e.g. someone on
            // the Cederberg page switches their starting point to Cape
            // Town in the builder. Fall back to this page's own REGION
            // only if the parent didn't specify one.
            currentSelectKey = e.data.current || REGION;

            selectedRegionKeys.clear();
            (e.data.selected || []).forEach(k => selectedRegionKeys.add(k));
            Object.keys(regions).forEach(key => {
              if (key === currentSelectKey) regionPaint(key, 'current');
              else if (selectedRegionKeys.has(key)) regionPaint(key, 'selected');
              else regionPaint(key, 'default');
            });

            if (!isMobile) map.easeTo({ zoom: Math.min(map.getZoom(), 5), pitch: 0, bearing: 0, duration: 600 });
          } else {
            // Revert to plain navigate-mode visuals. Regions that belong on
            // this page (regionsToShow) go back to their normal opacity;
            // any extra regions drawn purely for select mode are hidden
            // again so the map looks exactly as it did before the builder
            // was opened (left drawn as GL layers — cheap — just invisible).
            Object.keys(regions).forEach(key => {
              if (regionsToShow.includes(key)) {
                regionPaint(key, 'default');
              } else if (map.getLayer(`region-fill-${key}`)) {
                map.setPaintProperty(`region-fill-${key}`, 'fill-opacity', 0);
                map.setPaintProperty(`region-line-${key}`, 'line-width', 0);
              }
            });
            selectedRegionKeys.clear();
          }
        });

        // ── MARKERS / CLUSTERS ───────────────────────────────────────────────
        let activePopup = null;
        let activeMarkerEl = null;

        // The pin whose popup / sheet is open stays above its neighbours (see .bb-marker--active)
        function setActiveMarker(el) {
          if (activeMarkerEl) activeMarkerEl.classList.remove('bb-marker--active');
          activeMarkerEl = el || null;
          if (activeMarkerEl) activeMarkerEl.classList.add('bb-marker--active');
        }

        // ── MOBILE BOTTOM SHEET ──────────────────────────────────────────
        // At <= 768px popups are replaced by a panel fixed to the bottom of the screen, outside the
        // map. It sits above the fixed bottom bars (#quick-jump-menu, #page-title-bar), and slides
        // away on swipe-down, the x button, a tap on empty map, Esc, or when the page is scrolled down.
        // (Not inside an iframe: there "the bottom of the screen" would only be the bottom of the map box,
        //  so pages still using the old iframe keep normal popups.)
        const useSheet = () => window.innerWidth <= 768 && window.self === window.top;
        let sheetEl = null, sheetOpen = false, sheetOpenedAt = 0, sheetOpenY = 0, lastScrollY = 0, sheetReturnFocus = null;

        function buildSheet() {
          if (sheetEl) return sheetEl;
          sheetEl = document.createElement('div');
          sheetEl.id = 'bb-sheet';
          sheetEl.setAttribute('role', 'dialog');
          sheetEl.setAttribute('aria-modal', 'false');
          sheetEl.setAttribute('aria-hidden', 'true');
          sheetEl.setAttribute('aria-label', 'Information');
          sheetEl.tabIndex = -1;
          sheetEl.innerHTML =
            '<div class="bb-sheet-head"><div class="bb-sheet-grip" aria-hidden="true"></div>' +
            '<button type="button" class="bb-sheet-close" aria-label="Close">&times;</button></div>' +
            '<div class="bb-sheet-body"></div>';
          document.body.appendChild(sheetEl);

          sheetEl.querySelector('.bb-sheet-close').addEventListener('click', () => closeSheet());
          // "More info" scrolls the page to the hostel's write-up, so the sheet gets out of the way
          sheetEl.addEventListener('click', (ev) => {
            if (ev.target.closest && ev.target.closest('.bb-popup-more')) closeSheet();
          });

          // swipe down on the grip / header to dismiss
          const head = sheetEl.querySelector('.bb-sheet-head');
          let startY = null, dy = 0;
          head.addEventListener('touchstart', (ev) => {
            startY = ev.touches[0].clientY; dy = 0; sheetEl.style.transition = 'none';
          }, { passive: true });
          head.addEventListener('touchmove', (ev) => {
            if (startY === null) return;
            dy = Math.max(0, ev.touches[0].clientY - startY);
            sheetEl.style.transform = 'translateY(' + dy + 'px)';
          }, { passive: true });
          const endDrag = () => {
            if (startY === null) return;
            sheetEl.style.transition = '';
            if (dy > 80) closeSheet();
            sheetEl.style.transform = '';
            startY = null; dy = 0;
          };
          head.addEventListener('touchend', endDrag);
          head.addEventListener('touchcancel', endDrag);

          document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && sheetOpen) closeSheet(); });
          window.addEventListener('scroll', onPageScroll, { passive: true });
          window.addEventListener('resize', () => { if (sheetOpen && !useSheet()) closeSheet(); });
          return sheetEl;
        }

        function onPageScroll() {
          if (!sheetOpen) return;
          const y = window.scrollY;
          // scrolling the page down (like the bottom bars do) slides the sheet away
          if (Date.now() - sheetOpenedAt > 600 && y > lastScrollY + 4 && y - sheetOpenY > 40) closeSheet();
          lastScrollY = y;
        }

        function openSheet(coords, html, markerEl) {
          buildSheet();
          const body = sheetEl.querySelector('.bb-sheet-body');
          body.innerHTML = html;
          body.scrollTop = 0;
          const title = body.querySelector('h3');
          if (title) {
            title.id = 'bb-sheet-title';
            sheetEl.setAttribute('aria-labelledby', 'bb-sheet-title');
            sheetEl.removeAttribute('aria-label');
          }
          if (activePopup) { activePopup.remove(); activePopup = null; }
          sheetReturnFocus = markerEl || document.activeElement;
          setActiveMarker(markerEl);
          sheetOpen = true;
          sheetOpenedAt = Date.now();
          sheetOpenY = lastScrollY = window.scrollY;
          sheetEl.setAttribute('aria-hidden', 'false');
          requestAnimationFrame(() => {
            sheetEl.classList.add('is-open');
            try { sheetEl.focus({ preventScroll: true }); } catch (e) { sheetEl.focus(); }
            // The sheet always takes the lower half of the screen and the map keeps the upper half.
            // If the map isn't mostly inside that upper half, scroll the page so it is
            // (the scroll-away rule is paused while that happens).
            const box0 = wrap.getBoundingClientRect();
            const half = window.innerHeight / 2;
            const visible = Math.max(0, Math.min(box0.bottom, half) - Math.max(box0.top, 0));
            let delay = 0;
            if (visible < Math.min(box0.height, half) * 0.75) {
              window.scrollTo({ top: Math.max(0, window.scrollY + box0.top - 70), behavior: 'smooth' });
              sheetOpenedAt = Date.now() + 900;
              delay = 700;
            }
            setTimeout(() => {
              if (!sheetOpen) return;
              sheetOpenY = lastScrollY = window.scrollY;
              // keep the chosen pin visible above the sheet
              const box = wrap.getBoundingClientRect();
              const covered = Math.max(0, box.bottom - (window.innerHeight - sheetEl.offsetHeight));
              const pad = Math.min(covered, Math.round(box.height * 0.6));
              map.easeTo({ center: coords, padding: { top: 0, left: 0, right: 0, bottom: pad }, duration: 400 });
            }, delay);
          });
        }

        function closeSheet() {
          if (!sheetOpen) return;
          sheetOpen = false;
          sheetEl.classList.remove('is-open');
          sheetEl.setAttribute('aria-hidden', 'true');
          setActiveMarker(null);
          map.easeTo({ padding: { top: 0, left: 0, right: 0, bottom: 0 }, duration: 300 });
          if (sheetReturnFocus && document.contains(sheetReturnFocus) && sheetEl.contains(document.activeElement)) {
            try { sheetReturnFocus.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
          }
          sheetReturnFocus = null;
        }

        function showPopup(coords, html, markerEl) {
          if (useSheet()) { openSheet(coords, html, markerEl); return; }
          if (sheetOpen) closeSheet();
          // long write-ups scroll inside the popup instead of running off the map
          wrap.style.setProperty('--bb-popup-max', Math.max(220, wrap.clientHeight - 130) + 'px');
          setActiveMarker(markerEl);
          const open = () => {
            const p = new maplibregl.Popup({ offset:15, closeButton:false, maxWidth:'none' })
              .setHTML(html).setLngLat(coords).addTo(map);
            activePopup = p;
            setTimeout(() => { const el=p.getElement(); if(el) el.classList.add('bb-fade-in'); }, 50);
          };
          if (activePopup) {
            const el = activePopup.getElement();
            if (el) el.classList.remove('bb-fade-in');
            setTimeout(() => { if(activePopup) activePopup.remove(); open(); }, 400);
          } else { open(); }
        }

        function showRegionPopup(key, r, lngLat) {
          showPopup([lngLat.lng, lngLat.lat], buildRegionPopup(r));
        }

        map.on('click', (e) => {
          if (e.clickHandled) return;
          if (sheetOpen) closeSheet();
          setActiveMarker(null);
          if (activePopup) {
            const el = activePopup.getElement();
            if (el) el.classList.remove('bb-fade-in');
            setTimeout(() => { if(activePopup) { activePopup.remove(); activePopup=null; } }, 400);
          }
        });

        // ── FILTER STATE ─────────────────────────────────────────────────
        let activeFilter = 'all';
        const allMarkers = []; // populated below — every page, national included

        // A hostel matches a filter if ANY of these hold:
        //   legacy boolean   properties.is_party === true
        //   numeric score    properties.scores.party >= threshold (default 7)
        //   yes/no tag       properties.tags includes 'camping'
        //   price band       properties.priceBand === 'budget'
        const FILTER_THRESHOLD = cfg.filterThreshold !== undefined ? cfg.filterThreshold : 7;
        function featureMatches(p, key) {
          if (!key || key === 'all') return true;
          if (p[key] === true) return true;
          const base = String(key).replace(/^is_/, '');
          if (p['is_' + base] === true) return true;
          if (p.priceBand === base) return true;
          if (Array.isArray(p.tags) && p.tags.indexOf(base) !== -1) return true;
          const s = p.scores && p.scores[base];
          return typeof s === 'number' && s >= FILTER_THRESHOLD;
        }

        // Several filters can be active at once and a hostel must match ALL of them
        // (e.g. 'party' + 'surfers' = party hostels that are also good for surfers).
        // Accepts an array, a comma-separated string ('party,surfers'), 'all' or empty.
        function normKeys(f) {
          const list = Array.isArray(f) ? f : String(f == null ? '' : f).split(',');
          return list.map(k => String(k).trim()).filter(k => k && k !== 'all');
        }
        function matchesAll(p, keys) { return keys.every(k => featureMatches(p, k)); }

        // Small public API for the host page (counts let it grey out empty filter buttons)
        window.BB_MAP_API = {
          count:  (f) => { const keys = normKeys(f); return allMarkers.filter(({ feature }) => matchesAll(feature.properties, keys)).length; },
          filter: (f) => applyFilter(f)
        };

        // Returns how many pins are now showing
        function applyFilter(filterKey) {
          activeFilter = filterKey;
          const keys = normKeys(filterKey);
          let shown = 0;
          allMarkers.forEach(({ marker, feature }) => {
            const show = matchesAll(feature.properties, keys);
            if (show) shown++;
            marker.getElement().style.display = show ? '' : 'none';
          });
          return shown;
        }

        // Listen for postMessage filter instructions from parent page
        window.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'BB_FILTER_MAP') {
            applyFilter(e.data.filter);
          }
        });

        // Listen for postMessage to open a specific hostel popup by ID
        // Sent by "FIND ON MAP" links in the parent regional page
        window.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'BB_OPEN_HOSTEL') {
            const target = allMarkers.find(({ feature }) => feature.properties.id === e.data.id);
            if (!target) return;
            const coords = target.feature.geometry.coordinates;
            const html   = buildPopup(target.feature.properties);
            map.flyTo({ center: coords, zoom: Math.max(map.getZoom(), 14), duration: 800 });
            setTimeout(() => showPopup(coords, html, target.marker.getElement()), 850);
          }
        });

        // ── ITINERARY ROUTE LINE ─────────────────────────────────────────
        // Drawn on request from the itinerary builder once it has a
        // computed trip: a red dashed line through the chosen regions,
        // with a small numbered stage marker at the midpoint of each leg.
        // Clicking a stage marker shows "Day X — A to B" plus the chosen
        // transport mode, mirroring the builder's own route list.
        let routeStageMarkers = [];

        function clearRoute() {
          routeStageMarkers.forEach(m => m.remove());
          routeStageMarkers = [];
          if (map.getLayer('bb-route-line')) map.removeLayer('bb-route-line');
          if (map.getLayer('bb-route-line-casing')) map.removeLayer('bb-route-line-casing');
          if (map.getSource('bb-route')) map.removeSource('bb-route');
        }

        function drawRoute(legs) {
          clearRoute();
          if (!legs || !legs.length) return;

          const coordinates = [];
          legs.forEach((leg, i) => {
            if (!leg.fromCoords || !leg.toCoords) return;
            if (i === 0) coordinates.push(leg.fromCoords);
            coordinates.push(leg.toCoords);
          });
          if (coordinates.length < 2) return;

          map.addSource('bb-route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} }
          });
          // White casing underneath so the dashed red line stays visible
          // over both light and dark map basemap areas.
          map.addLayer({
            id: 'bb-route-line-casing', type: 'line', source: 'bb-route',
            paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.9 }
          });
          map.addLayer({
            id: 'bb-route-line', type: 'line', source: 'bb-route',
            paint: { 'line-color': '#bc1d23', 'line-width': 3.5, 'line-dasharray': [2, 1.5] }
          });

          legs.forEach((leg, i) => {
            if (!leg.fromCoords || !leg.toCoords) return;
            const mid = [(leg.fromCoords[0] + leg.toCoords[0]) / 2, (leg.fromCoords[1] + leg.toCoords[1]) / 2];

            const el = document.createElement('div');
            el.className = 'bb-route-stage';
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.textContent = String(i + 1);
            const label = `Day ${leg.departDay} — ${leg.fromName} to ${leg.toName}`;
            el.setAttribute('aria-label', `${label}. Click for travel details.`);

            const html = `
              <div class="bb-popup" role="region" aria-label="${label}">
                <h3>Day ${leg.departDay}</h3>
                <div class="bb-popup-field">${leg.fromName} → ${leg.toName}</div>
                <div class="bb-popup-field"><b>By:</b> ${leg.modeLabel || ''}</div>
                <div class="bb-popup-field"><b>Distance:</b> ~${leg.km}km</div>
              </div>`;

            const openStagePopup = ev => { if (ev) ev.stopPropagation(); showPopup(mid, html); };
            el.addEventListener('click', openStagePopup);
            el.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openStagePopup(ev); } });

            const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(mid).addTo(map);
            routeStageMarkers.push(marker);
          });

          // Frame the whole route so the person can see it all at once.
          try {
            const bounds = coordinates.reduce(
              (b, c) => b.extend(c),
              new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
            );
            map.fitBounds(bounds, { padding: 60, duration: 800, maxZoom: 7 });
          } catch (err) { /* non-fatal — line still drawn even if framing fails */ }
        }

        window.addEventListener('message', (e) => {
          if (!e.data) return;
          if (e.data.type === 'BB_DRAW_ROUTE') drawRoute(e.data.legs);
          else if (e.data.type === 'BB_CLEAR_ROUTE') clearRoute();
        });

        // ── HOSTEL PINS (all pages, including national) ──────────────────
        // Same SVG pin markers everywhere — DOM-based maplibregl.Marker
        // elements, not GL circle layers. This used to be split into a
        // GL-circle path for the national page (for perf with 200+ points)
        // and a DOM-marker path for regional pages, but Geoff wants the
        // same real hostel-pin SVG icon used everywhere, so it's now one
        // path. DOM markers naturally call stopPropagation() on click,
        // which is what actually stops a region polygon underneath a pin
        // from also firing — simpler and more reliable than querying for
        // a pin under the click point from the polygon's own handler.
        features.forEach(feature => {
          const h      = feature.properties;
          const coords = feature.geometry.coordinates;
          const html   = buildPopup(h);

          const container = document.createElement('div');
          container.className = 'bb-marker';
          container.setAttribute('role','button');
          container.setAttribute('tabindex','0');
          container.setAttribute('aria-label',`${h.name} — click for details`);

          const icon = document.createElement('img');
          icon.src   = h.is_best_overall ? '/assets/icons/hostel-pin-best.svg' : '/assets/icons/hostel-pin.svg';
          icon.className = 'bb-marker-icon';
          icon.alt   = '';
          icon.setAttribute('aria-hidden','true');
          icon.width = 32; icon.height = 32;
          icon.onerror = function() {
            this.style.cssText='width:18px;height:18px;border-radius:50%;background:#bc1d23;border:2px solid #fff;flex-shrink:0;display:block;';
            this.src='';
          };
          container.appendChild(icon);

          // National view has 200+ pins on screen at once — name labels
          // for every one would be visual noise until zoomed in, so they
          // only show on hover/focus (same CSS as regional pages) rather
          // than changing behaviour here; regional pages have few enough
          // pins that this was already the right call.
          const label = document.createElement('div');
          label.className  = 'bb-marker-label';
          label.textContent = h.name;
          label.setAttribute('aria-hidden','true');
          container.appendChild(label);

          // During select mode (itinerary builder choosing regions), pins
          // yield entirely — no stopPropagation, no popup — so a click on
          // a pin sitting inside a region still reaches that region's
          // polygon handler underneath and toggles its selection.
          const openPopup = e => {
            if (selectModeActive) return;
            if(e) e.stopPropagation();
            showPopup(coords, html, container);
          };
          container.addEventListener('click', openPopup);
          container.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){e.preventDefault();openPopup(e);} });

          const marker = new maplibregl.Marker({ element:container, anchor:'left' }).setLngLat(coords).addTo(map);
          allMarkers.push({ marker, feature });
        }); // end features.forEach

        // Inline style loads near-synchronously so MapLibre may not
        // schedule a render frame after all markers/layers are added.
        // triggerRepaint() ensures everything is visible without needing
        // a click or pan to force the first draw.
        map.triggerRepaint();

      }); // end map.on('load')

    }).catch(err => { console.error('BB map error:',err); showOffline(err); });
  }

})();