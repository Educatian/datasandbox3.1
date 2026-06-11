// Data Sandbox service worker: offline-capable app shell.
//
// Strategy:
//  - Navigations: network-first (always pick up new deploys), cached shell
//    as offline fallback.
//  - Same-origin static assets (hashed JS/CSS, brand media, guide): cache-first
//    with background refresh (hashed names make this safe across deploys).
//  - Cross-origin (Supabase, LLM proxy, fonts CDN): never intercepted.
const CACHE = 'ds-shell-v1';
const PRECACHE = ['/', '/manifest.webmanifest', '/brand/logo.webp', '/brand/hero.webp'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // leave Supabase/LLM/fonts alone

    // App navigations: network-first, fall back to the cached shell offline
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put('/', copy));
                    return res;
                })
                .catch(() => caches.match('/'))
        );
        return;
    }

    // Static assets: cache-first with background refresh
    event.respondWith(
        caches.match(req).then((cached) => {
            const fetched = fetch(req)
                .then((res) => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(CACHE).then((c) => c.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || fetched;
        })
    );
});
