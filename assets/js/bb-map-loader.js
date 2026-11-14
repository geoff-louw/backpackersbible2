/**
 * bb-map-loader.js  —  BackpackersBible.com   (v2)
 * Shared, tiny (no dependencies) loader for the inline hostel map. Replaces the iframe
 * "wakeUpMap" + filter-button script that used to be pasted into every page.
 *
 * Nothing heavy runs until the visitor shows intent: a tap on the map poster, a filter
 * button, a "find on map" link, the keyboard "load map" button, or a ?filter= link.
 * Only then are MapLibre, hostel-map.js and the hostel data downloaded.
 *
 * Filters are multi-select: each click toggles a button on or off, and a hostel must match
 * ALL the active filters. "All Hostels" clears the selection. The selection is mirrored in
 * the address bar as ?filter=party,surfers so a filtered view can be shared or bookmarked.
 *
 * Page contract:
 *   <section class="sa-hostel-map-shell" id="hostel-map" data-bb-map data-region="catalonia" ...>
 *     <picture class="sa-hostel-map-poster">…</picture>
 *     <button type="button" class="sr-only" id="bb-map-load-btn">…</button>
 *     <div id="bb-map-wrap" class="sa-hostel-map-iframe bb-map-iframe" hidden></div>
 *   </section>
 *   <a data-filter="party" …>            filter buttons (anywhere on the page)
 *   <a data-hostel="alberg-banyoles" …>  "find on map" links (id must match hostels.json exactly)
 *
 * The wrapper is sized by the site CSS (.sa-hostel-map-iframe), exactly like the old iframe.
 * For the itinerary builder, wrap.contentWindow points at window, so the builder's existing
 * mapFrame.contentWindow.postMessage(...) calls reach the in-page map unchanged.
 *
 * data- attributes on the shell (all optional except region):
 *   data-region, data-center="lng,lat", data-mobile-center, data-zoom, data-mobile-zoom,
 *   data-pitch, data-bearing, data-country, data-hostels-url, data-regions-url,
 *   data-terrain="region,region", data-locate-bounds="west,south,east,north",
 *   data-threshold="7", data-maplibre-js, data-maplibre-css, data-map-script,
 *   data-autoload="tap" (default) | "viewport" (load when scrolled near, desktop only)
 */
