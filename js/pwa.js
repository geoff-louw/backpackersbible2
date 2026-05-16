/* ============================================================
   pwa.js — Backpackers Bible offline download & PWA install
   ============================================================ */

(function () {

  var isIos              = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isInStandaloneMode = window.navigator.standalone === true;
  var isMobile           = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  /* --- Service Worker: register immediately at script parse time.
     The earlier it registers, the sooner it activates, which means
     beforeinstallprompt can fire on the very first visit. --- */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(function () { console.log('ServiceWorker registered.'); })
      .catch(function (err) { console.log('ServiceWorker failed:', err); });
  }

  /* --- Show iOS install note on iOS only --- */
  document.addEventListener('DOMContentLoaded', function () {
    if (isIos) {
      var note = document.getElementById('ios-install-note');
      if (note) note.style.display = 'block';
    }
    wireDownloadButton();
  });

  /* --- Capture install prompt ASAP — before DOMContentLoaded.
     Chrome fires this early; missing it means no prompt on first visit. --- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.deferredPrompt = e;
    console.log('beforeinstallprompt captured');
    if (isMobile) maybeShowBanner();
  });

  /* --- iOS banner on load --- */
  window.addEventListener('load', function () {
    if (isIos && !isInStandaloneMode) maybeShowBanner();
  });

  function maybeShowBanner() {
    if (isInStandaloneMode) return;
    if (localStorage.getItem('bb_install_dismissed')) return;
    setTimeout(showBanner, 3000);
  }

  function showBanner() {
    if (document.getElementById('bb-install-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'bb-install-banner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#bc1d23;color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;z-index:19999;box-shadow:0 -2px 10px rgba(0,0,0,0.3);font-family:Century Gothic,sans-serif;font-size:0.95rem;box-sizing:border-box';

    var msg        = document.createElement('span');
    var dismissBtn = document.createElement('button');
    dismissBtn.innerHTML = '&times;';
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    dismissBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:1.4rem;cursor:pointer;padding:0 4px;flex-shrink:0;line-height:1';
    dismissBtn.addEventListener('click', function () { dismissBanner(banner); });

    if (isIos) {
      msg.innerHTML = '📱 <b>Free offline guide:</b> tap Share \u2192 <b>Add to Home Screen</b>, then tap Download to cache content.';
      banner.appendChild(msg);
      banner.appendChild(dismissBtn);
    } else {
      msg.innerHTML = '📱 <b>Install the free offline guide</b> \u2014 adds icon + caches all content';
      var installBtn = document.createElement('button');
      installBtn.textContent = 'Install';
      installBtn.style.cssText = 'background:#ffd400;color:#000;border:none;padding:8px 14px;font-weight:bold;font-family:Century Gothic,sans-serif;font-size:0.9rem;cursor:pointer;white-space:nowrap;flex-shrink:0';
      installBtn.addEventListener('click', async function () {
        if (window.deferredPrompt) {
          window.deferredPrompt.prompt();
          await window.deferredPrompt.userChoice;
          window.deferredPrompt = null;
        }
        startCaching(banner, null, null);
      });
      banner.appendChild(msg);
      banner.appendChild(installBtn);
      banner.appendChild(dismissBtn);
    }

    document.body.appendChild(banner);
  }

  function dismissBanner(banner) {
    localStorage.setItem('bb_install_dismissed', '1');
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
  }

  /* --- Get an active SW, polling up to 10s if still installing --- */
  function getActiveSW() {
    return new Promise(function (resolve, reject) {
      navigator.serviceWorker.ready.then(function (reg) {
        if (reg.active) { resolve(reg.active); return; }
        var attempts = 0;
        var poll = setInterval(function () {
          if (reg.active) {
            clearInterval(poll);
            resolve(reg.active);
          } else if (++attempts > 20) {
            clearInterval(poll);
            reject(new Error('SW did not activate in time'));
          }
        }, 500);
      }).catch(reject);
    });
  }

  /* --- Cache the full site via SW --- */
  function startCaching(banner, btn, status) {
    if (banner) banner.innerHTML = '<span>Downloading offline content\u2026 please wait.</span>';
    if (status) status.innerText = 'Downloading\u2026 please stay on this page.';
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }

    function onDone() {
      if (banner) dismissBanner(banner);
      if (status) status.innerText = '\u2705 Success! This guide is now available offline.';
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }

    function onFail(msg) {
      var txt = msg || '\u274c Download failed. Please check your connection.';
      if (banner) banner.innerHTML = '<span>' + txt + '</span>';
      if (status) status.innerText = txt;
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    }

    /* Step 1: fetch file list */
    fetch('/pwa-files.json')
      .then(function (res) { return res.json(); })
      .then(function (fileList) {

        /* Step 2: wait for an active SW */
        return getActiveSW().then(function (sw) {

          /* Step 3: listen for completion message */
          navigator.serviceWorker.addEventListener('message', function handler(event) {
            if (event.data.type === 'CACHING_DONE') {
              navigator.serviceWorker.removeEventListener('message', handler);
              onDone();
            } else if (event.data.type === 'CACHING_FAILED') {
              navigator.serviceWorker.removeEventListener('message', handler);
              onFail();
            }
          });

          /* Step 4: kick off caching */
          sw.postMessage({ type: 'START_CACHING', urls: fileList });
        });
      })
      .catch(function (err) {
        console.log('Caching error:', err);
        onFail('\u274c Could not start download. Please refresh and try again.');
      });
  }

  /* --- Wire up the download button on the PWA page --- */
  function wireDownloadButton() {
    var btn    = document.getElementById('offline-btn');
    var status = document.getElementById('download-status');
    if (!btn) return;

    btn.addEventListener('click', async function () {
      /* Trigger install prompt if available */
      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        await window.deferredPrompt.userChoice;
        window.deferredPrompt = null;
        var banner = document.getElementById('bb-install-banner');
        if (banner) dismissBanner(banner);
      }
      startCaching(null, btn, status);
    });
  }

}());
