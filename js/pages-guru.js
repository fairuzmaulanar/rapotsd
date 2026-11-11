/* ============================================================
   RaporKilat SD — halaman guru: Beranda, Lingkup Materi & TP,
   Grid Nilai TP & LM, Nilai Sumatif, Capaian & Deskripsi.
   ============================================================ */
'use strict';

/* ---------- Penyimpanan buku nilai (cache + perubahan tertunda) ---------- */
const BN = {
  arg: mrId => ({ mr_id: mrId, periode_id: S.periodeId }),
  kunciAntrian: mrId => 'bn|' + mrId + '|' + S.periodeId,
  /** Terapkan satu perubahan sel ke model lokal. */
  ubah(bn, ch) {
    const n = bn.nilai;
    ['tp', 'lm', 'sts', 'sas'].forEach(k => { n[k] = n[k] || {}; });
    if (ch.t === 'tp' || ch.t === 'lm') {
      n[ch.t][ch.a] = n[ch.t][ch.a] || {};
      if (ch.v === null) delete n[ch.t][ch.a][ch.k]; else n[ch.t][ch.a][ch.k] = ch.v;
    } else if (ch.v === null) delete n[ch.t][ch.a]; else n[ch.t][ch.a] = ch.v;
  },
  tumpukPending(bn) {
    Simpan.pending(BN.kunciAntrian(bn.mr.id)).forEach(ch => BN.ubah(bn, ch));
    return bn;
  },
  simpanCache(bn) { API.cacheSet('bukuNilai', BN.arg(bn.mr.id), bn); },
  muat(mrId, onData) {
    return API.swr('bukuNilai', BN.arg(mrId), (d, meta) => onData(BN.tumpukPending(JSON.parse(JSON.stringify(d))), meta), { ttl: 10000 });
  },
  kirim(bn, list, onSaved) {
    const changes = list.map(ch => [ch.t + '|' + ch.a + '|' + (ch.k || ''), ch]);
    list.forEach(ch => BN.ubah(bn, ch));
    BN.simpanCache(bn);
    Simpan.tambah(BN.kunciAntrian(bn.mr.id), 'simpanNilai', BN.arg(bn.mr.id), changes, {
      onSaved: r => { bn.updated_at = r.updated_at; BN.simpanCache(bn); if (onSaved) onSaved(r); },
      onError: () => { API.invalidate('bukuNilai'); render(); }
    });
  }
};

function barisKunci(bn) {
  const st = bn.status || {};
  if (!bn.bisaTulis) return html`<div class="alert">${ic('visibility')}<div>Mode lihat saja — Anda bukan guru pengampu mapel ini.</div></div>`;
  if (bn.kunciSAS) return html`<div class="alert warn">${ic('lock')}<div><b>Nilai terkunci.</b> Rapor semester kelas ini berstatus "${st.SAS.status}". Minta kepala sekolah mengembalikan atau operator membuka kunci untuk mengubah nilai.</div></div>`;
  if (st.SAS && st.SAS.status === 'revisi' && st.SAS.catatan) return html`<div class="alert err">${ic('feedback')}<div><b>Catatan perbaikan dari kepala sekolah:</b> ${st.SAS.catatan}</div></div>`;
  return '';
}

function ctxMapel(daftar, mr, extra = '') {
  return html`<div class="card ctxbar">
    <div class="field" style="min-width:260px"><label for="pilih-mr">Kelas & mata pelajaran</label><select class="select" id="pilih-mr" data-pilih-mr>${pilihanMr(daftar, mr.id)}</select></div>
    <div class="field"><label>Kelas / Fase</label><div class="row" style="min-height:36px"><span class="badge pri">${ic('groups', 'sm')}Kelas ${B.rombel(mr.rombel_id).nama} · Fase ${B.rombel(mr.rombel_id).fase}</span></div></div>
    <div class="field"><label>KKTP</label><div class="row" style="min-height:36px"><span class="badge dark">${mr.kktp || 75}</span></div></div>
    <span class="grow"></span>${extra}</div>`;
}
function ikatPilihMr(view) {
  const s = $('[data-pilih-mr]', view);
  if (s) s.onchange = () => { S.ctx.mr = s.value; S.simpanCtx(); render(); };
}
function tanpaMapel(view, judul) {
  mount(view, html`${kepalaHalaman('Penilaian', judul, '')}${kosong('menu_book', 'Belum ada mapel yang Anda ampu', 'Minta operator menetapkan Anda sebagai guru pengampu atau wali kelas pada menu Rombel & Pengampu.')}`);
}

/* ============================================================
   BERANDA / RINGKASAN
   ============================================================ */
route('/beranda', {
  judul: 'Ringkasan', shell: true, auth: 'staf',
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const per = B.periode();
    mount(view, html`${kepalaHalaman('Beranda', 'Halo, ' + String(S.user.nama).split(',')[0], B.periodeLabel(per) + ' · ' + (S.pengaturan.nama_sekolah || ''))}<div data-isi>${skeleton(6)}</div>`);
    if (!S.periodeId) {
      mount($('[data-isi]', view), kosong('event', 'Periode belum dibuat', 'Operator perlu membuat tahun ajaran & semester di menu Profil, Periode & Predikat.',
        S.peran('operator') ? html`<a class="btn primary" href="#/sekolah">Buka pengaturan</a>` : ''));
      return;
    }
    await API.swr('progres', { periode_id: S.periodeId }, d => { if (p.alive()) mount($('[data-isi]', view), isiBeranda(d)); }, { ttl: 15000 });
  }
});

