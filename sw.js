const CACHE_NAME = 'backpackers-bible-v1';

// Add only the absolute essentials here (the homepage and CSS)
// All the heavy photos/other pages will wait for the button click.
const INITIAL_CACHE = [
  '/',
  '/index.htm',
  '/style.css',
  '/android-chrome-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(INITIAL_CACHE))
  );
});

// The listener that waits for the button click
self.addEventListener('message', event => {
  if (event.data.type === 'START_CACHING') {
    const urlsToCache = event.data.urls;
    
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        console.log('User requested offline download. Starting...');
        return cache.addAll(urlsToCache);
      })
    );
  }
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});