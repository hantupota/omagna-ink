// KOSMARA CACHE ENGINE v3.0
// "Offline is the new luxury." - A compiler, probably.
// Penjaga Gaib ini memastikan ritual tidak akan pernah terganggu.

const CACHE_NAME = 'omagna-ink-cache-v3.0';
const CLOUDINARY_CACHE_NAME = 'omagna-cloudinary-cache-v1.1';
const GOOGLE_FONTS_CACHE_NAME = 'omagna-google-fonts-cache-v1.1';

// Aset inti yang membangun gereja digital ini.
// Diperluas untuk mencakup semua ikon suci dari manifest.
const PRECACHE_ASSETS = [
  '/',
  '/index.html', // Alias untuk '/'
  '/manifest.json',
  '/favicon.ico',
  'https://res.cloudinary.com/omagnaink/image/upload/f_auto,q_auto,w_400/v1750615239/omagnaink-logo2025-transparant.png',
  // Ikon-ikon suci untuk PWA & Shortcuts
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/shortcut-book.png',
  '/icons/shortcut-gallery.png'
];

self.addEventListener('install', event => {
  console.log('[SW] The Gatekeeper awakens. Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Precaching the app shell. Forging the first line of defense.');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] The Gatekeeper is now active. Purging the old world...');
  // Hapus semua cache lama yang tidak relevan. Buang masa lalu.
  const currentCaches = [CACHE_NAME, CLOUDINARY_CACHE_NAME, GOOGLE_FONTS_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Strategi #1: Cloudinary Images (Cache-First, then network)
  // Gambar-gambar ini abadi. Sekali diambil, simpan selamanya.
  if (url.hostname === 'res.cloudinary.com') {
    event.respondWith(
      caches.open(CLOUDINARY_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
          // Kembalikan dari cache jika ada, jika tidak, ambil dari jaringan.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Strategi #2: Google Fonts (Stale-While-Revalidate)
  // Font harus cepat, tapi juga harus update. Ini jalan tengahnya.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(GOOGLE_FONTS_CACHE_NAME).then(cache => {
        return cache.match(request).then(cachedResponse => {
          const fetchPromise = fetch(request).then(networkResponse => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          // Kembalikan dari cache dulu, baru update di belakang layar.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
  
  // Strategi #3: Navigasi & Aset Lainnya (Network-First, fallback to Cache)
  // Selalu coba jaringan dulu, kalau gagal (offline), baru ambil dari cache.
  // Ini memastikan user dapat versi terbaru jika online.
  event.respondWith(
    fetch(request)
      .then(response => {
        // Jika berhasil, clone dan simpan di cache untuk kunjungan berikutnya.
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Jika jaringan gagal, berikan fallback dari cache.
        return caches.match(request).then(cachedResponse => {
          return cachedResponse || caches.match('/index.html');
        });
      })
  );
});
