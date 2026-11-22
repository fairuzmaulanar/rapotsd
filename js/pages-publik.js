/* ============================================================
   RaporKilat SD — halaman publik: portal sekolah, masuk, portal
   orang tua (login), verifikasi QR, panduan & fitur.
   ============================================================ */
'use strict';

const DIMENSI8 = ['Keimanan & Ketakwaan', 'Kewargaan', 'Penalaran Kritis', 'Kreativitas', 'Kolaborasi', 'Kemandirian', 'Kesehatan', 'Komunikasi'];

/* ---------- P2.1: identitas sekolah dari server (tampil seketika dari cache, diperbarui tiap 10 menit) ---------- */
const Sekolah = {
  dulu() { const c = API.cacheGet('infoSekolah', {}); return c ? c.d : null; },
  /** Isi semua penanda [data-sk-*] di dalam `root` dengan identitas sekolah. */
  pasang(root) {
    const terapkan = i => { if (root.isConnected) terapkanSekolah(root, i); };
    const c = Sekolah.dulu();
    if (c) terapkan(c);
    API.swr('infoSekolah', {}, terapkan, { ttl: 10 * 60e3 }).catch(() => { if (!c) terapkan(null); });
  }
};
function logoSekolah(i, besar) {
  return i && i.logo
    ? html`<img class="logo-img${besar ? ' besar' : ''}" src="${i.logo}" alt="Logo ${i.nama}" referrerpolicy="no-referrer">`
    : html`<span class="logo${besar ? ' besar' : ''}">${ic('auto_stories')}</span>`;
}
function waOperator(i, pesan) {
  return i && i.wa ? 'https://wa.me/' + i.wa + '?text=' + encodeURIComponent(pesan.replace('{sekolah}', i.nama || 'sekolah')) : '';
}
function terapkanSekolah(root, i) {
  const nama = (i && i.nama) || 'Rapor Digital Sekolah';
  $$('[data-sk-brand]', root).forEach(el => { mount(el, html`${logoSekolah(i)}<span class="brand-t"><b>${nama}</b><small>Rapor Digital</small></span>`); el.setAttribute('aria-label', nama + ' — halaman depan'); });
  $$('[data-sk-logo]', root).forEach(el => mount(el, logoSekolah(i, true)));
  $$('[data-sk-nama]', root).forEach(el => { el.textContent = nama; });
  $$('[data-sk-alamat]', root).forEach(el => { const t = i ? [i.alamat, i.kota].filter(Boolean).join(', ') : ''; el.textContent = t; el.hidden = !t; });
  $$('[data-sk-ta]', root).forEach(el => { el.textContent = (i && i.ta) || ''; el.hidden = !(i && i.ta); });
  $$('[data-sk-demo]', root).forEach(el => {
    mount(el, kotakDemo(i && i.demo, el.dataset.skDemo));
    el.hidden = !el.firstElementChild;
    el.onclick = e => { const b = e.target.closest('[data-demo]'); if (b && !b.disabled) masukDemo(b.dataset.demo, b); };
  });
  // P2.6: lupa sandi/PIN → WhatsApp operator (bila nomor WA operator diisi di pengaturan)
  $$('[data-sk-wa]', root).forEach(el => {
    const url = waOperator(i, el.dataset.skWa);
    mount(el, url
      ? html`<a class="btn ghost sm" href="${url}" target="_blank" rel="noopener">${ic('chat', 'sm')}${el.dataset.label || 'Hubungi operator via WhatsApp'}</a>`
      : html`<span>${'tanpa' in el.dataset ? el.dataset.tanpa : 'Hubungi operator sekolah.'}</span>`);
  });
}

