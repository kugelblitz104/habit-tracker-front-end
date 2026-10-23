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
                    return (
                        (await caches.match(req)) || (await caches.match('/')) || Response.error()
                    );
                }
            })()
        );
    }
});

// Web Push: the server sends {title, body, url}; the click opens or focuses that URL.
self.addEventListener('push', (event) => {
    let payload = {};
    try {
        payload = event.data?.json() ?? {};
    } catch (err) {
        // Malformed payload: still show a notification, browsers require one.
    }
    const { title = 'Habit Tracker', body = '', url = '/' } = payload;
    event.waitUntil(
        self.registration.showNotification(title, {
            body,
            data: { url },
            icon: '/icon-192.png'
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL(event.notification.data?.url || '/', self.location.origin);
    event.waitUntil(
        (async () => {
            const windows = await self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            });
            const onPath = windows.find((c) => new URL(c.url).pathname === target.pathname);
            if (onPath) return onPath.focus();
            const other = windows[0];
            if (other) {
                const focused = await other.focus();
                const client = focused ?? other;
                if (client.navigate) return client.navigate(target.href);
            }
            return self.clients.openWindow(target.href);
        })()
    );
});
