# Panduan Instalasi Algo

Algo adalah aplikasi belajar algoritma dengan menyusun blok, berbahasa Indonesia, untuk siswa SMP yang belum pernah memakai Scratch. Panduan ini memandu Anda dari nol sampai Algo bisa dipakai siswa di HP dan laptop.

---

## Isi paket

Anda menerima tiga berkas:

| Berkas | Untuk apa |
|---|---|
| `algo.zip` | **Frontend** (tampilan aplikasi). Diunggah ke GitHub Pages. |
| `Kode.gs` | **Backend** (server). Ditempel ke Google Apps Script. |
| `PANDUAN-INSTALASI.md` | Panduan ini (salinannya juga ada di dalam `algo.zip`). |

Cara kerjanya:

```
  HP / laptop siswa & guru
          │  buka https://USERNAME.github.io/algo/
          ▼
  ┌───────────────────────┐        ┌──────────────────────────────┐
  │  FRONTEND (GitHub)    │ fetch  │  BACKEND (Apps Script)       │
  │  index.html, css, js  │ ─────► │  Kode.gs  →  Google Sheets   │
  │  Blockly (blok)       │ ◄───── │  (Siswa, Progres, Proyek, …) │
  └───────────────────────┘  JSON  └──────────────────────────────┘
```

Semua data siswa tersimpan di **Google Sheets milik Anda sendiri**. Tidak ada server lain.

> 💡 Belum memasang backend? Algo tetap bisa dibuka dalam **Mode Coba**: siswa bisa bermain misi dan kreasi, tetapi kemajuannya hanya tersimpan di perangkat masing-masing dan guru tidak bisa memantau.

---

## Bagian A — Memasang backend (Google Apps Script)

Kerjakan dengan akun Google sekolah/pribadi yang akan menjadi **pemilik data**.

### A1. Buat proyek Apps Script

1. Buka <https://script.google.com> → klik **Proyek baru**.
2. Klik judul **Proyek tanpa judul** di kiri atas → ganti menjadi `Algo Backend`.

### A2. Tempel kode

1. Di editor, klik berkas **Kode.gs** (atau `Code.gs`) di kiri.
2. Hapus semua isinya, lalu tempel **seluruh** isi berkas `Kode.gs` dari paket ini.
3. Tekan **Ctrl + S** (atau ikon 💾) untuk menyimpan.

### A3. (Disarankan) Atur zona waktu

Klik ⚙️ **Setelan proyek** (ikon roda gigi di kiri) → **Zona waktu** → pilih `(GMT+08:00) Waktu Indonesia Tengah - Makassar`. Ini dipakai agar pemanasan server berjalan pada jam sekolah.

### A4. Jalankan `setupAlgo` (sekali saja)

1. Kembali ke **Editor** (ikon `< >`).
2. Di bilah atas, pada pilihan fungsi, pilih **`setupAlgo`** → klik **▶ Jalankan**.
3. Muncul **Otorisasi diperlukan** → klik **Tinjau izin** → pilih akun Anda.
4. Jika muncul *"Google belum memverifikasi aplikasi ini"* → klik **Lanjutan** → **Buka Algo Backend (tidak aman)**. Ini normal karena skrip ini buatan Anda sendiri.
5. Klik **Izinkan**.

Tunggu sampai **Log eksekusi** menampilkan kurang lebih seperti ini:

```
✅ SETUP ALGO SELESAI
   Spreadsheet : https://docs.google.com/spreadsheets/d/....../edit
   Pemicu keepWarm : aktif

🔑 AKUN ADMIN (catat sekarang, hanya tampil sekali):
   Nama pengguna : admin
   Kata sandi    : k7m2qx9pa
```

> ⚠️ **Catat kata sandi admin sekarang.** Kata sandi ini hanya muncul sekali. Kalau terlewat, jalankan fungsi `resetSandiAdmin` (lihat bagian Kendala Umum).

