/* =========================================================
   ALGO — Definisi blok, penjelasan, tema, dan kotak alat
   Semua blok memakai bahasa Indonesia sehari-hari.
   ========================================================= */
(function (global) {
  'use strict';
  const B = global.Blockly;

  // ---------- Warna kategori ----------
  const COLORS = {
    event: ['#FFBF00', '#E6AC00', '#CC9900'],
    motion: ['#4C7CF3', '#3F6AD8', '#3359BF'],
    looks: ['#9B6BFF', '#8657E6', '#744BCC'],
    sound: ['#D163CF', '#BD52BA', '#A1449F'],
    control: ['#FFAB19', '#EC9C13', '#CF8B17'],
    sensing: ['#3FB2D8', '#2FA0C5', '#2A8FB0'],
    operator: ['#4DBB5A', '#3FA54C', '#389442'],
    variable: ['#FF8C1A', '#F07C0A', '#DB6E00'],
    pen: ['#11B58A', '#0DA27B', '#0B8A69']
  };

  // ---------- Ikon kecil (data URI) ----------
  const ICON_PLAY = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#22B07D" stroke="#fff" stroke-width="2"/><path d="M9.5 7.5 L17 12 L9.5 16.5 Z" fill="#fff"/></svg>');
  const ICON_PEN = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 20 L6 14 L16 4 L20 8 L10 18 Z" fill="#fff" stroke="#0B8A69" stroke-width="1.5"/><path d="M4 20 L6 14 L10 18 Z" fill="#333"/></svg>');
  const dot = (c) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="${c}" stroke="#fff" stroke-width="2"/></svg>`);

  // ---------- Pilihan dropdown ----------
  const KEYS = [['spasi', 'spasi'], ['panah atas ▲', 'atas'], ['panah bawah ▼', 'bawah'], ['panah kiri ◀', 'kiri'], ['panah kanan ▶', 'kanan'], ['tombol apa saja', 'apa']];
  'abcdefghijklmnopqrstuvwxyz0123456789'.split('').forEach(c => KEYS.push([c, c]));
  const DIRS = [['kanan ➡', '90'], ['kiri ⬅', '-90'], ['atas ⬆', '0'], ['bawah ⬇', '180']];
  const ROT = [['semua arah', 'all'], ['kiri-kanan saja', 'lr'], ['tidak berputar', 'none']];
  const PEN_COLORS = [
    ['merah', '#E63946'], ['oranye', '#FF8C1A'], ['kuning', '#FFC300'], ['hijau', '#2BB673'],
    ['biru', '#3A6FF2'], ['ungu', '#8E5CF7'], ['merah muda', '#FF6BA6'], ['coklat', '#8B5A2B'], ['hitam', '#222222']
  ];
  const penOpts = PEN_COLORS.map(([n, c]) => [{ src: dot(c), width: 18, height: 18, alt: n }, c]);
  const soundOpts = () => global.AlgoSound.SOUNDS.map(s => [s[0], s[1]]);
  const noteOpts = () => global.AlgoSound.NOTES.map(n => [n[0], n[0]]);
  const backdropOpts = () => Object.keys(global.AlgoAssets.BACKDROPS).map(k => [global.AlgoAssets.BACKDROPS[k].nama, k]);

  // Konteks dinamis (diisi editor): daftar tokoh & tokoh yang sedang dipilih
  const ctx = { sprites: [], currentId: null };
  function curSprite() { return ctx.sprites.find(s => s.id === ctx.currentId) || ctx.sprites[0]; }
  function touchOpts() {
    const o = [['tepi panggung', '_edge_'], ['penunjuk mouse', '_mouse_']];
    ctx.sprites.forEach(s => { if (s.id !== ctx.currentId) o.push([s.name, s.id]); });
    return o;
  }
  function gotoOpts() {
    const o = [['posisi acak', '_random_'], ['penunjuk mouse', '_mouse_']];
    ctx.sprites.forEach(s => { if (s.id !== ctx.currentId) o.push([s.name, s.id]); });
    return o;
  }
  function costumeOpts() {
    const sp = curSprite();
    const names = global.AlgoAssets.costumeNames(sp ? sp.asset : 'algo');
    const all = new Set(names);
    // sertakan semua nama kostum agar proyek lama tetap terbaca
    Object.keys(global.AlgoAssets.SPRITES).forEach(id => global.AlgoAssets.costumeNames(id).forEach(n => all.add(n)));
    return names.map(n => [n.replace(/_/g, ' '), n]).concat(Array.from(all).filter(n => !names.includes(n)).map(n => [n.replace(/_/g, ' '), n]));
  }

  // ---------- Penjelasan setiap blok (tooltip + kotak bantuan) ----------
  const HELP = {
    a_when_flag: ['ketika ▶ Jalankan diklik', 'Blok pembuka. Semua blok yang ditempel di bawahnya akan berjalan saat kamu menekan tombol ▶ Jalankan.'],
    a_when_key: ['ketika tombol … ditekan', 'Blok pembuka. Blok di bawahnya berjalan setiap kali tombol yang dipilih ditekan. Ketuk = jalan sekali; tahan = diulang terus dan tokoh meluncur mulus. Di HP, pakai tombol panah di bawah panggung.'],
    a_when_clicked: ['ketika tokoh ini diklik', 'Blok pembuka. Blok di bawahnya berjalan ketika tokoh ini diklik atau disentuh.'],
    a_when_msg: ['ketika menerima pesan', 'Blok pembuka. Berjalan saat ada tokoh yang mengirim pesan dengan nama yang sama.'],
    a_broadcast: ['kirim pesan', 'Mengirim pesan ke semua tokoh. Tokoh yang punya blok "ketika menerima pesan" dengan nama sama akan mulai bergerak.'],
    a_broadcast_wait: ['kirim pesan dan tunggu', 'Mengirim pesan, lalu menunggu sampai semua tokoh selesai menanggapinya.'],
    a_move: ['maju … langkah', 'Menggerakkan tokoh ke arah yang sedang dihadapinya. Contoh: maju 50 langkah = berjalan sejauh 50 titik. Pakai angka minus untuk mundur.'],
    a_turn_right: ['putar kanan … derajat', 'Memutar tokoh searah jarum jam. 90 derajat = belok kanan, 180 derajat = berbalik. Gambar tokoh ikut miring bila gaya putarnya "semua arah".'],
    a_turn_left: ['putar kiri … derajat', 'Memutar tokoh berlawanan jarum jam. 90 derajat = belok kiri.'],
    a_point_dir: ['hadap ke …', 'Membuat tokoh langsung menghadap kanan, kiri, atas, atau bawah.'],
    a_point_deg: ['hadap ke arah … derajat', 'Mengatur arah tokoh dengan angka: 0 = atas, 90 = kanan, 180 = bawah, -90 = kiri.'],
    a_goto_xy: ['pergi ke x: … y: …', 'Memindahkan tokoh langsung ke titik tertentu. x = kiri–kanan (−240 sampai 240), y = bawah–atas (−180 sampai 180). Titik (0,0) ada di tengah panggung.'],
    a_goto: ['pergi ke …', 'Memindahkan tokoh ke posisi acak, ke penunjuk mouse, atau ke tokoh lain.'],
    a_glide_xy: ['meluncur … detik ke x: … y: …', 'Memindahkan tokoh perlahan-lahan ke titik tujuan dalam waktu yang ditentukan.'],
    a_change_x: ['ubah x sebesar …', 'Menggeser tokoh ke kanan (angka positif) atau ke kiri (angka negatif).'],
    a_set_x: ['atur x ke …', 'Menaruh tokoh pada posisi kiri–kanan tertentu.'],
    a_change_y: ['ubah y sebesar …', 'Menggeser tokoh ke atas (angka positif) atau ke bawah (angka negatif).'],
    a_set_y: ['atur y ke …', 'Menaruh tokoh pada posisi atas–bawah tertentu.'],
    a_bounce: ['jika di tepi, pantulkan', 'Kalau tokoh menyentuh tepi panggung, tokoh berbalik arah seperti bola memantul.'],
    a_rotstyle: ['atur gaya putar', 'Menentukan cara GAMBAR tokoh mengikuti arahnya. "semua arah" = gambar ikut miring sesuai derajat. "kiri-kanan saja" = gambar hanya menoleh kiri/kanan (pakai ini kalau tokoh terbalik saat menghadap kiri). "tidak berputar" = gambar tetap.'],
    a_x: ['posisi x', 'Berisi angka posisi kiri–kanan tokoh saat ini.'],
    a_y: ['posisi y', 'Berisi angka posisi atas–bawah tokoh saat ini.'],
    a_dir: ['arah', 'Berisi angka arah tokoh saat ini (90 = kanan).'],
    a_say_secs: ['katakan … selama … detik', 'Menampilkan gelembung bicara selama beberapa detik, lalu menghilang. Program menunggu sampai selesai.'],
    a_say: ['katakan …', 'Menampilkan gelembung bicara dan langsung lanjut ke blok berikutnya. Kosongkan teks untuk menghapus gelembung.'],
    a_think_secs: ['pikirkan … selama … detik', 'Menampilkan gelembung pikiran selama beberapa detik.'],
    a_think: ['pikirkan …', 'Menampilkan gelembung pikiran.'],
    a_next_costume: ['kostum berikutnya', 'Mengganti gambar tokoh ke kostum selanjutnya. Kalau dipakai berulang, tokoh terlihat bergerak (animasi).'],
    a_set_costume: ['ganti kostum ke …', 'Mengganti gambar tokoh ke kostum yang dipilih.'],
    a_set_backdrop: ['ganti latar ke …', 'Mengganti gambar latar panggung.'],
    a_change_size: ['ubah ukuran sebesar …', 'Memperbesar (angka positif) atau memperkecil (angka negatif) tokoh.'],
    a_set_size: ['atur ukuran ke … %', 'Mengatur ukuran tokoh. 100% = ukuran normal, 200% = dua kali lebih besar.'],
    a_show: ['tampilkan', 'Memunculkan tokoh di panggung.'],
    a_hide: ['sembunyikan', 'Menyembunyikan tokoh dari panggung.'],
    a_front: ['pindah ke paling depan', 'Membuat tokoh tampil di depan tokoh lain.'],
    a_play_sound: ['mainkan suara …', 'Membunyikan suara lalu langsung lanjut ke blok berikutnya.'],
    a_play_sound_wait: ['mainkan suara … sampai selesai', 'Membunyikan suara dan menunggu sampai suaranya habis.'],
    a_play_note: ['mainkan nada … selama … detik', 'Membunyikan nada musik Do, Re, Mi, … Cocok untuk membuat lagu.'],
    a_stop_sounds: ['hentikan semua suara', 'Menghentikan semua suara yang sedang berbunyi.'],
    a_wait: ['tunggu … detik', 'Program berhenti sebentar sebelum menjalankan blok berikutnya.'],
    a_repeat: ['ulangi … kali', 'PERULANGAN. Menjalankan blok di dalamnya berkali-kali sesuai angka. Hemat blok!'],
    a_forever: ['ulangi selamanya', 'PERULANGAN TANPA HENTI. Menjalankan blok di dalamnya terus-menerus sampai tombol ■ Berhenti ditekan.'],
    a_if: ['jika … maka', 'PERCABANGAN. Blok di dalamnya hanya berjalan kalau syaratnya benar.'],
    a_if_else: ['jika … maka … jika tidak', 'PERCABANGAN. Kalau syarat benar, jalankan bagian atas. Kalau salah, jalankan bagian "jika tidak".'],
    a_wait_until: ['tunggu sampai …', 'Program menunggu sampai syaratnya menjadi benar.'],
    a_repeat_until: ['ulangi sampai …', 'Mengulang blok di dalamnya sampai syaratnya benar.'],
    a_stop: ['hentikan …', 'Menghentikan semua program, atau hanya skrip ini.'],
    a_touching: ['menyentuh …?', 'SYARAT. Bernilai benar jika tokoh sedang menyentuh tepi panggung, mouse, atau tokoh lain. Pasang di lubang segi enam blok "jika".'],
    a_key_pressed: ['tombol … ditekan?', 'SYARAT. Bernilai benar selama tombol yang dipilih sedang ditekan.'],
    a_ask: ['tanya … dan tunggu', 'Tokoh bertanya, lalu menunggu kamu mengetik jawaban. Jawabannya tersimpan di blok "jawaban".'],
    a_answer: ['jawaban', 'Berisi jawaban terakhir yang diketik dari blok "tanya".'],
    a_mouse_down: ['mouse ditekan?', 'SYARAT. Benar selama mouse diklik atau layar disentuh.'],
    a_mouse_x: ['posisi x mouse', 'Berisi posisi kiri–kanan penunjuk mouse.'],
    a_mouse_y: ['posisi y mouse', 'Berisi posisi atas–bawah penunjuk mouse.'],
    a_timer: ['pengatur waktu', 'Berisi berapa detik sudah berlalu sejak ▶ Jalankan ditekan.'],
    a_reset_timer: ['ulang pengatur waktu', 'Mengembalikan pengatur waktu ke 0.'],
    a_arith: ['hitung (+ − × ÷)', 'Menghitung dua angka. Contoh: 3 + 4 = 7.'],
    a_random: ['angka acak dari … sampai …', 'Memilih angka secara acak, seperti melempar dadu.'],
    a_compare: ['bandingkan (> < =)', 'SYARAT. Membandingkan dua nilai: lebih besar, lebih kecil, atau sama dengan.'],
    a_and: ['… dan …', 'SYARAT. Benar hanya jika kedua syarat benar.'],
    a_or: ['… atau …', 'SYARAT. Benar jika salah satu syarat benar.'],
    a_not: ['bukan …', 'SYARAT. Membalik syarat: benar jadi salah, salah jadi benar.'],
    a_join: ['gabung … …', 'Menyambung dua teks menjadi satu. Contoh: gabung "Halo " "Sari" → "Halo Sari".'],
    a_mod: ['sisa … bagi …', 'Sisa pembagian. Contoh: sisa 7 bagi 2 = 1. Berguna untuk mengecek bilangan genap/ganjil.'],
    a_round: ['bulatkan …', 'Membulatkan angka ke bilangan bulat terdekat.'],
    a_var_get: ['variabel', 'VARIABEL adalah wadah untuk menyimpan nilai, misalnya skor atau nyawa. Blok ini berisi nilai variabel saat ini.'],
    a_var_set: ['atur variabel ke …', 'Mengisi variabel dengan nilai baru. Biasanya dipakai di awal, misalnya atur skor ke 0.'],
    a_var_change: ['ubah variabel sebesar …', 'Menambah (atau mengurangi) nilai variabel. Contoh: ubah skor sebesar 1.'],
    a_var_show: ['tampilkan variabel', 'Menampilkan kotak nilai variabel di pojok panggung.'],
    a_var_hide: ['sembunyikan variabel', 'Menyembunyikan kotak nilai variabel dari panggung.'],
    a_pen_down: ['turunkan pena', 'Tokoh mulai menggambar garis setiap kali bergerak, seperti pensil yang menempel di kertas.'],
    a_pen_up: ['angkat pena', 'Tokoh berhenti menggambar saat bergerak.'],
    a_pen_color: ['atur warna pena ke …', 'Memilih warna garis yang digambar.'],
    a_pen_size: ['atur tebal pena ke …', 'Mengatur ketebalan garis. Angka besar = garis tebal.'],
    a_pen_clear: ['hapus semua coretan', 'Menghapus semua garis gambar dari panggung.'],
    a_stamp: ['cap gambar tokoh', 'Mencetak gambar tokoh ke panggung seperti stempel.'],
    a_num: ['angka', 'Ketik angka di sini.'],
    a_text: ['teks', 'Ketik teks di sini.']
  };

  // ---------- Definisi blok (format JSON Blockly) ----------
  const STMT = { previousStatement: null, nextStatement: null };
  const IN = (name) => ({ type: 'input_value', name });
  const IB = (name) => ({ type: 'input_value', name, check: 'Boolean' });
  const DO = (name) => ({ type: 'input_statement', name });

  const DEFS = [
    { type: 'a_num', message0: '%1', args0: [{ type: 'field_number', name: 'NUM', value: 0 }], output: null, style: 'input_blocks' },
    { type: 'a_text', message0: '%1', args0: [{ type: 'field_input', name: 'TEXT', text: '' }], output: null, style: 'input_blocks' },

    // Kejadian
    { type: 'a_when_flag', message0: 'ketika %1 Jalankan diklik', args0: [{ type: 'field_image', src: ICON_PLAY, width: 24, height: 24, alt: '▶' }], nextStatement: null, style: 'event_blocks' },
    { type: 'a_when_key', message0: 'ketika tombol %1 ditekan', args0: [{ type: 'field_dropdown', name: 'KEY', options: KEYS }], nextStatement: null, style: 'event_blocks' },
    { type: 'a_when_clicked', message0: 'ketika tokoh ini diklik', nextStatement: null, style: 'event_blocks' },
    { type: 'a_when_msg', message0: 'ketika menerima pesan %1', args0: [{ type: 'field_input', name: 'MSG', text: 'mulai' }], nextStatement: null, style: 'event_blocks' },
    Object.assign({ type: 'a_broadcast', message0: 'kirim pesan %1', args0: [{ type: 'field_input', name: 'MSG', text: 'mulai' }], style: 'event_blocks' }, STMT),
    Object.assign({ type: 'a_broadcast_wait', message0: 'kirim pesan %1 dan tunggu', args0: [{ type: 'field_input', name: 'MSG', text: 'mulai' }], style: 'event_blocks' }, STMT),

    // Gerak
    Object.assign({ type: 'a_move', message0: 'maju %1 langkah', args0: [IN('STEPS')], style: 'motion_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_turn_right', message0: 'putar kanan ↻ %1 derajat', args0: [IN('DEG')], style: 'motion_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_turn_left', message0: 'putar kiri ↺ %1 derajat', args0: [IN('DEG')], style: 'motion_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_point_dir', message0: 'hadap ke %1', args0: [{ type: 'field_dropdown', name: 'DIR', options: DIRS }], style: 'motion_blocks' }, STMT),
    Object.assign({ type: 'a_point_deg', message0: 'hadap ke arah %1 derajat', args0: [IN('DEG')], style: 'motion_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_goto_xy', message0: 'pergi ke x: %1 y: %2', args0: [IN('X'), IN('Y')], style: 'motion_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_glide_xy', message0: 'meluncur %1 detik ke x: %2 y: %3', args0: [IN('SECS'), IN('X'), IN('Y')], style: 'motion_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_change_x', message0: 'ubah x sebesar %1', args0: [IN('DX')], style: 'motion_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_set_x', message0: 'atur x ke %1', args0: [IN('X')], style: 'motion_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_change_y', message0: 'ubah y sebesar %1', args0: [IN('DY')], style: 'motion_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_set_y', message0: 'atur y ke %1', args0: [IN('Y')], style: 'motion_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_bounce', message0: 'jika di tepi, pantulkan', style: 'motion_blocks' }, STMT),
    Object.assign({ type: 'a_rotstyle', message0: 'atur gaya putar %1', args0: [{ type: 'field_dropdown', name: 'STYLE', options: ROT }], style: 'motion_blocks' }, STMT),
    { type: 'a_x', message0: 'posisi x', output: 'Number', style: 'motion_blocks' },
    { type: 'a_y', message0: 'posisi y', output: 'Number', style: 'motion_blocks' },
    { type: 'a_dir', message0: 'arah', output: 'Number', style: 'motion_blocks' },

    // Tampilan
    Object.assign({ type: 'a_say_secs', message0: 'katakan %1 selama %2 detik', args0: [IN('TEXT'), IN('SECS')], style: 'looks_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_say', message0: 'katakan %1', args0: [IN('TEXT')], style: 'looks_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_think_secs', message0: 'pikirkan %1 selama %2 detik', args0: [IN('TEXT'), IN('SECS')], style: 'looks_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_think', message0: 'pikirkan %1', args0: [IN('TEXT')], style: 'looks_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_next_costume', message0: 'kostum berikutnya', style: 'looks_blocks' }, STMT),
    Object.assign({ type: 'a_set_backdrop', message0: 'ganti latar ke %1', args0: [{ type: 'field_dropdown', name: 'BACKDROP', options: backdropOpts() }], style: 'looks_blocks' }, STMT),
    Object.assign({ type: 'a_change_size', message0: 'ubah ukuran sebesar %1', args0: [IN('N')], style: 'looks_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_set_size', message0: 'atur ukuran ke %1 %%', args0: [IN('N')], style: 'looks_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_show', message0: 'tampilkan', style: 'looks_blocks' }, STMT),
    Object.assign({ type: 'a_hide', message0: 'sembunyikan', style: 'looks_blocks' }, STMT),
    Object.assign({ type: 'a_front', message0: 'pindah ke paling depan', style: 'looks_blocks' }, STMT),

    // Suara
    Object.assign({ type: 'a_play_sound', message0: 'mainkan suara %1', args0: [{ type: 'field_dropdown', name: 'SOUND', options: soundOpts() }], style: 'sound_blocks' }, STMT),
    Object.assign({ type: 'a_play_sound_wait', message0: 'mainkan suara %1 sampai selesai', args0: [{ type: 'field_dropdown', name: 'SOUND', options: soundOpts() }], style: 'sound_blocks' }, STMT),
    Object.assign({ type: 'a_play_note', message0: 'mainkan nada %1 selama %2 detik', args0: [{ type: 'field_dropdown', name: 'NOTE', options: noteOpts() }, IN('SECS')], style: 'sound_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_stop_sounds', message0: 'hentikan semua suara', style: 'sound_blocks' }, STMT),

    // Kendali
    Object.assign({ type: 'a_wait', message0: 'tunggu %1 detik', args0: [IN('SECS')], style: 'control_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_repeat', message0: 'ulangi %1 kali', args0: [IN('TIMES')], message1: '%1', args1: [DO('DO')], style: 'control_blocks', inputsInline: true }, STMT),
    { type: 'a_forever', message0: 'ulangi selamanya', message1: '%1', args1: [DO('DO')], previousStatement: null, style: 'control_blocks' },
    Object.assign({ type: 'a_if', message0: 'jika %1 maka', args0: [IB('COND')], message1: '%1', args1: [DO('DO')], style: 'control_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_if_else', message0: 'jika %1 maka', args0: [IB('COND')], message1: '%1', args1: [DO('DO')], message2: 'jika tidak', message3: '%1', args3: [DO('ELSE')], style: 'control_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_wait_until', message0: 'tunggu sampai %1', args0: [IB('COND')], style: 'control_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_repeat_until', message0: 'ulangi sampai %1', args0: [IB('COND')], message1: '%1', args1: [DO('DO')], style: 'control_blocks', inputsInline: true }, STMT),
    { type: 'a_stop', message0: 'hentikan %1', args0: [{ type: 'field_dropdown', name: 'WHAT', options: [['semua', 'all'], ['skrip ini', 'this']] }], previousStatement: null, style: 'control_blocks' },

    // Sensor
    { type: 'a_key_pressed', message0: 'tombol %1 ditekan?', args0: [{ type: 'field_dropdown', name: 'KEY', options: KEYS }], output: 'Boolean', style: 'sensing_blocks' },
    Object.assign({ type: 'a_ask', message0: 'tanya %1 dan tunggu', args0: [IN('TEXT')], style: 'sensing_blocks', inputsInline: true }, STMT),
    { type: 'a_answer', message0: 'jawaban', output: null, style: 'sensing_blocks' },
    { type: 'a_mouse_down', message0: 'mouse ditekan?', output: 'Boolean', style: 'sensing_blocks' },
    { type: 'a_mouse_x', message0: 'posisi x mouse', output: 'Number', style: 'sensing_blocks' },
    { type: 'a_mouse_y', message0: 'posisi y mouse', output: 'Number', style: 'sensing_blocks' },
    { type: 'a_timer', message0: 'pengatur waktu', output: 'Number', style: 'sensing_blocks' },
    Object.assign({ type: 'a_reset_timer', message0: 'ulang pengatur waktu', style: 'sensing_blocks' }, STMT),

    // Operator
    { type: 'a_arith', message0: '%1 %2 %3', args0: [IN('A'), { type: 'field_dropdown', name: 'OP', options: [['+', '+'], ['−', '-'], ['×', '*'], ['÷', '/']] }, IN('B')], output: 'Number', style: 'operator_blocks', inputsInline: true },
    { type: 'a_random', message0: 'angka acak dari %1 sampai %2', args0: [IN('A'), IN('B')], output: 'Number', style: 'operator_blocks', inputsInline: true },
    { type: 'a_compare', message0: '%1 %2 %3', args0: [IN('A'), { type: 'field_dropdown', name: 'OP', options: [['>', '>'], ['<', '<'], ['=', '=']] }, IN('B')], output: 'Boolean', style: 'operator_blocks', inputsInline: true },
    { type: 'a_and', message0: '%1 dan %2', args0: [IB('A'), IB('B')], output: 'Boolean', style: 'operator_blocks', inputsInline: true },
    { type: 'a_or', message0: '%1 atau %2', args0: [IB('A'), IB('B')], output: 'Boolean', style: 'operator_blocks', inputsInline: true },
    { type: 'a_not', message0: 'bukan %1', args0: [IB('A')], output: 'Boolean', style: 'operator_blocks', inputsInline: true },
    { type: 'a_join', message0: 'gabung %1 %2', args0: [IN('A'), IN('B')], output: null, style: 'operator_blocks', inputsInline: true },
    { type: 'a_mod', message0: 'sisa %1 bagi %2', args0: [IN('A'), IN('B')], output: 'Number', style: 'operator_blocks', inputsInline: true },
    { type: 'a_round', message0: 'bulatkan %1', args0: [IN('A')], output: 'Number', style: 'operator_blocks', inputsInline: true },

    // Variabel
    { type: 'a_var_get', message0: '%1', args0: [{ type: 'field_variable', name: 'VAR', variable: 'skor' }], output: null, style: 'variable_blocks' },
    Object.assign({ type: 'a_var_set', message0: 'atur %1 ke %2', args0: [{ type: 'field_variable', name: 'VAR', variable: 'skor' }, IN('VALUE')], style: 'variable_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_var_change', message0: 'ubah %1 sebesar %2', args0: [{ type: 'field_variable', name: 'VAR', variable: 'skor' }, IN('N')], style: 'variable_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_var_show', message0: 'tampilkan variabel %1', args0: [{ type: 'field_variable', name: 'VAR', variable: 'skor' }], style: 'variable_blocks' }, STMT),
    Object.assign({ type: 'a_var_hide', message0: 'sembunyikan variabel %1', args0: [{ type: 'field_variable', name: 'VAR', variable: 'skor' }], style: 'variable_blocks' }, STMT),

    // Pena
    Object.assign({ type: 'a_pen_down', message0: '%1 turunkan pena', args0: [{ type: 'field_image', src: ICON_PEN, width: 20, height: 20, alt: '✏' }], style: 'pen_blocks' }, STMT),
    Object.assign({ type: 'a_pen_up', message0: '%1 angkat pena', args0: [{ type: 'field_image', src: ICON_PEN, width: 20, height: 20, alt: '✏' }], style: 'pen_blocks' }, STMT),
    Object.assign({ type: 'a_pen_color', message0: 'atur warna pena ke %1', args0: [{ type: 'field_dropdown', name: 'COLOR', options: penOpts }], style: 'pen_blocks' }, STMT),
    Object.assign({ type: 'a_pen_size', message0: 'atur tebal pena ke %1', args0: [IN('N')], style: 'pen_blocks', inputsInline: true }, STMT),
    Object.assign({ type: 'a_pen_clear', message0: 'hapus semua coretan', style: 'pen_blocks' }, STMT),
    Object.assign({ type: 'a_stamp', message0: 'cap gambar tokoh', style: 'pen_blocks' }, STMT)
  ];

  // Blok dengan pilihan dinamis (daftar tokoh/kostum) didefinisikan lewat kode
  function defineDynamic() {
    B.Blocks.a_touching = {
      init() {
        this.appendDummyInput().appendField('menyentuh').appendField(new B.FieldDropdown(touchOpts), 'TARGET').appendField('?');
        this.setOutput(true, 'Boolean'); this.setStyle('sensing_blocks'); this.setTooltip(HELP.a_touching[1]);
      }
    };
    B.Blocks.a_goto = {
      init() {
        this.appendDummyInput().appendField('pergi ke').appendField(new B.FieldDropdown(gotoOpts), 'TARGET');
        this.setPreviousStatement(true); this.setNextStatement(true); this.setStyle('motion_blocks'); this.setTooltip(HELP.a_goto[1]);
      }
    };
    B.Blocks.a_set_costume = {
      init() {
        this.appendDummyInput().appendField('ganti kostum ke').appendField(new B.FieldDropdown(costumeOpts), 'COSTUME');
        this.setPreviousStatement(true); this.setNextStatement(true); this.setStyle('looks_blocks'); this.setTooltip(HELP.a_set_costume[1]);
      }
    };
  }

  // ---------- Nilai bawaan isian (shadow) untuk kotak alat ----------
  const num = (v) => ({ shadow: { type: 'a_num', fields: { NUM: v } } });
  const txt = (v) => ({ shadow: { type: 'a_text', fields: { TEXT: v } } });
  const DEFAULTS = {
    a_move: { STEPS: num(10) }, a_turn_right: { DEG: num(15) }, a_turn_left: { DEG: num(15) },
    a_point_deg: { DEG: num(90) }, a_goto_xy: { X: num(0), Y: num(0) }, a_glide_xy: { SECS: num(1), X: num(0), Y: num(0) },
    a_change_x: { DX: num(10) }, a_set_x: { X: num(0) }, a_change_y: { DY: num(10) }, a_set_y: { Y: num(0) },
    a_say_secs: { TEXT: txt('Halo!'), SECS: num(2) }, a_say: { TEXT: txt('Halo!') },
    a_think_secs: { TEXT: txt('Hmm…'), SECS: num(2) }, a_think: { TEXT: txt('Hmm…') },
    a_change_size: { N: num(10) }, a_set_size: { N: num(100) }, a_play_note: { SECS: num(0.5) },
    a_wait: { SECS: num(1) }, a_repeat: { TIMES: num(10) }, a_ask: { TEXT: txt('Siapa namamu?') },
    a_arith: { A: num(0), B: num(0) }, a_random: { A: num(1), B: num(10) }, a_compare: { A: txt(''), B: txt('50') },
    a_join: { A: txt('Halo '), B: txt('teman') }, a_mod: { A: num(7), B: num(2) }, a_round: { A: num(3.6) },
    a_var_set: { VALUE: txt('0') }, a_var_change: { N: num(1) }, a_pen_size: { N: num(3) }
  };
  function item(type, overrides) {
    const it = { kind: 'block', type };
    const ins = Object.assign({}, DEFAULTS[type] || {}, (overrides && overrides.inputs) || {});
    if (Object.keys(ins).length) it.inputs = JSON.parse(JSON.stringify(ins));
    if (overrides && overrides.fields) it.fields = overrides.fields;
    return it;
  }

  // ---------- Kategori & tingkat ----------
  const CATS = [
    { id: 'event', name: 'Kejadian', pemula: ['a_when_flag', 'a_when_key', 'a_when_clicked', 'a_broadcast', 'a_when_msg'], lengkap: ['a_broadcast_wait'] },
    { id: 'motion', name: 'Gerak', pemula: ['a_move', 'a_turn_right', 'a_turn_left', 'a_point_dir', 'a_goto_xy', 'a_glide_xy', 'a_change_x', 'a_change_y', 'a_bounce', 'a_rotstyle'], lengkap: ['a_point_deg', 'a_goto', 'a_set_x', 'a_set_y', 'a_x', 'a_y', 'a_dir'] },
    { id: 'looks', name: 'Tampilan', pemula: ['a_say_secs', 'a_say', 'a_next_costume', 'a_set_backdrop', 'a_change_size', 'a_show', 'a_hide'], lengkap: ['a_think_secs', 'a_think', 'a_set_costume', 'a_set_size', 'a_front'] },
    { id: 'sound', name: 'Suara', pemula: ['a_play_sound', 'a_play_note'], lengkap: ['a_play_sound_wait', 'a_stop_sounds'] },
    { id: 'control', name: 'Kendali', pemula: ['a_wait', 'a_repeat', 'a_forever', 'a_if', 'a_if_else'], lengkap: ['a_wait_until', 'a_repeat_until', 'a_stop'] },
    { id: 'sensing', name: 'Sensor', pemula: ['a_touching', 'a_key_pressed', 'a_ask', 'a_answer'], lengkap: ['a_mouse_down', 'a_mouse_x', 'a_mouse_y', 'a_timer', 'a_reset_timer'] },
    { id: 'operator', name: 'Operator', pemula: ['a_arith', 'a_random', 'a_compare', 'a_join'], lengkap: ['a_and', 'a_or', 'a_not', 'a_mod', 'a_round'] },
    { id: 'variable', name: 'Variabel', custom: 'ALGO_VARS' },
    { id: 'pen', name: 'Pena', pemula: ['a_pen_down', 'a_pen_up', 'a_pen_color', 'a_pen_clear'], lengkap: ['a_pen_size', 'a_stamp'] }
  ];
  const CAT_OF = {};
  CATS.forEach(c => (c.pemula || []).concat(c.lengkap || []).forEach(t => { CAT_OF[t] = c.id; }));
  ['a_var_get', 'a_var_set', 'a_var_change', 'a_var_show', 'a_var_hide'].forEach(t => { CAT_OF[t] = 'variable'; });

  function categoryToolbox(level) {
    return {
      kind: 'categoryToolbox',
      contents: CATS.map(c => {
        const cat = { kind: 'category', name: c.name, categorystyle: c.id + '_category', cssConfig: { row: 'blocklyToolboxCategory algo-cat algo-cat-' + c.id } };
        if (c.custom) { cat.custom = c.custom; return cat; }
        const types = level === 'lengkap' ? c.pemula.concat(c.lengkap) : c.pemula;
        cat.contents = types.map(t => item(t));
        return cat;
      })
    };
  }

  // Kotak alat misi: daftar blok terbatas tanpa kategori (lebih sederhana)
  function flyoutToolbox(types, variables) {
    const contents = [];
    types.forEach(t => {
      if (t.startsWith('a_var_') && variables && variables.length) {
        contents.push(item(t, { fields: { VAR: { id: variables[0].id } } }));
      } else contents.push(item(t));
    });
    return { kind: 'flyoutToolbox', contents };
  }

  // Isi kategori Variabel (dibuat ulang setiap kali dibuka)
  function variableFlyout(ws) {
    const list = [{ kind: 'button', text: '＋ Buat Variabel', callbackKey: 'ALGO_NEW_VAR' }];
    const vars = ws.getVariableMap().getAllVariables().slice().sort((a, b) => a.getName().localeCompare(b.getName()));
    if (!vars.length) {
      list.push({ kind: 'label', text: 'Belum ada variabel. Klik tombol di atas.' });
      return list;
    }
    vars.forEach(v => list.push({ kind: 'block', type: 'a_var_get', fields: { VAR: { id: v.getId() } } }));
    list.push({ kind: 'sep', gap: 16 });
    const first = { VAR: { id: vars[0].getId() } };
    ['a_var_set', 'a_var_change', 'a_var_show', 'a_var_hide'].forEach(t => list.push(Object.assign(item(t), { fields: first })));
    return list;
  }

  // ---------- Tema ----------
  function makeTheme() {
    const bs = {}; const cs = {};
    Object.keys(COLORS).forEach(k => {
      const [p, s, t] = COLORS[k];
      bs[k + '_blocks'] = { colourPrimary: p, colourSecondary: s, colourTertiary: t };
      cs[k + '_category'] = { colour: p };
    });
    bs.input_blocks = { colourPrimary: '#FFFFFF', colourSecondary: '#FFFFFF', colourTertiary: '#C9CFE3' };
    bs.event_blocks.hat = 'cap';
    return B.Theme.defineTheme('algo', {
      base: B.Themes.Classic,
      blockStyles: bs,
      categoryStyles: cs,
      componentStyles: {
        workspaceBackgroundColour: '#F6F7FC',
        toolboxBackgroundColour: '#FFFFFF',
        toolboxForegroundColour: '#3A4166',
        flyoutBackgroundColour: '#EEF1FA',
        flyoutForegroundColour: '#3A4166',
        flyoutOpacity: 1,
        scrollbarColour: '#C9CFE3',
        insertionMarkerColour: '#000',
        insertionMarkerOpacity: 0.2,
        cursorColour: '#4C5FD5'
      },
      fontStyle: { family: 'Nunito, "Segoe UI", Arial, sans-serif', weight: '700', size: 12 },
      startHats: true
    });
  }

  // ---------- Pesan Blockly (bahasa Indonesia yang ramah siswa) ----------
  function patchMessages() {
    const M = B.Msg;
    M.NEW_VARIABLE = 'Buat variabel…';
    M.NEW_VARIABLE_TITLE = 'Nama variabel baru:';
    M.RENAME_VARIABLE = 'Ganti nama variabel…';
    M.RENAME_VARIABLE_TITLE = "Ganti nama variabel '%1' menjadi:";
    M.DELETE_VARIABLE = "Hapus variabel '%1'";
    M.DELETE_VARIABLE_CONFIRMATION = "Hapus %1 blok yang memakai variabel '%2'?";
    M.VARIABLE_ALREADY_EXISTS = "Variabel bernama '%1' sudah ada.";
    M.DUPLICATE_BLOCK = 'Gandakan';
    M.DELETE_BLOCK = 'Hapus blok';
    M.DELETE_X_BLOCKS = 'Hapus %1 blok';
    M.ADD_COMMENT = 'Tambah catatan';
    M.REMOVE_COMMENT = 'Hapus catatan';
    M.CLEAN_UP = 'Rapikan blok';
    M.UNDO = 'Batalkan';
    M.REDO = 'Ulangi';
    M.DELETE_ALL_BLOCKS = 'Hapus semua %1 blok?';
    M.HELP = 'Bantuan';
    M.COLLAPSE_BLOCK = 'Ciutkan blok';
    M.EXPAND_BLOCK = 'Bentangkan blok';
    M.DISABLE_BLOCK = 'Nonaktifkan blok';
    M.ENABLE_BLOCK = 'Aktifkan blok';
  }

  let defined = false;
  function init() {
    if (defined) return;
    patchMessages();
    B.common.defineBlocksWithJsonArray(DEFS);
    defineDynamic();
    // pasang tooltip dari kamus penjelasan
    Object.keys(HELP).forEach(t => {
      const blk = B.Blocks[t];
      if (!blk || blk.__algoTip) return;
      const orig = blk.init;
      blk.init = function () { orig.call(this); this.setTooltip(HELP[t][1]); };
      blk.__algoTip = true;
    });
    defined = true;
  }

  global.AlgoBlocks = {
    init, ctx, HELP, CATS, CAT_OF, COLORS, PEN_COLORS, KEYS,
    makeTheme, categoryToolbox, flyoutToolbox, variableFlyout, item
  };
})(window);
