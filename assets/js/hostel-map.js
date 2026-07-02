/**
 * hostel-map.js  —  BackpackersBible.com shared interactive map
 * Requires: MapLibre GL JS 4.1.3
 * /assets/data/hostels.json
 * /assets/data/regions.json
 *
 * Usage on any page:
 * <div id="bb-map-wrap"></div>
 * <script>
 * window.BB_MAP_CONFIG = {
 * region:  'cape-town',        // slug from regions.json, or 'national'
 * center:  [18.415, -33.925],  // [lng, lat]
 * zoom:    13,
 * pitch:   60,                 // optional, default 55
 * bearing: 180                 // 0=N 90=E 180=S 270=W
 * };
 * </script>
 * <script src="/assets/js/hostel-map.js" defer></script>
 *
 * PWA offline fallback images (place these in /assets/):
 * fallback_map_{region}.jpg
 * fallback_map_{region}_mobile.jpg
 */
(function () {
  'use strict';

  const ESRI_KEY     = 'AAPTamFHVrEf9zxt8n1GPoheQBg..bZv3-QfiJifUiQeQyM3pXO47eztKbb95jfxtBtNJzl319gr4-Qv_NmXKOOXFf8ChUYYi4lQviyIz1wk3Rpa69Pb2iltlAFf1MU5_iDbiqXIeRP7sUB3raC3mivce3axukBeoiuKssKI2rvflMzNf5GK47nOPgPlwsKPoEPYZZlLUCxOBw3k9nZFYiHkv57Dm7SRYAlRm612dJDve7isWPk6eJ77s5fU1wtpNRtsaTzRbbT4lgsEsG2ElAT1_TZLPnMqZ';
  const MAPTILER_KEY = 'EQ5JVo2nFxFOEjgxpA7x'; // terrain only (Cape Town / Drakensberg)
  const HOSTELS_URL  = '/assets/data/hostels.json';
  const REGIONS_URL  = '/assets/data/regions.json';
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
  wrap.style.cssText = 'position:relative;width:100%;height:590px;';

  wrap.innerHTML = `
    <div id="bb-map"
         style="width:100%;height:100%;background:${BRAND_YELLOW};"
         role="application"
         aria-label="Interactive map of backpacker hostels${REGION !== 'national' ? ' in this region' : ' across South Africa'}"
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
    .bb-popup { width:220px;font-family:'Century Gothic',sans-serif;font-size:11px;color:#333;overflow-wrap:break-word;word-break:break-word;box-sizing:border-box; }
    .bb-popup h3 { margin:0 0 8px;font-size:13px;color:${BRAND_RED};border-bottom:1px solid #eee;padding-bottom:6px;line-height:1.3; }
    .bb-popup-field { margin:3px 0;line-height:1.5; }
    .bb-popup-field b { color:#555; }
    .bb-popup-field a { color:#333;text-decoration:none; }
    .bb-popup-field a:hover { text-decoration:underline; }
    .bb-popup hr { border:none;border-top:1px solid #eee;margin:6px 0; }
    .bb-popup-info { margin:4px 0;line-height:1.5;color:#444; }
    .bb-popup-more { color:${BRAND_RED};font-weight:bold;text-decoration:none; }
    .bb-popup-more:hover { text-decoration:underline; }
    .bb-popup-btns { display:flex;flex-direction:column;gap:5px;margin-top:8px; }
    .bb-popup-btn { display:block;width:100%;text-align:center;text-decoration:none;padding:6px 4px;border-radius:4px;font-family:'Century Gothic',sans-serif;font-size:11px;font-weight:bold;color:#fff;box-sizing:border-box; }
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
  `;
  document.head.appendChild(css);

  const cssLink = document.createElement('link');
  cssLink.rel   = 'stylesheet';
  cssLink.href  = 'https://unpkg.com/maplibre-gl@4.1.3/dist/maplibre-gl.css';
  document.head.appendChild(cssLink);

  const mlScript   = document.createElement('script');
  mlScript.src     = 'https://unpkg.com/maplibre-gl@4.1.3/dist/maplibre-gl.js';
  mlScript.onload  = initMap;
  mlScript.onerror = showOffline;
  document.head.appendChild(mlScript);

  function showOffline() {
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
    return p;
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
        <div class="bb-popup-field"><b>Phone:</b> <a href="tel:${(h.phone||'').replace(/\D/g,'')}">${fmtPhone(h.phone)}</a></div>
        ${wa}${em}${web}${ratings}<hr>
        <div class="bb-popup-info">${h.info||''}${more}</div>
        ${btns}
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
      fetch(REGIONS_URL).then(r => r.json())
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

      // A real network fetch (even from local CDN) ensures the browser
      // completes at least one layout pass before `load` fires, so
      // map.project() has correct canvas dimensions when markers are added.
      // Esri sources and layers are added dynamically inside map.on('load').
      const map = new maplibregl.Map({
        container: 'bb-map',
        style: '/assets/map-style.json',
        center: CENTER, zoom: ZOOM, pitch: PITCH, bearing: BEARING, antialias: true
      });

      map.on('error', e => { if (e.error && (e.error.status===0 || !navigator.onLine)) showOffline(); });

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

      const TERRAIN_REGIONS = ['cape-town', 'drakensberg'];
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

            // Only fly to location if user is within southern Africa bounds
            // (roughly: lng 15–34, lat -35 to -17)
            const inSA = lng >= 15 && lng <= 34 && lat >= -35 && lat <= -17;
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

        // Add Esri satellite base and label overlay — sources are injected
        // here rather than in the style file so the API key stays out of
        // a static asset and Esri tile URLs stay in version-controlled JS.
        map.addSource('esri-satellite', {
          type: 'raster',
          tiles: [`https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${ESRI_KEY}`],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxzoom: 19
        });
        map.addLayer({ id: 'esri-satellite-layer', type: 'raster', source: 'esri-satellite' });

        map.addSource('esri-labels', {
          type: 'raster',
          tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          maxzoom: 19
        });
        map.addLayer({ id: 'esri-labels-layer', type: 'raster', source: 'esri-labels' });

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

        function showPopup(coords, html) {
          const open = () => {
            const p = new maplibregl.Popup({ offset:15, closeButton:false })
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
          if (activePopup) {
            const el = activePopup.getElement();
            if (el) el.classList.remove('bb-fade-in');
            setTimeout(() => { if(activePopup) { activePopup.remove(); activePopup=null; } }, 400);
          }
        });

        // ── FILTER STATE ─────────────────────────────────────────────────
        let activeFilter = 'all';
        const allMarkers = []; // populated below — every page, national included

        function applyFilter(filterKey) {
          activeFilter = filterKey;
          allMarkers.forEach(({ marker, feature }) => {
            const show = filterKey === 'all' || feature.properties[filterKey] === true;
            marker.getElement().style.display = show ? '' : 'none';
          });
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
            setTimeout(() => showPopup(coords, html), 850);
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
            showPopup(coords,html);
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

    }).catch(err => { console.error('BB map error:',err); showOffline(); });
  }

})();