/* ============================================================
   pwa.js — Backpackers Bible offline download & PWA install

   The install banner appears automatically on mobile ~3s after
   page load. Tapping "Install" does TWO things at once:
   1. Triggers Chrome's native "Add to Home Screen" dialog
   2. Starts caching all content for offline use

   The download button on the PWA page does the same thing,
   for users who scroll to that section instead.

   iOS Safari: no install API exists. Banner explains manually.
   ============================================================ */

(function () {

  /* --- Service Worker registration --- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js')
        .then(function () { console.log('ServiceWorker registered.'); })
        .catch(function (err) { console.log('ServiceWorker failed:', err); });
    });
  }

  /* --- Capture Chrome's install prompt --- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.deferredPrompt = e;
    maybeShowBanner();
  });

  var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var isInStandaloneMode = window.navigator.standalone === true;

  /* iOS: check on load since beforeinstallprompt never fires */
  window.addEventListener('load', function () {
    if (isIos && !isInStandaloneMode) {
      maybeShowBanner();
    }
  });

  function maybeShowBanner() {
    if (isInStandaloneMode) return;
    if (localStorage.getItem('bb_install_dismissed')) return;
    if (window.innerWidth > 768) return;
    setTimeout(showBanner, 3000);
  }

  function showBanner() {
    if (document.getElementById('bb-install-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'bb-install-banner';
    banner.style.cssText = [
      'position:fixed', 'bottom:0', 'left:0', 'right:0',
      'background:#bc1d23', 'color:#fff',
      'padding:12px 16px',
      'display:flex', 'align-items:center',
      'justify-content:space-between', 'gap:12px',
      'z-index:19999',
      'box-shadow:0 -2px 10px rgba(0,0,0,0.3)',
      'font-family:Century Gothic,sans-serif',
      'font-size:0.95rem', 'box-sizing:border-box'
    ].join(';');

    var msg = document.createElement('span');
    var installBtn = document.createElement('button');
    var dismissBtn = document.createElement('button');

    dismissBtn.innerHTML = '&times;';
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    dismissBtn.style.cssText = 'background:none;border:none;color:#fff;font-size:1.4rem;cursor:pointer;padding:0 4px;flex-shrink:0;line-height:1';

    dismissBtn.addEventListener('click', function () {
      dismiss(banner);
    });

    if (isIos) {
      msg.innerHTML = '📱 <b>Free offline guide:</b> tap Share → <b>Add to Home Screen</b>, then use the Download button to cache content.';
      banner.appendChild(msg);
      banner.appendChild(dismissBtn);
    } else {
      msg.innerHTML = '📱 <b>Install the free offline guide</b> — adds icon + caches all content';
      installBtn.textContent = 'Install';
      installBtn.style.cssText = [
        'background:#ffd400', 'color:#000', 'border:none',
        'padding:8px 14px', 'font-weight:bold',
        'font-family:Century Gothic,sans-serif',
        'font-size:0.9rem', 'cursor:pointer',
        'white-space:nowrap', 'flex-shrink:0'
      ].join(';');

      installBtn.addEventListener('click', async function () {
        /* Step 1: native install prompt */
        if (window.deferredPrompt) {
          window.deferredPrompt.prompt();
          await window.deferredPrompt.userChoice;
          window.deferredPrompt = null;
        }
        /* Step 2: cache all content */
        startCaching(banner);
      });

      banner.appendChild(msg);
      banner.appendChild(installBtn);
      banner.appendChild(dismissBtn);
    }

    document.body.appendChild(banner);
  }

  function dismiss(banner) {
    localStorage.setItem('bb_install_dismissed', '1');
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
  }

  async function startCaching(banner) {
    /* Update banner to show progress */
    if (banner) {
      banner.innerHTML = '<span>Downloading offline content\u2026 please wait.</span>';
    }

    var fileList;
    try {
      var res = await fetch('/pwa-files.json');
      fileList = await res.json();
    } catch (e) {
      if (banner) banner.innerHTML = '<span>\u274c Download failed. Try the button on the <a href="/#download-pwa" style="color:#ffd400">guide page</a>.</span>';
      return;
    }

    /* Listen for completion */
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', function handler(event) {
        if (event.data.type === 'CACHING_DONE') {
          navigator.serviceWorker.removeEventListener('message', handler);
          if (banner) dismiss(banner);
          /* Also update the download button status if visible */
          var status = document.getElementById('download-status');
          if (status) status.innerText = '\u2705 Success! This guide is now available offline.';
          var btn = document.getElementById('offline-btn');
          if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        }
      });
    }

    navigator.serviceWorker.ready
      .then(function (reg) {
        if (reg.active) {
          reg.active.postMessage({ type: 'START_CACHING', urls: fileList });
        } else {
          if (banner) banner.innerHTML = '<span>\u274c Not ready. Try the <a href="/#download-pwa" style="color:#ffd400">guide page</a>.</span>';
        }
      })
      .catch(function () {
        if (banner) banner.innerHTML = '<span>\u274c Unavailable. Try refreshing.</span>';
      });
  }


  /* --- Download button (#offline-btn) on the PWA page ---
     Same behaviour as the banner install button. */
  document.addEventListener('DOMContentLoaded', function () {

    var btn    = document.getElementById('offline-btn');
    var status = document.getElementById('download-status');
    if (!btn) return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', function (event) {
        if (event.data.type === 'CACHING_DONE') {
          if (status) status.innerText = '\u2705 Success! This guide is now available offline.';
          btn.disabled = false;
          btn.style.opacity = '1';
        } else if (event.data.type === 'CACHING_FAILED') {
          if (status) status.innerText = '\u274c Download failed. Please check your connection and try again.';
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      });
    }

    btn.addEventListener('click', async function () {
      /* Trigger install prompt if available */
      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        await window.deferredPrompt.userChoice;
        window.deferredPrompt = null;
        var banner = document.getElementById('bb-install-banner');
        if (banner) dismiss(banner);
      }

      if (status) status.innerText = 'Downloading\u2026 please stay on this page.';
      btn.disabled = true;
      btn.style.opacity = '0.5';

      var fileList;
      try {
        var res = await fetch('/pwa-files.json');
        fileList = await res.json();
      } catch (e) {
        if (status) status.innerText = '\u274c Could not load the file list. Please try again.';
        btn.disabled = false;
        btn.style.opacity = '1';
        return;
      }

      navigator.serviceWorker.ready
        .then(function (reg) {
          if (reg.active) {
            reg.active.postMessage({ type: 'START_CACHING', urls: fileList });
          } else {
            if (status) status.innerText = '\u274c Service Worker not ready. Please refresh and try again.';
            btn.disabled = false;
            btn.style.opacity = '1';
          }
        })
        .catch(function () {
          if (status) status.innerText = '\u274c Service Worker unavailable. Try refreshing the page.';
          btn.disabled = false;
          btn.style.opacity = '1';
        });
    });

  });

}());
