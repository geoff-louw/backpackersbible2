/* ============================================================
   pwa.js — Backpackers Bible offline download & PWA install
   ============================================================ */

(function () {

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.deferredPrompt = e;
  });

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
          showInstallInstructions();
        } else if (event.data.type === 'CACHING_FAILED') {
          if (status) status.innerText = '\u274c Download failed. Please check your connection and try again.';
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      });
    }

    btn.addEventListener('click', async function () {

      if (window.deferredPrompt) {
        window.deferredPrompt.prompt();
        await window.deferredPrompt.userChoice;
        window.deferredPrompt = null;
      }

      if (status) status.innerText = 'Downloading\u2026 please stay on this page. This may take a minute or two on a slow connection.';
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

  function showInstallInstructions() {
    var panel   = document.getElementById('install-instructions');
    var android = document.getElementById('install-android');
    var ios     = document.getElementById('install-ios');
    if (!panel) return;

    var ua        = navigator.userAgent;
    var isIos     = /iphone|ipad|ipod/i.test(ua);
    var isAndroid = /android/i.test(ua);

    panel.style.display = 'block';

    /* Only show platform-specific instructions on mobile.
       On desktop the guide is cached — no home screen to add to. */
    if (isIos && ios) {
      ios.style.display = 'block';
    } else if (isAndroid && android) {
      android.style.display = 'block';
    }
  }

}());
