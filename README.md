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
js/app.min.js       SEMUA JavaScript aplikasi digabung & diperkecil (hasil `node build.js`) — inilah yang dimuat browser
build.js            penggabung file js/*.js → js/app.min.js
js/core.js          state, lapisan API (SWR, batch, antrean simpan offline), router, komponen UI
js/hitung.js        rumus NA & deskripsi (sama dengan backend)
js/grid.js          komponen grid nilai bergaya spreadsheet
js/cetak.js         lembar rapor, leger, QR verifikasi
js/pages-*.js       halaman publik, guru, wali kelas, kepala sekolah, operator, orang tua
js/pdf-rapor.js     PDF rapor per siswa / ZIP sekelas (ikut digabung ke app.min.js)
js/xlsx-lite.js     impor/ekspor .xlsx (dimuat saat diperlukan)
js/vendor/          JSZip, pdf-lib & pembuat QR (MIT) — tanpa CDN, dimuat saat diperlukan (lihat LISENSI.txt)
icons/              ikon aplikasi
```

## Memperbarui
Setelah mengubah file di `js/` (kecuali `config.js`), gabungkan ulang dulu (perlu Node.js):
```bash
node build.js
git add .
git commit -m "Pembaruan"
git push
```
Naikkan `VERSI` di `sw.js` setiap merilis perubahan berkas `js/` atau `css/`.

## Standar web modern (v1.5)
Mengikuti panduan *Modern Web Guidance* dari tim Chrome:
- **Jendela modal** memakai `<dialog>` bawaan (`showModal()`): halaman di belakang otomatis tidak bisa disentuh, Esc/gestur kembali menutup, fokus kembali ke tombol pembuka. Pesan yang muncul saat jendela terbuka tampil **di dalam** jendela.
- **Notifikasi (toast)** di lapisan teratas (`popover`), punya tombol tutup; pesan galat tidak hilang sendiri. Pembaca layar diberi tahu lewat `ariaNotify()` / satu wilayah live.
- **Menu di HP** berperilaku sebagai dialog modal (fokus terkunci di menu, Esc menutup).
- **Tab** (Leger & Rapor, portal orang tua, detail rombel) memakai pola ARIA tabs + panah kiri/kanan.
- **Formulir masuk**: isian salah ditandai `aria-invalid` dan fokus langsung ke isian tersebut.
- **Ukuran teks** mengikuti pengaturan HP/OS (`<meta name="text-scale">`, ukuran huruf dalam `rem`).
- **Trusted Types**: semua penulisan HTML lewat kebijakan `raporkilat` di `js/core.js`. Saat menambah kode, render HTML **hanya** dengan `` mount(el, html`...`) `` — jangan `el.innerHTML = '...'` (akan ditolak browser).
