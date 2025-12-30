// Service Worker: enables offline mode and intelligent caching
// Basically: prevents losing data when there's no connection

// Cache versioning: increment when changing strategy
// this forces updates across all clients
const CACHE_NAME = 'tk-cache-v1';
const DATA_CACHE_NAME = 'tk-data-v1';

// Critical resources to download on first load
const urlsToCache = [
  '/',
  '/manifest.json',
  
  // ESSENTIAL PAGES
  '/pages/html/home.html',
  '/pages/html/offline.html', 
  
  // ASSETS
  '/pages/css/home.css',
  '/pages/js/home.js',
  '/pages/js/sw-register.js', 
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  '/assets/logo.svg',
  '/assets/logo2.svg',
];

// Don't cache these sensitive API endpoints (sessions, login, register)
const EXCLUDE_FROM_SWR = ['/api/session', '/api/login', '/api/register']; 


// SWR strategy: serve data from cache immediately (fast),
// then update in background without blocking
function staleWhileRevalidate(request) {
    const dataCachePromise = caches.open(DATA_CACHE_NAME);

    // Fetch from server and update the cache
    const fetchAndCache = fetch(request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
            dataCachePromise.then(cache => {
                // only cache GET requests, not POST/DELETE
                if (request.method === 'GET') {
                    cache.put(request, response.clone());
                }
            });
        }
        return response;
    }).catch(error => {
        console.warn('SW: network unavailable for', request.url);
        throw error;
    });

    // Cache first (fast), then update from server
    return dataCachePromise.then(cache => {
        return cache.match(request).then(cachedResponse => {
            // don't wait for network if it's already cached
            return cachedResponse || fetchAndCache;
        });
    });
}

// Download essentials on first load
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: app shell ready for offline');
        return cache.addAll(urlsToCache);
      })
  );
});

// Clean up old caches
self.addEventListener('activate', event => {
  self.clients.claim(); // take control
  // keep only these caches, delete the rest
  const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME]; 

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // delete old caches
            if (!cacheWhitelist.includes(cacheName)) {
            console.log('SW: old cache removed:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// If the app says "update now", do it immediately
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Route requests based on strategy
self.addEventListener('fetch', event => {
    // only cache GET, POST/DELETE always hit the server
    if (event.request.method !== 'GET') return;
    
    const requestUrl = new URL(event.request.url);
    const pathname = requestUrl.pathname;

    // Don't cache sensitive APIs (login, session, register)
    if (EXCLUDE_FROM_SWR.some(excludePath => pathname.startsWith(excludePath))) {
        event.respondWith(fetch(event.request));
        return; 
    }
    
    // Show cached data immediately, then update
    if (pathname.startsWith('/api/')) {
        event.respondWith(staleWhileRevalidate(event.request));
        return; 
    }
    
    // Cache first (fast), fallback to network
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // return from cache if available
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // otherwise fetch from server and cache if valid
                return fetch(event.request).then(
                    response => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME) 
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                )
            })
            .catch(() => {
                // if everything fails, show offline page
                return caches.match('/pages/html/offline.html');
            })
    );
});