function isiBeranda(d) {
  const admin = S.peran('operator') || S.peran('kepsek');
  const mrSaya = d.mr.filter(m => B.bisaTulisMr(B.mr(m.mr_id) || {}) && (S.peran('operator') ? false : true));
  const waliRb = d.rombel.filter(r => r.wali_id === S.user.id);
  const kartuMr = m => {
    const mp = B.mapel(m.mapel_id), rb = B.rombel(m.rombel_id);
    return html`<a class="card mcard" href="#/nilai" data-mr="${m.mr_id}">
      <div class="row between"><b class="trunc">${mp.nama}</b><span class="badge pri">${rb.nama}</span></div>
      <div class="row between small"><span class="muted">${m.adaTP ? m.terisi + '/' + m.dibutuhkan + ' sel' : 'TP belum diisi'}</span><b class="${m.persen >= 100 ? 'ok-t' : ''}">${m.persen}%</b></div>
      <div class="bar ${m.persen >= 100 ? 'ok' : ''}"><i style="width:${m.persen}%"></i></div>
      <div class="row between xs muted"><span>Rata-rata NA: <b class="pri-t">${fmt1(m.rata)}</b></span>${m.remedial ? html`<span class="err-t">${m.remedial} remedial</span>` : html`<span>${m.updated_at ? 'Diubah ' + jamID(m.updated_at) : ''}</span>`}</div></a>`;
  };
  const totalSiswa = d.rombel.reduce((s, r) => s + r.jumlah, 0);
  const cnt = st => d.rombel.filter(r => r.status.SAS.status === st).length;
  const rataProg = d.rombel.length ? Math.round(d.rombel.reduce((s, r) => s + r.persen, 0) / d.rombel.length) : 0;
  const ceklist = S.peran('operator') ? [
    [!!S.pengaturan.nama_sekolah && S.pengaturan.nama_sekolah !== 'SD Contoh', 'Isi profil sekolah & kepala sekolah', '#/sekolah'],
    [S.boot.pengguna.length > 1, 'Tambahkan akun guru & kepala sekolah', '#/pengguna'],
    [totalSiswa > 0, 'Impor data siswa ke rombel', '#/siswa'],
    [d.rombel.length > 0 && d.rombel.every(r => r.wali_id), 'Buat rombel & tetapkan wali kelas', '#/rombel'],
    [d.mr.length > 0 && d.mr.every(m => m.guru_id), 'Tetapkan guru pengampu tiap mapel', '#/rombel']] : [];
  return html`
    ${ceklist.length && ceklist.some(c => !c[0]) ? html`<div class="card pad mb-12"><h3 class="row">${ic('rocket_launch')}Langkah persiapan</h3>
      <div class="col mt-12">${ceklist.map(c => html`<a class="row" href="${c[2]}">${ic(c[0] ? 'check_circle' : 'radio_button_unchecked', c[0] ? 'ok-t' : 'muted')}<span class="${c[0] ? 'muted' : 'bold'}">${c[1]}</span></a>`)}</div></div>` : ''}
    ${admin ? html`<div class="kpis mb-12">
      <div class="card kpi"><div class="k-l">Rombel & siswa<span class="k-ic">${ic('groups', 'sm')}</span></div><div class="k-v">${d.rombel.length}</div><div class="k-s">${totalSiswa} siswa aktif</div></div>
      <div class="card kpi"><div class="k-l">Progres input<span class="k-ic">${ic('trending_up', 'sm')}</span></div><div class="k-v">${rataProg}%</div><div class="bar mt-8"><i style="width:${rataProg}%"></i></div></div>
      <div class="card kpi"><div class="k-l">Menunggu persetujuan<span class="k-ic">${ic('pending_actions', 'sm')}</span></div><div class="k-v pri-t">${cnt('diajukan')}</div><div class="k-s">rombel diajukan wali kelas</div></div>
      <div class="card kpi"><div class="k-l">Disetujui / terkunci<span class="k-ic">${ic('verified', 'sm')}</span></div><div class="k-v ok-t">${cnt('disetujui') + cnt('terkunci')}</div><div class="k-s">${cnt('revisi')} perlu perbaikan</div></div></div>` : ''}
    ${waliRb.length ? html`<div class="card pad mb-12"><div class="row between wrap"><h3 class="row">${ic('co_present')}Kelas perwalian</h3></div>
      <div class="mcards mt-12">${waliRb.map(r => html`<div class="card mcard" style="box-shadow:none;border:1px solid var(--line)">
        <div class="row between"><b>Kelas ${r.nama}</b>${badgeStatus(r.status.SAS.status)}</div>
        <div class="small muted">${r.jumlah} siswa · progres nilai ${r.persen}% ${r.mapelTanpaTP ? '· ' + r.mapelTanpaTP + ' mapel belum ada TP' : ''}</div>
        <div class="bar"><i style="width:${r.persen}%"></i></div>
        ${r.status.SAS.status === 'revisi' && r.status.SAS.catatan ? html`<div class="alert err small">${ic('feedback', 'sm')}<span>${r.status.SAS.catatan}</span></div>` : ''}
        <div class="row wrap"><a class="btn sm" href="#/kelas" data-rb="${r.id}">Absensi & catatan</a><a class="btn sm" href="#/kokurikuler" data-rb="${r.id}">Kokurikuler</a><a class="btn sm primary" href="#/rapor" data-rb="${r.id}">Leger & rapor</a></div></div>`)}</div></div>` : ''}
    ${mrSaya.length ? html`<div class="card pad mb-12"><h3 class="row">${ic('grid_on')}Mapel yang saya ampu</h3><div class="mcards mt-12">${mrSaya.map(kartuMr)}</div></div>` : ''}
    ${admin ? html`<div class="card"><div class="card-h"><h3>${ic('monitoring')}Progres per rombel</h3><a class="btn sm ghost" href="#/monitoring">Detail</a></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Rombel</th><th>Wali kelas</th><th class="c">Siswa</th><th style="min-width:160px">Progres nilai</th><th class="c">Rata NA</th><th>Status rapor</th></tr></thead>
      <tbody>${d.rombel.map(r => html`<tr><td><b>Kelas ${r.nama}</b> <span class="badge">Fase ${r.fase}</span></td><td>${B.user(r.wali_id).nama || html`<span class="err-t small">Belum ditetapkan</span>`}</td>
        <td class="c">${r.jumlah}</td><td><div class="row"><div class="bar grow"><i style="width:${r.persen}%"></i></div><span class="small bold">${r.persen}%</span></div></td>
        <td class="c">${fmt1(r.rata)}</td><td>${badgeStatus(r.status.SAS.status)}</td></tr>`)}</tbody></table></div>
      ${!d.rombel.length ? kosong('meeting_room', 'Belum ada rombel', 'Operator membuat rombel di menu Rombel & Pengampu.') : ''}</div>` : ''}
    ${!admin && !mrSaya.length && !waliRb.length ? kosong('hourglass_empty', 'Belum ada tugas', 'Anda belum ditetapkan sebagai pengampu mapel atau wali kelas pada periode ini.') : ''}`;
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-mr]');
  if (a) { S.ctx.mr = a.dataset.mr; S.simpanCtx(); }
  const b = e.target.closest('[data-rb]');
  if (b) { S.ctx.rombel = b.dataset.rb; S.simpanCtx(); }
  const sc = e.target.closest('[data-scroll]');
  if (sc) { e.preventDefault(); const t = document.getElementById(sc.dataset.scroll); if (t) t.scrollIntoView({ behavior: 'smooth' }); }
}, true);

/* ============================================================
   LINGKUP MATERI & TUJUAN PEMBELAJARAN
   ============================================================ */
