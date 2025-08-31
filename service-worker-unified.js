/**
 * Habitus PWA Service Worker - Unified Version
 * Handles caching, offline functionality, and background sync
 * Version: 2.2.0
 */

// Dynamic configuration
const CONFIG = {
    CACHE_NAME: 'habitus-v2.8.0',
    CACHE_STATIC: 'habitus-static-v2.8.0',
    CACHE_DYNAMIC: 'habitus-dynamic-v2.8.0',
    CACHE_CDN: 'habitus-cdn-v2.8.0',
    
    // Auto-detect base path
    BASE_PATH: (() => {
        if (typeof location !== 'undefined') {
            // For Cloudflare Pages, always use root path
            return '/';
        }
        return '/'; // fallback
    })(),
    
    FALLBACK_TIMEOUT: 3000,
    MAX_CACHE_AGE: 24 * 60 * 60 * 1000, // 24 hours
    
    // Feature flags
    FEATURES: {
        BACKGROUND_SYNC: true,
        PUSH_NOTIFICATIONS: true,
        ADVANCED_CACHING: true
    }
};

// Essential app files
const STATIC_ASSETS = [
    'index.html',
    'styles.css', 
    'app.js',
    'tasks.js',
    'roles.js',
    'translations.js',
    'pasajes_bilingues.js',
    'config.js',
    'validator.js',
    'checkin.js',
    'migration.js',
    'manifest.json',
    'icons/icon-192x192.png',
    'icons/icon-512x512.png',
    'vendor/chart.min.js'
].map(asset => CONFIG.BASE_PATH + asset);

// CDN fallback assets (locally stored)
const CDN_ASSETS = [
    {
        url: 'https://cdn.jsdelivr.net/npm/chart.js@3',
        fallback: CONFIG.BASE_PATH + 'vendor/chart.min.js', 
        type: 'application/javascript'
    }
];

// Install event - Cache essential assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker v2.1.0');
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(CONFIG.CACHE_STATIC).then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            
            // Pre-cache CDN fallbacks if they exist
            caches.open(CONFIG.CACHE_CDN).then(cache => {
                console.log('[SW] Pre-caching CDN fallbacks');
                return Promise.allSettled(
                    CDN_ASSETS.map(asset => 
                        fetch(asset.fallback)
                            .then(response => response.ok ? cache.put(asset.url, response) : null)
                            .catch(() => null) // Ignore if fallback doesn't exist yet
                    )
                );
            })
        ]).then(() => {
            console.log('[SW] Installation complete, skipping waiting');
            return self.skipWaiting();
        })
    );
});

// Activate event - Clean old caches and claim clients
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker v2.8.0');
    
    event.waitUntil(
        Promise.all([
            // Clean ALL old caches to force fresh content
            caches.keys().then(cacheNames => {
                console.log('[SW] Cleaning old caches:', cacheNames);
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName.startsWith('habitus-')) {
                            console.log('[SW] Deleting cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                        return Promise.resolve();
                    })
                );
            }),
                        .map(cacheName => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            }),
            
            // Claim all clients
            self.clients.claim()
        ]).then(() => {
            console.log('[SW] Activation complete');
        })
    );
});

// Fetch event - Advanced caching strategy
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip chrome-extension and other protocols
    if (!url.protocol.startsWith('http')) return;
    
    // Skip Google Forms submissions
    if (url.hostname === 'docs.google.com') return;
    
    event.respondWith(handleFetch(request, url));
});

// Advanced fetch handler with multiple strategies
async function handleFetch(request, url) {
    const isAppRequest = url.origin === location.origin;
    const isCDNRequest = CDN_ASSETS.some(asset => url.href.startsWith(asset.url));
    
    try {
        if (isAppRequest) {
            return await handleAppRequest(request, url);
        } else if (isCDNRequest) {
            return await handleCDNRequest(request, url);
        } else {
            return await handleExternalRequest(request);
        }
    } catch (error) {
        console.error('[SW] Fetch error:', error);
        return await getFallbackResponse(request, url);
    }
}

// Handle app requests (cache-first for static, network-first for dynamic)
async function handleAppRequest(request, url) {
    const pathname = url.pathname;
    
    // Check if it's a vendor file (CSS/JS from vendor directory)
    const isVendorFile = pathname.includes('/vendor/') || 
                        pathname.endsWith('.css') || 
                        pathname.endsWith('.js');
    
    // Check if it's a static asset
    const isStatic = STATIC_ASSETS.some(asset => {
        const assetName = asset.split('/').pop();
        return pathname.endsWith(assetName) || pathname === asset;
    });
    
    if (isStatic || isVendorFile) {
        // Cache-first for static assets and vendor files
        const cached = await caches.match(request);
        if (cached) return cached;
        
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CONFIG.CACHE_STATIC);
            cache.put(request, response.clone());
        }
        return response;
    } else {
        // Network-first for dynamic content
        try {
            const response = await Promise.race([
                fetch(request),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Network timeout')), CONFIG.FALLBACK_TIMEOUT)
                )
            ]);
            
            if (response.ok) {
                const cache = await caches.open(CONFIG.CACHE_DYNAMIC);
                cache.put(request, response.clone());
            }
            return response;
        } catch {
            const cached = await caches.match(request);
            return cached || getFallbackResponse(request, url);
        }
    }
}