`setupAlgo` otomatis membuat folder **📁 Algo** di Google Drive Anda berisi spreadsheet **🗃️ Database — Algo** dengan sheet `AppConfig`, `Guru`, `Kelas`, `Siswa`, `Progres`, `Proyek`, dan `Tugas`. Fungsi ini **aman dijalankan ulang**: data yang sudah ada tidak digandakan.

### A5. Terapkan sebagai Aplikasi Web

1. Klik tombol biru **Terapkan** (kanan atas) → **Deployment baru**.
2. Klik ikon ⚙️ di samping *Pilih jenis* → pilih **Aplikasi web**.
3. Isi:
   - **Deskripsi**: `Algo v1.0.0`
   - **Jalankan sebagai**: **Saya** (email Anda)
   - **Yang memiliki akses**: **Siapa saja**
4. Klik **Terapkan** → salin **URL aplikasi web** yang berakhiran **`/exec`**.

### A6. Uji URL

Tempel URL `/exec` di tab browser baru. Jika berhasil, tampil teks seperti:

```
{"success":true,"app":"Algo","v":"1.0.0","message":"Algo API aktif. ..."}
```

Simpan URL ini. Anda memerlukannya di Bagian B.

---

## Bagian B — Memasang frontend di GitHub Pages

Langkah ini memakai **PowerShell** di Windows (Mac/Linux: Terminal). Jangan memakai tombol *Upload files* di situs GitHub, karena struktur folder `css/` dan `js/` akan rusak dan situs tampil tanpa gaya.

### B1. Ekstrak `algo.zip`

Klik kanan `algo.zip` → **Extract All…** → misalnya ke `Documents\algo`.

Hasilnya **harus** seperti ini, dengan `index.html` langsung di dalam folder `algo`:

```
algo\                    ← folder inilah yang nanti di-"git init"
├── index.html
├── README.md
├── PANDUAN-INSTALASI.md
├── .nojekyll
├── manifest.webmanifest   ← ikon saat "Tambahkan ke layar utama" di HP
├── img\                  ← logo & ikon Algo
├── css\
│   └── style.css
└── js\
    ├── config.js        ← satu-satunya berkas yang perlu Anda ubah
    ├── app.js, editor.js, runtime.js, …
    └── vendor\blockly\  ← pustaka blok (jangan dihapus)
```

> Kalau ternyata ada folder di dalam folder (misalnya `algo\algo\index.html`), pakai folder yang **paling dalam**, yaitu yang langsung berisi `index.html`.

### B2. Isi alamat backend

Buka `algo\js\config.js` dengan **Notepad**, lalu ganti `XXXX` menjadi URL `/exec` Anda:

```js
window.ALGO_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycb.................../exec',
  APP_VERSION: '1.0.0'
};
```

Simpan (Ctrl + S). Pastikan tanda kutip `'…'` tetap ada.

### B3. Buat repository di GitHub

1. Masuk ke <https://github.com> → tombol **+** (kanan atas) → **New repository**.
2. **Repository name**: `algo`
3. Pilih **Public** (wajib untuk GitHub Pages gratis; berkas frontend tidak memuat data rahasia).
4. **Jangan** centang *Add a README*, *.gitignore*, atau *license*.
5. Klik **Create repository**. Biarkan halaman berikutnya terbuka.

### B4. Kirim berkas dari komputer

1. Buka folder `algo` (yang berisi `index.html`) di File Explorer → klik bilah alamat → ketik `powershell` → Enter. PowerShell langsung terbuka di folder itu.
2. Pastikan Anda di folder yang benar:

   ```powershell
   dir
   ```

   Harus terlihat `index.html`, `css`, dan `js`. Kalau yang terlihat malah folder `algo` lagi, ketik `cd algo` lalu `dir` lagi.

