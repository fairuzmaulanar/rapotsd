/* ============================================================
   RaporKilat SD — hitung.js
   Salinan aturan perhitungan dari backend (Hitung.gs) agar nilai
   akhir & deskripsi tampil seketika saat guru mengetik.
   ============================================================ */
'use strict';
const Hitung = (() => {
  const rata = arr => { const a = arr.filter(x => x !== null && x !== undefined && x !== '' && !isNaN(Number(x))); return a.length ? a.reduce((s, x) => s + Number(x), 0) / a.length : null; };
  const b1 = x => x === null ? null : Math.round(x * 10) / 10;
  const kecil = s => { s = String(s || '').trim(); return s ? s[0].toLowerCase() + s.slice(1) : s; };
  const titik = s => { s = String(s || '').trim(); return s && !/[.!?]$/.test(s) ? s + '.' : s; };

  function predikat(nilai, daftar) {
    if (nilai === null || nilai === undefined) return null;
    const n = Math.round(Number(nilai));
    for (const p of daftar) if (n >= Number(p.nilai_min) && n <= Number(p.nilai_max)) return p;
    return daftar.length ? daftar[daftar.length - 1] : null;
  }

  function opsi(siswa) {
    const p = S.pengaturan;
    const ya = /^(ya|true|1)$/i.test(String(p.deskripsi_nama || ''));
    return {
      predikat: (S.boot && S.boot.predikat) || [],
      bimbingan: p.kalimat_bimbingan || 'Perlu bimbingan dalam',
      panggilan: ya && siswa ? (siswa.panggilan || String(siswa.nama || '').split(' ')[0]) : ''
    };
  }

  /** Identik dengan hitungSiswa_ di server. */
  function siswa(bn, mr, aid, op) {
    const lm = bn.lm || [], nilai = bn.nilai || {}, desk = (bn.desk || {})[aid] || null;
    const ntp = (nilai.tp || {})[aid] || {}, nlm = (nilai.lm || {})[aid] || {};
    const tpList = [], tpIsi = [];
    lm.forEach(l => (l.tp || []).forEach(t => { tpList.push(t); const v = num(ntp[t.id]); if (v !== null) tpIsi.push({ id: t.id, kode: t.kode, d: t.d, n: v }); }));
    const rataTP = rata(tpIsi.map(x => x.n));
    const rataLM = rata(lm.map(l => num(nlm[l.id])));
    const sts = num((nilai.sts || {})[aid]), sas = num((nilai.sas || {})[aid]);
    const w = k => { const v = mr[k] === '' || mr[k] === undefined ? 1 : Number(mr[k]); return isNaN(v) ? 0 : v; };
    const bTP = w('bobot_tp'), bLM = w('bobot_lm'), bAS = w('bobot_as');
    let p = 0, q = 0;
    if (rataTP !== null && bTP) { p += rataTP * bTP; q += bTP; }
    if (rataLM !== null && bLM) { p += rataLM * bLM; q += bLM; }
    if (sas !== null && bAS) { p += sas * bAS; q += bAS; }
    const na = q ? Math.round(p / q) : null;
    let pS = 0, qS = 0;
    if (rataTP !== null && bTP) { pS += rataTP * bTP; qS += bTP; }
    if (sts !== null && bAS) { pS += sts * bAS; qS += bAS; }
    const naSts = qS ? Math.round(pS / qS) : null;

    let tMax = null, tMin = null;
    tpIsi.forEach(t => { if (!tMax || t.n > tMax.n) tMax = t; if (!tMin || t.n < tMin.n) tMin = t; });
    const kktp = Number(mr.kktp) || 0;
    const awal = op.panggilan ? 'Ananda ' + op.panggilan + ' ' : '';
    let autoH = '', autoL = '';
    if (tMax) {
      const pH = predikat(tMax.n, op.predikat);
      const kal = pH ? pH.kalimat_awal : 'Menunjukkan penguasaan dalam';
      autoH = titik(awal ? awal + kecil(kal) + ' ' + kecil(tMax.d) : kal + ' ' + kecil(tMax.d));
    }
    if (tMin && tMax && tMin.n < tMax.n) {
      let kalL;
      if (kktp && tMin.n < kktp) kalL = op.bimbingan || 'Perlu bimbingan dalam';
      else { const pL = predikat(tMin.n, op.predikat); kalL = pL ? pL.kalimat_awal : 'Menunjukkan penguasaan dalam'; }
      autoL = titik(kalL + ' ' + kecil(tMin.d));
    }
    const deskH = desk && desk.h ? desk.h : autoH;
    const deskL = desk && desk.h ? (desk.l || '') : autoL;
    const pr = predikat(na, op.predikat);
    return {
      rataTP: b1(rataTP), rataLM: b1(rataLM), sts, sas, na, naSts,
      predikat: pr ? pr.label : '', tuntas: na === null ? null : na >= kktp,
      tpMax: tMax, tpMin: tMin, autoH, autoL, deskH, deskL,
      deskripsi: [deskH, deskL].filter(Boolean).join(' '),
      manual: !!(desk && desk.h), tpTotal: tpList.length, tpTerisi: tpIsi.length,
      lengkap: tpList.length > 0 && tpIsi.length === tpList.length && sas !== null
    };
  }
  function rataLMSiswa(bn, aid, lmId) {
    const l = (bn.lm || []).find(x => x.id === lmId);
    if (!l) return null;
    const ntp = ((bn.nilai || {}).tp || {})[aid] || {};
    return b1(rata((l.tp || []).map(t => num(ntp[t.id]))));
  }
  function kelasPredikat(label) {
    const s = String(label || '').toLowerCase();
    return s.startsWith('sangat') ? 'ok' : s.startsWith('baik') ? 'pri' : s.startsWith('cukup') ? 'warn' : s ? 'err' : '';
  }
  return { siswa, opsi, predikat, rataLMSiswa, kelasPredikat, rata };
})();