(function () {
  'use strict';

  var shell = document.getElementById('hostel-map');
  if (!shell || !shell.hasAttribute('data-bb-map')) return;
  var wrap = document.getElementById('bb-map-wrap');
  if (!wrap) return;

  // Itinerary-builder compatibility: it expects an iframe-like "mapFrame"
  try { Object.defineProperty(wrap, 'contentWindow', { value: window }); } catch (e) { /* ignore */ }

  var poster = shell.querySelector('.sa-hostel-map-poster');
  var loadBtn = document.getElementById('bb-map-load-btn');
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var ds = shell.dataset;

  var TIP = 'Select one or more to find your perfect hostel.';
  var readyPromise = null;
  var isReady = false;
  var selected = [];            // active filter keys (the buttons' own data-filter values)
  var filtersReady = true;      // false while no hostel carries any filter data yet

  /* ── helpers ─────────────────────────────────────────────────────────── */
  function nums(str) {
    if (!str) return null;
    var a = str.split(',').map(Number);
    return a.some(isNaN) ? null : a;
  }
  function num(str) {
    return (str === undefined || str === '' || isNaN(Number(str))) ? undefined : Number(str);
  }
  function keyOf(btn) { return btn.getAttribute('data-filter'); }
  function findButton(key) {
    for (var i = 0; i < buttons.length; i++) {
      var k = keyOf(buttons[i]);
      if (k === key || k === 'is_' + key) return buttons[i];
    }
    return null;
  }

  // Status line under the filter bar: always read out to screen readers; shown to everyone
  // only when the chosen combination matches no hostels.
  var status = document.getElementById('bb-filter-status');
  if (!status) {
    status = document.createElement('p');
    status.id = 'bb-filter-status';
    status.className = 'sr-only';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    var bar = document.querySelector('.map-filter-bar');
    if (bar && bar.parentNode) bar.parentNode.insertBefore(status, bar.nextSibling);
    else shell.parentNode.insertBefore(status, shell);
  }
  function say(text, visible) {
    status.textContent = text;
    if (visible) {
      status.className = '';
      status.style.cssText = 'text-align:center;margin:8px 12px;font-family:"Century Gothic",sans-serif;font-size:14px;font-weight:700;color:#670000;';
    } else {
      status.className = 'sr-only';
      status.style.cssText = '';
    }
  }

  // Tooltips: the "select one or more" hint on every button that has no title of its own
  buttons.forEach(function (b) {
    if (!b.getAttribute('title')) {
      b.setAttribute('title', keyOf(b) === 'all' ? 'Clear the filters and show all hostels.' : TIP);
    }
  });

  /* ── selection state → buttons, address bar, map ─────────────────────── */
  function renderButtons() {
    buttons.forEach(function (b) {
      var k = keyOf(b);
      var on = (k === 'all') ? selected.length === 0 : selected.indexOf(k) !== -1;
      b.classList.toggle('map-filter-btn--active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function updateUrl() {
    try {
      var url = new URL(window.location.href);
      url.searchParams.delete('filter');
      var rest = url.searchParams.toString();
      // keep the commas readable: ?filter=party,surfers
      var qs = (rest ? rest + '&' : '') + (selected.length ? 'filter=' + selected.join(',') : '');
      history.replaceState(null, '', url.pathname + (qs ? '?' + qs : '') + url.hash);
    } catch (e) { /* history API unavailable: ignore */ }
  }

  // Dim (but keep clickable) buttons that would leave nothing once added to the current selection
  function dimEmptyCombos() {
    var api = window.BB_MAP_API;
    if (!api || !filtersReady) return;
    buttons.forEach(function (b) {
      var k = keyOf(b);
      if (k === 'all' || b.getAttribute('aria-disabled') === 'true') return;
      var already = selected.indexOf(k) !== -1;
      var empty = !already && selected.length > 0 && api.count(selected.concat(k)) === 0;
      b.style.opacity = empty ? '0.55' : '';
      b.setAttribute('data-bb-empty', empty ? 'true' : 'false');
      b.setAttribute('title', empty ? 'No hostels match this together with your other filters.'
                                    : (k === 'all' ? 'Clear the filters and show all hostels.' : TIP));
    });
  }

  function applyToMap() {
    var api = window.BB_MAP_API;
    if (!isReady || !api) return;
    if (!filtersReady) {
      // No hostel has any rating or tag yet: keep every pin visible and say why nothing changes
      api.filter([]);
      say(selected.length ? 'Ratings for these filters are still being compiled \u2013 check back soon.' : '', selected.length > 0);
      return;
    }
    var n = api.filter(selected);
    if (selected.length && n === 0) say('No hostels match all of those filters. Try removing one.', true);
    else say(selected.length ? n + (n === 1 ? ' hostel shown.' : ' hostels shown.') : '', false);
    dimEmptyCombos();
  }

  function toggle(key) {
    if (key === 'all') selected = [];
    else {
      var i = selected.indexOf(key);
      if (i === -1) selected.push(key); else selected.splice(i, 1);
    }
    renderButtons();
    updateUrl();
    applyToMap();
  }

  function warmConnections() {
    ['https://unpkg.com', 'https://tiles.openfreemap.org', 'https://ibasemaps-api.arcgis.com']
      .forEach(function (href) {
        var l = document.createElement('link');
        l.rel = 'preconnect';
        l.href = href;
        if (href.indexOf('unpkg') === -1) l.crossOrigin = '';
        document.head.appendChild(l);
      });
  }

  /* ── wake: load MapLibre + hostel-map.js + data, once ────────────────── */
  function wake() {
    if (readyPromise) return readyPromise;

    var isMobile = window.innerWidth <= 768;
    var cfg = {
      region: ds.region || 'national',
      center: (isMobile && nums(ds.mobileCenter)) || nums(ds.center) || undefined,
      zoom: (isMobile && num(ds.mobileZoom) !== undefined) ? num(ds.mobileZoom) : num(ds.zoom),
      pitch: num(ds.pitch),
      bearing: num(ds.bearing),
      countryName: ds.country,
      hostelsUrl: ds.hostelsUrl,
      regionsUrl: ds.regionsUrl,
      terrainRegions: ds.terrain !== undefined ? ds.terrain.split(',').filter(Boolean) : undefined,
      locateBounds: nums(ds.locateBounds) || undefined,
      filterThreshold: num(ds.threshold),
      maplibreJs: ds.maplibreJs,
      maplibreCss: ds.maplibreCss,
      cssSized: true                      // the site CSS sizes #bb-map-wrap, like it did the iframe
    };
    Object.keys(cfg).forEach(function (k) { if (cfg[k] === undefined) delete cfg[k]; });
    window.BB_MAP_CONFIG = cfg;

    shell.classList.add('bb-map-loaded');
    wrap.hidden = false;
    wrap.style.display = '';
    if (poster) poster.style.display = 'none';

    readyPromise = new Promise(function (resolve, reject) {
      function onMsg(e) {
        if (e.source === window && e.data && e.data.type === 'BB_MAP_READY') {
          window.removeEventListener('message', onMsg);
          isReady = true;
          resolve();
        }
      }
      window.addEventListener('message', onMsg);

      var s = document.createElement('script');
      s.src = ds.mapScript || '/assets/js/hostel-map.js?v=3.1';
      s.onerror = function () {
        window.removeEventListener('message', onMsg);
        // Put the poster back so the visitor still sees a map image
        wrap.hidden = true;
        if (poster) poster.style.display = '';
        shell.classList.remove('bb-map-loaded');
        readyPromise = null;
        reject(new Error('hostel-map.js failed to load'));
      };
      document.head.appendChild(s);
    });

    readyPromise.then(afterReady, function (err) { console.warn('BB map:', err.message); });
    return readyPromise;
  }
  window.BB_WakeUpMap = wake; // kept for pages/scripts that already call it

  function afterReady() {
    var api = window.BB_MAP_API;
    if (api) {
      // If no filter matches any hostel at all, the ratings simply aren't compiled yet:
      // leave every button usable (and say so when one is used) instead of greying them all out
      filtersReady = buttons.some(function (b) { return keyOf(b) !== 'all' && api.count(keyOf(b)) > 0; });
    }
    if (api && filtersReady) {
      // Grey out (and disable) filter buttons that match nothing in this view at all
      buttons.forEach(function (b) {
        var k = keyOf(b);
        if (k === 'all') return;
        if (api.count(k) === 0) {
          b.setAttribute('aria-disabled', 'true');
          b.style.opacity = '0.4';
          b.title = 'No hostels match this filter here (yet).';
          var i = selected.indexOf(k);
          if (i !== -1) selected.splice(i, 1);   // a deep-linked filter that matches nothing is dropped
        }
      });
      renderButtons();
      updateUrl();
    }
    applyToMap();
    // Older code (and the itinerary builder) may listen for an iframe-style load event
    try { wrap.dispatchEvent(new Event('load')); } catch (e) { /* ignore */ }
  }

  /* ── intent triggers ─────────────────────────────────────────────────── */
  ['pointerenter', 'touchstart', 'focusin'].forEach(function (ev) {
    shell.addEventListener(ev, warmConnections, { once: true, passive: true });
  });
  shell.addEventListener('click', function () { wake(); }, { once: true });
  if (loadBtn) loadBtn.addEventListener('click', function () { wake(); });

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (btn.getAttribute('aria-disabled') === 'true') return;
      toggle(keyOf(btn));
      wake();
    });
    // The buttons are role="button" links, so Space must work as well as Enter
    btn.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); btn.click(); }
    });
  });

  // "FIND ON MAP" links:  <a href="#hostel-map" data-hostel="alberg-banyoles">
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('[data-hostel]') : null;
    if (!link) return;
    e.preventDefault();
    var id = link.getAttribute('data-hostel');
    shell.scrollIntoView({ behavior: 'smooth', block: 'start' });
    wake().then(function () {
      window.postMessage({ type: 'BB_OPEN_HOSTEL', id: id }, window.location.origin);
    }, function () { /* poster restored; nothing else to do */ });
  });

  /* ── deep link: ?filter=party,surfers ────────────────────────────────── */
  try {
    var wanted = new URL(window.location.href).searchParams.get('filter');
    if (wanted) {
      wanted.split(',').forEach(function (raw) {
        var b = findButton(raw.trim());
        if (b && keyOf(b) !== 'all' && selected.indexOf(keyOf(b)) === -1) selected.push(keyOf(b));
      });
      if (selected.length) { renderButtons(); wake(); }
    }
  } catch (e) { /* ignore */ }

  /* ── optional: load when scrolled near (desktop only) ────────────────── */
  if (ds.autoload === 'viewport' && window.innerWidth >= 1024 && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); wake(); }
    }, { rootMargin: '300px' });
    io.observe(shell);
  }
})();
