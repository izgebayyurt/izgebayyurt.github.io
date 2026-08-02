/* Rill's service worker.
 *
 * The game is one HTML file that loads nothing at run time — every board is
 * computed on the device — so "works offline" only ever meant "keep the file".
 *
 * The page goes to the network first and falls back to the cache; the icons,
 * which never change, come from the cache first. Serving the page cache-first
 * too was tidier and wrong: a deploy then arrived a launch late, and a fix
 * nobody could see is indistinguishable from a fix that does not work. Offline
 * still plays, because the fallback is the whole point of keeping the file.
 *
 * Bump CACHE when the shell changes; the old one is deleted on activate.
 */
var CACHE = "rill-v3";
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

  var shell = req.mode === "navigate" ||
              url.pathname.endsWith("/") ||
              url.pathname.endsWith("/index.html");

  if (shell) {
    ev.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          /* under both keys: the request may be the directory, and the
             precache and the offline fallback both name index.html */
          var a = res.clone(), b = res.clone();
          caches.open(CACHE).then(function (c) {
            c.put(req, a);
            c.put("./index.html", b);
          });
        }
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || caches.match("./index.html");
        });
      })
    );
    return;
  }

  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
