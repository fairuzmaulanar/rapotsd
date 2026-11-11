/* ============================================================
   RaporKilat SD — halaman operator: profil & periode, pengguna,
   siswa (impor Excel, PIN orang tua), rombel & pengampu, mapel &
   ekskul, status & kunci rapor, migrasi dari spreadsheet lama.
   ============================================================ */
'use strict';
async function segarkanBoot() { await muatBoot(true); }

/* ============================================================
   PROFIL SEKOLAH, PERIODE, PREDIKAT
   ============================================================ */
route('/sekolah', {
  judul: 'Profil, Periode & Predikat', shell: true, auth: 'staf', peran: ['operator'],
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const s = S.pengaturan;
    const f = (k, label, ph = '', tipe = 'text', cls = '') => html`<div class="field ${cls}"><label>${label}</label><input class="input" name="${k}" type="${tipe}" value="${s[k] || ''}" placeholder="${ph}"></div>`;
    mount(view, html`${kepalaHalaman('Administrasi', 'Profil Sekolah, Periode & Predikat', 'Data ini muncul di kop rapor, identitas, dan aturan deskripsi.')}
      <div class="grid2" style="align-items:start"><div class="col gap-16">
      <form class="card" data-profil><div class="card-h"><h3>${ic('apartment')}Profil sekolah (kop rapor)</h3><button class="btn sm primary" type="submit">${ic('save', 'sm')}Simpan</button></div>
        <div class="pad form-grid">${f('nama_sekolah', 'Nama sekolah', 'SD Negeri 1 …', 'text', 'span2')}${f('npsn', 'NPSN')}${f('nss', 'NSS')}${f('yayasan', 'Yayasan (swasta)')}
          ${f('alamat', 'Alamat', 'Jl. …', 'text', 'span2')}${f('desa', 'Desa/Kelurahan')}${f('kecamatan', 'Kecamatan')}${f('kota', 'Kabupaten/Kota')}${f('provinsi', 'Provinsi')}${f('kode_pos', 'Kode pos')}
          ${f('telepon', 'Telepon')}${f('email', 'Email', '', 'email')}${f('website', 'Website')}
          ${f('kepala_sekolah', 'Nama kepala sekolah', 'Lengkap dengan gelar', 'text', 'span2')}${f('nip_kepsek', 'NIP kepala sekolah')}
          ${f('pemda', 'Kop baris 1', 'PEMERINTAH KABUPATEN …', 'text', 'span2')}${f('dinas', 'Kop baris 2', 'DINAS PENDIDIKAN')}
          ${f('logo_url', 'URL logo sekolah', 'https://… (opsional)', 'url', 'span2')}${f('logo_pemda_url', 'URL logo daerah', 'https://… (opsional)', 'url')}</div></form>
      <form class="card" data-aturan><div class="card-h"><h3>${ic('tune')}Aturan rapor</h3><button class="btn sm primary" type="submit">${ic('save', 'sm')}Simpan</button></div>
        <div class="pad form-grid">
          <div class="field"><label>Awali deskripsi dengan nama</label><select class="select" name="deskripsi_nama"><option value="tidak">Tidak</option><option value="ya" ${isTrue(s.deskripsi_nama) || s.deskripsi_nama === 'ya' ? raw('selected') : ''}>Ya — "Ananda Andi …"</option></select></div>
          <div class="field"><label>Kalimat TP di bawah KKTP</label><input class="input" name="kalimat_bimbingan" value="${s.kalimat_bimbingan || 'Perlu bimbingan dalam'}"></div>
          <div class="field"><label>KKTP default mapel baru</label><input class="input" type="number" min="0" max="100" name="kktp_default" value="${s.kktp_default || 75}"></div>
          <div class="field"><label>Kertas default</label><select class="select" name="kertas">${['A4', 'F4'].map(k => html`<option ${s.kertas === k ? raw('selected') : ''}>${k}</option>`)}</select></div>
          <div class="field"><label>Ranking di leger</label><select class="select" name="tampil_ranking"><option value="tidak">Sembunyikan</option><option value="ya" ${s.tampil_ranking === 'ya' ? raw('selected') : ''}>Tampilkan</option></select></div>
          <div class="field"><label>WA operator (portal ortu)</label><input class="input" name="wa_operator" value="${s.wa_operator || ''}" placeholder="62812…"></div></div></form></div>
      <div class="col gap-16"><div class="card"><div class="card-h"><h3>${ic('event')}Tahun ajaran & semester</h3><button class="btn sm primary" data-periode-baru>${ic('add', 'sm')}Periode baru</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Tahun ajaran</th><th>Semester</th><th>Tgl rapor STS / SAS</th><th>Status</th><th></th></tr></thead>
        <tbody>${sortBy(S.boot.periode, x => x.tahun_ajaran + x.semester).reverse().map(x => html`<tr><td><b>${x.tahun_ajaran}</b></td><td>${x.semester}</td><td class="small">${tglID(x.tgl_rapor_sts) || '–'} / ${tglID(x.tgl_rapor_sas) || '–'}</td>
          <td>${isTrue(x.aktif) ? html`<span class="badge ok">Aktif</span>` : html`<span class="badge">Arsip</span>`}</td><td class="right"><button class="btn sm ghost" data-periode="${x.id}">${ic('edit', 'sm')}</button></td></tr>`)}</tbody></table></div></div>
        <div class="card"><div class="card-h"><h3>${ic('military_tech')}Predikat & kalimat deskripsi</h3><button class="btn sm primary" data-simpan-pred>${ic('save', 'sm')}Simpan</button></div>
          <div class="pad"><p class="small muted mb-12">Kalimat awal dipakai untuk menyusun deskripsi: <i>"[kalimat awal] [teks TP]"</i>.</p>
          <div class="col" data-pred>${S.boot.predikat.map(pr => barisPred(pr))}</div>
          <button class="btn sm ghost mt-12" data-tambah-pred>${ic('add', 'sm')}Tambah baris</button></div></div></div></div>`);
    function barisPred(pr = {}) {
      return html`<div class="row wrap card pad" style="box-shadow:none;border:1px solid var(--line);padding:8px" data-prow>
        <input class="input" style="width:70px" type="number" data-k="nilai_min" value="${pr.nilai_min ?? ''}" placeholder="Min" aria-label="Nilai minimum">
        <span>–</span><input class="input" style="width:70px" type="number" data-k="nilai_max" value="${pr.nilai_max ?? ''}" placeholder="Maks" aria-label="Nilai maksimum">
        <input class="input" style="width:140px" data-k="label" value="${pr.label || ''}" placeholder="Label">
        <input class="input grow" style="min-width:220px" data-k="kalimat_awal" value="${pr.kalimat_awal || ''}" placeholder="Kalimat awal">
        <button class="btn icon sm ghost" data-hapus-pred aria-label="Hapus">${ic('close', 'sm')}</button></div>`;
    }
    const simpanForm = async (e, judul) => {
      e.preventDefault();
      const b = $('button[type=submit]', e.target); b.classList.add('busy');
      try { await API.call('simpanPengaturan', nilaiForm(e.target)); await segarkanBoot(); toast(judul + ' disimpan.', 'ok'); }
      catch (ex) { toast(ex.message, 'err'); } finally { b.classList.remove('busy'); }
    };
    $('[data-profil]', view).onsubmit = e => simpanForm(e, 'Profil sekolah');
    $('[data-aturan]', view).onsubmit = e => simpanForm(e, 'Aturan rapor');
    view.addEventListener('click', async e => {
      if (e.target.closest('[data-tambah-pred]')) { $('[data-pred]', view).insertAdjacentHTML('beforeend', String(barisPred())); }
      const hp = e.target.closest('[data-hapus-pred]'); if (hp) hp.closest('[data-prow]').remove();
      const sp = e.target.closest('[data-simpan-pred]');
      if (sp) {
        const rows = $$('[data-prow]', view).map(r => { const o = {}; $$('[data-k]', r).forEach(i => { o[i.dataset.k] = i.value; }); return o; });
        sp.classList.add('busy');
        try { await API.call('simpanPredikat', { rows }); await segarkanBoot(); toast('Predikat disimpan.', 'ok'); }
        catch (ex) { toast(ex.message, 'err'); } finally { sp.classList.remove('busy'); }
      }
      const pb = e.target.closest('[data-periode],[data-periode-baru]');
      if (pb) {
        const x = S.boot.periode.find(y => y.id === pb.dataset.periode) || {};
        const v = await modal({ judul: x.id ? 'Ubah periode' : 'Periode baru', isi: html`<div class="form-grid">
          <div class="field"><label>Tahun ajaran</label><input class="input" name="tahun_ajaran" value="${x.tahun_ajaran || ''}" placeholder="2026/2027"></div>
          <div class="field"><label>Semester</label><select class="select" name="semester"><option value="1" ${x.semester == 1 ? raw('selected') : ''}>1 (Ganjil)</option><option value="2" ${x.semester == 2 ? raw('selected') : ''}>2 (Genap)</option></select></div>
          <div class="field"><label>Tempat penetapan rapor</label><input class="input" name="tempat_rapor" value="${x.tempat_rapor || S.pengaturan.kota || ''}"></div>
          <div class="field"><label>Tanggal rapor STS</label><input class="input" type="date" name="tgl_rapor_sts" value="${x.tgl_rapor_sts || ''}"></div>
          <div class="field"><label>Tanggal rapor SAS</label><input class="input" type="date" name="tgl_rapor_sas" value="${x.tgl_rapor_sas || ''}"></div>
          <label class="check"><input type="checkbox" name="aktif" ${isTrue(x.aktif) || !x.id ? raw('checked') : ''}>Jadikan periode aktif</label></div>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan', kelas: 'primary', onClick: bg => API.call('simpanPeriode', Object.assign({ id: x.id }, nilaiForm(bg))) }] });
        if (v) { await segarkanBoot(); const a = S.boot.periode.find(y => isTrue(y.aktif)); if (a) setPeriode(a.id); else render(); toast('Periode disimpan.', 'ok'); }
      }
    });
  }
});

/* ============================================================
   PENGGUNA & PERAN
   ============================================================ */
function tampilSandi(judul, email, sandi) {
  return modal({ judul, isi: html`<div class="col gap-12"><div class="alert warn">${ic('key')}<div>Catat dan berikan sandi ini kepada pengguna. <b>Sandi hanya tampil sekali.</b> Pengguna disarankan mengganti sandi setelah masuk.</div></div>
    <div class="card pad"><div class="small muted">Email</div><b>${email}</b><div class="small muted mt-8">Kata sandi</div><b class="mono" style="font-size:20px">${sandi}</b></div></div>`,
    aksi: [{ label: 'Salin', kelas: 'ghost', ikon: 'content_copy', onClick: () => { navigator.clipboard && navigator.clipboard.writeText('Email: ' + email + '\nSandi: ' + sandi); toast('Disalin.', 'ok'); return false; } }, { label: 'Selesai', kelas: 'primary' }] });
}
route('/pengguna', {
  judul: 'Pengguna & Peran', shell: true, auth: 'staf', peran: ['operator'],
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const gambar = () => {
      const rb = B.rombelTA();
      mount($('[data-isi]', view), html`<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Email</th><th>NIP</th><th>Peran</th><th>Tugas</th><th>Status</th><th></th></tr></thead>
        <tbody>${sortBy(S.boot.pengguna, u => u.nama).map(u => { const wali = rb.filter(r => r.wali_id === u.id).map(r => r.nama); const mp = S.boot.mapelRombel.filter(m => m.guru_id === u.id).length;
          return html`<tr><td><b>${u.nama}</b></td><td class="small">${u.email}</td><td class="small mono">${u.nip || '–'}</td>
          <td>${u.peran.map(x => html`<span class="badge ${x === 'operator' ? 'dark' : x === 'kepsek' ? 'pri' : ''}">${{ operator: 'Operator', guru: 'Guru', kepsek: 'Kepala sekolah' }[x] || x}</span> `)}</td>
          <td class="small">${wali.length ? 'Wali ' + wali.join(', ') : ''}${wali.length && mp ? ' · ' : ''}${mp ? mp + ' mapel' : ''}${!wali.length && !mp ? html`<span class="muted">–</span>` : ''}</td>
          <td>${u.aktif ? html`<span class="badge ok">Aktif</span>` : html`<span class="badge err">Nonaktif</span>`}</td>
          <td class="right" style="white-space:nowrap"><button class="btn sm ghost" data-edit="${u.id}">${ic('edit', 'sm')}</button><button class="btn sm ghost" data-reset="${u.id}" title="Reset sandi">${ic('lock_reset', 'sm')}</button></td></tr>`; })}</tbody></table></div></div>`);
    };
    mount(view, html`${kepalaHalaman('Administrasi', 'Pengguna & Peran', 'Satu akun boleh punya beberapa peran. Wali kelas ditetapkan di menu Rombel.', html`<button class="btn primary" data-baru>${ic('person_add', 'sm')}Tambah pengguna</button>`)}<div data-isi></div>`);
    gambar();
    view.addEventListener('click', async e => {
      const ed = e.target.closest('[data-edit],[data-baru]');
      if (ed) {
        const u = S.boot.pengguna.find(x => x.id === ed.dataset.edit) || { peran: ['guru'], aktif: true };
        const v = await modal({ judul: u.id ? 'Ubah pengguna' : 'Pengguna baru', isi: html`<div class="form-grid">
          <div class="field span2"><label>Nama lengkap & gelar</label><input class="input" name="nama" value="${u.nama || ''}"></div>
          <div class="field"><label>Email (untuk masuk)</label><input class="input" type="email" name="email" value="${u.email || ''}"></div>
          <div class="field"><label>NIP</label><input class="input" name="nip" value="${u.nip || ''}" inputmode="numeric"></div>
          <div class="field full"><label>Peran</label><div class="row wrap">${[['guru', 'Guru'], ['kepsek', 'Kepala sekolah'], ['operator', 'Operator']].map(r => html`<label class="check"><input type="checkbox" name="peran" data-multi="1" value="${r[0]}" ${u.peran.includes(r[0]) ? raw('checked') : ''}>${r[1]}</label>`)}</div></div>
          <div class="field"><label>Kata sandi ${u.id ? '(kosongkan bila tidak diganti)' : '(kosong = dibuat otomatis)'}</label><input class="input" type="password" name="password" autocomplete="new-password"></div>
          <label class="check"><input type="checkbox" name="aktif" ${u.aktif ? raw('checked') : ''}>Akun aktif</label></div>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan', kelas: 'primary', onClick: bg => API.call('simpanPengguna', Object.assign({ id: u.id }, nilaiForm(bg))) }] });
        if (v) { await segarkanBoot(); gambar(); toast('Pengguna disimpan.', 'ok'); if (v.sandiAwal) tampilSandi('Sandi awal pengguna', v.pengguna.email, v.sandiAwal); }
      }
      const rs = e.target.closest('[data-reset]');
      if (rs) {
        const u = S.boot.pengguna.find(x => x.id === rs.dataset.reset);
        if (!await konfirmasi('Reset kata sandi?', 'Sandi baru dibuat untuk ' + u.nama + ' dan sesi lamanya berakhir.', 'Reset')) return;
        try { const r = await API.call('resetSandiPengguna', { id: u.id }); tampilSandi('Sandi baru', r.email, r.sandiBaru); } catch (ex) { toast(ex.message, 'err'); }
      }
    });
  }
});

/* ============================================================
   DATA SISWA
   ============================================================ */
const KOLOM_IMPOR = [['nisn', 'NISN'], ['nis', 'NIS'], ['nama', 'Nama'], ['panggilan', 'Nama Panggilan'], ['jk', 'L/P'], ['tempat_lahir', 'Tempat Lahir'],
  ['tanggal_lahir', 'Tanggal Lahir (YYYY-MM-DD)'], ['agama', 'Agama'], ['pendidikan_sebelumnya', 'Pendidikan Sebelumnya'], ['alamat', 'Alamat'],
  ['nama_ayah', 'Nama Ayah'], ['pekerjaan_ayah', 'Pekerjaan Ayah'], ['nama_ibu', 'Nama Ibu'], ['pekerjaan_ibu', 'Pekerjaan Ibu'],
  ['nama_wali', 'Nama Wali'], ['pekerjaan_wali', 'Pekerjaan Wali'], ['alamat_wali', 'Alamat Wali'], ['telp_ortu', 'No. HP Orang Tua']];

function formSiswa(x = {}) {
  const f = (k, l, extra = '') => html`<div class="field"><label>${l}</label><input class="input" name="${k}" value="${x[k] || ''}" ${raw(extra)}></div>`;
  return html`<div class="form-grid">${f('nama', 'Nama lengkap')}${f('panggilan', 'Nama panggilan')}${f('nisn', 'NISN (10 digit)', 'inputmode="numeric" maxlength="10"')}${f('nis', 'NIS')}
    <div class="field"><label>Jenis kelamin</label><select class="select" name="jk"><option value="L" ${x.jk === 'L' ? raw('selected') : ''}>Laki-laki</option><option value="P" ${x.jk === 'P' ? raw('selected') : ''}>Perempuan</option></select></div>
    <div class="field"><label>Agama</label><select class="select" name="agama">${AGAMA.map(a => html`<option ${x.agama === a ? raw('selected') : ''}>${a}</option>`)}</select></div>
    ${f('tempat_lahir', 'Tempat lahir')}<div class="field"><label>Tanggal lahir</label><input class="input" type="date" name="tanggal_lahir" value="${String(x.tanggal_lahir || '').slice(0, 10)}"></div>
    ${f('pendidikan_sebelumnya', 'Pendidikan sebelumnya')}${f('alamat', 'Alamat')}${f('nama_ayah', 'Nama ayah')}${f('pekerjaan_ayah', 'Pekerjaan ayah')}
    ${f('nama_ibu', 'Nama ibu')}${f('pekerjaan_ibu', 'Pekerjaan ibu')}${f('nama_wali', 'Nama wali')}${f('pekerjaan_wali', 'Pekerjaan wali')}${f('alamat_wali', 'Alamat wali')}${f('telp_ortu', 'No. HP orang tua')}
    <div class="field"><label>Rombel (TA aktif)</label><select class="select" name="rombel_id"><option value="">— Tidak diubah —</option>${pilihanRombel(B.rombelTA(), x.rombel_id)}</select></div></div>`;
}
function serialKeTanggal(v) {
  if (typeof v === 'number' && v > 10000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0, 10); }
  const m = String(v || '').match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : String(v || '');
}
async function lembarPin(hasil) {
  await modal({ judul: 'PIN Portal Orang Tua', lebar: 'wide', isi: html`<div class="alert warn mb-12">${ic('key')}<div>PIN hanya tampil sekali. Cetak atau salin lalu bagikan ke orang tua. Membuat PIN baru membatalkan PIN lama.</div></div>
    <div class="print-area"><div class="grid2" data-kartu>${hasil.map(h => html`<div class="card pad" style="border:1px dashed var(--line-2);box-shadow:none;break-inside:avoid">
      <div class="xs muted">${S.pengaturan.nama_sekolah} · Portal Orang Tua</div><b>${h.nama}</b>
      <div class="row between mt-8"><span class="small">NISN <b class="mono">${h.nisn || '-'}</b></span><span class="small">PIN <b class="mono" style="font-size:18px">${h.pin}</b></span></div>
      <div class="xs muted mt-8">Buka ${location.origin + location.pathname}#/ortu</div></div>`)}</div></div>`,
    aksi: [{ label: 'Salin semua', kelas: 'ghost', ikon: 'content_copy', onClick: () => { navigator.clipboard.writeText(hasil.map(h => h.nama + '\tNISN ' + h.nisn + '\tPIN ' + h.pin).join('\n')); toast('Disalin.', 'ok'); return false; } },
      { label: 'Cetak kartu', kelas: 'ghost', ikon: 'print', onClick: () => { Cetak.cetak('A4'); return false; } }, { label: 'Selesai', kelas: 'primary' }] });
}
route('/siswa', {
  judul: 'Data Siswa', shell: true, auth: 'staf', peran: ['operator'],
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    let data = [], q = '', fKelas = '', pilih = new Set();
    mount(view, html`${kepalaHalaman('Administrasi', 'Data Siswa', 'Impor dari Excel/Dapodik, kelola biodata, dan buat PIN portal orang tua.',
      html`<button class="btn ghost" data-template>${ic('download', 'sm')}Template impor</button><button class="btn ghost" data-impor>${ic('upload_file', 'sm')}Impor Excel</button><button class="btn primary" data-baru>${ic('person_add', 'sm')}Tambah siswa</button>`)}
      <div class="card toolbar mb-12"><input class="input" style="max-width:280px" placeholder="Cari nama / NISN" data-cari>
        <select class="select" style="max-width:200px" data-kelas><option value="">Semua kelas</option><option value="-">Belum punya rombel</option>${pilihanRombel(B.rombelTA(), '')}</select>
        <span class="grow"></span><span class="small muted" data-jml></span><button class="btn sm ghost" data-pin>${ic('pin', 'sm')}Buat PIN orang tua</button></div>
      <div class="card" data-isi>${skeleton(8)}</div>`);
    const gambar = () => {
      const t = data.filter(s => (!q || (s.nama + ' ' + s.nisn + ' ' + s.nis).toLowerCase().includes(q)) && (!fKelas || (fKelas === '-' ? !s.rombel_id : s.rombel_id === fKelas)));
      $('[data-jml]', view).textContent = t.length + ' siswa' + (pilih.size ? ' · ' + pilih.size + ' dipilih' : '');
      mount($('[data-isi]', view), html`<div class="tbl-wrap" style="max-height:calc(100vh - 290px)"><table class="tbl"><thead><tr><th class="c"><input type="checkbox" data-semua aria-label="Pilih semua"></th><th>Nama</th><th>NISN / NIS</th><th class="c">L/P</th><th>Agama</th><th>Kelas</th><th>Orang tua</th><th class="c">PIN</th><th></th></tr></thead>
        <tbody>${t.slice(0, 800).map(s => html`<tr><td class="c"><input type="checkbox" data-pilih="${s.id}" ${pilih.has(s.id) ? raw('checked') : ''}></td><td><b>${s.nama}</b>${s.panggilan ? html`<div class="xs muted">${s.panggilan}</div>` : ''}</td>
          <td class="mono small">${s.nisn || '–'}<div class="xs muted">${s.nis || ''}</div></td><td class="c">${s.jk}</td><td class="small">${s.agama}</td><td>${s.kelas ? html`<span class="badge pri">${s.kelas}</span>` : html`<span class="badge warn">–</span>`}</td>
          <td class="small">${s.nama_ayah || s.nama_ibu || s.nama_wali || '–'}</td><td class="c">${s.punyaPin ? ic('check_circle', 'sm ok-t') : html`<span class="muted">–</span>`}</td>
          <td class="right"><button class="btn sm ghost" data-edit="${s.id}">${ic('edit', 'sm')}</button></td></tr>`)}</tbody></table></div>
        ${t.length > 800 ? html`<p class="small muted pad">Menampilkan 800 dari ${t.length}. Persempit dengan pencarian.</p>` : ''}${!t.length ? kosong('school', 'Belum ada siswa', 'Impor data siswa dari Excel atau tambahkan satu per satu.') : ''}`);
    };
    const muat = async () => { await API.swr('daftarSiswa', {}, d => { if (p.alive()) { data = d; gambar(); } }, { ttl: 5000 }); };
    $('[data-cari]', view).oninput = debounce(e => { q = e.target.value.toLowerCase().trim(); gambar(); }, 150);
    $('[data-kelas]', view).onchange = e => { fKelas = e.target.value; gambar(); };
    view.addEventListener('change', e => {
      if (e.target.dataset.pilih) { e.target.checked ? pilih.add(e.target.dataset.pilih) : pilih.delete(e.target.dataset.pilih); $('[data-jml]', view).textContent = pilih.size + ' dipilih'; }
      if (e.target.dataset.semua !== undefined) { $$('[data-pilih]', view).forEach(c => { c.checked = e.target.checked; e.target.checked ? pilih.add(c.dataset.pilih) : pilih.delete(c.dataset.pilih); }); }
    });
    view.addEventListener('click', async e => {
      const ed = e.target.closest('[data-edit],[data-baru]');
      if (ed) {
        const x = data.find(s => s.id === ed.dataset.edit) || { jk: 'L', agama: 'Islam' };
        const v = await modal({ judul: x.id ? 'Ubah data siswa' : 'Tambah siswa', lebar: 'wide', isi: formSiswa(x),
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan', kelas: 'primary', onClick: bg => API.call('simpanSiswa', Object.assign({ id: x.id }, nilaiForm(bg))) }] });
        if (v) { toast('Data siswa disimpan.', 'ok'); API.invalidate('daftarSiswa'); API.invalidate('rombelDetail'); muatBoot(true); muat(); }
      }
      if (e.target.closest('[data-template]')) {
        await Lazy('js/xlsx-lite.js');
        XLSXLite.unduh('Template_Impor_Siswa.xlsx', [{ nama: 'Siswa', rows: [KOLOM_IMPOR.map(k => k[1]), ['0123456789', '2301', 'Contoh Nama Siswa', 'Contoh', 'L', 'Kota', '2016-05-17', 'Islam', 'TK Harapan', 'Jl. Melati 1', 'Budi', 'Wiraswasta', 'Sari', 'Guru', '', '', '', '62812xxxx']] }]);
      }
      if (e.target.closest('[data-impor]')) imporSiswa(() => { API.invalidate('daftarSiswa'); muatBoot(true); muat(); });
      if (e.target.closest('[data-pin]')) {
        const ids = pilih.size ? [...pilih] : data.filter(s => !fKelas || s.rombel_id === fKelas).map(s => s.id);
        if (!ids.length) return toast('Pilih siswa terlebih dahulu.', 'warn');
        if (ids.length > 60) return toast('Maksimal 60 siswa sekali proses. Pilih per kelas.', 'warn');
        if (!await konfirmasi('Buat PIN orang tua?', ids.length + ' siswa akan mendapat PIN baru. PIN lama tidak berlaku lagi.', 'Buat PIN')) return;
        try { const r = await API.call('buatPinOrtu', { siswa_ids: ids }); API.invalidate('daftarSiswa'); muat(); lembarPin(r); } catch (ex) { toast(ex.message, 'err'); }
      }
    });
    await muat();
  }
});

async function imporSiswa(selesai) {
  await Lazy('js/xlsx-lite.js');
  const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.xlsx' });
  inp.onchange = async () => {
    let rows;
    try {
      const sh = (await XLSXLite.baca(inp.files[0]))[0];
      const iHead = sh.rows.findIndex(r => r.some(c => /^nama$|^nama (peserta didik|siswa|lengkap)$/i.test(String(c).trim())));
      if (iHead < 0) throw new Error('Kolom "Nama" tidak ditemukan pada baris judul.');
      const head = sh.rows[iHead].map(c => String(c).trim().toLowerCase());
      const peta = {};
      KOLOM_IMPOR.forEach(([k, l]) => {
        const cands = [l.toLowerCase(), k.replace(/_/g, ' '), k];
        const i = head.findIndex(h => cands.some(c => h === c || h.startsWith(c.split(' (')[0])));
        if (i > -1) peta[k] = i;
      });
      if (peta.jk === undefined) { const i = head.findIndex(h => /jenis kelamin|^jk$/.test(h)); if (i > -1) peta.jk = i; }
      rows = sh.rows.slice(iHead + 1).filter(r => String(r[peta.nama] || '').trim()).map(r => {
        const o = {};
        Object.keys(peta).forEach(k => { o[k] = r[peta[k]] === undefined ? '' : r[peta[k]]; });
        o.tanggal_lahir = serialKeTanggal(o.tanggal_lahir);
        if (typeof o.nisn === 'number') o.nisn = String(o.nisn).padStart(10, '0');
        return o;
      });
    } catch (ex) { return toast(ex.message, 'err', 'Gagal membaca file'); }
    if (!rows.length) return toast('Tidak ada baris siswa.', 'warn');
    const v = await modal({ judul: 'Impor ' + rows.length + ' siswa', lebar: 'wide', isi: html`<div class="col gap-12">
      <div class="field"><label>Masukkan ke rombel (opsional)</label><select class="select" name="rombel_id"><option value="">— Tanpa rombel —</option>${pilihanRombel(B.rombelTA(), S.ctx.rombel)}</select></div>
      <div class="tbl-wrap" style="max-height:260px"><table class="tbl"><thead><tr><th>Nama</th><th>NISN</th><th>L/P</th><th>Agama</th><th>Tgl lahir</th></tr></thead><tbody>${rows.slice(0, 50).map(r => html`<tr><td>${r.nama}</td><td class="mono">${r.nisn}</td><td>${r.jk}</td><td>${r.agama}</td><td>${r.tanggal_lahir}</td></tr>`)}</tbody></table></div>
      <div data-hasil></div><p class="xs muted">Impor aman diulang: siswa dicocokkan berdasarkan NISN (lalu NIS) sehingga tidak tercipta data ganda.</p></div>`,
      aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null },
        { label: 'Pindai dulu', kelas: 'ghost', ikon: 'search', onClick: async bg => { const r = await API.call('importSiswa', { rows, rombel_id: nilaiForm(bg).rombel_id, dryRun: true });
          mount($('[data-hasil]', bg), html`<div class="alert">${ic('fact_check')}<div>Akan ditambah <b>${r.inserted}</b>, diperbarui <b>${r.updated}</b>, dilewati <b>${r.skipped}</b>.${r.invalid.length ? html`<br><span class="err-t">${r.invalid.slice(0, 5).join('; ')}</span>` : ''}</div></div>`); return false; } },
        { label: 'Impor sekarang', kelas: 'primary', onClick: bg => API.call('importSiswa', { rows, rombel_id: nilaiForm(bg).rombel_id }) }] });
    if (v) { toast(`Impor selesai: ${v.inserted} baru, ${v.updated} diperbarui, ${v.skipped} dilewati.`, 'ok'); selesai(); }
  };
  inp.click();
}

