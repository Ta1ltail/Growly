// project_101 — Service Worker
// Offline-first strategy: cache on install, serve from cache with network update.

const CACHE = "p101-v1";
const PRECACHE_URLS = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  event.waitUntil(self.clients.claim());
});

// Network-first with cache fallback for HTML/navigation requests.
// Cache-first with stale-while-revalidate for static assets.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // For navigation requests (HTML pages), try network first, fall back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline"))),
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts), cache-first
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      }),
    );
    return;
  }

  // For API-like requests (/_next/...), network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then(async (response) => {
        const cache = await caches.open(CACHE);
        cache.put(request, response.clone());
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
