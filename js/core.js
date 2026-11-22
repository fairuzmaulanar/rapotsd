/* ============================================================
   RaporKilat SD — core.js
   Utilitas, state, lapisan API (SWR + dedupe + antrean simpan),
   router hash, dan komponen UI dasar (toast, modal, skeleton).
   ============================================================ */
'use strict';

const APP_VERSI = '1.5.1';

/* ---------- Utilitas DOM & HTML aman ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = s => new Raw(String(s));
function fmtV(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(fmtV).join('');
  return esc(v);
}
/** Template HTML: semua nilai otomatis di-escape kecuali hasil html`` / raw(). */
function html(strs, ...vals) {
  let o = '';
  strs.forEach((s, i) => { o += s; if (i < vals.length) o += fmtV(vals[i]); });
  return new Raw(o);
}
const ic = (n, cls = '') => html`<span class="ic ${cls}" aria-hidden="true">${n}</span>`;

/* Trusted Types (modern-web-guidance: security/trusted-types).
   Satu kebijakan bernama "raporkilat"; objek kebijakannya tersimpan di dalam closure ini.
   - HTML hanya dari templat html`` (semua nilai sudah di-escape) atau raw() yang disengaja;
     string biasa diperlakukan sebagai TEKS (di-escape), jadi tidak mungkin jadi HTML tanpa sengaja.
   - URL skrip hanya dari situs ini (Lazy, service worker).
   CSP di index.html (require-trusted-types-for 'script') mewajibkan semua sink lewat kebijakan ini. */
const TT = (() => {
  const aturan = {
    createHTML: s => s,
    createScriptURL: s => {
      const u = new URL(s, document.baseURI);
      if (u.origin !== location.origin) throw new TypeError('Skrip dari situs lain ditolak: ' + s);
      return u.href;
    }
  };
  const p = window.trustedTypes && window.trustedTypes.createPolicy ? window.trustedTypes.createPolicy('raporkilat', aturan) : aturan;
  return {
    html: c => {
      if (c instanceof Raw) return p.createHTML(c.s);
      if (typeof c === 'string' && /<[a-z!/]/i.test(c)) console.warn('[TT] string mentah dirender sebagai teks:', c.slice(0, 80));
      return p.createHTML(esc(c === null || c === undefined ? '' : c));
    },
    url: s => p.createScriptURL(s),
    /** Urai XML (isi berkas .xlsx) → Document. Dokumen DOMParser tidak menjalankan skrip;
        hasil createHTML tidak pernah keluar dari fungsi ini, jadi tidak bisa dipakai ke innerHTML. */
    xml: s => new DOMParser().parseFromString(p.createHTML(String(s)), 'application/xml')
  };
})();
function mount(el, content) { el.innerHTML = TT.html(content); segAria(el); return el; }

/* Tombol pilihan (.seg) yang bukan tab: status terpilih juga diumumkan (aria-pressed), bukan hanya warna. */
function segAria(root) {
  $$('.seg:not([role=tablist]):not(nav) > button', root).forEach(b => b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false'));
}
document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('.seg'); if (g) queueMicrotask(() => segAria(g.parentNode || g)); });

/* ---------- Tab di dalam halaman (modern-web-guidance: ui-components/tabs) ----------
   tablist/tab/tabpanel + aria-selected; satu tab stop, panah kiri/kanan/Home/End memindah fokus,
   Enter/Spasi memilih (aktivasi manual karena isi tab dimuat dari server).
   Memakai focusgroup bawaan bila browser mendukung; selain itu roving tabindex sederhana. */
const Tab = (() => {
  let fokusBerikut = null;
  const asli = 'focusgroup' in HTMLElement.prototype;
  function atur(daftar, nilai) {
    const tbs = $$('[role=tab]', daftar);
    tbs.forEach(b => {
      const on = b.dataset.v === nilai;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      if (!asli) b.tabIndex = on ? 0 : -1;
    });
    const p = document.getElementById(daftar.dataset.panel), pilih = tbs.find(b => b.dataset.v === nilai);
    if (p && pilih) p.setAttribute('aria-labelledby', pilih.id);
  }
  /** daftar: wadah tombol [data-v]; panel: elemen isi; nilai: tab terpilih; kunci: id unik per halaman. */
  function pasang(daftar, panel, nilai, { kunci = 'tab', label = '' } = {}) {
    if (!daftar || !panel) return;
    const id = 'tab-' + kunci;
    daftar.setAttribute('role', 'tablist');
    if (label) daftar.setAttribute('aria-label', label);
    if (asli) daftar.setAttribute('focusgroup', 'tablist');
    panel.id = id + '-p'; panel.setAttribute('role', 'tabpanel');
    daftar.dataset.panel = panel.id;
    $$('button[data-v]', daftar).forEach(b => {
      b.type = 'button'; b.setAttribute('role', 'tab'); b.removeAttribute('aria-pressed'); b.id = id + '-' + b.dataset.v; b.setAttribute('aria-controls', panel.id);
    });
    atur(daftar, nilai);
    // fase capture: berjalan SEBELUM penangan klik halaman (yang mungkin langsung merender ulang)
    daftar.addEventListener('click', e => {
      const b = e.target.closest('[role=tab]'); if (!b) return;
      atur(daftar, b.dataset.v); fokusBerikut = id;   // bila halaman dirender ulang, fokus kembali ke tab ini
    }, true);
    if (!asli) {
      daftar.addEventListener('keydown', e => {
        const tbs = $$('[role=tab]', daftar), i = tbs.indexOf(e.target.closest('[role=tab]'));
        if (i < 0) return;
        const j = { ArrowRight: (i + 1) % tbs.length, ArrowLeft: (i - 1 + tbs.length) % tbs.length, Home: 0, End: tbs.length - 1 }[e.key];
        if (j === undefined) return;
        e.preventDefault();
        tbs.forEach((b, k) => { b.tabIndex = k === j ? 0 : -1; });
        tbs[j].focus();
      });
      daftar.addEventListener('focusout', e => {
        if (!daftar.contains(e.relatedTarget)) { const s = $('[role=tab][aria-selected=true]', daftar); if (s) atur(daftar, s.dataset.v); }
      });
    }
    if (fokusBerikut === id) { fokusBerikut = null; const s = $('[role=tab][aria-selected=true]', daftar); if (s) s.focus({ preventScroll: true }); }
  }
  return { pasang };
})();

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function tglID(s) {
  if (!s) return '';
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
  if (isNaN(d)) return String(s);
  return d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
}
function jamID(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return '';
  const now = new Date();
  const hm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  return d.toDateString() === now.toDateString() ? hm : d.getDate() + ' ' + BULAN[d.getMonth()].slice(0, 3) + ' ' + hm;
}
function initials(n) { return String(n || '?').replace(/[^A-Za-z\s]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?'; }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function num(v) { if (v === '' || v === null || v === undefined) return null; const n = Number(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
function fmt1(v) { return v === null || v === undefined || v === '' ? '–' : (Math.round(Number(v) * 10) / 10).toLocaleString('id-ID'); }
const isTrue = v => v === true || v === 1 || /^(true|ya|y|1|aktif)$/i.test(String(v));
const AGAMA = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
function sortBy(arr, f) { return arr.slice().sort((a, b) => { const x = f(a), y = f(b); return x < y ? -1 : x > y ? 1 : 0; }); }
function unduhBlob(blob, nama) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- localStorage aman ---------- */
const LS = {
  get(k, def = null) { try { const v = localStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { // kuota penuh: buang cache baca tertua
      try {
        const ks = Object.keys(localStorage).filter(x => x.startsWith('rk:c:')).map(x => [x, (LS.get(x) || {}).t || 0]).sort((a, b) => a[1] - b[1]);
        ks.slice(0, Math.ceil(ks.length / 2) + 1).forEach(x => localStorage.removeItem(x[0]));
        localStorage.setItem(k, JSON.stringify(v)); return true;
      } catch (e2) { return false; }
    }
  },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};

/* ---------- State aplikasi ---------- */
const S = {
  token: null, user: null, boot: null, periodeId: null,
  ctx: LS.get('rk:ctx', {}),
  simpanCtx() { LS.set('rk:ctx', this.ctx); },
  get pengaturan() { return (this.boot && this.boot.pengaturan) || {}; },
  peran(p) { return !!(this.user && this.user.peran && this.user.peran.includes(p)); },
  get isOrtu() { return this.peran('ortu'); }
};
(function muatSesi() {
  const s = LS.get('rk:sesi');
  if (s && s.token) { S.token = s.token; S.user = s.user; }
  if (S.user && !S.isOrtu) {
    S.boot = LS.get('rk:boot:' + S.user.id);
    S.periodeId = LS.get('rk:periode:' + S.user.id) || (S.boot && S.boot.periodeAktif);
  }
})();
function simpanSesi(token, user) {
  S.token = token; S.user = user;
  LS.set('rk:sesi', { token, user });
}
function keluar(pesan) {
  const uid = S.user && S.user.id;
  S.token = null; S.user = null; S.boot = null;
  LS.del('rk:sesi');
  if (uid) LS.del('rk:boot:' + uid);
  Object.keys(localStorage).filter(k => k.startsWith('rk:c:')).forEach(k => LS.del(k));
  Laci.tutup(false);
  location.hash = '#/masuk';
  if (pesan) setTimeout(() => toast(pesan, 'warn'), 50);
}

/* ---------- Indikator progres di atas layar ---------- */
const TopProg = (() => {
  let n = 0, el, t;
  const get = () => el || (el = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'topprog' })));
  return {
    start() { n++; clearTimeout(t); const e = get(); e.classList.add('on'); e.style.width = '30%'; t = setTimeout(() => { e.style.width = '70%'; }, 400); },
    done() { n = Math.max(0, n - 1); if (!n) { const e = get(); e.style.width = '100%'; clearTimeout(t); t = setTimeout(() => { e.classList.remove('on'); e.style.width = '0'; }, 250); } }
  };
})();

