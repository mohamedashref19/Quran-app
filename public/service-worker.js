const CACHE_NAME = 'aqra-cache-v4'; 

const ASSETS_TO_CACHE = [
  '/css/style.css',
  '/js/bundle.js',
  '/img/title.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim(); 
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (
    event.request.destination === 'audio' || 
    event.request.destination === 'video' || 
    requestUrl.pathname.endsWith('.mp3') || 
    requestUrl.pathname.startsWith('/api/')
  ) {
    return;
  }

  
  if (
    event.request.mode === 'navigate' || 
    event.request.headers.get('accept').includes('text/html') ||
    requestUrl.pathname === '/js/bundle.js' || 
    requestUrl.pathname === '/css/style.css'   
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (event.request.mode === 'navigate') {
                return caches.match('/offline.html');
            }
          });
        })
    );
    return;
  }


  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});