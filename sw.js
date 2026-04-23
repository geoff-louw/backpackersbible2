const CACHE_NAME = 'backpackers-bible-v2';

// The essential files that get cached immediately when the page loads.
const INITIAL_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/assets/android-chrome-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(INITIAL_CACHE))
  );
});

// Listens for the button click, then caches all the heavy content.
// Uses Promise.allSettled so a single missing file won't fail the whole download.
// When done, sends a message back so the page can show a real success message.
self.addEventListener('message', event => {
  if (event.data.type === 'START_CACHING') {
    const urlsToCache = event.data.urls;
    const client = event.source;

    caches.open(CACHE_NAME).then(cache => {
      console.log('User requested offline download. Starting...');

      const cachePromises = urlsToCache.map(url => {
        // Skip bare directory names (no dot and no slash after the first char)
        // e.g. 'css', 'js', 'assets', 'misc' — these aren't fetchable URLs
        const isBareDirectory = !url.includes('.') && !url.startsWith('/') && !url.includes('/');
        if (isBareDirectory) return Promise.resolve();

        // Ensure every URL starts with a leading slash so it resolves correctly
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