route('/tp', {
  judul: 'Lingkup Materi & TP', shell: true, auth: 'staf',
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const { daftar, mr } = mrAktif();
    if (!mr) return tanpaMapel(view, 'Lingkup Materi & Tujuan Pembelajaran');
    mount(view, html`${kepalaHalaman('Penilaian · Perencanaan', 'Lingkup Materi & Tujuan Pembelajaran', 'Teks TP dipakai langsung untuk menyusun deskripsi rapor. Tulis dengan kata kerja operasional, tanpa titik di akhir.')}
      ${ctxMapel(daftar, mr)}<div data-isi>${skeleton(5)}</div>`);
    ikatPilihMr(view);
    let lm = null, kotor = false, bn = null;
    const isi = () => $('[data-isi]', view);
    const gambar = () => {
      const kunci = !bn.bisaTulis || bn.kunciSAS;
      const jmlTP = lm.reduce((s, l) => s + l.tp.length, 0);
      mount(isi(), html`${barisKunci(bn)}
        <div class="col gap-12 mt-12">${lm.map((l, i) => html`<div class="card" data-lm="${i}">
          <div class="card-h"><div class="row grow"><span class="tag-lm">LM ${i + 1}</span>
            <input class="input" style="max-width:520px" data-f="nama" value="${l.nama}" placeholder="Nama lingkup materi, mis. Bilangan Cacah" ${kunci ? raw('disabled') : ''}></div>
            ${kunci ? '' : html`<div class="row"><button class="btn icon sm ghost" data-a="naik" title="Naikkan" ${i === 0 ? raw('disabled') : ''}>${ic('arrow_upward', 'sm')}</button>
            <button class="btn icon sm ghost" data-a="turun" title="Turunkan" ${i === lm.length - 1 ? raw('disabled') : ''}>${ic('arrow_downward', 'sm')}</button>
            <button class="btn icon sm ghost" data-a="hapusLM" title="Hapus lingkup materi">${ic('delete', 'sm err-t')}</button></div>`}</div>
          <div class="pad col">${l.tp.map((t, j) => html`<div class="row" data-tp="${j}" style="align-items:flex-start">
            <input class="input" style="width:72px" data-f="kode" value="${t.kode || (i + 1) + '.' + (j + 1)}" title="Kode TP" ${kunci ? raw('disabled') : ''}>
            <textarea class="textarea grow" style="min-height:40px" rows="1" data-f="d" placeholder="Contoh: Membaca dan menulis bilangan cacah sampai 10.000" ${kunci ? raw('disabled') : ''}>${t.d}</textarea>
            ${kunci ? '' : html`<button class="btn icon sm ghost" data-a="hapusTP" title="Hapus TP">${ic('close', 'sm')}</button>`}</div>`)}
            ${kunci ? '' : html`<button class="btn sm ghost" data-a="tambahTP" style="align-self:flex-start">${ic('add', 'sm')}Tambah TP</button>`}</div></div>`)}
          ${!lm.length ? kosong('checklist', 'Belum ada lingkup materi', 'Tambahkan lingkup materi dan TP, salin dari kelas lain, atau tempel daftar TP.') : ''}</div>
        ${kunci ? '' : html`<div class="actionbar">
          <div class="row wrap"><button class="btn ghost" data-a="tambahLM">${ic('add_box', 'sm')}Tambah Lingkup Materi</button>
            <button class="btn ghost" data-a="tempel">${ic('content_paste', 'sm')}Tempel daftar TP</button>
            <button class="btn ghost" data-a="salin">${ic('content_copy', 'sm')}Salin dari kelas lain</button></div>
          <div class="row"><span class="small ${kotor ? 'warn-t bold' : 'muted'}">${kotor ? 'Ada perubahan belum disimpan' : lm.length + ' LM · ' + jmlTP + ' TP'}</span>
            <button class="btn primary" data-a="simpan" ${kotor ? '' : raw('disabled')}>${ic('save', 'sm')}Simpan TP</button></div></div>`}`);
    };
    const tandai = () => { if (!kotor) { kotor = true; const b = $('[data-a=simpan]', view); if (b) { b.disabled = false; b.previousElementSibling.textContent = 'Ada perubahan belum disimpan'; b.previousElementSibling.className = 'small warn-t bold'; } } };
    isi().addEventListener('input', e => {
      const f = e.target.dataset.f; if (!f) return;
      const li = +e.target.closest('[data-lm]').dataset.lm;
      if (f === 'nama') lm[li].nama = e.target.value;
      else { const ti = +e.target.closest('[data-tp]').dataset.tp; lm[li].tp[ti][f] = e.target.value; }
      tandai();
    });
    isi().addEventListener('click', async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a, lmEl = b.closest('[data-lm]'), li = lmEl ? +lmEl.dataset.lm : -1;
      if (a === 'tambahLM') { lm.push({ nama: '', tp: [{ kode: '', d: '' }] }); kotor = true; gambar(); $$('[data-lm]', view).pop().querySelector('input').focus(); }
      if (a === 'tambahTP') { lm[li].tp.push({ kode: '', d: '' }); kotor = true; gambar(); const tps = $$(`[data-lm="${li}"] textarea`, view); tps[tps.length - 1].focus(); }
      if (a === 'hapusTP') { const ti = +b.closest('[data-tp]').dataset.tp; lm[li].tp.splice(ti, 1); kotor = true; gambar(); }
      if (a === 'hapusLM') { if (await konfirmasi('Hapus lingkup materi?', 'Nilai TP di dalamnya juga akan terhapus setelah disimpan.', 'Hapus', 'danger')) { lm.splice(li, 1); kotor = true; gambar(); } }
      if (a === 'naik' || a === 'turun') { const j = a === 'naik' ? li - 1 : li + 1; [lm[li], lm[j]] = [lm[j], lm[li]]; kotor = true; gambar(); }
      if (a === 'tempel') {
        const t = await modal({ judul: 'Tempel daftar TP', lebar: 'wide', isi: html`<p class="small muted">Satu baris = satu TP. Baris yang diawali <b>#</b> menjadi nama lingkup materi baru. Bisa disalin dari dokumen ATP/modul ajar.</p>
          <textarea class="textarea" name="t" rows="12" placeholder="# Bilangan Cacah&#10;Membaca dan menulis bilangan cacah sampai 10.000&#10;Membandingkan dan mengurutkan bilangan cacah&#10;# Pecahan&#10;Mengenal pecahan senilai"></textarea>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Tambahkan', kelas: 'primary', onClick: bg => $('[name=t]', bg).value }] });
        if (!t) return;
        let cur = null;
        t.split('\n').map(s => s.trim()).filter(Boolean).forEach(s => {
          if (s.startsWith('#')) { cur = { nama: s.replace(/^#+\s*/, ''), tp: [] }; lm.push(cur); }
          else { if (!cur) { cur = { nama: 'Lingkup Materi ' + (lm.length + 1), tp: [] }; lm.push(cur); } cur.tp.push({ kode: '', d: s.replace(/^[\d.\-•)\s]+/, '').replace(/\.$/, '') }); }
        });
        kotor = true; gambar();
      }
      if (a === 'salin') {
        const lain = B.mrSaya().filter(m => m.id !== mr.id);
        const sama = lain.filter(m => m.mapel_id === mr.mapel_id);
        const v = await modal({ judul: 'Salin TP dari kelas/semester lain', isi: html`<div class="col">
          <div class="field"><label>Sumber</label><select class="select" name="sumber">${pilihanMr(sama.length ? sama.concat(lain.filter(m => !sama.includes(m))) : lain, (sama[0] || {}).id)}</select></div>
          <div class="field"><label>Periode sumber</label><select class="select" name="periode">${S.boot.periode.map(pr => html`<option value="${pr.id}" ${pr.id === S.periodeId ? raw('selected') : ''}>${B.periodeLabel(pr)}</option>`)}</select></div>
          <label class="check"><input type="checkbox" name="timpa">Timpa TP yang sudah ada (nilai TP lama akan dihapus)</label></div>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Salin', kelas: 'primary', onClick: async bg => {
            const f = nilaiForm(bg);
            const r = await API.call('salinTP', { mr_id: mr.id, periode_id: S.periodeId, sumber_mr_id: f.sumber, sumber_periode_id: f.periode, timpa: f.timpa });
            return r; } }] });
        if (v) { toast('TP berhasil disalin.', 'ok'); API.invalidate('bukuNilai'); render(); }
      }
      if (a === 'simpan') {
        const bersih = lm.map(l => ({ id: l.id, nama: l.nama.trim(), tp: l.tp.filter(t => String(t.d).trim()).map(t => ({ id: t.id, kode: String(t.kode || '').trim(), d: String(t.d).trim() })) }))
          .filter(l => l.nama || l.tp.length);
        if (bersih.some(l => !l.nama)) return toast('Setiap lingkup materi wajib diberi nama.', 'err');
        b.classList.add('busy');
        try {
          const r = await API.call('simpanTP', { mr_id: mr.id, periode_id: S.periodeId, lm: bersih });
          bn.lm = r.lm; BN.simpanCache(bn);
          lm = JSON.parse(JSON.stringify(r.lm)); kotor = false; gambar();
          toast('Lingkup materi & TP tersimpan.', 'ok');
        } catch (ex) { toast(ex.message, 'err'); }
        finally { b.classList.remove('busy'); }
      }
    });
    await BN.muat(mr.id, d => {
      if (!p.alive() || kotor) return;
      bn = d; lm = JSON.parse(JSON.stringify(d.lm || []));
      if (!lm.length && d.bisaTulis && !d.kunciSAS) lm = [{ nama: '', tp: [{ kode: '', d: '' }] }];
      gambar();
    });
  }
});

