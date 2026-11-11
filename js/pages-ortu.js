/* ============================================================
   RaporKilat SD — Portal Orang Tua / Wali Murid
   Hanya menampilkan rapor yang sudah DISETUJUI kepala sekolah.
   ============================================================ */
'use strict';

route('/portal', {
  judul: 'Portal Orang Tua', auth: 'ortu',
  async render(view, p) {
    let idx = Number(S.ctx.ortuIdx || 0), tab = S.ctx.ortuTab || 'ringkas', d = null;
    mount(view, html`<div class="pub portal">
      <nav class="pub-nav"><div class="in"><a class="brand" href="#/portal"><span class="logo">${ic('auto_stories')}</span><span class="hide-m">RaporKilat SD</span></a>
        <span class="small muted hide-m">Portal Orang Tua</span><span class="grow"></span>
        <span class="row small"><span class="av">${initials(S.user.nama)}</span><span class="hide-m"><b>${S.user.nama}</b></span></span>
        <button class="btn ghost sm" data-keluar>${ic('logout', 'sm')}<span class="hide-m">Keluar</span></button></div></nav>
      <div class="portal-in" data-isi>${skeleton(6)}</div></div>`);
    $('[data-keluar]', view).onclick = () => keluar();
    const isi = $('[data-isi]', view);

    const muat = async () => {
      await API.swr('ortuRapor', { index: idx }, x => { if (p.alive()) { d = x; gambar(); } }, { ttl: 60000 });
    };
    const gambar = () => {
      if (!d.isi) {
        mount(isi, html`<div class="card pad">${kosong('hourglass_top', 'Rapor belum terbit', 'Rapor ananda ' + d.siswa.nama + ' akan tampil di sini setelah disetujui kepala sekolah. Silakan cek kembali nanti.')}</div>`);
        return;
      }
      const x = d.isi, r = x.rapor, s = x.sekolah, per = x.periode;
      const mp = r.mapel.filter(m => m.na !== null && m.na !== '');
      const pred = n => Hitung.predikat(n, x.predikat && x.predikat.length ? x.predikat : predikatDefault()) || {};
      const hadir = r.absensi;
      const totalAbsen = (Number(hadir.sakit) || 0) + (Number(hadir.izin) || 0) + (Number(hadir.alpa) || 0);
      const tuntas = mp.filter(m => Number(m.na) >= Number(m.kktp || 0)).length;
      mount(isi, html`
        <section class="card portal-hero">
          <div class="grow">
            <div class="row wrap gap-8 mb-8"><span class="badge ok">${ic('verified', 'sm')}Disetujui kepala sekolah</span>${x.status && x.status.status === 'terkunci' ? html`<span class="badge dark">${ic('lock', 'sm')}Terkunci</span>` : ''}</div>
            <h1>${r.siswa.nama}</h1>
            <p class="muted">NISN ${r.siswa.nisn || '-'} · Kelas ${x.rombel.nama} · Fase ${x.rombel.fase} · ${s.nama_sekolah}</p>
            <div class="row wrap gap-8 mt-12">
              <select class="select" style="max-width:340px" data-pilih aria-label="Pilih rapor">${d.daftar.map(o => html`<option value="${o.index}" ${o.index === d.aktif ? raw('selected') : ''}>${o.label}</option>`)}</select>
              <span class="small muted">${ic('calendar_today', 'sm')} ${tglID(x.tanggal) || '-'}</span>
              ${r.kode ? html`<span class="small muted">${ic('fingerprint', 'sm')} Kode <b class="mono">${r.kode}</b></span>` : ''}</div>
          </div>
          <div class="col gap-8 portal-aksi">
            <button class="btn primary" data-unduh>${ic('download', 'sm')}Unduh / Cetak PDF</button>
            ${r.kode ? html`<button class="btn ghost" data-bagikan>${ic('share', 'sm')}Bagikan tautan verifikasi</button>` : ''}
            ${x.tandaTerima ? html`<span class="badge ok" style="justify-content:center;padding:8px">${ic('task_alt', 'sm')}Diterima ${jamID(x.tandaTerima.waktu)}</span>`
              : html`<button class="btn ghost" data-terima>${ic('assignment_turned_in', 'sm')}Konfirmasi tanda terima</button>`}
          </div>
        </section>
        <div class="kpis mt-16">
          <div class="card kpi"><div class="k-l">Rata-rata nilai akhir<span class="k-ic">${ic('analytics', 'sm')}</span></div><div class="k-v">${r.rata === null ? '–' : fmt1(r.rata)}</div><div class="k-s">${r.rata === null ? '' : pred(r.rata).label || ''}</div></div>
          <div class="card kpi"><div class="k-l">Mapel mencapai KKTP<span class="k-ic">${ic('task_alt', 'sm')}</span></div><div class="k-v">${tuntas}<small class="muted" style="font-size:14px"> / ${mp.length}</small></div><div class="k-s">${tuntas === mp.length ? 'Semua tercapai' : (mp.length - tuntas) + ' perlu penguatan'}</div></div>
          <div class="card kpi"><div class="k-l">Ketidakhadiran<span class="k-ic">${ic('how_to_reg', 'sm')}</span></div><div class="k-v">${totalAbsen}<small class="muted" style="font-size:14px"> hari</small></div><div class="k-s">Sakit ${hadir.sakit || 0} · Izin ${hadir.izin || 0} · Alpa ${hadir.alpa || 0}</div></div>
          <div class="card kpi"><div class="k-l">Kokurikuler<span class="k-ic">${ic('diversity_3', 'sm')}</span></div><div class="k-v">${r.kokurikuler.length}</div><div class="k-s">kegiatan dinilai</div></div>
        </div>
        <div class="seg mt-16" data-tab role="tablist">${[['ringkas', 'Mata pelajaran'], ['koku', 'Kokurikuler & ekskul'], ['grafik', 'Grafik capaian'], ['lembar', 'Lembar rapor']].map(t => html`<button role="tab" data-v="${t[0]}" class="${tab === t[0] ? 'on' : ''}">${t[1]}</button>`)}</div>
        <div class="mt-16" data-tabisi></div>`);
      tabIsi();
    };
    function predikatDefault() {
      return [{ nilai_min: 88, nilai_max: 100, label: 'Sangat Baik' }, { nilai_min: 74, nilai_max: 87, label: 'Baik' }, { nilai_min: 60, nilai_max: 73, label: 'Cukup' }, { nilai_min: 0, nilai_max: 59, label: 'Perlu Bimbingan' }];
    }
    function tabIsi() {
      const box = $('[data-tabisi]', isi), x = d.isi, r = x.rapor;
      if (tab === 'ringkas') {
        mount(box, html`<div class="mcards">${r.mapel.map(m => { const ok = m.na !== null && Number(m.na) >= Number(m.kktp || 0);
          return html`<article class="card mcard" style="cursor:default"><div class="row between"><b>${m.nama}</b><span class="score ${m.na === null ? '' : ok ? 'ok' : 'err'}">${m.na === null ? '–' : m.na}</span></div>
            <p class="small" style="margin:0;line-height:1.55">${m.deskripsi || html`<span class="muted">Deskripsi belum tersedia.</span>`}</p></article>`; })}</div>
          ${r.catatan ? html`<div class="card pad mt-16"><div class="row mb-8">${ic('edit_note')}<b>Catatan wali kelas</b><span class="small muted">${x.wali.nama}</span></div><p style="margin:0;line-height:1.6">“${r.catatan}”</p></div>` : ''}
          ${r.naik ? html`<div class="alert ok mt-16">${ic('school')}<div><b>Keputusan:</b> ${r.naik}</div></div>` : ''}`);
      }
      if (tab === 'koku') {
        mount(box, html`<div class="grid2" style="align-items:start"><div class="col gap-12">${r.kokurikuler.length ? r.kokurikuler.map(k => html`<div class="card pad"><div class="lbl">${k.tema || 'Kokurikuler'}</div><h3 style="margin:4px 0 8px">${k.judul}</h3>
          <p class="small" style="line-height:1.6;margin:0 0 10px">${k.narasi}</p><div class="row wrap gap-4">${k.capaian.map(c => html`<span class="badge ${c.capaian === 'Sangat Baik' ? 'ok' : c.capaian === 'Kurang' ? 'warn' : 'pri'}">${c.dimensi}: ${c.capaian}</span>`)}</div></div>`)
          : html`<div class="card pad">${kosong('diversity_3', 'Belum ada kokurikuler', 'Kegiatan kokurikuler semester ini belum dinilai.')}</div>`}</div>
          <div class="card"><div class="card-h"><h3>${ic('sports_soccer')}Ekstrakurikuler</h3></div><div class="pad col gap-8">${r.ekskul.length ? r.ekskul.map(e => html`<div class="row between"><b>${e.nama}</b><span class="badge pri">${e.predikat || '-'}</span></div>${e.keterangan ? html`<div class="small muted">${e.keterangan}</div>` : ''}`) : html`<p class="small muted">Tidak ada data ekstrakurikuler.</p>`}</div></div></div>`);
      }
      if (tab === 'grafik') {
        const mp = r.mapel.filter(m => m.na !== null);
        mount(box, html`<div class="card pad"><div class="row between mb-12"><h3 style="margin:0">Nilai akhir per mata pelajaran</h3><span class="small muted">Garis tipis = KKTP</span></div>
          <div class="col gap-8" role="list">${mp.map(m => { const v = Number(m.na), k = Number(m.kktp || 0);
            return html`<div class="chart-row" role="listitem" aria-label="${m.nama} ${v}"><span class="small">${m.nama}</span>
              <div class="chart-bar"><i style="width:${Math.max(2, Math.min(100, v))}%" class="${v >= k ? 'ok' : 'err'}"></i><b style="left:${k}%" title="KKTP ${k}"></b></div><span class="mono bold">${v}</span></div>`; })}</div>
          <p class="xs muted mt-12">Kurikulum Merdeka menekankan perkembangan tiap anak, bukan peringkat. Bandingkan capaian dengan KKTP, bukan dengan teman.</p></div>`);
      }
      if (tab === 'lembar') {
        const opsi = { kertas: x.sekolah.kertas || 'A4', kop: 'lengkap', qr: true, kokurikuler: true, identitas: false, tandaDigital: true };
        mount(box, html`<div class="toolbar card mb-12 no-print"><span class="small muted">Tampilan sama dengan rapor cetak. Untuk PDF: Cetak → "Simpan sebagai PDF".</span><span class="grow"></span>
          <div class="seg" data-kertas>${['A4', 'F4'].map(k => html`<button data-v="${k}" class="${opsi.kertas === k ? 'on' : ''}">${k}</button>`)}</div>
          <button class="btn primary sm" data-unduh>${ic('print', 'sm')}Cetak / PDF</button></div>
          <div class="print-area"><div class="paper-stage" data-stage>${Cetak.lembar(x, r, opsi)}</div></div>`);
        Cetak.gambarQR(box).catch(() => {});
        $('[data-kertas]', box).onclick = e => { const b = e.target.closest('button'); if (!b) return; opsi.kertas = b.dataset.v; x.sekolah.kertas = b.dataset.v; tabIsi(); };
      }
    }

    isi.addEventListener('change', e => {
      if (e.target.dataset.pilih !== undefined) { idx = +e.target.value; S.ctx.ortuIdx = idx; S.simpanCtx(); mount(isi, skeleton(6)); muat(); }
    });
    isi.addEventListener('click', async e => {
      const t = e.target.closest('[data-tab] button');
      if (t) { tab = t.dataset.v; S.ctx.ortuTab = tab; S.simpanCtx(); $$('[data-tab] button', isi).forEach(b => b.classList.toggle('on', b === t)); tabIsi(); return; }
      if (e.target.closest('[data-unduh]')) {
        if (tab !== 'lembar') { tab = 'lembar'; S.ctx.ortuTab = tab; S.simpanCtx(); gambar(); }
        const box = $('[data-tabisi]', isi);
        await Cetak.gambarQR(box).catch(() => {});
        toast('Pada dialog cetak pilih "Simpan sebagai PDF".', 'info');
        Cetak.cetak(d.isi.sekolah.kertas || 'A4');
      }
      if (e.target.closest('[data-bagikan]')) {
        const url = Cetak.urlVerifikasi(d.isi.rapor.kode);
        const teks = 'Verifikasi keaslian rapor ' + d.isi.rapor.siswa.nama + ' (' + d.isi.sekolah.nama_sekolah + '): ' + url;
        if (navigator.share) navigator.share({ title: 'Verifikasi rapor', text: teks, url }).catch(() => {});
        else window.open('https://wa.me/?text=' + encodeURIComponent(teks), '_blank', 'noopener');
      }
      if (e.target.closest('[data-terima]')) {
        const v = await modal({ judul: 'Konfirmasi tanda terima rapor', isi: html`<div class="col gap-12"><p>Dengan ini saya selaku orang tua/wali menyatakan telah menerima dan membaca rapor ananda <b>${d.isi.rapor.siswa.nama}</b>.</p>
          <div class="field"><label>Pesan untuk wali kelas (opsional)</label><textarea class="textarea" name="catatan" rows="3" placeholder="Terima kasih atas bimbingannya…"></textarea></div></div>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Saya sudah menerima', kelas: 'primary', onClick: bg => API.call('tandaTerima', { periode_id: d.isi.periode.id, jenis: d.isi.jenis, catatan: nilaiForm(bg).catatan }) }] });
        if (v) { toast('Terima kasih, tanda terima tercatat.', 'ok'); d.isi.tandaTerima = { waktu: v.waktu }; API.invalidate('ortuRapor'); gambar(); }
      }
    });
    await muat();
  }
});
