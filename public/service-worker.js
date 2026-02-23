const CACHE_NAME = 'aqra-cache-v14-final';

const ASSETS_TO_CACHE = [
  '/',                
  '/index.html',      
  '/offline.html',
  '/css/style.css',
  '/js/bundle.js',
  '/manifest.json',
  '/icons/icon-192.webp',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. Install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ [SW] Caching Core Assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ [SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // أ. تجاهل
  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.endsWith('.mp3') ||
    requestUrl.pathname.endsWith('.mp4') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // ب. HTML Navigation (Network First)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          // نوحد الاسم في الكاش ليكون /index.html دائماً
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseToCache));
          return networkResponse;
        })
        .catch(async () => {
          // محاولة جلب index.html من الكاش
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          // لو مش موجود (نادرة جداً)، نعرض الأوفلاين
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // ج. JS/CSS (Network First)
  if (
    requestUrl.pathname.includes('/js/bundle.js') ||
    requestUrl.pathname.includes('/css/style.css')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // د. Cache First (للصور والخطوط)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((networkResponse) => {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      });
    })
  );
});