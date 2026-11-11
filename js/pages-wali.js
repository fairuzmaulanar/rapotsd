/* ============================================================
   RaporKilat SD — halaman wali kelas: absensi/ekskul/catatan,
   kokurikuler 8 dimensi, leger & rapor (pratinjau, cetak, ajukan).
   ============================================================ */
'use strict';

function ctxRombel(daftar, rb, extra = '') {
  return html`<div class="card ctxbar">
    <div class="field" style="min-width:220px"><label for="pilih-rb">Rombel</label><select class="select" id="pilih-rb" data-pilih-rb>${pilihanRombel(daftar, rb.id)}</select></div>
    <div class="field"><label>Wali kelas</label><div class="row" style="min-height:36px"><span class="badge pri">${ic('person', 'sm')}${B.user(rb.wali_id).nama || 'Belum ditetapkan'}</span></div></div>
    <div class="field"><label>Status rapor semester</label><div class="row" style="min-height:36px">${badgeStatus(B.status(rb.id, 'SAS'))}</div></div>
    <span class="grow"></span>${extra}</div>`;
}
function ikatPilihRb(view) {
  const s = $('[data-pilih-rb]', view);
  if (s) s.onchange = () => { S.ctx.rombel = s.value; S.simpanCtx(); render(); };
}
function tanpaRombel(view, judul) {
  mount(view, html`${kepalaHalaman('Wali kelas', judul, '')}${kosong('meeting_room', 'Anda belum menjadi wali kelas', 'Rombel perwalian ditetapkan operator di menu Rombel & Pengampu.')}`);
}

/* ============================================================
   ABSENSI, EKSKUL, CATATAN, KENAIKAN
   ============================================================ */
