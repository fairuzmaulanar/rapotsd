# Panduan Instalasi RaporKilat SD

Aplikasi rapor digital SD Kurikulum Merdeka. Terdiri dari **dua bagian terpisah**:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** (server & database) | `Kode.gs` + `appsscript.json` | Google Apps Script + Google Sheets (akun Google sekolah) |
| **Frontend** (tampilan aplikasi) | isi ZIP `raporkilat-frontend.zip` | GitHub Pages (gratis) |

Urutan pemasangan: **Backend dulu** (untuk mendapatkan URL server), lalu **Frontend**.

Waktu yang dibutuhkan: ±30–45 menit untuk pertama kali.

---

## BAGIAN A — Memasang backend (Google Apps Script)

> Gunakan **akun Google milik sekolah** (bukan akun pribadi guru). Database rapor akan tersimpan di Google Drive akun ini.

### A1. Buat proyek Apps Script
1. Buka **https://script.google.com** → klik **Proyek baru** (New project).
2. Klik judul "Proyek tanpa judul" di kiri atas → ganti menjadi `RaporKilat SD Backend`.
3. Klik ikon roda gigi **Setelan Proyek** (Project Settings) di menu kiri → centang **"Tampilkan file manifes appsscript.json di editor"**.

### A2. Tempel kode
1. Kembali ke **Editor** (ikon `< >`).
2. Klik file **`Kode.gs`** → hapus semua isinya → tempel seluruh isi file **`Kode.gs`** yang Anda terima.
3. Klik file **`appsscript.json`** → hapus semua isinya → tempel isi file **`appsscript.json`** yang Anda terima.
4. *(Opsional)* Di bagian atas `Kode.gs`, cari baris `var EMAIL_OPERATOR_AWAL = '';` dan isi email operator sekolah, misalnya `'operator@sdn1contoh.sch.id'`. Jika dikosongkan, akun operator pertama memakai email `operator@sekolah.id`.
5. Tekan **Ctrl+S** untuk menyimpan.

### A3. Jalankan setup (sekali saja)
1. Di bilah atas editor, pilih fungsi **`setupAppEnvironment`** → klik **Jalankan** (Run).
2. Muncul permintaan izin → **Tinjau izin** → pilih akun sekolah → jika muncul "Google belum memverifikasi aplikasi ini", klik **Lanjutan** → **Buka RaporKilat SD Backend (tidak aman)** → **Izinkan**.
   *Aplikasi hanya meminta izin mengelola Google Spreadsheet — tidak meminta akses Gmail atau Drive lain.*
3. Buka **Log eksekusi** di bagian bawah. **Catat dua hal ini sekarang** (hanya tampil sekali):
   - 🔐 **AKSES DARURAT** — `email: darurat | sandi: ...` → simpan di tempat aman (untuk keadaan darurat bila operator lupa sandi).
   - 👤 **AKUN OPERATOR PERTAMA** — `email: ... | sandi: ...` → dipakai untuk masuk pertama kali.
4. Log juga menampilkan alamat spreadsheet **"🗃️ Database — RaporKilat SD"** yang dibuat otomatis di Google Drive.

> **Setup aman diulang.** Menjalankan `setupAppEnvironment` lagi tidak menghapus data dan tidak mengganti sandi.

### A4. (Opsional) Isi data demo untuk mencoba
Jalankan fungsi **`isiDataDemo`**. Log akan menampilkan sandi akun demo (`kepsek@demo.sch.id`, `wali4@demo.sch.id`, `wali5@demo.sch.id`, `pjok@demo.sch.id`, `pai@demo.sch.id`).
Untuk pemakaian sungguhan, sebaiknya **buat proyek Apps Script terpisah** tanpa data demo, atau nonaktifkan akun demo di menu *Pengguna & Peran*.

### A5. Deploy sebagai Web App
1. Klik tombol biru **Terapkan** (Deploy) → **Deployment baru** (New deployment).
2. Klik ikon roda gigi di samping "Pilih jenis" → pilih **Aplikasi web** (Web app).
3. Isi:
   - **Deskripsi**: `Versi 1`
   - **Jalankan sebagai** (Execute as): **Saya** (email Anda)
   - **Yang memiliki akses** (Who has access): **Siapa saja** (Anyone)
