const CACHE_NAME = 'aqra-cache-v15';

const ASSETS_TO_CACHE = [
  '/',                
  '/index.html',      
  '/offline.html',
  '/css/style.css',
  '/js/bundle.js',
  '/manifest.json',
  '/icons/icon-192.webp',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  // ✅ إضافة خطوط Google صراحةً للكاش
  'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@300;400;500;700;900&display=swap',
];

// 1. Install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ [SW] Caching Core Assets');
      // ✅ استخدام addAll مع تجاهل أخطاء الخطوط لو مش متاحة
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('⚠️ [SW] بعض الأصول مش اتكاشت:', err);
      });
    })
  );
});

// 2. Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== 'quran-audio-cache-v1'){
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

  // أ. تجاهل API والميديا
  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.endsWith('.mp3') ||
    requestUrl.pathname.endsWith('.mp4') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // ✅ ب. خطوط Google - Cache First (مهم جداً)
  if (
    requestUrl.hostname === 'fonts.googleapis.com' ||
    requestUrl.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        }).catch(() => {
          console.warn('⚠️ [SW] فشل تحميل الخط:', requestUrl.href);
        });
      })
    );
    return;
  }

  // ج. HTML Navigation (Network First)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseToCache));
          return networkResponse;
        })
        .catch(async () => {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // د. JS/CSS (Network First)
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

  // هـ. Cache First (للصور والخطوط المحلية)
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