/* ---------- Mode demo: masuk satu klik ke akun contoh (aktif bila operator menyalakannya) ---------- */
function kotakDemo(list, jenis) {
  const pilih = (list || []).filter(p => jenis === 'semua' || (jenis === 'ortu' ? p.k === 'ortu' : p.k !== 'ortu'));
  if (!pilih.length) return '';
  const judul = jenis === 'ortu' ? 'Coba portal tanpa PIN' : 'Coba aplikasi tanpa sandi';
  return html`<section class="demo-box" aria-label="${judul}">
    <div class="row between wrap gap-8"><b class="row">${ic('science', 'sm')}${judul}</b><span class="badge warn">Mode demo</span></div>
    <p class="xs muted">Data contoh fiktif. Pilih peran untuk langsung masuk.</p>
    <div class="demo-grid">${pilih.map(p => html`<button type="button" class="demo-btn${p.k === 'ortu' ? ' ortu' : ''}" data-demo="${p.k}">
      <span class="ic" aria-hidden="true">${p.ikon || 'person'}</span><span class="t"><b>${p.label}</b><small>${p.nama}</small><small class="ket">${p.ket}</small></span></button>`)}</div>
    ${jenis === 'semua' ? '' : html`<div class="demo-atau"><span>atau masuk dengan ${jenis === 'ortu' ? 'NISN & PIN' : 'akun'}</span></div>`}</section>`;
}
async function masukDemo(k, btn) {
  btn.classList.add('busy');
  $$('[data-demo]').forEach(b => { b.disabled = true; });
  try {
    const r = await API.call('loginDemo', { k });
    simpanSesi(r.token, r.user);
    if (k === 'ortu') return go('/portal');
    S.periodeId = LS.get('rk:periode:' + r.user.id);
    if (r.boot) terapkanBoot(r.boot); else await muatBoot(true);
    Simpan.pulihkan();
    go('/beranda');
    toast('Anda masuk sebagai ' + r.user.nama + ' (mode demo).', 'info');
  } catch (ex) { toast(ex.message, 'err'); }
  finally { btn.classList.remove('busy'); $$('[data-demo]').forEach(b => { b.disabled = false; }); }
}

function navPublik() {
  // P2.4 + P2.5: tombol Orang Tua berlabel di HP; tombol Fitur/Alur dihapus (bagiannya pindah ke Panduan)
  return html`<nav class="pub-nav"><div class="in">
    <a class="brand" href="#/" data-sk-brand>${logoSekolah(Sekolah.dulu())}<span class="brand-t"><b>${(Sekolah.dulu() || {}).nama || 'Rapor Digital Sekolah'}</b><small>Rapor Digital</small></span></a>
    <span class="grow"></span>
    <a class="btn ghost" href="#/ortu" aria-label="Portal Orang Tua">${ic('family_restroom', 'sm')}Orang Tua</a>
    <a class="btn primary" href="#/masuk">${ic('login', 'sm')}Masuk</a></div></nav>`;
}

/* ---------- P2.3: cek keaslian rapor dengan mengetik kode (tanpa scan QR) ---------- */
function formCekKode(nilai = '') {
  return html`<form class="row gap-8 cek-kode" data-cek novalidate>
    <label class="sr-only" for="kode-rapor">Kode verifikasi rapor</label>
    <input class="input mono" id="kode-rapor" name="kode" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Kode di bawah QR rapor" value="${nilai}">
    <button class="btn primary" type="submit">${ic('search', 'sm')}Cek</button></form>`;
}
function ikatCekKode(root) {
  $$('[data-cek]', root).forEach(f => {
    f.onsubmit = e => {
      e.preventDefault();
      const k = f.kode.value.replace(/[^0-9a-z]/gi, '').toUpperCase();
      if (k.length < 6) { toast('Ketik kode verifikasi yang tercetak di bawah QR rapor.', 'warn'); f.kode.focus(); return; }
      go('/v/' + k);
    };
  });
}