3. Jalankan perintah ini **satu per satu** (ganti `USERNAME` dengan nama pengguna GitHub Anda):

   ```powershell
   git init
   git add .
   git commit -m "Algo v1.0.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/algo.git
   git push -u origin main
   ```

   - Perhatikan **titik** di akhir `git add .`
   - Saat diminta **Password**, tempel **Personal Access Token** (bukan kata sandi GitHub). Layar memang tidak menampilkan apa pun saat Anda menempel. Itu normal, tekan Enter.
   - Belum punya token? Buka <https://github.com/settings/tokens> → **Generate new token (classic)** → centang **repo** → **Generate token** → salin `ghp_…` (hanya tampil sekali).

   Tanda berhasil: muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### B5. Aktifkan GitHub Pages

Di halaman repository: **Settings** → **Pages** (menu kiri):

| Kolom | Isi |
|---|---|
| Source | **Deploy from a branch** |
| Branch | **main** · **/ (root)** → **Save** |
| Enforce HTTPS | ✅ centang |

Tunggu 1–2 menit, muat ulang halaman. Akan muncul: **Your site is live at `https://USERNAME.github.io/algo/`**. Itulah alamat Algo untuk siswa.

### B6. Uji

1. Buka alamat situs. Halaman masuk Algo tampil dengan tab **Saya Siswa / Saya Guru**.
2. Pilih **Saya Guru** → masuk dengan `admin` dan kata sandi dari langkah A4.
3. Jika muncul *"Algo belum terhubung ke server sekolah"*, berarti `GAS_URL` di `config.js` belum benar. Perbaiki, lalu kirim ulang (lihat Bagian E).

---

## Bagian C — Mulai memakai (guru)

1. **Ganti kata sandi admin**: menu **⚙️ Pengaturan** → *Kata sandi saya*.
2. **Isi nama sekolah**: masih di Pengaturan. Nama ini tampil di halaman masuk siswa.
3. **Buat kelas**: menu **👥 Kelas & Siswa** → **＋ Kelas baru** (misalnya `7A`).
4. **Tambah siswa**:
   - Satu per satu: **＋ Siswa**.
   - Banyak sekaligus: **📋 Tempel dari Excel**. Salin kolom nama (dan NIS bila ada) dari Excel/Google Sheets, lalu tempel. Contoh:
     ```
     Sari Wulandari	24070101
     Bima Pratama	24070102
     Ayu Lestari
     ```
     Jika NIS kosong, nama pengguna dibuat otomatis, misalnya `7a-ayu`. **PIN 4 angka** dibuat otomatis.
5. **Cetak kartu masuk**: tombol **🖨️ Cetak kartu masuk** mencetak kartu berisi nama pengguna, PIN, dan alamat situs (2 kartu per baris, siap digunting).
6. **Bagikan alamat situs** ke siswa (grup WhatsApp kelas, papan tulis, atau kode QR).
7. **Pantau**: menu **🗺️ Progres Misi** menampilkan tabel bintang per siswa per misi. Klik sel untuk melihat **dan menjalankan** solusi siswa. Tombol **⬇️ Unduh CSV** untuk rekap nilai.
   - **Reset kemajuan** (misalnya awal semester baru, atau siswa ingin mengulang): tombol **↺** di ujung baris siswa menghapus semua bintang dan solusi misi siswa itu, lalu ia mulai lagi dari Misi 1. Tombol **↺ Reset kemajuan kelas** melakukan hal yang sama untuk seluruh kelas (Anda diminta mengetik nama kelas sebagai pengaman). Proyek Kreasi dan tugas **tidak** ikut terhapus. Unduh CSV dulu bila ingin menyimpan rekap lama, karena reset tidak bisa dibatalkan.
8. **Beri tugas**: menu **📋 Tugas & Nilai** → **＋ Buat tugas** → pilih kelas & batas waktu. Siswa mengerjakan di Kreasi lalu menekan **📤 Kumpulkan**. Buka karya → jalankan → isi **Nilai** dan **Komentar**. Tombol *Sebelumnya / Berikutnya* mempercepat penilaian.
9. **Coba misi seperti siswa**: di Ringkasan → **🎮 Coba misi seperti siswa** (tidak tersimpan).
10. **Tambah guru lain**: Pengaturan → *Akun guru* → **＋ Guru** (khusus admin).