/* ============================================================
   GRID NILAI TP & LM
   ============================================================ */
function panelDeskripsi(bn, mr, row) {
  if (!row) return kosong('touch_app', 'Pilih siswa', 'Klik baris siswa untuk melihat deskripsi rapornya.');
  const h = Hitung.siswa(bn, mr, row.id, Hitung.opsi(row));
  const kelas = Hitung.kelasPredikat(h.predikat);
  return html`<div class="card"><div class="card-h"><h3>${ic('auto_stories')}Inspeksi Deskripsi Rapor</h3><span class="badge ${h.manual ? 'warn' : 'ok'}">${h.manual ? 'Manual' : 'Otomatis'}</span></div>
    <div class="pad col gap-12">
      <div class="row"><span class="av" style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:grid;place-items:center;font-weight:700;font-size:12px">${initials(row.nama)}</span>
        <div class="grow"><b>${row.nama}</b><div class="xs muted">NISN ${row.nisn || '–'} · Absen ${row.no_absen}</div></div>
        <div class="right"><div class="score ${h.tuntas === false ? 'err' : kelas === 'ok' ? 'ok' : ''}">${h.na === null ? '–' : h.na}</div><div class="xs muted">Nilai akhir</div></div></div>
      ${h.tpMax ? html`<div class="card pad" style="box-shadow:none;background:var(--surface-2)"><div class="row between"><span class="lbl ok-t">${ic('arrow_circle_up', 'sm')} Capaian tertinggi (${h.tpMax.n})</span><span class="tag-tp">TP ${h.tpMax.kode}</span></div><p class="small mt-8"><i>${h.autoH}</i></p></div>` : html`<div class="alert">${ic('info')}<span>Isi nilai TP untuk menyusun deskripsi.</span></div>`}
      ${h.tpMin && h.autoL ? html`<div class="card pad" style="box-shadow:none;background:var(--surface-2)"><div class="row between"><span class="lbl ${h.tpMin.n < Number(mr.kktp) ? 'err-t' : 'pri-t'}">${ic('arrow_circle_down', 'sm')} Capaian terendah (${h.tpMin.n})</span><span class="tag-tp">TP ${h.tpMin.kode}</span></div><p class="small mt-8"><i>${h.autoL}</i></p>
        <div class="xs muted mt-8">${h.tpMin.n < Number(mr.kktp) ? 'Di bawah KKTP (' + mr.kktp + ') → kalimat bimbingan.' : 'Di atas KKTP (' + mr.kktp + ') → tidak perlu kalimat bimbingan.'}</div></div>` : ''}
      <div><div class="lbl mb-8">Kalimat rapor (siap cetak)</div><div class="card pad small" style="box-shadow:none;background:var(--surface-3)">${h.deskripsi || html`<span class="muted">–</span>`}</div></div>
      ${bn.bisaTulis && !bn.kunciSAS ? html`<div class="row"><button class="btn grow" data-ubah-desk="${row.id}">${ic('edit', 'sm')}Ubah narasi</button>
        ${h.manual ? html`<button class="btn ghost" data-reset-desk="${row.id}">${ic('restart_alt', 'sm')}Otomatis</button>` : ''}</div>` : ''}</div></div>`;
}

async function ubahDeskripsi(bn, mr, siswa, selesai) {
  const h = Hitung.siswa(bn, mr, siswa.id, Hitung.opsi(siswa));
  const v = await modal({ judul: 'Ubah deskripsi — ' + siswa.nama, lebar: 'wide', isi: html`<div class="col gap-12">
    <div class="alert">${ic('info')}<span>Deskripsi manual tidak berubah otomatis saat nilai berubah. Klik "Kembalikan otomatis" untuk memakai kalimat sistem lagi.</span></div>
    <div class="field"><label>Kalimat capaian tertinggi</label><textarea class="textarea" name="h" rows="3">${h.deskH}</textarea><span class="hint">Usulan sistem: ${h.autoH || '–'}</span></div>
    <div class="field"><label>Kalimat capaian terendah / bimbingan (boleh kosong)</label><textarea class="textarea" name="l" rows="3">${h.deskL}</textarea><span class="hint">Usulan sistem: ${h.autoL || '–'}</span></div></div>`,
    aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan deskripsi', kelas: 'primary', onClick: async bg => {
      const f = nilaiForm(bg);
      if (!f.h.trim()) throw new Error('Kalimat capaian tertinggi tidak boleh kosong.');
      return API.call('simpanDeskripsi', { mr_id: mr.id, periode_id: S.periodeId, anggota_id: siswa.id, h: f.h, l: f.l });
    } }] });
  if (v) { bn.desk = v.desk; BN.simpanCache(bn); toast('Deskripsi disimpan.', 'ok'); selesai(); }
}
async function resetDeskripsi(bn, mr, siswa, selesai) {
  const r = await API.call('simpanDeskripsi', { mr_id: mr.id, periode_id: S.periodeId, anggota_id: siswa.id, h: '' });
  bn.desk = r.desk; BN.simpanCache(bn); toast('Kembali ke deskripsi otomatis.', 'ok'); selesai();
}