/* ============================================================
   LAPISAN API — fetch POST text/plain (bebas preflight CORS),
   dedupe permintaan identik, cache SWR (tampil instan dari cache
   lalu diperbarui diam-diam), batch otomatis untuk prefetch.
   ============================================================ */
const API = (() => {
  const inflight = new Map();
  const mem = new Map();
  let epoch = 0;
  const BACA = /^(boot|bukuNilai|rombelDetail|waliData|kokurikuler|leger|raporData|progres|auditLog|daftarSiswa|ortuRapor|verifikasi|infoSekolah|ping|migrasiPindai|batch)$/;

  async function post(action, data, opt = {}) {
    if (!window.CONFIG || !CONFIG.GAS_URL || /GANTI_DENGAN/.test(CONFIG.GAS_URL)) {
      const e = new Error('URL server belum diisi. Isi GAS_URL di js/config.js.'); e.code = 'CONFIG'; throw e;
    }
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), opt.timeout || 45000);
    if (!opt.silent) TopProg.start();
    try {
      const res = await fetch(CONFIG.GAS_URL, {
        method: 'POST', redirect: 'follow', signal: ctl.signal,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token: S.token, data: data || {} })
      });
      let j;
      try { j = await res.json(); } catch (e) { const x = new Error('Server mengembalikan respons tidak valid. Pastikan Web App di-deploy dengan akses "Anyone".'); x.code = 'NET'; throw x; }
      if (!j.success) {
        const e = new Error(j.message || 'Terjadi kesalahan.'); e.code = j.code;
        if (j.code === 'SESI') keluar('Sesi Anda berakhir. Silakan masuk lagi.');
        throw e;
      }
      return j.data;
    } catch (e) {
      if (e.name === 'AbortError') { const x = new Error('Koneksi terlalu lambat. Coba lagi.'); x.code = 'NET'; throw x; }
      if (!e.code) { const x = new Error(navigator.onLine === false ? 'Anda sedang offline.' : 'Tidak dapat terhubung ke server.'); x.code = 'NET'; throw x; }
      throw e;
    } finally { clearTimeout(to); if (!opt.silent) TopProg.done(); }
  }

  const kunci = (a, d) => a + '|' + JSON.stringify(d || {});
  const ck = (a, d) => 'rk:c:' + (S.user ? S.user.id : '-') + ':' + kunci(a, d);

  function cacheGet(a, d) {
    const k = ck(a, d);
    if (mem.has(k)) return mem.get(k);
    const v = LS.get(k);
    if (v) mem.set(k, v);
    return v;
  }
  function cacheSet(a, d, val) {
    const k = ck(a, d), v = { t: Date.now(), d: val };
    mem.set(k, v);
    const s = JSON.stringify(v);
    if (s.length < 400000) LS.set(k, v);
  }
  function invalidate(action) {
    const pre = 'rk:c:' + (S.user ? S.user.id : '-') + ':' + action + '|';
    [...mem.keys()].filter(k => k.startsWith(pre)).forEach(k => mem.delete(k));
    Object.keys(localStorage).filter(k => k.startsWith(pre)).forEach(k => LS.del(k));
  }

  function call(action, data, opt = {}) {
    if (!BACA.test(action)) { epoch++; return post(action, data, opt); }
    const k = epoch + '|' + kunci(action, data);
    if (inflight.has(k)) return inflight.get(k);
    const p = post(action, data, opt).then(r => { if (action !== 'batch') cacheSet(action, data, r); return r; });
    inflight.set(k, p);
    p.then(() => inflight.delete(k), () => inflight.delete(k));
    return p;
  }

  /** Stale-While-Revalidate: tampilkan cache seketika, lalu perbarui. */
  async function swr(action, data, onData, opt = {}) {
    const ttl = opt.ttl === undefined ? 20000 : opt.ttl;
    const c = cacheGet(action, data);
    if (c) onData(c.d, { stale: true });
    if (c && Date.now() - c.t < ttl) return c.d;
    try {
      const d = await call(action, data, { silent: !!c });
      if (!c || JSON.stringify(c.d) !== JSON.stringify(d)) onData(d, { stale: false });
      return d;
    } catch (e) {
      if (!c) throw e;
      if (e.code === 'NET') toast('Menampilkan data tersimpan (offline).', 'warn');
      else throw e;
      return c.d;
    }
  }

  /* Batch prefetch: beberapa prefetch dalam satu tick digabung jadi 1 permintaan. */
  let antri = [], tBatch = null;
  function prefetch(action, data) {
    const c = cacheGet(action, data);
    if (c && Date.now() - c.t < 30000) return;
    if (antri.some(x => kunci(x.action, x.data) === kunci(action, data))) return;
    antri.push({ action, data });
    clearTimeout(tBatch);
    tBatch = setTimeout(async () => {
      const calls = antri.splice(0, 10);
      if (!calls.length) return;
      if (calls.length === 1) { call(calls[0].action, calls[0].data, { silent: true }).catch(() => {}); return; }
      try {
        const res = await post('batch', { calls }, { silent: true });
        res.forEach((r, i) => { if (r.success) cacheSet(calls[i].action, calls[i].data, r.data); });
      } catch (e) { /* prefetch boleh gagal diam-diam */ }
    }, 30);
  }

  /** Kirim cadangan saat tab ditutup (tidak menunggu respons). */
  function beacon(action, data) {
    try {
      const body = JSON.stringify({ action, token: S.token, data });
      return navigator.sendBeacon && navigator.sendBeacon(CONFIG.GAS_URL, new Blob([body], { type: 'text/plain;charset=utf-8' }));
    } catch (e) { return false; }
  }
  return { call, swr, prefetch, cacheGet, cacheSet, invalidate, beacon };
})();

