/* ============================================================
   RaporKilat SD — halaman publik: beranda, masuk, portal orang
   tua (login), verifikasi QR, panduan singkat.
   ============================================================ */
'use strict';

const DIMENSI8 = ['Keimanan & Ketakwaan', 'Kewargaan', 'Penalaran Kritis', 'Kreativitas', 'Kolaborasi', 'Kemandirian', 'Kesehatan', 'Komunikasi'];

function navPublik() {
  return html`<nav class="pub-nav"><div class="in">
    <a class="brand" href="#/"><span class="logo">${ic('auto_stories')}</span>RaporKilat <span class="badge warn">SD</span></a>
    <span class="grow"></span>
    <button class="btn text hide-m" data-scroll="fitur" type="button">Fitur</button><button class="btn text hide-m" data-scroll="alur" type="button">Alur</button>
    <a class="btn ghost" href="#/ortu">${ic('family_restroom', 'sm')}<span class="hide-m">Portal Orang Tua</span></a>
    <a class="btn primary" href="#/masuk">${ic('login', 'sm')}Masuk</a></div></nav>`;
}

route('/', {
  judul: 'Rapor Digital SD Kurikulum Merdeka',
  async render(view, p) {
    if (S.token && !S.isOrtu) return go('/beranda');
    if (S.token && S.isOrtu) return go('/portal');
    mount(view, html`<div class="pub">${navPublik()}
      <section class="hero"><div class="kontainer">
        <span class="pill">${ic('bolt', 'sm')}Rapor SD Kurikulum Merdeka · Kokurikuler 8 Dimensi</span>
        <h1 class="mt-16">Satu data, semua guru mengisi bersama.<br><span>Rapor sekelas terbit sekali klik.</span></h1>
        <p class="lead">Pengganti file rapor Excel makro: guru mapel dan wali kelas mengisi nilai bersamaan dari laptop atau HP, deskripsi capaian tersusun otomatis dari TP, kepala sekolah menyetujui, lalu rapor dicetak lengkap dengan QR verifikasi.</p>
        <div class="row wrap gap-12"><a class="btn primary lg" href="#/masuk">${ic('login', 'sm')}Masuk Guru / Staf</a>
          <a class="btn ghost lg" href="#/ortu">${ic('family_restroom', 'sm')}Portal Orang Tua</a></div>
        <div class="row wrap gap-16 mt-16 small muted">
          <span class="row gap-4">${ic('cloud_done', 'sm ok-t')}Simpan otomatis</span>
          <span class="row gap-4">${ic('verified_user', 'sm ok-t')}Hak akses per peran</span>
          <span class="row gap-4">${ic('print', 'sm ok-t')}Siap cetak A4 / F4</span>
          <span class="row gap-4">${ic('install_mobile', 'sm ok-t')}Bisa dipasang di HP (PWA)</span></div>
      </div></section>
      <section class="sec" id="fitur"><div class="kontainer">
        <h2>Fitur utama</h2><p class="muted mb-12">Dirancang dari alur kerja rapor SD yang biasa dikerjakan di Excel.</p>
        <div class="feat">
          ${[['grid_on', 'Grid nilai mirip Excel', 'Navigasi panah/Enter/Tab, tempel langsung dari Excel (Ctrl+V), simpan otomatis per sel.'],
             ['auto_awesome', 'Deskripsi otomatis', 'Capaian tertinggi & terendah disusun dari teks TP dan predikat. Guru tetap bisa mengubah kalimatnya.'],
             ['diversity_3', 'Kokurikuler 8 dimensi', 'Kegiatan kokurikuler dengan capaian per dimensi profil lulusan dan narasi rapor otomatis.'],
             ['verified', 'Persetujuan & kunci', 'Wali kelas mengajukan, kepala sekolah menyetujui, nilai terkunci dan tercatat di audit log.'],
             ['qr_code_2', 'QR verifikasi', 'Setiap rapor yang disetujui punya kode unik untuk mengecek keaslian dokumen.'],
             ['family_restroom', 'Portal orang tua', 'Orang tua melihat rapor anaknya dengan NISN + PIN dan mengirim tanda terima.']]
            .map(f => html`<div class="card"><div class="fi">${ic(f[0])}</div><h3>${f[1]}</h3><p class="muted small mt-8">${f[2]}</p></div>`)}
        </div></div></section>
      <section class="sec alt" id="alur"><div class="kontainer">
        <h2>5 langkah terbit rapor</h2>
        <div class="steps mt-16">${[['Persiapan', 'Operator mengisi profil sekolah, siswa, rombel & pengampu.'], ['Perencanaan', 'Guru mengisi lingkup materi & tujuan pembelajaran.'],
          ['Penilaian', 'Guru mapel & wali kelas mengisi nilai bersamaan.'], ['Persetujuan', 'Kepala sekolah meninjau, menyetujui, lalu dikunci.'], ['Terbit', 'Cetak PDF sekelas, bagikan ke portal orang tua.']]
          .map((s, i) => html`<div class="card step"><div class="n">${i + 1}</div><h3>${s[0]}</h3><p class="small muted mt-8">${s[1]}</p></div>`)}</div>
      </div></section>
      <section class="sec"><div class="kontainer"><div class="card pad" style="background:linear-gradient(120deg,#1e3a8a,#2563eb);color:#fff;border:0">
        <span class="pill" style="background:rgba(255,255,255,.15);color:#fff">Permendikdasmen No. 13 Tahun 2025</span>
        <h2 class="mt-12" style="color:#fff">Kokurikuler 8 Dimensi Profil Lulusan</h2>
        <div class="dim8 mt-16">${DIMENSI8.map(d => html`<div>${ic('star', 'sm')} ${d}</div>`)}</div></div></div></section>
      <footer class="footer"><div class="kontainer row between wrap"><span>RaporKilat SD · Rapor digital Kurikulum Merdeka</span><span>Data tersimpan di Google Sheets milik sekolah</span></div></footer>
    </div>`);
  }
});

