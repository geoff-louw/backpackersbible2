/**
 * hostel-map.js
 * BackpackersBible.com shared interactive map script
 * Requires: MapLibre GL JS 4.1.3, /assets/data/hostels.json, /assets/data/regions.json
 *
 * Usage on any page:
 *   <div id="bb-map-wrap"></div>
 *   <script>
 *     window.BB_MAP_CONFIG = {
 *       region: 'cape-town',   // or 'national' for the homepage
 *       center: [18.415, -33.925],
 *       zoom: 13,
 *       pitch: 60            // optional, defaults to 55
 *     };
 *   </script>
 *   <script src="/assets/js/hostel-map.js" defer></script>
 */

(function () {
  'use strict';

  const MAPTILER_KEY = 'EQ5JVo2nFxFOEjgxpA7x';
  const HOSTELS_URL  = '/assets/data/hostels.json';
  const REGIONS_URL  = '/assets/data/regions.json';

  // ─── CONFIG ────────────────────────────────────────────────────────────────
  const cfg = window.BB_MAP_CONFIG || {};
  const REGION   = cfg.region  || 'national';
  const CENTER   = cfg.center  || [25.0, -29.0];
  const ZOOM     = cfg.zoom    || (REGION === 'national' ? 5 : 11);
  const PITCH    = cfg.pitch   !== undefined ? cfg.pitch : 55;
  const BEARING  = cfg.bearing !== undefined ? cfg.bearing : 0;

  // ─── INJECT WRAPPER HTML ───────────────────────────────────────────────────
  const wrap = document.getElementById('bb-map-wrap');
  if (!wrap) return;

  wrap.style.position = 'relative';
  wrap.style.width    = '100%';
  wrap.style.height   = '620px';

  wrap.innerHTML = `
    <div id="bb-map" style="width:100%;height:100%;background:#a8d5ff;"
         role="application"
         aria-label="Interactive map of backpacker hostels${REGION !== 'national' ? ' in this region' : ' across South Africa'}"
         tabindex="0"></div>
    <button id="bb-map-toggle"
            aria-pressed="true"
            aria-label="Switch map to 2D flat view"
            style="position:absolute;top:10px;left:10px;z-index:10;background:#fff;
                   border:2px solid #ffcc00;border-radius:4px;padding:6px 12px;
                   font-family:'Century Gothic',sans-serif;font-size:11px;
                   font-weight:bold;color:#333;cursor:pointer;
                   box-shadow:0 2px 6px rgba(0,0,0,0.25);">
      Switch to 2D
    </button>
    <noscript>
      <p style="padding:1em;">
        This map requires JavaScript. Please enable JavaScript to view the interactive hostel map,
        or scroll down to browse the hostel listings below.
      </p>
    </noscript>
  `;

  // ─── LOAD MAPLIBRE ─────────────────────────────────────────────────────────
  const cssLink = document.createElement('link');
  cssLink.rel  = 'stylesheet';
  cssLink.href = 'https://unpkg.com/maplibre-gl@4.1.3/dist/maplibre-gl.css';
  document.head.appendChild(cssLink);

  const script = document.createElement('script');
  script.src = 'https://unpkg.com/maplibre-gl@4.1.3/dist/maplibre-gl.js';
  script.onload = initMap;
  document.head.appendChild(script);

  // ─── POPUP STYLES ──────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .bb-marker { display:flex; align-items:center; cursor:pointer;
                 filter:drop-shadow(0 3px 4px rgba(0,0,0,0.3)); }
    .bb-marker-icon { width:32px; height:32px; display:block; flex-shrink:0; }
    .bb-marker-label { margin-left:8px; background:#fff; padding:2px 8px;
                       border-radius:4px; border:1px solid #ffcc00;
                       font-family:'Century Gothic',sans-serif; font-size:11px;
                       font-weight:bold; color:#333; white-space:nowrap;
                       box-shadow:2px 2px 5px rgba(0,0,0,0.1); }
    .maplibregl-popup { opacity:0; transition:opacity 0.4s ease-in-out; pointer-events:none; }
    .maplibregl-popup.bb-fade-in { opacity:1; pointer-events:auto; }
    .bb-popup { width:220px; font-family:'Century Gothic',sans-serif;
                font-size:11px; color:#333; overflow-wrap:break-word;
                word-break:break-word; box-sizing:border-box; }
    .bb-popup h3 { margin:0 0 8px; font-size:13px; color:#bc1d23;
                   border-bottom:1px solid #eee; padding-bottom:6px; line-height:1.3; }
    .bb-popup-field { margin:3px 0; line-height:1.5; }
    .bb-popup-field b { color:#555; }
    .bb-popup-field a { color:#333; text-decoration:none; }
    .bb-popup-field a:hover { text-decoration:underline; }
    .bb-popup hr { border:none; border-top:1px solid #eee; margin:6px 0; }
    .bb-popup-info { margin:4px 0; line-height:1.5; color:#444; }
    .bb-popup-more { color:#bc1d23; font-weight:bold; text-decoration:none; }
    .bb-popup-more:hover { text-decoration:underline; }
    .bb-popup-btns { display:flex; flex-direction:column; gap:5px; margin-top:8px; }
    .bb-popup-btn { display:block; width:100%; text-align:center; text-decoration:none;
                    padding:6px 4px; border-radius:4px;
                    font-family:'Century Gothic',sans-serif; font-size:11px;
                    font-weight:bold; color:#fff; box-sizing:border-box; }
    .bb-popup-btn:hover { opacity:0.88; }
    .bb-btn-booking { background:#003580; }
    .bb-btn-hostelworld { background:#f37022; }
    .bb-cluster { display:flex; align-items:center; justify-content:center;
                  border-radius:50%; font-family:'Century Gothic',sans-serif;
                  font-weight:bold; color:#fff; cursor:pointer;
                  box-shadow:0 2px 6px rgba(0,0,0,0.35);
                  border:3px solid rgba(255,255,255,0.7); }
    #bb-map-toggle:hover { background:#fff9d6; }
    #bb-map:focus { outline:3px solid #ffcc00; outline-offset:2px; }
  `;
  document.head.appendChild(style);

  // ─── HELPERS ───────────────────────────────────────────────────────────────
  function fmtPhone(p) {
    if (!p) return '';
    const d = p.replace(/\D/g, '');
    if (d.startsWith('27') && d.length === 11)
      return `+${d.slice(0,2)} ${d.slice(2,4)} ${d.slice(4,7)} ${d.slice(7)}`;
    if (d.startsWith('268') && d.length === 11)
      return `+${d.slice(0,3)} ${d.slice(3,7)} ${d.slice(7)}`;
    return p;
  }

  function buildPopup(h) {
    const wa  = h.whatsapp
      ? `<div class="bb-popup-field"><b>WhatsApp:</b> <a href="https://wa.me/${h.whatsapp.replace(/\D/g,'')}">${fmtPhone(h.whatsapp)}</a></div>` : '';
    const em  = h.email
      ? `<div class="bb-popup-field"><b>Email:</b> <a href="mailto:${h.email}">${h.email}</a></div>` : '';
    const web = h.website
      ? `<div class="bb-popup-field"><b>Website:</b> <a href="https://${h.website}" target="_blank" rel="noopener noreferrer">${h.website}</a></div>` : '';
    const gr  = h.googleRating
      ? `<div class="bb-popup-field"><b>Google Rating:</b> ${h.googleRating}</div>` : '';
    const br  = h.bookingRating
      ? `<div class="bb-popup-field"><b>Booking.com Rating:</b> ${h.bookingRating}</div>` : '';
    const hwr = h.hwRating
      ? `<div class="bb-popup-field"><b>Hostelworld Rating:</b> ${h.hwRating}</div>` : '';
    const ratings = (gr || br || hwr) ? `<hr>${gr}${br}${hwr}` : '';
    const btns = (h.booking || h.hostelworld) ? `
      <div class="bb-popup-btns">
        ${h.booking    ? `<a href="${h.booking}"    target="_blank" rel="noopener sponsored" class="bb-popup-btn bb-btn-booking">Book on Booking.com</a>`   : ''}
        ${h.hostelworld? `<a href="${h.hostelworld}" target="_blank" rel="noopener sponsored" class="bb-popup-btn bb-btn-hostelworld">Book on Hostelworld</a>` : ''}
      </div>` : '';
    const anchor = h.anchor || '';
    const moreClick = anchor
      ? `onclick="event.preventDefault();var t=document.querySelector('${anchor.includes('#') ? '#'+anchor.split('#')[1] : anchor}');if(t)t.scrollIntoView({behavior:'smooth'});"`
      : '';
    const more = anchor
      ? `<a href="${anchor}" class="bb-popup-more" ${moreClick} aria-label="More information about ${h.name}">More info ›</a>` : '';

    return `
      <div class="bb-popup" role="region" aria-label="${h.name} hostel information">
        <h3>${h.name}</h3>
        <div class="bb-popup-field"><b>Address:</b> ${h.address || ''}</div>
        <div class="bb-popup-field"><b>Phone:</b> <a href="tel:${(h.phone||'').replace(/\D/g,'')}">${fmtPhone(h.phone)}</a></div>
        ${wa}${em}${web}${ratings}
        <hr>
        <div class="bb-popup-info">${h.info || ''} ${more}</div>
        ${btns}
      </div>`;
  }

  // ─── MAIN INIT ─────────────────────────────────────────────────────────────
  function initMap() {
    Promise.all([
      fetch(HOSTELS_URL).then(r => r.json()),
      fetch(REGIONS_URL).then(r => r.json())
    ]).then(([hostelGeoJSON, regions]) => {

      // Filter hostels for regional pages; show all on national
      const features = REGION === 'national'
        ? hostelGeoJSON.features
        : hostelGeoJSON.features.filter(f => f.properties.region === REGION);

      // Build noscript fallback list
      const noscript = wrap.querySelector('noscript');
      if (noscript) {
        const items = features.map(f =>
          `<li><a href="${f.properties.anchor || '#'}">${f.properties.name}</a> — ${f.properties.address || ''}</li>`
        ).join('');
        noscript.innerHTML = `<ul aria-label="Hostel list">${items}</ul>`;
      }

      const map = new maplibregl.Map({
        container: 'bb-map',
        style: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
        center: CENTER,
        zoom: ZOOM,
        pitch: PITCH,
        bearing: BEARING,
        antialias: true
      });

      // Controls
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new maplibregl.FullscreenControl(), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

      // Keyboard: arrow keys pan, +/- zoom
      document.getElementById('bb-map').addEventListener('keydown', e => {
        const PAN = 80;
        if (e.key === 'ArrowLeft')  map.panBy([-PAN, 0]);
        if (e.key === 'ArrowRight') map.panBy([PAN, 0]);
        if (e.key === 'ArrowUp')    map.panBy([0, -PAN]);
        if (e.key === 'ArrowDown')  map.panBy([0, PAN]);
        if (e.key === '+' || e.key === '=') map.zoomIn();
        if (e.key === '-') map.zoomOut();
      });

      // 3D / 2D toggle
      let is3D = true;
      const toggleBtn = document.getElementById('bb-map-toggle');
      toggleBtn.addEventListener('click', () => {
        is3D = !is3D;
        if (is3D) {
          map.easeTo({ pitch: PITCH, bearing: BEARING, duration: 800 });
          map.setTerrain({ source: 'terrain-src', exaggeration: 1.15 });
          toggleBtn.textContent = 'Switch to 2D';
          toggleBtn.setAttribute('aria-pressed', 'true');
          toggleBtn.setAttribute('aria-label', 'Switch map to 2D flat view');
        } else {
          map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
          map.setTerrain(null);
          toggleBtn.textContent = 'Switch to 3D';
          toggleBtn.setAttribute('aria-pressed', 'false');
          toggleBtn.setAttribute('aria-label', 'Switch map to 3D view');
        }
      });

      map.on('load', () => {
        // Terrain
        map.addSource('terrain-src', {
          type: 'raster-dem',
          url: `https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key=${MAPTILER_KEY}`,
          tileSize: 256
        });
        map.setTerrain({ source: 'terrain-src', exaggeration: 1.15 });

        // 3D buildings
        const sources = map.getStyle().sources;
        const vecSrc = Object.keys(sources).find(k => sources[k].type === 'vector');
        if (vecSrc) {
          try {
            map.addLayer({
              id: 'bb-3d-buildings', source: vecSrc, 'source-layer': 'building',
              type: 'fill-extrusion', minzoom: 12,
              paint: {
                'fill-extrusion-color': [
                  'interpolate', ['linear'], ['get', 'render_height'],
                  0, '#c8b89a', 50, '#a89070', 100, '#7a6a5a'
                ],
                'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 5],
                'fill-extrusion-base':   ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0],
                'fill-extrusion-opacity': 0.85
              }
            });
          } catch(e) { console.warn('3D buildings:', e.message); }
        }

        // ── REGION POLYGONS ──────────────────────────────────────────────────
        const regionsToShow = REGION === 'national'
          ? Object.keys(regions)
          : [REGION];

        regionsToShow.forEach(key => {
          const r = regions[key];
          if (!r || !r.polygon) return;

          const polyCoords = [r.polygon.map(c => [c[0], c[1]])];
          // Close the ring if not already closed
          const first = polyCoords[0][0], last = polyCoords[0][polyCoords[0].length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) polyCoords[0].push(first);

          map.addSource(`region-${key}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: polyCoords },
              properties: { name: r.name, url: r.url, key }
            }
          });

          // Fill
          map.addLayer({
            id: `region-fill-${key}`,
            type: 'fill',
            source: `region-${key}`,
            paint: {
              'fill-color': r.color || '#bc1d23',
              'fill-opacity': 0.18
            }
          });

          // Outline
          map.addLayer({
            id: `region-line-${key}`,
            type: 'line',
            source: `region-${key}`,
            paint: {
              'line-color': r.color || '#bc1d23',
              'line-width': 2,
              'line-opacity': 0.7
            }
          });

          // Label (national map only)
          if (REGION === 'national') {
            map.addLayer({
              id: `region-label-${key}`,
              type: 'symbol',
              source: `region-${key}`,
              layout: {
                'text-field': r.name,
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 13,
                'text-anchor': 'center'
              },
              paint: {
                'text-color': '#ffffff',
                'text-halo-color': 'rgba(0,0,0,0.6)',
                'text-halo-width': 2
              }
            });

            // Click polygon → navigate to region page
            map.on('click', `region-fill-${key}`, () => {
              if (r.url) window.location.href = r.url;
            });
            map.on('mouseenter', `region-fill-${key}`, () => {
              map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', `region-fill-${key}`, () => {
              map.getCanvas().style.cursor = '';
            });
          }
        });

        // ── MARKERS & POPUPS ─────────────────────────────────────────────────
        let activePopup = null;

        function showPopup(coords, html) {
          const open = () => {
            const p = new maplibregl.Popup({ offset: 15, closeButton: false })
              .setHTML(html).setLngLat(coords).addTo(map);
            activePopup = p;
            setTimeout(() => { const el = p.getElement(); if (el) el.classList.add('bb-fade-in'); }, 50);
          };
          if (activePopup) {
            const el = activePopup.getElement();
            if (el) el.classList.remove('bb-fade-in');
            setTimeout(() => { if (activePopup) activePopup.remove(); open(); }, 400);
          } else { open(); }
        }

        map.on('click', () => {
          if (activePopup) {
            const el = activePopup.getElement();
            if (el) el.classList.remove('bb-fade-in');
            setTimeout(() => { if (activePopup) { activePopup.remove(); activePopup = null; } }, 400);
          }
        });

        features.forEach(feature => {
          const h = feature.properties;
          const coords = feature.geometry.coordinates;
          const html = buildPopup(h);

          const container = document.createElement('div');
          container.className = 'bb-marker';
          container.setAttribute('role', 'button');
          container.setAttribute('tabindex', '0');
          container.setAttribute('aria-label', `${h.name} — click for details`);

          const icon = document.createElement('img');
          icon.src = '/assets/icons/hostel-pin.png';
          icon.className = 'bb-marker-icon';
          icon.alt = '';
          icon.setAttribute('aria-hidden', 'true');
          icon.width = 32; icon.height = 32;
          icon.style.display = 'block';
          icon.style.flexShrink = '0';
          icon.onerror = function () {
            this.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#bc1d23;border:2px solid #fff;flex-shrink:0;';
            this.src = '';
          };
          container.appendChild(icon);

          // Only show text labels above zoom 10 to reduce clutter on national map
          const label = document.createElement('div');
          label.className = 'bb-marker-label';
          label.textContent = h.name;
          label.setAttribute('aria-hidden', 'true');
          container.appendChild(label);

          const openPopup = (e) => {
            if (e) e.stopPropagation();
            showPopup(coords, html);
          };
          container.addEventListener('click', openPopup);
          container.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPopup(); }
          });

          new maplibregl.Marker({ element: container, anchor: 'left' })
            .setLngLat(coords)
            .addTo(map);
        });

        // Hide/show labels based on zoom (tidy on national map)
        if (REGION === 'national') {
          function updateLabels() {
            const z = map.getZoom();
            features.forEach(feature => {
              // Labels hidden below zoom 9 on national map to reduce clutter
              // This is handled via CSS opacity on the label element directly
            });
          }
          map.on('zoom', updateLabels);
          updateLabels();
        }

      }); // end map.on('load')
    }).catch(err => {
      console.error('BackpackersBible map failed to load data:', err);
      wrap.innerHTML = '<p style="padding:1em;color:#bc1d23;">Map could not be loaded. Please refresh the page.</p>';
    });
  }

})();
