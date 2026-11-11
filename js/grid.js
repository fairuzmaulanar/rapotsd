/* ============================================================
   RaporKilat SD — grid.js
   Komponen spreadsheet ringan untuk input nilai:
   panah/Enter/Tab, ketik langsung, Delete, Ctrl+C/V (TSV dari
   Excel), Ctrl+Z, seleksi blok dengan Shift, ketuk di HP.
   ============================================================ */
'use strict';

class SheetGrid {
  /**
   * opts.groups : [{label, span, cls}] baris header atas (opsional)
   * opts.cols   : [{key, label, sub, title, edit, cls(row), val(row), tampil(v,row)}]
   * opts.rows   : array data baris
   * opts.onEdit : (perubahan [{row, col, value}]) => void
   * opts.onPilih: (row) => void   (saat baris aktif berganti)
   * opts.kunci  : true = hanya baca
   */
  constructor(el, opts) {
    this.el = el; this.o = opts;
    this.r = 0; this.c = opts.cols.findIndex(c => c.edit); if (this.c < 0) this.c = 0;
    this.anchor = null; this.editing = null; this.undo = []; this.redo = [];
    this.render();
    this.bind();
  }
  get cols() { return this.o.cols; }
  get rows() { return this.o.rows; }
  setRows(rows) { this.o.rows = rows; this.r = Math.min(this.r, Math.max(0, rows.length - 1)); this.render(); }
  setKunci(k) { this.o.kunci = k; this.el.querySelector('table').classList.toggle('locked', !!k); }