4. Klik **Terapkan** → salin **URL aplikasi web** yang berakhiran **`/exec`**.

**Uji URL:** buka `URL-ANDA/exec?action=ping` di browser. Harus tampil teks seperti
`{"success":true,"data":{"pong":true,...}}`. Jika muncul halaman login Google, ulangi A5 dan pastikan aksesnya **Siapa saja**.

> "Siapa saja" aman: setiap permintaan data tetap wajib membawa token sesi yang ditandatangani server. Tanpa login, server hanya melayani proses masuk, `ping`, verifikasi QR, dan nama sekolah.

---

## BAGIAN B — Memasang frontend di GitHub Pages

### B1. Siapkan folder
1. Unduh **`raporkilat-frontend.zip`** → klik kanan → **Extract All / Ekstrak Semua**.
2. Hasilnya folder **`raporkilat-frontend`**. Buka folder itu — Anda **harus langsung melihat** `index.html`, folder `css`, `js`, `icons`, serta `manifest.json` dan `sw.js`.

```
raporkilat-frontend\      ← INI folder proyek (tempat git init)
├── index.html
├── manifest.json
├── sw.js
├── README.md
├── PANDUAN-INSTALASI.md
├── css\app.css
├── icons\ (3 ikon)
└── js\ (config.js, core.js, … , vendor\)
```

> ⚠️ Jika setelah dibuka yang terlihat justru **satu folder lagi** bernama `raporkilat-frontend`, masuklah ke folder dalam itu. Folder yang benar adalah folder yang **langsung berisi `index.html`**.

### B2. Isi alamat server
Buka **`js/config.js`** dengan Notepad → ganti teks `https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOYMENT_ANDA/exec` dengan URL `/exec` dari langkah A5 → simpan.

```js
window.CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycb.../exec'
};
```
File ini **hanya** boleh berisi URL tersebut — jangan menaruh sandi, token, atau API key apa pun.

### B3. Install Git & buat akun GitHub (sekali seumur komputer)
1. Windows: unduh **https://git-scm.com/download/win** → instal dengan pilihan bawaan. Mac: buka Terminal → ketik `git --version`.
2. Daftar di **https://github.com** (username akan menjadi bagian alamat situs: `username.github.io`).
3. Buka **PowerShell** (Windows) atau **Terminal** (Mac), lalu jalankan:
```bash
git config --global user.name "Nama Anda"
git config --global user.email "email-akun-github@contoh.com"
```

### B4. Buat repository
Di github.com: tombol **+** → **New repository** → nama misalnya `rapor-sdn1` → pilih **Public** → **jangan** centang README/.gitignore/license → **Create repository**. Biarkan halaman itu terbuka.

### B5. Kirim (push) folder ke GitHub
1. Buka folder **`raporkilat-frontend`** di File Explorer → klik address bar → ketik `powershell` → Enter. PowerShell terbuka tepat di folder itu.
2. **Periksa dulu** dengan perintah:
```powershell
dir
```
   Baris yang muncul **wajib** memuat `index.html`. Jika yang muncul hanya satu folder, masuk dulu: `cd raporkilat-frontend`, lalu `dir` lagi.
3. Jalankan **satu per satu**:
```bash
git init
git add .
git commit -m "Upload pertama RaporKilat"
git branch -M main
git remote add origin https://github.com/USERNAME/rapor-sdn1.git
git push -u origin main
```
   (Ganti `USERNAME` dan `rapor-sdn1` sesuai milik Anda. Perhatikan **titik** di `git add .`)
4. Saat diminta **Password**, GitHub **tidak menerima sandi akun** — gunakan **Personal Access Token**:
   buka **https://github.com/settings/tokens** → *Generate new token (classic)* → centang **repo** → *Generate* → salin token `ghp_...` → tempel sebagai password.
   Saat menempel, **layar memang tidak menampilkan apa-apa** — itu normal, langsung tekan Enter.
