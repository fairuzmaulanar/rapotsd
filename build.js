/* ============================================================
   build.js — menggabungkan & memperkecil JavaScript aplikasi
   menjadi SATU file: js/app.min.js  (config.js tetap terpisah).

   Jalankan dari folder ini setiap kali mengubah file di js/:
       node build.js
   Perlu Node.js (nodejs.org, versi LTS). esbuild diunduh otomatis
   oleh npx pada pemakaian pertama (butuh internet).
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const DIR = __dirname;
const URUTAN = ['core', 'hitung', 'grid', 'cetak', 'pages-publik', 'pages-guru', 'pages-wali',
  'pages-kepsek', 'pages-operator', 'pages-ortu', 'pdf-rapor', 'app'];   // urutan penting, sama seperti dulu di index.html
const sementara = path.join(DIR, 'js', '_gabung.js');
const hasil = path.join(DIR, 'js', 'app.min.js');

const isi = URUTAN.map(f => '/* ' + f + '.js */\n' + fs.readFileSync(path.join(DIR, 'js', f + '.js'), 'utf8')).join('\n;\n');
fs.writeFileSync(sementara, isi);
try {
  const esbuild = process.env.ESBUILD || 'npx --yes esbuild';
  execSync(`${esbuild} "${sementara}" --minify --charset=utf8 --legal-comments=none --outfile="${hasil}"`, { stdio: 'inherit' });
} finally {
  fs.unlinkSync(sementara);
}
const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log('✔ js/app.min.js dibuat: ' + kb(fs.statSync(hasil).size) + ' (dari ' + kb(Buffer.byteLength(isi)) + ' sumber)');
console.log('  Ingat: naikkan VERSI di sw.js, lalu git add . / git commit / git push');
