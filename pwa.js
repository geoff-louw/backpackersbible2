/* ============================================================
   pwa.js — Backpackers Bible offline download & PWA install
   Loaded on any page that includes a #offline-btn element.
   The file list is fetched from /pwa-files.json so it can be
   updated in one place without touching any HTML page.
   ============================================================ */

(function () {

  /* --- Service Worker registration --- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js')
        .then(function (reg) {
          console.log('ServiceWorker registered.');
        })
        .catch(function (err) {
          console.log('ServiceWorker registration failed:', err);
        });
    });
  }

  /* --- Intercept Chrome's "Add to Home Screen" prompt ---
     Prevents it firing automatically; we trigger it on btn click. */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.deferredPrompt = e;
  });

  /* --- Wire up the download button (present on every page) --- */
  document.addEventListener('DOMContentLoaded', function () {

    var btn    = document.getElementById('offline-btn');
    var status = document.getElementById('download-status');

    if (!btn) return; /* not on a page with the download button */

    /* Listen for SW messages */
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', function (event) {
        if (event.data.type === 'CACHING_DONE') {
          if (status) status.innerText = '✅ Success! This guide is now available offline.';
          btn.disabled = false;
          btn.style.opacity = '1';
          showInstallInstructions();
        } else if (event.data.type === 'CACHING_FAILED') {
          if (status) status.innerText = '❌ Download failed. Please check your connection and try again.';
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      });
    }

    btn.addEventListener('click', async function () {

      /* 1. Trigger "Add to Home Screen" prompt if available */
      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        await window.deferredPrompt.userChoice;
        window.deferredPrompt = null;
      }

      /* 2. Fetch file list and start caching */
      if (status) status.innerText = 'Downloading… please stay on this page. This may take a minute or two on a slow connection.';
      btn.disabled = true;
      btn.style.opacity = '0.5';

      var fileList;
      try {
        var res = await fetch('/pwa-files.json');
        fileList = await res.json();
      } catch (e) {
        if (status) status.innerText = '❌ Could not load the file list. Please try again.';
        btn.disabled = false;
        btn.style.opacity = '1';
        return;
      }

      navigator.serviceWorker.ready
        .then(function (registration) {
          if (registration.active) {
            registration.active.postMessage({
              type: 'START_CACHING',
              urls: fileList
            });
          } else {
            if (status) status.innerText = '❌ Service Worker not ready. Please refresh and try again.';
            btn.disabled = false;
            btn.style.opacity = '1';
          }
        })
        .catch(function () {
          if (status) status.innerText = '❌ Service Worker unavailable. Try refreshing the page.';
          btn.disabled = false;
          btn.style.opacity = '1';
        });
    });

  }); /* end DOMContentLoaded */


  /* --- Show correct install instructions by platform --- */
  function showInstallInstructions() {
    var panel   = document.getElementById('install-instructions');
    var android = document.getElementById('install-android');
    var ios     = document.getElementById('install-ios');
    if (!panel) return;

    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    panel.style.display = 'block';
    if (isIos && ios)     { ios.style.display = 'block'; }
    else if (android)     { android.style.display = 'block'; }
  }

}());