/* ---------- P2.2: halaman depan = portal sekolah ---------- */
route('/', {
  judul: 'Rapor Digital Sekolah',
  async render(view, p) {
    if (S.token && !S.isOrtu) return go('/beranda');
    if (S.token && S.isOrtu) return go('/portal');
    const i = Sekolah.dulu();
    mount(view, html`<div class="pub">${navPublik()}
      <section class="portal-sk"><div class="kontainer">
        <div class="id"><span data-sk-logo>${logoSekolah(i, true)}</span>
          <div><span class="pill" data-sk-ta ${i && i.ta ? '' : raw('hidden')}>${(i && i.ta) || ''}</span>
            <h1 class="mt-8" data-sk-nama>${(i && i.nama) || 'Rapor Digital Sekolah'}</h1>
            <p class="muted mt-4" data-sk-alamat ${i && (i.alamat || i.kota) ? '' : raw('hidden')}>${i ? [i.alamat, i.kota].filter(Boolean).join(', ') : ''}</p></div></div>
        <p class="lead">Layanan rapor digital Kurikulum Merdeka. Guru mengisi nilai dari laptop atau HP, kepala sekolah menyetujui, dan orang tua melihat rapor ananda secara langsung.</p>
        <div class="pintu">
          <div class="card"><div class="fi">${ic('co_present')}</div><h2>Guru & Staf</h2>
            <p class="muted">Isi nilai, susun rapor, ajukan, dan setujui rapor.</p>
            <a class="btn primary lg" href="#/masuk">${ic('login', 'sm')}Masuk Guru / Staf</a></div>
          <div class="card"><div class="fi ok">${ic('family_restroom')}</div><h2>Orang Tua / Wali</h2>
            <p class="muted">Lihat rapor ananda dengan NISN dan PIN dari sekolah.</p>
            <a class="btn ok lg" href="#/ortu">${ic('visibility', 'sm')}Buka Portal Orang Tua</a></div>
          <div class="card"><div class="fi warn">${ic('qr_code_scanner')}</div><h2>Cek Keaslian Rapor</h2>
            <p class="muted">Scan QR pada rapor, atau ketik kode yang tercetak di bawahnya.</p>
            ${formCekKode()}</div>
        </div>
        <div class="mt-16" data-sk-demo="semua" hidden></div>
        <div class="row wrap gap-12 mt-16 small">
          <a href="#/panduan">${ic('menu_book', 'sm')} Panduan & fitur aplikasi</a>
          <span data-sk-wa="Halo operator {sekolah}, saya ingin bertanya tentang rapor digital." data-label="Hubungi operator via WhatsApp" data-tanpa=""></span></div>
      </div></section>
      <footer class="footer"><div class="kontainer row between wrap gap-8"><span><span data-sk-nama>${(i && i.nama) || 'Rapor Digital Sekolah'}</span> · Rapor digital Kurikulum Merdeka</span><span>Data tersimpan di Google Sheets milik sekolah</span></div></footer>
    </div>`);
    ikatCekKode(view);
    Sekolah.pasang(view);
  }
});

