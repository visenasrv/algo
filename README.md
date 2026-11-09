# Algo

Aplikasi belajar algoritma dan pemrograman blok **berbahasa Indonesia** untuk siswa SMP yang belum pernah memakai Scratch.

- **19 misi bertahap**: urutan, perulangan, kejadian, percabangan, variabel, bercerita (percakapan dua tokoh), dan membuat game (klik bintang, tangkap apel, hindari batu, tebak angka). Ada cerita, petunjuk bertahap, dan bintang ★★★ untuk solusi yang hemat blok.
- **Mode 🐢 Pelan dan 👣 Langkah**: blok yang sedang dijalankan menyala, sehingga siswa melihat urutan kerja algoritma.
- **Kreasi bebas**: beberapa tokoh (termasuk Pesut Mahakam dan Enggang), latar, suara, nada Do-Re-Mi, pena, variabel, tanya-jawab.
- **Panel guru**: kelas, siswa (tempel dari Excel, PIN otomatis, cetak kartu masuk), progres misi per siswa, reset kemajuan siswa/kelas, tugas & penilaian.
- **Cepat di HP**: halaman tampil dari salinan di perangkat lalu diperbarui di latar; pustaka blok dimuat belakangan; simpanan aman dikirim ulang saat sinyal lemah.
- **Mode Coba** tanpa akun bila backend belum dipasang.

## Struktur

```
index.html            halaman utama
css/style.css         tampilan
js/config.js          ← isi GAS_URL di sini
js/app.js             rute & halaman siswa
js/guru.js            panel guru
js/editor.js          area kode + panggung
js/runtime.js         mesin penjalan blok
js/blocks.js          definisi blok berbahasa Indonesia (dimuat saat editor dibuka)
js/missions.js        19 misi & templat
js/stage.js, assets.js, sound.js, ui.js, api.js
js/vendor/blockly/    Blockly 13.4.0 (Apache 2.0, dimuat saat editor dibuka)
```

Backend (`Kode.gs`) dipasang terpisah di Google Apps Script. Langkah lengkap ada di **PANDUAN-INSTALASI.md**.