/* ============================================================
   ROMBEL, ANGGOTA, PENGAMPU
   ============================================================ */
route('/rombel', {
  judul: 'Rombel & Pengampu', shell: true, auth: 'staf', peran: ['operator'],
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const per = B.periode();
    let aktif = S.ctx.rombelOp && B.rombel(S.ctx.rombelOp).id ? S.ctx.rombelOp : (B.rombelTA()[0] || {}).id, tab = S.ctx.tabRombel || 'pengampu';
    const guruOps = sel => html`<option value="">— Wali kelas (otomatis) —</option>${sortBy(S.boot.pengguna.filter(u => u.aktif), u => u.nama).map(u => html`<option value="${u.id}" ${u.id === sel ? raw('selected') : ''}>${u.nama}</option>`)}`;
    mount(view, html`${kepalaHalaman('Administrasi · TA ' + (per.tahun_ajaran || '-'), 'Rombel & Pengampu', 'Buat rombel, tetapkan wali kelas, isi anggota, lalu atur guru pengampu, KKTP, dan bobot tiap mapel.',
      html`<button class="btn ghost" data-naik>${ic('trending_up', 'sm')}Naik kelas</button><button class="btn primary" data-baru>${ic('add', 'sm')}Rombel baru</button>`)}
      <div class="split kiri"><div class="card" data-daftar></div><div data-detail></div></div>`);
    const daftar = () => {
      const rs = B.rombelTA();
      mount($('[data-daftar]', view), html`<div class="card-h"><h3>${ic('meeting_room')}Rombel (${rs.length})</h3></div>
        <div class="col gap-4 pad">${rs.map(r => html`<button class="btn ${r.id === aktif ? 'primary' : 'ghost'}" style="justify-content:space-between;width:100%" data-pilih="${r.id}">
          <span>Kelas ${r.nama} · Fase ${r.fase}</span><span class="badge ${r.id === aktif ? '' : 'pri'}">${r.jumlah}</span></button>`)}
          ${!rs.length ? html`<p class="small muted">Belum ada rombel pada TA ini.</p>` : ''}</div>`);
    };
    const detail = async () => {
      const box = $('[data-detail]', view);
      const rb = B.rombel(aktif);
      if (!rb.id) { mount(box, kosong('meeting_room', 'Belum ada rombel', 'Klik "Rombel baru" untuk membuat kelas.')); return; }
      mount(box, html`<div class="card"><div class="card-h"><div><h3>Kelas ${rb.nama} <span class="badge">Fase ${rb.fase}</span></h3><div class="small muted">Wali kelas: <b>${B.user(rb.wali_id).nama || 'belum ditetapkan'}</b></div></div>
        <div class="row"><button class="btn sm ghost" data-ubah>${ic('edit', 'sm')}Ubah</button><button class="btn sm ghost" data-hapus>${ic('delete', 'sm err-t')}</button></div></div>
        <div class="pad row" data-tab>${[['pengampu', 'Pengampu & bobot'], ['anggota', 'Anggota kelas']].map(t => html`<button class="btn sm ${tab === t[0] ? 'primary' : 'ghost'}" data-v="${t[0]}">${t[1]}</button>`)}</div>
        <div data-tabisi>${skeleton(5)}</div></div>`);
      const ti = $('[data-tabisi]', box);
      if (tab === 'pengampu') {
        const mrs = sortBy(S.boot.mapelRombel.filter(m => m.rombel_id === rb.id), m => Number(B.mapel(m.mapel_id).urutan) || 99);
        const belum = S.boot.mapel.filter(mp => isTrue(mp.aktif) && !mrs.some(m => m.mapel_id === mp.id));
        mount(ti, html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Mapel</th><th style="min-width:200px">Guru pengampu</th><th class="c">KKTP</th><th class="c">b_TP</th><th class="c">b_LM</th><th class="c">b_SAS</th><th></th></tr></thead>
          <tbody>${mrs.map(m => { const mp = B.mapel(m.mapel_id); return html`<tr data-mr="${m.id}"><td><b>${mp.nama}</b><div class="xs muted">${mp.kelompok}${mp.agama ? ' · ' + mp.agama : ''}${m.peserta ? ' · peserta terpilih' : ''}</div></td>
            <td><select class="select" data-k="guru_id">${guruOps(m.guru_id)}</select></td>
            ${['kktp', 'bobot_tp', 'bobot_lm', 'bobot_as'].map(k => html`<td class="c"><input class="input num" style="width:${k === 'kktp' ? 70 : 60}px;text-align:center" type="number" step="${k === 'kktp' ? 1 : 0.5}" min="0" data-k="${k}" value="${m[k]}"></td>`)}
            <td class="right" style="white-space:nowrap">${['seni', 'mulok'].includes(mp.kelompok) ? html`<button class="btn sm ghost" data-peserta="${m.id}" title="Atur peserta mapel pilihan">${ic('group', 'sm')}</button>` : ''}<button class="btn sm ghost" data-hapus-mr="${m.id}" title="Hapus mapel dari rombel">${ic('close', 'sm')}</button></td></tr>`; })}</tbody></table></div>
          <div class="toolbar" style="border-top:1px solid var(--line)">${belum.length ? html`<select class="select" style="max-width:260px" data-tambah-mapel><option value="">+ Tambah mapel ke rombel…</option>${belum.map(mp => html`<option value="${mp.id}">${mp.nama}</option>`)}</select>` : ''}
            <span class="grow"></span><span class="small muted" data-ket>Ubah lalu simpan</span><button class="btn primary" data-simpan-mr>${ic('save', 'sm')}Simpan pengampu</button></div>`);
      } else {
        const d = await API.call('rombelDetail', { rombel_id: rb.id });
        if (!p.alive()) return;
        mount(ti, html`<div class="toolbar"><span class="small muted">${d.anggota.length} siswa · nomor absen otomatis urut nama</span><span class="grow"></span><button class="btn primary sm" data-atur>${ic('group_add', 'sm')}Atur anggota</button></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">No</th><th>Nama</th><th>NISN</th><th class="c">L/P</th><th>Agama</th></tr></thead>
          <tbody>${d.anggota.map(a => html`<tr><td class="c">${a.no_absen}</td><td><b>${a.nama}</b></td><td class="mono small">${a.nisn || '–'}</td><td class="c">${a.jk}</td><td class="small">${a.agama}</td></tr>`)}</tbody></table></div>
          ${!d.anggota.length ? kosong('group_add', 'Belum ada anggota', 'Klik "Atur anggota" untuk memilih siswa.') : ''}`);
        $('[data-atur]', ti).onclick = async () => {
          const semua = await API.call('daftarSiswa', {});
          const kini = new Set(d.anggota.map(a => a.siswa_id));
          const calon = semua.filter(s => kini.has(s.id) || !s.rombel_id);
          const v = await modal({ judul: 'Anggota Kelas ' + rb.nama, lebar: 'wide', isi: html`<p class="small muted mb-8">Centang siswa anggota kelas ini. Hanya siswa yang belum punya rombel di TA ini yang ditampilkan.</p>
            <input class="input mb-8" placeholder="Cari…" data-q><div class="tbl-wrap" style="max-height:52vh"><table class="tbl"><tbody>${sortBy(calon, s => s.nama).map(s => html`<tr data-n="${(s.nama + ' ' + s.nisn).toLowerCase()}"><td style="width:36px"><input type="checkbox" value="${s.id}" ${kini.has(s.id) ? raw('checked') : ''}></td><td>${s.nama}</td><td class="mono small">${s.nisn || ''}</td><td>${s.jk}</td></tr>`)}</tbody></table></div>`,
            onBuka: bg => { $('[data-q]', bg).oninput = e => $$('tr[data-n]', bg).forEach(tr => { tr.style.display = tr.dataset.n.includes(e.target.value.toLowerCase()) ? '' : 'none'; }); },
            aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan anggota', kelas: 'primary', onClick: bg => API.call('setAnggota', { rombel_id: rb.id, siswa_ids: $$('input[type=checkbox]:checked', bg).map(c => c.value) }) }] });
          if (v) { toast('Anggota disimpan.', 'ok'); API.invalidate('daftarSiswa'); await segarkanBoot(); detail(); daftar(); }
        };
      }
    };
    view.addEventListener('click', async e => {
      const pl = e.target.closest('[data-pilih]'); if (pl) { aktif = pl.dataset.pilih; S.ctx.rombelOp = aktif; S.simpanCtx(); daftar(); detail(); return; }
      const tb = e.target.closest('[data-tab] button'); if (tb) { tab = tb.dataset.v; S.ctx.tabRombel = tab; S.simpanCtx(); detail(); return; }
      const ed = e.target.closest('[data-baru],[data-ubah]');
      if (ed) {
        const x = ed.dataset.ubah !== undefined ? B.rombel(aktif) : { tahun_ajaran: per.tahun_ajaran, tingkat: 1 };
        const v = await modal({ judul: x.id ? 'Ubah rombel' : 'Rombel baru', isi: html`<div class="form-grid">
          <div class="field"><label>Tingkat</label><select class="select" name="tingkat">${[1, 2, 3, 4, 5, 6].map(t => html`<option value="${t}" ${Number(x.tingkat) === t ? raw('selected') : ''}>Kelas ${t} (Fase ${t <= 2 ? 'A' : t <= 4 ? 'B' : 'C'})</option>`)}</select></div>
          <div class="field"><label>Nama rombel</label><input class="input" name="nama" value="${x.nama || ''}" placeholder="Mis. 4A atau IV-B"></div>
          <div class="field"><label>Tahun ajaran</label><input class="input" name="tahun_ajaran" value="${x.tahun_ajaran || ''}"></div>
          <div class="field"><label>Wali kelas</label><select class="select" name="wali_id"><option value="">— Pilih —</option>${sortBy(S.boot.pengguna.filter(u => u.aktif), u => u.nama).map(u => html`<option value="${u.id}" ${u.id === x.wali_id ? raw('selected') : ''}>${u.nama}</option>`)}</select></div></div>
          ${!x.id ? html`<p class="small muted mt-12">Semua mapel aktif otomatis ditambahkan ke rombel baru (guru pengampu default: wali kelas).</p>` : ''}`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan', kelas: 'primary', onClick: bg => API.call('simpanRombel', Object.assign({ id: x.id }, nilaiForm(bg))) }] });
        if (v) { aktif = v.id; S.ctx.rombelOp = aktif; S.simpanCtx(); await segarkanBoot(); daftar(); detail(); toast('Rombel disimpan.', 'ok'); }
      }
      if (e.target.closest('[data-hapus]')) {
        if (!await konfirmasi('Hapus rombel?', 'Rombel hanya bisa dihapus bila tidak memiliki anggota.', 'Hapus', 'danger')) return;
        try { await API.call('hapusRombel', { id: aktif }); aktif = null; await segarkanBoot(); aktif = (B.rombelTA()[0] || {}).id; daftar(); detail(); } catch (ex) { toast(ex.message, 'err'); }
      }
      const sm = e.target.closest('[data-simpan-mr]');
      if (sm) {
        const items = $$('[data-mr]', view).map(tr => { const m = Object.assign({}, B.mr(tr.dataset.mr)); $$('[data-k]', tr).forEach(i => { m[i.dataset.k] = i.value; }); return m; });
        sm.classList.add('busy');
        try { await API.call('simpanMapelRombel', { items }); await segarkanBoot(); toast('Pengampu, KKTP & bobot disimpan.', 'ok'); detail(); } catch (ex) { toast(ex.message, 'err'); } finally { sm.classList.remove('busy'); }
      }
      const hm = e.target.closest('[data-hapus-mr]');
      if (hm) {
        if (!await konfirmasi('Hapus mapel dari rombel?', 'Mapel tidak lagi muncul di rombel ini (nilai yang sudah diisi tetap tersimpan di arsip).', 'Hapus', 'danger')) return;
        await API.call('hapusMapelRombel', { id: hm.dataset.hapusMr }); await segarkanBoot(); detail();
      }
      const ps = e.target.closest('[data-peserta]');
      if (ps) {
        const m = B.mr(ps.dataset.peserta), d = await API.call('rombelDetail', { rombel_id: m.rombel_id });
        const kini = String(m.peserta || '').split(',').filter(Boolean);
        const v = await modal({ judul: 'Peserta ' + B.mapel(m.mapel_id).nama, isi: html`<p class="small muted mb-8">Kosongkan semua centang = seluruh siswa mengikuti mapel ini.</p><div class="col">${d.anggota.map(a => html`<label class="check"><input type="checkbox" value="${a.id}" ${kini.includes(a.id) ? raw('checked') : ''}>${a.nama}</label>`)}</div>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan', kelas: 'primary', onClick: bg => API.call('simpanMapelRombel', { items: [Object.assign({}, m, { peserta: $$('input:checked', bg).map(c => c.value) })] }) }] });
        if (v) { await segarkanBoot(); detail(); toast('Peserta disimpan.', 'ok'); }
      }
      if (e.target.closest('[data-naik]')) naikKelas();
    });
    view.addEventListener('change', async e => {
      if (e.target.dataset.tambahMapel !== undefined && e.target.value) {
        await API.call('simpanMapelRombel', { rombel_id: aktif, mapel_id: e.target.value, kktp: Number(S.pengaturan.kktp_default) || 75 });
        await segarkanBoot(); detail();
      }
      if (e.target.closest('[data-mr]')) { const k = $('[data-ket]', view); if (k) { k.textContent = 'Ada perubahan belum disimpan'; k.className = 'small warn-t bold'; } }
    });
    daftar(); detail();
  }
});

