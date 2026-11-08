/* =========================================================
   ALGO — Pustaka Gambar (tokoh & latar)
   Semua gambar dibuat orisinal dalam bentuk SVG.
   Setiap tokoh digambar menghadap ke KANAN (arah 90).
   ========================================================= */
(function (global) {
  'use strict';

  // ---------- Tokoh ----------
  // w/h = ukuran tampil di panggung (titik panggung) pada ukuran 100%
  const SPRITES = {
    algo: {
      nama: 'Algo', kategori: 'Tokoh', w: 82, h: 75,
      kostum: {
        berdiri: robot('stand'),
        melangkah: robot('step'),
        senang: robot('happy')
      }
    },
    dino: {
      nama: 'Dino', kategori: 'Tokoh', w: 86, h: 72,
      kostum: { jalan1: dino(0), jalan2: dino(1) }
    },
    pesut: {
      nama: 'Pesut', kategori: 'Hewan', w: 110, h: 64,
      kostum: { renang1: pesut(0), renang2: pesut(1) }
    },
    enggang: {
      nama: 'Enggang', kategori: 'Hewan', w: 104, h: 78,
      kostum: { terbang1: enggang(0), terbang2: enggang(1) }
    },
    kupu: {
      nama: 'Kupu-kupu', kategori: 'Hewan', w: 76, h: 66,
      kostum: { buka: kupu(0), tutup: kupu(1) }
    },
    kepiting: {
      nama: 'Kepiting', kategori: 'Hewan', w: 82, h: 60,
      kostum: { biasa: kepiting(0), capit: kepiting(1) }
    },
    roket: {
      nama: 'Roket', kategori: 'Benda', w: 100, h: 52,
      kostum: { mesin_kecil: roket(0), mesin_besar: roket(1) }
    },
    bola: { nama: 'Bola', kategori: 'Benda', w: 42, h: 42, kostum: { bola: bola() } },
    apel: { nama: 'Apel', kategori: 'Benda', w: 44, h: 48, kostum: { apel: apel() } },
    bintang: { nama: 'Bintang', kategori: 'Benda', w: 52, h: 52, kostum: { bintang: bintang(false), berkilau: bintang(true) } },
    batu: { nama: 'Batu', kategori: 'Benda', w: 66, h: 52, kostum: { batu: batu() } },
    bendera: { nama: 'Bendera', kategori: 'Benda', w: 50, h: 76, kostum: { finis: bendera() } },
    panah: { nama: 'Panah', kategori: 'Benda', w: 72, h: 40, kostum: { panah: panah() } },
    dinding: { nama: 'Dinding', kategori: 'Benda', w: 50, h: 50, kostum: { bata: dinding() } }
  };

  // Robot Algo, dilihat dari samping-depan dan MENGHADAP KANAN (layar, mata, & tangan di sisi kanan)
  function robot(mode) {
    const legs = mode === 'step'
      ? '<g transform="rotate(22 34 66)"><rect x="29" y="64" width="10" height="16" rx="4" fill="#2F44B5"/><ellipse cx="38" cy="81" rx="9" ry="4" fill="#1F2E85"/></g>' +
        '<g transform="rotate(-22 57 66)"><rect x="52" y="64" width="10" height="16" rx="4" fill="#2F44B5"/><ellipse cx="61" cy="81" rx="9" ry="4" fill="#1F2E85"/></g>'
      : '<rect x="29" y="64" width="10" height="16" rx="4" fill="#2F44B5"/><ellipse cx="38" cy="81" rx="9" ry="4" fill="#1F2E85"/>' +
        '<rect x="52" y="64" width="10" height="16" rx="4" fill="#2F44B5"/><ellipse cx="61" cy="81" rx="9" ry="4" fill="#1F2E85"/>';
    const eyes = mode === 'happy'
      ? '<path d="M54 42 q4 -6 8 0" stroke="#1B2559" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M69 42 q4 -6 8 0" stroke="#1B2559" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : '<circle cx="59" cy="40" r="5" fill="#1B2559"/><circle cx="74" cy="40" r="5" fill="#1B2559"/><circle cx="61" cy="38" r="1.8" fill="#fff"/><circle cx="76" cy="38" r="1.8" fill="#fff"/>';
    const mouth = mode === 'happy'
      ? '<path d="M62 48 q7 9 14 0 z" fill="#1B2559"/>'
      : '<path d="M63 49 q6 4 11 0" stroke="#1B2559" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    return svg(100, 92,
      '<path d="M40 19 Q38 11 31 7" stroke="#2F44B5" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="30" cy="6" r="5" fill="#FFB020" stroke="#C77E00" stroke-width="1.5"/>' +
      legs +
      '<rect x="3" y="31" width="14" height="27" rx="6" fill="#2F44B5"/>' +
      '<rect x="7" y="36" width="6" height="4" rx="2" fill="#FFB020"/>' +
      '<rect x="10" y="17" width="66" height="51" rx="18" fill="#4C6EF5" stroke="#2F44B5" stroke-width="3"/>' +
      '<path d="M18 30 v26" stroke="#7D97FF" stroke-width="4" stroke-linecap="round" opacity=".7"/>' +
      '<rect x="44" y="25" width="40" height="31" rx="11" fill="#E8F1FF" stroke="#2F44B5" stroke-width="2.5"/>' +
      eyes + mouth +
      '<ellipse cx="53" cy="48" rx="3" ry="2" fill="#FF9DB5" opacity=".8"/>' +
      '<rect x="72" y="52" width="18" height="9" rx="4.5" fill="#2F44B5"/><circle cx="91" cy="56.5" r="5" fill="#AFC2FF" stroke="#2F44B5" stroke-width="2"/>' +
      '<circle cx="24" cy="61" r="2" fill="#AFC2FF"/><circle cx="31" cy="61" r="2" fill="#AFC2FF"/>');
  }

  function dino(f) {
    const legA = f ? 'rotate(14 42 58)' : 'rotate(-10 42 58)';
    const legB = f ? 'rotate(-12 64 58)' : 'rotate(10 64 58)';
    return svg(110, 92,
      `<g transform="${legA}"><rect x="36" y="52" width="12" height="26" rx="5" fill="#2E9E5B"/><ellipse cx="44" cy="78" rx="9" ry="4" fill="#217A45"/></g>` +
      `<g transform="${legB}"><rect x="58" y="52" width="12" height="26" rx="5" fill="#2E9E5B"/><ellipse cx="66" cy="78" rx="9" ry="4" fill="#217A45"/></g>` +
      '<path d="M8 50 C20 46 26 40 34 36 L40 56 C28 58 16 56 8 50 Z" fill="#3BB56C"/>' +
      '<ellipse cx="55" cy="46" rx="26" ry="18" fill="#3BB56C"/>' +
      '<ellipse cx="58" cy="52" rx="16" ry="9" fill="#BFF0C9"/>' +
      '<path d="M70 38 C72 22 80 14 92 16 C104 18 106 30 100 36 C94 42 84 42 76 46 Z" fill="#3BB56C"/>' +
      '<path d="M40 30 l5 -8 l5 8 z M50 28 l5 -8 l5 8 z M60 28 l5 -8 l5 8 z" fill="#FFB020"/>' +
      '<circle cx="93" cy="24" r="4.5" fill="#fff"/><circle cx="94.5" cy="24" r="2.6" fill="#173B25"/>' +
      '<path d="M90 34 q6 3 11 -1" stroke="#173B25" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<rect x="74" y="44" width="10" height="5" rx="2.5" fill="#2E9E5B"/>');
  }

  function pesut(f) {
    const tail = f
      ? '<path d="M26 40 L6 26 L12 40 L4 52 Z" fill="#7F99AE"/>'
      : '<path d="M26 40 L8 34 L12 42 L8 54 Z" fill="#7F99AE"/>';
    return svg(120, 70,
      tail +
      '<path d="M20 40 C30 20 74 14 98 24 C112 30 114 44 102 50 C82 60 42 60 22 46 Z" fill="#94AEC2"/>' +
      '<path d="M40 50 C60 58 86 56 103 48 C96 52 80 57 60 56 C52 56 46 54 40 50 Z" fill="#D9E6EF"/>' +
      '<path d="M58 21 Q64 13 70 21 Z" fill="#7F99AE"/>' +
      '<ellipse cx="72" cy="50" rx="10" ry="4" transform="rotate(25 72 50)" fill="#7F99AE"/>' +
      '<circle cx="97" cy="35" r="3" fill="#1D2A35"/><circle cx="98" cy="34" r="1" fill="#fff"/>' +
      '<path d="M98 43 q5 2 9 -1" stroke="#1D2A35" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="91" cy="41" rx="3" ry="1.8" fill="#F7A9BC" opacity=".7"/>');
  }

  function enggang(f) {
    const wing = f
      ? '<path d="M38 44 C40 18 56 6 70 10 C62 24 58 36 56 46 Z" fill="#222"/><path d="M44 30 C50 22 58 16 64 14" stroke="#fff" stroke-width="3" fill="none"/>'
      : '<path d="M36 46 C46 60 62 66 74 62 C64 56 58 50 56 44 Z" fill="#222"/><path d="M44 54 C52 60 60 62 68 62" stroke="#fff" stroke-width="3" fill="none"/>';
    return svg(120, 90,
      '<path d="M36 48 C24 50 10 56 2 66 C14 68 28 62 38 56 Z" fill="#fff" stroke="#222" stroke-width="2"/>' +
      '<path d="M12 62 C18 58 24 56 30 54" stroke="#222" stroke-width="4" fill="none"/>' +
      '<ellipse cx="54" cy="50" rx="26" ry="16" fill="#2B2B2B"/>' +
      '<ellipse cx="58" cy="56" rx="14" ry="7" fill="#F2F2F2"/>' +
      wing +
      '<circle cx="80" cy="34" r="13" fill="#2B2B2B"/>' +
      '<path d="M88 30 C100 30 112 34 118 44 C108 42 98 42 88 40 Z" fill="#FFC21A" stroke="#C98C00" stroke-width="1.5"/>' +
      '<path d="M86 26 C92 16 106 16 112 24 C104 24 96 26 90 30 Z" fill="#F05A28" stroke="#B53A12" stroke-width="1.5"/>' +
      '<circle cx="83" cy="32" r="4" fill="#fff"/><circle cx="84" cy="32" r="2.2" fill="#111"/>' +
      '<path d="M50 64 l-3 12 M60 64 l2 12" stroke="#D9A400" stroke-width="3" stroke-linecap="round"/>');
  }

  // Kupu-kupu dilihat dari atas, kepala & antena MENGHADAP KANAN
  function kupu(f) {
    const sy = f ? 0.4 : 1;
    const half = (flip) =>
      `<g transform="translate(0 43) scale(1 ${flip ? -sy : sy}) translate(0 -43)">` +
      '<path d="M54 41 C58 16 80 4 89 13 C96 22 80 37 58 42 Z" fill="#FF8A3D" stroke="#B34E12" stroke-width="2"/>' +
      '<path d="M50 42 C42 20 20 14 13 23 C7 33 26 42 48 43 Z" fill="#9B5DE5" stroke="#5B2C99" stroke-width="2"/>' +
      '<circle cx="78" cy="18" r="5" fill="#FFE066"/><circle cx="25" cy="27" r="3.5" fill="#E9D8FD"/>' +
      '</g>';
    return svg(100, 86,
      half(false) + half(true) +
      '<ellipse cx="52" cy="43" rx="24" ry="4.5" fill="#3B2A1A"/>' +
      '<circle cx="78" cy="43" r="5.5" fill="#3B2A1A"/>' +
      '<path d="M82 40 C88 34 91 30 95 28 M82 46 C88 52 91 56 95 58" stroke="#3B2A1A" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="95" cy="28" r="2.2" fill="#3B2A1A"/><circle cx="95" cy="58" r="2.2" fill="#3B2A1A"/>');
  }

  function kepiting(f) {
    const claws = f
      ? '<path d="M18 30 C6 18 10 4 22 8 C18 14 22 18 26 16 C26 24 24 28 22 32 Z" fill="#E8553E" stroke="#A3301E" stroke-width="2"/>' +
        '<path d="M92 30 C104 18 100 4 88 8 C92 14 88 18 84 16 C84 24 86 28 88 32 Z" fill="#E8553E" stroke="#A3301E" stroke-width="2"/>'
      : '<path d="M16 40 C2 34 2 20 14 20 C14 26 20 30 24 28 C26 34 24 38 22 42 Z" fill="#E8553E" stroke="#A3301E" stroke-width="2"/>' +
        '<path d="M94 40 C108 34 108 20 96 20 C96 26 90 30 86 28 C84 34 86 38 88 42 Z" fill="#E8553E" stroke="#A3301E" stroke-width="2"/>';
    return svg(110, 80,
      '<path d="M28 56 l-12 12 M34 60 l-8 14 M82 56 l12 12 M76 60 l8 14" stroke="#A3301E" stroke-width="4" stroke-linecap="round"/>' +
      claws +
      '<path d="M24 38 L20 30 M86 38 L90 30" stroke="#A3301E" stroke-width="4" stroke-linecap="round"/>' +
      '<ellipse cx="55" cy="50" rx="32" ry="20" fill="#F26B4F" stroke="#A3301E" stroke-width="2.5"/>' +
      '<line x1="46" y1="34" x2="44" y2="22" stroke="#A3301E" stroke-width="3"/><line x1="64" y1="34" x2="66" y2="22" stroke="#A3301E" stroke-width="3"/>' +
      '<circle cx="44" cy="20" r="6" fill="#fff" stroke="#A3301E" stroke-width="2"/><circle cx="46.5" cy="20" r="3" fill="#222"/>' +
      '<circle cx="66" cy="20" r="6" fill="#fff" stroke="#A3301E" stroke-width="2"/><circle cx="68.5" cy="20" r="3" fill="#222"/>' +
      '<path d="M48 56 q7 6 14 0" stroke="#A3301E" stroke-width="2.5" fill="none" stroke-linecap="round"/>');
  }

  function roket(f) {
    const flame = f
      ? '<path d="M22 26 C10 14 -2 22 2 30 C-2 38 10 46 22 34 Z" fill="#FF7A1A"/><path d="M22 27 C14 22 8 26 9 30 C8 34 14 38 22 33 Z" fill="#FFD43B"/>'
      : '<path d="M22 27 C16 22 10 26 12 30 C10 34 16 38 22 33 Z" fill="#FF9F1A"/>';
    return svg(110, 60,
      flame +
      '<path d="M30 14 L18 4 L26 4 L42 14 Z M30 46 L18 56 L26 56 L42 46 Z" fill="#E63946"/>' +
      '<path d="M22 18 L76 14 C90 16 102 22 108 30 C102 38 90 44 76 46 L22 42 Z" fill="#F1F3F8" stroke="#8D99AE" stroke-width="2"/>' +
      '<path d="M88 17 C98 20 104 25 108 30 C104 35 98 40 88 43 Z" fill="#E63946"/>' +
      '<circle cx="66" cy="30" r="9" fill="#5BC0EB" stroke="#2B6F99" stroke-width="3"/>' +
      '<circle cx="63" cy="27" r="2.5" fill="#fff" opacity=".8"/>' +
      '<rect x="34" y="27" width="16" height="6" rx="3" fill="#8D99AE"/>');
  }

  function bola() {
    return svg(60, 60,
      '<circle cx="30" cy="30" r="27" fill="#FF8C42" stroke="#B5531A" stroke-width="2.5"/>' +
      '<path d="M3 30 H57 M30 3 V57" stroke="#B5531A" stroke-width="2.5"/>' +
      '<path d="M11 11 C20 20 20 40 11 49 M49 11 C40 20 40 40 49 49" stroke="#B5531A" stroke-width="2.5" fill="none"/>' +
      '<ellipse cx="20" cy="16" rx="6" ry="3" fill="#fff" opacity=".35" transform="rotate(-30 20 16)"/>');
  }

  function apel() {
    return svg(60, 66,
      '<path d="M30 16 C18 8 4 14 4 32 C4 50 16 62 24 62 C28 62 28 60 30 60 C32 60 32 62 36 62 C44 62 56 50 56 32 C56 14 42 8 30 16 Z" fill="#E63946" stroke="#A4161A" stroke-width="2"/>' +
      '<path d="M30 16 C30 10 32 6 34 2" stroke="#6B4226" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M33 10 C38 2 48 2 50 6 C46 12 38 13 33 10 Z" fill="#43AA5C"/>' +
      '<ellipse cx="17" cy="28" rx="5" ry="8" fill="#fff" opacity=".35"/>');
  }

  function bintang(kilau) {
    const extra = kilau
      ? '<path d="M8 10 l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3 l6 -3 z" fill="#FFF3BF"/><path d="M60 8 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2 z" fill="#FFF3BF"/>'
      : '';
    return svg(70, 70,
      extra +
      '<path d="M35 5 L43.5 25 L65 26.5 L48.5 40.5 L54 62 L35 50 L16 62 L21.5 40.5 L5 26.5 L26.5 25 Z" fill="#FFD43B" stroke="#E67700" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M35 14 L40 26 L30 26 Z" fill="#FFF3BF" opacity=".8"/>' +
      '<circle cx="29" cy="36" r="2.6" fill="#7A4A00"/><circle cx="41" cy="36" r="2.6" fill="#7A4A00"/>' +
      '<path d="M30 43 q5 4 10 0" stroke="#7A4A00" stroke-width="2" fill="none" stroke-linecap="round"/>');
  }

  function batu() {
    return svg(80, 62,
      '<path d="M8 56 C2 44 8 26 22 18 C32 6 52 6 62 16 C74 24 80 42 72 56 Z" fill="#8E9AAF" stroke="#5C677D" stroke-width="2.5"/>' +
      '<path d="M22 24 C30 16 42 14 50 18" stroke="#C5CCD8" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M44 36 l8 8 M30 42 l6 -4" stroke="#5C677D" stroke-width="2" stroke-linecap="round"/>');
  }

  function bendera() {
    let cells = '';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++)
      if ((r + c) % 2 === 0) cells += `<rect x="${14 + c * 8}" y="${6 + r * 7}" width="8" height="7" fill="#222"/>`;
    return svg(60, 92,
      '<rect x="10" y="4" width="4" height="86" rx="2" fill="#6B4226"/>' +
      '<rect x="14" y="6" width="40" height="28" fill="#fff" stroke="#222" stroke-width="1.5"/>' + cells +
      '<ellipse cx="12" cy="88" rx="10" ry="3" fill="#000" opacity=".15"/>');
  }

  function panah() {
    return svg(90, 50,
      '<path d="M6 18 H56 V6 L86 25 L56 44 V32 H6 Z" fill="#4C6EF5" stroke="#2F44B5" stroke-width="3" stroke-linejoin="round"/>');
  }

  function dinding() {
    return svg(60, 60,
      '<rect x="2" y="2" width="56" height="56" rx="4" fill="#C8553D" stroke="#7F2F1F" stroke-width="2.5"/>' +
      '<path d="M2 20 H58 M2 39 H58 M20 2 V20 M42 2 V20 M10 20 V39 M32 20 V39 M50 20 V39 M20 39 V58 M42 39 V58" stroke="#7F2F1F" stroke-width="2"/>');
  }

  // ---------- Latar (480 x 360) ----------
  const BACKDROPS = {
    polos: { nama: 'Polos', svg: svg(480, 360, '<rect width="480" height="360" fill="#FFFFFF"/>') },
    kotak: { nama: 'Kotak Koordinat', svg: gridBackdrop() },
    taman: { nama: 'Taman', svg: taman() },
    laut: { nama: 'Laut', svg: laut() },
    sungai: { nama: 'Sungai Mahakam', svg: sungai() },
    angkasa: { nama: 'Luar Angkasa', svg: angkasa() },
    kelas: { nama: 'Ruang Kelas', svg: kelas() }
  };

  function gridBackdrop() {
    let g = '<rect width="480" height="360" fill="#FBFCFF"/>';
    // garis tipis tiap 25 langkah, garis tegas tiap 50 langkah (sejajar titik tengah 0,0)
    for (let x = 15; x <= 480; x += 25) g += `<line x1="${x}" y1="0" x2="${x}" y2="360" stroke="#EEF1FA" stroke-width="1"/>`;
    for (let y = 5; y <= 360; y += 25) g += `<line x1="0" y1="${y}" x2="480" y2="${y}" stroke="#EEF1FA" stroke-width="1"/>`;
    for (let x = 40; x <= 440; x += 50) g += `<line x1="${x}" y1="0" x2="${x}" y2="360" stroke="#DCE3F5" stroke-width="1.2"/>`;
    for (let y = 30; y <= 330; y += 50) g += `<line x1="0" y1="${y}" x2="480" y2="${y}" stroke="#DCE3F5" stroke-width="1.2"/>`;
    g += '<line x1="240" y1="0" x2="240" y2="360" stroke="#AEB9DA" stroke-width="1.6"/><line x1="0" y1="180" x2="480" y2="180" stroke="#AEB9DA" stroke-width="1.6"/>';
    const t = (x, y, s) => `<text x="${x}" y="${y}" font-family="Nunito,Arial" font-size="10" font-weight="700" fill="#8C97BC">${s}</text>`;
    [-200, -100, 100, 200].forEach(v => { g += t(240 + v - 8, 194, v); });
    [-100, 100].forEach(v => { g += t(244, 180 - v + 4, v); });
    g += t(244, 194, '0') + t(462, 172, 'x') + t(246, 12, 'y');
    return svg(480, 360, g);
  }

  function taman() {
    return svg(480, 360,
      '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED8FF"/><stop offset="1" stop-color="#E6F6FF"/></linearGradient></defs>' +
      '<rect width="480" height="360" fill="url(#sky)"/>' +
      '<circle cx="404" cy="62" r="30" fill="#FFE066"/><circle cx="404" cy="62" r="42" fill="#FFE066" opacity=".25"/>' +
      cloud(70, 60, 1) + cloud(250, 40, .8) +
      '<path d="M0 230 C80 180 160 190 240 226 C320 190 400 180 480 220 V360 H0 Z" fill="#8CD17D"/>' +
      '<path d="M0 270 C120 240 240 250 480 262 V360 H0 Z" fill="#5DBB63"/>' +
      tree(60, 250) + tree(420, 246) +
      flowers());
  }
  function cloud(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".95"><ellipse cx="30" cy="20" rx="30" ry="16"/><ellipse cx="60" cy="16" rx="26" ry="18"/><ellipse cx="86" cy="22" rx="22" ry="13"/></g>`;
  }
  function tree(x, y) {
    return `<g transform="translate(${x} ${y})"><rect x="-6" y="0" width="12" height="40" rx="3" fill="#8B5A2B"/><circle cx="0" cy="-12" r="30" fill="#3E9B4F"/><circle cx="-16" cy="2" r="18" fill="#47AD5A"/><circle cx="16" cy="0" r="20" fill="#47AD5A"/></g>`;
  }
  function flowers() {
    let f = '';
    [[120, 300, '#FF6B9A'], [180, 320, '#FFD43B'], [300, 310, '#B197FC'], [360, 330, '#FF8A3D'], [250, 340, '#FF6B9A']].forEach(([x, y, c]) => {
      f += `<g transform="translate(${x} ${y})"><circle cx="0" cy="-6" r="4" fill="${c}"/><circle cx="6" cy="0" r="4" fill="${c}"/><circle cx="0" cy="6" r="4" fill="${c}"/><circle cx="-6" cy="0" r="4" fill="${c}"/><circle r="3" fill="#FFF3BF"/></g>`;
    });
    return f;
  }
  function laut() {
    return svg(480, 360,
      '<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FC3F7"/><stop offset="1" stop-color="#0277BD"/></linearGradient></defs>' +
      '<rect width="480" height="110" fill="#BDEBFF"/>' + cloud(300, 30, .7) +
      '<rect y="100" width="480" height="260" fill="url(#sea)"/>' +
      '<path d="M0 104 q20 -10 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#E1F5FE" stroke-width="4"/>' +
      '<path d="M0 320 C80 300 160 316 240 306 C320 296 400 312 480 300 V360 H0 Z" fill="#F4D58D"/>' +
      '<path d="M60 318 c0 -24 -8 -40 -2 -60 M70 320 c0 -20 6 -36 2 -54" stroke="#2E9E5B" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M420 314 c0 -18 -10 -30 -4 -46" stroke="#E8553E" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="200" cy="200" r="6" fill="#fff" opacity=".3"/><circle cx="210" cy="180" r="4" fill="#fff" opacity=".3"/><circle cx="330" cy="240" r="5" fill="#fff" opacity=".3"/>');
  }
  function sungai() {
    let trees = '';
    for (let i = 0; i < 9; i++) {
      const x = 20 + i * 56, h = 40 + (i % 3) * 14;
      trees += `<g transform="translate(${x} ${150 - h / 3})"><rect x="-4" y="${h / 2}" width="8" height="30" fill="#6B4226"/><ellipse cx="0" cy="${h / 3}" rx="30" ry="${h / 1.6}" fill="${i % 2 ? '#2F7D3E' : '#3A9150'}"/></g>`;
    }
    return svg(480, 360,
      '<defs><linearGradient id="riv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8BB9A8"/><stop offset="1" stop-color="#4D8C7D"/></linearGradient></defs>' +
      '<rect width="480" height="170" fill="#FFE8C2"/>' +
      '<circle cx="380" cy="80" r="34" fill="#FFB347" opacity=".85"/>' +
      trees +
      '<rect y="168" width="480" height="150" fill="url(#riv)"/>' +
      '<path d="M30 210 h60 M150 240 h80 M300 205 h70 M360 270 h70 M60 290 h60" stroke="#D5EDE5" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M0 310 C120 296 260 318 480 302 V360 H0 Z" fill="#7DBE6A"/>' +
      '<path d="M380 196 h70 l-10 12 h-52 z" fill="#8B5A2B"/><rect x="398" y="184" width="30" height="12" rx="3" fill="#C9A26B"/>');
  }
  function angkasa() {
    let st = '';
    const pts = [[30, 40], [80, 120], [140, 60], [200, 30], [260, 140], [320, 50], [380, 110], [440, 30], [60, 250], [120, 300], [180, 220], [300, 290], [360, 240], [420, 320], [460, 200], [230, 330], [20, 180], [100, 190]];
    pts.forEach(([x, y], i) => { st += `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.7}" fill="#fff" opacity="${0.5 + (i % 4) * 0.12}"/>`; });
    return svg(480, 360,
      '<defs><radialGradient id="sp" cx=".3" cy=".3" r="1"><stop offset="0" stop-color="#2A3A7A"/><stop offset="1" stop-color="#0B1026"/></radialGradient></defs>' +
      '<rect width="480" height="360" fill="url(#sp)"/>' + st +
      '<circle cx="380" cy="270" r="46" fill="#F4A261"/><ellipse cx="380" cy="270" rx="76" ry="14" fill="none" stroke="#FFD6A5" stroke-width="5" transform="rotate(-15 380 270)"/>' +
      '<circle cx="368" cy="258" r="8" fill="#E76F51" opacity=".6"/>' +
      '<circle cx="90" cy="70" r="24" fill="#E9ECEF"/><circle cx="82" cy="64" r="5" fill="#CED4DA"/><circle cx="98" cy="80" r="4" fill="#CED4DA"/>');
  }
  function kelas() {
    return svg(480, 360,
      '<rect width="480" height="360" fill="#FFF4E0"/>' +
      '<rect y="290" width="480" height="70" fill="#C99A6B"/><path d="M0 290 H480" stroke="#A47148" stroke-width="4"/>' +
      '<rect x="60" y="40" width="360" height="190" rx="8" fill="#8B5A2B"/>' +
      '<rect x="72" y="52" width="336" height="166" rx="4" fill="#2F6B4F"/>' +
      '<path d="M100 90 h90 M100 110 h60 M260 150 l20 -30 l20 30 z" stroke="#E8F5E9" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>' +
      '<text x="250" y="100" font-family="Nunito,Arial" font-size="22" font-weight="800" fill="#E8F5E9" opacity=".75">1 + 1 = 2</text>' +
      '<rect x="180" y="226" width="120" height="8" rx="3" fill="#A47148"/><rect x="200" y="222" width="20" height="5" rx="2" fill="#fff"/>');
  }

  function svg(w, h, body) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
  }

  // ---------- Cache gambar ----------
  const imgCache = {};
  function dataUrl(svgText) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText); }

  const Assets = {
    SPRITES, BACKDROPS,
    spriteIds() { return Object.keys(SPRITES); },
    costumeNames(assetId) { const a = SPRITES[assetId] || SPRITES.algo; return Object.keys(a.kostum); },
    costumeUrl(assetId, costume) {
      const a = SPRITES[assetId] || SPRITES.algo;
      const names = Object.keys(a.kostum);
      const nm = typeof costume === 'number' ? names[((costume % names.length) + names.length) % names.length] : (a.kostum[costume] ? costume : names[0]);
      return dataUrl(a.kostum[nm]);
    },
    backdropUrl(id) { return dataUrl((BACKDROPS[id] || BACKDROPS.polos).svg); },
    image(url) {
      if (imgCache[url]) return imgCache[url];
      const im = new Image();
      im.decoding = 'async';
      im.src = url;
      imgCache[url] = im;
      return im;
    },
    preload() {
      const all = [];
      Object.keys(SPRITES).forEach(id => this.costumeNames(id).forEach(c => all.push(this.costumeUrl(id, c))));
      Object.keys(BACKDROPS).forEach(id => all.push(this.backdropUrl(id)));
      return Promise.all(all.map(u => new Promise(res => {
        const im = this.image(u);
        if (im.complete && im.naturalWidth) return res();
        im.onload = im.onerror = () => res();
      })));
    }
  };

  global.AlgoAssets = Assets;
})(window);
