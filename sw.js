"use strict";

const CACHE_PREFIX = "duangdee-pwa-offline-";
const CACHE_NAME = CACHE_PREFIX + "v1";
const OFFLINE_URL = new URL("./offline.html", self.registration.scope).href;
const OFFLINE_ASSETS = [
  OFFLINE_URL,
  new URL("./icons/icon-192.png", self.registration.scope).href
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_ASSETS)));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key))
  )));
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  const storefront = url.origin === scope.origin &&
    (url.pathname === scope.pathname || url.pathname === scope.pathname + "index.html");
  if (event.request.method !== "GET" || event.request.mode !== "navigate" || !storefront) return;

  // Never cache the storefront, credentials, stock, balances, or API responses.
  event.respondWith(fetch(event.request, { cache: "no-store" }).catch(async error => {
    console.warn("Storefront navigation unavailable:", error);
    const cache = await caches.open(CACHE_NAME);
    const offline = await cache.match(OFFLINE_URL);
    return offline || new Response("Offline. Reconnect to use the store.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }));
});