/* ============================================================
   ANTREAN SIMPAN OTOMATIS (optimistic UI)
   Perubahan sel ditampung, digabung per sel, dikirim tiap ~0,7 dtk.
   Bertahan saat offline/refresh (disimpan di localStorage).
   ============================================================ */
const Simpan = (() => {
  const q = new Map();
  let status = 'idle', terakhir = null, galat = '';
  const dengar = new Set();
  const PERM = ['VALIDASI', 'TERKUNCI', 'AKSES', 'DATA'];

  function emit() { dengar.forEach(f => { try { f(info()); } catch (e) {} }); }
  function info() {
    let pending = 0;
    q.forEach(it => { pending += it.changes.size + (it.sending ? it.sending.size : 0); });
    return { status, terakhir, pending, galat };
  }
  function persist() {
    const o = {};
    q.forEach((it, k) => { if (it.changes.size || it.sending) o[k] = { action: it.action, base: it.base, changes: [...it.changes.entries(), ...(it.sending ? [...it.sending.entries()] : [])] }; });
    LS.set('rk:antrian:' + (S.user ? S.user.id : '-'), o);
  }
  function item(key, action, base) {
    let it = q.get(key);
    if (!it) { it = { action, base, changes: new Map(), timer: null, busy: false, tries: 0, onSaved: null, onError: null }; q.set(key, it); }
    return it;
  }
  /** changes: array [cellKey, payload] */
  function tambah(key, action, base, changes, cb = {}) {
    const it = item(key, action, base);
    it.base = base;
    if (cb.onSaved) it.onSaved = cb.onSaved;
    if (cb.onError) it.onError = cb.onError;
    changes.forEach(([k, v]) => it.changes.set(k, v));
    persist();
    jadwal(key, cb.segera ? 0 : 700);
    if (status !== 'saving') { status = 'pending'; emit(); }
  }
  function jadwal(key, ms) {
    const it = q.get(key);
    if (!it) return;
    clearTimeout(it.timer);
    it.timer = setTimeout(() => flush(key), ms);
  }
  async function flush(key) {
    const it = q.get(key);
    if (!it || !it.changes.size) return;
    if (it.busy) { it.lagi = true; return; }
    it.busy = true;
    it.sending = it.changes;
    it.changes = new Map();
    status = 'saving'; emit();
    try {
      const r = await API.call(it.action, Object.assign({}, it.base, { changes: [...it.sending.values()] }), { silent: true });
      it.tries = 0; terakhir = new Date(); galat = '';
      it.sending = null;
      if (it.onSaved) it.onSaved(r);
      status = sisa() ? 'pending' : 'saved';
    } catch (e) {
      if (PERM.includes(e.code)) {
        galat = e.message;
        const dibuang = it.sending; it.sending = null;
        status = 'err';
        toast(e.message, 'err', 'Perubahan tidak tersimpan');
        if (it.onError) it.onError(e, dibuang);
      } else {
        // kembalikan ke antrean (perubahan lebih baru pada sel yang sama menang)
        it.sending.forEach((v, k) => { if (!it.changes.has(k)) it.changes.set(k, v); });
        it.sending = null;
        it.tries++;
        galat = e.message;
        status = navigator.onLine === false || e.code === 'NET' ? 'offline' : 'err';
        jadwal(key, Math.min(30000, 2000 * Math.pow(2, it.tries - 1)));
      }
    } finally {
      it.busy = false;
      persist(); emit();
      if (it.lagi) { it.lagi = false; if (it.changes.size) jadwal(key, 300); }
    }
  }
  function sisa() { let n = 0; q.forEach(it => { n += it.changes.size; }); return n; }
  function flushAll() { q.forEach((it, k) => { if (it.changes.size) flush(k); }); }
  function pulihkan() {
    const o = LS.get('rk:antrian:' + (S.user ? S.user.id : '-'), {});
    Object.keys(o).forEach(k => { const x = o[k]; tambah(k, x.action, x.base, x.changes); });
  }
  function hasPending(key) { const it = q.get(key); return !!(it && (it.changes.size || it.busy)); }
  /** Perubahan yang belum dikonfirmasi server (untuk ditumpuk di atas data segar). */
  function pending(key) { const it = q.get(key); return it ? [...(it.sending ? it.sending.values() : []), ...it.changes.values()] : []; }
  window.addEventListener('online', flushAll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      q.forEach(it => {
        if (it.changes.size) API.beacon(it.action, Object.assign({}, it.base, { changes: [...it.changes.values()] }));
      });
    }
  });
  window.addEventListener('beforeunload', e => { if (sisa()) { persist(); e.preventDefault(); e.returnValue = ''; } });
  return { tambah, flush, flushAll, info, on: f => { dengar.add(f); return () => dengar.delete(f); }, pulihkan, hasPending, pending };
})();