route('/kelas', {
  judul: 'Absensi, Ekskul & Catatan', shell: true, auth: 'staf',
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const { daftar, rombel } = rombelAktif();
    if (!rombel) return tanpaRombel(view, 'Absensi, Ekskul & Catatan');
    const sem2 = Number(B.periode().semester) === 2;
    mount(view, html`${kepalaHalaman('Wali kelas', 'Absensi, Ekstrakurikuler & Catatan', 'Semua isian tersimpan otomatis.')}${ctxRombel(daftar, rombel)}<div data-isi>${skeleton(8)}</div>`);
    ikatPilihRb(view);
    let wd = null;
    const arg = { rombel_id: rombel.id, periode_id: S.periodeId };
    const kunciQ = 'wali|' + rombel.id + '|' + S.periodeId;
    const kirim = (aid, field, value) => {
      wd.data[aid] = wd.data[aid] || {};
      wd.data[aid][field] = value;
      API.cacheSet('waliData', arg, wd);
      Simpan.tambah(kunciQ, 'simpanWali', arg, [[aid + '|' + field, { anggota_id: aid, field, value }]], { onError: () => { API.invalidate('waliData'); render(); } });
    };
    const ekskulTeks = list => (list || []).map(e => (S.boot.ekskul.find(x => x.id === e.id) || {}).nama + (e.predikat ? ' (' + e.predikat + ')' : '')).join(', ');
    const gambar = () => {
      const kunci = !wd.bisaTulis || ['diajukan', 'disetujui', 'terkunci'].includes(wd.status.SAS.status);
      const dis = kunci ? raw('disabled') : '';
      mount($('[data-isi]', view), html`
        ${kunci ? html`<div class="alert warn mb-12">${ic('lock')}<div>${wd.bisaTulis ? 'Rapor sudah diajukan/disetujui — data terkunci.' : 'Mode lihat saja.'}</div></div>` : ''}
        ${!kunci ? html`<div class="card toolbar mb-12"><span class="small bold">Isi cepat:</span>
          <button class="btn sm ghost" data-a="nol">${ic('exposure_zero', 'sm')}Absensi kosong → 0</button>
          <button class="btn sm ghost" data-a="ekskulWajib">${ic('hiking', 'sm')}Ekskul wajib ke semua siswa</button>
          ${sem2 ? html`<button class="btn sm ghost" data-a="naikSemua">${ic('trending_up', 'sm')}Semua ${Number(rombel.tingkat) >= 6 ? 'lulus' : 'naik kelas'}</button>` : ''}</div>` : ''}
        <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">No</th><th>Nama</th><th class="c">Sakit</th><th class="c">Izin</th><th class="c">Alpa</th>
          ${sem2 ? html`<th>${Number(rombel.tingkat) >= 6 ? 'Lulus' : 'Naik kelas'}</th>` : ''}<th style="min-width:200px">Ekstrakurikuler</th><th style="min-width:320px">Catatan wali kelas</th></tr></thead>
          <tbody>${wd.anggota.map(a => { const d = wd.data[a.id] || {}; return html`<tr data-aid="${a.id}">
            <td class="c muted">${a.no_absen}</td><td><b>${a.nama}</b><div class="xs muted">${a.nisn || ''}</div></td>
            ${['sakit', 'izin', 'alpa'].map(f => html`<td class="c"><input class="input num" style="width:64px;text-align:center" type="number" min="0" max="200" inputmode="numeric" data-f="${f}" value="${d[f] === undefined ? '' : d[f]}" ${dis}></td>`)}
            ${sem2 ? html`<td><select class="select" style="min-width:110px" data-f="naik" ${dis}><option value="">–</option><option value="ya" ${d.naik === 'ya' ? raw('selected') : ''}>Ya</option><option value="tidak" ${d.naik === 'tidak' ? raw('selected') : ''}>Tidak</option></select></td>` : ''}
            <td><button class="btn sm ghost" data-ekskul style="max-width:260px;justify-content:flex-start" ${dis}>${ic('sports_soccer', 'sm')}<span class="trunc">${ekskulTeks(d.ekskul) || 'Atur ekskul'}</span></button></td>
            <td><textarea class="textarea" rows="2" style="min-height:44px" data-f="catatan" placeholder="Catatan perkembangan ananda…" ${dis}>${d.catatan || ''}</textarea>
              ${!kunci ? html`<button class="btn sm text" data-saran>${ic('lightbulb', 'sm')}Saran kalimat</button>` : ''}</td></tr>`; })}</tbody></table></div>
          ${!wd.anggota.length ? kosong('person_off', 'Rombel belum punya siswa', 'Operator menambahkan siswa di menu Rombel & Pengampu.') : ''}</div>`);
    };
    const isi = $('[data-isi]', view);
    isi.addEventListener('input', debounce(e => {
      const f = e.target.dataset.f; if (!f || f === 'naik') return;
      const aid = e.target.closest('[data-aid]').dataset.aid;
      let v = e.target.value;
      if (f !== 'catatan') { v = v === '' ? '' : Number(v); if (v !== '' && (isNaN(v) || v < 0 || v > 200)) { e.target.classList.add('err'); return; } e.target.classList.remove('err'); }
      kirim(aid, f, v);
    }, 400));
    isi.addEventListener('change', e => { if (e.target.dataset.f === 'naik') kirim(e.target.closest('[data-aid]').dataset.aid, 'naik', e.target.value); });
    isi.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      const tr = b.closest('[data-aid]'), aid = tr && tr.dataset.aid;
      if (b.dataset.ekskul !== undefined) {
        const cur = (wd.data[aid] || {}).ekskul || [];
        const a = wd.anggota.find(x => x.id === aid);
        const v = await modal({ judul: 'Ekstrakurikuler — ' + a.nama, lebar: 'wide', isi: html`<div class="col">${S.boot.ekskul.map(ek => { const c = cur.find(x => x.id === ek.id) || {}; return html`
          <div class="card pad row wrap" style="box-shadow:none;border:1px solid var(--line)" data-ek="${ek.id}"><label class="check" style="min-width:180px"><input type="checkbox" ${c.id ? raw('checked') : ''}><b>${ek.nama}</b>${String(ek.wajib) === 'true' || ek.wajib === true ? html`<span class="badge">wajib</span>` : ''}</label>
          <select class="select" style="max-width:150px" data-p><option value="">Predikat</option>${['Sangat Baik', 'Baik', 'Cukup', 'Kurang'].map(x => html`<option ${c.predikat === x ? raw('selected') : ''}>${x}</option>`)}</select>
          <input class="input grow" data-k placeholder="Keterangan, mis. Aktif dan disiplin" value="${c.keterangan || ''}"></div>`; })}
          ${!S.boot.ekskul.length ? html`<p class="muted">Belum ada data ekskul. Operator menambahkannya di menu Mapel & Ekskul.</p>` : ''}</div>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan', kelas: 'primary', onClick: bg => $$('[data-ek]', bg).filter(x => $('input[type=checkbox]', x).checked)
            .map(x => ({ id: x.dataset.ek, predikat: $('[data-p]', x).value, keterangan: $('[data-k]', x).value })) }] });
        if (v) { kirim(aid, 'ekskul', v); $('span.trunc', b).textContent = ekskulTeks(v) || 'Atur ekskul'; }
      }
      if (b.dataset.saran !== undefined) {
        const a = wd.anggota.find(x => x.id === aid);
        const nm = a.panggilan || String(a.nama).split(' ')[0];
        const saran = [`${nm} menunjukkan semangat belajar yang baik dan aktif dalam kegiatan kelas. Pertahankan kebiasaan membaca dan tingkatkan ketelitian dalam mengerjakan tugas.`,
          `${nm} santun dan mudah bekerja sama dengan teman. Perlu terus berlatih berani bertanya dan menyampaikan pendapat di kelas.`,
          `${nm} sudah mandiri dalam menyelesaikan tugas. Tingkatkan konsentrasi saat pembelajaran dan rajin mengulang materi di rumah.`];
        const v = await modal({ judul: 'Saran catatan untuk ' + a.nama, isi: html`<div class="col">${saran.map((s, i) => html`<label class="card pad row" style="cursor:pointer;box-shadow:none;border:1px solid var(--line)"><input type="radio" name="s" value="${i}" ${i === 0 ? raw('checked') : ''}><span class="small">${s}</span></label>`)}<p class="xs muted">Sesuaikan kalimat dengan pengamatan Anda setelah dipilih.</p></div>`,
          aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Pakai', kelas: 'primary', onClick: bg => saran[+$('input[name=s]:checked', bg).value] }] });
        if (v) { const t = $('textarea', tr); t.value = v; kirim(aid, 'catatan', v); t.focus(); }
      }
      if (b.dataset.a === 'nol') {
        wd.anggota.forEach(a => ['sakit', 'izin', 'alpa'].forEach(f => { const d = wd.data[a.id] || {}; if (d[f] === undefined || d[f] === '') kirim(a.id, f, 0); }));
        gambar(); toast('Absensi kosong diisi 0.', 'ok');
      }
      if (b.dataset.a === 'ekskulWajib') {
        const wajib = S.boot.ekskul.filter(x => String(x.wajib) === 'true' || x.wajib === true);
        if (!wajib.length) return toast('Belum ada ekskul wajib. Tandai di menu Mapel & Ekskul.', 'warn');
        wd.anggota.forEach(a => { const cur = (wd.data[a.id] || {}).ekskul || []; const add = wajib.filter(w => !cur.some(c => c.id === w.id)).map(w => ({ id: w.id, predikat: 'Baik', keterangan: '' })); if (add.length) kirim(a.id, 'ekskul', cur.concat(add)); });
        gambar(); toast('Ekskul wajib ditambahkan (predikat awal "Baik", silakan sesuaikan).', 'ok');
      }
      if (b.dataset.a === 'naikSemua') { wd.anggota.forEach(a => kirim(a.id, 'naik', 'ya')); gambar(); }
    });
    await API.swr('waliData', arg, d => {
      if (!p.alive()) return;
      wd = d;
      Simpan.pending(kunciQ).forEach(c => { wd.data[c.anggota_id] = wd.data[c.anggota_id] || {}; wd.data[c.anggota_id][c.field] = c.value; });
      gambar();
    }, { ttl: 10000 });
  }
});

/* ============================================================
   KOKURIKULER 8 DIMENSI
   ============================================================ */
const CAPAIAN = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang'];
route('/kokurikuler', {
  judul: 'Kokurikuler 8 Dimensi', shell: true, auth: 'staf',
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const { daftar, rombel } = rombelAktif();
    if (!rombel) return tanpaRombel(view, 'Kokurikuler 8 Dimensi');
    mount(view, html`${kepalaHalaman('Wali kelas · Permendikdasmen 13/2025', 'Kokurikuler 8 Dimensi Profil Lulusan', 'Buat kegiatan, pilih dimensi yang dikuatkan, lalu isi capaian tiap siswa. Narasi rapor tersusun otomatis.')}
      ${ctxRombel(daftar, rombel)}<div data-isi>${skeleton(6)}</div>`);
    ikatPilihRb(view);
    const arg = { rombel_id: rombel.id, periode_id: S.periodeId };
    let kd = null, aktifId = S.ctx.kegiatan || null;
    const dim = id => S.boot.dimensi.find(d => d.id === id) || {};
    const kirim = (keg, a, d, v) => {
      if (d === '_catatan') { if (v) keg.catatan[a] = v; else delete keg.catatan[a]; }
      else { keg.nilai[a] = keg.nilai[a] || {}; if (v) keg.nilai[a][d] = v; else delete keg.nilai[a][d]; }
      API.cacheSet('kokurikuler', arg, kd);
      Simpan.tambah('koku|' + keg.id, 'simpanNilaiKoku', { kegiatan_id: keg.id }, [[a + '|' + d, { a, d, v }]], { onError: () => { API.invalidate('kokurikuler'); render(); } });
    };
    const formKegiatan = async keg => {
      const v = await modal({ judul: keg ? 'Ubah kegiatan' : 'Kegiatan kokurikuler baru', lebar: 'wide', isi: html`<div class="col gap-12">
        <div class="form-grid"><div class="field span2"><label>Judul kegiatan</label><input class="input" name="judul" value="${keg ? keg.judul : ''}" placeholder="Mis. Kebun Sekolahku Hijau"></div>
          <div class="field"><label>Tema</label><input class="input" name="tema" value="${keg ? keg.tema : ''}" placeholder="Mis. Peduli Lingkungan"></div></div>
        <div class="field"><label>Deskripsi singkat (opsional)</label><textarea class="textarea" name="deskripsi" rows="2">${keg ? keg.deskripsi : ''}</textarea></div>
        <div class="field"><label>Dimensi profil lulusan yang dikuatkan</label><div class="grid2">${S.boot.dimensi.map(d => html`<label class="check card pad" style="box-shadow:none;border:1px solid var(--line)"><input type="checkbox" name="dimensi_ids" data-multi="1" value="${d.id}" ${keg && keg.dimensi_ids.includes(d.id) ? raw('checked') : ''}>${d.nama}</label>`)}</div></div></div>`,
        aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null }, { label: 'Simpan kegiatan', kelas: 'primary', onClick: bg => API.call('simpanKegiatan', Object.assign({}, arg, { id: keg ? keg.id : undefined }, nilaiForm(bg))) }] });
      if (v) { toast('Kegiatan disimpan.', 'ok'); aktifId = v.id; S.ctx.kegiatan = v.id; S.simpanCtx(); API.invalidate('kokurikuler'); render(); }
    };
    const gambar = () => {
      const kunci = !kd.bisaTulis || ['diajukan', 'disetujui', 'terkunci'].includes(kd.status.SAS.status);
      const keg = kd.kegiatan.find(k => k.id === aktifId) || kd.kegiatan[0];
      aktifId = keg && keg.id;
      const dis = kunci ? raw('disabled') : '';
      mount($('[data-isi]', view), html`${kunci ? html`<div class="alert warn mb-12">${ic('lock')}<div>Data terkunci atau mode lihat saja.</div></div>` : ''}
        <div class="row wrap mb-12">${kd.kegiatan.map(k => html`<button class="btn ${k.id === aktifId ? 'primary' : 'ghost'}" data-pilih="${k.id}">${ic('diversity_3', 'sm')}${k.judul}</button>`)}
          ${!kunci ? html`<button class="btn ghost" data-baru>${ic('add', 'sm')}Kegiatan baru</button>` : ''}</div>
        ${!keg ? kosong('diversity_3', 'Belum ada kegiatan kokurikuler', 'Buat kegiatan pertama, mis. proyek kebun sekolah, lalu nilai capaian per dimensi.', !kunci ? html`<button class="btn primary" data-baru>${ic('add', 'sm')}Buat kegiatan</button>` : '') : html`
        <div class="card"><div class="card-h"><div><h3>${keg.judul}</h3><div class="small muted">${keg.tema || ''} · ${keg.dimensi_ids.map(d => dim(d).nama).join(', ')}</div></div>
          ${!kunci ? html`<div class="row"><button class="btn sm ghost" data-ubah>${ic('edit', 'sm')}Ubah</button><button class="btn sm ghost" data-hapus>${ic('delete', 'sm err-t')}Hapus</button></div>` : ''}</div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">No</th><th>Nama</th>${keg.dimensi_ids.map(d => html`<th style="min-width:150px">${dim(d).nama}
            ${!kunci ? html`<select class="select" style="margin-top:4px;font-size:11px;min-height:28px;padding:2px 24px 2px 6px" data-isisemua="${d}"><option value="">Isi semua…</option>${CAPAIAN.map(c => html`<option>${c}</option>`)}</select>` : ''}</th>`)}
            <th style="min-width:260px">Catatan proses</th></tr></thead>
            <tbody>${kd.anggota.map(a => html`<tr data-aid="${a.id}"><td class="c muted">${a.no_absen}</td><td><b>${a.nama}</b></td>
              ${keg.dimensi_ids.map(d => { const v = ((keg.nilai || {})[a.id] || {})[d] || ''; return html`<td><select class="select" data-d="${d}" ${dis}><option value="">–</option>${CAPAIAN.map(c => html`<option ${v === c ? raw('selected') : ''}>${c}</option>`)}</select></td>`; })}
              <td><input class="input" data-d="_catatan" value="${(keg.catatan || {})[a.id] || ''}" placeholder="Mis. Memimpin kelompok dengan baik" ${dis}></td></tr>`)}</tbody></table></div></div>
        <div class="card pad mt-12"><h3 class="row">${ic('auto_stories')}Pratinjau narasi rapor</h3><div class="col mt-12 small" data-narasi></div></div>`}`);
      if (keg) narasi(keg);
    };
    const narasi = keg => {
      const el = $('[data-narasi]', view); if (!el) return;
      const ok = /^(ya|true)$/i.test(String(S.pengaturan.deskripsi_nama || ''));
      mount(el, html`${kd.anggota.slice(0, 4).map(a => {
        const v = (keg.nilai || {})[a.id] || {}, grup = {};
        Object.keys(v).forEach(d => { (grup[v[d]] = grup[v[d]] || []).push(dim(d).nama); });
        const bag = CAPAIAN.filter(c => grup[c]).map(c => c.toLowerCase() + ' pada dimensi ' + (grup[c].length > 1 ? grup[c].slice(0, -1).join(', ') + ' dan ' + grup[c].slice(-1) : grup[c][0]));
        const subj = ok ? 'Ananda ' + (a.panggilan || String(a.nama).split(' ')[0]) : 'Ananda';
        const t = bag.length ? subj + ' menunjukkan capaian ' + (bag.length > 1 ? bag.slice(0, -1).join('; ') + ', serta ' + bag.slice(-1) : bag[0]) + ' melalui kegiatan "' + keg.judul + '".' : '';
        const cat = (keg.catatan || {})[a.id];
        return html`<div><b>${a.nama}:</b> ${[t, cat ? (/[.!?]$/.test(cat) ? cat : cat + '.') : ''].filter(Boolean).join(' ') || html`<span class="muted">belum diisi</span>`}</div>`;
      })}${kd.anggota.length > 4 ? html`<div class="muted xs">…dan ${kd.anggota.length - 4} siswa lain.</div>` : ''}`);
    };
    const isi = $('[data-isi]', view);
    isi.addEventListener('change', e => {
      const keg = kd.kegiatan.find(k => k.id === aktifId);
      if (e.target.dataset.isisemua) {
        const d = e.target.dataset.isisemua, v = e.target.value;
        if (!v) return;
        kd.anggota.forEach(a => { if (!((keg.nilai[a.id] || {})[d])) kirim(keg, a.id, d, v); });
        gambar(); toast('Sel kosong pada dimensi ini diisi "' + v + '".', 'ok'); return;
      }
      const d = e.target.dataset.d; if (!d) return;
      kirim(keg, e.target.closest('[data-aid]').dataset.aid, d, e.target.value.trim());
      narasi(keg);
    });
    isi.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pilih) { aktifId = b.dataset.pilih; S.ctx.kegiatan = aktifId; S.simpanCtx(); gambar(); }
      if (b.dataset.baru !== undefined) formKegiatan(null);
      if (b.dataset.ubah !== undefined) formKegiatan(kd.kegiatan.find(k => k.id === aktifId));
      if (b.dataset.hapus !== undefined) {
        if (!await konfirmasi('Hapus kegiatan?', 'Semua nilai capaian kegiatan ini ikut terhapus.', 'Hapus', 'danger')) return;
        try { await API.call('hapusKegiatan', { id: aktifId }); toast('Kegiatan dihapus.', 'ok'); aktifId = null; API.invalidate('kokurikuler'); render(); } catch (ex) { toast(ex.message, 'err'); }
      }
    });
    await API.swr('kokurikuler', arg, d => {
      if (!p.alive()) return;
      kd = d;
      kd.kegiatan.forEach(k => Simpan.pending('koku|' + k.id).forEach(c => {
        if (c.d === '_catatan') k.catatan[c.a] = c.v; else { k.nilai[c.a] = k.nilai[c.a] || {}; k.nilai[c.a][c.d] = c.v; }
      }));
      gambar();
    }, { ttl: 10000 });
  }
});

/* ============================================================
   LEGER & RAPOR
   ============================================================ */
const OpsiCetak = Object.assign({ kertas: null, kop: 'lengkap', qr: true, watermark: true, kokurikuler: true, identitas: false, tandaDigital: true }, LS.get('rk:opsiCetak', {}));
function simpanOpsiCetak() { LS.set('rk:opsiCetak', OpsiCetak); }

function panelOpsiCetak(onUbah) {
  const el = document.createElement('div');
  el.className = 'card';
  const kertas = OpsiCetak.kertas || S.pengaturan.kertas || 'A4';
  mount(el, html`<div class="card-h"><h3>${ic('settings')}Pengaturan cetak</h3></div><div class="pad col gap-12">
    <div class="field"><label>Ukuran kertas</label><div class="seg" data-kertas>${['A4', 'F4'].map(k => html`<button class="${k === kertas ? 'on' : ''}" data-v="${k}">${k === 'A4' ? 'A4 (210×297)' : 'F4 / Folio (215×330)'}</button>`)}</div></div>
    <div class="field"><label>Kop dokumen</label><select class="select" data-kop>
      <option value="lengkap" ${OpsiCetak.kop === 'lengkap' ? raw('selected') : ''}>Kop lengkap sekolah</option>
      <option value="tanpaLogoDaerah" ${OpsiCetak.kop === 'tanpaLogoDaerah' ? raw('selected') : ''}>Kop tanpa logo daerah</option>
      <option value="kosong" ${OpsiCetak.kop === 'kosong' ? raw('selected') : ''}>Kosongkan (kertas berkop)</option></select></div>
    ${[['qr', 'QR verifikasi keaslian'], ['kokurikuler', 'Tampilkan kokurikuler'], ['identitas', 'Sertakan halaman identitas siswa'], ['watermark', 'Tanda "DRAF" sebelum disetujui'], ['tandaDigital', 'Cap "Disetujui melalui RaporKilat"']]
      .map(o => html`<label class="check"><input type="checkbox" data-o="${o[0]}" ${OpsiCetak[o[0]] ? raw('checked') : ''}>${o[1]}</label>`)}</div>`);
  el.addEventListener('click', e => { const b = e.target.closest('[data-kertas] button'); if (b) { OpsiCetak.kertas = b.dataset.v; $$('[data-kertas] button', el).forEach(x => x.classList.toggle('on', x === b)); simpanOpsiCetak(); onUbah(); } });
  el.addEventListener('change', e => {
    if (e.target.dataset.kop !== undefined) OpsiCetak.kop = e.target.value;
    if (e.target.dataset.o) OpsiCetak[e.target.dataset.o] = e.target.checked;
    simpanOpsiCetak(); onUbah();
  });
  return el;
}

route('/rapor', {
  judul: 'Leger & Rapor', shell: true, auth: 'staf',
  async render(view, p) {
    await muatBoot();
    if (!p.alive()) return;
    const { daftar, rombel } = rombelAktif();
    if (!rombel) return tanpaRombel(view, 'Leger & Rapor');
    let jenis = S.ctx.jenis === 'STS' ? 'STS' : 'SAS', tab = S.ctx.tabRapor || 'leger';
    mount(view, html`${kepalaHalaman('Wali kelas · Leger & rapor', 'Leger & Rapor Kelas ' + rombel.nama, 'Periksa leger, pratinjau rapor tiap siswa, lalu ajukan ke kepala sekolah.')}
      ${ctxRombel(daftar, rombel, html`<div class="field"><label>Jenis rapor</label><div class="seg" data-jenis><button data-v="SAS" class="${jenis === 'SAS' ? 'on' : ''}">Akhir semester</button><button data-v="STS" class="${jenis === 'STS' ? 'on' : ''}">Tengah semester</button></div></div>`)}
      <div class="row wrap mb-12" data-tab>${[['leger', 'table_view', 'Leger nilai'], ['rapor', 'description', 'Pratinjau & cetak rapor'], ['ajukan', 'send', 'Status & pengajuan']]
        .map(t => html`<button class="btn ${tab === t[0] ? 'primary' : 'ghost'}" data-v="${t[0]}">${ic(t[1], 'sm')}${t[2]}</button>`)}</div><div data-isi>${skeleton(8)}</div>`);
    ikatPilihRb(view);
    $('[data-jenis]', view).onclick = e => { const b = e.target.closest('button'); if (b) { S.ctx.jenis = b.dataset.v; S.simpanCtx(); render(); } };
    $('[data-tab]', view).onclick = e => { const b = e.target.closest('button'); if (b) { S.ctx.tabRapor = b.dataset.v; S.simpanCtx(); render(); } };
    const isi = $('[data-isi]', view);
    const arg = { rombel_id: rombel.id, periode_id: S.periodeId, jenis };
    if (tab === 'leger') await tabLeger(isi, arg, p);
    if (tab === 'rapor') await tabRapor(isi, arg, p);
    if (tab === 'ajukan') await tabAjukan(isi, arg, p, rombel);
  }
});

async function tabLeger(isi, arg, p) {
  await API.swr('leger', arg, lg => {
    if (!p.alive()) return;
    const rk = /^(ya|true)$/i.test(String(S.pengaturan.tampil_ranking || ''));
    const kk = {};
    S.boot.mapelRombel.filter(m => m.rombel_id === arg.rombel_id).forEach(m => { kk[m.id] = Number(m.kktp); });
    mount(isi, html`${lg.kelengkapan.masalah.length ? html`<div class="alert warn mb-12">${ic('pending')}<div><b>Kelengkapan nilai ${lg.kelengkapan.persen}%.</b> ${lg.kelengkapan.masalah.slice(0, 6).join(' · ')}${lg.kelengkapan.masalah.length > 6 ? ' · …' : ''}</div></div>`
      : html`<div class="alert ok mb-12">${ic('task_alt')}<div><b>Semua nilai lengkap.</b> Leger siap diperiksa dan rapor siap diajukan.</div></div>`}
      <div class="card"><div class="toolbar" style="border-bottom:1px solid var(--line)"><b>Leger ${lg.jenis === 'STS' ? 'tengah semester' : 'akhir semester'}</b><span class="grow"></span>
        <button class="btn sm ghost" data-xlsx>${ic('table_view', 'sm')}Unduh .xlsx</button><button class="btn sm ghost" data-cetak>${ic('print', 'sm')}Cetak leger</button></div>
      <div class="tbl-wrap" style="max-height:calc(100vh - 330px)"><table class="tbl"><thead><tr><th class="c">No</th><th>Nama</th>${lg.kolom.map(k => html`<th class="c" title="${k.nama}">${k.singkatan}</th>`)}<th class="c">Jml</th><th class="c">Rata</th>${rk ? html`<th class="c">Rank</th>` : ''}<th class="c">S</th><th class="c">I</th><th class="c">A</th></tr></thead>
        <tbody>${lg.rows.map(r => html`<tr><td class="c muted">${r.no}</td><td><b>${r.nama}</b></td>${lg.kolom.map(k => { const v = r.nilai[k.id]; const low = v !== null && v !== undefined && kk[k.id] && v < kk[k.id]; return html`<td class="c num ${low ? 'err-t bold' : ''}">${v === null || v === undefined ? html`<span class="muted">–</span>` : v}</td>`; })}
          <td class="c num">${r.jumlah || ''}</td><td class="c num bold">${r.rata === null ? '–' : r.rata}</td>${rk ? html`<td class="c">${r.rank || ''}</td>` : ''}<td class="c">${r.sakit}</td><td class="c">${r.izin}</td><td class="c">${r.alpa}</td></tr>`)}
          <tr style="background:var(--surface-2)"><td></td><td><b>Rata-rata kelas</b></td>${lg.kolom.map(k => html`<td class="c bold">${lg.rataKolom[k.id] === null ? '–' : lg.rataKolom[k.id]}</td>`)}<td colspan="${rk ? 6 : 5}"></td></tr></tbody></table></div></div>
      <div class="print-area hide" data-pa></div>`);
    $('[data-xlsx]', isi).onclick = async () => {
      await Lazy('js/xlsx-lite.js');
      const rows = [['No', 'NISN', 'Nama', ...lg.kolom.map(k => k.nama), 'Jumlah', 'Rata-rata', ...(rk ? ['Ranking'] : []), 'Sakit', 'Izin', 'Alpa']];
      lg.rows.forEach(r => rows.push([r.no, r.nisn || '', r.nama, ...lg.kolom.map(k => r.nilai[k.id] === undefined ? '' : r.nilai[k.id]), r.jumlah, r.rata, ...(rk ? [r.rank || ''] : []), r.sakit, r.izin, r.alpa]));
      XLSXLite.unduh(`Leger_${lg.rombel.nama}_${lg.jenis}.xlsx`, [{ nama: 'Leger', rows }]);
    };
    $('[data-cetak]', isi).onclick = () => {
      const pa = $('[data-pa]', isi);
      mount(pa, html`<div class="paper-stage">${Cetak.leger(lg, S.pengaturan)}</div>`);
      pa.classList.remove('hide');
      Cetak.cetak('F4L', 'landscape');
      setTimeout(() => pa.classList.add('hide'), 1500);
    };
  }, { ttl: 8000 });
}

async function tabRapor(isi, arg, p) {
  let data = null, idx = 0, semua = false;
  mount(isi, html`<div class="split"><div><div class="card toolbar mb-12 no-print" data-nav></div><div class="print-area"><div class="paper-stage" data-stage>${skeleton(6)}</div></div></div><div class="side-panel" data-side></div></div>`);
  const stage = $('[data-stage]', isi);
  const gambar = async () => {
    const r = data.rapor;
    if (!r.length) { mount(stage, kosong('person_off', 'Belum ada siswa', '')); return; }
    const opsi = Object.assign({}, OpsiCetak, { kertas: OpsiCetak.kertas || S.pengaturan.kertas || 'A4' });
    const daftar = semua ? r : [r[idx]];
    mount(stage, html`${daftar.map(x => html`${opsi.identitas ? Cetak.lembarIdentitas(data, x, opsi) : ''}${Cetak.lembar(data, x, opsi)}`)}`);
    mount($('[data-nav]', isi), html`<button class="btn sm ghost" data-prev ${idx === 0 || semua ? raw('disabled') : ''}>${ic('chevron_left', 'sm')}</button>
      <select class="select" style="max-width:320px" data-siswa ${semua ? raw('disabled') : ''}>${r.map((x, i) => html`<option value="${i}" ${i === idx ? raw('selected') : ''}>[${x.no_absen}] ${x.siswa.nama}</option>`)}</select>
      <button class="btn sm ghost" data-next ${idx >= r.length - 1 || semua ? raw('disabled') : ''}>${ic('chevron_right', 'sm')}</button>
      <span class="small muted">${semua ? 'Semua ' + r.length + ' siswa' : (idx + 1) + ' dari ' + r.length}</span><span class="grow"></span>
      <label class="check"><input type="checkbox" data-semua ${semua ? raw('checked') : ''}>Tampilkan sekelas</label>
      <button class="btn sm primary" data-print>${ic('print', 'sm')}${semua ? 'Cetak / PDF sekelas' : 'Cetak / PDF'}</button>`);
    Cetak.gambarQR(stage).catch(() => {});
  };
  isi.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !data) return;
    if (b.dataset.prev !== undefined) { idx--; gambar(); }
    if (b.dataset.next !== undefined) { idx++; gambar(); }
    if (b.dataset.print !== undefined) {
      toast('Pada dialog cetak pilih "Simpan sebagai PDF" untuk membuat file PDF.', 'info');
      Cetak.gambarQR(stage).then(() => Cetak.cetak(OpsiCetak.kertas || S.pengaturan.kertas || 'A4'));
    }
  });
  isi.addEventListener('change', e => {
    if (e.target.dataset.siswa !== undefined) { idx = +e.target.value; gambar(); }
    if (e.target.dataset.semua !== undefined) { semua = e.target.checked; gambar(); }
  });
  $('[data-side]', isi).appendChild(panelOpsiCetak(() => data && gambar()));
  await API.swr('raporData', arg, d => { if (!p.alive()) return; data = d; idx = Math.min(idx, Math.max(0, d.rapor.length - 1)); gambar(); }, { ttl: 8000 });
}

async function tabAjukan(isi, arg, p, rombel) {
  await API.swr('leger', arg, lg => {
    if (!p.alive()) return;
    const st = lg.status[arg.jenis] || { status: 'draft' };
    const bisa = S.peran('operator') || rombel.wali_id === S.user.id;
    const langkah = [['draft', 'Wali kelas melengkapi data'], ['diajukan', 'Diajukan ke kepala sekolah'], ['disetujui', 'Disetujui & kode QR terbit'], ['terkunci', 'Dikunci operator']];
    const posisi = st.status === 'revisi' ? 0 : langkah.findIndex(l => l[0] === st.status);
    mount(isi, html`<div class="grid2"><div class="card pad col gap-12"><h3 class="row">${ic('route')}Alur persetujuan rapor ${arg.jenis === 'STS' ? 'tengah semester' : 'akhir semester'}</h3>
      ${langkah.map((l, i) => html`<div class="row">${ic(i < posisi ? 'check_circle' : i === posisi ? 'radio_button_checked' : 'radio_button_unchecked', i <= posisi ? 'ok-t' : 'muted')}<span class="${i === posisi ? 'bold' : 'muted'}">${l[1]}</span></div>`)}
      <div class="row">${badgeStatus(st.status)}${st.diajukan_at ? html`<span class="xs muted">Diajukan ${jamID(st.diajukan_at)} oleh ${st.diajukan_by}</span>` : ''}</div>
      ${st.catatan ? html`<div class="alert ${st.status === 'revisi' ? 'err' : ''}">${ic('feedback')}<div>${st.catatan}</div></div>` : ''}
      ${bisa && ['draft', 'revisi'].includes(st.status) ? html`<button class="btn primary lg" data-ajukan>${ic('send', 'sm')}Ajukan ke Kepala Sekolah</button>
        <p class="xs muted">Setelah diajukan, nilai kelas ini terkunci sampai kepala sekolah menyetujui atau mengembalikan.</p>` : ''}</div>
      <div class="card pad col gap-12"><h3 class="row">${ic('checklist')}Kelengkapan</h3>
        <div class="row"><div class="bar grow ${lg.kelengkapan.persen >= 100 ? 'ok' : 'warn'}"><i style="width:${lg.kelengkapan.persen}%"></i></div><b>${lg.kelengkapan.persen}%</b></div>
        ${lg.kelengkapan.masalah.length ? html`<div class="col gap-4 small">${lg.kelengkapan.masalah.map(m => html`<div class="row">${ic('error', 'sm warn-t')}<span>${m}</span></div>`)}</div>` : html`<div class="alert ok">${ic('task_alt')}<span>Semua mapel lengkap.</span></div>`}</div></div>`);
    const b = $('[data-ajukan]', isi);
    if (b) b.onclick = async () => {
      if (!await konfirmasi('Ajukan rapor?', 'Rapor kelas ' + rombel.nama + ' akan dikirim ke kepala sekolah untuk ditinjau. Nilai terkunci selama proses peninjauan.', 'Ajukan')) return;
      b.classList.add('busy');
      try {
        await API.call('ajukanRapor', arg);
        toast('Rapor diajukan ke kepala sekolah.', 'ok');
      } catch (e) {
        if (e.code !== 'BELUM_LENGKAP') { toast(e.message, 'err'); return; }
        if (!await konfirmasi('Nilai belum lengkap', e.message + ' — Tetap ajukan? Kepala sekolah akan melihat catatan kekurangan ini.', 'Tetap ajukan', 'danger')) return;
        await API.call('ajukanRapor', Object.assign({ paksa: true }, arg));
        toast('Rapor diajukan dengan catatan kekurangan.', 'warn');
      } finally { b.classList.remove('busy'); }
      API.invalidate('leger'); API.invalidate('bukuNilai'); API.invalidate('waliData'); API.invalidate('kokurikuler');
      await muatBoot(true); render();
    };
  }, { ttl: 5000 });
}