5. Berhasil bila muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

> Jangan memakai "Add file → Upload files" di web GitHub — cara itu merusak struktur folder `css/` dan `js/`.

### B6. Aktifkan GitHub Pages
Repository → **Settings** → **Pages** → *Source*: **Deploy from a branch** → *Branch*: **main** / **(root)** → **Save**. Centang **Enforce HTTPS**.
Tunggu 1–2 menit → muncul `Your site is live at https://USERNAME.github.io/rapor-sdn1/`.

### B7. Buka dan pasang aplikasi
- Buka alamat situs → klik **Masuk Guru / Staf** → masuk dengan akun operator dari langkah A3.
- Di HP (Chrome/Edge), muncul tombol **Pasang aplikasi** di pojok kiri bawah, atau menu ⋮ → **Tambahkan ke Layar Utama**.

---

## BAGIAN C — Langkah pertama memakai aplikasi

| Urutan | Siapa | Menu | Yang dilakukan |
|---|---|---|---|
| 1 | Operator | **Profil, Periode & Predikat** | Lengkapi profil & kop sekolah, nama/NIP kepala sekolah. Periksa periode aktif dan isi **tanggal rapor**. |
| 2 | Operator | **Pengguna & Peran** | Tambah akun guru & kepala sekolah. Sandi awal tampil sekali — bagikan ke yang bersangkutan. |
| 3 | Operator | **Data Siswa** | Unduh *Template impor* → isi → *Impor Excel* (bisa juga dari ekspor Dapodik). Impor aman diulang, tidak membuat data ganda. |
| 4 | Operator | **Rombel & Pengampu** | Buat rombel, pilih wali kelas, isi anggota, atur guru pengampu, KKTP, bobot. |
| 5 | Guru | **Lingkup Materi & TP** | Tulis lingkup materi (LM) dan tujuan pembelajaran (TP) — bisa tempel dari Word/Excel. |
| 6 | Guru | **Grid Nilai TP & LM**, **Nilai Sumatif** | Isi nilai seperti di Excel (panah/Enter/Tab, Ctrl+V). Tersimpan otomatis. |
| 7 | Wali kelas | **Absensi, Ekskul & Catatan**, **Kokurikuler 8 Dimensi** | Lengkapi data non-akademik dan penilaian kokurikuler. |
| 8 | Wali kelas | **Leger & Rapor** → *Status & pengajuan* | Periksa leger & pratinjau, lalu **Ajukan ke Kepala Sekolah**. |
| 9 | Kepala sekolah | **Review & Persetujuan** | Tinjau, uji petik rapor, lalu **Setujui** (konfirmasi sandi) atau **Kembalikan** dengan catatan. |
| 10 | Operator | **Status & Kunci Rapor** | Kunci rapor yang sudah disetujui. |
| 11 | Wali kelas | **Leger & Rapor** → *Pratinjau & cetak* | Cetak sekelas → di dialog cetak pilih **Simpan sebagai PDF** (A4 atau F4). |
| 12 | Operator | **Data Siswa** → *Buat PIN orang tua* | Cetak kartu PIN. Orang tua masuk ke **Portal Orang Tua** dengan NISN + PIN. |

**Pindah dari file rapor Excel lama:** unggah file `.xlsm`/`.xlsx` ke Google Drive akun yang sama → *Buka dengan Google Spreadsheet* → salin URL-nya → menu **Migrasi dari Excel/Sheets** → *Pindai* → *Simulasi* → *Jalankan*. File lama hanya dibaca, tidak diubah.

---

## BAGIAN D — Memperbarui aplikasi

**Backend** (setelah mengganti isi `Kode.gs`):
**Terapkan → Kelola deployment → ikon pensil (Edit) → Versi: Versi baru → Terapkan.**
URL `/exec` tetap sama, jadi `config.js` tidak perlu diubah. *Jangan* membuat "Deployment baru" untuk pembaruan — itu menghasilkan URL berbeda.

