/* ============================================================
   RaporKilat SD — app.js
   Titik masuk: service worker (PWA), tombol pasang aplikasi,
   pemulihan antrean simpan, dan render pertama.
   ============================================================ */
'use strict';

/* ---------- PWA: service worker + pemberitahuan versi baru ---------- */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
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
  let prompt = null;
  const btn = () => $('#btnPasang');
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    prompt = e;
    if (LS.get('rk:pasang-tutup')) return;
    const b = btn();
    if (b) b.hidden = false;
  });
  window.addEventListener('appinstalled', () => { prompt = null; const b = btn(); if (b) b.hidden = true; toast('Aplikasi terpasang di perangkat Anda.', 'ok'); });
  document.addEventListener('click', async e => {
    if (e.target.closest('#btnPasang [data-tutup]')) { LS.set('rk:pasang-tutup', 1); btn().hidden = true; return; }
    if (!e.target.closest('#btnPasang [data-pasang]') || !prompt) return;
    prompt.prompt();
    const r = await prompt.userChoice;
    if (r.outcome === 'accepted') btn().hidden = true;
    prompt = null;
  });
  return { bisa: () => !!prompt };
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
})();
