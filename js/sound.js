/* =========================================================
   ALGO — Suara (dibuat langsung dengan Web Audio, tanpa file)
   ========================================================= */
(function (global) {
  'use strict';

  let ctx = null;
  let master = null;
  const active = new Set();

  function ac() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Daftar suara yang bisa dipilih siswa (nama tampil → kode)
  const SOUNDS = [
    ['pop', 'pop'], ['ding', 'ding'], ['boing (lompat)', 'boing'], ['menang', 'menang'],
    ['drum', 'drum'], ['tepuk', 'tepuk'], ['laser', 'laser'], ['gong', 'gong'], ['salah', 'salah']
  ];
  // Panjang tiap suara (detik) — dipakai blok "sampai selesai"
  const LENGTH = { pop: 0.15, ding: 0.6, boing: 0.45, menang: 0.9, drum: 0.3, tepuk: 0.25, laser: 0.35, gong: 1.4, salah: 0.5 };

  // Nada solmisasi (oktaf 4–5)
  const NOTES = [
    ['Do', 261.63], ['Re', 293.66], ['Mi', 329.63], ['Fa', 349.23], ['Sol', 392.0],
    ['La', 440.0], ['Si', 493.88], ['Do tinggi', 523.25]
  ];

  function tone(freq, start, dur, type, vol, endFreq) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, start);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol || 0.6, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(master);
    o.start(start); o.stop(start + dur + 0.05);
    active.add(o);
    o.onended = () => active.delete(o);
  }

  function noise(start, dur, vol, hp) {
    const c = ac(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 800;
    const g = c.createGain(); g.gain.value = vol || 0.5;
    s.connect(f); f.connect(g); g.connect(master);
    s.start(start);
    active.add(s);
    s.onended = () => active.delete(s);
  }

  const Sound = {
    SOUNDS, NOTES, LENGTH,
    unlock() { ac(); },
    play(name) {
      const c = ac(); if (!c) return 0;
      const t = c.currentTime + 0.01;
      switch (name) {
        case 'pop': tone(600, t, 0.12, 'sine', 0.6, 1200); break;
        case 'ding': tone(1046, t, 0.6, 'sine', 0.5); tone(1568, t, 0.4, 'sine', 0.2); break;
        case 'boing': tone(180, t, 0.45, 'triangle', 0.6, 640); break;
        case 'menang': [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.12, 0.35, 'triangle', 0.45)); break;
        case 'drum': tone(140, t, 0.3, 'sine', 0.9, 45); noise(t, 0.05, 0.25, 2000); break;
        case 'tepuk': noise(t, 0.08, 0.6, 1200); noise(t + 0.03, 0.12, 0.4, 1500); break;
        case 'laser': tone(1400, t, 0.32, 'sawtooth', 0.25, 180); break;
        case 'gong': tone(110, t, 1.4, 'sine', 0.7); tone(220, t, 1.0, 'sine', 0.25); tone(330, t, 0.6, 'sine', 0.12); break;
        case 'salah': tone(220, t, 0.22, 'square', 0.25); tone(165, t + 0.22, 0.28, 'square', 0.25); break;
        default: tone(600, t, 0.12, 'sine', 0.6, 1200);
      }
      return LENGTH[name] || 0.2;
    },
    note(name, secs) {
      const c = ac(); if (!c) return;
      const n = NOTES.find(x => x[0] === name) || NOTES[0];
      tone(n[1], c.currentTime + 0.01, Math.max(0.08, Math.min(4, secs || 0.5)), 'triangle', 0.5);
    },
    stopAll() {
      active.forEach(o => { try { o.stop(); } catch (e) { /* abaikan */ } });
      active.clear();
    }
  };

  global.AlgoSound = Sound;
})(window);
