/* ============================================================
   RaporKilat SD — cetak.js
   Penyusun lembar rapor (A4/F4), leger, QR verifikasi, & cetak.
   "Unduh PDF" memakai dialog cetak browser → Simpan sebagai PDF,
   sehingga hasilnya identik dengan cetakan kertas.
   ============================================================ */
'use strict';

const Cetak = (() => {
  const ANGKA = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam'];
  const ROMAWI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

  function urlVerifikasi(kode) {
    return location.origin + location.pathname.replace(/index\.html$/, '') + '#/v/' + kode;
  }
  function kop(s, opsi) {
    if (opsi.kop === 'kosong') return html`<div style="height:30mm"></div>`;
    const alamat = [s.alamat, s.desa, s.kecamatan ? 'Kec. ' + s.kecamatan : '', s.kota, s.provinsi, s.kode_pos].filter(Boolean).join(', ');
    const kontak = [s.telepon ? 'Telp. ' + s.telepon : '', s.email, s.website].filter(Boolean).join(' · ');
    return html`<div class="kop">${s.logo_pemda_url && opsi.kop !== 'tanpaLogoDaerah' ? html`<img src="${s.logo_pemda_url}" alt="">` : html`<span style="width:64px"></span>`}
      <div class="kt">${s.pemda ? html`<div class="l1">${s.pemda}</div>` : ''}${s.dinas ? html`<div class="l1">${s.dinas}</div>` : ''}
        <div class="l2">${s.nama_sekolah}</div><div class="l3">${alamat}</div>${kontak ? html`<div class="l3">${kontak}</div>` : ''}</div>
      ${s.logo_url ? html`<img src="${s.logo_url}" alt="">` : html`<span style="width:64px"></span>`}</div>`;
  }
  function draf(st) {
    return st && ['disetujui', 'terkunci'].includes(st.status) ? '' :
      html`<div style="position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;overflow:hidden"><div style="font:bold 90pt Arial;color:rgba(200,0,0,.08);transform:rotate(-35deg)">DRAF</div></div>`;
  }
  function identitas(d, r) {
    const s = d.sekolah, rb = d.rombel, per = d.periode;
    const smt = Number(per.semester) === 1 ? '1 (Satu) / Ganjil' : '2 (Dua) / Genap';
    const baris = (k, v) => html`<div><span>${k}</span><span>:</span><b>${v}</b></div>`;
    return html`<div class="rp-id">
      ${baris('Nama Peserta Didik', String(r.siswa.nama || '').toUpperCase())}${baris('Kelas', rb.nama + (rb.tingkat ? ' (' + (ANGKA[rb.tingkat] || '') + ')' : ''))}
      ${baris('NISN / NIS', (r.siswa.nisn || '-') + ' / ' + (r.siswa.nis || '-'))}${baris('Fase', rb.fase)}
      ${baris('Nama Sekolah', s.nama_sekolah)}${baris('Semester', smt)}
      ${baris('Alamat Sekolah', s.alamat || '-')}${baris('Tahun Pelajaran', per.tahun_ajaran)}</div>`;
  }
  function ttd(d, r, opsi) {
    const tempat = d.periode.tempat_rapor || d.sekolah.kota || '';
    const tgl = d.tanggal ? tglID(d.tanggal) : '...................... ';
    const setuju = d.status && ['disetujui', 'terkunci'].includes(d.status.status);
    return html`<div class="rp-ttd">
      <div><div>Mengetahui,<br>Orang Tua/Wali</div><div class="sp"></div><div>( ................................ )</div></div>
      <div><div><br>Kepala Sekolah</div><div class="sp" style="display:grid;place-items:center">${setuju && opsi.tandaDigital ? html`<span style="font:italic 8pt Arial;color:#1d4ed8;border:1px solid #1d4ed8;padding:2px 6px;border-radius:4px">Disetujui melalui RaporKilat</span>` : ''}</div>
        <div><b><u>${d.kepsek.nama || '................................'}</u></b><br>NIP. ${d.kepsek.nip || '-'}</div></div>
      <div><div>${tempat}, ${tgl}<br>Wali Kelas</div><div class="sp"></div><div><b><u>${d.wali.nama || '................................'}</u></b><br>NIP. ${d.wali.nip || '-'}</div></div></div>`;
  }
  function verif(d, r, opsi) {
    if (!opsi.qr || !r.kode) return '';
    return html`<div class="rp-verif"><span data-qr="${urlVerifikasi(r.kode)}"></span>
      <div><b>Verifikasi keaslian rapor</b><br>Pindai kode QR atau buka ${urlVerifikasi(r.kode)}<br>Kode: <b>${r.kode}</b> · Sidik: ${String(r.hash || '').slice(0, 16)}</div></div>`;
  }
  function keputusan(d, r) {
    if (d.jenis !== 'SAS' || Number(d.periode.semester) !== 2 || !r.naik) return '';
    const t = Number(d.rombel.tingkat);
    if (t >= 6) return html`<div class="rp-sec">Keputusan</div><p>Berdasarkan pencapaian seluruh kompetensi, peserta didik dinyatakan: <b>${r.naik === 'ya' ? 'LULUS' : 'BELUM LULUS'}</b></p>`;
    return html`<div class="rp-sec">Keputusan</div><p>Berdasarkan pencapaian seluruh kompetensi, peserta didik ditetapkan: <b>${r.naik === 'ya' ? 'Naik ke Kelas ' + ROMAWI[t + 1] + ' (' + ANGKA[t + 1] + ')' : 'Tinggal di Kelas ' + ROMAWI[t] + ' (' + ANGKA[t] + ')'}</b></p>`;
  }

  /** Satu lembar rapor lengkap untuk seorang siswa. */
  function lembar(d, r, opsi) {
    const judul = d.jenis === 'STS' ? 'Laporan Hasil Belajar Tengah Semester' : 'Laporan Hasil Belajar (Rapor)';
    let no = 0;
    return html`<div class="paper ${opsi.kertas === 'F4' ? 'f4' : ''}">${opsi.watermark ? draf(d.status) : ''}
      ${kop(d.sekolah, opsi)}<div class="rp-title">${judul}</div>${identitas(d, r)}
      <div class="rp-sec">A. Capaian Hasil Belajar (Intrakurikuler)</div>
      <table class="rp-tbl"><thead><tr><th style="width:28px">No</th><th style="width:30%">Mata Pelajaran</th><th style="width:52px">Nilai Akhir</th><th>Capaian Kompetensi</th></tr></thead>
        <tbody>${r.mapel.map(m => html`<tr><td class="c">${++no}</td><td>${m.nama}</td><td class="c"><b>${m.na === null ? '-' : m.na}</b></td><td style="text-align:justify">${m.deskripsi || '-'}</td></tr>`)}</tbody></table>
      ${d.jenis === 'SAS' && opsi.kokurikuler !== false ? html`<div class="rp-sec">B. Kokurikuler</div>
        <table class="rp-tbl"><tbody>${r.kokurikuler.length ? r.kokurikuler.map(k => html`<tr><td style="text-align:justify">${k.narasi}</td></tr>`) : html`<tr><td>-</td></tr>`}</tbody></table>` : ''}
      <div class="rp-sec">${d.jenis === 'SAS' ? 'C' : 'B'}. Ekstrakurikuler</div>
      <table class="rp-tbl"><thead><tr><th style="width:28px">No</th><th style="width:34%">Kegiatan Ekstrakurikuler</th><th style="width:90px">Predikat</th><th>Keterangan</th></tr></thead>
        <tbody>${r.ekskul.length ? r.ekskul.map((e, i) => html`<tr><td class="c">${i + 1}</td><td>${e.nama}</td><td class="c">${e.predikat || '-'}</td><td>${e.keterangan || '-'}</td></tr>`) : html`<tr><td class="c">1</td><td>-</td><td class="c">-</td><td>-</td></tr>`}</tbody></table>
      <div style="display:grid;grid-template-columns:240px 1fr;gap:12px">
        <div><div class="rp-sec">${d.jenis === 'SAS' ? 'D' : 'C'}. Ketidakhadiran</div><table class="rp-tbl"><tbody>
          <tr><td>Sakit</td><td class="c" style="width:70px">${r.absensi.sakit || 0} hari</td></tr><tr><td>Izin</td><td class="c">${r.absensi.izin || 0} hari</td></tr>
          <tr><td>Tanpa Keterangan</td><td class="c">${r.absensi.alpa || 0} hari</td></tr></tbody></table></div>
        <div><div class="rp-sec">${d.jenis === 'SAS' ? 'E' : 'D'}. Catatan Wali Kelas</div><table class="rp-tbl"><tbody><tr><td style="height:58px;text-align:justify">${r.catatan || '-'}</td></tr></tbody></table></div></div>
      ${keputusan(d, r)}${ttd(d, r, opsi)}${verif(d, r, opsi)}
      <div class="rp-foot"><span>${r.siswa.nama} · Kelas ${d.rombel.nama} · ${d.jenis === 'STS' ? 'Tengah ' : ''}Semester ${d.periode.semester} ${d.periode.tahun_ajaran}</span><span>RaporKilat SD</span></div></div>`;
  }

  /** Halaman identitas peserta didik (opsional, biasanya sekali di awal buku rapor). */
  function lembarIdentitas(d, r, opsi) {
    const s = r.siswa, baris = (no, k, v) => html`<tr><td style="width:28px;border:0">${no}.</td><td style="border:0;width:42%">${k}</td><td style="border:0;width:10px">:</td><td style="border:0">${v || '-'}</td></tr>`;
    return html`<div class="paper ${opsi.kertas === 'F4' ? 'f4' : ''}"><div class="rp-title" style="margin-top:10mm">Identitas Peserta Didik</div>
      <table class="rp-tbl" style="font-size:11pt"><tbody>
        ${baris(1, 'Nama Peserta Didik', s.nama)}${baris(2, 'NISN / NIS', (s.nisn || '-') + ' / ' + (s.nis || '-'))}
        ${baris(3, 'Tempat, Tanggal Lahir', [s.tempat_lahir, tglID(s.tanggal_lahir)].filter(Boolean).join(', '))}${baris(4, 'Jenis Kelamin', s.jk === 'P' ? 'Perempuan' : s.jk === 'L' ? 'Laki-laki' : '')}
        ${baris(5, 'Agama', s.agama)}${baris(6, 'Alamat Peserta Didik', s.alamat)}${baris(7, 'Nama Ayah', s.nama_ayah)}${baris(8, 'Nama Ibu', s.nama_ibu)}${baris(9, 'Nama Wali', s.nama_wali)}</tbody></table>
      <div class="rp-ttd" style="grid-template-columns:1fr 1fr;margin-top:30mm"><div></div><div>${d.periode.tempat_rapor || d.sekolah.kota || ''}, ${d.tanggal ? tglID(d.tanggal) : '....................'}<br>Kepala Sekolah<div class="sp"></div><b><u>${d.kepsek.nama}</u></b><br>NIP. ${d.kepsek.nip || '-'}</div></div></div>`;
  }

  function leger(lg, s, opsi = {}) {
    const rk = /^(ya|true)$/i.test(String(s.tampil_ranking || ''));
    return html`<div class="paper" style="width:330mm;min-height:auto;padding:10mm"><div style="text-align:center;font-weight:bold">LEGER NILAI ${lg.jenis === 'STS' ? 'TENGAH ' : ''}SEMESTER<br>${s.nama_sekolah} — KELAS ${lg.rombel.nama} · ${B.periodeLabel()}</div>
      <table class="leger-tbl mt-12"><thead><tr><th>No</th><th>NISN</th><th>Nama</th>${lg.kolom.map(k => html`<th title="${k.nama}">${k.singkatan}</th>`)}<th>Jumlah</th><th>Rata</th>${rk ? html`<th>Rank</th>` : ''}<th>S</th><th>I</th><th>A</th></tr></thead>
      <tbody>${lg.rows.map(r => html`<tr><td>${r.no}</td><td>${r.nisn || ''}</td><td class="l">${r.nama}</td>${lg.kolom.map(k => html`<td>${r.nilai[k.id] === null || r.nilai[k.id] === undefined ? '' : r.nilai[k.id]}</td>`)}
        <td>${r.jumlah || ''}</td><td>${r.rata === null ? '' : r.rata}</td>${rk ? html`<td>${r.rank || ''}</td>` : ''}<td>${r.sakit}</td><td>${r.izin}</td><td>${r.alpa}</td></tr>`)}
        <tr><td colspan="3" class="l"><b>Rata-rata kelas</b></td>${lg.kolom.map(k => html`<td><b>${lg.rataKolom[k.id] === null ? '' : lg.rataKolom[k.id]}</b></td>`)}<td colspan="${rk ? 6 : 5}"></td></tr></tbody></table></div>`;
  }

  /** Gambar semua QR [data-qr] di dalam elemen (pustaka dimuat bila perlu). */
  async function gambarQR(root) {
    const el = $$('[data-qr]', root);
    if (!el.length) return;
    await Lazy('js/vendor/qrcode.js');
    el.forEach(x => {
      if (x.dataset.done) return;
      try {
        const qr = new QRCodeLite(-1, 0); // tipe otomatis, koreksi galat M
        qr.addData(x.dataset.qr); qr.make();
        const n = qr.getModuleCount();
        let d = '';
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
        x.innerHTML = `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
        x.dataset.done = '1';
      } catch (e) { x.textContent = 'QR'; }
    });
  }

  /** Cetak isi .print-area dengan ukuran kertas yang dipilih. */
  function cetak(kertas, orientasi) {
    let st = document.getElementById('page-size');
    if (!st) { st = document.createElement('style'); st.id = 'page-size'; document.head.appendChild(st); }
    const ukuran = kertas === 'F4' ? '215mm 330mm' : kertas === 'F4L' ? '330mm 215mm' : 'A4';
    st.textContent = `@media print { @page { size: ${ukuran} ${orientasi === 'landscape' && kertas !== 'F4L' ? 'landscape' : ''}; margin: 0; } }`;
    setTimeout(() => window.print(), 60);
  }
  return { lembar, lembarIdentitas, leger, gambarQR, cetak, urlVerifikasi };
})();
