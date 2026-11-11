/* ============================================================
   RaporKilat SD — Service Worker
   - Berkas aplikasi: tampil seketika dari cache, diperbarui di latar
     (stale-while-revalidate) → buka aplikasi & pindah menu tanpa jeda.
   - Permintaan ke Google Apps Script TIDAK PERNAH di-cache di sini
     (data selalu segar; cache data diatur oleh js/core.js).
   - Naikkan VERSI setiap kali merilis perubahan frontend.
   ============================================================ */
const VERSI = 'raporkilat-v1.0.0';
const RUNTIME = 'raporkilat-font';
const INTI = [
  './', './index.html', './manifest.json', './css/app.css',
  './js/config.js', './js/core.js', './js/hitung.js', './js/grid.js', './js/cetak.js',
  './js/pages-publik.js', './js/pages-guru.js', './js/pages-wali.js', './js/pages-kepsek.js',
  './js/pages-operator.js', './js/pages-ortu.js', './js/app.js',
  './js/xlsx-lite.js', './js/vendor/qrcode.js', './js/vendor/jszip.min.js',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(INTI)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSI && k !== RUNTIME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // POST ke GAS: langsung ke jaringan
  const url = new URL(req.url);
  if (/(^|\.)script\.google(usercontent)?\.com$/.test(url.hostname)) return; // API: jangan disentuh

  // Font Google: cache-first (jarang berubah)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // config.js (berisi GAS_URL): utamakan jaringan agar perubahan URL langsung berlaku
  if (url.pathname.endsWith('/js/config.js')) {
    e.respondWith(fetch(req).then(res => { const r2 = res.clone(); caches.open(VERSI).then(c => c.put(req, r2)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  // Navigasi halaman: index.html dari cache, perbarui di latar
  const kunci = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(caches.open(VERSI).then(async c => {
    const hit = await c.match(kunci, { ignoreSearch: true });
    const segar = fetch(req).then(res => {
      if (res.ok) c.put(kunci, res.clone());
      return res;
    }).catch(() => hit);
    return hit || segar;
  }));
});
