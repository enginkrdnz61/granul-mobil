// Basit bir servis çalışanı — sadece "Ana Ekrana Ekle" ile gerçek bir uygulama gibi
// yüklenebilmesi için gerekli (PWA kriteri). Veri her zaman canlı Google Drive'dan
// çekildiği için burada agresif bir önbellekleme YAPILMAZ — sadece uygulamanın kendi
// dosyalarını (HTML/JS/CSS) önbelleğe alıp, kötü bir bağlantıda uygulamanın en azından
// AÇILABİLMESİNİ sağlar.
var ONBELLEK_ADI = 'granul-maliyet-mobil-v1';
var ONBELLEKLENECEKLER = [
  './mobile.html',
  './web-api.js',
  './app.js',
  './mobile-bootstrap.js',
  './manifest.json'
];

self.addEventListener('install', function (evt) {
  evt.waitUntil(
    caches.open(ONBELLEK_ADI).then(function (cache) {
      return cache.addAll(ONBELLEKLENECEKLER);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (evt) {
  evt.waitUntil(
    caches.keys().then(function (isimler) {
      return Promise.all(
        isimler.filter(function (isim) { return isim !== ONBELLEK_ADI; })
          .map(function (isim) { return caches.delete(isim); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (evt) {
  // Google Drive/API isteklerine ASLA dokunma (her zaman ağdan, canlı veri) — sadece kendi
  // uygulama dosyalarımız için "önce ağ, olmazsa önbellek" stratejisi uygula.
  var url = evt.request.url;
  if (url.indexOf('googleapis.com') !== -1 || url.indexOf('accounts.google.com') !== -1) return;

  evt.respondWith(
    fetch(evt.request).catch(function () {
      return caches.match(evt.request);
    })
  );
});
