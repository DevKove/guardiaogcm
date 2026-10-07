const CACHE_VERSION = "guardiao-gcm-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const BASE = new URL("./", self.location).pathname;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([
        `${BASE}manifest.webmanifest`,
        `${BASE}pwa-192.svg`,
        `${BASE}pwa-512.svg`,
      ]),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("guardiao-gcm-") && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached ||
            caches.match(`${BASE}`).then((fallback) =>
              fallback ||
              caches.match(`${BASE}_shell.html`).then((shell) => shell || Response.error()),
            ),
          ),
        ),
    );
    return;
  }

  if (url.pathname.includes("/assets/") || url.pathname.endsWith(".css") || url.pathname.endsWith(".js") || url.pathname.endsWith(".svg") || url.pathname.endsWith(".ico")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached || Response.error());
        return cached || network;
      }),
    );
  }
});
