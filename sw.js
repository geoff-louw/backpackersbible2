const CACHE_NAME = 'backpackers-bible-v2';

// The essential files that get cached immediately when the page loads.
const INITIAL_CACHE = [
  '/',
  '/index.html',
  '/css/style-2.css',
  '/js/pwa.js',
  '/pwa-files.json',
  '/assets/android-chrome-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(INITIAL_CACHE))
  );
});

// Receives the file list from pwa.js (which fetches it from /pwa-files.json)
// and caches everything. Uses Promise.allSettled so a single missing file
// won't fail the whole download. Sends a message back when done.
self.addEventListener('message', event => {
  if (event.data.type === 'START_CACHING') {
    const urlsToCache = event.data.urls;
    const client = event.source;

    caches.open(CACHE_NAME).then(cache => {
      console.log('User requested offline download. Starting...');

      const cachePromises = urlsToCache.map(url => {
        // Skip bare directory names
        const isBareDirectory = !url.includes('.') && !url.startsWith('/') && !url.includes('/');
        if (isBareDirectory) return Promise.resolve();

        // Skip files that are guaranteed to 404 or shouldn't be cached
        const skipPatterns = ['/_redirects', 'desktop.ini', '.DS_Store', '.htaccess', 'Thumbs.db'];
        if (skipPatterns.some(p => url.includes(p))) return Promise.resolve();

        const absoluteUrl = url.startsWith('/') ? url : '/' + url;

        return cache.add(absoluteUrl).catch(err => {
          console.warn('Failed to cache (skipping):', absoluteUrl, err);
        });
      });

      Promise.allSettled(cachePromises).then(() => {
        client.postMessage({ type: 'CACHING_DONE' });
      });
    }).catch(() => {
      client.postMessage({ type: 'CACHING_FAILED' });
    });
  }
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});