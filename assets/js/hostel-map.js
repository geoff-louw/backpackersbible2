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
  const CENTER  = cfg.center  || [25.0, -29.0];
  const isMobile = window.innerWidth <= 768;
  // On mobile, zoom out by 1.5 stops so the full region fits on screen
  const ZOOM    = cfg.zoom    !== undefined
    ? (isMobile ? Math.max(cfg.zoom - 1.5, 3) : cfg.zoom)
    : (REGION === 'national' ? (isMobile ? 4 : 5) : 11);
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
    <div id="bb-map-offline"
         style="display:none;position:absolute;top:0;right:0;bottom:0;left:0;background:${BRAND_YELLOW};
                align-items:center;justify-content:center;flex-direction:column;
                font-family:'Century Gothic',sans-serif;text-align:center;padding:20px;">
      <p style="font-weight:bold;color:#333;margin:0 0 12px;">Map unavailable offline</p>
      <p style="color:#555;font-size:13px;margin:0 0 16px;">
        Here's a static overview — full interactive map available when online.
      </p>
      <picture>
        <source media="(max-width:600px)" srcset="/assets/fallback_map_${REGION}_mobile.jpg">
        <img src="/assets/fallback_map_${REGION}.jpg"
             alt="Static map of ${REGION} hostels"
             style="max-width:100%;border-radius:6px;border:2px solid ${BRAND_YELLOW};"
             onerror="this.style.display='none'">
      </picture>
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
        style: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
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

      map.on('load', () => {

        map.addSource('terrain-src', {
          type: 'raster-dem',
          url: `https://api.maptiler