// Handle CDN requests with local fallbacks
async function handleCDNRequest(request, url) {
    try {
        // Try network first
        const response = await Promise.race([
            fetch(request),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('CDN timeout')), CONFIG.FALLBACK_TIMEOUT)
            )
        ]);
        
        if (response.ok) {
            // Cache successful CDN response
            const cache = await caches.open(CONFIG.CACHE_CDN);
            cache.put(request, response.clone());
            return response;
        }
    } catch (error) {
        console.log('[SW] CDN failed, trying fallback:', url.href);
    }
    
    // Try cached version
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Try local fallback
    const asset = CDN_ASSETS.find(asset => url.href.startsWith(asset.url));
    if (asset) {
        try {
            const fallbackResponse = await fetch(asset.fallback);
            if (fallbackResponse.ok) return fallbackResponse;
        } catch {
            console.error('[SW] Local fallback failed for:', asset.fallback);
        }
    }
    
    throw new Error('All CDN options exhausted');
}

// Handle external requests (cache-first with timeout)
async function handleExternalRequest(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    const response = await Promise.race([
        fetch(request),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('External timeout')), CONFIG.FALLBACK_TIMEOUT)
        )
    ]);
    
    if (response.ok) {
        const cache = await caches.open(CONFIG.CACHE_DYNAMIC);
        cache.put(request, response.clone());
    }
    
    return response;
}

// Fallback responses for different resource types
async function getFallbackResponse(request, url) {
    const isHTMLRequest = request.headers.get('accept')?.includes('text/html');
    const isImageRequest = request.headers.get('accept')?.includes('image/');
    const isCSSRequest = url.pathname.endsWith('.css');
    const isJSRequest = url.pathname.endsWith('.js');
    
    if (isHTMLRequest) {
        // Return cached index.html for navigation requests
        const indexResponse = await caches.match(CONFIG.BASE_PATH + 'index.html');
        return indexResponse || new Response(
            '<h1>Habitus - Offline</h1><p>Please check your connection and try again.</p>',
            { headers: { 'Content-Type': 'text/html' } }
        );
    }
    
    if (isImageRequest) {
        // Return placeholder image
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="#ccc"><rect width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" dy=".3em">No Image</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
    
    if (isCSSRequest) {
        return new Response('/* Offline CSS fallback */', 
            { headers: { 'Content-Type': 'text/css' } }
        );
    }
    
    if (isJSRequest) {
        return new Response('console.log("Offline JS fallback");', 
            { headers: { 'Content-Type': 'application/javascript' } }
        );
    }
    
    return new Response('Resource unavailable offline', { status: 503 });
}

// Background sync for offline data
if (CONFIG.FEATURES.BACKGROUND_SYNC) {
    self.addEventListener('sync', (event) => {
        console.log('[SW] Background sync triggered:', event.tag);
        
        if (event.tag === 'sync-habitus-data') {
            event.waitUntil(syncOfflineData());
        }
    });
}

// Sync offline data when connection is restored
async function syncOfflineData() {
    try {
        // Get offline data from IndexedDB or localStorage
        const clients = await self.clients.matchAll();
        
        for (const client of clients) {
            client.postMessage({
                type: 'SYNC_REQUEST',
                timestamp: Date.now()
            });
        }
        
        console.log('[SW] Offline data sync completed');
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}

// Push notifications
if (CONFIG.FEATURES.PUSH_NOTIFICATIONS) {
    self.addEventListener('push', (event) => {
        const data = event.data ? event.data.json() : {};
        const options = {
            body: data.body || 'New notification from Habitus',
            icon: CONFIG.BASE_PATH + 'icons/icon-192x192.png',
            badge: CONFIG.BASE_PATH + 'icons/icon-192x192.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || CONFIG.BASE_PATH,
                timestamp: Date.now()
            },
            actions: [
                {
                    action: 'open',
                    title: 'Open App',
                    icon: CONFIG.BASE_PATH + 'icons/icon-192x192.png'
                },
                {
                    action: 'dismiss', 
                    title: 'Dismiss'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'Habitus', options)
        );
    });
    
    self.addEventListener('notificationclick', (event) => {
        event.notification.close();
        
        if (event.action === 'open' || !event.action) {
            event.waitUntil(
                clients.openWindow(event.notification.data.url || CONFIG.BASE_PATH)
            );
        }
    });
}

// Message handling for client communication
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({ version: '2.0.0', config: CONFIG });
            break;
            
        case 'CLEAR_CACHE':
            event.waitUntil(clearAllCaches());
            break;
            
        case 'UPDATE_CONFIG':
            Object.assign(CONFIG, data);
            break;
    }
});

// Clear all caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames
            .filter(name => name.startsWith('habitus-'))
            .map(name => caches.delete(name))
    );
    console.log('[SW] All caches cleared');
}

// Periodic cleanup of old cache entries
setInterval(async () => {
    try {
        const cache = await caches.open(CONFIG.CACHE_DYNAMIC);
        const requests = await cache.keys();
        const now = Date.now();
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const dateHeader = response.headers.get('date');
                const cacheTime = dateHeader ? new Date(dateHeader).getTime() : 0;
                
                if (now - cacheTime > CONFIG.MAX_CACHE_AGE) {
                    await cache.delete(request);
                    console.log('[SW] Cleaned old cache entry:', request.url);
                }
            }
        }
    } catch (error) {
        console.error('[SW] Cache cleanup error:', error);
    }
}, 60 * 60 * 1000); // Run every hour