> Mengubah data langsung di Google Sheets? Tekan **🔄 Segarkan data** di Ringkasan agar Algo membaca ulang.

---

## Bagian D — Panduan singkat untuk siswa

1. Buka alamat Algo dari guru, pilih **Saya Siswa**, isi **nama pengguna** dan **PIN** dari kartu.
2. **🗺️ Misi**: kerjakan berurutan dari Misi 1. Setiap misi punya tujuan, cerita, dan tombol **💡 Minta petunjuk**.
3. Cara menyusun program:
   - Seret blok dari kiri, tempel di bawah blok kuning **ketika ▶ Jalankan diklik**. Di Kreasi, daftar blok tetap terbuka setelah blok diambil; pilih kategori lain untuk mengganti isinya, atau tekan **⇤** (pojok kanan atas area kode) untuk menyembunyikannya bila butuh ruang lebih.
   - Klik kotak putih pada blok untuk mengubah angka atau teks.
   - Tekan **▶ Jalankan**. Pakai **🐢 Pelan** untuk melihat blok menyala satu per satu, atau **👣 Langkah** untuk menjalankan satu blok setiap klik.
   - Hapus blok dengan menyeretnya kembali ke daftar blok atau ke tempat sampah.
   - **Memakai mouse** (laptop/komputer): **gulir** roda mouse untuk menggeser area kode naik-turun; arahkan kursor ke daftar blok lalu gulir untuk melihat blok di bawahnya. **Shift + gulir** = geser kiri-kanan. **Ctrl + gulir** (⌘ + gulir di Mac) = perbesar/perkecil blok. Di HP: geser dengan satu jari, cubit dua jari untuk memperbesar.
4. **★★★**: selesaikan misi dengan blok sesedikit mungkin.
   - Ingin mengulang dari nol? Tekan **↺ Mulai ulang** di bagian atas layar misi. Blok kembali ke susunan awal misi, sedangkan bintang yang sudah didapat tetap tersimpan.
5. **🎨 Kreasi**: buat cerita atau game. Mode **Pemula** menampilkan blok dasar, mode **Lengkap** menampilkan semua blok. Tekan **💾 Simpan** sesering mungkin.
6. **📋 Tugas**: kerjakan tugas dari guru, lalu tekan **📤 Kumpulkan**.
7. Blok **ketika tombol … ditekan**: ketuk tombol = skrip jalan sekali; tahan tombol = skrip diulang terus dan tokoh meluncur mulus. Di HP, tombol panah muncul di bawah panggung untuk game yang memakai tombol.
8. **Misi dengan beberapa tokoh** (Bab 6–7): klik gambar tokoh di kotak **Tokoh di misi ini** (atau tokohnya di panggung) untuk memprogram tokoh itu. Setiap tokoh punya bloknya sendiri.
9. **Gaya putar** (panel tokoh di bawah panggung, atau blok **atur gaya putar**): *↻ Semua arah* = gambar tokoh ikut miring sesuai derajat (bawaan untuk tokoh baru). *⇆ Kiri-kanan* = tokoh hanya menoleh kiri/kanan, cocok untuk game yang tokohnya berjalan ke kiri dan ke kanan supaya tidak terbalik. *• Tetap* = gambar tidak ikut berputar.

### Daftar misi

