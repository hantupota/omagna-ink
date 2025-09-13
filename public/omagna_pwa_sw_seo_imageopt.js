// === sw.js | Service Worker for Omagna Ink Studio ===
// Caches HTML shell, static assets, and uses network-first for dynamic content

const CACHE_NAME = 'omagna-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon192.png',
  '/icon512_maskable.png',
  '/icon512_rounded.png',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Lato:wght@300;400;700&display=swap',
  'https://fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Dynamic Cloudinary image compression fallback
  if (url.hostname.includes('res.cloudinary.com')) {
    const compressedURL = url.href.replace(/\/upload\//, '/upload/q_auto,f_auto/');
    event.respondWith(fetch(compressedURL).catch(() => caches.match(request)));
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(resp => resp || fetch(request)));
    return;
  }

  // Network-first strategy for other requests
  event.respondWith(
    fetch(request)
      .then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return resp;
      })
      .catch(() => caches.match(request))
  );
});
