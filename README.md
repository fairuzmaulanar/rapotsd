# RaporKilat SD — Frontend (PWA)

Rapor digital SD Kurikulum Merdeka: grid nilai TP & LM bergaya Excel dengan simpan otomatis,
nilai sumatif STS/SAS, deskripsi capaian otomatis, kokurikuler 8 dimensi profil lulusan,
alur ajukan → setujui → kunci, cetak rapor A4/F4 dengan QR verifikasi, dan portal orang tua.

- **Frontend**: HTML/CSS/JavaScript murni (tanpa build), dihosting di GitHub Pages, bisa dipasang sebagai aplikasi (PWA).
- **Backend**: Google Apps Script sebagai REST API JSON + Google Sheets sebagai database (dipasang terpisah, tidak ada di repository ini).

Panduan lengkap: **[PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)**

## Konfigurasi
Satu-satunya pengaturan ada di `js/config.js`:
```js
window.CONFIG = { GAS_URL: 'https://script.google.com/macros/s/ID_DEPLOYMENT/exec' };
```
Jangan menaruh sandi, token, atau API key di repository ini — semua rahasia tersimpan di Script Properties backend.

## Struktur
```
index.html          kerangka aplikasi
manifest.json       identitas PWA
sw.js               service worker (cache berkas aplikasi; data API tidak di-cache di sini)
css/app.css         sistem desain & tampilan cetak
js/config.js        URL backend
js/core.js          state, lapisan API (SWR, batch, antrean simpan offline), router, komponen UI
js/hitung.js        rumus NA & deskripsi (sama dengan backend)
js/grid.js          komponen grid nilai bergaya spreadsheet
js/cetak.js         lembar rapor, leger, QR verifikasi
js/pages-*.js       halaman publik, guru, wali kelas, kepala sekolah, operator, orang tua
js/xlsx-lite.js     impor/ekspor .xlsx (dimuat saat diperlukan)
js/vendor/          JSZip (MIT) & pembuat QR (MIT) — tanpa CDN
icons/              ikon aplikasi
```

## Memperbarui
```bash
git add .
git commit -m "Pembaruan"
git push
```
Naikkan `VERSI` di `sw.js` setiap merilis perubahan berkas `js/` atau `css/`.