async function naikKelas() {
  const per = B.periode();
  const lama = S.boot.rombel.filter(r => r.tahun_ajaran !== per.tahun_ajaran);
  const baru = B.rombelTA();
  if (!lama.length) return toast('Belum ada rombel tahun ajaran sebelumnya.', 'warn');
  let anggota = [];
  const v = await modal({ judul: 'Naik kelas / pindah rombel', lebar: 'wide', isi: html`<div class="form-grid">
    <div class="field"><label>Dari rombel (TA lama)</label><select class="select" name="dari"><option value="">Pilih…</option>${lama.map(r => html`<option value="${r.id}">${r.tahun_ajaran} · Kelas ${r.nama}</option>`)}</select></div>
    <div class="field"><label>Ke rombel (TA ${per.tahun_ajaran})</label><select class="select" name="ke">${pilihanRombel(baru, '')}</select></div></div><div class="col mt-12" data-ang></div>`,
    onBuka: bg => { $('[name=dari]', bg).onchange = async e => { const d = await API.call('rombelDetail', { rombel_id: e.target.value }); anggota = d.anggota; mount($('[data-ang]', bg), html`<label class="check"><input type="checkbox" checked data-all>Pilih semua</label>${anggota.map(a => html`<label class="check"><input type="checkbox" checked value="${a.siswa_id}">${a.nama}</label>`)}`); $('[data-all]', bg).onchange = x => $$('[data-ang] input[value]', bg).forEach(c => { c.checked = x.target.checked; }); }; },
    aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Proses', kelas: 'primary', onClick: bg => { const f = nilaiForm(bg); return API.call('naikKelas', { dari_rombel_id: f.dari, ke_rombel_id: f.ke, siswa_ids: $$('[data-ang] input[value]:checked', bg).map(c => c.value) }); } }] });
  if (v) { toast('Siswa dipindahkan ke rombel baru.', 'ok'); await segarkanBoot(); render(); }
}

/* ============================================================
   MAPEL & EKSKUL
   ============================================================ */
route('/mapel', {
  judul: 'Mapel & Ekskul', shell: true, auth: 'staf', peran: ['operator'],
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const gambar = () => mount(view, html`${kepalaHalaman('Administrasi', 'Mata Pelajaran & Ekstrakurikuler', 'Mapel agama otomatis hanya diikuti siswa yang beragama sesuai. Seni & mulok bisa dibatasi pesertanya di menu Rombel.')}
      <div class="grid2 lebar-kiri" style="align-items:start"><div class="card"><div class="card-h"><h3>${ic('menu_book')}Mata pelajaran</h3><button class="btn sm primary" data-mapel-baru>${ic('add', 'sm')}Mapel</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">Urut</th><th>Nama</th><th>Singkatan</th><th>Kelompok</th><th>Status</th><th></th></tr></thead>
        <tbody>${sortBy(S.boot.mapel, m => (Number(m.urutan) || 99) * 100 + (m.agama ? 1 : 0)).map(m => html`<tr><td class="c">${m.urutan}</td><td><b>${m.nama}</b></td><td>${m.singkatan}</td>
          <td><span class="badge">${m.kelompok}${m.agama ? ' · ' + m.agama : ''}</span></td><td>${isTrue(m.aktif) ? html`<span class="badge ok">Aktif</span>` : html`<span class="badge">Nonaktif</span>`}</td>
          <td class="right" style="white-space:nowrap">${isTrue(m.aktif) ? html`<button class="btn sm ghost" data-sebar="${m.id}" title="Tambahkan ke semua rombel TA aktif">${ic('playlist_add', 'sm')}</button>` : ''}<button class="btn sm ghost" data-mapel="${m.id}">${ic('edit', 'sm')}</button></td></tr>`)}</tbody></table></div></div>
        <div class="card"><div class="card-h"><h3>${ic('sports_soccer')}Ekstrakurikuler</h3><button class="btn sm primary" data-ek-baru>${ic('add', 'sm')}Ekskul</button></div>
          <div class="col pad">${S.boot.ekskul.map(e => html`<div class="row card pad" style="box-shadow:none;border:1px solid var(--line);padding:8px 10px"><div class="grow"><b>${e.nama}</b> ${isTrue(e.wajib) ? html`<span class="badge pri">Wajib</span>` : ''}<div class="xs muted">${e.pembina || ''}</div></div>
            <button class="btn sm ghost" data-ek="${e.id}">${ic('edit', 'sm')}</button><button class="btn sm ghost" data-ek-hapus="${e.id}">${ic('delete', 'sm err-t')}</button></div>`)}
          ${!S.boot.ekskul.length ? html`<p class="small muted">Belum ada ekskul.</p>` : ''}</div></div></div>`);
    gambar();
    view.addEventListener('click', async e => {
      const mb = e.target.closest('[data-mapel],[data-mapel-baru]');
      if (mb) {
        const m = S.boot.mapel.find(x => x.id === mb.dataset.mapel) || { kelompok: 'umum', aktif: true, urutan: 20 };
        const v = await modal({ judul: m.id ? 'Ubah mapel' : 'Mapel baru', isi: html`<div class="form-grid"><div class="field span2"><label>Nama mapel</label><input class="input" name="nama" value="${m.nama || ''}"></div>
          <div class="field"><label>Singkatan</label><input class="input" name="singkatan" value="${m.singkatan || ''}"></div><div class="field"><label>Urutan di rapor</label><input class="input" type="number" name="urutan" value="${m.urutan}"></div>
          <div class="field"><label>Kelompok</label><select class="select" name="kelompok">${[['umum', 'Umum'], ['agama', 'Agama'], ['seni', 'Seni (pilihan)'], ['mulok', 'Muatan lokal']].map(k => html`<option value="${k[0]}" ${m.kelompok === k[0] ? raw('selected') : ''}>${k[1]}</option>`)}</select></div>
          <div class="field"><label>Agama (khusus kelompok agama)</label><select class="select" name="agama"><option value="">–</option>${AGAMA.map(a => html`<option ${m.agama === a ? raw('selected') : ''}>${a}</option>`)}</select></div>
          <label class="check"><input type="checkbox" name="aktif" ${isTrue(m.aktif) ? raw('checked') : ''}>Aktif (otomatis masuk ke rombel baru)</label></div>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan', kelas: 'primary', onClick: bg => API.call('simpanMapel', Object.assign({ id: m.id }, nilaiForm(bg))) }] });
        if (v) { await segarkanBoot(); gambar(); toast('Mapel disimpan.', 'ok'); }
      }
      const sb = e.target.closest('[data-sebar]');
      if (sb) {
        const items = B.rombelTA().filter(r => !S.boot.mapelRombel.some(m => m.rombel_id === r.id && m.mapel_id === sb.dataset.sebar))
          .map(r => ({ rombel_id: r.id, mapel_id: sb.dataset.sebar, kktp: Number(S.pengaturan.kktp_default) || 75 }));
        if (!items.length) return toast('Mapel ini sudah ada di semua rombel.', 'info');
        await API.call('simpanMapelRombel', { items }); await segarkanBoot(); toast('Ditambahkan ke ' + items.length + ' rombel.', 'ok');
      }
      const eb = e.target.closest('[data-ek],[data-ek-baru]');
      if (eb) {
        const x = S.boot.ekskul.find(y => y.id === eb.dataset.ek) || {};
        const v = await modal({ judul: x.id ? 'Ubah ekskul' : 'Ekskul baru', isi: html`<div class="col"><div class="field"><label>Nama</label><input class="input" name="nama" value="${x.nama || ''}"></div>
          <div class="field"><label>Pembina</label><input class="input" name="pembina" value="${x.pembina || ''}"></div><label class="check"><input type="checkbox" name="wajib" ${isTrue(x.wajib) ? raw('checked') : ''}>Ekskul wajib (mis. Pramuka)</label></div>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan', kelas: 'primary', onClick: bg => API.call('simpanEkskul', Object.assign({ id: x.id }, nilaiForm(bg))) }] });
        if (v) { await segarkanBoot(); gambar(); }
      }
      const eh = e.target.closest('[data-ek-hapus]');
      if (eh && await konfirmasi('Hapus ekskul?', 'Ekskul yang sudah diisi di rapor akan tampil "-".', 'Hapus', 'danger')) { await API.call('simpanEkskul', { id: eh.dataset.ekHapus, hapus: true }); await segarkanBoot(); gambar(); }
    });
  }
});

/* ============================================================
   STATUS & KUNCI RAPOR
   ============================================================ */
route('/kunci', {
  judul: 'Status & Kunci Rapor', shell: true, auth: 'staf', peran: ['operator'],
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    let jenis = S.ctx.jenisKunci === 'STS' ? 'STS' : 'SAS';
    mount(view, html`${kepalaHalaman('Administrasi', 'Status & Kunci Rapor', 'Kunci rapor yang sudah disetujui agar tidak berubah. Buka kunci hanya bila ada kesalahan, dengan alasan tertulis.',
      html`<div class="seg" data-jenis><button data-v="SAS" class="${jenis === 'SAS' ? 'on' : ''}">Akhir semester</button><button data-v="STS" class="${jenis === 'STS' ? 'on' : ''}">Tengah semester</button></div>`)}<div data-isi>${skeleton(6)}</div>`);
    $('[data-jenis]', view).onclick = e => { const b = e.target.closest('button'); if (b) { S.ctx.jenisKunci = b.dataset.v; S.simpanCtx(); render(); } };
    let d = null;
    const gambar = () => {
      const bisaKunci = d.rombel.filter(r => r.status[jenis].status === 'disetujui');
      mount($('[data-isi]', view), html`<div class="card"><div class="toolbar" style="border-bottom:1px solid var(--line)"><span class="small">${bisaKunci.length} rombel disetujui dan siap dikunci</span><span class="grow"></span>
        <button class="btn primary" data-kunci-semua ${bisaKunci.length ? '' : raw('disabled')}>${ic('lock', 'sm')}Kunci semua yang disetujui</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Rombel</th><th>Wali kelas</th><th>Status</th><th>Disetujui</th><th>Catatan</th><th></th></tr></thead>
        <tbody>${d.rombel.map(r => { const s = r.status[jenis]; return html`<tr><td><b>Kelas ${r.nama}</b></td><td>${B.user(r.wali_id).nama || '–'}</td><td>${badgeStatus(s.status)}</td>
          <td class="small">${s.disetujui_at ? jamID(s.disetujui_at) + ' · ' + (s.disetujui_by || '') : '–'}</td><td class="small muted" style="max-width:260px">${s.catatan || ''}</td>
          <td class="right">${s.status === 'disetujui' ? html`<button class="btn sm ghost" data-kunci="${r.id}">${ic('lock', 'sm')}Kunci</button>` : ''}
            ${['disetujui', 'terkunci', 'diajukan'].includes(s.status) ? html`<button class="btn sm ghost" data-buka="${r.id}" style="color:var(--err)">${ic('lock_open', 'sm')}Buka</button>` : ''}</td></tr>`; })}</tbody></table></div></div>`);
    };
    const muat = async () => { API.invalidate('progres'); d = await API.call('progres', { periode_id: S.periodeId }); if (p.alive()) gambar(); };
    view.addEventListener('click', async e => {
      const k = e.target.closest('[data-kunci],[data-kunci-semua]');
      if (k) {
        const ids = k.dataset.kunci ? [k.dataset.kunci] : d.rombel.filter(r => r.status[jenis].status === 'disetujui').map(r => r.id);
        if (!await konfirmasi('Kunci rapor?', ids.length + ' rombel akan dikunci permanen sampai dibuka operator.', 'Kunci')) return;
        const hs = await API.call('kunciRapor', { rombel_ids: ids, periode_id: S.periodeId, jenis });
        const n = hs.filter(h => h.ok).length;
        toast(n + ' rombel dikunci' + (n < hs.length ? ', ' + (hs.length - n) + ' dilewati (belum disetujui).' : '.'), n ? 'ok' : 'warn'); await muat(); muatBoot(true);
      }
      const bk = e.target.closest('[data-buka]');
      if (bk) {
        const v = await modal({ judul: 'Buka kunci rapor', isi: html`<div class="col gap-12"><div class="alert warn">${ic('warning')}<div>Rapor kembali ke status <b>perlu perbaikan</b>. Setelah diperbaiki, wali kelas harus mengajukan ulang dan kepala sekolah menyetujui ulang (kode QR lama tidak berlaku).</div></div>
          <div class="field"><label>Alasan (tercatat di audit log)</label><textarea class="textarea" name="alasan" rows="3" placeholder="Mis. Salah input nilai SAS Matematika siswa no. 5"></textarea></div></div>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Buka kunci', kelas: 'danger', onClick: bg => API.call('bukaKunciRapor', { rombel_id: bk.dataset.buka, periode_id: S.periodeId, jenis, alasan: nilaiForm(bg).alasan }) }] });
        if (v) { toast('Kunci dibuka.', 'ok'); await muat(); muatBoot(true); }
      }
    });
    await muat();
  }
});

/* ============================================================
   MIGRASI DARI EXCEL / SPREADSHEET LAMA
   ============================================================ */
route('/migrasi', {
  judul: 'Migrasi Data', shell: true, auth: 'staf', peran: ['operator'],
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    mount(view, html`${kepalaHalaman('Administrasi', 'Migrasi dari Excel / Spreadsheet Lama', 'Ambil profil sekolah & data siswa dari file rapor Excel lama tanpa mengetik ulang. File lama hanya dibaca, tidak diubah.')}
      <div class="grid2" style="align-items:start"><div class="card pad col gap-12">
        <h3 class="row">${ic('looks_one')}Siapkan file lama</h3>
        <ol class="small" style="margin:0;padding-left:18px;line-height:1.7"><li>Unggah file rapor Excel (.xlsx/.xlsm) ke Google Drive akun yang sama dengan pemilik Apps Script.</li>
          <li>Klik kanan file → <b>Buka dengan → Google Spreadsheet</b> (makro tidak ikut, data tetap).</li><li>Salin URL spreadsheet hasil konversi, tempel di bawah.</li></ol>
        <div class="field"><label>URL atau ID spreadsheet lama</label><input class="input" name="sumber" placeholder="https://docs.google.com/spreadsheets/d/…" data-sumber></div>
        <button class="btn primary" data-pindai>${ic('search', 'sm')}Pindai spreadsheet</button></div>
        <div data-hasil>${kosong('move_up', 'Belum dipindai', 'Hasil deteksi profil sekolah & tabel siswa muncul di sini.')}</div></div>`);
    let scan = null;
    view.addEventListener('click', async e => {
      const pd = e.target.closest('[data-pindai]');
      if (pd) {
        pd.classList.add('busy');
        try {
          scan = await API.call('migrasiPindai', { sumber: $('[data-sumber]', view).value });
          const pr = scan.profil;
          mount($('[data-hasil]', view), html`<div class="card pad col gap-12"><h3 class="row">${ic('looks_two')}Hasil pindai: ${scan.judul}</h3>
            <div><div class="lbl mb-8">Profil sekolah terdeteksi</div>${Object.keys(pr).length ? html`<table class="tbl"><tbody>${Object.keys(pr).map(k => html`<tr><td class="muted small">${k}</td><td>${pr[k]}</td></tr>`)}</tbody></table>` : html`<p class="small muted">Tidak ditemukan.</p>`}</div>
            <div><div class="lbl mb-8">Tabel siswa</div>${scan.siswa ? html`<div class="alert ok">${ic('table_view')}<div>Sheet <b>${scan.siswa.sheet}</b> (judul di baris ${scan.siswa.barisHeader}) · <b>${scan.siswa.jumlah} siswa</b><br><span class="xs">Kolom: ${scan.siswa.kolom.join(', ')}</span></div></div>
              <table class="tbl mt-8"><tbody>${scan.siswa.contoh.map(c => html`<tr><td>${c.nama}</td><td class="mono small">${c.nisn}</td><td>${c.jk}</td><td>${c.agama}</td></tr>`)}</tbody></table>` : html`<div class="alert warn">${ic('warning')}<span>Tabel siswa (kolom Nama + NISN/NIS) tidak ditemukan.</span></div>`}</div>
            <h3 class="row">${ic('looks_3')}Pilih yang diimpor</h3>
            <label class="check"><input type="checkbox" data-o="profil" ${Object.keys(pr).length ? raw('checked') : raw('disabled')}>Profil sekolah (hanya mengisi kolom yang masih kosong)</label>
            <label class="check"><input type="checkbox" data-o="timpaProfil">Timpa profil yang sudah terisi</label>
            <label class="check"><input type="checkbox" data-o="siswa" ${scan.siswa ? raw('checked') : raw('disabled')}>Data siswa (upsert berdasarkan NISN/NIS — aman diulang)</label>
            <div class="field"><label>Masukkan siswa ke rombel</label><select class="select" data-rb><option value="">— Tanpa rombel —</option>${pilihanRombel(B.rombelTA(), '')}</select></div>
            <div data-dry></div><div class="row"><button class="btn ghost" data-jalan="1">${ic('fact_check', 'sm')}Simulasi (dry-run)</button><button class="btn primary" data-jalan="0">${ic('play_arrow', 'sm')}Jalankan migrasi</button></div></div>`);
        } catch (ex) { toast(ex.message, 'err'); } finally { pd.classList.remove('busy'); }
      }
      const j = e.target.closest('[data-jalan]');
      if (j) {
        const o = {}; $$('[data-o]', view).forEach(c => { o[c.dataset.o] = c.checked; });
        const dry = j.dataset.jalan === '1';
        if (!dry && !await konfirmasi('Jalankan migrasi?', 'Data akan ditulis ke database aplikasi. Spreadsheet lama tidak diubah.', 'Jalankan')) return;
        j.classList.add('busy');
        try {
          const r = await API.call('migrasiJalankan', Object.assign({ sumber: $('[data-sumber]', view).value, rombel_id: $('[data-rb]', view).value, dryRun: dry }, o));
          mount($('[data-dry]', view), html`<div class="alert ${dry ? '' : 'ok'}">${ic(dry ? 'fact_check' : 'task_alt')}<div><b>${dry ? 'Simulasi' : 'Selesai'}:</b>
            ${r.profil ? html` profil diperbarui: ${r.profil.diperbarui.join(', ') || 'tidak ada'}.` : ''}
            ${r.siswa ? html` Siswa baru ${r.siswa.inserted}, diperbarui ${r.siswa.updated}, dilewati ${r.siswa.skipped}.${r.siswa.invalid.length ? ' ' + r.siswa.invalid.slice(0, 3).join('; ') : ''}` : ''}</div></div>`);
          if (!dry) { API.invalidate('daftarSiswa'); await segarkanBoot(); toast('Migrasi selesai.', 'ok'); }
        } catch (ex) { toast(ex.message, 'err'); } finally { j.classList.remove('busy'); }
      }
    });
  }
});