| Bab | Misi | Konsep | Blok baru |
|---|---|---|---|
| 1 · Kenalan & Urutan | 1 Halo, Algo! | Blok pertama | ketika ▶ Jalankan diklik, katakan |
| | 2 Jalan ke Bintang | Mengubah angka | maju … langkah |
| | 3 Belok ke Atas | Arah & putar | putar kiri / kanan |
| | 4 Awas Batu! | Urutan langkah | (merencanakan jalur) |
| 2 · Perulangan | 5 Tangga Bintang | Ulangi | ulangi … kali |
| | 6 Gambar Persegi | Ulangi + pena | turunkan pena |
| | 7 Algo Melangkah | Animasi | kostum berikutnya, tunggu |
| 3 · Kejadian | 8 Kendalikan Algo | Kejadian tombol | ketika tombol … ditekan, ubah x/y |
| | 9 Enggang Bernyanyi | Kejadian klik | ketika tokoh ini diklik, mainkan suara |
| 4 · Percabangan | 10 Robot Penjaga | Jika … maka | ulangi selamanya, jika, menyentuh tepi? |
| | 11 Kuis Penjumlahan | Jika … jika tidak | tanya, jawaban, ( ) = ( ) |
| 5 · Variabel | 12 Hitung Lompatan | Variabel penghitung | atur / ubah variabel |
| 6 · Bercerita | 13 Ngobrol di Sungai | Kirim pesan (bergiliran) | kirim pesan, ketika menerima pesan — 2 tokoh |
| | 14 Kenalan Yuk! | Tanya & gabung teks | gabung, jawaban |
| 7 · Membuat Game | 15 Klik Bintang | Game klik + skor | ketika tokoh ini diklik, pergi ke posisi acak |
| | 16 Apel Jatuh | Ulangi selamanya + jika | posisi y, angka acak — 2 tokoh |
| | 17 Tangkap Apel | Menyentuh + skor | menyentuh …?, ubah skor — 2 tokoh |
| | 18 Hindari Batu | Akhir permainan | tunggu sampai, hentikan semua — 2 tokoh |
| | 19 Tebak Angka | Ulangi sampai + petunjuk | ulangi sampai, ( ) > ( ), ( ) < ( ) |

Misi ini mendukung elemen **Algoritma dan Pemrograman** Informatika Kurikulum Merdeka: urutan, perulangan, percabangan, kejadian, variabel, masukan–keluaran, serta komunikasi antar-objek (pesan) dan merancang permainan sederhana.

---

## Bagian E — Memperbarui Algo nanti

**Frontend** (setelah mengganti berkas di folder `algo`):

```powershell
git add .
git commit -m "Perbarui Algo"
git push
```

Tunggu 1–2 menit, lalu tekan **Ctrl + Shift + R** di browser.

**Backend** (setelah mengganti isi `Kode.gs`):

1. Tempel kode baru → **Simpan**.
2. **Terapkan** → **Kelola deployment** → ikon ✏️ **Edit** → **Versi: Versi baru** → **Terapkan**.

> ⚠️ Jangan memilih *Deployment baru*. Itu menghasilkan URL `/exec` yang berbeda sehingga `config.js` harus diubah lagi.

**Pembaruan ke versi 1.2 (reset misi, animasi simpan, lebih cepat)** — perlu memperbarui **keduanya**, backend dulu:

1. **Backend**: buka editor Apps Script → hapus seluruh isi `Kode.gs` → tempel `Kode.gs` versi 1.2 → **Simpan** → **Terapkan** → **Kelola deployment** → ✏️ **Edit** → **Versi: Versi baru** → **Terapkan**. Tidak perlu menjalankan `setupAlgo` lagi, dan data lama tidak berubah.
2. **Frontend**: salin isi `algo.zip` baru ke folder repo dan timpa berkas lama. **Sebelum push**, buka `js/config.js` dan isi lagi `GAS_URL` dengan URL `/exec` Anda (di ZIP masih `XXXX`). Lalu:
   ```powershell
   git add .
   git commit -m "Algo 1.2"
   git push
   ```
3. Cek: buka URL `/exec` di browser, harus tertulis `"v":"1.2.0"`. Lalu buka situs Algo dan tekan **Ctrl + Shift + R**.

> Perbarui backend lebih dulu. Frontend 1.2 dengan backend lama tetap berjalan, tetapi tombol **↺ Reset kemajuan** di panel guru akan menampilkan *Perintah tidak dikenal* sampai backend diperbarui.

---

## Bagian F — Kecepatan, kuota, dan data

Algo dirancang tetap cepat walau dipakai ratusan siswa:

