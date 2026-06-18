/* ON-AIR 서비스워커 — 페이지는 네트워크 우선, 아이콘 등은 캐시 우선 */
var CACHE = 'onair-v4';
var ASSETS = [
  './',
  'index.html',
  'privacy.html',
  'terms.html',
  'licenses.html',
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
  if (url.origin !== location.origin) { return; }  // 유튜브·폰트·API 등은 네트워크에 맡김

  var isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (isPage) {
    // 페이지: HTTP 캐시를 우회해 항상 서버에서 최신을 받음. 오프라인일 때만 캐시 사용.
    e.respondWith(
      fetch(req.url, { cache: 'no-store' }).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return resp;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('index.html'); });
      })
    );
    return;
  }
  // 그 외(아이콘·매니페스트): 캐시 우선
  e.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return resp;
      });
    })
  );
});
