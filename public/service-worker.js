const CACHE_NAME = 'aqra-cache-v34'; 

const ASSETS_TO_CACHE = [
  '/',                
  '/index.html',      
  '/offline.html',
  '/css/style.css',
 '/dist/index.js',
  '/manifest.json',
  '/icons/icon-192.webp',
'/img/reciters/hussary.jpg',
  '/img/reciters/abdelbasset.jpg',
  '/img/reciters/elzwawy.jpg',
  '/img/reciters/dosari.jpg',
  '/img/reciters/maher.jpg',
  '/img/reciters/shuraim.jpg',
  '/img/reciters/mishary.jpg',
  '/img/reciters/hatem.jpg',
  '/img/reciters/islam.jpg',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@300;400;500;700;900&display=swap',
];

// 1. Install
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ [SW] Caching Core Assets');
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

  // استثناء ملفات الـ API والصوتيات والراديو من الكاش الافتراضي
  if (
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.endsWith('.mp3') ||
    requestUrl.pathname.endsWith('.mp4') ||
    requestUrl.hostname.includes('radiojar.com') || 
    requestUrl.hostname.includes('qurango.net') ||  
    event.request.method !== 'GET'
  ){
    return;
  }

  // أ. الكاش الذكي للملفات الخارجية (Bootstrap, FontAwesome, Google Fonts, Icons)
  if (
    requestUrl.hostname.includes('jsdelivr.net') || 
    requestUrl.hostname.includes('cloudflare.com') || 
    requestUrl.hostname.includes('googleapis.com') || 
    requestUrl.hostname.includes('gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached; // لو متخزنة رجعها فوراً
        
        return fetch(event.request).then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        }).catch(() => {
          console.warn('⚠️ [SW] فشل تحميل المورد الخارجي أوفلاين:', requestUrl.href);
        });
      })
    );
    return;
  }

  // ب. HTML Navigation (Network First)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          if (cachedPage) return cachedPage;
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // ج. JS/CSS (Network First)
  if (
     requestUrl.pathname.includes('/dist/index.js') ||
    requestUrl.pathname.includes('/css/style.css')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached || new Response('Network error occurred', { status: 408 });
        })
    );
    return;
  }

  // د. Cache First (للصور والخطوط المحلية)
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