- **Token masuk tanpa penyimpanan sesi** (HMAC). Siswa tetap masuk sampai 60 hari, guru 7 hari. Server tidak menulis apa pun saat siswa membuka halaman.
- **Cache berversi**: data hanya dibaca ulang dari spreadsheet bila memang berubah. Simpan misi seorang siswa tidak membuang cache siswa lain.
- **Pencarian baris cepat** (TextFinder): saat menyimpan, Algo tidak membaca seluruh sheet.
- **Penggabung permintaan**: beberapa permintaan baca dari layar yang sama dikirim sebagai satu panggilan.
- **Kemajuan offline**: bila internet putus saat misi selesai, kemajuan disimpan di HP dan dikirim otomatis saat tersambung kembali.
- **Tampil dari perangkat dulu** (v1.2): beranda, peta misi, dan panel guru langsung tampil dari salinan di HP, lalu diperbarui diam-diam di latar paling sering tiap 60 detik. Pindah menu tidak lagi menunggu server.
- **Simpan guru cukup 1 panggilan** (v1.2): setelah menyimpan kelas, siswa, tugas, nilai, atau reset, jawaban server langsung membawa data ringkasan terbaru, dan hanya cache yang berubah yang dibaca ulang.
- **Pustaka blok dimuat belakangan** (v1.2): halaman masuk dan beranda tidak menunggu pustaka blok (±640 KB). Pustaka itu diunduh diam-diam setelah halaman tampil, sehingga membuka misi tetap instan.
- **Proyek tersimpan di perangkat** (v1.2): 6 proyek terakhir disalin di HP. Membuka proyek yang belum berubah tidak perlu menunggu server.
- **Tahan sinyal lemah** (v1.2): permintaan punya batas waktu dan dicoba ulang otomatis. Setiap simpanan membawa kode unik, jadi bila dikirim dua kali karena sinyal putus-sambung, server hanya menyimpannya sekali.
- **Pemanasan server**: pemicu `keepWarm` berjalan tiap 1 menit, **hanya pukul 06.00–20.59**, agar data tetap siap di cache. Pemakaiannya kira-kira 10–15 menit per hari dari kuota pemicu akun Gmail (±90 menit/hari). Bila tidak diperlukan, jalankan `matikanKeepWarm` di editor. Aplikasi tetap berjalan normal, hanya pembukaan pertama di pagi hari sedikit lebih lambat.

Hasil uji di simulator Apps Script (400 siswa, 4.800 baris progres, 400 proyek):

| Kejadian | Panggilan server | Sel spreadsheet dibaca |
|---|---|---|
| Siswa masuk (sekaligus memuat beranda) | 1 | 0 bila cache hangat |
| Siswa menyimpan misi | 1 | ±9.600 sel dalam 1 kali baca (kolom siswa & misi), bukan 12 kali baca per baris |
| Guru menyimpan kelas/siswa/tugas/nilai | 1 (sebelumnya 2) | hanya data yang berubah |
| Guru mereset kemajuan 1 kelas (430 siswa, ±4.800 baris) | 1 | 1 kali urut + 1 penghapusan per siswa |
| Guru membuka Ringkasan (cache dingin) | 1 | ±41.500 |
| Guru membuka Ringkasan (cache hangat) | 1 | 0 |
| Guru membuka Progres Misi (cache hangat) | 1 | 0 |

Angka ini diukur dengan simulator, bukan di server Google sungguhan. Waktu nyata tergantung kecepatan Google dan internet sekolah.

**Tentang data siswa**

- Semua data ada di spreadsheet **🗃️ Database — Algo** milik Anda. Jangan bagikan tautan spreadsheet ke siswa.
- PIN siswa tersimpan sebagai teks agar guru bisa mencetak kartu. PIN hanya untuk masuk ke Algo; jangan gunakan untuk akun lain.
- **🔑 PIN baru** di menu Kelas & Siswa langsung mengeluarkan siswa dari semua perangkat.
- Menghapus siswa tidak menghapus kemajuan dan proyeknya di spreadsheet.
- **↺ Reset kemajuan** (Progres Misi) menghapus baris progres siswa dari sheet `Progres` secara permanen. Urutan baris di sheet itu ikut diurutkan menurut siswa; ini normal.

