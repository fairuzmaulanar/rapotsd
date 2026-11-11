/* ============================================================
   RaporKilat SD — xlsx-lite.js (dimuat saat dibutuhkan)
   Tulis & baca file Excel .xlsx sederhana memakai JSZip lokal
   (tanpa CDN). Cukup untuk template impor/ekspor nilai & siswa.
   ============================================================ */
'use strict';
const XLSXLite = (() => {
  const xmlEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  const kolom = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const indeks = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };

  async function jszip() { if (!window.JSZip) await Lazy('js/vendor/jszip.min.js'); return window.JSZip; }

  function sheetXml(rows) {
    const lebar = [];
    rows.forEach(r => r.forEach((v, j) => { lebar[j] = Math.min(60, Math.max(lebar[j] || 8, String(v === null || v === undefined ? '' : v).length + 2)); }));
    const cols = lebar.length ? '<cols>' + lebar.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>' : '';
    const data = rows.map((r, i) => '<row r="' + (i + 1) + '">' + r.map((v, j) => {
      const ref = kolom(j) + (i + 1), st = i === 0 ? ' s="1"' : '';
      if (v === null || v === undefined || v === '') return '';
      if (typeof v === 'number' && isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
      return `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
    }).join('') + '</row>').join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${data}</sheetData></worksheet>`;
  }

  /** sheets: [{nama, rows: [[...]]}] */
  async function buat(sheets) {
    const Z = await jszip(), z = new Z();
    z.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
    z.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    z.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEsc(String(s.nama).slice(0, 31).replace(/[\\/?*\[\]:]/g, ' '))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
    z.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    z.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDBE1FF"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`);
    sheets.forEach((s, i) => z.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.rows)));
    return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  async function unduh(nama, sheets) { unduhBlob(await buat(sheets), nama); }

  /** Baca .xlsx → [{nama, rows}] (nilai mentah: angka/teks). */
  async function baca(file) {
    if (!file) throw new Error('Pilih file terlebih dahulu.');
    if (!/\.xlsx$/i.test(file.name)) throw new Error('Format harus .xlsx (Excel). Untuk .xls/.csv, buka di Excel lalu "Simpan Sebagai" .xlsx.');
    const Z = await jszip();
    const z = await Z.loadAsync(file);
    const p = new DOMParser();
    const x = async n => { const f = z.file(n); return f ? p.parseFromString(await f.async('string'), 'application/xml') : null; };
    const ss = [];
    const sst = await x('xl/sharedStrings.xml');
    if (sst) Array.from(sst.getElementsByTagName('si')).forEach(si => ss.push(Array.from(si.getElementsByTagName('t')).map(t => t.textContent).join('')));
    const wb = await x('xl/workbook.xml'), rels = await x('xl/_rels/workbook.xml.rels');
    const target = {};
    Array.from(rels.getElementsByTagName('Relationship')).forEach(r => { target[r.getAttribute('Id')] = r.getAttribute('Target').replace(/^\/?xl\//, ''); });
    const out = [];
    for (const s of Array.from(wb.getElementsByTagName('sheet'))) {
      const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      const doc = await x('xl/' + target[rid]);
      if (!doc) continue;
      const rows = [];
      Array.from(doc.getElementsByTagName('row')).forEach(rw => {
        const ri = Number(rw.getAttribute('r')) - 1, row = [];
        Array.from(rw.getElementsByTagName('c')).forEach(c => {
          const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0];
          let val = '';
          if (t === 's') val = ss[Number(v && v.textContent)] || '';
          else if (t === 'inlineStr') val = Array.from(c.getElementsByTagName('t')).map(z2 => z2.textContent).join('');
          else if (t === 'b') val = v && v.textContent === '1';
          else if (v) { const n = Number(v.textContent); val = t === 'str' || isNaN(n) ? v.textContent : n; }
          row[indeks(c.getAttribute('r'))] = val;
        });
        rows[ri] = Array.from(row, v => v === undefined ? '' : v);
      });
      out.push({ nama: s.getAttribute('name'), rows: Array.from(rows, r => r || []) });
    }
    return out;
  }
  return { buat, unduh, baca };
})();
