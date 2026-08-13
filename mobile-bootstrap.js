// ============================================================
// mobile-bootstrap.js — Google ile giriş + Drive'daki veri dosyasını indirme + uygulamayı başlatma.
// Bu dosya SADECE mobile.html içinde kullanılır, Electron masaüstünde hiç yüklenmez.
// ============================================================
(function () {
  'use strict';

  // ÖNEMLİ: Bu satırı, Google Cloud Console'da oluşturduğunuz OAuth Client ID ile değiştirin.
  // Kurulum talimatları için ayrı olarak paylaşılan "MOBIL-KURULUM.md" dosyasına bakın.
  var GOOGLE_CLIENT_ID = '700097654718-cj57v8ikbmiq3e566dohtjv65rqolkbh.apps.googleusercontent.com';
  var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
  var LS_DOSYA_ID_ANAHTARI = 'granulMaliyet_driveDosyaId';

  function escapeHtmlBasit(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function ekranGoster(icHtml) {
    var root = document.getElementById('root');
    if (root) root.innerHTML = '<div class="gate">' + icHtml + '</div>';
  }

  // "https://drive.google.com/file/d/FILE_ID/view..." veya "...?id=FILE_ID" gibi yaygın Drive link
  // biçimlerinden dosya ID'sini çıkarır; kullanıcı doğrudan ID'yi de yapıştırmış olabilir.
  function dosyaIdCikar(girdi) {
    girdi = (girdi || '').trim();
    var m1 = girdi.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    var m2 = girdi.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    if (/^[a-zA-Z0-9_-]{15,}$/.test(girdi)) return girdi;
    return null;
  }

  function dosyaSecimEkraniGoster(accessToken, hataMesaji) {
    ekranGoster(
      '<div class="pellet"></div><h2>Veri Dosyasını Bağlayın</h2>' +
      '<p>Google Drive\'daki paylaşımlı veri dosyanızın (JSON) bağlantısını veya dosya ID\'sini yapıştırın. Bu bilgi sadece bu telefonda saklanır, bir daha sormaz.</p>' +
      (hataMesaji ? '<div class="callout warn" style="margin-bottom:14px; text-align:left;">' + escapeHtmlBasit(hataMesaji) + '</div>' : '') +
      '<input type="text" id="mb_dosya_input" placeholder="Drive dosya linki veya ID" style="margin-bottom:14px;">' +
      '<button class="btn" id="mb_dosya_devam" style="width:100%;">Devam Et</button>'
    );
    document.getElementById('mb_dosya_devam').addEventListener('click', function () {
      var id = dosyaIdCikar(document.getElementById('mb_dosya_input').value);
      if (!id) { dosyaSecimEkraniGoster(accessToken, 'Geçerli bir Drive linki/ID\'si girilmedi. Lütfen kontrol edip tekrar deneyin.'); return; }
      localStorage.setItem(LS_DOSYA_ID_ANAHTARI, id);
      veriIndirVeBaslat(accessToken, id);
    });
  }

  function veriIndirVeBaslat(accessToken, dosyaId) {
    ekranGoster('<div class="pellet"></div><h2>Yükleniyor…</h2>');
    fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(dosyaId) + '?alt=media', {
      headers: { Authorization: 'Bearer ' + accessToken }
    }).then(function (res) {
      if (!res.ok) {
        if (res.status === 404) throw new Error('Dosya bulunamadı. Lütfen bağlantıyı/ID\'yi kontrol edin veya bu Google hesabının dosyaya erişimi olduğundan emin olun.');
        if (res.status === 403) throw new Error('Bu Google hesabının dosyaya erişim izni yok. Dosyayı Drive\'da bu hesapla paylaştığınızdan emin olun.');
        throw new Error('Drive\'dan veri indirilemedi (HTTP ' + res.status + ').');
      }
      return res.text();
    }).then(function (metin) {
      window.WebApiVeriYukle(metin);
      window.MOBIL_SALT_OKUNUR = true;
      boot();
    }).catch(function (err) {
      localStorage.removeItem(LS_DOSYA_ID_ANAHTARI);
      dosyaSecimEkraniGoster(accessToken, err.message);
    });
  }

  function dosyaVeVeriAkisiBaslat(accessToken) {
    var kayitliDosyaId = localStorage.getItem(LS_DOSYA_ID_ANAHTARI);
    if (kayitliDosyaId) veriIndirVeBaslat(accessToken, kayitliDosyaId);
    else dosyaSecimEkraniGoster(accessToken);
  }

  function googleIleGirisYap() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      ekranGoster('<div class="pellet"></div><h2>Bağlantı Sorunu</h2><p>Google giriş sistemi yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.</p><button class="btn" onclick="location.reload()">Tekrar Dene</button>');
      return;
    }
    var tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: function (tokenResponse) {
        if (!tokenResponse || tokenResponse.error) {
          ekranGoster('<div class="pellet"></div><h2>Giriş Başarısız</h2><p>' + escapeHtmlBasit((tokenResponse && tokenResponse.error) || 'Bilinmeyen hata') + '</p><button class="btn" onclick="location.reload()">Tekrar Dene</button>');
          return;
        }
        dosyaVeVeriAkisiBaslat(tokenResponse.access_token);
      }
    });
    tokenClient.requestAccessToken();
  }

  function baslangicEkraniGoster() {
    ekranGoster(
      '<div class="pellet"></div><h2>Granül Üretim Maliyet Sistemi</h2>' +
      '<p>Mobil (salt okunur) görünüm — veri girişi/değişikliği burada yapılamaz, sadece görüntülenir.</p>' +
      '<button class="btn" id="mb_google_giris" style="width:100%;">Google ile Giriş Yap</button>'
    );
    document.getElementById('mb_google_giris').addEventListener('click', googleIleGirisYap);
  }

  window.addEventListener('DOMContentLoaded', baslangicEkraniGoster);
})();