route('/masuk', {
  judul: 'Masuk',
  async render(view) {
    if (S.token && !S.isOrtu) return go('/beranda');
    mount(view, html`<div class="auth-wrap">
      <div class="auth-art"><a class="brand" href="#/"><span class="logo" style="background:rgba(255,255,255,.2)">${ic('auto_stories')}</span>RaporKilat SD</a>
        <div><h2>Rapor sekelas tanpa lembur.</h2><p class="mt-8">Nilai tersimpan otomatis, deskripsi tersusun sendiri, dan semua guru bekerja di data yang sama.</p></div>
        <div class="small" style="opacity:.75">Kurikulum Merdeka · Kokurikuler 8 Dimensi</div></div>
      <div class="auth-form"><form class="box col gap-16" data-f novalidate>
        <div><h1>Masuk</h1><p class="muted mt-8">Untuk operator, guru, wali kelas, dan kepala sekolah.</p></div>
        <div class="field"><label for="em">Email</label><input class="input" id="em" name="email" type="text" inputmode="email" autocomplete="username" required placeholder="nama@sekolah.sch.id"></div>
        <div class="field"><label for="pw">Kata sandi</label><div class="row"><input class="input" id="pw" name="password" type="password" autocomplete="current-password" required>
          <button class="btn icon ghost" type="button" data-lihat aria-label="Tampilkan kata sandi">${ic('visibility', 'sm')}</button></div></div>
        <div class="errmsg err-t small" data-err role="alert"></div>
        <button class="btn primary lg" type="submit">${ic('login', 'sm')}Masuk</button>
        <div class="small muted">Lupa kata sandi? Hubungi operator sekolah untuk reset.<br>Orang tua/wali? <a href="#/ortu">Masuk ke Portal Orang Tua</a></div>
      </form></div></div>`);
    const f = $('[data-f]', view);
    $('[data-lihat]', view).onclick = () => { const i = $('#pw', view); i.type = i.type === 'password' ? 'text' : 'password'; };
    f.onsubmit = async e => {
      e.preventDefault();
      const d = nilaiForm(f), err = $('[data-err]', f), btn = $('button[type=submit]', f);
      err.textContent = '';
      if (!d.email || !d.password) { err.textContent = 'Email dan kata sandi wajib diisi.'; return; }
      btn.classList.add('busy');
      try {
        const r = await API.call('login', { email: d.email.trim(), password: d.password });
        simpanSesi(r.token, r.user);
        S.periodeId = LS.get('rk:periode:' + r.user.id);
        if (r.boot) terapkanBoot(r.boot); else await muatBoot(true);
        Simpan.pulihkan();
        go('/beranda');
      } catch (ex) { err.textContent = ex.message; }
      finally { btn.classList.remove('busy'); }
    };
  }
});