route('/masuk', {
  judul: 'Masuk',
  async render(view) {
    if (S.token && !S.isOrtu) return go('/beranda');
    mount(view, html`<div class="auth-wrap">
      <div class="auth-art"><a class="brand" href="#/" data-sk-brand></a>
        <div><h2>Rapor sekelas tanpa lembur.</h2><p class="mt-8">Nilai tersimpan otomatis, deskripsi tersusun sendiri, dan semua guru bekerja di data yang sama.</p></div>
        <div class="small" style="opacity:.75" data-sk-ta></div></div>
      <div class="auth-form"><form class="box col gap-16" data-f novalidate>
        <a class="sk-kepala" href="#/"><span data-sk-logo></span><span><b data-sk-nama></b><small data-sk-ta></small></span></a>
        <div><h1>Masuk</h1><p class="muted mt-8">Untuk operator, guru, wali kelas, dan kepala sekolah.</p></div>
        <div data-sk-demo="staf" hidden></div>
        <div class="field"><label for="em">Email</label><input class="input" id="em" name="email" type="email" autocomplete="username" required
          spellcheck="false" autocapitalize="none" enterkeyhint="next" aria-invalid="false" placeholder="nama@sekolah.sch.id"></div>
        <div class="field"><label for="pw">Kata sandi</label><div class="row"><input class="input" id="pw" name="password" type="password" autocomplete="current-password" required
          spellcheck="false" autocapitalize="none" enterkeyhint="go" aria-invalid="false">
          <button class="btn icon ghost" type="button" data-lihat aria-label="Tampilkan kata sandi" aria-controls="pw">${ic('visibility', 'sm')}</button></div></div>
        <div class="errmsg err-t small" data-err id="err-masuk"></div>
        <button class="btn primary lg" type="submit">${ic('login', 'sm')}Masuk</button>
        <div class="col gap-8 small muted"><span>Lupa kata sandi? Operator sekolah dapat meresetnya.</span>
          <span data-sk-wa="Halo operator {sekolah}, saya lupa kata sandi Rapor Digital. Nama saya: " data-label="Minta reset sandi via WhatsApp" data-tanpa=""></span>
          <span>Orang tua/wali? <a href="#/ortu">Masuk ke Portal Orang Tua</a></span></div>
      </form></div></div>`);
    Sekolah.pasang(view);
    const f = $('[data-f]', view);
    ikatLihatSandi($('[data-lihat]', view), $('#pw', view));
    const em = $('#em', view), pw = $('#pw', view);
    f.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') galatForm(f, ''); });
    f.onsubmit = async e => {
      e.preventDefault();
      const d = nilaiForm(f), btn = $('button[type=submit]', f);
      galatForm(f, '');
      const kosongE = !d.email.trim(), kosongP = !d.password;
      if (kosongE || kosongP) return galatForm(f, kosongE && kosongP ? 'Email dan kata sandi wajib diisi.' : kosongE ? 'Email wajib diisi.' : 'Kata sandi wajib diisi.', [kosongE && em, kosongP && pw]);
      if (!em.checkValidity()) return galatForm(f, 'Format email belum benar, contoh: nama@sekolah.sch.id', [em]);
      btn.classList.add('busy');
      const lambat = setTimeout(() => toast('Menghubungkan ke server sekolah… pertama kali bisa sampai 10 detik.', 'info'), 3000);
      try {
        const r = await API.call('login', { email: d.email.trim(), password: d.password });
        simpanSesi(r.token, r.user);
        S.periodeId = LS.get('rk:periode:' + r.user.id);
        if (r.boot) terapkanBoot(r.boot); else await muatBoot(true);
        Simpan.pulihkan();
        go('/beranda');
        // P1.4: sandi awal dari operator wajib diganti
        if (r.wajibGanti) setTimeout(() => { toast('Demi keamanan, ganti sandi awal Anda sekarang.', 'warn'); Shell.gantiSandi(true); }, 400);
      } catch (ex) { galatForm(f, ex.message, /sandi|email|akun|pengguna/i.test(ex.message) ? [pw] : []); }
      finally { clearTimeout(lambat); btn.classList.remove('busy'); }
    };
  }
});

