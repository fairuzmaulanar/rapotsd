/* ============================================================
   RaporKilat SD — app.js
   Titik masuk: service worker (PWA), tombol pasang aplikasi,
   pemulihan antrean simpan, dan render pertama.
   ============================================================ */
'use strict';

/* ---------- PWA: service worker + pemberitahuan versi baru ---------- */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(TT.url('./sw.js')).then(reg => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) tawarkanMuatUlang();
        });
      });
      // periksa versi baru tiap 30 menit selama aplikasi terbuka
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    }).catch(e => console.warn('Service worker gagal:', e));
  });
}
function tawarkanMuatUlang() {
  const el = document.createElement('div');
  el.className = 'toast info pwa-baru';
  mount(el, html`${ic('system_update')}<div><b>Versi baru tersedia</b>Muat ulang untuk memakai pembaruan.</div><button class="btn sm primary">Muat ulang</button>`);
  el.querySelector('button').onclick = async () => {
    if (Simpan.info().pending) { Simpan.flushAll(); await new Promise(r => setTimeout(r, 1500)); }
    location.reload();
  };
  let box = $('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  box.appendChild(el);
}

/* ---------- Tombol "Pasang aplikasi" (Add to Home Screen) ---------- */
const Pasang = (() => {
  // modern-web-guidance (pwa/install): utamakan navigator.install() bila ada; cadangan beforeinstallprompt.
  // Event prompt hanya bisa dipakai sekali → dikosongkan SEBELUM menunggu jawaban pengguna.
  let prompt = null;
  const adaInstall = typeof Navigator !== 'undefined' && 'install' in Navigator.prototype;
  const sudahTerpasang = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const btn = () => $('#btnPasang');
  const tampil = v => { const b = btn(); if (b) b.hidden = !v || !!LS.get('rk:pasang-tutup') || sudahTerpasang(); };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); prompt = e; tampil(true); });
  window.addEventListener('appinstalled', () => { prompt = null; tampil(false); toast('Aplikasi terpasang di perangkat Anda.', 'ok'); });
  if (adaInstall) tampil(true);   // skrip defer: #btnPasang sudah ada di DOM
  document.addEventListener('click', async e => {
    if (e.target.closest('#btnPasang [data-tutup]')) { LS.set('rk:pasang-tutup', 1); tampil(false); return; }
    if (!e.target.closest('#btnPasang [data-pasang]')) return;
    if (adaInstall) {
      try { await navigator.install(); tampil(false); return; }   // dipanggil langsung di klik (butuh aktivasi pengguna)
      catch (ex) { if (ex && ex.name === 'AbortError') return; if (!prompt) { toast('Gunakan menu browser → "Pasang aplikasi" / "Tambahkan ke layar utama".', 'info'); return; } }
    }
    if (!prompt) return;
    const p = prompt; prompt = null; tampil(false);
    p.prompt();
    const r = await p.userChoice;
    if (r.outcome !== 'accepted') tampil(false);
  });
  return { bisa: () => !!prompt || adaInstall };
})();

/* ---------- Lembar rapor menyesuaikan lebar layar (tanpa geser horizontal) ---------- */
(() => {
  if (!('ResizeObserver' in window)) return;
  const ro = new ResizeObserver(es => es.forEach(en => {
    const st = en.target, p = st.querySelector('.paper');
    if (!p) return;
    const lebarKertas = p.offsetWidth || 794;           // 210 mm ≈ 794 px
    const ruang = st.clientWidth - 16;
    st.style.setProperty('--fit', Math.min(1, Math.max(0.3, ruang / lebarKertas)).toFixed(3));
  }));
  const pantau = () => $$('.paper-stage:not([data-fit])').forEach(st => { st.dataset.fit = '1'; ro.observe(st); });
  new MutationObserver(pantau).observe(document.body, { childList: true, subtree: true });
})();

/* ---------- Galat tak tertangkap → beri tahu pengguna, jangan diam ---------- */
window.addEventListener('unhandledrejection', e => {
  const m = e.reason && e.reason.message;
  if (m && !/AbortError|Load failed/.test(m)) toast(m, 'err');
});

/* ---------- Mulai ---------- */
(function mulai() {
  if (S.token && !S.isOrtu) Simpan.pulihkan();
  if (!location.hash || location.hash === '#') {
    history.replaceState(null, '', '#' + (S.token ? (S.isOrtu ? '/portal' : '/beranda') : '/'));
  }
  render();
  // P1.2: bangunkan server Apps Script selagi orang membaca halaman / mengetik sandi
  if (!S.token && window.CONFIG && CONFIG.GAS_URL && !/GANTI_DENGAN/.test(CONFIG.GAS_URL)) {
    fetch(CONFIG.GAS_URL + '?action=ping').catch(() => {});
  }
})();