route('/nilai', {
  judul: 'Grid Nilai TP & LM', shell: true, auth: 'staf',
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const { daftar, mr } = mrAktif();
    if (!mr) return tanpaMapel(view, 'Grid Nilai TP & LM');
    mount(view, html`${kepalaHalaman('Penilaian · Formatif & sumatif lingkup materi', 'Grid Nilai TP & LM', '')}
      ${ctxMapel(daftar, mr, html`<div class="field"><label>Progres input</label><div class="row" style="min-height:36px" data-prog><span class="skel" style="width:120px;height:8px"></span></div></div>`)}
      <div data-isi>${skeleton(8)}</div>`);
    ikatPilihMr(view);
    let bn = null, grid = null, rowSel = null;
    const isi = () => $('[data-isi]', view);

    const kolom = () => {
      const cols = [
        { key: 'no_absen', label: 'No', thCls: 'stk s0', tdCls: 'stk s0' },
        { key: 'nama', label: 'Nama siswa', thCls: 'stk s1', tdCls: 'stk s1' }];
      const groups = [{ label: 'Identitas siswa', span: 2, cls: 'stk s0' }];
      const tampilLM = Number(bn.mr.bobot_lm) > 0;
      bn.lm.forEach((l, i) => {
        let span = 0;
        l.tp.forEach(t => {
          cols.push({ label: raw(`<span class="tpk">TP ${esc(t.kode)}</span>`), sub: t.d, title: 'TP ' + t.kode + ': ' + t.d, edit: true, validasi: validasiNilai,
            val: r => ((bn.nilai.tp || {})[r.id] || {})[t.id], t: 'tp', k: t.id,
            cls: (r, v) => v !== undefined && v !== null && Number(v) < Number(bn.mr.kktp) ? 'low' : '' });
          span++;
        });
        if (tampilLM) { cols.push({ label: 'S.LM', title: 'Sumatif lingkup materi ' + l.nama, edit: true, validasi: validasiNilai, val: r => ((bn.nilai.lm || {})[r.id] || {})[l.id], t: 'lm', k: l.id }); span++; }
        cols.push({ label: 'Rata', title: 'Rata-rata TP lingkup materi', tdCls: 'calc', val: r => Hitung.rataLMSiswa(bn, r.id, l.id), tampil: v => v === null ? '–' : fmt1(v) });
        groups.push({ label: 'LM ' + (i + 1) + ': ' + l.nama, span: span + 1, cls: 'lmh', title: l.nama });
      });
      cols.push({ label: 'NA', title: 'Nilai akhir (rumus bobot)', tdCls: 'na', val: r => Hitung.siswa(bn, bn.mr, r.id, Hitung.opsi(r)).na,
        tampil: v => v === null ? '–' : v, cls: (r, v) => v !== null && v < Number(bn.mr.kktp) ? 'low' : '' });
      cols.push({ label: 'Predikat', raw: true, val: r => Hitung.siswa(bn, bn.mr, r.id, Hitung.opsi(r)).predikat,
        tampil: v => v ? `<span class="badge ${Hitung.kelasPredikat(v)}">${esc(v)}</span>` : '<span class="muted">–</span>' });
      cols.push({ label: 'Status', raw: true, val: r => r, tampil: (v, r) => {
        const h = Hitung.siswa(bn, bn.mr, r.id, Hitung.opsi(r));
        if (h.tpTerisi < h.tpTotal) return `<span class="xs err-t">Kurang ${h.tpTotal - h.tpTerisi} TP</span>`;
        if (h.tuntas === false) return '<span class="xs err-t">Perlu remedial</span>';
        return h.manual ? '<span class="xs warn-t">Deskripsi manual</span>' : '<span class="xs ok-t">Siap</span>';
      } });
      groups.push({ label: 'Kalkulasi akhir', span: 3 });
      return { cols, groups };
    };
    const progres = () => {
      let ter = 0, dib = 0;
      const nTP = bn.lm.reduce((s, l) => s + l.tp.length, 0);
      bn.siswa.forEach(r => { const h = Hitung.siswa(bn, bn.mr, r.id, Hitung.opsi(r)); ter += h.tpTerisi; dib += nTP; });
      const pc = dib ? Math.round(ter / dib * 100) : 0;
      mount($('[data-prog]', view), html`<div class="bar" style="width:120px"><i style="width:${pc}%"></i></div><b class="small">${pc}%</b><span class="xs muted">${ter}/${dib} sel</span>`);
      const nas = bn.siswa.map(r => Hitung.siswa(bn, bn.mr, r.id, Hitung.opsi(r)).na).filter(x => x !== null);
      const f = $('[data-foot]', view);
      if (f) mount(f, html`<span>${bn.siswa.length} siswa</span><span>Rata-rata kelas: <b class="pri-t">${nas.length ? fmt1(nas.reduce((a, b) => a + b, 0) / nas.length) : '–'}</b></span>
        <span>Tertinggi: <b class="ok-t">${nas.length ? Math.max(...nas) : '–'}</b></span><span>Terendah: <b class="err-t">${nas.length ? Math.min(...nas) : '–'}</b></span>`);
    };
    const panel = () => {
      const sp = $('[data-panel]', view);
      if (!sp) return;
      mount(sp, panelDeskripsi(bn, bn.mr, rowSel));
      const u = $('[data-ubah-desk]', sp), rs = $('[data-reset-desk]', sp);
      if (u) u.onclick = () => ubahDeskripsi(bn, bn.mr, rowSel, () => { panel(); grid.refreshAll(); });
      if (rs) rs.onclick = () => resetDeskripsi(bn, bn.mr, rowSel, () => { panel(); grid.refreshAll(); });
    };
    const gambar = () => {
      if (!bn.lm.length) {
        mount(isi(), html`${barisKunci(bn)}${kosong('checklist', 'Belum ada TP untuk mapel ini', 'Isi lingkup materi & tujuan pembelajaran terlebih dahulu.', html`<a class="btn primary" href="#/tp">${ic('add', 'sm')}Isi TP sekarang</a>`)}`);
        progres(); return;
      }
      mount(isi(), html`${barisKunci(bn)}
        <div class="split mt-12"><div class="card" style="overflow:hidden">
          <div class="toolbar" style="border-bottom:1px solid var(--line)">
            <span class="badge info">${ic('keyboard', 'sm')}Panah / Enter / Tab pindah sel · ketik angka langsung · Ctrl+V tempel dari Excel</span>
            <span class="grow"></span>
            <input class="input" style="max-width:220px" placeholder="Cari siswa / NISN" data-cari>
            <button class="btn sm ghost" data-unduh>${ic('download', 'sm')}Template .xlsx</button>
            ${bn.bisaTulis && !bn.kunciSAS ? html`<button class="btn sm ghost" data-impor>${ic('upload_file', 'sm')}Impor .xlsx</button>` : ''}
            <a class="btn sm ghost" href="#/tp">${ic('view_column', 'sm')}Kelola TP</a></div>
          <div data-grid></div>
          <div class="toolbar small muted" style="border-top:1px solid var(--line);justify-content:space-between" data-foot></div></div>
          <div class="side-panel" data-panel></div></div>
        <div class="actionbar"><div class="row wrap small muted"><span class="bold" style="color:var(--ink)">${ic('keyboard_command_key', 'sm')} Pintasan:</span>
          <kbd>Enter/Tab</kbd> pindah <kbd>Ctrl+V</kbd> tempel <kbd>Ctrl+Z</kbd> batal <kbd>Del</kbd> hapus <kbd>Esc</kbd> batalkan ketikan</div>
          <a class="btn primary" href="#/sumatif">Lanjut ke Nilai Sumatif ${ic('arrow_forward', 'sm')}</a></div>`);
      const { cols, groups } = kolom();
      rowSel = rowSel ? bn.siswa.find(s => s.id === rowSel.id) || bn.siswa[0] : bn.siswa[0];
      grid = new SheetGrid($('[data-grid]', view), {
        groups, cols, rows: bn.siswa, kunci: !bn.bisaTulis || bn.kunciSAS,
        onEdit: list => {
          BN.kirim(bn, list.map(x => ({ t: x.col.t, a: x.row.id, k: x.col.k, v: x.value })), () => {});
          progres(); if (list.some(x => x.row === rowSel)) panel();
        },
        onPilih: row => { rowSel = row; panel(); }
      });
      grid.r = Math.max(0, bn.siswa.indexOf(rowSel)); grid.paint();
      $('[data-cari]', view).oninput = debounce(e => {
        const q = e.target.value.toLowerCase().trim();
        $$('tbody tr', $('[data-grid]', view)).forEach(tr => { const r = bn.siswa[+tr.dataset.ri]; tr.style.display = !q || (r.nama + ' ' + (r.nisn || '')).toLowerCase().includes(q) ? '' : 'none'; });
      }, 150);
      $('[data-unduh]', view).onclick = () => templateNilai(bn);
      const imp = $('[data-impor]', view);
      if (imp) imp.onclick = () => imporNilai(bn, grid, () => { progres(); panel(); });
      progres(); panel();
    };
    await BN.muat(mr.id, d => {
      if (!p.alive()) return;
      const sama = bn && grid && JSON.stringify(bn.lm) === JSON.stringify(d.lm) && bn.siswa.length === d.siswa.length && bn.kunciSAS === d.kunciSAS;
      bn = d;
      if (sama) { grid.o.rows = bn.siswa; grid.refreshAll(); progres(); panel(); }
      else gambar();
    });
  }
});