**Frontend** (dari folder `raporkilat-frontend`):
```bash
git add .
git commit -m "Pembaruan"
git push
```
Jika Anda mengubah berkas di `js/` atau `css/`, naikkan juga nomor `VERSI` di baris atas `sw.js` (mis. `raporkilat-v1.0.1`) agar pengguna mendapat notifikasi **"Versi baru tersedia"**. Bila tampilan masih versi lama, tekan **Ctrl+Shift+R**.

---

## BAGIAN E — Keamanan & perawatan

- **Semua rahasia hanya di Script Properties** (Setelan Proyek → Properti skrip): `SESSION_SECRET`, hash sandi `PW_*`, PIN orang tua `PW_ortu_*`, status cabut-sesi `REV_*`. Tidak ada sandi atau token di kode, di spreadsheet, maupun di GitHub.
- Sandi disimpan sebagai *hash* bergaram (300 iterasi HMAC-SHA256). Setelah 5 kali salah, akun dikunci 15 menit.
- **Jangan berikan akses edit proyek Apps Script** ke orang lain selain admin TI sekolah. Spreadsheet database jangan dibagikan publik.
- Fungsi perawatan (jalankan dari editor Apps Script):

| Fungsi | Kegunaan |
|---|---|
| `cekKonfigurasi` | Memeriksa kelengkapan konfigurasi (rahasia ditampilkan tersamar). |
| `resetAksesDarurat` | Membuat sandi akses darurat baru (tampil sekali di log). |
| `rotasiSecretSesi` | Mengakhiri **semua** sesi login (semua pengguna harus masuk ulang). |
| `bersihkanCache` | Memaksa data dibaca ulang dari spreadsheet (mis. setelah mengedit sheet secara manual). |

- **Cadangan:** buka spreadsheet database → *File → Buat salinan* setiap akhir semester.
- Hindari mengedit sheet database secara manual. Jika terpaksa, jalankan `bersihkanCache` sesudahnya.

---

## BAGIAN F — Mengatasi masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| "URL server belum diisi" | `js/config.js` belum diubah | Isi `GAS_URL` (B2), lalu `git add . / commit / push`. |
| "Server mengembalikan respons tidak valid" | Web App tidak berakses *Siapa saja* | Kelola deployment → Edit → *Yang memiliki akses: Siapa saja*. |
| Situs GitHub 404 | `git init` dijalankan di folder yang salah | Pastikan `dir` menampilkan `index.html`, lalu push ulang dari folder itu (`git push -u origin main --force`). |
| Tampilan polos tanpa warna | Struktur folder rusak (upload via web) | Push ulang lewat terminal dari folder `raporkilat-frontend`. |
| Ikon tampil sebagai tulisan (mis. "dashboard") | Font ikon belum termuat (internet lambat) | Muat ulang halaman; setelah sekali termuat, ikon tersimpan di perangkat. |
| Perubahan di backend tidak berlaku | Belum membuat versi deployment baru | Kelola deployment → Edit → **Versi baru**. |
| "Server sedang sibuk" | Banyak guru menyimpan bersamaan | Tunggu beberapa detik — perubahan tetap di antrean dan dikirim ulang otomatis. |
| Lupa sandi operator | — | Masuk dengan akun **darurat** → *Pengguna & Peran* → reset sandi operator. Jika sandi darurat juga hilang, jalankan `resetAksesDarurat`. |

---

## Batasan yang perlu diketahui

- **Persetujuan & kode QR di aplikasi ini bukan Tanda Tangan Elektronik tersertifikasi (BSrE/PSrE).** Kode QR membuktikan rapor tercatat dan disetujui di sistem sekolah. Rapor kertas tetap ditandatangani basah dan dicap sesuai ketentuan.
- PDF dibuat lewat dialog cetak browser (*Simpan sebagai PDF*), sehingga hasilnya sama persis dengan cetakan kertas.
- Kuota Google Apps Script akun gratis cukup untuk satu sekolah SD (puluhan guru mengisi bersamaan). Satu proyek untuk satu sekolah.
