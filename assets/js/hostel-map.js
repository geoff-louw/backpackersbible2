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

  const MAPTILER_KEY = 'EQ5JVo2nFxFOEjgxpA7x';
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

      const map = new maplibregl.Map({
        container: 'bb-map',
        style: `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_KEY}`,
        center: CENTER, zoom: ZOOM, pitch: PITCH, bearing: BEARING, antialias: true
      });
      window._bbMap = map; // temporary diagnostic handle — remove after layer IDs confirmed

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

      let is3D = true;
      document.getElementById('bb-map-toggle').addEventListener('click', function() {
        is3D = !is3D;
        if (is3D) {
          map.easeTo({ pitch:PITCH, bearing:BEARING, duration:800 });
          map.setTerrain({ source:'terrain-src', exaggeration:1.15 });
          this.textContent = 'Switch to 2D';
          this.setAttribute('aria-pressed','true');
          this.setAttribute('aria-label','Switch map to 2D flat view');
        } else {
          map.easeTo({ pitch:0, bearing:0, duration:800 });
          map.setTerrain(null);
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

        map.addSource('terrain-src', {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${MAPTILER_KEY}`,
          tileSize: 256
        });
        map.setTerrain({ source:'terrain-src', exaggeration:1.15 });

        // ── ANTIQUE MAP STYLING ──────────────────────────────────────────────
        // 1. Parchment background — loaded as a repeating pattern image
        map.loadImage('/assets/maps/parchment-background.webp', (err, img) => {
          if (err) { console.warn('BB map: parchment image failed to load', err); return; }
          map.addImage('parchment-tile', img, { pixelRatio: 1 });

          // Replace the existing background layer's paint with our pattern,
          // or add a new background layer if one doesn't exist
          if (map.getLayer('background')) {
            map.setPaintProperty('background', 'background-pattern', 'parchment-tile');
            map.setPaintProperty('background', 'background-opacity', 1);
          } else {
            map.addLayer({
              id: 'parchment-bg',
              type: 'background',
              paint: {
                'background-pattern': 'parchment-tile',
                'background-opacity': 1
              }
            }, map.getStyle().layers[0].id);
          }
        });

        // ── helper: safely set paint on any layer that exists ────────────────
        function ap(layerId, prop, value) {
          try { if (map.getLayer(layerId)) map.setPaintProperty(layerId, prop, value); } catch(e) {}
        }
        function al(layerId, prop, value) {
          try { if (map.getLayer(layerId)) map.setLayoutProperty(layerId, prop, value); } catch(e) {}
        }

        // ── Hide any satellite/raster imagery layers from the base style ─────
        // topo-v2 shouldn't have these but belt-and-braces in case of style bleed
        map.getStyle().layers.forEach(layer => {
          if (layer.type === 'raster' && layer.id !== 'parchment-bg') {
            try { map.setLayoutProperty(layer.id, 'visibility', 'none'); } catch(e) {}
          }
        });

        // ── 3. Water — washed-out antique blue ──────────────────────────────
        const WATER_BLUE   = '#a8bfcc';
        const WATER_BORDER = '#8aaab8';
        ['water', 'water_name', 'water-shadow', 'waterway'].forEach(id => {
          ap(id, 'fill-color',   WATER_BLUE);
          ap(id, 'line-color',   WATER_BORDER);
          ap(id, 'text-color',   '#4a6a7a');
          ap(id, 'text-halo-color', 'rgba(168,191,204,0.6)');
        });
        // Topo-v2 specific water layer names
        ['Water', 'water_poly', 'ocean'].forEach(id => {
          ap(id, 'fill-color', WATER_BLUE);
        });

        // ── 4. Land cover — antique greens and naturals ──────────────────────
        // Forest / wood → sage green
        ['landcover_wood', 'landcover-wood', 'landuse_wood', 'wood'].forEach(id => {
          ap(id, 'fill-color', '#b8c9a0');
          ap(id, 'fill-opacity', 0.55);
        });
        // Grass / scrub → pale olive
        ['landcover_grass', 'landcover-grass', 'landuse_grass', 'grass', 'scrub'].forEach(id => {
          ap(id, 'fill-color', '#cdd5a8');
          ap(id, 'fill-opacity', 0.45);
        });
        // Sand / beach → warm parchment
        ['landcover_sand', 'sand', 'beach'].forEach(id => {
          ap(id, 'fill-color', '#e8d8a8');
          ap(id, 'fill-opacity', 0.6);
        });
        // Wetland / marsh
        ['wetland', 'landuse_wetland'].forEach(id => {
          ap(id, 'fill-color', '#b0c4a8');
          ap(id, 'fill-opacity', 0.5);
        });
        // Urban / built-up → slightly darker parchment
        ['landuse_residential', 'landuse-residential', 'urban', 'residential'].forEach(id => {
          ap(id, 'fill-color', '#d8c898');
          ap(id, 'fill-opacity', 0.3);
        });

        // ── 5. Roads — national routes deep red, others sepia ───────────────
        const ROAD_NATIONAL = '#8b1a1a';   // deep antique red  — N1/N2/N3 etc
        const ROAD_PRIMARY  = '#a0522d';   // sienna            — main regional roads
        const ROAD_SECONDARY= '#7a5c3a';   // dark sepia        — secondary
        const ROAD_MINOR    = '#9a8060';   // mid sepia         — minor / residential
        const ROAD_CASING   = '#c8a878';   // light sepia casing

        // Motorway / trunk = national routes (N1 N2 etc in SA)
        ['road_motorway', 'road-motorway', 'motorway', 'road_trunk', 'road-trunk', 'trunk'].forEach(id => {
          ap(id, 'line-color',       ROAD_NATIONAL);
          ap(id, 'line-opacity',     0.9);
        });
        ['road_motorway_casing', 'road-motorway-casing', 'motorway_casing',
         'road_trunk_casing',    'road-trunk-casing',    'trunk_casing'].forEach(id => {
          ap(id, 'line-color', ROAD_CASING);
        });

        // Primary roads
        ['road_primary', 'road-primary', 'primary'].forEach(id => {
          ap(id, 'line-color',   ROAD_PRIMARY);
          ap(id, 'line-opacity', 0.85);
        });
        ['road_primary_casing', 'road-primary-casing', 'primary_casing'].forEach(id => {
          ap(id, 'line-color', ROAD_CASING);
        });

        // Secondary
        ['road_secondary', 'road-secondary', 'secondary',
         'road_tertiary',  'road-tertiary',  'tertiary'].forEach(id => {
          ap(id, 'line-color',   ROAD_SECONDARY);
          ap(id, 'line-opacity', 0.8);
        });

        // Minor / residential / service
        ['road_minor', 'road-minor', 'minor', 'road_residential', 'road-residential',
         'residential', 'road_service', 'road-service', 'service', 'road_path'].forEach(id => {
          ap(id, 'line-color',   ROAD_MINOR);
          ap(id, 'line-opacity', 0.65);
        });

        // ── 6. Contour lines — warm sepia ───────────────────────────────────
        ['contour', 'contour_label', 'contour-label', 'contour_index', 'contour-index'].forEach(id => {
          ap(id, 'line-color',  '#8b6940');
          ap(id, 'line-opacity', 0.45);
          ap(id, 'fill-color',  '#8b6940');
          ap(id, 'text-color',  '#7a5c30');
        });

        // ── 7. Boundaries — dark brown ───────────────────────────────────────
        ['boundary_country', 'boundary-country', 'admin_country',
         'boundary_state',   'boundary-state',   'admin_state',
         'boundary',         'admin'].forEach(id => {
          ap(id, 'line-color',   '#6b4a2a');
          ap(id, 'line-opacity', 0.7);
        });

        // ── 8. Labels — serif-style ink brown ───────────────────────────────
        const LABEL_INK   = '#3a2a1a';
        const LABEL_HALO  = 'rgba(235,220,185,0.75)';
        const LABEL_WATER = '#4a6a7a';

        // Collect all symbol layers and restyle text
        map.getStyle().layers.forEach(layer => {
          if (layer.type !== 'symbol') return;
          const id = layer.id;
          // Water labels stay blue-grey
          if (id.includes('water') || id.includes('ocean') || id.includes('lake') || id.includes('river')) {
            ap(id, 'text-color',      LABEL_WATER);
            ap(id, 'text-halo-color', 'rgba(168,191,204,0.5)');
          } else {
            ap(id, 'text-color',      LABEL_INK);
            ap(id, 'text-halo-color', LABEL_HALO);
          }
        });

        // ── 9. Hillshade — warm tone to blend with parchment ────────────────
        ['hillshade', 'terrain_hillshade', 'terrain-hillshade'].forEach(id => {
          ap(id, 'hillshade-shadow-color',    '#5a3a1a');
          ap(id, 'hillshade-highlight-color', '#f5ead0');
          ap(id, 'hillshade-illumination-direction', 315);
          ap(id, 'hillshade-exaggeration',    0.5);
        });

        // ── END ANTIQUE STYLING ──────────────────────────────────────────────

        const sources = map.getStyle().sources;
        const vecSrc  = Object.keys(sources).find(k => sources[k].type==='vector');
        if (vecSrc) {
          try {
            map.addLayer({
              id:'bb-3d-buildings', source:vecSrc, 'source-layer':'building',
              type:'fill-extrusion', minzoom:12,
              paint:{
                'fill-extrusion-color':['interpolate',['linear'],['get','render_height'],0,'#c8b89a',50,'#a89070',100,'#7a6a5a'],
                'fill-extrusion-height':['coalesce',['get','render_height'],['get','height'],5],
                'fill-extrusion-base':['coalesce',['get','render_min_height'],['get','min_height'],0],
                'fill-extrusion-opacity':0.85
              }
            });
          } catch(e) { console.warn('3D buildings:',e.message); }
        }

        // ── REGION OVERLAYS ──────────────────────────────────────────────────
        const regionsToShow = REGION==='national' ? Object.keys(regions) : [REGION];

        regionsToShow.forEach(key => {
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

          if (REGION==='national' && !isLine) {
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

          if (REGION==='national') {
            const hitLayer = isLine ? `region-hit-${key}` : `region-fill-${key}`;
            map.on('click',      hitLayer, (e) => { 
              e.clickHandled = true; 
              if (r.url) window.top.location.href = r.url; 
            });
            map.on('mouseenter', hitLayer, () => { map.getCanvas().style.cursor='pointer'; });
            map.on('mouseleave', hitLayer, () => { map.getCanvas().style.cursor=''; });
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
        const allMarkers = []; // populated below for regional pages

        function applyFilter(filterKey) {
          activeFilter = filterKey;
          const filtered = filterKey === 'all'
            ? features
            : features.filter(f => f.properties[filterKey] === true);

          if (REGION === 'national') {
            map.getSource('hostels-clustered').setData({
              type: 'FeatureCollection',
              features: filtered
            });
          } else {
            allMarkers.forEach(({ marker, feature }) => {
              const show = filterKey === 'all' || feature.properties[filterKey] === true;
              marker.getElement().style.display = show ? '' : 'none';
            });
          }
        }

        // Listen for postMessage filter instructions from parent page
        window.addEventListener('message', (e) => {
          if (e.data && e.data.type === 'BB_FILTER_MAP') {
            applyFilter(e.data.filter);
          }
        });

        if (REGION === 'national') {
          // ── CLUSTERED VIEW (national page only) ──────────────────────────
          map.addSource('hostels-clustered', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: features },
            cluster: true,
            clusterMaxZoom: 7,
            clusterRadius: 50
          });

          // Cluster circles
          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'hostels-clustered',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#ffd400',
              'circle-radius': ['step', ['get','point_count'], 18, 5, 24, 20, 30],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });

          // Cluster count labels
          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'hostels-clustered',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-size': 12
            },
            paint: { 'text-color': '#333333' }
          });

          // Individual unclustered points — standard
          map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'hostels-clustered',
            filter: ['all', ['!', ['has', 'point_count']], ['!=', ['get', 'is_best_overall'], true]],
            paint: {
              'circle-color': '#ffd400',
              'circle-radius': 7,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });

          // Best overall unclustered points — larger gold circle with red stroke
          map.addLayer({
            id: 'unclustered-point-best',
            type: 'circle',
            source: 'hostels-clustered',
            filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'is_best_overall'], true]],
            paint: {
              'circle-color': '#ffd400',
              'circle-radius': 10,
              'circle-stroke-width': 3,
              'circle-stroke-color': '#bc1d23'
            }
          });

          // Click cluster → zoom in
          map.on('click', 'clusters', (e) => {
            e.clickHandled = true;
            const id = e.features[0].properties.cluster_id;
            map.getSource('hostels-clustered').getClusterExpansionZoom(id, (err, zoom) => {
              if (err) return;
              map.easeTo({ center: e.features[0].geometry.coordinates, zoom });
            });
          });

          // Click individual point → show popup
          map.on('click', 'unclustered-point', (e) => {
            e.clickHandled = true;
            const h = e.features[0].properties;
            const coords = e.features[0].geometry.coordinates.slice();
            
            // Fixes coordinate wrapping if users spin the map globe sideways
            while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
              coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
            }
            
            showPopup(coords, buildPopup(h));
          });

          map.on('mouseenter', 'clusters',               () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'clusters',               () => { map.getCanvas().style.cursor = ''; });
          map.on('mouseenter', 'unclustered-point',      () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'unclustered-point',      () => { map.getCanvas().style.cursor = ''; });
          map.on('mouseenter', 'unclustered-point-best', () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', 'unclustered-point-best', () => { map.getCanvas().style.cursor = ''; });

          // Click best-overall point → show popup
          map.on('click', 'unclustered-point-best', (e) => {
            e.clickHandled = true;
            const h = e.features[0].properties;
            const coords = e.features[0].geometry.coordinates.slice();
            while (Math.abs(e.lngLat.lng - coords[0]) > 180) {
              coords[0] += e.lngLat.lng > coords[0] ? 360 : -360;
            }
            showPopup(coords, buildPopup(h));
          });

        } else {
          // ── INDIVIDUAL MARKERS (regional pages) ──────────────────────────

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

            const label = document.createElement('div');
            label.className  = 'bb-marker-label';
            label.textContent = h.name;
            label.setAttribute('aria-hidden','true');
            container.appendChild(label);

            const openPopup = e => { if(e) e.stopPropagation(); showPopup(coords,html); };
            container.addEventListener('click', openPopup);
            container.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){e.preventDefault();openPopup();} });

            const marker = new maplibregl.Marker({ element:container, anchor:'left' }).setLngLat(coords).addTo(map);
            allMarkers.push({ marker, feature });
          }); // end features.forEach

        } // end else (regional markers)

      }); // end map.on('load')

    }).catch(err => { console.error('BB map error:',err); showOffline(); });
  }

})();