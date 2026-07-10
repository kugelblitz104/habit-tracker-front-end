// Minimal service worker for the Ergosphere PWA. It makes the app installable
// and gives basic offline resilience: hashed static assets are cached
// cache-first; navigations are network-first with a cached fallback. Only
// same-origin GETs are touched — the (cross-origin) API is never intercepted.
const CACHE = 'ergosphere-v1';
const ASSET_RE = /\.(?:js|mjs|css|woff2?|ttf|png|jpe?g|svg|gif|ico|webmanifest)$/;

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // leave the API alone

    // Cache-first for fingerprinted static assets.
    if (ASSET_RE.test(url.pathname)) {
        event.respondWith(
            (async () => {
                const cached = await caches.match(req);
                if (cached) return cached;
                try {
                    const res = await fetch(req);
                    if (res.ok) {
                        const cache = await caches.open(CACHE);
                        cache.put(req, res.clone());
                    }
                    return res;
                } catch (err) {
                    return cached || Response.error();
                }
            })()
        );
        return;
    }

    // Network-first for navigations, falling back to a cached document offline.
    if (req.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    const res = await fetch(req);
                    const cache = await caches.open(CACHE);
                    cache.put('/', res.clone());
                    return res;
                } catch (err) {
                    return (await caches.match(req)) || (await caches.match('/')) || Response.error();
                }
            })()
        );
    }
});