/* ---------- Template & impor nilai via .xlsx ---------- */
async function templateNilai(bn) {
  await Lazy('js/xlsx-lite.js');
  const tp = [];
  bn.lm.forEach(l => l.tp.forEach(t => tp.push(t)));
  const rows = [['ID (jangan diubah)', 'No', 'NISN', 'Nama', ...tp.map(t => 'TP ' + t.kode)]];
  bn.siswa.forEach(s => rows.push([s.id, s.no_absen, s.nisn || '', s.nama, ...tp.map(t => { const v = ((bn.nilai.tp || {})[s.id] || {})[t.id]; return v === undefined ? '' : v; })]));
  const ket = [['Kode', 'Tujuan pembelajaran'], ...tp.map(t => ['TP ' + t.kode, t.d])];
  await XLSXLite.unduh(`Nilai_${B.mapel(bn.mr.mapel_id).singkatan || 'Mapel'}_${bn.rombel.nama}.xlsx`, [{ nama: 'Nilai', rows }, { nama: 'Keterangan TP', rows: ket }]);
}
async function imporNilai(bn, grid, selesai) {
  await Lazy('js/xlsx-lite.js');
  const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.xlsx' });
  inp.onchange = async () => {
    try {
      const sheets = await XLSXLite.baca(inp.files[0]);
      const rows = sheets[0].rows;
      const head = rows[0].map(x => String(x || '').trim());
      const tpBy = {};
      bn.lm.forEach(l => l.tp.forEach(t => { tpBy['TP ' + t.kode] = t.id; }));
      const changes = [];
      let tolak = 0;
      rows.slice(1).forEach(r => {
        const aid = String(r[0] || '').trim();
        const s = bn.siswa.find(x => x.id === aid) || bn.siswa.find(x => x.nisn && String(x.nisn) === String(r[2]).trim());
        if (!s) return;
        head.forEach((h, j) => {
          if (!tpBy[h]) return;
          const v = r[j] === '' || r[j] === null || r[j] === undefined ? null : validasiNilai(r[j]);
          if (v && v.error) { tolak++; return; }
          changes.push({ t: 'tp', a: s.id, k: tpBy[h], v: v ? v.value : null });
        });
      });
      if (!changes.length) return toast('Tidak ada nilai yang cocok di file.', 'warn');
      BN.kirim(bn, changes);
      grid.refreshAll(); selesai();
      toast(changes.length + ' nilai diimpor' + (tolak ? ', ' + tolak + ' sel tidak valid dilewati' : '') + '.', 'ok');
    } catch (e) { toast(e.message, 'err', 'Gagal membaca file'); }
  };
  inp.click();
}

/* ============================================================
   NILAI SUMATIF (STS/SAS) & NILAI AKHIR
   ============================================================ */