/* ---------- Toast ---------- */
/* ---------- Pengumuman pembaca layar & toast (modern-web-guidance: toast notifications, accessible errors) ---------- */
/** Satu wilayah live untuk seluruh halaman (sudah ada di index.html sejak awal); ariaNotify bila tersedia. */
const umumkan = (() => {
  let t = null;
  return teks => {
    if (!teks) return;
    if (typeof document.ariaNotify === 'function') { try { document.ariaNotify(teks); return; } catch (e) { /* lanjut ke live region */ } }
    const el = document.getElementById('pengumuman');
    if (!el) return;
    clearTimeout(t); el.textContent = '';
    t = setTimeout(() => { el.textContent = teks; }, 120);
  };
})();
const IKON_TOAST = { ok: 'check_circle', err: 'error', warn: 'warning', info: 'info' };
function wadahToast() {
  let box = $('.toasts');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toasts';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Notifikasi');
    if (Object.hasOwn(HTMLElement.prototype, 'popover')) box.setAttribute('popover', 'manual');   // lapisan teratas, tidak tertutup elemen lain
    document.body.appendChild(box);
  }
  if (box.hasAttribute('popover')) {
    try { if (box.matches(':popover-open')) box.hidePopover(); box.showPopover(); } catch (e) { /* abaikan */ }
  }
  return box;
}
function toast(msg, type = 'info', judul = '') {
  const ikon = IKON_TOAST[type] || 'info';
  // Saat jendela modal terbuka, isi di luar modal tidak bisa dijangkau → tampilkan pesan DI DALAM modal.
  const dlg = [...document.querySelectorAll('dialog.modal[open]')].pop();
  const area = dlg && $('.modal-pesan', dlg);
  if (area) {
    mount(area, html`<div class="alert ${type === 'ok' ? 'ok' : type === 'err' ? 'err' : type === 'warn' ? 'warn' : ''}">${ic(ikon)}<div>${judul ? html`<b>${judul}</b> ` : ''}${msg}</div></div>`);
    dlg._antre = { a: [msg, type, judul], t: Date.now() };   // bila dialog segera ditutup, pesan dipindah ke toast biasa
    return;
  }
  const box = wadahToast();
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  mount(el, html`${ic(ikon)}<div class="grow">${judul ? html`<b>${judul}</b>` : ''}${msg}</div>
    <button type="button" class="toast-x" aria-label="Tutup notifikasi">${ic('close', 'sm')}</button>`);
  box.appendChild(el);
  while (box.children.length > 4) box.firstElementChild.remove();
  umumkan((judul ? judul + '. ' : '') + msg);
  // galat & peringatan menetap sampai ditutup; info/ok hilang sendiri, jeda saat disorot/difokus
  const hapus = () => {
    const fokusDiSini = el.contains(document.activeElement);
    el.remove();
    if (fokusDiSini) { const lain = $('.toast-x', box); if (lain) lain.focus(); else { const v = $('#view'); if (v) v.focus({ preventScroll: true }); } }
    if (!box.children.length && box.hasAttribute('popover')) { try { box.hidePopover(); } catch (e) { /* abaikan */ } }
  };
  $('.toast-x', el).onclick = hapus;
  if (type === 'ok' || type === 'info') {
    let sisa = 4000, mulai = Date.now(), timer = setTimeout(hapus, sisa);
    const jeda = () => { clearTimeout(timer); sisa -= Date.now() - mulai; };
    const lanjut = () => { if (el.matches(':hover') || el.contains(document.activeElement)) return; mulai = Date.now(); timer = setTimeout(hapus, Math.max(1500, sisa)); };
    el.addEventListener('mouseenter', jeda); el.addEventListener('focusin', jeda);
    el.addEventListener('mouseleave', lanjut); el.addEventListener('focusout', () => setTimeout(lanjut, 0));
  }
}

/* ---------- Laci menu di HP (modern-web-guidance: navigation drawer, varian laci+sidebar) ----------
   Di layar lebar menu adalah sidebar biasa. Di HP menu menjadi laci: saat terbuka berperan sebagai dialog modal
   (aria-modal, isi lain inert, Esc menutup, fokus masuk ke laci lalu kembali ke tombol pembuka). */
const Laci = (() => {
  const mq = matchMedia('(max-width: 64em)');
  let pemicu = null;
  const luar = () => [$('.topbar'), $('#view'), $('.bottomnav')].filter(Boolean);
  const terbuka = () => document.body.classList.contains('nav-open');
  function buka(dari) {
    const side = $('.side');
    if (!side || !mq.matches) return;
    pemicu = dari || $('[data-hamb]');
    document.body.classList.add('nav-open');
    side.setAttribute('role', 'dialog'); side.setAttribute('aria-modal', 'true');
    luar().forEach(el => { el.inert = true; });
    $$('[data-hamb], .bottomnav [data-menu]').forEach(b => b.setAttribute('aria-expanded', 'true'));
    const f = $('.side a.nav.on') || $('.side [data-tutup-nav]');
    requestAnimationFrame(() => { if (f) f.focus(); });
  }
  function tutup(kembali = true) {
    const ada = terbuka(), side = $('.side');
    document.body.classList.remove('nav-open');
    if (side) { side.removeAttribute('role'); side.removeAttribute('aria-modal'); }
    luar().forEach(el => { el.inert = false; });
    $$('[data-hamb], .bottomnav [data-menu]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    if (ada && kembali && pemicu && pemicu.isConnected) pemicu.focus();
    pemicu = null;
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && terbuka() && !document.querySelector('dialog[open]')) { e.preventDefault(); tutup(); }
  });
  mq.addEventListener('change', () => { if (!mq.matches) tutup(false); });
  return { buka, tutup, terbuka, alih: dari => (terbuka() ? tutup() : buka(dari)) };
})();

/* ---------- Modal: <dialog> bawaan browser (modern-web-guidance: ui-components/dialog) ----------
   showModal() memberi lapisan teratas, halaman di belakang tidak bisa disentuh (inert), fokus terkunci
   di dalam dialog, Esc/gestur kembali menutup, dan fokus kembali ke tombol pembuka secara otomatis. */
