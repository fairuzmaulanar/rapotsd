/* ============================================================
   RaporKilat SD — pdf-rapor.js  (P4.3)
   Membuat file PDF rapor langsung di browser, tanpa dialog cetak:
   - satu PDF per siswa, sekelas dibungkus ZIP (wali kelas);
   - satu PDF untuk orang tua di portal.
   Cara kerja: lembar rapor yang sama persis dengan tampilan cetak
   digambar ke kanvas (SVG foreignObject), dipotong per halaman di
   batas baris tabel, lalu disusun menjadi PDF dengan pdf-lib (MIT).
   Dimuat hanya saat dibutuhkan (Lazy).
   ============================================================ */
'use strict';
const PDFRapor = (() => {
  const PX_MM = 96 / 25.4, PT_MM = 72 / 25.4;
  const KERTAS = { A4: [210, 297], F4: [215, 330] };
  const SKALA = 2;            // ±192 dpi: teks tajam, ukuran file wajar
  const MUTU_JPG = 0.86;
  let cssTeks = null;
  const gbrCache = {};

  async function css() {
    if (cssTeks === null) {
      cssTeks = await (await fetch('./css/app.css')).text();
      cssTeks += '\n.paper{box-shadow:none!important;margin:0!important;zoom:1!important}';
    }
    return cssTeks;
  }

  /** Gambar dari situs lain (logo) diubah menjadi data URL bila server mengizinkan; bila tidak, dikosongkan. */
  function keDataURL(src) {
    if (!src || /^data:/.test(src)) return Promise.resolve(src || '');
    if (gbrCache[src] !== undefined) return Promise.resolve(gbrCache[src]);
    return new Promise(selesai => {
      let beres = false;
      const akhir = v => { if (!beres) { beres = true; gbrCache[src] = v; selesai(v); } };
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.referrerPolicy = 'no-referrer';
      im.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = im.naturalWidth; c.height = im.naturalHeight;
          c.getContext('2d').drawImage(im, 0, 0);
          akhir(c.toDataURL('image/png'));
        } catch (e) { akhir(''); }
      };
      im.onerror = () => akhir('');
      setTimeout(() => akhir(''), 8000);
      im.src = src;
    });
  }

  function muatGambar(url) {
    return new Promise((ok, gagal) => {
      const im = new Image();
      im.onload = () => ok(im);
      im.onerror = () => gagal(new Error('Lembar rapor tidak dapat digambar.'));
      im.src = url;
    });
  }

  /** Titik potong halaman: tepi atas baris tabel & judul bagian (relatif terhadap lembar). */
  function titikPotong(paper) {
    const atas = paper.getBoundingClientRect().top;
    const ys = new Set();
    paper.querySelectorAll('tr, .rp-sec, .rp-title, .rp-ttd, .rp-verif, .rp-id, table, p').forEach(el => {
      ys.add(Math.floor(el.getBoundingClientRect().top - atas));
    });
    return [...ys].filter(y => y > 0).sort((a, b) => a - b);
  }

  /** Satu .paper → daftar kanvas seukuran halaman kertas. */
  async function rasterLembar(paper, kertas) {
    const [mmW, mmH] = KERTAS[kertas] || KERTAS.A4;
    const pageW = Math.round(mmW * PX_MM), pageH = Math.round(mmH * PX_MM), padAtas = Math.round(14 * PX_MM);
    // gambar eksternal → data URL (aturan keamanan browser untuk gambar SVG)
    for (const img of [...paper.querySelectorAll('img')]) {
      const d = await keDataURL(img.getAttribute('src'));
      if (d) img.setAttribute('src', d);
      else { const s = document.createElement('span'); s.style.cssText = 'display:inline-block;width:64px'; img.replaceWith(s); }
    }
    const w = Math.ceil(paper.offsetWidth), h = Math.ceil(Math.max(paper.scrollHeight, paper.offsetHeight));
    const potong = titikPotong(paper);
    const xhtml = new XMLSerializer().serializeToString(paper);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="${w}" height="${h}">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;background:#fff"><style><![CDATA[${await css()}]]></style>${xhtml}</div></foreignObject></svg>`;
    const im = await muatGambar('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    const besar = document.createElement('canvas');
    besar.width = Math.round(w * SKALA); besar.height = Math.round(h * SKALA);
    const g = besar.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, besar.width, besar.height);
    g.drawImage(im, 0, 0, besar.width, besar.height);

    // potong menjadi halaman: halaman lanjutan diberi margin atas seperti halaman pertama
    const halaman = [];
    let y0 = 0;
    while (y0 < h - 4) {
      const ruang = (halaman.length ? pageH - padAtas : pageH) - padAtas;
      let y1 = y0 + ruang;
      if (y1 >= h) y1 = h;
      else {
        const cocok = potong.filter(y => y > y0 + 40 && y <= y1);
        if (cocok.length) y1 = cocok[cocok.length - 1];
      }
      const c = document.createElement('canvas');
      c.width = Math.round(pageW * SKALA); c.height = Math.round(pageH * SKALA);
      const k = c.getContext('2d');
      k.fillStyle = '#fff'; k.fillRect(0, 0, c.width, c.height);
      const dy = halaman.length ? padAtas : 0;
      k.drawImage(besar, 0, Math.round(y0 * SKALA), besar.width, Math.round((y1 - y0) * SKALA),
        0, Math.round(dy * SKALA), Math.round(w * SKALA), Math.round((y1 - y0) * SKALA));
      halaman.push(c);
      y0 = y1;
      if (halaman.length > 6) break;   // pengaman: rapor SD tidak sepanjang ini
    }
    return halaman;
  }

  function keJpg(c) {
    return new Promise(ok => c.toBlob(b => b.arrayBuffer().then(x => ok(new Uint8Array(x))), 'image/jpeg', MUTU_JPG));
  }

  /** Buat PDF satu siswa. d = data rapor kelas (raporData / portal), r = rapor siswa. */
  async function buat(d, r, opsi = {}) {
    await Lazy('js/vendor/pdf-lib.min.js');
    const kertas = opsi.kertas === 'F4' ? 'F4' : 'A4';
    const kerja = document.createElement('div');
    kerja.className = 'pdf-kerja';
    kerja.setAttribute('aria-hidden', 'true');
    kerja.style.cssText = 'position:fixed;left:-20000px;top:0;width:auto;pointer-events:none';
    document.body.appendChild(kerja);
    try {
      mount(kerja, html`${opsi.identitas ? Cetak.lembarIdentitas(d, r, opsi) : ''}${Cetak.lembar(d, r, opsi)}`);
      await Cetak.gambarQR(kerja);
      const doc = await PDFLib.PDFDocument.create();
      doc.setTitle('Rapor ' + r.siswa.nama + ' — ' + (d.sekolah.nama_sekolah || ''));
      doc.setAuthor(d.sekolah.nama_sekolah || 'Sekolah');
      doc.setSubject((d.jenis === 'STS' ? 'Rapor tengah semester ' : 'Rapor ') + 'TA ' + d.periode.tahun_ajaran + ' semester ' + d.periode.semester);
      doc.setCreator('RaporKilat SD');
      const [mmW, mmH] = KERTAS[kertas];
      for (const paper of [...kerja.querySelectorAll('.paper')]) {
        for (const c of await rasterLembar(paper, kertas)) {
          const gbr = await doc.embedJpg(await keJpg(c));
          const pg = doc.addPage([mmW * PT_MM, mmH * PT_MM]);
          pg.drawImage(gbr, { x: 0, y: 0, width: mmW * PT_MM, height: mmH * PT_MM });
        }
      }
      return await doc.save();
    } finally { kerja.remove(); }
  }

  const namaBerkas = (d, r) => ('Rapor_' + d.rombel.nama + '_' + String(r.no_absen || '').padStart(2, '0') + '_' + r.siswa.nama)
    .replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_').slice(0, 80) + '.pdf';

  /** Satu siswa → unduh .pdf */
  async function unduhSatu(d, r, opsi) {
    const b = await buat(d, r, opsi);
    unduhBlob(new Blob([b], { type: 'application/pdf' }), namaBerkas(d, r));
  }

  /** Sekelas → satu PDF per siswa dalam .zip, dengan jendela progres yang bisa dibatalkan. */
  async function unduhZip(d, daftar, opsi) {
    let batal = false;
    const t0 = Date.now();
    return modal({
      judul: 'Membuat PDF per siswa', aksi: [{ label: 'Batal', kelas: 'ghost', nilai: null, onClick: () => { batal = true; } }],
      isi: html`<div class="col gap-12"><div class="row between small"><span data-pr-t>Menyiapkan…</span><b data-pr-n>0/${daftar.length}</b></div>
        <div class="bar"><i data-pr-bar style="width:0%"></i></div>
        <p class="xs muted" style="margin:0">Biarkan tab ini tetap terbuka. Perkiraan ±1 detik per siswa.</p></div>`,
      onBuka: async bg => {
        // Dialog bisa ditutup kapan saja (Batal, ×, Esc, gestur kembali) → proses berhenti.
        const jalan = () => !batal && bg.isConnected;
        let pesan = null;
        try {
          await Lazy('js/vendor/jszip.min.js');
          const zip = new JSZip();
          for (let i = 0; i < daftar.length && jalan(); i++) {
            $('[data-pr-t]', bg).textContent = daftar[i].siswa.nama;
            zip.file(namaBerkas(d, daftar[i]), await buat(d, daftar[i], opsi));
            $('[data-pr-n]', bg).textContent = (i + 1) + '/' + daftar.length;
            $('[data-pr-bar]', bg).style.width = Math.round((i + 1) / daftar.length * 100) + '%';
          }
          if (!jalan()) return;
          $('[data-pr-t]', bg).textContent = 'Membungkus ZIP…';
          const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
          if (!jalan()) return;
          unduhBlob(blob, ('Rapor_' + d.rombel.nama + '_' + (d.jenis === 'STS' ? 'STS' : 'SAS') + '_' + d.periode.tahun_ajaran.replace('/', '-') + '_smt' + d.periode.semester).replace(/\s+/g, '_') + '.zip');
          pesan = [daftar.length + ' PDF rapor dibuat dalam ' + Math.round((Date.now() - t0) / 1000) + ' detik.', 'ok'];
        } catch (e) { pesan = [e.message, 'err', 'Gagal membuat PDF']; }
        // tutup dialog dulu, baru tampilkan toast (toast saat dialog terbuka akan masuk ke dalam dialog)
        if (bg.isConnected && bg.open) bg.close();
        if (pesan) toast(...pesan);
      }
    });
  }

  return { buat, unduhSatu, unduhZip };
})();
