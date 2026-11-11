/* ============================================================
   RaporKilat SD — halaman kepala sekolah & pemantauan:
   Review & Persetujuan, Monitoring guru & kelas, Audit log.
   ============================================================ */
'use strict';

route('/persetujuan', {
  judul: 'Review & Persetujuan Rapor', shell: true, auth: 'staf', peran: ['kepsek', 'operator'],
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    let jenis = S.ctx.jenisSetuju === 'STS' ? 'STS' : 'SAS', filter = 'semua', fase = 'semua', cari = '', pilih = new Set(), inspek = S.ctx.inspek || null, prog = null;
    const isKepsek = S.peran('kepsek');
    mount(view, html`${kepalaHalaman('Kepala sekolah · Manajemen rapor', 'Review & Persetujuan Rapor', 'Periksa kelengkapan dan contoh rapor, lalu setujui atau kembalikan dengan catatan untuk wali kelas.',
      html`<div class="seg" data-jenis><button data-v="SAS" class="${jenis === 'SAS' ? 'on' : ''}">Akhir semester</button><button data-v="STS" class="${jenis === 'STS' ? 'on' : ''}">Tengah semester</button></div>`)}
      <div data-isi>${skeleton(8)}</div>`);
    $('[data-jenis]', view).onclick = e => { const b = e.target.closest('button'); if (b) { S.ctx.jenisSetuju = b.dataset.v; S.simpanCtx(); render(); } };
    const isi = $('[data-isi]', view);
    const st = r => r.status[jenis] || { status: 'draft' };
    const gambar = () => {
      const rs = prog.rombel;
      const n = s => rs.filter(r => st(r).status === s).length;
      const tampil = rs.filter(r => (filter === 'semua' || (filter === 'disetujui' ? ['disetujui', 'terkunci'].includes(st(r).status) : filter === 'draft' ? ['draft', 'revisi'].includes(st(r).status) : st(r).status === filter))
        && (fase === 'semua' || r.fase === fase) && (!cari || (r.nama + ' ' + (B.user(r.wali_id).nama || '')).toLowerCase().includes(cari)));
      if (!inspek || !rs.some(r => r.id === inspek)) inspek = (rs.find(r => st(r).status === 'diajukan') || rs[0] || {}).id;
      mount(isi, html`<div class="kpis mb-12">
        <div class="card kpi"><div class="k-l">Total rombel<span class="k-ic">${ic('groups', 'sm')}</span></div><div class="k-v">${rs.length}</div><div class="k-s">${rs.reduce((s, r) => s + r.jumlah, 0)} siswa · A:${rs.filter(r => r.fase === 'A').length} B:${rs.filter(r => r.fase === 'B').length} C:${rs.filter(r => r.fase === 'C').length}</div></div>
        <div class="card kpi"><div class="k-l">Menunggu persetujuan<span class="k-ic">${ic('pending_actions', 'sm')}</span></div><div class="k-v pri-t">${n('diajukan')}</div><div class="k-s">diajukan wali kelas</div></div>
        <div class="card kpi"><div class="k-l">Disetujui & terkunci<span class="k-ic">${ic('verified', 'sm')}</span></div><div class="k-v ok-t">${n('disetujui') + n('terkunci')}</div><div class="k-s">QR verifikasi terbit</div></div>
        <div class="card kpi"><div class="k-l">Draf / perlu perbaikan<span class="k-ic">${ic('report_problem', 'sm')}</span></div><div class="k-v err-t">${n('draft') + n('revisi')}</div><div class="k-s">${n('revisi')} dikembalikan</div></div></div>
      <div class="split"><div class="col gap-12">
        <div class="card toolbar"><div class="row wrap" data-filter>${[['semua', 'Semua', rs.length], ['diajukan', 'Menunggu', n('diajukan')], ['disetujui', 'Disetujui', n('disetujui') + n('terkunci')], ['draft', 'Draf/Revisi', n('draft') + n('revisi')]]
          .map(f => html`<button class="btn sm ${filter === f[0] ? 'primary' : 'ghost'}" data-v="${f[0]}">${f[1]} (${f[2]})</button>`)}</div><span class="grow"></span>
          <select class="select" style="max-width:150px" data-fase><option value="semua">Semua fase</option>${['A', 'B', 'C'].map(f => html`<option value="${f}" ${fase === f ? raw('selected') : ''}>Fase ${f}</option>`)}</select>
          <input class="input" style="max-width:220px" placeholder="Cari rombel / wali" data-cari value="${cari}"></div>
        ${pilih.size && isKepsek ? html`<div class="card toolbar" style="background:var(--primary-50)"><b>${pilih.size} rombel dipilih</b><span class="grow"></span>
          <button class="btn sm ok" data-setujui-pilih>${ic('verified', 'sm')}Setujui terpilih</button><button class="btn sm ghost" data-batal-pilih>Batal</button></div>` : ''}
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr>${isKepsek ? html`<th class="c"><input type="checkbox" data-semua aria-label="Pilih semua yang diajukan"></th>` : ''}<th>Rombel</th><th>Wali kelas</th><th style="min-width:150px">Kelengkapan</th><th class="c">Rata NA</th><th>Status</th><th></th></tr></thead>
          <tbody>${tampil.map(r => { const s = st(r); return html`<tr class="${r.id === inspek ? 'sel' : ''}" data-rid="${r.id}" style="cursor:pointer">
            ${isKepsek ? html`<td class="c"><input type="checkbox" data-pilih="${r.id}" ${pilih.has(r.id) ? raw('checked') : ''} ${s.status !== 'diajukan' ? raw('disabled') : ''}></td>` : ''}
            <td><b>Kelas ${r.nama}</b> <span class="badge">Fase ${r.fase}</span><div class="xs muted">${r.jumlah} siswa</div></td>
            <td>${B.user(r.wali_id).nama || html`<span class="err-t small">–</span>`}<div class="xs muted mono">${B.user(r.wali_id).nip ? 'NIP ' + B.user(r.wali_id).nip : ''}</div></td>
            <td><div class="row"><div class="bar grow ${r.persen >= 100 ? 'ok' : r.persen < 60 ? 'err' : 'warn'}"><i style="width:${r.persen}%"></i></div><span class="small bold">${r.persen}%</span></div>${r.mapelTanpaTP ? html`<div class="xs err-t">${r.mapelTanpaTP} mapel tanpa TP</div>` : ''}</td>
            <td class="c bold">${fmt1(r.rata)}${r.remedial ? html`<div class="xs err-t">${r.remedial} remedial</div>` : ''}</td>
            <td>${badgeStatus(s.status)}${s.diajukan_at && s.status === 'diajukan' ? html`<div class="xs muted">${jamID(s.diajukan_at)}</div>` : ''}</td>
            <td class="right"><button class="btn sm ${r.id === inspek ? 'primary' : 'ghost'}" data-inspek="${r.id}">${ic('visibility', 'sm')}Review</button></td></tr>`; })}</tbody></table></div>
          ${!tampil.length ? kosong('filter_alt_off', 'Tidak ada rombel', 'Ubah filter untuk melihat rombel lain.') : ''}</div>
        <div class="alert">${ic('policy')}<div><b>Kepatuhan & audit.</b> Rapor yang disetujui terkunci untuk perubahan dan mendapat kode verifikasi unik. Buka kunci hanya oleh operator dengan alasan tertulis yang tercatat di audit log.</div></div></div>
        <div class="side-panel" data-panel></div></div>`);
      panel();
    };
    const panel = async () => {
      const sp = $('[data-panel]', view); if (!sp) return;
      const r = prog.rombel.find(x => x.id === inspek);
      if (!r) { mount(sp, kosong('touch_app', 'Pilih rombel', 'Klik "Review" pada tabel.')); return; }
      const s = st(r);
      mount(sp, html`<div class="card" style="overflow:hidden"><div class="pad" style="background:var(--primary);color:#fff">
          <div class="xs" style="opacity:.8;letter-spacing:.06em;text-transform:uppercase;font-weight:700">Panel inspeksi rapor</div>
          <h2 style="color:#fff" class="mt-8">Kelas ${r.nama} (Fase ${r.fase})</h2><div class="small" style="opacity:.9">Wali kelas: ${B.user(r.wali_id).nama || '-'}</div></div>
        <div class="pad col gap-12" data-detail>${skeleton(4)}</div>
        ${isKepsek && s.status === 'diajukan' ? html`<div class="pad col gap-8" style="background:var(--surface-2);border-top:1px solid var(--line)">
          <button class="btn ok lg" data-setujui>${ic('verified', 'sm')}Setujui & terbitkan QR</button>
          <button class="btn ghost" data-kembalikan style="color:var(--err)">${ic('replay', 'sm')}Kembalikan dengan catatan</button></div>` : ''}
        ${isKepsek && s.status === 'disetujui' ? html`<div class="pad"><button class="btn ghost" data-kembalikan style="color:var(--err);width:100%">${ic('replay', 'sm')}Batalkan persetujuan (kembalikan)</button></div>` : ''}</div>`);
      const dt = $('[data-detail]', sp);
      try {
        const [lg, rd] = await Promise.all([API.call('leger', { rombel_id: r.id, periode_id: S.periodeId, jenis }), API.call('raporData', { rombel_id: r.id, periode_id: S.periodeId, jenis })]);
        if (!p.alive() || inspek !== r.id) return;
        const dist = {};
        (S.boot.predikat || []).forEach(x => { dist[x.label] = 0; });
        rd.rapor.forEach(x => x.mapel.forEach(m => { const pr = Hitung.predikat(m.na, S.boot.predikat); if (pr) dist[pr.label]++; }));
        const totD = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
        const warna = ['var(--ok)', 'var(--primary)', '#f59e0b', 'var(--err)'];
        const adaKoku = rd.rapor.some(x => x.kokurikuler.length), adaCat = rd.rapor.filter(x => x.catatan).length;
        mount(dt, html`<div class="lbl">Checklist validasi akademik</div>
          ${[[r.jumlah > 0, 'Kelengkapan peserta didik', r.jumlah + ' siswa terdaftar'], [lg.kelengkapan.persen >= 100, 'Nilai mapel lengkap', lg.kelengkapan.persen + '%' + (lg.kelengkapan.masalah.length ? ' · ' + lg.kelengkapan.masalah.length + ' catatan' : '')],
             [adaKoku || jenis === 'STS', 'Kokurikuler 8 dimensi', adaKoku ? 'Terisi' : 'Belum ada kegiatan'], [adaCat === rd.rapor.length, 'Catatan wali kelas', adaCat + '/' + rd.rapor.length + ' siswa']]
            .map(c => html`<div class="row card pad" style="box-shadow:none;background:var(--surface-2);padding:8px 10px">${ic(c[0] ? 'check_circle' : 'error', 'sm ' + (c[0] ? 'ok-t' : 'warn-t'))}<div class="grow"><div class="small bold">${c[1]}</div><div class="xs muted">${c[2]}</div></div></div>`)}
          ${s.catatan ? html`<div class="alert ${s.status === 'revisi' ? 'err' : 'warn'} small">${ic('sticky_note_2', 'sm')}<span>${s.catatan}</span></div>` : ''}
          <div><div class="lbl mb-8">Distribusi predikat seluruh mapel</div><div class="bar" style="height:10px">${Object.keys(dist).map((k, i) => html`<i style="width:${dist[k] / totD * 100}%;background:${warna[i] || '#94a3b8'};border-radius:0" title="${k}: ${dist[k]}"></i>`)}</div>
            <div class="row wrap xs mt-8">${Object.keys(dist).map((k, i) => html`<span class="row gap-4"><span style="width:8px;height:8px;border-radius:2px;background:${warna[i] || '#94a3b8'}"></span>${k} ${dist[k]}</span>`)}</div></div>
          <div><div class="row between"><div class="lbl">Uji petik rapor siswa</div><span class="xs muted">${rd.rapor.length} siswa</span></div>
            <div class="col gap-4 mt-8">${sortBy(rd.rapor, x => -(x.rata || 0)).filter((x, i, a) => i < 2 || i === a.length - 1).map(x => html`<div class="row card" style="box-shadow:none;background:var(--surface-2);padding:6px 10px">
              <span class="userbtn" style="padding:0;min-height:0"><span class="av" style="width:28px;height:28px;font-size:11px">${initials(x.siswa.nama)}</span></span>
              <div class="grow trunc small"><b>${x.siswa.nama}</b></div><b class="pri-t">${x.rata === null ? '–' : x.rata}</b>
              <button class="btn icon sm ghost" data-lihat="${x.anggota_id}" title="Lihat lembar rapor">${ic('picture_as_pdf', 'sm')}</button></div>`)}</div></div>`);
        dt.onclick = e => {
          const b = e.target.closest('[data-lihat]'); if (!b) return;
          const x = rd.rapor.find(y => y.anggota_id === b.dataset.lihat);
          const opsi = Object.assign({}, OpsiCetak, { kertas: OpsiCetak.kertas || S.pengaturan.kertas || 'A4' });
          modal({ judul: 'Pratinjau rapor — ' + x.siswa.nama, lebar: 'xwide', isi: html`<div class="paper-stage">${Cetak.lembar(rd, x, opsi)}</div>`, onBuka: bg => Cetak.gambarQR(bg) });
        };
      } catch (e) { if (p.alive()) mount(dt, html`<div class="alert err">${ic('error')}<span>${e.message}</span></div>`); }
      const bs = $('[data-setujui]', sp), bk = $('[data-kembalikan]', sp);
      if (bs) bs.onclick = () => setujui([r.id]);
      if (bk) bk.onclick = () => kembalikan(r);
    };
    const setujui = async ids => {
      const nama = ids.map(id => 'Kelas ' + prog.rombel.find(r => r.id === id).nama).join(', ');
      const v = await modal({ judul: 'Konfirmasi persetujuan', isi: html`<div class="col gap-12">
        <div class="alert ok">${ic('verified_user')}<div><b>${nama}</b><br>Rapor ${jenis === 'STS' ? 'tengah semester' : 'akhir semester'} akan disetujui, dikunci dari perubahan, dan setiap siswa mendapat kode QR verifikasi.</div></div>
        <div class="field"><label>Konfirmasi kata sandi kepala sekolah</label><input class="input" type="password" name="password" autocomplete="current-password"></div>
        <p class="xs muted">Persetujuan ini adalah persetujuan dalam aplikasi sekolah (tercatat di audit log), bukan tanda tangan elektronik tersertifikasi BSrE.</p></div>`,
        aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Setujui & kunci', kelas: 'ok', ikon: 'done_all', onClick: bg => API.call('setujuiRapor', { rombel_ids: ids, periode_id: S.periodeId, jenis, password: nilaiForm(bg).password }) }] });
      if (!v) return;
      const ok = v.filter(x => x.ok).length, gagal = v.filter(x => !x.ok);
      toast(ok + ' rombel disetujui.' + (gagal.length ? ' ' + gagal.map(g => g.pesan).join(' ') : ''), gagal.length ? 'warn' : 'ok', 'Persetujuan tersimpan');
      pilih.clear(); await segarkan();
    };
    const kembalikan = async r => {
      const tag = ['Deskripsi tidak sesuai TP', 'Nilai belum lengkap', 'Anomali nilai ekstrem', 'Absensi belum diisi', 'Catatan wali kelas kurang jelas', 'Kokurikuler belum diisi'];
      const v = await modal({ judul: 'Kembalikan rapor Kelas ' + r.nama, isi: html`<div class="col gap-12">
        <p class="small muted">Tuliskan perbaikan yang diperlukan. Wali kelas melihat catatan ini dan nilai kembali bisa diubah.</p>
        <div class="row wrap">${tag.map(t => html`<button class="btn sm ghost" type="button" data-tag>${t}</button>`)}</div>
        <div class="field"><label>Instruksi perbaikan</label><textarea class="textarea" name="catatan" rows="4" placeholder="Mis. Lengkapi SAS PJOK 2 siswa dan perbaiki deskripsi Matematika."></textarea></div></div>`,
        onBuka: bg => $$('[data-tag]', bg).forEach(b => b.onclick = () => { const t = $('[name=catatan]', bg); t.value = (t.value ? t.value + '; ' : '') + b.textContent; t.focus(); }),
        aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Kirim catatan & buka edit', kelas: 'danger', ikon: 'send', onClick: bg => API.call('kembalikanRapor', { rombel_id: r.id, periode_id: S.periodeId, jenis, catatan: nilaiForm(bg).catatan }) }] });
      if (v) { toast('Rapor dikembalikan ke wali kelas.', 'ok'); await segarkan(); }
    };
    const segarkan = async () => {
      API.invalidate('progres'); API.invalidate('leger'); API.invalidate('raporData');
      prog = await API.call('progres', { periode_id: S.periodeId });
      muatBoot(true).catch(() => {});
      if (p.alive()) gambar();
    };
    isi.addEventListener('click', e => {
      const f = e.target.closest('[data-filter] button'); if (f) { filter = f.dataset.v; gambar(); return; }
      const ins = e.target.closest('[data-inspek]'); if (ins) { inspek = ins.dataset.inspek; S.ctx.inspek = inspek; S.simpanCtx(); gambar(); return; }
      if (e.target.closest('[data-setujui-pilih]')) return setujui([...pilih]);
      if (e.target.closest('[data-batal-pilih]')) { pilih.clear(); gambar(); return; }
      const tr = e.target.closest('tr[data-rid]');
      if (tr && !e.target.closest('input,button')) { inspek = tr.dataset.rid; gambar(); }
    });
    isi.addEventListener('change', e => {
      if (e.target.dataset.pilih) { e.target.checked ? pilih.add(e.target.dataset.pilih) : pilih.delete(e.target.dataset.pilih); gambar(); }
      if (e.target.dataset.semua !== undefined) { prog.rombel.filter(r => st(r).status === 'diajukan').forEach(r => e.target.checked ? pilih.add(r.id) : pilih.delete(r.id)); gambar(); }
      if (e.target.dataset.fase !== undefined) { fase = e.target.value; gambar(); }
    });
    isi.addEventListener('input', debounce(e => { if (e.target.dataset.cari !== undefined) { cari = e.target.value.toLowerCase().trim(); gambar(); const c = $('[data-cari]', view); c.focus(); c.setSelectionRange(c.value.length, c.value.length); } }, 250));
    await API.swr('progres', { periode_id: S.periodeId }, d => { if (!p.alive()) return; prog = d; gambar(); }, { ttl: 8000 });
  }
});

route('/monitoring', {
  judul: 'Monitoring Guru & Kelas', shell: true, auth: 'staf', peran: ['kepsek', 'operator'],
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    let urut = 'persen', rbF = '';
    mount(view, html`${kepalaHalaman('Pemantauan', 'Monitoring Guru & Kelas', 'Progres pengisian nilai per mapel. Data diperbarui tiap kali halaman dibuka.')}<div data-isi>${skeleton(8)}</div>`);
    const isi = $('[data-isi]', view);
    let d = null;
    const gambar = () => {
      let mr = d.mr.filter(m => !rbF || m.rombel_id === rbF);
      mr = urut === 'persen' ? sortBy(mr, m => m.persen) : urut === 'guru' ? sortBy(mr, m => B.user(m.guru_id).nama || 'zzz') : sortBy(mr, m => -(m.remedial));
      const perGuru = {};
      d.mr.forEach(m => { const g = m.guru_id || '-'; perGuru[g] = perGuru[g] || { n: 0, p: 0 }; perGuru[g].n++; perGuru[g].p += m.persen; });
      mount(isi, html`<div class="card pad mb-12"><h3 class="row">${ic('badge')}Ringkasan per guru</h3><div class="mcards mt-12">${Object.keys(perGuru).map(g => { const pc = Math.round(perGuru[g].p / perGuru[g].n); return html`
        <div class="card mcard" style="box-shadow:none;border:1px solid var(--line);cursor:default"><div class="row between"><b class="trunc">${g === '-' ? 'Belum ada pengampu' : B.user(g).nama || g}</b><span class="badge">${perGuru[g].n} mapel</span></div>
          <div class="row"><div class="bar grow ${pc >= 100 ? 'ok' : pc < 50 ? 'err' : ''}"><i style="width:${pc}%"></i></div><b class="small">${pc}%</b></div></div>`; })}</div></div>
        <div class="card"><div class="toolbar" style="border-bottom:1px solid var(--line)"><select class="select" style="max-width:200px" data-rb><option value="">Semua rombel</option>${pilihanRombel(B.rombelTA(), rbF)}</select>
          <span class="grow"></span><span class="small muted">Urutkan:</span><div class="seg" data-urut>${[['persen', 'Progres terendah'], ['guru', 'Nama guru'], ['remedial', 'Remedial terbanyak']].map(u => html`<button class="${urut === u[0] ? 'on' : ''}" data-v="${u[0]}">${u[1]}</button>`)}</div></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kelas</th><th>Mapel</th><th>Guru pengampu</th><th style="min-width:170px">Progres input</th><th class="c">Rata NA</th><th class="c">Remedial</th><th>Terakhir diubah</th></tr></thead>
          <tbody>${mr.map(m => html`<tr><td><b>${B.rombel(m.rombel_id).nama}</b></td><td>${B.mapel(m.mapel_id).nama}</td><td>${B.user(m.guru_id).nama || html`<span class="err-t small">Belum ditetapkan</span>`}</td>
            <td>${m.adaTP ? html`<div class="row"><div class="bar grow ${m.persen >= 100 ? 'ok' : m.persen < 50 ? 'err' : ''}"><i style="width:${m.persen}%"></i></div><span class="small bold">${m.persen}%</span></div>` : html`<span class="badge warn">TP belum diisi</span>`}</td>
            <td class="c">${fmt1(m.rata)}</td><td class="c ${m.remedial ? 'err-t bold' : ''}">${m.remedial || '–'}</td><td class="small muted">${m.updated_at ? jamID(m.updated_at) : '–'}</td></tr>`)}</tbody></table></div></div>`);
    };
    isi.addEventListener('click', e => { const b = e.target.closest('[data-urut] button'); if (b) { urut = b.dataset.v; gambar(); } });
    isi.addEventListener('change', e => { if (e.target.dataset.rb !== undefined) { rbF = e.target.value; gambar(); } });
    await API.swr('progres', { periode_id: S.periodeId }, x => { if (!p.alive()) return; d = x; gambar(); }, { ttl: 8000 });
  }
});

route('/audit', {
  judul: 'Audit Log', shell: true, auth: 'staf', peran: ['kepsek', 'operator'],
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    mount(view, html`${kepalaHalaman('Keamanan', 'Audit Log', 'Riwayat perubahan penting: login darurat, perubahan pengguna, pengajuan, persetujuan, kunci, dan buka kunci rapor.')}
      <div class="card"><div class="toolbar" style="border-bottom:1px solid var(--line)"><input class="input" style="max-width:280px" placeholder="Cari aksi, pengguna, kunci…" data-cari><span class="grow"></span>
        <select class="select" style="max-width:140px" data-limit>${[200, 500, 1000].map(n => html`<option>${n}</option>`)}</select></div><div data-isi>${skeleton(6)}</div></div>`);
    let rows = [], q = '';
    const label = { SETUJUI_RAPOR: 'ok', KUNCI_RAPOR: 'ok', BUKA_KUNCI: 'err', KEMBALIKAN_RAPOR: 'warn', LOGIN_DARURAT: 'err', RESET_SANDI: 'warn', AJUKAN_RAPOR: 'info' };
    const gambar = () => {
      const t = rows.filter(r => !q || JSON.stringify(r).toLowerCase().includes(q));
      mount($('[data-isi]', view), html`<div class="tbl-wrap" style="max-height:calc(100vh - 260px)"><table class="tbl"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Entitas</th><th>Detail</th></tr></thead>
        <tbody>${t.map(r => html`<tr><td class="small" style="white-space:nowrap">${jamID(r.waktu)}</td><td class="small">${r.pengguna}</td><td><span class="badge ${label[r.aksi] || ''}">${r.aksi}</span></td>
          <td class="small">${r.entitas}<div class="xs muted mono">${r.kunci}</div></td><td class="xs muted" style="max-width:380px;word-break:break-word">${r.detail}</td></tr>`)}</tbody></table></div>
        ${!t.length ? kosong('history', 'Belum ada catatan', '') : ''}`);
    };
    const muat = async n => { rows = await API.call('auditLog', { limit: n }); if (p.alive()) gambar(); };
    $('[data-cari]', view).oninput = debounce(e => { q = e.target.value.toLowerCase(); gambar(); }, 200);
    $('[data-limit]', view).onchange = e => muat(+e.target.value);
    await muat(200);
  }
});