let _nModal = 0;
function modal({ judul, isi, aksi = [], lebar = '', onBuka, tutupLuar, fokusAman = false }) {
  return new Promise(resolve => {
    const id = 'mdl-' + (++_nModal);
    const dlg = document.createElement('dialog');
    dlg.className = ('modal ' + lebar).trim();
    dlg.setAttribute('aria-labelledby', id + '-j');
    const tombol = aksi.map((a, i) => html`<button class="btn ${a.kelas || ''}" data-i="${i}" type="button">${a.ikon ? ic(a.ikon, 'sm') : ''}${a.label}</button>`);
    mount(dlg, html`<div class="modal-h"><h2 class="modal-j" id="${id}-j">${judul}</h2><button class="btn icon sm ghost" type="button" data-x aria-label="Tutup">${ic('close', 'sm')}</button></div>
      <div class="modal-b">${isi}<div class="modal-pesan" role="status"></div></div>
      ${aksi.length ? html`<div class="modal-f">${tombol}</div>` : ''}`);
    document.body.appendChild(dlg);
    let hasil = null, selesai = false;
    const akhiri = () => {
      if (selesai) return; selesai = true;
      const q = dlg._antre; dlg.remove(); resolve(hasil);
      // dialog selesai lewat tombol aksi (bukan dibatalkan) → pesan terakhir dipindah ke toast agar tetap terbaca
      if (q && hasil !== null && Date.now() - q.t < 2500) setTimeout(() => toast(...q.a), 0);
    };
    const tutup = v => { hasil = v; if (dlg.open) dlg.close(); else akhiri(); };
    dlg.addEventListener('close', akhiri);
    // Tutup dengan ketuk di luar kotak hanya untuk dialog TANPA isian (isian tidak hilang karena salah ketuk).
    const adaIsian = !!dlg.querySelector('.modal-b input:not([type=hidden]), .modal-b select, .modal-b textarea');
    if (tutupLuar === undefined ? !adaIsian : tutupLuar) {
      if ('closedBy' in HTMLDialogElement.prototype) dlg.setAttribute('closedby', 'any');
      else {   // cadangan: tekan & lepas di luar kotak dialog
        const diLuar = e => { const r = dlg.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
        let turun = false;
        dlg.addEventListener('pointerdown', e => { turun = e.target === dlg && diLuar(e); });
        dlg.addEventListener('pointerup', e => { if (turun && e.target === dlg && diLuar(e)) tutup(null); turun = false; });
      }
    }
    dlg.addEventListener('click', async e => {
      if (e.target.closest('[data-x]')) return tutup(null);
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const a = aksi[+b.dataset.i];
      if (a.onClick) {
        b.classList.add('busy');
        try { const v = await a.onClick(dlg); if (v !== false) tutup(v === undefined ? a.nilai : v); }
        catch (err) { toast(err.message, 'err'); }
        finally { b.classList.remove('busy'); }
      } else tutup(a.nilai === undefined ? true : a.nilai);
    });
    // Fokus awal: isian pertama; untuk konfirmasi berbahaya → tombol aman (Batal); selain itu tombol utama.
    const isian = [...dlg.querySelectorAll('.modal-b input:not([type=hidden]):not([disabled]), .modal-b select:not([disabled]), .modal-b textarea:not([disabled])')]
      .find(el => !el.closest('[hidden]'));
    const tb = $$('.modal-f [data-i]', dlg);
    const awal = dlg.querySelector('.modal-b [autofocus]') || isian || (fokusAman ? tb[0] : tb[tb.length - 1]) || $('[data-x]', dlg);
    if (awal) awal.setAttribute('autofocus', '');
    dlg.showModal();
    if (onBuka) onBuka(dlg);
  });
}
function konfirmasi(judul, pesan, label = 'Ya, lanjutkan', kelas = 'primary') {
  return modal({ judul, isi: html`<p>${pesan}</p>`, fokusAman: kelas === 'danger',
    aksi: [{ label: 'Batal', kelas: 'ghost', nilai: false }, { label, kelas, nilai: true }] });
}
/** Galat formulir yang dapat diakses (modern-web-guidance: accessible form errors):
    isian salah ditandai aria-invalid + aria-describedby ke pesan, fokus pindah ke isian salah pertama
    (pembaca layar membacakan pesannya). Tanpa isian → pesan diumumkan lewat wilayah live. */
function galatForm(f, pesan, salah = []) {
  const err = $('[data-err]', f);
  if (!err.id) err.id = 'err-' + Math.random().toString(36).slice(2, 8);
  err.textContent = pesan || '';
  $$('[aria-invalid="true"]', f).forEach(i => {
    i.setAttribute('aria-invalid', 'false');
    const d = (i.getAttribute('aria-describedby') || '').split(/\s+/).filter(x => x && x !== err.id);
    if (d.length) i.setAttribute('aria-describedby', d.join(' ')); else i.removeAttribute('aria-describedby');
  });
  if (!pesan) return;
  salah.filter(Boolean).forEach(i => {
    i.setAttribute('aria-invalid', 'true');
    const d = (i.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!d.includes(err.id)) i.setAttribute('aria-describedby', d.concat(err.id).join(' '));
  });
  if (salah[0]) salah[0].focus(); else umumkan(pesan);
}
/** Tombol tampilkan/sembunyikan sandi: label & status ikut berubah. */
function ikatLihatSandi(btn, input) {
  btn.setAttribute('aria-pressed', 'false');
  btn.onclick = () => {
    const tampil = input.type === 'password';
    input.type = tampil ? 'text' : 'password';
    btn.setAttribute('aria-pressed', tampil ? 'true' : 'false');
    const i = $('.ic', btn); if (i) i.textContent = tampil ? 'visibility_off' : 'visibility';
  };
}
function nilaiForm(root) {
  const o = {};
  $$('[name]', root).forEach(el => {
    if (el.type === 'checkbox') { if (el.dataset.multi) { (o[el.name] = o[el.name] || []); if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.checked; }
    else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else o[el.name] = el.value;
  });
  return o;
}
function skeleton(n = 4) { return html`<div class="card pad">${Array.from({ length: n }, (_, i) => html`<div class="skel line" style="width:${90 - i * 12}%"></div>`)}</div>`; }
function kosong(ikon, judul, teks, tombol = '') {
  return html`<div class="empty">${ic(ikon)}<h3>${judul}</h3><p>${teks}</p>${tombol}</div>`;
}
function badgeStatus(st) {
  const m = {
    draft: ['Draf', ''], revisi: ['Perlu Perbaikan', 'err'], diajukan: ['Menunggu Persetujuan', 'info'],
    disetujui: ['Disetujui', 'ok'], terkunci: ['Terkunci', 'ok']
  }[st || 'draft'] || [st, ''];
  return html`<span class="badge ${m[1]}">${st === 'terkunci' ? ic('lock', 'sm') : html`<span class="dot"></span>`}${m[0]}</span>`;
}

/* ============================================================
   ROUTER (hash) + kerangka aplikasi
   ============================================================ */
const R = { routes: [], seq: 0, cur: null };
function route(pola, def) {
  const keys = [];
  const re = new RegExp('^' + pola.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  R.routes.push(Object.assign({ pola, re, keys }, def));
}
function go(path) { if (location.hash !== '#' + path) location.hash = '#' + path; else render(); }
function hashInfo() {
  const h = decodeURIComponent(location.hash.slice(1)) || '/';
  const [p, qs] = h.split('?');
  const q = {};
  (qs || '').split('&').filter(Boolean).forEach(x => { const [k, v] = x.split('='); q[k] = v || ''; });
  return { path: p || '/', q };
}
async function render() {
  const { path, q } = hashInfo();
  let def = null, params = {};
  for (const r of R.routes) {
    const m = path.match(r.re);
    if (m) { def = r; r.keys.forEach((k, i) => { params[k] = m[i + 1]; }); break; }
  }
  if (!def) def = R.routes.find(r => r.pola === '/404');
  const seq = ++R.seq;
  const alive = () => seq === R.seq;
  if (def.auth === 'staf' && (!S.token || S.isOrtu)) return go('/masuk');
  if (def.auth === 'ortu' && (!S.token || !S.isOrtu)) return go('/ortu');
  if (def.peran && !def.peran.some(p => S.peran(p))) { toast('Menu ini bukan untuk peran Anda.', 'warn'); return go('/beranda'); }
  const dariLaci = Laci.terbuka();
  Laci.tutup(false);
  document.title = (def.judul ? def.judul + ' · ' : '') + 'RaporKilat SD';
  R.cur = def;
  let view;
  if (def.shell) { view = Shell.pastikan(); Shell.aktif(def.menu || path); }
  else { Shell.lepas(); view = $('#app'); }
  // elemen tampilan baru tiap render → listener halaman lama tidak ikut terbawa
  const segar = view.cloneNode(false); view.replaceWith(segar); view = segar;
  window.scrollTo(0, 0);
  if (dariLaci) view.focus({ preventScroll: true });   // pindah halaman dari laci → fokus ke konten baru
  try { await def.render(view, Object.assign(params, { q, alive })); }
  catch (e) {
    if (!alive()) return;
    console.error(e);
    // tanpa onclick="" di HTML: CSP (script-src 'self') memblokir penangan event inline
    mount(view, kosong('cloud_off', 'Gagal memuat halaman', e.message, html`<button class="btn primary" type="button" data-coba>${ic('refresh', 'sm')}Coba lagi</button>`));
    const b = $('[data-coba]', view); if (b) b.onclick = () => render();
  }
}
window.addEventListener('hashchange', render);

/* ---------- Boot data (sekali per sesi, disimpan untuk muat instan) ---------- */
async function muatBoot(paksa) {
  if (S.boot && !paksa) {
    API.call('boot', {}, { silent: true }).then(b => terapkanBoot(b)).catch(() => {});
    return S.boot;
  }
  const b = await API.call('boot', {});
  terapkanBoot(b);
  return b;
}
function terapkanBoot(b) {
  const berubah = JSON.stringify(b) !== JSON.stringify(S.boot);
  S.boot = b;
  LS.set('rk:boot:' + S.user.id, b);
  if (!S.periodeId || !b.periode.some(p => p.id === S.periodeId)) S.periodeId = b.periodeAktif;
  if (berubah && $('.side')) Shell.menu();
  Shell.konteks();
  if (!terapkanBoot.hangat) { terapkanBoot.hangat = true; setTimeout(hangatkan, 1500); }
}
/** Setelah masuk: ambil data halaman yang paling sering dibuka dalam SATU permintaan batch,
 *  sehingga kunjungan pertama ke menu tersebut pun langsung tampil. */
function hangatkan() {
  if (!S.boot || !S.token || S.isOrtu || document.visibilityState === 'hidden') return;
  try {
    if (B.mrSaya().length) { mrAktif(); Prefetch.untuk('/nilai'); }
    if (B.rombelWali().length && (B.isWali() || S.peran('operator'))) { rombelAktif(); Prefetch.untuk('/kelas'); Prefetch.untuk('/rapor'); }
    Prefetch.untuk('/beranda');
  } catch (e) { /* pemanasan boleh gagal diam-diam */ }
}
function setPeriode(id) {
  S.periodeId = id;
  LS.set('rk:periode:' + S.user.id, id);
  Shell.konteks();
  render();
}

/* ---------- Helper data dari boot ---------- */
const B = {
  mapel: id => (S.boot.mapel.find(m => m.id === id) || {}),
  rombel: id => (S.boot.rombel.find(r => r.id === id) || {}),
  user: id => (S.boot.pengguna.find(u => u.id === id) || {}),
  mr: id => (S.boot.mapelRombel.find(m => m.id === id) || null),
  periode: () => (S.boot.periode.find(p => p.id === S.periodeId) || {}),
  periodeLabel(p) { p = p || B.periode(); return p.tahun_ajaran ? 'TA ' + p.tahun_ajaran + ' · Semester ' + p.semester + (Number(p.semester) === 1 ? ' (Ganjil)' : ' (Genap)') : 'Periode belum dibuat'; },
  rombelTA() { const p = B.periode(); return S.boot.rombel.filter(r => !p.tahun_ajaran || r.tahun_ajaran === p.tahun_ajaran).sort((a, b) => (Number(a.tingkat) - Number(b.tingkat)) || String(a.nama).localeCompare(String(b.nama), 'id', { numeric: true })); },
  /** Mapel-rombel yang saya ampu (atau semua untuk operator/kepsek). */
  mrSaya() {
    const me = S.user.id, admin = S.peran('operator') || S.peran('kepsek');
    const ids = B.rombelTA().map(r => r.id);
    return S.boot.mapelRombel.filter(m => ids.includes(m.rombel_id) && isTrue(B.mapel(m.mapel_id).aktif) &&
      !(B.mapel(m.mapel_id).kelompok === 'agama' && m.jumlah === 0) &&
      (admin || m.guru_id === me || (!m.guru_id && B.rombel(m.rombel_id).wali_id === me)));
  },
  bisaTulisMr(m) { const me = S.user.id; return S.peran('operator') || m.guru_id === me || (!m.guru_id && B.rombel(m.rombel_id).wali_id === me); },
  rombelWali() { return B.rombelTA().filter(r => S.peran('operator') || S.peran('kepsek') || r.wali_id === S.user.id); },
  isWali() { return B.rombelTA().some(r => r.wali_id === S.user.id); },
  status(rid, jenis) { const s = (S.boot.status || []).find(x => x.rombel_id === rid && x.periode_id === S.periodeId && x.jenis === jenis); return s ? s.status : 'draft'; }
};

/* ---------- Kerangka (topbar + sidebar) ---------- */
/** Kepala sekolah yang tidak mengajar & bukan wali kelas: hanya memantau (P3.6). */
function hanyaPantau() { return !!S.user && S.peran('kepsek') && !S.peran('guru') && !S.peran('operator') && !(S.boot && B.isWali()); }

const Shell = (() => {
  let ada = false, lepasSimpan = null;
  function menuDef() {
    const m = [];
    m.push({ grp: 'Utama', items: [['/beranda', 'dashboard', 'Ringkasan & Progres']] });
    const punyaMr = S.boot && B.mrSaya().length;
    // P3.6: kepala sekolah (tanpa tugas mengajar) cukup memantau — menu baca saja, tanpa menu input
    if (hanyaPantau()) m.push({ grp: 'Pantau Nilai', items: [
      ['/nilai', 'grid_on', 'Nilai TP & LM (lihat)'], ['/sumatif', 'fact_check', 'Sumatif & NA (lihat)'], ['/deskripsi', 'description', 'Capaian & Deskripsi (lihat)']] });
    else if (punyaMr || S.peran('guru')) m.push({ grp: 'Penilaian Merdeka', items: [
      ['/tp', 'checklist', 'Lingkup Materi & TP'], ['/nilai', 'grid_on', 'Grid Nilai TP & LM'],
      ['/sumatif', 'fact_check', 'Nilai Sumatif (STS/SAS)'], ['/deskripsi', 'description', 'Capaian & Deskripsi']] });
    if (S.boot && (B.isWali() || S.peran('operator'))) m.push({ grp: 'Wali Kelas', items: [
      ['/kelas', 'groups', 'Absensi, Ekskul & Catatan'], ['/kokurikuler', 'diversity_3', 'Kokurikuler 8 Dimensi'],
      ['/rapor', 'assignment_turned_in', 'Leger & Rapor']] });
    if (S.peran('kepsek') || S.peran('operator')) {
      const n = (S.boot && S.boot.status || []).filter(s => s.periode_id === S.periodeId && s.status === 'diajukan').length;
      m.push({ grp: S.peran('kepsek') ? 'Kepala Sekolah' : 'Pemantauan', items: [
        ['/persetujuan', 'verified', 'Review & Persetujuan', n], ['/monitoring', 'monitoring', 'Monitoring Guru & Kelas']] });
    }
    if (S.peran('operator')) m.push({ grp: 'Administrasi', items: [
      ['/sekolah', 'apartment', 'Profil, Periode & Predikat'], ['/pengguna', 'badge', 'Pengguna & Peran'],
      ['/siswa', 'school', 'Data Siswa'], ['/rombel', 'meeting_room', 'Rombel & Pengampu'],
      ['/mapel', 'menu_book', 'Mapel & Ekskul'], ['/kunci', 'lock_clock', 'Status & Kunci Rapor'],
      ['/migrasi', 'move_up', 'Migrasi dari Excel/Sheets']] });
    if (S.peran('operator') || S.peran('kepsek')) m[m.length - 1].items.push(['/audit', 'history', 'Audit Log']);
    return m;
  }
  /** P3.9: 4 menu tersering per peran untuk navigasi bawah di HP (+ tombol "Menu" untuk sisanya). */
  function menuBawah() {
    if (S.peran('operator')) return [['/beranda', 'dashboard', 'Beranda'], ['/siswa', 'school', 'Siswa'], ['/rombel', 'meeting_room', 'Rombel'], ['/kunci', 'lock_clock', 'Kunci']];
    if (hanyaPantau()) return [['/beranda', 'dashboard', 'Beranda'], ['/persetujuan', 'verified', 'Setujui'], ['/monitoring', 'monitoring', 'Pantau'], ['/nilai', 'grid_on', 'Nilai']];
    const wali = S.boot && B.isWali();
    return wali ? [['/beranda', 'dashboard', 'Beranda'], ['/nilai', 'grid_on', 'Nilai'], ['/kelas', 'groups', 'Kelas'], ['/rapor', 'assignment_turned_in', 'Rapor']]
      : [['/beranda', 'dashboard', 'Beranda'], ['/tp', 'checklist', 'TP'], ['/nilai', 'grid_on', 'Nilai'], ['/sumatif', 'fact_check', 'Sumatif']];
  }
  function pastikan() {
    if (!ada) {
      mount($('#app'), html`
        <header class="topbar">
          <button class="hamb" type="button" aria-label="Buka menu" aria-expanded="false" aria-controls="menu-utama" data-hamb>${ic('menu')}</button>
          <a class="brand" href="#/beranda"><span class="logo">${ic('auto_stories')}</span><span class="hide-m">RaporKilat SD</span></a>
          <button class="ctx" data-ctx title="Ganti tahun ajaran/semester">${ic('apartment', 'sm')}<span><b data-ctx-sek></b><small data-ctx-per></small></span>${ic('unfold_more', 'sm')}</button>
          <span class="sp"></span>
          <span class="savechip" data-save title="Status simpan otomatis"><span class="dot"></span><span class="lbl-t" data-save-t>Siap</span></span>
          <button class="userbtn" data-user aria-label="Menu akun"><span class="u-txt"><div class="u-n" data-u-n></div><div class="u-r" data-u-r></div></span><span class="av" data-u-av></span></button>
        </header>
        <aside class="side" id="menu-utama" aria-label="Menu utama"></aside>
        <div class="scrim" data-scrim></div>
        <main class="main" id="view" tabindex="-1"></main>
        <nav class="bottomnav" aria-label="Navigasi cepat"></nav>`);
      ada = true;
      $('[data-hamb]').onclick = e => Laci.alih(e.currentTarget);
      $('[data-scrim]').onclick = () => Laci.tutup();
      $('.side').addEventListener('click', e => { if (e.target.closest('[data-tutup-nav]')) Laci.tutup(); });
      $('[data-ctx]').onclick = pilihPeriode;
      $('[data-user]').onclick = menuAkun;
      $('.bottomnav').onclick = e => { const b = e.target.closest('[data-menu]'); if (b) Laci.alih(b); };
      lepasSimpan = Simpan.on(chipSimpan);
      chipSimpan(Simpan.info());
      menu(); konteks();
    }
    return $('#view');
  }
  function lepas() {
    if (ada) { ada = false; if (lepasSimpan) lepasSimpan(); }
  }
  function menu() {
    const side = $('.side');
    if (!side || !S.boot) return;
    const def = menuDef();
    const p = B.periode();
    // P3.7: kelompok menu bisa dilipat; pilihan diingat per pengguna. Kelompok yang berisi halaman aktif selalu terbuka.
    const tutup = menuTertutup(), kini = R.cur && (R.cur.menu || hashInfo().path);
    mount(side, html`<div class="side-top"><b>Menu</b><button class="btn icon sm ghost" type="button" data-tutup-nav aria-label="Tutup menu">${ic('close', 'sm')}</button></div>
      ${def.map(g => { const buka = g.grp === 'Utama' || !tutup.includes(g.grp) || g.items.some(it => it[0] === kini);
      return html`<details class="grp-d" data-grp="${g.grp}" ${buka ? raw('open') : ''}><summary class="grp">${g.grp}${ic('expand_more', 'sm chev')}</summary>${g.items.map(([href, ikon, label, cnt]) =>
      html`<a class="nav" href="#${href}" data-nav="${href}">${ic(ikon)}<span>${label}</span>${cnt ? html`<span class="cnt">${cnt}</span>` : ''}</a>`)}</details>`; })}
      <div class="foot"><div class="lbl">Periode aktif</div><div class="small bold mt-8">${B.periodeLabel(p)}</div>
      <div class="xs muted mt-8">v${APP_VERSI} · <a href="#/panduan">Panduan</a></div></div>`);
    $$('details.grp-d', side).forEach(d => d.addEventListener('toggle', () => {
      const t = menuTertutup().filter(x => x !== d.dataset.grp);
      if (!d.open) t.push(d.dataset.grp);
      LS.set('rk:menuTutup:' + S.user.id, t);
    }));
    const bn = $('.bottomnav');
    if (bn) mount(bn, html`${menuBawah().map(([href, ikon, label]) => html`<a href="#${href}" data-nav="${href}">${ic(ikon)}<span>${label}</span></a>`)}
      <button type="button" data-menu aria-label="Semua menu" aria-expanded="false" aria-controls="menu-utama">${ic('menu')}<span>Menu</span></button>`);
    aktif(R.cur && (R.cur.menu || hashInfo().path));
    // prefetch saat kursor mendekati menu (navigasi terasa instan)
    $$('a.nav', side).forEach(a => a.addEventListener('pointerenter', () => Prefetch.untuk(a.dataset.nav), { once: true }));
  }
  function aktif(path) {
    $$('.side a.nav, .bottomnav a').forEach(a => { const on = a.dataset.nav === path; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.body.classList.toggle('pantau', hanyaPantau());   // P3.6: sembunyikan tanda simpan untuk kepala sekolah
    const on = $('.side a.nav.on'), d = on && on.closest('details');
    if (d && !d.open) d.open = true;
  }
  function menuTertutup() {
    const t = LS.get('rk:menuTutup:' + (S.user && S.user.id));
    if (Array.isArray(t)) return t;
    // bawaan: operator yang tidak mengajar/bukan wali → kelompok penilaian & wali kelas dilipat
    return S.peran('operator') && !S.peran('guru') && !(S.boot && B.isWali()) ? ['Penilaian Merdeka', 'Wali Kelas'] : [];
  }
  function konteks() {
    if (!ada || !S.boot) return;
    const set = (s, v) => { const e = $(s); if (e) e.textContent = v; };
    set('[data-ctx-sek]', S.pengaturan.nama_sekolah || 'Sekolah');
    set('[data-ctx-per]', B.periodeLabel());
    set('[data-u-n]', S.user.nama);
    set('[data-u-r]', (S.user.peran || []).map(p => ({ operator: 'Operator', guru: 'Guru', kepsek: 'Kepala Sekolah' }[p] || p)).join(' · ') + (B.isWali() ? ' · Wali Kelas' : ''));
    set('[data-u-av]', initials(S.user.nama));
  }
  function chipSimpan(i) {
    const el = $('[data-save]'), t = $('[data-save-t]');
    if (!el) return;
    el.className = 'savechip' + ({ saving: ' saving', pending: ' saving', err: ' err', offline: ' off' }[i.status] || '');
    t.textContent = i.status === 'saving' ? 'Menyimpan…' : i.status === 'pending' ? i.pending + ' perubahan menunggu'
      : i.status === 'offline' ? 'Offline · ' + i.pending + ' menunggu' : i.status === 'err' ? 'Gagal menyimpan'
      : i.terakhir ? 'Tersimpan ' + jamID(i.terakhir) : 'Semua perubahan tersimpan';
    el.title = i.galat || 'Simpan otomatis aktif';
  }
  async function pilihPeriode() {
    const ps = sortBy(S.boot.periode, p => p.tahun_ajaran + p.semester).reverse();
    const v = await modal({ judul: 'Pilih Tahun Ajaran & Semester', isi: html`<div class="col">${ps.map(p => html`
      <label class="card pad row" style="cursor:pointer"><input type="radio" name="pr" value="${p.id}" ${p.id === S.periodeId ? raw('checked') : ''}>
      <span class="grow"><b>${B.periodeLabel(p)}</b></span>${isTrue(p.aktif) ? html`<span class="badge ok">Aktif</span>` : ''}</label>`)}</div>`,
      aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Gunakan', kelas: 'primary', onClick: bg => { const r = $('input[name=pr]:checked', bg); return r ? r.value : null; } }] });
    if (v && v !== S.periodeId) setPeriode(v);
  }
  async function menuAkun() {
    const v = await modal({ judul: S.user.nama, isi: html`<div class="col">
      <div class="small muted">${S.user.email || ''}</div>
      <button class="btn ghost" data-a="sandi">${ic('key', 'sm')}Ganti kata sandi</button>
      <button class="btn ghost" data-a="segar">${ic('sync', 'sm')}Muat ulang data dari server</button>
      <button class="btn danger" data-a="keluar">${ic('logout', 'sm')}Keluar</button></div>`,
      onBuka: bg => $$('[data-a]', bg).forEach(b => b.onclick = () => { bg.querySelector('[data-x]').click(); setTimeout(() => aksiAkun(b.dataset.a), 50); }) });
    return v;
  }
  async function aksiAkun(a, wajib) {
    if (a === 'keluar') { if (Simpan.info().pending && !await konfirmasi('Masih ada perubahan', 'Ada perubahan yang belum terkirim. Tetap keluar?', 'Keluar', 'danger')) return; keluar(); }
    if (a === 'segar') { Object.keys(localStorage).filter(k => k.startsWith('rk:c:')).forEach(k => LS.del(k)); await muatBoot(true); toast('Data diperbarui dari server.', 'ok'); render(); }
    if (a === 'sandi') {
      await modal({ judul: 'Ganti Kata Sandi', isi: html`<div class="col">
        ${wajib ? html`<div class="alert warn">${ic('key')}<div>Anda masih memakai <b>sandi awal dari operator</b>. Ganti sekarang agar akun hanya bisa dibuka oleh Anda. Pesan ini muncul setiap masuk sampai sandi diganti.</div></div>` : ''}
        <div class="field"><label>Kata sandi lama</label><input class="input" type="password" name="lama" autocomplete="current-password"></div>
        <div class="field"><label>Kata sandi baru (min. 8 karakter)</label><input class="input" type="password" name="baru" autocomplete="new-password"></div></div>`,
        aksi: [{ label: wajib ? 'Nanti saja' : 'Batal', kelas: 'ghost' }, { label: 'Simpan', kelas: 'primary', onClick: async bg => {
          const f = nilaiForm(bg); const r = await API.call('gantiSandi', f); simpanSesi(r.token, S.user); toast('Kata sandi diganti.', 'ok'); } }] });
    }
  }
  return { pastikan, lepas, menu, aktif, konteks, gantiSandi: wajib => aksiAkun('sandi', wajib) };
})();

/* ---------- Prefetch data halaman saat menu disentuh ---------- */
const Prefetch = {
  untuk(path) {
    if (!S.boot || !S.periodeId) return;
    const pid = S.periodeId;
    const mr = S.ctx.mr && B.mr(S.ctx.mr);
    const rb = S.ctx.rombel;
    if (/\/(nilai|sumatif|deskripsi|tp)$/.test(path) && mr) API.prefetch('bukuNilai', { mr_id: mr.id, periode_id: pid });
    if (path === '/kelas' && rb) API.prefetch('waliData', { rombel_id: rb, periode_id: pid });
    if (path === '/kokurikuler' && rb) API.prefetch('kokurikuler', { rombel_id: rb, periode_id: pid });
    if (path === '/rapor' && rb) API.prefetch('leger', { rombel_id: rb, periode_id: pid, jenis: 'SAS' });
    if (['/beranda', '/persetujuan', '/monitoring', '/kunci'].includes(path)) API.prefetch('progres', { periode_id: pid });
  }
};

/* ---------- Pemilih konteks (rombel / mapel) yang dipakai banyak halaman ---------- */
function pilihanMr(daftar, terpilih) {
  const grup = {};
  daftar.forEach(m => { const rb = B.rombel(m.rombel_id); (grup[rb.nama] = grup[rb.nama] || []).push(m); });
  return html`${Object.keys(grup).sort().map(k => html`<optgroup label="Kelas ${k}">${sortBy(grup[k], m => Number(B.mapel(m.mapel_id).urutan) || 99).map(m =>
    html`<option value="${m.id}" ${m.id === terpilih ? raw('selected') : ''}>${B.mapel(m.mapel_id).nama}</option>`)}</optgroup>`)}`;
}
function mrAktif() {
  const daftar = B.mrSaya();
  let id = S.ctx.mr;
  // P3.5: wali kelas boleh MELIHAT mapel guru lain di kelasnya (dibuka dari daftar kekurangan leger)
  const m0 = id && !daftar.some(m => m.id === id) ? B.mr(id) : null;
  if (m0 && m0.id && B.rombel(m0.rombel_id).wali_id === S.user.id) return { daftar: daftar.concat([m0]), mr: m0 };
  if (!daftar.some(m => m.id === id)) {
    // P3.1: pilihan awal = mapel non-agama pertama (mapel agama sering belum diisi); pilihan berikutnya diingat
    const utama = daftar.find(m => B.mapel(m.mapel_id).kelompok !== 'agama') || daftar[0];
    id = utama && utama.id; S.ctx.mr = id; S.simpanCtx();
  }
  return { daftar, mr: id ? B.mr(id) : null };
}
function rombelAktif() {
  const daftar = B.rombelWali();
  let id = S.ctx.rombel;
  if (!daftar.some(r => r.id === id)) { id = daftar[0] && daftar[0].id; S.ctx.rombel = id; S.simpanCtx(); }
  return { daftar, rombel: id ? B.rombel(id) : null };
}
function pilihanRombel(daftar, id) {
  return html`${daftar.map(r => html`<option value="${r.id}" ${r.id === id ? raw('selected') : ''}>Kelas ${r.nama} (Fase ${r.fase})</option>`)}`;
}
function kepalaHalaman(crumb, judul, sub, kanan = '') {
  return html`<div class="page-h"><div><div class="crumb">${crumb}</div><h1>${judul}</h1>${sub ? html`<p>${sub}</p>` : ''}</div><div class="row wrap">${kanan}</div></div>`;
}

/* ---------- Pustaka yang dimuat saat dibutuhkan (lazy) ---------- */
const Lazy = (() => {
  const cache = {};
  return function muat(src) {
    if (cache[src]) return cache[src];
    cache[src] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = TT.url(src); s.onload = () => res(); s.onerror = () => { delete cache[src]; rej(new Error('Gagal memuat ' + src)); };
      document.head.appendChild(s);
    });
    return cache[src];
  };
})();
