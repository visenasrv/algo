/* =========================================================
   ALGO — Misi Belajar (19 misi bertahap) & Templat Kreasi
   Dirancang untuk siswa yang BELUM PERNAH memakai Scratch.
   ========================================================= */
(function (global) {
  'use strict';

  // ---------- Pembuat susunan blok (format JSON Blockly) ----------
  let seq = 0;
  const uid = () => 'b' + Date.now().toString(36).slice(-4) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);
  function blk(type, o) {
    o = o || {};
    const b = { type, id: uid() };
    if (o.f) b.fields = o.f;
    if (o.i || o.s) b.inputs = {};
    if (o.i) Object.keys(o.i).forEach(k => {
      const v = o.i[k];
      if (typeof v === 'number') b.inputs[k] = { shadow: { type: 'a_num', id: uid(), fields: { NUM: v } } };
      else if (typeof v === 'string') b.inputs[k] = { shadow: { type: 'a_text', id: uid(), fields: { TEXT: v } } };
      else b.inputs[k] = { block: v };
    });
    if (o.s) Object.keys(o.s).forEach(k => { const c = chain(o.s[k]); if (c) b.inputs[k] = { block: c }; });
    return b;
  }
  function chain(list) {
    if (!list || !list.length) return null;
    for (let i = 0; i < list.length - 1; i++) list[i].next = { block: list[i + 1] };
    return list[0];
  }
  function script(x, y, list) { const t = chain(list); t.x = x; t.y = y; return t; }
  function blocksJson(scripts) { return { languageVersion: 0, blocks: scripts || [] }; }

  const hero = (o) => Object.assign({ id: 'hero', name: 'Algo', asset: 'algo', costume: 'berdiri', x: 0, y: 0, dir: 90, size: 100, visible: true, rot: 'lr' }, o || {});
  const star = (x, y) => ({ kind: 'star', x, y, r: 20, size: 70 });
  const rock = (x, y) => ({ kind: 'rock', x, y, r: 24, size: 80 });
  const flag = (x, y) => ({ kind: 'flag', x, y, r: 22, size: 80 });

  function lastSaid(log) { return log.said.length ? String(log.said[log.said.length - 1]) : ''; }

  // apakah garis pena membentuk persegi (4 sisi sama, sudut 90°, tertutup)
  // lines = daftar [x0, y0, x1, y1] per perintah gerak saat pena turun
  function isSquare(lines) {
    if (!lines || lines.length < 4) return false;
    // gabungkan garis berurutan yang searah & bersambung
    const sides = [];
    lines.forEach(l => {
      const v = [l[2] - l[0], l[3] - l[1]];
      const last = sides[sides.length - 1];
      if (last) {
        const lv = [last[2] - last[0], last[3] - last[1]];
        const joined = Math.hypot(l[0] - last[2], l[1] - last[3]) < 2;
        const cross = lv[0] * v[1] - lv[1] * v[0];
        const dot = lv[0] * v[0] + lv[1] * v[1];
        if (joined && Math.abs(cross) < 0.02 * Math.hypot(lv[0], lv[1]) * Math.hypot(v[0], v[1]) && dot > 0) { last[2] = l[2]; last[3] = l[3]; return; }
      }
      sides.push(l.slice());
    });
    // cari 4 sisi berurutan yang membentuk persegi tertutup
    for (let i = 0; i + 4 <= sides.length; i++) {
      const s4 = sides.slice(i, i + 4);
      const vec = s4.map(s => [s[2] - s[0], s[3] - s[1]]);
      const len = vec.map(v => Math.hypot(v[0], v[1]));
      if (len[0] < 40 || len.some(x => Math.abs(x - len[0]) > 3)) continue;
      let ok = true;
      for (let k = 0; k < 4; k++) {
        const a = vec[k], c = vec[(k + 1) % 4];
        if (Math.abs(a[0] * c[0] + a[1] * c[1]) > len[0] * len[0] * 0.05) ok = false;
        if (k < 3 && Math.hypot(s4[k][2] - s4[k + 1][0], s4[k][3] - s4[k + 1][1]) > 2) ok = false;
      }
      if (ok && Math.hypot(s4[3][2] - s4[0][0], s4[3][3] - s4[0][1]) < 4) return true;
    }
    return false;
  }

  // ---------- Daftar misi ----------
  const BAB = [
    { no: 1, judul: 'Kenalan & Urutan', warna: '#4C7CF3', ikon: '🧩' },
    { no: 2, judul: 'Perulangan', warna: '#FFAB19', ikon: '🔁' },
    { no: 3, judul: 'Kejadian', warna: '#FFBF00', ikon: '⚡' },
    { no: 4, judul: 'Percabangan', warna: '#3FB2D8', ikon: '🔀' },
    { no: 5, judul: 'Variabel', warna: '#FF8C1A', ikon: '📦' },
    { no: 6, judul: 'Bercerita', warna: '#9B6BFF', ikon: '💬' },
    { no: 7, judul: 'Membuat Game', warna: '#22B07D', ikon: '🕹️' }
  ];

  // ---------- pembantu untuk misi Bab 6–7 ----------
  const tokoh = (o) => Object.assign({ name: 'Tokoh', asset: 'algo', costume: 'berdiri', x: 0, y: 0, dir: 90, size: 100, visible: true, rot: 'lr' }, o || {});
  const F = () => blk('a_when_flag');
  const rnd = (a, b) => blk('a_random', { i: { A: a, B: b } });
  const sayS = (t, s) => blk('a_say_secs', { i: { TEXT: t, SECS: s } });
  const skorSet = (id) => blk('a_var_set', { f: { VAR: { id } }, i: { VALUE: '0' } });
  // Algo bergerak kiri-kanan dengan tombol panah (dipakai di game apel)
  const algoKeys = () => [
    script(30, 30, [blk('a_when_key', { f: { KEY: 'kanan' } }), blk('a_point_dir', { f: { DIR: '90' } }), blk('a_change_x', { i: { DX: 15 } })]),
    script(30, 210, [blk('a_when_key', { f: { KEY: 'kiri' } }), blk('a_point_dir', { f: { DIR: '-90' } }), blk('a_change_x', { i: { DX: -15 } })])
  ];
  // apel jatuh terus; kembali ke atas (posisi x acak) saat sampai bawah
  const appleFall = (before, inLoop) => script(30, 30, [F()].concat(before || [], [
    blk('a_goto_xy', { i: { X: rnd(-200, 200), Y: 170 } }),
    blk('a_forever', { s: { DO: [
      blk('a_change_y', { i: { DY: -5 } }),
      blk('a_if', { i: { COND: blk('a_compare', { f: { OP: '<' }, i: { A: blk('a_y'), B: '-170' } }) }, s: { DO: [blk('a_goto_xy', { i: { X: rnd(-200, 200), Y: 170 } })] } })
    ].concat(inLoop || []) } })
  ]));
  const turnsOf = (log) => { const t = []; log.saidBy.forEach(x => { if (t[t.length - 1] !== x.id) t.push(x.id); }); return t; };
  const varVal = (c, name) => (c.vars[name] ? Number(c.vars[name].value) || 0 : 0);

  const MISSIONS = [
    {
      id: 1, bab: 1, judul: 'Halo, Algo!', konsep: 'Blok pertama', ikon: '👋',
      cerita: 'Algo baru tiba di kelasmu. Ia ingin menyapa teman-teman, tapi Algo hanya bisa bergerak kalau diberi perintah berupa blok.',
      tujuan: 'Buat Algo berkata "Halo!" saat tombol ▶ Jalankan ditekan.',
      latar: 'kelas', hero: hero({ x: 0, y: -70, size: 130 }),
      blok: ['a_when_flag', 'a_say_secs'],
      awal: () => [script(40, 40, [blk('a_when_flag')])],
      optimal: 2, tour: true,
      cek: (log) => log.said.some(t => String(t).trim() !== ''),
      gagal: () => 'Algo belum berkata apa-apa. Seret blok ungu "katakan" lalu tempel di bawah blok kuning.',
      petunjuk: [
        'Lihat blok ungu bertuliskan "katakan Halo! selama 2 detik" di sebelah kiri.',
        'Seret blok itu dan tempelkan TEPAT di bawah blok kuning "ketika ▶ Jalankan diklik". Kalau sudah menempel, blok akan ikut bergeser bersama blok kuning.',
        'Tekan tombol hijau ▶ Jalankan di atas panggung.'
      ]
    },
    {
      id: 2, bab: 1, judul: 'Jalan ke Bintang', konsep: 'Mengubah angka', ikon: '⭐',
      cerita: 'Ada bintang di ujung kanan! Algo harus berjalan lurus untuk mengambilnya.',
      tujuan: 'Gerakkan Algo sampai menyentuh bintang.',
      latar: 'kotak', hero: hero({ x: -150, y: 0, size: 80 }), props: [star(150, 0)], animate: true, showDir: true,
      blok: ['a_when_flag', 'a_move'],
      awal: () => [script(40, 40, [blk('a_when_flag')])],
      optimal: 2,
      cek: (log) => log.stars >= 1,
      gagal: (log, c) => `Algo berhenti di x = ${Math.round(c.hero.x)}. Bintang ada di x = 150. Ubah angka pada blok "maju".`,
      petunjuk: [
        'Setiap kotak tebal di latar berjarak 50 langkah.',
        'Algo ada di x = −150, bintang di x = 150. Jaraknya 300 langkah.',
        'Klik angka 10 pada blok "maju", ganti menjadi 300.'
      ]
    },
    {
      id: 3, bab: 1, judul: 'Belok ke Atas', konsep: 'Arah & putar', ikon: '↪️',
      cerita: 'Kali ini bintangnya ada di atas. Algo harus berjalan, lalu berbelok.',
      tujuan: 'Bawa Algo ke bintang. Panah oranye menunjukkan arah hadap Algo.',
      latar: 'kotak', hero: hero({ x: -150, y: -100, size: 80, rot: 'all' }), props: [star(100, 100)], animate: true, showDir: true,
      blok: ['a_when_flag', 'a_move', 'a_turn_left', 'a_turn_right'],
      awal: () => [script(40, 40, [blk('a_when_flag')])],
      optimal: 4,
      cek: (log) => log.stars >= 1,
      gagal: () => 'Algo belum sampai. Jalan ke kanan dulu sampai sejajar bintang, baru belok.',
      petunjuk: [
        'Algo harus maju ke kanan sampai x = 100. Itu 250 langkah.',
        'Lalu "putar kiri 90 derajat" agar Algo menghadap ke atas.',
        'Terakhir maju 200 langkah ke atas.'
      ]
    },
    {
      id: 4, bab: 1, judul: 'Awas Batu!', konsep: 'Urutan langkah', ikon: '🪨',
      cerita: 'Ada batu menghalangi jalan. Algo harus memutar lewat atas batu.',
      tujuan: 'Ambil bintang tanpa menabrak batu.',
      latar: 'kotak', hero: hero({ x: -200, y: -100, size: 80, rot: 'all' }), props: [rock(0, -100), rock(150, -100), star(150, 50)], animate: true, showDir: true,
      blok: ['a_when_flag', 'a_move', 'a_turn_left', 'a_turn_right'],
      awal: () => [script(40, 40, [blk('a_when_flag')])],
      optimal: 6, failOnCrash: true,
      cek: (log) => log.stars >= 1 && !log.crash,
      gagal: () => 'Belum sampai. Rencanakan dulu: naik ke atas batu, lalu belok ke kanan.',
      petunjuk: [
        'Algoritma = urutan langkah. Coba tulis rencananya: maju, belok kiri, maju, belok kanan, maju.',
        'Maju 100 langkah, putar kiri 90, maju 150 langkah.',
        'Lalu putar kanan 90 dan maju 250 langkah.'
      ]
    },
    {
      id: 5, bab: 2, judul: 'Tangga Bintang', konsep: 'Ulangi', ikon: '🪜',
      cerita: 'Tiga bintang tersusun seperti anak tangga. Gerakannya sama setiap anak tangga!',
      tujuan: 'Ambil ketiga bintang. Pakai blok "ulangi" supaya hemat blok.',
      latar: 'kotak', hero: hero({ x: -150, y: -125, size: 70, rot: 'all' }), props: [star(-100, -75), star(-50, -25), star(0, 25)], animate: true, showDir: true,
      blok: ['a_when_flag', 'a_repeat', 'a_move', 'a_turn_left', 'a_turn_right'],
      awal: () => [script(40, 40, [blk('a_when_flag')])],
      optimal: 6,
      cek: (log) => log.stars >= 3,
      gagal: (log) => `Baru ${log.stars} dari 3 bintang. Satu anak tangga = maju 50, putar kiri 90, maju 50, putar kanan 90.`,
      petunjuk: [
        'Pola satu anak tangga: maju 50, putar kiri 90, maju 50, putar kanan 90.',
        'Masukkan keempat blok pola itu ke DALAM mulut blok "ulangi".',
        'Ganti angka pada "ulangi" menjadi 3, karena ada 3 anak tangga.'
      ]
    },
    {
      id: 6, bab: 2, judul: 'Gambar Persegi', konsep: 'Ulangi + pena', ikon: '🟦',
      cerita: 'Algo membawa pena ajaib. Saat pena diturunkan, setiap langkah Algo meninggalkan garis.',
      tujuan: 'Gambar sebuah persegi (4 sisi sama panjang).',
      latar: 'kotak', hero: hero({ x: -50, y: -50, size: 60, rot: 'all' }), animate: true, showDir: true,
      blok: ['a_when_flag', 'a_pen_down', 'a_repeat', 'a_move', 'a_turn_left', 'a_turn_right', 'a_pen_up'],
      awal: () => [script(40, 40, [blk('a_when_flag')])],
      optimal: 5,
      cek: (log) => isSquare(log.penLines),
      gagal: (log) => log.penLines.length ? 'Belum persegi. Persegi punya 4 sisi sama panjang dan 4 sudut 90 derajat, dan garisnya kembali ke titik awal.' : 'Belum ada garis. Pasang blok "turunkan pena" sebelum Algo bergerak.',
      petunjuk: [
        'Pasang "turunkan pena" dulu, baru Algo bergerak.',
        'Satu sisi persegi = maju 100 langkah, lalu putar kiri 90 derajat.',
        'Persegi punya 4 sisi, jadi ulangi 4 kali.'
      ]
    },
    {
      id: 7, bab: 2, judul: 'Algo Melangkah', konsep: 'Ulangi + animasi', ikon: '🚶',
      cerita: 'Supaya terlihat benar-benar berjalan, Algo perlu mengganti kostum kakinya sambil melangkah sedikit-sedikit.',
      tujuan: 'Bawa Algo ke bendera finis sambil berganti kostum (animasi berjalan).',
      latar: 'taman', hero: hero({ x: -180, y: -90, size: 80 }), props: [flag(175, -90)],
      blok: ['a_when_flag', 'a_repeat', 'a_move', 'a_next_costume', 'a_wait'],
      awal: () => [script(40, 40, [blk('a_when_flag')])],
      optimal: 5,
      cek: (log) => log.flag && log.costumeChanges >= 4,
      gagal: (log) => log.flag ? 'Algo sampai, tapi belum terlihat melangkah. Tambahkan "kostum berikutnya" di dalam perulangan.' : 'Algo belum sampai bendera. Jaraknya sekitar 350 langkah.',
      petunjuk: [
        'Gerak kecil yang diulang-ulang akan terlihat seperti berjalan.',
        'Di dalam "ulangi": maju 35 langkah, kostum berikutnya, tunggu 0.2 detik.',
        'Ulangi 10 kali (10 × 35 = 350 langkah).'
      ]
    },
    {
      id: 8, bab: 3, judul: 'Kendalikan Algo', konsep: 'Kejadian tombol', ikon: '🎮',
      cerita: 'Sekarang KAMU yang mengendalikan Algo dengan tombol panah, seperti bermain game.',
      tujuan: 'Buat tombol panah kiri, kanan, dan atas bisa menggerakkan Algo, lalu kumpulkan 3 bintang.',
      latar: 'taman', hero: hero({ x: 0, y: -30, size: 70 }), props: [star(150, -30), star(-150, -30), star(0, 110)],
      blok: ['a_when_key', 'a_change_x', 'a_change_y'],
      awal: () => [script(40, 40, [blk('a_when_key', { f: { KEY: 'kanan' } }), blk('a_change_x', { i: { DX: 10 } })])],
      optimal: 6, interaktif: 'Tekan tombol panah di keyboard, atau tombol panah di bawah panggung.',
      cek: (log) => log.stars >= 3,
      gagal: (log) => `Terkumpul ${log.stars} dari 3 bintang. Sudah ada contoh untuk panah kanan. Buat yang mirip untuk panah kiri dan atas.`,
      petunjuk: [
        'Contoh sudah ada: "ketika tombol panah kanan ditekan → ubah x sebesar 10".',
        'Untuk panah kiri: ubah x sebesar −10 (angka negatif = ke kiri).',
        'Untuk panah atas: pakai "ubah y sebesar 10".'
      ]
    },
    {
      id: 9, bab: 3, judul: 'Enggang Bernyanyi', konsep: 'Kejadian klik', ikon: '🐦',
      cerita: 'Burung enggang, burung khas Kalimantan, ingin bersuara setiap kali disentuh.',
      tujuan: 'Saat enggang diklik, ia mengeluarkan suara DAN berkata sesuatu.',
      latar: 'sungai', hero: hero({ name: 'Enggang', asset: 'enggang', costume: 'terbang1', x: 0, y: 10, size: 130 }),
      blok: ['a_when_clicked', 'a_play_sound', 'a_say_secs', 'a_next_costume'],
      awal: () => [],
      optimal: 3, interaktif: 'Sekarang klik atau sentuh si Enggang di panggung!',
      cek: (log) => log.clickHats >= 1 && log.sounds >= 1 && log.said.length >= 1,
      gagal: (log) => log.clickHats ? 'Enggang sudah diklik. Pastikan ada blok suara DAN blok "katakan" di bawah blok "ketika tokoh ini diklik".' : 'Pakai blok kuning "ketika tokoh ini diklik" sebagai pembuka.',
      petunjuk: [
        'Blok pembukanya: "ketika tokoh ini diklik".',
        'Tempel "mainkan suara" dan "katakan" di bawahnya.',
        'Tekan ▶ Jalankan lalu klik si Enggang di panggung.'
      ]
    },
    {
      id: 10, bab: 4, judul: 'Robot Penjaga', konsep: 'Jika … maka', ikon: '🤖',
      cerita: 'Algo bertugas menjaga lorong: berjalan bolak-balik tanpa berhenti. Tapi saat ini Algo menabrak tepi dan diam di sana.',
      tujuan: 'Buat Algo berbalik setiap kali menyentuh tepi panggung (minimal 2 kali).',
      latar: 'kotak', hero: hero({ x: 0, y: 0, size: 80 }),
      blok: ['a_when_flag', 'a_forever', 'a_move', 'a_if', 'a_touching', 'a_turn_right', 'a_turn_left'],
      awal: () => [script(40, 40, [blk('a_when_flag'), blk('a_forever', { s: { DO: [blk('a_move', { i: { STEPS: 6 } })] } })])],
      optimal: 6,
      cek: (log) => (log.edgeTouch || 0) >= 2 && log.turns >= 2,
      gagal: () => 'Algo perlu memeriksa terus: "apakah aku menyentuh tepi?". Pakai blok "jika … maka".',
      petunjuk: [
        'Di dalam "ulangi selamanya", tambahkan blok "jika … maka".',
        'Masukkan blok "menyentuh tepi panggung?" ke lubang segi enam pada "jika".',
        'Di dalam "jika", tambahkan "putar kanan 180 derajat" agar Algo berbalik.'
      ]
    },
    {
      id: 11, bab: 4, judul: 'Kuis Penjumlahan', konsep: 'Jika … jika tidak', ikon: '❓',
      cerita: 'Algo ingin menjadi guru matematika. Ia bertanya, lalu memeriksa jawabanmu.',
      tujuan: 'Kalau jawabannya 7, Algo berkata "Benar!". Kalau bukan, Algo berkata "Salah".',
      latar: 'kelas', hero: hero({ x: -120, y: -60, size: 110 }),
      blok: ['a_when_flag', 'a_ask', 'a_if_else', 'a_compare', 'a_answer', 'a_say_secs'],
      awal: () => [script(40, 40, [blk('a_when_flag'), blk('a_ask', { i: { TEXT: 'Berapa 3 + 4?' } })])],
      optimal: 7, interaktif: 'Ketik jawabanmu di kotak bawah panggung, lalu tekan Kirim.',
      cek: (log, c) => {
        const t = c.types;
        if (!t.a_if_else || !t.a_compare || !t.a_answer || !log.answers.length) return false;
        const ans = String(log.answers[log.answers.length - 1]).trim();
        const s = lastSaid(log).toLowerCase();
        return ans === '7' ? s.includes('benar') : s.includes('salah');
      },
      gagal: (log, c) => {
        const t = c.types;
        if (!t.a_if_else) return 'Pakai blok "jika … maka … jika tidak" untuk memilih jawaban.';
        if (!t.a_compare || !t.a_answer) return 'Di lubang "jika", pasang blok "( ) = ( )" lalu masukkan blok "jawaban" di sisi kiri dan angka 7 di sisi kanan.';
        if (!log.answers.length) return 'Jalankan program lalu ketik jawaban di bawah panggung.';
        return 'Periksa lagi: bagian atas "jika" harus berkata "Benar!", bagian "jika tidak" berkata "Salah".';
      },
      petunjuk: [
        'Setelah blok "tanya", pasang blok "jika … maka … jika tidak".',
        'Syaratnya: "jawaban = 7". Ambil blok "( ) = ( )" dari daftar, isi kiri dengan blok "jawaban" dan kanan dengan 7.',
        'Isi bagian atas dengan "katakan Benar!" dan bagian "jika tidak" dengan "katakan Salah".'
      ]
    },
    {
      id: 12, bab: 5, judul: 'Hitung Lompatan', konsep: 'Variabel penghitung', ikon: '🔢',
      cerita: 'Algo suka melompat. Tapi Algo lupa menghitung! Variabel "lompatan" bisa membantu mengingat angkanya.',
      tujuan: 'Hitung lompatan Algo dengan variabel, lalu Algo menyebutkan hasilnya (5).',
      latar: 'taman', hero: hero({ x: 0, y: -90, size: 90 }), vars: [{ id: 'var_lompatan', name: 'lompatan' }],
      blok: ['a_when_flag', 'a_var_set', 'a_var_change', 'a_var_get', 'a_repeat', 'a_change_y', 'a_wait', 'a_say_secs'],
      awal: () => [script(40, 40, [
        blk('a_when_flag'),
        blk('a_repeat', { i: { TIMES: 5 }, s: { DO: [blk('a_change_y', { i: { DY: 60 } }), blk('a_wait', { i: { SECS: 0.25 } }), blk('a_change_y', { i: { DY: -60 } }), blk('a_wait', { i: { SECS: 0.15 } })] } })
      ])],
      optimal: 10,
      cek: (log, c) => {
        const v = c.vars.lompatan;
        return v && Number(v.value) === 5 && log.said.some(s => String(s).trim() === '5') && c.types.a_var_change;
      },
      gagal: (log, c) => {
        if (!c.types.a_var_change) return 'Tambahkan "ubah lompatan sebesar 1" di DALAM perulangan, supaya setiap lompatan dihitung.';
        if (!c.types.a_var_get) return 'Di akhir, Algo perlu mengatakan isi variabel. Masukkan blok bulat "lompatan" ke dalam blok "katakan".';
        return 'Hampir! Pastikan Algo mengatakan angka 5 di akhir (setelah perulangan selesai).';
      },
      petunjuk: [
        'Di awal, pasang "atur lompatan ke 0" agar hitungan mulai dari nol.',
        'Di dalam "ulangi", tambahkan "ubah lompatan sebesar 1".',
        'Setelah perulangan, pasang "katakan" dan masukkan blok bulat "lompatan" ke dalamnya.'
      ]
    },
    // ===================== BAB 6 · BERCERITA =====================
    {
      id: 13, bab: 6, judul: 'Ngobrol di Sungai', konsep: 'Kirim pesan (bergiliran)', ikon: '💬',
      cerita: 'Pesut dan Enggang bertemu di Sungai Mahakam. Pesut sudah menyapa, tapi Enggang diam saja karena tidak tahu kapan gilirannya bicara.',
      tujuan: 'Buat percakapan bergantian: Pesut menyapa → Enggang menjawab → Pesut membalas lagi.',
      latar: 'sungai',
      tokoh: [
        tokoh({ id: 'pesut', name: 'Pesut', asset: 'pesut', costume: 'renang1', x: -120, y: -70 }),
        tokoh({ id: 'enggang', name: 'Enggang', asset: 'enggang', costume: 'terbang1', x: 130, y: 60, dir: -90, size: 90 })
      ],
      blok: ['a_when_flag', 'a_say_secs', 'a_broadcast', 'a_when_msg', 'a_wait', 'a_next_costume'],
      awal: () => ({ pesut: [script(30, 30, [F(), sayS('Halo Enggang! Apa kabar?', 2)])], enggang: [] }),
      optimal: 8,
      cek: (log, c) => {
        if (!c.types.a_broadcast || !c.types.a_when_msg) return false;
        const t = turnsOf(log), i = t.indexOf('pesut');
        return i >= 0 && t[i + 1] === 'enggang' && t[i + 2] === 'pesut';
      },
      gagal: (log, c) => {
        if (!log.saidBy.some(x => x.id === 'enggang')) return 'Enggang belum berbicara. Klik tokoh Enggang di kotak "Tokoh di misi ini", lalu mulai dengan blok "ketika menerima pesan".';
        if (!c.types.a_broadcast) return 'Pakai blok "kirim pesan" supaya tokoh lain tahu sekarang gilirannya.';
        return 'Percakapannya harus bergantian: Pesut → Enggang → Pesut. Pastikan Enggang mengirim pesan balasan untuk Pesut.';
      },
      petunjuk: [
        'Pada Pesut: setelah "katakan", tambahkan "kirim pesan" dan ganti isinya menjadi giliran enggang.',
        'Pilih tokoh Enggang. Susun: "ketika menerima pesan giliran enggang" → "katakan Kabar baik! Kamu?" → "kirim pesan giliran pesut".',
        'Pilih Pesut lagi. Tambahkan skrip baru: "ketika menerima pesan giliran pesut" → "katakan Aku juga baik!".'
      ]
    },
    {
      id: 14, bab: 6, judul: 'Kenalan Yuk!', konsep: 'Tanya & gabung teks', ikon: '🤝',
      cerita: 'Algo ingin mengenal teman barunya. Ia bisa bertanya, tapi belum bisa menyebut nama temannya.',
      tujuan: 'Algo bertanya nama, lalu menyapa dengan nama itu. Contoh: "Halo, Sari!"',
      latar: 'kelas', hero: hero({ x: -110, y: -60, size: 110 }),
      blok: ['a_when_flag', 'a_ask', 'a_say_secs', 'a_join', 'a_answer'],
      awal: () => [script(40, 40, [F(), blk('a_ask', { i: { TEXT: 'Halo! Siapa namamu?' } })])],
      optimal: 5, interaktif: 'Ketik namamu di kotak bawah panggung, lalu tekan Kirim.',
      cek: (log, c) => {
        if (!c.types.a_join || !c.types.a_answer || !log.answers.length) return false;
        const ans = String(log.answers[log.answers.length - 1]).trim();
        return ans !== '' && log.said.some(x => String(x).includes(ans) && String(x).trim() !== ans);
      },
      gagal: (log, c) => {
        if (!c.types.a_join) return 'Pakai blok hijau "gabung" untuk menyambung "Halo, " dengan blok "jawaban".';
        if (!c.types.a_answer) return 'Masukkan blok "jawaban" ke dalam blok "gabung".';
        return 'Pastikan Algo mengatakan sapaan yang memuat namamu, misalnya "Halo, Sari!".';
      },
      petunjuk: [
        'Setelah blok "tanya", tempel "katakan … selama 2 detik".',
        'Masukkan blok hijau "gabung" ke kotak teks pada blok "katakan".',
        'Ketik "Halo, " di kotak kiri "gabung", lalu masukkan blok "jawaban" ke kotak kanan.'
      ]
    },

    // ===================== BAB 7 · MEMBUAT GAME =====================
    {
      id: 15, bab: 7, judul: 'Klik Bintang', konsep: 'Game klik + skor', ikon: '✨',
      cerita: 'Bintang di luar angkasa ini suka berpindah-pindah. Siapa yang paling cepat mengkliknya akan mendapat poin!',
      tujuan: 'Setiap bintang diklik, skor bertambah 1 dan bintang pindah ke tempat acak. Kumpulkan 5 poin!',
      latar: 'angkasa', hero: hero({ id: 'bintang', name: 'Bintang', asset: 'bintang', costume: 'bintang', x: 0, y: 0, size: 110, rot: 'none' }),
      vars: [{ id: 'var_skor', name: 'skor' }],
      blok: ['a_when_flag', 'a_var_set', 'a_when_clicked', 'a_var_change', 'a_goto', 'a_play_sound'],
      awal: () => [script(40, 40, [F(), skorSet('var_skor')])],
      optimal: 6, interaktif: 'Klik atau sentuh bintangnya secepat mungkin!',
      cek: (log, c) => varVal(c, 'skor') >= 5 && c.types.a_when_clicked && c.types.a_goto,
      gagal: (log, c) => {
        if (!c.types.a_when_clicked) return 'Mulai dengan blok kuning "ketika tokoh ini diklik".';
        if (!c.types.a_var_change) return 'Di bawah "ketika tokoh ini diklik", tambahkan "ubah skor sebesar 1".';
        if (!c.types.a_goto) return 'Supaya seru, bintang harus pindah setelah diklik: pakai "pergi ke posisi acak".';
        return `Skormu ${varVal(c, 'skor')}. Terus klik bintangnya sampai 5 poin!`;
      },
      petunjuk: [
        'Ambil blok "ketika tokoh ini diklik" sebagai pembuka baru.',
        'Di bawahnya tempel "ubah skor sebesar 1", lalu "pergi ke posisi acak".',
        'Tambahkan "mainkan suara pop" agar terdengar setiap dapat poin. Lalu tekan ▶ Jalankan dan klik bintangnya.'
      ]
    },
    {
      id: 16, bab: 7, judul: 'Apel Jatuh', konsep: 'Ulangi selamanya + jika', ikon: '🍎',
      cerita: 'Kita akan membuat game Tangkap Apel. Langkah pertama: apel harus jatuh dari pohon terus-menerus. Algo sudah bisa digerakkan dengan tombol panah.',
      tujuan: 'Buat apel jatuh terus dari atas. Saat sampai di bawah, apel kembali ke atas di posisi acak.',
      latar: 'taman',
      tokoh: [
        tokoh({ id: 'algo', name: 'Algo', x: 0, y: -140, size: 80 }),
        tokoh({ id: 'apel', name: 'Apel', asset: 'apel', costume: 'apel', x: 0, y: 170, size: 90, rot: 'none' })
      ],
      startSprite: 'apel',
      blok: ['a_when_flag', 'a_forever', 'a_change_y', 'a_if', 'a_compare', 'a_y', 'a_goto_xy', 'a_random'],
      awal: () => ({ algo: algoKeys(), apel: [script(30, 30, [F(), blk('a_goto_xy', { i: { X: rnd(-200, 200), Y: 170 } })])] }),
      optimal: 16, tungguDetik: 8,
      cek: (log, c) => (log.topResets.apel || 0) >= 2 && c.typesOf('apel').a_forever,
      gagal: (log, c) => {
        const t = c.typesOf('apel');
        if (!t.a_forever) return 'Apel harus jatuh terus-menerus: pakai "ulangi selamanya" berisi "ubah y sebesar -5".';
        if (!t.a_if) return 'Apel sudah jatuh, tapi tidak kembali ke atas. Tambahkan "jika posisi y < -170 maka pergi ke x: (acak) y: 170".';
        return 'Apel belum kembali ke atas. Periksa syaratnya: "posisi y" harus LEBIH KECIL (<) dari -170.';
      },
      petunjuk: [
        'Tokoh Apel sudah terpilih. Di bawah "pergi ke x: … y: 170", pasang "ulangi selamanya" berisi "ubah y sebesar -5" (angka minus = turun).',
        'Di dalam "ulangi selamanya", tambahkan "jika … maka". Syaratnya blok hijau "( ) < ( )": kiri diisi blok "posisi y", kanan diisi -170.',
        'Di dalam "jika", pasang "pergi ke x: (angka acak dari -200 sampai 200) y: 170" supaya apel kembali ke atas.'
      ]
    },
    {
      id: 17, bab: 7, judul: 'Tangkap Apel', konsep: 'Menyentuh + skor', ikon: '🧺',
      cerita: 'Apel sudah berjatuhan. Sekarang jadikan ini game sungguhan: Algo mendapat poin setiap berhasil menangkap apel.',
      tujuan: 'Saat apel menyentuh Algo, skor bertambah 1 dan apel kembali ke atas. Tangkap 3 apel!',
      latar: 'taman',
      tokoh: [
        tokoh({ id: 'algo', name: 'Algo', x: 0, y: -140, size: 80 }),
        tokoh({ id: 'apel', name: 'Apel', asset: 'apel', costume: 'apel', x: 0, y: 170, size: 90, rot: 'none' })
      ],
      startSprite: 'apel',
      vars: [{ id: 'var_skor', name: 'skor' }],
      blok: ['a_when_flag', 'a_forever', 'a_if', 'a_touching', 'a_var_change', 'a_var_set', 'a_goto_xy', 'a_random', 'a_play_sound', 'a_change_y'],
      awal: () => ({ algo: algoKeys(), apel: [appleFall([skorSet('var_skor')])] }),
      optimal: 23, tungguDetik: 25, interaktif: 'Gerakkan Algo dengan tombol panah ◀ ▶ untuk menangkap apel!',
      cek: (log, c) => varVal(c, 'skor') >= 3 && c.types.a_touching && c.types.a_var_change,
      gagal: (log, c) => {
        if (!c.types.a_touching) return 'Di dalam "ulangi selamanya" milik Apel, tambahkan "jika menyentuh Algo? maka …".';
        if (!c.types.a_var_change) return 'Saat apel menyentuh Algo, tambahkan "ubah skor sebesar 1".';
        return `Skormu ${varVal(c, 'skor')}. Gerakkan Algo dengan panah ◀ ▶ dan tangkap 3 apel!`;
      },
      petunjuk: [
        'Pada Apel, di dalam "ulangi selamanya", tambahkan blok "jika … maka" yang baru.',
        'Isi syaratnya dengan "menyentuh …?" lalu pilih Algo dari daftarnya.',
        'Di dalam "jika": "ubah skor sebesar 1", lalu "pergi ke x: (acak -200 sampai 200) y: 170". Tekan ▶ Jalankan dan tangkap apelnya!'
      ]
    },
    {
      id: 18, bab: 7, judul: 'Hindari Batu', konsep: 'Akhir permainan', ikon: '🚀',
      cerita: 'Roket sedang menjelajah angkasa, tapi batu meteor terus berdatangan. Saat ini roket kebal: batu lewat begitu saja. Buat permainannya berakhir kalau roket tertabrak.',
      tujuan: 'Saat batu menyentuh roket, roket berkata "Aduh!" lalu semua program berhenti.',
      latar: 'angkasa',
      tokoh: [
        tokoh({ id: 'roket', name: 'Roket', asset: 'roket', costume: 'mesin_kecil', x: -170, y: 0, size: 80, rot: 'none' }),
        tokoh({ id: 'batu', name: 'Batu', asset: 'batu', costume: 'batu', x: 240, y: 0, size: 80, rot: 'none' })
      ],
      blok: ['a_when_flag', 'a_wait_until', 'a_touching', 'a_say_secs', 'a_stop', 'a_forever', 'a_if', 'a_play_sound'],
      awal: () => ({
        roket: [
          script(30, 30, [blk('a_when_key', { f: { KEY: 'atas' } }), blk('a_change_y', { i: { DY: 15 } })]),
          script(30, 170, [blk('a_when_key', { f: { KEY: 'bawah' } }), blk('a_change_y', { i: { DY: -15 } })]),
          script(30, 310, [F(), blk('a_forever', { s: { DO: [blk('a_next_costume'), blk('a_wait', { i: { SECS: 0.15 } })] } })])
        ],
        batu: [script(30, 30, [
          F(), blk('a_goto_xy', { i: { X: 240, Y: rnd(-150, 150) } }),
          blk('a_forever', { s: { DO: [
            blk('a_change_x', { i: { DX: -6 } }),
            blk('a_if', { i: { COND: blk('a_compare', { f: { OP: '<' }, i: { A: blk('a_x'), B: '-230' } }) }, s: { DO: [blk('a_goto_xy', { i: { X: 240, Y: rnd(-150, 150) } })] } })
          ] } })
        ])]
      }),
      optimal: 24, tungguDetik: 20, interaktif: 'Hindari batu dengan tombol ▲ ▼. Biarkan sekali tertabrak untuk menguji akhir permainan.',
      cek: (log, c) => !!log.stopped && log.said.length > 0 && c.types.a_touching && c.types.a_stop,
      gagal: (log, c) => {
        if (!c.types.a_touching) return 'Roket perlu memeriksa "apakah aku menyentuh Batu?". Pakai "tunggu sampai menyentuh Batu?".';
        if (!c.types.a_stop) return 'Setelah tertabrak, permainan harus berhenti: pakai blok "hentikan semua".';
        if (!log.said.length) return 'Tambahkan "katakan Aduh!" sebelum "hentikan semua".';
        return 'Biarkan batu menabrak roket untuk menguji akhir permainannya.';
      },
      petunjuk: [
        'Pilih tokoh Roket, lalu buat skrip baru yang dimulai dengan "ketika ▶ Jalankan diklik".',
        'Tempel "tunggu sampai …" dan isi syaratnya dengan "menyentuh Batu?".',
        'Setelah itu: "katakan Aduh! selama 1 detik", lalu "hentikan semua".'
      ]
    },
    {
      id: 19, bab: 7, judul: 'Tebak Angka', konsep: 'Ulangi sampai + petunjuk', ikon: '🎲',
      cerita: 'Algo memikirkan sebuah angka rahasia dari 1 sampai 10 dan menyimpannya di variabel "rahasia". Kamu menebak sampai benar, tapi Algo belum mau memberi petunjuk.',
      tujuan: 'Setiap tebakan salah, Algo berkata "Terlalu besar!" atau "Terlalu kecil!". Tebak sampai benar.',
      latar: 'kelas', hero: hero({ x: -120, y: -60, size: 110 }),
      vars: [{ id: 'var_rahasia', name: 'rahasia', visible: false }],
      blok: ['a_if', 'a_compare', 'a_answer', 'a_var_get', 'a_say_secs', 'a_ask', 'a_repeat_until', 'a_random', 'a_var_set', 'a_when_flag'],
      awal: () => [script(40, 40, [
        F(),
        blk('a_var_set', { f: { VAR: { id: 'var_rahasia' } }, i: { VALUE: rnd(1, 10) } }),
        sayS('Aku memikirkan angka 1 sampai 10. Coba tebak!', 2),
        blk('a_repeat_until', {
          i: { COND: blk('a_compare', { f: { OP: '=' }, i: { A: blk('a_answer'), B: blk('a_var_get', { f: { VAR: { id: 'var_rahasia' } } }) } }) },
          s: { DO: [blk('a_ask', { i: { TEXT: 'Tebakanmu?' } })] }
        }),
        sayS('Benar! Kamu hebat!', 2)
      ])],
      optimal: 20, interaktif: 'Ketik tebakanmu di kotak bawah panggung, lalu tekan Kirim.',
      cek: (log, c) => {
        if (!(c.types.a_if || c.types.a_if_else) || (c.types.a_compare || 0) < 2 || !log.answers.length) return false;
        const last = log.answers[log.answers.length - 1];
        return /benar/i.test(lastSaid(log)) && String(last).trim() !== '' && Number(String(last).replace(',', '.')) === varVal(c, 'rahasia');
      },
      gagal: (log, c) => {
        if (!(c.types.a_if || c.types.a_if_else) || (c.types.a_compare || 0) < 2) return 'Beri petunjuk! Di dalam "ulangi sampai", setelah "tanya", tambahkan "jika jawaban > rahasia maka katakan Terlalu besar!".';
        return 'Terus menebak sampai benar ya. Ikuti petunjuk dari Algo.';
      },
      petunjuk: [
        'Di dalam "ulangi sampai", di bawah blok "tanya", tambahkan blok "jika … maka".',
        'Syaratnya "( ) > ( )": kiri blok "jawaban", kanan blok bulat "rahasia". Di dalamnya: "katakan Terlalu besar! selama 1 detik".',
        'Buat satu "jika" lagi dengan "<" dan "katakan Terlalu kecil!". Lalu jalankan dan tebak angkanya.'
      ]
    }
  ];

  // Daftar tokoh sebuah misi (misi lama: satu tokoh "hero"; misi baru boleh beberapa tokoh)
  function spritesOf(m) { return m.tokoh || [m.hero]; }

  // Proyek awal untuk sebuah misi.
  // solution: susunan blok satu tokoh (misi lama) atau { multi: true, sprites: { id: blok } }
  function missionProject(m, solution) {
    const defs = spritesOf(m);
    const start = m.awal();
    const startMap = Array.isArray(start) ? { [defs[0].id]: start } : (start || {});
    const solMap = solution && solution.multi ? solution.sprites : (solution && solution.blocks ? { [defs[0].id]: solution } : null);
    const sprites = defs.map((d, i) => {
      const sp = JSON.parse(JSON.stringify(d));
      sp.layer = i + 1;
      sp.blocks = (solMap && solMap[d.id]) || blocksJson(startMap[d.id] || []);
      return sp;
    });
    const p = { v: 1, name: 'Misi ' + m.id, backdrop: m.latar, variables: JSON.parse(JSON.stringify(m.vars || [])), sprites };
    if (m.startSprite) p.current = m.startSprite;
    return p;
  }

  // Bentuk solusi yang disimpan (kemajuan & draf)
  function missionSolution(m, project) {
    if (!m.tokoh) return JSON.parse(JSON.stringify(project.sprites[0].blocks));
    const out = { multi: true, sprites: {} };
    project.sprites.forEach(sp => { out.sprites[sp.id] = JSON.parse(JSON.stringify(sp.blocks)); });
    return out;
  }

  function starsFor(m, count) {
    if (count <= m.optimal) return 3;
    if (count <= m.optimal + 3) return 2;
    return 1;
  }

  // ---------- Templat Kreasi ----------
  const TEMPLATES = [
    {
      id: 'kosong', judul: 'Proyek Kosong', ikon: '✨', ket: 'Mulai dari nol bersama Algo.',
      buat: () => ({ v: 1, name: 'Proyek Baru', backdrop: 'polos', variables: [], sprites: [hero({ id: newId(), x: 0, y: 0, rot: 'all', blocks: blocksJson([]) })] })
    },
    {
      id: 'cerita', judul: 'Cerita Sungai Mahakam', ikon: '📖', ket: 'Dua tokoh bercakap-cakap bergantian memakai pesan.',
      buat: () => {
        const a = { id: newId(), name: 'Pesut', asset: 'pesut', costume: 'renang1', x: -120, y: -60, dir: 90, size: 100, visible: true, rot: 'lr' };
        const b = { id: newId(), name: 'Enggang', asset: 'enggang', costume: 'terbang1', x: 130, y: 60, dir: -90, size: 90, visible: true, rot: 'lr' };
        a.blocks = blocksJson([script(30, 30, [
          blk('a_when_flag'),
          blk('a_say_secs', { i: { TEXT: 'Halo Enggang! Kamu dari mana?', SECS: 2.5 } }),
          blk('a_broadcast', { f: { MSG: 'giliran enggang' } })
        ]), script(30, 300, [
          blk('a_when_msg', { f: { MSG: 'giliran pesut' } }),
          blk('a_say_secs', { i: { TEXT: 'Wah, aku tinggal di Sungai Mahakam!', SECS: 2.5 } })
        ])]);
        b.blocks = blocksJson([script(30, 30, [
          blk('a_when_msg', { f: { MSG: 'giliran enggang' } }),
          blk('a_next_costume'),
          blk('a_say_secs', { i: { TEXT: 'Aku dari hutan Kalimantan. Kamu?', SECS: 2.5 } }),
          blk('a_broadcast', { f: { MSG: 'giliran pesut' } })
        ])]);
        return { v: 1, name: 'Cerita Sungai Mahakam', backdrop: 'sungai', variables: [], sprites: [a, b] };
      }
    },
    {
      id: 'game', judul: 'Game Tangkap Apel', ikon: '🍎', ket: 'Gerakkan Algo dengan panah untuk menangkap apel yang jatuh.',
      buat: () => {
        const v = { id: 'var_' + newId(), name: 'skor' };
        // game kiri-kanan: gaya putar "kiri-kanan saja" agar Algo tidak terbalik saat menghadap kiri
        const algo = hero({ id: newId(), x: 0, y: -140, size: 80, rot: 'lr' });
        const apel = { id: newId(), name: 'Apel', asset: 'apel', costume: 'apel', x: 0, y: 170, dir: 90, size: 100, visible: true, rot: 'none' };
        algo.blocks = blocksJson([
          script(30, 30, [blk('a_when_flag'), blk('a_var_set', { f: { VAR: { id: v.id } }, i: { VALUE: '0' } }), blk('a_goto_xy', { i: { X: 0, Y: -140 } })]),
          script(30, 260, [blk('a_when_key', { f: { KEY: 'kanan' } }), blk('a_point_dir', { f: { DIR: '90' } }), blk('a_change_x', { i: { DX: 20 } })]),
          script(30, 470, [blk('a_when_key', { f: { KEY: 'kiri' } }), blk('a_point_dir', { f: { DIR: '-90' } }), blk('a_change_x', { i: { DX: -20 } })])
        ]);
        const randX = blk('a_random', { i: { A: -200, B: 200 } });
        const randX2 = blk('a_random', { i: { A: -200, B: 200 } });
        apel.blocks = blocksJson([script(30, 30, [
          blk('a_when_flag'),
          blk('a_goto_xy', { i: { X: randX, Y: 170 } }),
          blk('a_forever', { s: { DO: [
            blk('a_change_y', { i: { DY: -5 } }),
            blk('a_if', { i: { COND: blk('a_touching', { f: { TARGET: algo.id } }) }, s: { DO: [
              blk('a_var_change', { f: { VAR: { id: v.id } }, i: { N: 1 } }),
              blk('a_play_sound', { f: { SOUND: 'pop' } }),
              blk('a_goto_xy', { i: { X: randX2, Y: 170 } })
            ] } }),
            blk('a_if', { i: { COND: blk('a_compare', { i: { A: blk('a_y'), B: '-170' }, f: { OP: '<' } }) }, s: { DO: [
              blk('a_goto_xy', { i: { X: blk('a_random', { i: { A: -200, B: 200 } }), Y: 170 } })
            ] } })
          ] } })
        ])]);
        return { v: 1, name: 'Game Tangkap Apel', backdrop: 'taman', variables: [v], sprites: [algo, apel] };
      }
    }
  ];

  function newId() { return 's' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 6); }

  global.AlgoMissions = { BAB, MISSIONS, TEMPLATES, missionProject, missionSolution, spritesOf, starsFor, blk, script, blocksJson, newId, isSquare };
})(window);
