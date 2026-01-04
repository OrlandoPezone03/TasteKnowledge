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

const EXCLUDE_FROM_SWR = ['/api/session', '/login', '/register'];

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
  self.clients.claim();
  const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME]; 
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('SW: old cache removed:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Update on demand
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================
// ROUTING: Apply caching strategy by URL
// ============================================

// STRATEGY 2: STALE WHILE REVALIDATE (SWR)
async function staleWhileRevalidate(request) {
    try {
        const cache = await caches.open(DATA_CACHE_NAME);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            // Fetch and update in background
            fetch(request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    cache.put(request, response.clone());
                }
            }).catch(error => {
                console.warn('SW: network unavailable for', request.url);
            });
            return cachedResponse;
        }
        
        // No cache, fetch from server
        const response = await fetch(request);
        if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.warn('SW: error in staleWhileRevalidate for', request.url, error);
        throw error;
    }
}

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    const requestUrl = new URL(event.request.url);
    const pathname = requestUrl.pathname;

    // STRATEGY 1: No Cache (login, session, register)
    if (EXCLUDE_FROM_SWR.some(excludePath => pathname.startsWith(excludePath))) {
        event.respondWith(fetch(event.request));
        return; 
    }
    
    // STRATEGY 2: SWR (Stale While Revalidate) for API routes
    if (pathname.startsWith('/api/')) {
        event.respondWith(staleWhileRevalidate(event.request));
        return; 
    }
    
    // STRATEGY 3: Cache First for static assets and pages
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
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
                // If everything fails show offline page
                return caches.match('/pages/html/offline.html');
            })
    );
});