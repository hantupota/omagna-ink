// KOSMARA CACHE ENGINE v3.1
// "Offline is the new luxury." – A compiler, probably.
// Menjaga agar aplikasi tetap hidup walau koneksi terputus.

const CACHE_NAME = 'omagna-ink-cache-v3.1';
const CLOUDINARY_CACHE_NAME = 'omagna-cloudinary-cache-v1.1';
const GOOGLE_FONTS_CACHE_NAME = 'omagna-google-fonts-cache-v1.1';

// Aset inti (app shell) untuk precache
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  'https://res.cloudinary.com/omagnaink/image/upload/f_auto,q_auto,w_400/v1750615239/omagnaink-logo2025-transparant.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/shortcut-book.png',
  '/icons/shortcut-gallery.png'
];

// Instalasi service worker & precache
self.addEventListener('install', event => {
  console.log('[SW] Install: memulai precache.');
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_ASSETS);
    })()
  );
  self.skipWaiting();
});

// Aktivasi & hapus cache lama
self.addEventListener('activate', event => {
  console.log('[SW] Activate: membersihkan cache lama.');
  const currentCaches = [CACHE_NAME, CLOUDINARY_CACHE_NAME, GOOGLE_FONTS_CACHE_NAME];
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map(name => {
          if (!currentCaches.includes(name)) {
            console.log('[SW] Menghapus cache lama:', name);
            return caches.delete(name);
          }
        })
      );
    })()
  );
  self.clients.claim();
});

// Strategi fetch
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Cloudinary Images (Cache First)
  if (url.hostname === 'res.cloudinary.com') {
    event.respondWith(cacheFirst(request, CLOUDINARY_CACHE_NAME));
    return;
  }

  // 2. Google Fonts (Stale-While-Revalidate)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, GOOGLE_FONTS_CACHE_NAME));
    return;
  }

  // 3. Default (Network First, fallback ke cache)
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// ===== Helper Functions =====

// Cache-First: gunakan cache bila tersedia, jika tidak ambil dari network
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const networkResp = await fetch(request);
    if (networkResp.ok) cache.put(request, networkResp.clone());
    return networkResp;
  } catch (err) {
    console.error('[SW] cacheFirst error:', err);
    throw err;
  }
}

// Stale-While-Revalidate: tampilkan cache dulu, lalu update di belakang layar
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then(resp => {
      if (resp.ok) cache.put(request, resp.clone());
      return resp;
    })
    .catch(err => {
      console.warn('[SW] staleWhileRevalidate network error:', err);
      return cached; // fallback ke cache jika network gagal
    });
  return cached || networkFetch;
}

// Network-First: selalu coba dari network, fallback ke cache jika offline
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResp = await fetch(request);
    if (networkResp.ok) cache.put(request, networkResp.clone());
    return networkResp;
  } catch (err) {
    console.warn('[SW] networkFirst offline, fallback ke cache:', err);
    const cached = await cache.match(request);
    return cached || cache.match('/index.html');
  }
}
