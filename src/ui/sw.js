const CACHE_NAME = "lyda-pwa-cache-v1";
const CORE_ASSETS = [
    "/",
    "/main.js",
    "/styles/style.css",
    "/styles/elements.css",
    "/styles/themes/dark.css",
    "/img/icons/lyda_black_32.png",
    "/img/icons/lyda_black_64.png",
    "/img/icons/lyda_black_512.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()))),
        ).then(() => self.clients.claim()),
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;

    if (req.method !== "GET") return;

    const url = new URL(req.url);

    // Network-first for navigation requests (HTML)
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {
                    });
                    return res;
                })
                .catch(() => caches.match(req).then((res) => res || caches.match("/"))),
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req)
                .then((res) => {
                    const resClone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {
                    });
                    return res;
                })
                .catch(() => cached);
        }),
    );
});