route('/sumatif', {
  judul: 'Nilai Sumatif', shell: true, auth: 'staf',
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const { daftar, mr } = mrAktif();
    if (!mr) return tanpaMapel(view, 'Nilai Sumatif (STS/SAS)');
    mount(view, html`${kepalaHalaman('Penilaian · Sumatif & nilai akhir', 'Nilai Sumatif (STS/SAS) & NA Mapel', '')}${ctxMapel(daftar, mr)}<div data-isi>${skeleton(8)}</div>`);
    ikatPilihMr(view);
    let bn = null, grid = null;
    const isi = () => $('[data-isi]', view);
    const hit = r => Hitung.siswa(bn, bn.mr, r.id, Hitung.opsi(r));
    const statistik = () => {
      const sp = $('[data-stat]', view); if (!sp) return;
      const hs = bn.siswa.map(r => ({ r, h: hit(r) }));
      const nas = hs.map(x => x.h.na).filter(x => x !== null);
      const kktp = Number(bn.mr.kktp);
      const rem = hs.filter(x => x.h.na !== null && x.h.na < kktp);
      const tuntas = nas.length - rem.length;
      const dist = {};
      (S.boot.predikat || []).forEach(pr => { dist[pr.label] = 0; });
      hs.forEach(x => { if (x.h.predikat) dist[x.h.predikat] = (dist[x.h.predikat] || 0) + 1; });
      const tpLengkap = hs.filter(x => x.h.tpTerisi === x.h.tpTotal && x.h.tpTotal).length;
      const sasLengkap = hs.filter(x => x.h.sas !== null).length, stsLengkap = hs.filter(x => x.h.sts !== null).length;
      mount(sp, html`<div class="card"><div class="card-h"><h3>${ic('analytics')}Statistik kelas</h3><span class="xs muted">Rerata NA</span></div><div class="pad col gap-12">
        <div class="row between"><div><div class="k-v pri-t" style="font-family:var(--f-head);font-size:30px;font-weight:700">${nas.length ? fmt1(nas.reduce((a, b) => a + b, 0) / nas.length) : '–'}</div><div class="xs muted">Rata-rata nilai akhir</div></div>
          <div class="right small">Tertinggi <b class="ok-t">${nas.length ? Math.max(...nas) : '–'}</b><br>Terendah <b class="err-t">${nas.length ? Math.min(...nas) : '–'}</b></div></div>
        <div><div class="row between small"><span>Ketuntasan KKTP (${kktp})</span><b class="ok-t">${nas.length ? Math.round(tuntas / nas.length * 100) : 0}%</b></div>
          <div class="bar mt-8"><i style="width:${nas.length ? tuntas / nas.length * 100 : 0}%;background:var(--ok)"></i><i style="width:${nas.length ? rem.length / nas.length * 100 : 0}%;background:var(--err);border-radius:0"></i></div>
          <div class="row between xs mt-8"><span class="ok-t">${tuntas} tuntas</span><span class="err-t">${rem.length} remedial</span></div></div>
        <div><div class="lbl mb-8">Distribusi predikat</div>${Object.keys(dist).map(k => html`<div class="row small" style="margin:4px 0"><span class="grow">${k}</span><div class="bar" style="width:90px"><i style="width:${hs.length ? dist[k] / hs.length * 100 : 0}%"></i></div><b class="num" style="width:20px;text-align:right">${dist[k]}</b></div>`)}</div></div></div>
        ${rem.length ? html`<div class="card" style="border-left:4px solid var(--err)"><div class="card-h"><h3 class="err-t">${ic('warning')}Perlu remedial (${rem.length})</h3><span class="badge err">NA &lt; ${kktp}</span></div>
          <div class="pad col gap-4">${rem.map(x => html`<div class="row between small" style="padding:6px 8px;background:var(--err-50);border-radius:6px"><b class="trunc">${x.r.nama}</b><span class="err-t">NA ${x.h.na} · SAS ${x.h.sas === null ? '–' : x.h.sas}</span></div>`)}</div></div>` : ''}
        <div class="card"><div class="card-h"><h3>${ic('checklist_rtl')}Kesiapan rapor</h3></div><div class="pad col gap-4 small">
          ${[[tpLengkap === hs.length, 'Nilai TP lengkap (' + tpLengkap + '/' + hs.length + ')'], [stsLengkap === hs.length, 'STS lengkap (' + stsLengkap + '/' + hs.length + ')'], [sasLengkap === hs.length, 'SAS lengkap (' + sasLengkap + '/' + hs.length + ')']]
            .map(c => html`<div class="row">${ic(c[0] ? 'check_circle' : 'pending', 'sm ' + (c[0] ? 'ok-t' : 'warn-t'))}<span>${c[1]}</span></div>`)}</div></div>`);
    };
    const gambar = () => {
      const kunciAS = !bn.bisaTulis || bn.kunciSAS, kunciTS = !bn.bisaTulis || bn.kunciSTS;
      const tot = (Number(bn.mr.bobot_tp) || 0) + (Number(bn.mr.bobot_lm) || 0) + (Number(bn.mr.bobot_as) || 0) || 1;
      const persen = k => Math.round((Number(bn.mr[k]) || 0) / tot * 100);
      mount(isi(), html`${barisKunci(bn)}
        <div class="card pad mt-12"><div class="row between wrap"><h3 class="row">${ic('functions')}Rumus & bobot nilai akhir</h3>
          ${bn.bisaTulis && !bn.kunciSAS ? html`<button class="btn sm ghost" data-bobot>${ic('tune', 'sm')}Sesuaikan bobot & KKTP</button>` : ''}</div>
          <div class="grid3 mt-12" style="grid-template-columns:2fr 1fr 1fr 1fr">
            <div class="card pad" style="box-shadow:none;background:var(--surface-2)"><div class="lbl">Rumus NA</div><div class="mono small pri-t bold mt-8">NA = (Rerata TP × b_TP + Rerata LM × b_LM + SAS × b_AS) ÷ Σ bobot terisi</div></div>
            ${[['bobot_tp', 'Bobot TP'], ['bobot_lm', 'Bobot LM'], ['bobot_as', 'Bobot SAS']].map(b => html`<div class="card pad center" style="box-shadow:none;background:var(--surface-2)"><div class="lbl">${b[1]}</div><div style="font-size:22px;font-weight:700" class="mt-8">${bn.mr[b[0]]}</div><div class="xs muted">${persen(b[0])}%</div></div>`)}</div>
          <p class="xs muted mt-8">Komponen yang belum diisi tidak dihitung (bobotnya ikut diabaikan). Nilai STS dipakai untuk rapor tengah semester bersama rerata TP.</p></div>
        <div class="split mt-12"><div class="card" style="overflow:hidden"><div class="toolbar" style="border-bottom:1px solid var(--line)">
          <span class="badge info">${ic('keyboard', 'sm')}Tempel kolom STS/SAS langsung dari Excel</span><span class="grow"></span>
          <button class="btn sm ghost" data-ekspor>${ic('file_download', 'sm')}Ekspor rekap .xlsx</button></div><div data-grid></div></div>
          <div class="side-panel" data-stat></div></div>`);
      grid = new SheetGrid($('[data-grid]', view), {
        groups: [{ label: 'Identitas siswa', span: 2, cls: 'stk s0' }, { label: 'Komponen otomatis', span: 2 }, { label: 'Input sumatif guru', span: 2, cls: 'lmh' }, { label: 'Kalkulasi', span: 4 }],
        cols: [
          { key: 'no_absen', label: 'No', thCls: 'stk s0', tdCls: 'stk s0' },
          { key: 'nama', label: 'Nama siswa', thCls: 'stk s1', tdCls: 'stk s1' },
          { label: 'Rerata TP', tdCls: 'calc', val: r => hit(r).rataTP, tampil: v => v === null ? '–' : fmt1(v) },
          { label: 'Rerata LM', tdCls: 'calc', val: r => hit(r).rataLM, tampil: v => v === null ? '–' : fmt1(v) },
          { label: 'STS', title: 'Sumatif Tengah Semester', edit: !kunciTS, validasi: validasiNilai, val: r => (bn.nilai.sts || {})[r.id], t: 'sts', tdCls: kunciTS ? 'calc' : '' },
          { label: 'SAS', title: 'Sumatif Akhir Semester', edit: !kunciAS, validasi: validasiNilai, val: r => (bn.nilai.sas || {})[r.id], t: 'sas', tdCls: kunciAS ? 'calc' : '',
            cls: (r, v) => v !== undefined && v !== null && Number(v) < Number(bn.mr.kktp) ? 'low' : '' },
          { label: 'NA', tdCls: 'na', val: r => hit(r).na, tampil: v => v === null ? '–' : v, cls: (r, v) => v !== null && v < Number(bn.mr.kktp) ? 'low' : '' },
          { label: 'Predikat', raw: true, val: r => hit(r).predikat, tampil: v => v ? `<span class="badge ${Hitung.kelasPredikat(v)}">${esc(v)}</span>` : '–' },
          { label: 'Status', raw: true, val: r => hit(r).tuntas, tampil: v => v === null ? '<span class="xs muted">Belum lengkap</span>' : v ? '<span class="xs ok-t">✓ Tuntas</span>' : '<span class="xs err-t">⚠ Remedial</span>' },
          { label: 'Ringkasan capaian', tdCls: 'small', val: r => hit(r).deskripsi, tampil: v => v ? (v.length > 70 ? v.slice(0, 70) + '…' : v) : '–' }],
        rows: bn.siswa, kunci: kunciAS && kunciTS,
        onEdit: list => { BN.kirim(bn, list.map(x => ({ t: x.col.t, a: x.row.id, v: x.value }))); statistik(); }
      });
      $('[data-ekspor]', view).onclick = async () => {
        await Lazy('js/xlsx-lite.js');
        const rows = [['No', 'NISN', 'Nama', 'Rerata TP', 'Rerata LM', 'STS', 'SAS', 'NA', 'NA STS', 'Predikat', 'Tuntas', 'Deskripsi']];
        bn.siswa.forEach(r => { const h = hit(r); rows.push([r.no_absen, r.nisn || '', r.nama, h.rataTP, h.rataLM, h.sts, h.sas, h.na, h.naSts, h.predikat, h.tuntas === null ? '' : h.tuntas ? 'Ya' : 'Tidak', h.deskripsi]); });
        XLSXLite.unduh(`Rekap_${B.mapel(bn.mr.mapel_id).singkatan}_${bn.rombel.nama}.xlsx`, [{ nama: 'Rekap', rows }]);
      };
      const bb = $('[data-bobot]', view);
      if (bb) bb.onclick = async () => {
        const v = await modal({ judul: 'Bobot & KKTP — ' + B.mapel(bn.mr.mapel_id).nama + ' ' + bn.rombel.nama, isi: html`<div class="form-grid">
          ${[['bobot_tp', 'Bobot rerata TP'], ['bobot_lm', 'Bobot rerata LM'], ['bobot_as', 'Bobot SAS'], ['kktp', 'KKTP (0–100)']].map(b => html`<div class="field"><label>${b[1]}</label><input class="input" type="number" min="0" max="${b[0] === 'kktp' ? 100 : 10}" step="0.5" name="${b[0]}" value="${bn.mr[b[0]]}"></div>`)}</div>
          <p class="small muted mt-12">Isi bobot 0 untuk mengabaikan komponen. Contoh umum: TP 1, LM 1, SAS 2.</p>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan', kelas: 'primary', onClick: bg => API.call('simpanBobot', Object.assign({ mr_id: bn.mr.id, periode_id: S.periodeId }, nilaiForm(bg))) }] });
        if (v) {
          bn.mr = v; BN.simpanCache(bn);
          const i = S.boot.mapelRombel.findIndex(m => m.id === v.id); if (i > -1) { S.boot.mapelRombel[i] = v; LS.set('rk:boot:' + S.user.id, S.boot); }
          toast('Bobot & KKTP disimpan.', 'ok'); gambar();
        }
      };
      statistik();
    };
    await BN.muat(mr.id, d => {
      if (!p.alive()) return;
      const sama = bn && grid && bn.siswa.length === d.siswa.length && bn.kunciSAS === d.kunciSAS && JSON.stringify(bn.mr) === JSON.stringify(d.mr);
      bn = d;
      if (sama) { grid.o.rows = bn.siswa; grid.refreshAll(); statistik(); } else gambar();
    });
  }
});

/* ============================================================
   CAPAIAN & DESKRIPSI
   ============================================================ */
route('/deskripsi', {
  judul: 'Capaian & Deskripsi', shell: true, auth: 'staf',
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const { daftar, mr } = mrAktif();
    if (!mr) return tanpaMapel(view, 'Capaian & Deskripsi');
    mount(view, html`${kepalaHalaman('Penilaian · Deskripsi rapor', 'Capaian & Deskripsi', 'Kalimat disusun otomatis dari TP tertinggi & terendah. Ubah bila perlu — perubahan manual ditandai.')}
      ${ctxMapel(daftar, mr, html`<div class="field"><label>Tampilkan</label><div class="seg" data-filter><button class="on" data-v="semua">Semua</button><button data-v="manual">Manual</button><button data-v="kurang">Belum lengkap</button></div></div>`)}
      <div data-isi>${skeleton(8)}</div>`);
    ikatPilihMr(view);
    let bn = null, filter = 'semua';
    const gambar = () => {
      const rows = bn.siswa.map(r => ({ r, h: Hitung.siswa(bn, bn.mr, r.id, Hitung.opsi(r)) }))
        .filter(x => filter === 'semua' || (filter === 'manual' ? x.h.manual : !x.h.lengkap));
      const bisa = bn.bisaTulis && !bn.kunciSAS;
      mount($('[data-isi]', view), html`${barisKunci(bn)}<div class="card mt-12"><div class="tbl-wrap"><table class="tbl">
        <thead><tr><th class="c">No</th><th>Nama</th><th class="c">NA</th><th>Predikat</th><th style="min-width:360px">Deskripsi capaian kompetensi</th><th></th></tr></thead>
        <tbody>${rows.map(({ r, h }) => html`<tr><td class="c muted">${r.no_absen}</td><td><b>${r.nama}</b><div class="xs muted">${r.nisn || ''}</div></td>
          <td class="c"><span class="score ${h.tuntas === false ? 'err' : ''}" style="font-size:14px">${h.na === null ? '–' : h.na}</span></td>
          <td>${h.predikat ? html`<span class="badge ${Hitung.kelasPredikat(h.predikat)}">${h.predikat}</span>` : '–'}</td>
          <td class="small">${h.deskripsi || html`<span class="muted">Belum ada nilai TP.</span>`} ${h.manual ? html`<span class="badge warn">Manual</span>` : ''}</td>
          <td class="right" style="white-space:nowrap">${bisa ? html`<button class="btn sm ghost" data-ubah="${r.id}">${ic('edit', 'sm')}Ubah</button>${h.manual ? html`<button class="btn sm text" data-reset="${r.id}">Otomatis</button>` : ''}` : ''}</td></tr>`)}</tbody></table></div>
        ${!rows.length ? kosong('filter_alt_off', 'Tidak ada data', 'Tidak ada siswa pada filter ini.') : ''}</div>`);
    };
    $('[data-filter]', view).onclick = e => { const b = e.target.closest('button'); if (!b) return; filter = b.dataset.v; $$('[data-filter] button', view).forEach(x => x.classList.toggle('on', x === b)); if (bn) gambar(); };
    $('[data-isi]', view).addEventListener('click', e => {
      const u = e.target.closest('[data-ubah]'), rs = e.target.closest('[data-reset]');
      if (u) ubahDeskripsi(bn, bn.mr, bn.siswa.find(s => s.id === u.dataset.ubah), gambar);
      if (rs) resetDeskripsi(bn, bn.mr, bn.siswa.find(s => s.id === rs.dataset.reset), gambar).catch(er => toast(er.message, 'err'));
    });
    await BN.muat(mr.id, d => { if (!p.alive()) return; bn = d; gambar(); });
  }
});
