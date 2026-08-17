// ============================================================
// web-api.js — Mobil/PWA (salt-okunur) veri katmanı.
//
// Electron masaüstünde "window.api", main.js'e (gerçek dosya okuma/yazma yapan) bir köprüdür
// (preload.js üzerinden). Mobilde Electron/Node.js YOK — bu yüzden burada AYNI fonksiyon
// isimleriyle, ama Google Drive'dan indirilmiş bir JSON'u bellekte tutup ondan okuyan bir
// "sahte" (shim) window.api kuruyoruz. app.js (asıl uygulama kodu) bu ikisi arasındaki farkı
// hiç bilmez — hangi window.api yüklüyse onu kullanır.
//
// GÜVENLİK: TÜM "yazma" (add/update/delete/set/save/send/mark/restore/reorder) fonksiyonları
// BİLEREK burada KAPATILMIŞTIR — çağrılırlarsa Promise.reject ile net bir hata döner. Arayüzde
// zaten çoğu ekleme/silme/değiştirme butonu (app.js'teki MOBIL_SALT_OKUNUR kontrolleriyle)
// gizlenmiştir; bu dosya buna ek bir GÜVENLİK KATMANIDIR — bir buton yanlışlıkla gizlenmemiş
// olsa bile, gerçek bir veri değişikliği YAPILAMAZ.
// ============================================================
(function () {
  'use strict';

  var VERI = null; // Drive'dan indirilen ham JSON (main.js'teki "data" objesiyle BİREBİR AYNI şekil)

  function stripSifre(u) {
    var kopya = Object.assign({}, u);
    delete kopya.sifreTuz;
    delete kopya.sifreHash;
    return kopya;
  }

  // mobile-bootstrap.js, Google Drive'dan dosyayı indirip metnini bu fonksiyona verir.
  window.WebApiVeriYukle = function (jsonMetni) {
    var ayristirilan = JSON.parse(jsonMetni);
    if (!ayristirilan.birimListesi) ayristirilan.birimListesi = [];
    if (!ayristirilan.birimVerileri) ayristirilan.birimVerileri = {};
    if (!ayristirilan.merkeziCinsler) ayristirilan.merkeziCinsler = {};
    if (!ayristirilan.merkeziSatinAlmalar) ayristirilan.merkeziSatinAlmalar = {};
    if (!ayristirilan.kullanicilar) ayristirilan.kullanicilar = [];
    if (!ayristirilan.musteriler) ayristirilan.musteriler = [];
    if (!ayristirilan.cariHareketler) ayristirilan.cariHareketler = [];
    if (!ayristirilan.bekleyenIslemler) ayristirilan.bekleyenIslemler = [];
    if (!ayristirilan.geriBildirimler) ayristirilan.geriBildirimler = [];
    if (!ayristirilan.mesajlar) ayristirilan.mesajlar = [];
    VERI = ayristirilan;
  };

  function saltOkunurRed(isim) {
    return function () {
      return Promise.reject(new Error('Bu salt okunur (görüntüleme) bir moddur — "' + isim + '" işlemi burada yapılamaz. Değişiklik yapmak için masaüstü programını kullanın.'));
    };
  }

  var api = {
    // ---- OKUMA (gerçek, Drive'dan indirilmiş veriyle çalışır) ----
    getAppVersion: function () { return Promise.resolve('mobil (salt okunur)'); },
    getConfig: function () { return Promise.resolve({ dataFilePath: 'Google Drive (salt okunur)', kullaniciAdi: '' }); },
    setConfig: function (partial) { return Promise.resolve(Object.assign({ dataFilePath: 'Google Drive (salt okunur)', kullaniciAdi: '' }, partial)); },
    getDataFilePath: function () { return Promise.resolve('Google Drive (salt okunur)'); },
    pickExistingFile: function () { return Promise.resolve(null); },
    pickNewFileLocation: function () { return Promise.resolve(null); },

    loadAll: function () {
      return Promise.resolve({
        birimListesi: VERI.birimListesi,
        kullanicilar: VERI.kullanicilar.map(stripSifre),
        bekleyenIslemler: VERI.bekleyenIslemler
      });
    },

    getKullaniciListesi: function () {
      return Promise.resolve(VERI.kullanicilar.map(function (u) {
        return { id: u.id, ad: u.ad, rol: u.rol };
      }));
    },

    // Salt okunur modda şifre kontrolü YAPILMAZ: Drive'a zaten okuma izni olan biri, hangi
    // kullanıcı görünümünü seçerse seçsin sadece GÖRÜNTÜLEME yapabilir, hiçbir veri değişmez —
    // bu yüzden ekstra bir şifre sorgusu gereksiz bir sürtünme olurdu.
    loginKullanici: function (id, sifre, adYedek) {
      var u = VERI.kullanicilar.find(function (x) { return x.id === id; }) ||
        VERI.kullanicilar.find(function (x) { return x.ad === adYedek; });
      if (!u) return Promise.resolve({ basarili: false, hata: 'Kullanıcı bulunamadı.' });
      return Promise.resolve({
        basarili: true,
        data: {
          birimListesi: VERI.birimListesi,
          kullanicilar: VERI.kullanicilar.map(stripSifre),
          bekleyenIslemler: VERI.bekleyenIslemler
        }
      });
    },

    getBirimData: function (birimId) {
      var bd = VERI.birimVerileri[birimId] || {};
      return Promise.resolve(Object.assign({}, bd, {
        merkeziCinsler: VERI.merkeziCinsler,
        merkeziSatinAlmalar: VERI.merkeziSatinAlmalar
      }));
    },
    getMerkeziCinsler: function () { return Promise.resolve(VERI.merkeziCinsler); },
    getMerkeziSatinAlmalar: function () { return Promise.resolve(VERI.merkeziSatinAlmalar); },
    getMusteriler: function () { return Promise.resolve({ musteriler: VERI.musteriler, cariHareketler: VERI.cariHareketler }); },
    getPersonelListesi: function () { return Promise.resolve(VERI.personelListesi || []); },
    getBekleyenIslemler: function () { return Promise.resolve(VERI.bekleyenIslemler); },
    getGeriBildirimler: function () { return Promise.resolve(VERI.geriBildirimler); },
    getMesajlarim: function (kullaniciId) {
      return Promise.resolve(VERI.mesajlar.filter(function (m) {
        return m.gonderenId === kullaniciId || m.aliciId === kullaniciId;
      }));
    },
    listDailyBackups: function () { return Promise.resolve([]); }
  };

  // ---- YAZMA (TÜMÜ reddedilir — bkz. dosya başındaki güvenlik notu) ----
  [
    'addBekleyenIslem', 'addBirim', 'addCapakCinsi', 'addCapakGirisi', 'addCapakSatisi', 'addCapakUretimi',
    'addCariHareket', 'addEkKategori', 'addEkKategoriOge', 'addEkParametre', 'addEntry', 'addGeriBildirim',
    'addGranulGirisi', 'addHammaddeCinsi', 'addHammaddeGirisi', 'addHurdaCinsi', 'addHurdaGirisi',
    'addIscilikCapakGirisi', 'addKullanici', 'addMusteri', 'addMusteriSatisi', 'addPersonel', 'addPersonelMerkezi', 'addUnvan', 'addUrun',
    'deleteAylikKapanis', 'deleteBekleyenIslem', 'deleteBirim', 'deleteCapakCinsi', 'deleteCapakGirisi',
    'deleteCapakSatisi', 'deleteCapakUretimi', 'deleteCariHareket', 'deleteCopItem', 'deleteEkKategori',
    'deleteEkKategoriOge', 'deleteEkParametre', 'deleteEntry', 'deleteGeriBildirim', 'deleteGranulGirisi',
    'deleteHammaddeCinsi', 'deleteHammaddeGirisi', 'deleteHurdaCinsi', 'deleteHurdaGirisi', 'deleteIscilikCapakGirisi',
    'deleteKullanici', 'deleteMesaj', 'deleteMusteri', 'deleteMusteriFiyat', 'deleteMusteriSatisi', 'deletePersonel', 'deletePersonelMerkezi',
    'deleteUnvan', 'deleteUrun', 'emptyCopKutusu', 'markGeriBildirimDurum', 'markMesajlarOkundu', 'reorderBirim',
    'reorderCapakCinsi', 'reorderEkKategori', 'reorderEkKategoriOge', 'reorderHammaddeCinsi', 'reorderHurdaCinsi',
    'reorderUrun', 'restoreCop', 'restoreDailyBackup', 'saveAylikKapanis', 'saveSettings', 'sendMesaj',
    'setAnaUretimTuru', 'setCinsAktif', 'setSatinAlimAktif', 'updateBirimAdi', 'updateCapakCinsi',
    'updateCapakCinsiGramaj', 'updateCapakGirisi', 'updateCapakSatisi', 'updateCapakUretimi', 'updateCariHareket',
    'updateCinsBasligi', 'updateEkKategoriBaslik', 'updateEkKategoriOge', 'updateEkKategoriOgeGramaj',
    'updateEkParametre', 'updateEntry', 'updateGeriBildirim', 'updateGranulGirisi', 'updateHammaddeCinsi',
    'updateHammaddeGirisi', 'updateHurdaCinsi', 'updateHurdaCinsiGramaj', 'updateHurdaGirisi', 'updateIscilikCapakGirisi',
    'updateKullanici', 'updateKullaniciIzinBirim', 'updateKullaniciSatinAlmaIzni', 'updateMusteri', 'updateMusteriFiyat',
    'updateMusteriSatisi', 'updatePersonel', 'updatePersonelMerkezi', 'updateUrunAdi', 'updateUrunGramaj', 'updateUrunRate'
  ].forEach(function (isim) { api[isim] = saltOkunurRed(isim); });

  window.api = api;
})();