route('/ortu', {
  judul: 'Portal Orang Tua',
  async render(view) {
    if (S.token && S.isOrtu) return go('/portal');
    mount(view, html`<div class="auth-wrap">
      <div class="auth-art" style="background:linear-gradient(140deg,#065f46,#047857 55%,#0ea5e9)"><a class="brand" href="#/" data-sk-brand></a>
        <div><h2>Lihat rapor ananda kapan saja.</h2><p class="mt-8">Masuk dengan NISN dan PIN dari sekolah. Rapor tampil setelah disetujui kepala sekolah.</p></div><div class="small" style="opacity:.75" data-sk-ta></div></div>
      <div class="auth-form"><form class="box col gap-16" data-f novalidate>
        <a class="sk-kepala" href="#/"><span data-sk-logo></span><span><b data-sk-nama></b><small data-sk-ta></small></span></a>
        <div><h1>Portal Orang Tua</h1><p class="muted mt-8">PIN 6 digit diberikan oleh wali kelas/operator.</p></div>
        <div data-sk-demo="ortu" hidden></div>
        <div class="field"><label for="ns">NISN ananda</label><input class="input" id="ns" name="nisn" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="10" autocomplete="username" required
          spellcheck="false" enterkeyhint="next" aria-invalid="false" aria-describedby="ns-h"><small class="xs muted" id="ns-h">10 digit angka, ada di kartu pelajar/rapor.</small></div>
        <div class="field"><label for="pn">PIN</label><div class="row"><input class="input" id="pn" name="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="current-password" required
          spellcheck="false" enterkeyhint="go" aria-invalid="false">
          <button class="btn icon ghost" type="button" data-lihat aria-label="Tampilkan PIN" aria-controls="pn">${ic('visibility', 'sm')}</button></div></div>
        <div class="errmsg err-t small" data-err id="err-ortu"></div>
        <button class="btn ok lg" type="submit">${ic('login', 'sm')}Masuk</button>
        <div class="col gap-8 small muted"><span>Belum punya PIN atau lupa PIN? Minta ke wali kelas atau operator sekolah.</span>
          <span data-sk-wa="Halo operator {sekolah}, saya orang tua siswa dan lupa PIN Portal Orang Tua. Nama ananda: , kelas: " data-label="Minta PIN via WhatsApp" data-tanpa=""></span>
          <span><a href="#/masuk">Masuk sebagai guru/staf</a></span></div></form></div></div>`);
    Sekolah.pasang(view);
    const f = $('[data-f]', view), ns = $('#ns', view), pn = $('#pn', view);
    ikatLihatSandi($('[data-lihat]', view), pn);
    f.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') galatForm(f, ''); });
    f.onsubmit = async e => {
      e.preventDefault();
      const d = nilaiForm(f), btn = $('button[type=submit]', f);
      galatForm(f, '');
      d.nisn = d.nisn.replace(/\s+/g, ''); d.pin = d.pin.trim();
      if (!d.nisn || !d.pin) return galatForm(f, !d.nisn && !d.pin ? 'NISN dan PIN wajib diisi.' : !d.nisn ? 'NISN wajib diisi.' : 'PIN wajib diisi.', [!d.nisn && ns, !d.pin && pn]);
      if (!/^\d+$/.test(d.nisn)) return galatForm(f, 'NISN hanya berisi angka.', [ns]);
      btn.classList.add('busy');
      const lambat = setTimeout(() => toast('Menghubungkan ke server sekolah… pertama kali bisa sampai 10 detik.', 'info'), 3000);
      try {
        const r = await API.call('loginOrtu', { nisn: d.nisn, pin: d.pin });
        simpanSesi(r.token, r.user);
        go('/portal');
      } catch (ex) { galatForm(f, ex.message, /pin|nisn/i.test(ex.message) ? [pn] : []); }
      finally { clearTimeout(lambat); btn.classList.remove('busy'); }
    };
  }
});

route('/v/:kode', {
  judul: 'Verifikasi Rapor',
  async render(view, p) {
    mount(view, html`<div class="pub">${navPublik()}<div class="kontainer" style="max-width:640px;padding-top:40px">${skeleton(5)}</div></div>`);
    let r;
    try { r = await API.call('verifikasi', { kode: p.kode }); }
    catch (e) { r = { valid: false, pesan: e.message }; }
    if (!p.alive()) return;
    mount($('.kontainer', view), html`<div class="card pad col gap-12" style="text-align:center">
      <div style="margin:0 auto;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:${r.valid ? 'var(--ok-50)' : 'var(--err-50)'}">${ic(r.valid ? 'verified' : 'gpp_bad', 'xl ' + (r.valid ? 'ok-t' : 'err-t'))}</div>
      <h1>${r.valid ? 'Rapor Terverifikasi' : 'Tidak Terverifikasi'}</h1><p class="muted">${r.pesan}</p>
      ${r.nama ? html`<table class="tbl" style="text-align:left"><tbody>
        <tr><td class="muted">Sekolah</td><td><b>${r.sekolah}</b></td></tr><tr><td class="muted">Nama</td><td><b>${r.nama}</b></td></tr>
        <tr><td class="muted">Kelas</td><td>${r.kelas}</td></tr><tr><td class="muted">Rapor</td><td>${r.jenis} · ${r.periode}</td></tr>
        <tr><td class="muted">Rata-rata</td><td>${r.rata}</td></tr><tr><td class="muted">Diterbitkan</td><td>${tglID(String(r.diterbitkan).slice(0, 10))}</td></tr>
        <tr><td class="muted">Sidik digital</td><td class="mono small">${r.hash}…</td></tr></tbody></table>` : ''}
      <p class="xs muted">Kode: ${p.kode}</p>
      <div class="col gap-8" style="text-align:left"><span class="small muted">Cek kode lain:</span>${formCekKode()}</div></div>`);
    ikatCekKode(view);
    Sekolah.pasang(view);
  }
});