---

## Bagian G — Kendala umum

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| *Algo belum terhubung ke server sekolah* | `GAS_URL` masih `XXXX` atau salah ketik | Perbaiki `js/config.js`, lalu `git add .` → `git commit` → `git push` |
| *Tidak bisa terhubung ke server* | URL salah, akses deployment bukan *Siapa saja*, atau internet putus | Buka URL `/exec` di browser (langkah A6). Periksa setelan akses deployment |
| *Server membalas dengan format yang tidak dikenal* | Deployment meminta login Google | Ubah **Yang memiliki akses** menjadi **Siapa saja**, lalu deploy versi baru |
| *Server belum disiapkan. Jalankan setupAlgo()* | `setupAlgo` belum dijalankan | Jalankan langkah A4 |
| Lupa kata sandi admin | — | Di editor Apps Script pilih fungsi **`resetSandiAdmin`** → Jalankan → lihat kata sandi baru di log |
| Siswa lupa PIN | — | Kelas & Siswa → **👁 Tampilkan PIN**, atau **🔑** untuk membuat PIN baru |
| *Terlalu banyak percobaan salah* | Salah PIN/sandi 8 kali | Tunggu 10 menit |
| Data yang diubah di Sheets tidak muncul | Masih memakai cache | Ringkasan → **🔄 Segarkan data** |
| Situs GitHub 404 | `index.html` tidak berada di root repository | Lihat isi repo di github.com. Kalau terlihat folder `algo/` atau `frontend/`, ulangi B4 dari folder yang berisi `index.html` |
| Tampilan berantakan tanpa warna | Folder `css/`/`js/` tidak ikut | Jangan unggah lewat web GitHub; ulangi B4 lewat PowerShell |
| Situs masih versi lama | Cache browser | **Ctrl + Shift + R** atau jendela Incognito |
| *Proyek terlalu besar* | Lebih dari ±180 KB | Kurangi jumlah tokoh/blok, atau pisah menjadi dua proyek |
| *Perintah tidak dikenal: gResetProgress* | Frontend sudah 1.2, backend masih versi lama | Perbarui backend (Bagian E, pembaruan ke versi 1.2) |
| *Menyiapkan blok…* lama / *Pustaka blok gagal dimuat* | Internet lambat saat pertama membuka misi, atau folder `js/vendor/blockly` tidak ikut terunggah | Tekan **Coba lagi**. Pastikan folder `js/vendor/blockly` ada di repo GitHub |
| *Password authentication is not supported* (git) | GitHub tidak menerima kata sandi biasa | Pakai Personal Access Token (B4) |

**Fungsi bantu di editor Apps Script**

| Fungsi | Kegunaan |
|---|---|
| `setupAlgo` | Menyiapkan database & pemicu. Aman dijalankan ulang |
| `resetSandiAdmin` | Membuat kata sandi admin baru |
| `cekPerforma` | Melihat status cache, pemicu, dan jumlah baris data |
| `bersihkanCache` | Memaksa Algo membaca ulang semua data dari spreadsheet |
| `matikanKeepWarm` / `nyalakanKeepWarm` | Mematikan / menyalakan pemanasan server |

---

## Batasan versi 1.2

- Belum ada editor gambar atau unggah gambar sendiri; tokoh dan latar dipilih dari pustaka bawaan (termasuk Pesut Mahakam dan burung Enggang).
- Belum ada fitur *klon* dan berbagi karya ke publik.
- Satu proyek maksimal ±180 KB (cukup untuk ratusan blok).
- Mode Coba (tanpa akun) menyimpan kemajuan di perangkat masing-masing saja.

Algo memakai pustaka **Blockly** (Google, lisensi Apache 2.0) yang disertakan di `js/vendor/blockly/`. Nama dan maskot Algo adalah buatan sendiri dan tidak memakai merek Scratch.
