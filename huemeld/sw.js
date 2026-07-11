/* Huemeld Flow service worker — offline + installable.
   NETWORK-FIRST for the app shell + level data (so updates always land, with the
   cache as the offline fallback); cache-first for static assets like icons. */
var CACHE = "huemeld-v4";
var CORE = ["flow2.html", "flow-data.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-180.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.allSettled(CORE.map(function (u) { return c.add(u); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var fresh = false;
  try { fresh = req.mode === "navigate" || /(?:flow2\.html|flow-data\.js)$/.test(new URL(req.url).pathname); } catch (_e) {}
  if (fresh) {
    // live content: hit the network, refresh the cache, fall back to cache offline
    e.respondWith(fetch(req).then(function (res) {
      try { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); } catch (_e) {}
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) { return hit || caches.match("flow2.html"); });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      try {
        var u = new URL(req.url);
        if (u.origin === self.location.origin) { var cp = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); }
      } catch (_e) {}
      return res;
    }).catch(function () { return caches.match("flow2.html"); });
  }));
});