route('/panduan', {
  judul: 'Panduan Singkat',
  render(view) {
    const langkah = [
      ['Operator', 'Isi profil sekolah & periode → tambah pengguna (guru, kepala sekolah) → impor siswa → buat rombel & pilih wali kelas → atur pengampu, KKTP, dan bobot per mapel.'],
      ['Guru mapel', 'Buka "Lingkup Materi & TP", isi LM dan TP tiap mapel → isi nilai di "Grid Nilai TP & LM" (bisa tempel dari Excel) → isi STS/SAS di "Nilai Sumatif" → cek kalimat di "Capaian & Deskripsi".'],
      ['Wali kelas', 'Isi absensi, ekskul, catatan, dan kenaikan → isi kokurikuler 8 dimensi → buka "Leger & Rapor", periksa, lalu ajukan ke kepala sekolah.'],
      ['Kepala sekolah', 'Buka "Review & Persetujuan" → periksa kelengkapan & contoh rapor → setujui (konfirmasi kata sandi) atau kembalikan dengan catatan.'],
      ['Setelah disetujui', 'Wali kelas mencetak rapor sekelas (Simpan sebagai PDF di dialog cetak) → operator membuat PIN orang tua → orang tua melihat rapor di portal.']];
    mount(view, html`<div class="pub">${navPublik()}<div class="kontainer" style="max-width:820px;padding:32px 20px">
      <h1>Panduan Singkat</h1><p class="muted mt-8">Urutan kerja satu semester.</p>
      <div class="col gap-12 mt-16">${langkah.map((l, i) => html`<div class="card pad row" style="align-items:flex-start"><div class="step" style="padding:0"><div class="n">${i + 1}</div></div><div><h3>${l[0]}</h3><p class="muted mt-8">${l[1]}</p></div></div>`)}</div>
      <h2 class="mt-24" id="fitur">Fitur aplikasi</h2>
      <div class="feat mt-12">
        ${[['grid_on', 'Grid nilai mirip Excel', 'Navigasi panah/Enter/Tab, tempel langsung dari Excel (Ctrl+V), simpan otomatis per sel.'],
           ['auto_awesome', 'Deskripsi otomatis', 'Capaian tertinggi & terendah disusun dari teks TP dan predikat. Guru tetap bisa mengubah kalimatnya.'],
           ['diversity_3', 'Kokurikuler 8 dimensi', 'Capaian per dimensi profil lulusan (Permendikdasmen No. 13 Tahun 2025) dan narasi rapor otomatis.'],
           ['verified', 'Persetujuan & kunci', 'Wali kelas mengajukan, kepala sekolah menyetujui, nilai terkunci dan tercatat di audit log.'],
           ['qr_code_2', 'QR verifikasi', 'Setiap rapor yang disetujui punya kode unik untuk mengecek keaslian dokumen.'],
           ['family_restroom', 'Portal orang tua', 'Orang tua melihat rapor anaknya dengan NISN + PIN dan mengirim tanda terima.']]
          .map(f => html`<div class="card"><div class="fi">${ic(f[0])}</div><h3>${f[1]}</h3><p class="muted small mt-8">${f[2]}</p></div>`)}
      </div>
      <p class="small muted mt-12">8 dimensi profil lulusan: ${DIMENSI8.join(' · ')}.</p>
      <div class="alert mt-16">${ic('keyboard')}<div><b>Pintasan grid nilai:</b> panah/Enter/Tab pindah sel · ketik angka langsung menimpa · Delete menghapus · Ctrl+V menempel blok dari Excel · Ctrl+Z membatalkan · Esc membatalkan ketikan.</div></div>
      <p class="mt-16"><a class="btn primary" href="${S.token ? '#/beranda' : '#/'}">${ic('arrow_back', 'sm')}Kembali</a></p></div></div>`);
    Sekolah.pasang(view);
  }
});

route('/404', {
  judul: 'Tidak ditemukan',
  render(view) {
    mount(view, html`<div class="pub">${navPublik()}<div class="kontainer">${kosong('travel_explore', 'Halaman tidak ditemukan', 'Alamat yang Anda buka tidak tersedia.', html`<a class="btn primary" href="#/">Ke beranda</a>`)}</div></div>`);
    Sekolah.pasang(view);
  }
});
