/* Tapa's service worker.
 *
 * The game is one HTML file that loads nothing at run time — every board is
 * computed on the device — so "works offline" only ever meant "keep the file".
 * That makes the strategy short: precache the shell, serve it from the cache
 * so a cold start never waits on the network, and quietly refetch in the
 * background so the next launch has whatever was deployed since.
 *
 * Bump CACHE when the shell changes; the old one is deleted on activate.
 */
var CACHE = "tapa-v1";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function (ev) {
  ev.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      /* One missing file must not leave the previous worker in charge for
         good; the fetch handler copes with a partial cache. */
      .catch(function () {})
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (ev) {
  var req = ev.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      var live = fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        /* offline: the cached copy is the answer, and for a navigation with
           nothing cached under this exact URL, the shell still is */
        return hit || caches.match("./index.html");
      });
      return hit || live;
    })
  );
});