route('/ortu', {
  judul: 'Portal Orang Tua',
  async render(view) {
    if (S.token && S.isOrtu) return go('/portal');
    mount(view, html`<div class="auth-wrap">
      <div class="auth-art" style="background:linear-gradient(140deg,#065f46,#047857 55%,#0ea5e9)"><a class="brand" href="#/"><span class="logo" style="background:rgba(255,255,255,.2)">${ic('family_restroom')}</span>Portal Orang Tua</a>
        <div><h2>Lihat rapor ananda kapan saja.</h2><p class="mt-8">Masuk dengan NISN dan PIN dari sekolah. Rapor tampil setelah disetujui kepala sekolah.</p></div><div></div></div>
      <div class="auth-form"><form class="box col gap-16" data-f>
        <div><h1>Portal Orang Tua</h1><p class="muted mt-8">PIN 6 digit diberikan oleh wali kelas/operator.</p></div>
        <div class="field"><label for="ns">NISN ananda</label><input class="input" id="ns" name="nisn" inputmode="numeric" maxlength="10" autocomplete="username" required></div>
        <div class="field"><label for="pn">PIN</label><input class="input" id="pn" name="pin" type="password" inputmode="numeric" maxlength="8" autocomplete="current-password" required></div>
        <div class="errmsg err-t small" data-err role="alert"></div>
        <button class="btn ok lg" type="submit">${ic('login', 'sm')}Masuk</button>
        <div class="small muted"><a href="#/masuk">Masuk sebagai guru/staf</a></div></form></div></div>`);
    const f = $('[data-f]', view);
    f.onsubmit = async e => {
      e.preventDefault();
      const d = nilaiForm(f), err = $('[data-err]', f), btn = $('button[type=submit]', f);
      err.textContent = '';
      btn.classList.add('busy');
      try {
        const r = await API.call('loginOrtu', { nisn: d.nisn.trim(), pin: d.pin.trim() });
        simpanSesi(r.token, r.user);
        go('/portal');
      } catch (ex) { err.textContent = ex.message; }
      finally { btn.classList.remove('busy'); }
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
      <p class="xs muted">Kode: ${p.kode}</p></div>`);
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
      <div class="alert mt-16">${ic('keyboard')}<div><b>Pintasan grid nilai:</b> panah/Enter/Tab pindah sel · ketik angka langsung menimpa · Delete menghapus · Ctrl+V menempel blok dari Excel · Ctrl+Z membatalkan · Esc membatalkan ketikan.</div></div>
      <p class="mt-16"><a class="btn primary" href="${S.token ? '#/beranda' : '#/masuk'}">${ic('arrow_back', 'sm')}Kembali</a></p></div></div>`);
  }
});

route('/404', {
  judul: 'Tidak ditemukan',
  render(view) {
    mount(view, html`<div class="pub">${navPublik()}<div class="kontainer">${kosong('travel_explore', 'Halaman tidak ditemukan', 'Alamat yang Anda buka tidak tersedia.', html`<a class="btn primary" href="#/">Ke beranda</a>`)}</div></div>`);
  }
});
