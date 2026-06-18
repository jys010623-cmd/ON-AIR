/* ON-AIR 서비스워커 — 앱 셸 캐싱 + 오프라인 폴백 */
var CACHE = 'onair-v1';
var ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-180.png',
  'favicon-64.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') { return; }
  var url = new URL(req.url);
  // 같은 출처(앱 셸)만 캐시 우선 처리. 유튜브·폰트·API 등 외부는 네트워크에 맡김.
  if (url.origin !== location.origin) { return; }
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) { return cached; }
      return fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return resp;
      }).catch(function () {
        return caches.match('index.html');
      });
    })
  );
});