  render() {
    const o = this.o;
    const head1 = o.groups ? html`<tr>${o.groups.map(g => html`<th colspan="${g.span}" class="${g.cls || ''}" title="${g.title || ''}">${g.label}</th>`)}</tr>` : '';
    const head2 = html`<tr>${this.cols.map((c, i) => html`<th class="${c.thCls || ''}" title="${c.title || ''}" data-ci="${i}">${c.label}${c.sub ? html`<span class="tpd">${c.sub}</span>` : ''}</th>`)}</tr>`;
    const body = this.rows.map((row, ri) => this.rowHtml(row, ri));
    mount(this.el, html`<div class="sheet-wrap" tabindex="0" aria-label="Lembar nilai"><table class="sheet ${o.kunci ? 'locked' : ''}" role="grid">
      <thead>${head1}${head2}</thead><tbody>${body}</tbody></table></div>`);
    if (!o.groups) $$('thead tr:nth-child(1) th', this.el).forEach(th => { th.style.top = '0'; });
    this.wrap = this.el.querySelector('.sheet-wrap');
    this.tbody = this.el.querySelector('tbody');
    this.paint();
  }
  rowHtml(row, ri) {
    return html`<tr data-ri="${ri}" class="${ri === this.r ? 'row-sel' : ''}">${this.cols.map((c, ci) => this.cellHtml(row, ri, c, ci))}</tr>`;
  }
  cellHtml(row, ri, c, ci) {
    const v = c.val ? c.val(row) : row[c.key];
    const tampil = c.tampil ? c.tampil(v, row) : (v === null || v === undefined || v === '' ? '' : v);
    const extra = c.cls ? c.cls(row, v) : '';
    if (c.edit) {
      const kosongC = (v === null || v === undefined || v === '') ? 'empty-cell' : '';
      return html`<td class="cell ${kosongC} ${extra}" data-ri="${ri}" data-ci="${ci}" role="gridcell"><span>${tampil}</span></td>`;
    }
    return html`<td class="${c.tdCls || ''} ${extra}" data-ri="${ri}" data-ci="${ci}">${c.raw ? raw(tampil) : tampil}</td>`;
  }
  refreshRow(ri) {
    const tr = this.tbody.querySelector(`tr[data-ri="${ri}"]`);
    if (!tr || !this.rows[ri]) return;
    const tmp = document.createElement('tbody');
    tmp.innerHTML = String(this.rowHtml(this.rows[ri], ri));
    tr.replaceWith(tmp.firstElementChild);
    this.paint();
  }
  refreshAll() { this.rows.forEach((_, i) => this.refreshRow(i)); }
  sel() {
    if (!this.anchor) return { r1: this.r, r2: this.r, c1: this.c, c2: this.c };
    return { r1: Math.min(this.anchor.r, this.r), r2: Math.max(this.anchor.r, this.r), c1: Math.min(this.anchor.c, this.c), c2: Math.max(this.anchor.c, this.c) };
  }
  paint() {
    $$('.active,.insel', this.tbody).forEach(td => td.classList.remove('active', 'insel'));
    $$('tr.row-sel', this.tbody).forEach(tr => tr.classList.remove('row-sel'));
    const tr = this.tbody.querySelector(`tr[data-ri="${this.r}"]`);
    if (tr) tr.classList.add('row-sel');
    const s = this.sel();
    if (this.anchor) for (let r = s.r1; r <= s.r2; r++) for (let c = s.c1; c <= s.c2; c++) {
      const td = this.tbody.querySelector(`td[data-ri="${r}"][data-ci="${c}"]`);
      if (td && td.classList.contains('cell')) td.classList.add('insel');
    }
    const td = this.td();
    if (td) td.classList.add('active');
  }
  td() { return this.tbody.querySelector(`td[data-ri="${this.r}"][data-ci="${this.c}"]`); }
  pindah(r, c, perluas) {
    const pr = this.r;
    if (perluas && !this.anchor) this.anchor = { r: this.r, c: this.c };
    if (!perluas) this.anchor = null;
    this.r = Math.max(0, Math.min(this.rows.length - 1, r));
    this.c = Math.max(0, Math.min(this.cols.length - 1, c));
    this.paint();
    const td = this.td();
    if (td) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (pr !== this.r && this.o.onPilih) this.o.onPilih(this.rows[this.r], this.r);
  }
  editCols() { return this.cols.map((c, i) => c.edit ? i : -1).filter(i => i >= 0); }
  nextEdit(c, arah) {
    const e = this.editCols();
    if (!e.length) return c;
    if (arah > 0) return e.find(i => i > c) ?? e[e.length - 1];
    return [...e].reverse().find(i => i < c) ?? e[0];
  }
  mulaiEdit(awal) {
    const col = this.cols[this.c];
    if (!col || !col.edit || this.o.kunci || !this.rows[this.r]) return;
    const td = this.td();
    const v = col.val ? col.val(this.rows[this.r]) : this.rows[this.r][col.key];
    this.editing = { r: this.r, c: this.c };
    td.innerHTML = '';
    const inp = document.createElement('input');
    inp.inputMode = col.inputMode || 'decimal';
    inp.autocomplete = 'off';
    inp.value = awal !== undefined ? awal : (v === null || v === undefined ? '' : v);
    td.appendChild(inp);
    inp.focus();
    if (awal === undefined) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.selesaiEdit(true); this.pindah(this.r + (e.shiftKey ? -1 : 1), this.c); this.fokus(); }
      else if (e.key === 'Tab') { e.preventDefault(); this.selesaiEdit(true); this.pindah(this.r, this.nextEdit(this.c, e.shiftKey ? -1 : 1)); this.fokus(); }
      else if (e.key === 'Escape') { e.preventDefault(); this.selesaiEdit(false); this.fokus(); }
      else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !e.shiftKey) { e.preventDefault(); this.selesaiEdit(true); this.pindah(this.r + (e.key === 'ArrowDown' ? 1 : -1), this.c); this.fokus(); }
    });
    inp.addEventListener('blur', () => { if (this.editing) this.selesaiEdit(true); });
  }
  selesaiEdit(simpan) {
    if (!this.editing) return;
    const { r, c } = this.editing;
    const inp = this.td() && this.tbody.querySelector(`td[data-ri="${r}"][data-ci="${c}"] input`);
    const val = inp ? inp.value.trim() : '';
    this.editing = null;
    if (simpan) this.terapkan([{ r, c, value: val }]);
    else this.refreshRow(r);
  }
  /** Validasi & kirim perubahan ke pemilik grid. */
  terapkan(list, dariUndo) {
    if (this.o.kunci) { toast('Nilai terkunci untuk periode ini.', 'warn'); this.refreshAll(); return; }
    const valid = [], riwayat = [];
    for (const x of list) {
      const col = this.cols[x.c], row = this.rows[x.r];
      if (!col || !col.edit || !row) continue;
      let v = x.value === '' || x.value === null || x.value === undefined ? null : x.value;
      if (v !== null) {
        if (col.validasi) { const hasil = col.validasi(v, row); if (hasil && hasil.error) { toast(hasil.error, 'err'); continue; } v = hasil ? hasil.value : v; }
      }
      const lama = col.val ? col.val(row) : row[col.key];
      if ((lama === null || lama === undefined || lama === '' ? null : lama) === v) continue;
      riwayat.push({ r: x.r, c: x.c, lama: lama === undefined ? null : lama, baru: v });
      valid.push({ row, col, value: v, r: x.r });
    }
    if (!valid.length) { list.forEach(x => this.refreshRow(x.r)); return; }
    if (!dariUndo) { this.undo.push(riwayat); if (this.undo.length > 100) this.undo.shift(); this.redo = []; }
    this.o.onEdit(valid);
    [...new Set(valid.map(v => v.r))].forEach(r => this.refreshRow(r));
    valid.forEach(v => { const td = this.tbody.querySelector(`td[data-ri="${v.r}"][data-ci="${this.cols.indexOf(v.col)}"]`); if (td) td.classList.add('dirty'); });
  }
  hapusSeleksi() {
    const s = this.sel(), list = [];
    for (let r = s.r1; r <= s.r2; r++) for (let c = s.c1; c <= s.c2; c++) if (this.cols[c].edit) list.push({ r, c, value: null });
    this.terapkan(list);
  }
  tempel(teks) {
    const baris = teks.replace(/\r/g, '').split('\n');
    if (baris.length && baris[baris.length - 1] === '') baris.pop();
    const e = this.editCols(), mulai = e.indexOf(this.c) >= 0 ? e.indexOf(this.c) : 0;
    const list = [];
    baris.forEach((b, i) => {
      b.split('\t').forEach((v, j) => {
        const ci = e[mulai + j], ri = this.r + i;
        if (ci === undefined || ri >= this.rows.length) return;
        list.push({ r: ri, c: ci, value: v.trim().replace(',', '.') });
      });
    });
    if (list.length) { this.terapkan(list); toast(list.length + ' sel ditempel dari clipboard.', 'ok'); }
  }
  salin() {
    const s = this.sel(), out = [];
    for (let r = s.r1; r <= s.r2; r++) {
      const sel = [];
      for (let c = s.c1; c <= s.c2; c++) { const col = this.cols[c], v = col.val ? col.val(this.rows[r]) : this.rows[r][col.key]; sel.push(v === null || v === undefined ? '' : v); }
      out.push(sel.join('\t'));
    }
    return out.join('\n');
  }
  batal(redo) {
    const st = redo ? this.redo : this.undo, lawan = redo ? this.undo : this.redo;
    const h = st.pop();
    if (!h) return;
    lawan.push(h);
    this.terapkan(h.map(x => ({ r: x.r, c: x.c, value: redo ? x.baru : x.lama })), true);
  }
  fokus() { this.wrap.focus({ preventScroll: true }); }
  bind() {
    const el = this.el;
    el.addEventListener('mousedown', e => {
      const td = e.target.closest('td[data-ci]');
      if (!td || e.target.tagName === 'INPUT') return;
      if (this.editing) this.selesaiEdit(true);
      this.pindah(+td.dataset.ri, +td.dataset.ci, e.shiftKey);
      e.preventDefault();
      this.fokus();
    });
    el.addEventListener('dblclick', e => { if (e.target.closest('td.cell')) this.mulaiEdit(); });
    // HP/tablet: ketuk sel = langsung edit
    el.addEventListener('click', e => {
      const td = e.target.closest('td.cell');
      if (td && (matchMedia('(pointer: coarse)').matches)) this.mulaiEdit();
    });
    el.addEventListener('keydown', e => {
      if (this.editing || e.target.tagName === 'INPUT') return;
      const k = e.key, mod = e.ctrlKey || e.metaKey;
      const nav = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] }[k];
      if (nav) { e.preventDefault(); this.pindah(this.r + nav[0], this.c + nav[1], e.shiftKey); return; }
      if (k === 'Enter') { e.preventDefault(); if (e.shiftKey) this.pindah(this.r - 1, this.c); else this.pindah(this.r + 1, this.c); return; }
      if (k === 'Tab') { e.preventDefault(); this.pindah(this.r, this.nextEdit(this.c, e.shiftKey ? -1 : 1)); return; }
      if (k === 'F2') { e.preventDefault(); this.mulaiEdit(); return; }
      if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); this.hapusSeleksi(); return; }
      if (mod && k.toLowerCase() === 'z') { e.preventDefault(); this.batal(e.shiftKey); return; }
      if (mod && k.toLowerCase() === 'y') { e.preventDefault(); this.batal(true); return; }
      if (mod && k.toLowerCase() === 'a') { e.preventDefault(); this.anchor = { r: 0, c: this.editCols()[0] || 0 }; this.r = this.rows.length - 1; this.c = this.editCols().slice(-1)[0] || this.c; this.paint(); return; }
      if (!mod && k.length === 1 && /[0-9.,\-]/.test(k)) { e.preventDefault(); this.mulaiEdit(k === ',' ? '.' : k); }
    });
    el.addEventListener('paste', e => {
      if (this.editing) return;
      const t = (e.clipboardData || window.clipboardData).getData('text');
      if (t) { e.preventDefault(); this.tempel(t); }
    });
    el.addEventListener('copy', e => {
      if (this.editing) return;
      e.clipboardData.setData('text/plain', this.salin());
      e.preventDefault();
    });
  }
}

/** Validator nilai 0–100 standar. */
function validasiNilai(v) {
  const n = num(v);
  if (n === null) return { error: 'Nilai "' + v + '" bukan angka.' };
  if (n < 0 || n > 100) return { error: 'Nilai harus 0–100 (diketik ' + v + ').' };
  return { value: Math.round(n * 100) / 100 };
}
