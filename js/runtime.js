/* =========================================================
   ALGO — Mesin Penjalan Program (interpreter blok)
   Membaca susunan blok (format JSON Blockly) lalu menjalankannya.
   Mendukung 3 mode: normal, pelan (blok menyala satu per satu),
   dan langkah (satu klik = satu blok).
   ========================================================= */
(function (global) {
  'use strict';
  const Stage = global.AlgoStage;
  const Sound = () => global.AlgoSound;
  const Assets = () => global.AlgoAssets;

  const HATS = { a_when_flag: 1, a_when_key: 1, a_when_clicked: 1, a_when_msg: 1 };
  // Tombol ditahan: Algo mengulang skrip sendiri setiap KEY_MS (tidak memakai
  // pengulangan tombol dari sistem operasi yang patah-patah), dan gerak di skrip
  // tombol dibagi rata ke setiap frame sehingga tokoh meluncur mulus.
  const KEY_MS = 33;          // satu putaran skrip tombol ≈ 30 kali per detik
  // Putaran awal sedikit lebih lama: ketukan singkat tetap = 1 kali jalan,
  // dan saat ditahan tokoh "mulai berlari" (100 → 50 → 33 ms) tanpa berhenti.
  const KEY_RAMP = [100, 50, KEY_MS];
  const keyDur = (cycle) => KEY_RAMP[Math.min(cycle || 0, KEY_RAMP.length - 1)];
  const KEY_SMOOTH_MAX = 80;  // gerak lebih jauh dari ini tetap langsung (teleport)
  const KEY_TURN_MAX = 90;    // putaran lebih besar dari ini tetap langsung
  // blok yang dibuat meluncur bersamaan di skrip tombol (mis. maju + putar = melengkung mulus)
  const GLIDE = { a_move: 1, a_turn_right: 1, a_turn_left: 1, a_change_x: 1, a_change_y: 1 };
  const MOTION = { a_move: 1, a_goto_xy: 1, a_goto: 1, a_glide_xy: 1, a_change_x: 1, a_set_x: 1, a_change_y: 1, a_set_y: 1, a_bounce: 1 };
  class StopSignal { }
  const STOP = new StopSignal();

  class Runtime {
    constructor(stage) {
      this.stage = stage;
      this.mode = 'normal';      // normal | pelan | langkah
      this.slowDelay = 520;      // ms per blok di mode pelan
      this.animate = false;      // gerak berjalan halus (dipakai di misi)
      this.gen = 0;
      this.threads = new Map();
      this.keys = new Set();
      this.answer = '';
      this.timerStart = performance.now();
      this.hooks = {};           // onFrame, onIdle, onStar, onCrash, onError, onRunningChange, onBlockStart
      this.highlighter = null;   // { spriteId, set(id,on) }
      this._frameWaiters = [];
      this._stepWaiters = [];
      this._keyPending = [];
      this.frameTime = performance.now();
      this.frameNo = 0;
      this._running = false;
      this._dirty = 3;
      this.project = null;
      this.state = { sprites: [], props: [], backdrop: 'polos', variables: {} };
      stage.state = this.state;
      stage.isRunning = () => this._running;
      this._loop = this._loop.bind(this);
      this._raf = requestAnimationFrame(this._loop);
    }

    // ---------- memuat proyek ----------
    load(project, opts) {
      opts = opts || {};
      this.stopAll(true);
      this.project = project;
      let layer = 0;
      project.sprites.forEach(sp => {
        if (sp.layer == null) sp.layer = ++layer; else layer = Math.max(layer, sp.layer);
        if (sp.rot == null) sp.rot = 'all';
        if (sp.size == null) sp.size = 100;
        if (sp.visible == null) sp.visible = true;
        if (sp.dir == null) sp.dir = 90;
        sp.bubble = null;
        sp.penDown = false; sp.penColor = sp.penColor || '#3A6FF2'; sp.penSize = sp.penSize || 3;
      });
      this.maxLayer = layer;
      this.state.sprites = project.sprites;
      this.state.backdrop = project.backdrop || 'polos';
      this.state.props = (opts.props || []).map(p => Object.assign({}, p));
      const old = this.state.variables || {};
      this.state.variables = {};
      (project.variables || []).forEach(v => {
        const prev = old[v.id];
        this.state.variables[v.id] = { id: v.id, name: v.name, value: prev && opts.keepValues ? prev.value : 0, visible: v.visible !== false };
      });
      this.heroId = opts.heroId || null;
      this.animate = !!opts.animate;
      this.resetLog();
      this.stage.state = this.state;
      this._dirty = 3;
    }

    syncVariables(list) {
      const map = {};
      list.forEach(v => {
        const prev = this.state.variables[v.id];
        map[v.id] = prev ? Object.assign(prev, { name: v.name }) : { id: v.id, name: v.name, value: 0, visible: true };
      });
      this.state.variables = map;
      this._dirty = 3;
    }

    resetLog() {
      this.log = {
        said: [], asked: [], answers: [], sounds: 0, notes: [], costumeChanges: 0,
        keyHats: new Set(), clickHats: 0, msgs: 0, stars: 0, flag: false, crash: null,
        edgeBounces: 0, turns: 0, penPath: [], penLines: [], penSegments: 0, moved: 0, startedAt: performance.now(),
        saidBy: [],      // [{ id: tokoh, text, t }] — siapa berbicara & kapan (percakapan)
        topResets: {},   // tokoh id → berapa kali berpindah dari bawah ke atas panggung (apel jatuh)
        stopped: null    // { by: tokoh } saat blok "hentikan semua" dijalankan
      };
    }

    // ---------- kendali luar ----------
    get running() { return this._running; }

    start() {
      this.stopAll(true);
      this.timerStart = performance.now();
      this.answer = '';
      this.resetLog();
      Sound().unlock();
      let n = 0;
      this._eachHat(h => { if (h.block.type === 'a_when_flag') { this._spawn(h); n++; } });
      this._updateRunning();
      return n;
    }

    // jalankan satu tumpukan blok (dipakai saat siswa mengklik blok di area kode)
    runStack(spriteId, topBlockJson) {
      const sp = this._sprite(spriteId);
      if (!sp || !topBlockJson) return;
      Sound().unlock();
      const key = sp.id + ':' + topBlockJson.id;
      if (this.threads.has(key)) { this.threads.get(key).killed = true; this.threads.delete(key); this._updateRunning(); return; }
      this._spawn({ sprite: sp, block: topBlockJson, direct: !HATS[topBlockJson.type] });
      this._updateRunning();
    }

    stopAll(silent) {
      this.gen++;
      this.threads.forEach(t => { t.killed = true; this._unhighlight(t); });
      this.threads.clear();
      this.stage.cancelAsk();
      if (Sound()) Sound().stopAll();
      (this.state.sprites || []).forEach(sp => { sp.bubble = null; });
      this._frameWaiters.splice(0).forEach(r => r());
      this._stepWaiters.splice(0).forEach(r => r());
      this._keyPending = [];
      if (this.highlighter) this.highlighter.clear();
      this._dirty = 3;
      if (!silent) this._updateRunning();
      else this._running = false;
    }

    stepOnce() { this._stepWaiters.splice(0).forEach(r => r()); }

    // dipanggil sekali saat tombol mulai ditekan (pengulangan dari OS diabaikan)
    keyDown(k) {
      if (!k || this.keys.has(k)) return;
      this.keys.add(k);
      const now = performance.now();
      this._eachHat(h => {
        if (h.block.type === 'a_when_key') {
          const want = (h.block.fields && h.block.fields.KEY) || 'spasi';
          if (want === k || want === 'apa') {
            this.log.keyHats.add(want);
            const cur = this.threads.get(h.sprite.id + ':' + h.block.id);
            // ketukan baru saat putaran sebelumnya belum selesai → jalankan sekali lagi setelahnya
            if (cur && cur.keyWant) cur.again = true;
            else this._spawn(h, false, { keyWant: want, cycle: 0, clock: now, startTime: now, startFrame: this.frameNo });
          }
        }
      });
      this._updateRunning();
    }
    keyUp(k) { this.keys.delete(k); }
    // apakah ada blok "ketika tombol … ditekan" untuk tombol ini (atau "tombol apa saja")
    wantsKey(k) {
      let w = false;
      this._eachHat(h => {
        if (w || h.block.type !== 'a_when_key') return;
        const want = (h.block.fields && h.block.fields.KEY) || 'spasi';
        if (want === k || want === 'apa') w = true;
      });
      return w;
    }
    releaseKeys() { this.keys.clear(); this._keyPending = []; }
    _keyHeld(want) { return want === 'apa' ? this.keys.size > 0 : this.keys.has(want); }

    // ulangi skrip tombol selama tombolnya masih ditahan
    _repeatKey(th) {
      const h = { sprite: th.sprite, block: th.top };
      if (th.glided) {
        // skrip bergerak: sambung langsung dari waktu akhir putaran sebelumnya
        // (tanpa menunggu frame baru) supaya kecepatan tetap rata
        if (!this._respawn || this._respawn.frame !== this.frameNo) this._respawn = { frame: this.frameNo, n: {} };
        const n = this._respawn.n[th.key] = (this._respawn.n[th.key] || 0) + 1;
        if (n <= 3) {
          const clock = Math.max(th.clock, this.frameTime - keyDur(th.cycle + 1));
          this._spawn(h, false, { keyWant: th.keyWant, cycle: th.cycle + 1, clock, startTime: performance.now(), startFrame: this.frameNo });
          return;
        }
      }
      // skrip tanpa gerak (mis. hanya suara): ulangi paling cepat tiap KEY_MS
      this._keyPending.push({ h, want: th.keyWant, cycle: th.cycle + 1, due: th.startTime + keyDur(th.cycle), gen: this.gen, force: !!th.again });
    }

    clickSprite(id) {
      Sound().unlock();
      this._eachHat(h => {
        if (h.block.type === 'a_when_clicked' && h.sprite.id === id) { this.log.clickHats++; this._spawn(h, true); }
      });
      this._updateRunning();
    }

    usesKeys() {
      let k = false;
      this._eachTop((sp, b) => { if (b.type === 'a_when_key') k = true; walk(b, x => { if (x.type === 'a_key_pressed') k = true; }); });
      return k;
    }

    // ---------- bagian dalam ----------
    _sprite(id) { return this.state.sprites.find(s => s.id === id); }

    _eachTop(fn) {
      if (!this.project) return;
      this.project.sprites.forEach(sp => {
        const tops = (sp.blocks && sp.blocks.blocks) || [];
        tops.forEach(b => fn(sp, b));
      });
    }
    _eachHat(fn) { this._eachTop((sp, b) => { if (HATS[b.type]) fn({ sprite: sp, block: b }); }); }

    _spawn(h, restart, extra) {
      const key = h.sprite.id + ':' + h.block.id;
      const cur = this.threads.get(key);
      if (cur) {
        if (restart === false) return null; // sedang berjalan: abaikan
        cur.killed = true; this._unhighlight(cur);
      }
      const th = Object.assign({ key, sprite: h.sprite, top: h.block, gen: this.gen, killed: false, hl: null, loopDepth: 0 }, extra || {});
      this.threads.set(key, th);
      if (this.mode === 'normal' && !h.direct) this._hl(th, h.block.id, true);
      const startBlock = h.direct ? h.block : (h.block.next && h.block.next.block);
      th.promise = this._run(th, startBlock);
      return th;
    }

    async _run(th, block) {
      try {
        await this._stack(block, th);
      } catch (e) {
        if (e !== STOP) {
          console.error(e);
          if (this.hooks.onError) this.hooks.onError(e);
        }
      } finally {
        this._unhighlight(th);
        if (this.threads.get(th.key) === th) this.threads.delete(th.key);
        if (th.keyWant && !th.killed && th.gen === this.gen && (th.again || this._keyHeld(th.keyWant))) this._repeatKey(th);
        this._updateRunning();
      }
    }

    _alive(th) { if (th.killed || th.gen !== this.gen) throw STOP; }

    async _stack(b, th) {
      while (b) {
        this._alive(th);
        if (b.enabled === false) { b = b.next && b.next.block; continue; }
        // skrip tombol: blok gerak & putar yang berurutan dijalankan bersamaan, dibagi rata per frame
        if (th.keyWant && th.loopDepth === 0 && this.mode === 'normal' && GLIDE[b.type]) {
          const run = this._glideRun(b, th);
          if (run) {
            const sp = th.sprite, px = sp.x, py = sp.y;
            if (this.hooks.onBlockStart) run.blocks.forEach(x => this.hooks.onBlockStart(x, th));
            await this._keyGlideOps(sp, run.ops, th);
            if (sp.penDown && (sp.x !== px || sp.y !== py)) this.log.penLines.push([round1(px), round1(py), round1(sp.x), round1(sp.y)]);
            this._dirty = 2;
            b = run.next;
            continue;
          }
        }
        await this._before(b, th);
        await this._exec(b, th);
        this._dirty = 2;
        b = b.next && b.next.block;
      }
    }

    async _before(b, th) {
      if (this.hooks.onBlockStart) this.hooks.onBlockStart(b, th);
      if (this.mode === 'pelan') {
        this._hl(th, b.id);
        await this._sleep(this.slowDelay, th);
      } else if (this.mode === 'langkah') {
        this._hl(th, b.id);
        await new Promise(r => this._stepWaiters.push(r));
        this._alive(th);
      }
    }

    _hl(th, id, keep) {
      if (!this.highlighter || this.highlighter.spriteId !== th.sprite.id) return;
      if (th.hl && th.hl !== id && !keep) this.highlighter.set(th.hl, false);
      this.highlighter.set(id, true);
      th.hl = id;
    }
    _unhighlight(th) {
      if (th.hl && this.highlighter && this.highlighter.spriteId === th.sprite.id) this.highlighter.set(th.hl, false);
      th.hl = null;
    }

    frame() { return new Promise(r => this._frameWaiters.push(r)); }

    async _yield(th) { await this.frame(); this._alive(th); }

    async _sleep(ms, th) {
      const end = performance.now() + ms;
      while (performance.now() < end) { await this.frame(); this._alive(th); }
    }

    _updateRunning() {
      const r = this.threads.size > 0;
      if (r !== this._running) {
        this._running = r;
        if (this.hooks.onRunningChange) this.hooks.onRunningChange(r);
        if (!r && this.hooks.onIdle) this.hooks.onIdle();
      }
    }

    _loop(ts) {
      this._raf = requestAnimationFrame(this._loop);
      this.frameTime = ts || performance.now();
      this.frameNo++;
      const waiters = this._frameWaiters; this._frameWaiters = [];
      if (this._keyPending.length) {
        const now = performance.now();
        const due = this._keyPending.filter(p => p.due <= now + 1);
        this._keyPending = this._keyPending.filter(p => p.due > now + 1);
        due.forEach(p => {
          if (p.gen === this.gen && (p.force || this._keyHeld(p.want))) this._spawn(p.h, false, { keyWant: p.want, cycle: p.cycle, clock: this.frameTime, startTime: now, startFrame: this.frameNo });
        });
        if (due.length) this._updateRunning();
      }
      const anim = this.state.props && this.state.props.some(p => !p.gone);
      if (this._running || this._dirty > 0 || anim) {
        this.stage.render();
        if (this._dirty > 0) this._dirty--;
      }
      if (this._running && this.hooks.onFrame) this.hooks.onFrame();
      waiters.forEach(r => r());
    }

    destroy() { cancelAnimationFrame(this._raf); this.stopAll(true); }

    // ---------- nilai isian ----------
    _in(b, name, th) {
      const inp = b.inputs && b.inputs[name];
      if (!inp) return '';
      const blk = inp.block || inp.shadow;
      if (!blk) return '';
      return this._eval(blk, th);
    }
    _num(b, name, th) { return toNum(this._in(b, name, th)); }
    _bool(b, name, th) {
      const inp = b.inputs && b.inputs[name];
      if (!inp || !(inp.block || inp.shadow)) return false;
      return toBool(this._eval(inp.block || inp.shadow, th));
    }
    _f(b, name) { const f = b.fields && b.fields[name]; return f && typeof f === 'object' ? f.id : f; }

    _eval(b, th) {
      const sp = th.sprite;
      switch (b.type) {
        case 'a_num': return toNum(b.fields && b.fields.NUM);
        case 'a_text': return b.fields ? (b.fields.TEXT == null ? '' : b.fields.TEXT) : '';
        case 'a_x': return round6(sp.x);
        case 'a_y': return round6(sp.y);
        case 'a_dir': return Stage.normDir(sp.dir);
        case 'a_answer': return this.answer;
        case 'a_mouse_down': return this.stage.mouse.down;
        case 'a_mouse_x': return this.stage.mouse.x;
        case 'a_mouse_y': return this.stage.mouse.y;
        case 'a_timer': return Math.round((performance.now() - this.timerStart) / 100) / 10;
        case 'a_touching': return this._touching(sp, this._f(b, 'TARGET'));
        case 'a_key_pressed': {
          const k = this._f(b, 'KEY');
          return k === 'apa' ? this.keys.size > 0 : this.keys.has(k);
        }
        case 'a_arith': {
          const a = this._num(b, 'A', th), c = this._num(b, 'B', th);
          switch (this._f(b, 'OP')) {
            case '+': return a + c; case '-': return a - c; case '*': return a * c;
            case '/': return c === 0 ? (a === 0 ? 0 : Infinity * Math.sign(a)) : a / c;
          }
          return 0;
        }
        case 'a_random': {
          let lo = this._num(b, 'A', th), hi = this._num(b, 'B', th);
          if (lo > hi) { const t = lo; lo = hi; hi = t; }
          if (Number.isInteger(lo) && Number.isInteger(hi)) return lo + Math.floor(Math.random() * (hi - lo + 1));
          return lo + Math.random() * (hi - lo);
        }
        case 'a_compare': {
          const r = compare(this._in(b, 'A', th), this._in(b, 'B', th));
          switch (this._f(b, 'OP')) { case '>': return r > 0; case '<': return r < 0; default: return r === 0; }
        }
        case 'a_and': return this._bool(b, 'A', th) && this._bool(b, 'B', th);
        case 'a_or': return this._bool(b, 'A', th) || this._bool(b, 'B', th);
        case 'a_not': return !this._bool(b, 'A', th);
        case 'a_join': return toStr(this._in(b, 'A', th)) + toStr(this._in(b, 'B', th));
        case 'a_mod': {
          const a = this._num(b, 'A', th), n = this._num(b, 'B', th);
          if (n === 0) return NaN;
          const r = a % n; return r !== 0 && (r < 0) !== (n < 0) ? r + n : r;
        }
        case 'a_round': return Math.round(this._num(b, 'A', th));
        case 'a_var_get': { const v = this.state.variables[this._f(b, 'VAR')]; return v ? v.value : 0; }
        default: return '';
      }
    }

    // ---------- menjalankan satu blok ----------
    async _exec(b, th) {
      const sp = th.sprite;
      const px = sp.x, py = sp.y;
      await this._execInner(b, th);
      // catat garis pena per perintah gerak (bukan per frame animasi) — dipakai pemeriksa misi
      if (sp.penDown && MOTION[b.type] && (sp.x !== px || sp.y !== py)) this.log.penLines.push([round1(px), round1(py), round1(sp.x), round1(sp.y)]);
    }

    async _execInner(b, th) {
      const sp = th.sprite;
      const sub = (name) => b.inputs && b.inputs[name] && b.inputs[name].block;
      switch (b.type) {
        // Gerak
        case 'a_move': {
          const n = this._num(b, 'STEPS', th);
          if (this._smoothKey(th, n, KEY_SMOOTH_MAX)) await this._keyGlideOps(sp, [{ k: 'move', n }], th);
          else await this._moveSteps(sp, n, th);
          break;
        }
        case 'a_turn_right': case 'a_turn_left': {
          const d = this._num(b, 'DEG', th) * (b.type === 'a_turn_left' ? -1 : 1);
          if (this._smoothKey(th, d, KEY_TURN_MAX)) await this._keyGlideOps(sp, [{ k: 'turn', n: d }], th);
          else await this._turn(sp, d, th);
          break;
        }
        case 'a_point_dir': sp.dir = Number(this._f(b, 'DIR')); break;
        case 'a_point_deg': sp.dir = Stage.normDir(this._num(b, 'DEG', th)); break;
        case 'a_goto_xy': this._moveTo(sp, this._num(b, 'X', th), this._num(b, 'Y', th)); break;
        case 'a_goto': {
          const t = this._f(b, 'TARGET');
          if (t === '_random_') this._moveTo(sp, rand(-220, 220), rand(-160, 160));
          else if (t === '_mouse_') this._moveTo(sp, this.stage.mouse.x, this.stage.mouse.y);
          else { const o = this._sprite(t); if (o) this._moveTo(sp, o.x, o.y); }
          break;
        }
        case 'a_glide_xy': await this._glide(sp, this._num(b, 'SECS', th), this._num(b, 'X', th), this._num(b, 'Y', th), th); break;
        case 'a_change_x': {
          const n = this._num(b, 'DX', th);
          if (this._smoothKey(th, n, KEY_SMOOTH_MAX)) await this._keyGlideOps(sp, [{ k: 'dx', n }], th); else this._moveTo(sp, sp.x + n, sp.y);
          break;
        }
        case 'a_set_x': this._moveTo(sp, this._num(b, 'X', th), sp.y); break;
        case 'a_change_y': {
          const n = this._num(b, 'DY', th);
          if (this._smoothKey(th, n, KEY_SMOOTH_MAX)) await this._keyGlideOps(sp, [{ k: 'dy', n }], th); else this._moveTo(sp, sp.x, sp.y + n);
          break;
        }
        case 'a_set_y': this._moveTo(sp, sp.x, this._num(b, 'Y', th)); break;
        case 'a_bounce': this._bounce(sp); break;
        case 'a_rotstyle': sp.rot = this._f(b, 'STYLE'); break;

        // Tampilan
        case 'a_say_secs': case 'a_think_secs': {
          const bub = { text: fmtVal(this._in(b, 'TEXT', th)), type: b.type === 'a_think_secs' ? 'think' : 'say' };
          sp.bubble = bub; this.log.said.push(bub.text); this.log.saidBy.push({ id: sp.id, text: bub.text, t: performance.now() });
          await this._sleep(this._num(b, 'SECS', th) * 1000, th);
          if (sp.bubble === bub) sp.bubble = null;
          break;
        }
        case 'a_say': case 'a_think': {
          const text = fmtVal(this._in(b, 'TEXT', th));
          sp.bubble = text === '' ? null : { text, type: b.type === 'a_think' ? 'think' : 'say' };
          if (text !== '') { this.log.said.push(text); this.log.saidBy.push({ id: sp.id, text, t: performance.now() }); }
          break;
        }
        case 'a_next_costume': {
          const names = Assets().costumeNames(sp.asset);
          const i = names.indexOf(sp.costume);
          sp.costume = names[(i + 1) % names.length];
          this.log.costumeChanges++;
          break;
        }
        case 'a_set_costume': {
          const c = this._f(b, 'COSTUME');
          if (Assets().costumeNames(sp.asset).includes(c)) { if (sp.costume !== c) this.log.costumeChanges++; sp.costume = c; }
          break;
        }
        case 'a_set_backdrop': this.state.backdrop = this._f(b, 'BACKDROP'); if (this.project) this.project.backdrop = this.state.backdrop; break;
        case 'a_change_size': sp.size = clamp(sp.size + this._num(b, 'N', th), 5, 500); break;
        case 'a_set_size': sp.size = clamp(this._num(b, 'N', th), 5, 500); break;
        case 'a_show': sp.visible = true; break;
        case 'a_hide': sp.visible = false; break;
        case 'a_front': sp.layer = ++this.maxLayer; break;

        // Suara
        case 'a_play_sound': Sound().play(this._f(b, 'SOUND')); this.log.sounds++; break;
        case 'a_play_sound_wait': { const s = Sound().play(this._f(b, 'SOUND')); this.log.sounds++; await this._sleep(s * 1000, th); break; }
        case 'a_play_note': {
          const secs = Math.max(0, this._num(b, 'SECS', th));
          const n = this._f(b, 'NOTE');
          Sound().note(n, secs); this.log.notes.push(n);
          await this._sleep(secs * 1000, th);
          break;
        }
        case 'a_stop_sounds': Sound().stopAll(); break;

        // Kendali
        case 'a_wait': await this._sleep(Math.max(0, this._num(b, 'SECS', th)) * 1000, th); break;
        case 'a_repeat': {
          const n = Math.round(this._num(b, 'TIMES', th));
          th.loopDepth++;
          try { for (let i = 0; i < n; i++) { await this._stack(sub('DO'), th); await this._yield(th); } } finally { th.loopDepth--; }
          break;
        }
        case 'a_forever':
          th.loopDepth++;
          for (;;) { await this._stack(sub('DO'), th); await this._yield(th); }
        case 'a_if': if (this._bool(b, 'COND', th)) await this._stack(sub('DO'), th); break;
        case 'a_if_else': await this._stack(this._bool(b, 'COND', th) ? sub('DO') : sub('ELSE'), th); break;
        case 'a_wait_until': while (!this._bool(b, 'COND', th)) await this._yield(th); break;
        case 'a_repeat_until':
          th.loopDepth++;
          try { while (!this._bool(b, 'COND', th)) { await this._stack(sub('DO'), th); await this._yield(th); } } finally { th.loopDepth--; }
          break;
        case 'a_stop':
          if (this._f(b, 'WHAT') === 'all') { this.log.stopped = { by: sp.id, t: performance.now() }; this.stopAll(); }
          throw STOP;

        // Kejadian
        case 'a_broadcast': this._broadcast(this._f(b, 'MSG')); break;
        case 'a_broadcast_wait': {
          const ths = this._broadcast(this._f(b, 'MSG'));
          await Promise.all(ths.map(t => t.promise));
          this._alive(th);
          break;
        }

        // Sensor
        case 'a_ask': {
          const q = toStr(this._in(b, 'TEXT', th));
          this.log.asked.push(q);
          const prev = sp.bubble;
          if (sp.visible && q) sp.bubble = { text: q, type: 'say' };
          this._dirty = 3;
          const ans = await this.stage.ask(q);
          if (sp.bubble && sp.bubble.text === q) sp.bubble = prev && prev.text !== q ? prev : null;
          this._alive(th);
          if (ans == null) throw STOP;
          this.answer = ans;
          this.log.answers.push(ans);
          break;
        }
        case 'a_reset_timer': this.timerStart = performance.now(); break;

        // Variabel
        case 'a_var_set': { const v = this.state.variables[this._f(b, 'VAR')]; if (v) v.value = numIfNum(this._in(b, 'VALUE', th)); break; }
        case 'a_var_change': { const v = this.state.variables[this._f(b, 'VAR')]; if (v) v.value = round6(toNum(v.value) + this._num(b, 'N', th)); break; }
        case 'a_var_show': { const v = this.state.variables[this._f(b, 'VAR')]; if (v) v.visible = true; break; }
        case 'a_var_hide': { const v = this.state.variables[this._f(b, 'VAR')]; if (v) v.visible = false; break; }

        // Pena
        case 'a_pen_down':
          sp.penDown = true;
          this.stage.penDot(sp.x, sp.y, sp.penColor, sp.penSize);
          this.log.penPath.push([[round1(sp.x), round1(sp.y)]]);
          break;
        case 'a_pen_up': sp.penDown = false; break;
        case 'a_pen_color': sp.penColor = this._f(b, 'COLOR'); break;
        case 'a_pen_size': sp.penSize = clamp(this._num(b, 'N', th), 1, 60); break;
        case 'a_pen_clear': this.stage.penClear(); this.log.penPath = []; this.log.penLines = []; this.log.penSegments = 0; break;
        case 'a_stamp': this.stage.stamp(sp); break;
        default: break;
      }
    }

    _broadcast(msg) {
      const name = String(msg || '').trim().toLowerCase();
      const out = [];
      this.log.msgs++;
      this._eachHat(h => {
        if (h.block.type === 'a_when_msg' && String((h.block.fields && h.block.fields.MSG) || '').trim().toLowerCase() === name) {
          const t = this._spawn(h, true); if (t) out.push(t);
        }
      });
      this._updateRunning();
      return out;
    }

    // ---------- gerak ----------
    // gerak di skrip tombol (bukan di dalam perulangan) dibuat meluncur mulus
    _smoothKey(th, amount, max) { return !!th.keyWant && th.loopDepth === 0 && Math.abs(amount) <= max && amount !== 0; }

    // kumpulkan blok gerak/putar berurutan (nilainya dihitung sekali di awal)
    _glideRun(b, th) {
      const ops = [], blocks = [];
      let x = b;
      while (x && (x.enabled === false || GLIDE[x.type])) {
        if (x.enabled !== false) {
          let op = null;
          if (x.type === 'a_move') { const n = this._num(x, 'STEPS', th); if (Math.abs(n) <= KEY_SMOOTH_MAX) op = { k: 'move', n }; }
          else if (x.type === 'a_change_x') { const n = this._num(x, 'DX', th); if (Math.abs(n) <= KEY_SMOOTH_MAX) op = { k: 'dx', n }; }
          else if (x.type === 'a_change_y') { const n = this._num(x, 'DY', th); if (Math.abs(n) <= KEY_SMOOTH_MAX) op = { k: 'dy', n }; }
          else { const d = this._num(x, 'DEG', th) * (x.type === 'a_turn_left' ? -1 : 1); if (Math.abs(d) <= KEY_TURN_MAX) op = { k: 'turn', n: d }; }
          if (!op) break;
          ops.push(op); blocks.push(x);
        }
        x = x.next && x.next.block;
      }
      return ops.length ? { ops, blocks, next: x } : null;
    }

    // Menjalankan beberapa gerak/putar sekaligus selama satu putaran tombol, dibagi rata per frame.
    // Contoh "maju 10 + putar kanan 15": tiap frame maju sedikit DAN berputar sedikit → melengkung mulus.
    // Memakai selisih (bukan posisi akhir) agar dua tombol bersamaan (mis. kanan + atas) bisa digabung.
    async _keyGlideOps(sp, ops, th) {
      const t0 = th.clock;
      const dur = keyDur(th.cycle);
      th.glided = true;
      let done = 0;
      outer: for (;;) {
        // hitung dulu bagian yang sudah "jatuh tempo" di frame ini, baru menunggu frame berikutnya
        const f = Math.min(1, Math.max(0, (this.frameTime - t0) / dur));
        const step = f - done;
        if (step > 0) {
          done = f;
          for (const op of ops) {
            if (op.k === 'turn') { sp.dir += op.n * step; continue; }
            let dx = 0, dy = 0;
            if (op.k === 'move') { const rad = (90 - sp.dir) * Math.PI / 180; dx = op.n * step * Math.cos(rad); dy = op.n * step * Math.sin(rad); }
            else if (op.k === 'dx') dx = op.n * step;
            else dy = op.n * step;
            if (!this._moveTo(sp, sp.x + dx, sp.y + dy)) break outer;
          }
        }
        if (f >= 1) break;
        await this._yield(th);
      }
      if (ops.some(o => o.k === 'turn')) {
        sp.dir = Stage.normDir(round6(sp.dir)); // buang sisa pecahan, mis. 104,9999999 → 105
        this.log.turns += ops.filter(o => o.k === 'turn').length;
      }
      th.clock = t0 + dur;
    }

    async _moveSteps(sp, steps, th) {
      const rad = (90 - sp.dir) * Math.PI / 180;
      const tx = sp.x + steps * Math.cos(rad), ty = sp.y + steps * Math.sin(rad);
      if (this.animate && Math.abs(steps) > 2) {
        const dur = Math.min(1600, Math.abs(steps) * 4.2);
        await this._animateTo(sp, tx, ty, dur, th);
      } else this._moveTo(sp, tx, ty);
    }

    async _turn(sp, deg, th) {
      this.log.turns++;
      if (this.animate && Math.abs(deg) >= 10) {
        const from = sp.dir, dur = Math.min(700, Math.abs(deg) * 3);
        const t0 = performance.now();
        for (;;) {
          const t = Math.min(1, (performance.now() - t0) / dur);
          sp.dir = from + deg * ease(t);
          if (t >= 1) break;
          await this._yield(th);
        }
      }
      sp.dir = Stage.normDir(sp.dir + (this.animate && Math.abs(deg) >= 10 ? 0 : deg));
    }

    async _animateTo(sp, tx, ty, dur, th) {
      const fx = sp.x, fy = sp.y, t0 = performance.now();
      for (;;) {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const ok = this._moveTo(sp, fx + (tx - fx) * t, fy + (ty - fy) * t);
        if (!ok || t >= 1) break;
        await this._yield(th);
      }
    }

    async _glide(sp, secs, tx, ty, th) {
      const fx = sp.x, fy = sp.y, dur = Math.max(0, secs) * 1000, t0 = performance.now();
      if (dur <= 0) { this._moveTo(sp, tx, ty); return; }
      for (;;) {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const ok = this._moveTo(sp, fx + (tx - fx) * t, fy + (ty - fy) * t);
        if (!ok || t >= 1) break;
        await this._yield(th);
      }
    }

    // memindahkan tokoh + menggambar pena + cek benda misi. Mengembalikan false bila menabrak.
    _moveTo(sp, nx, ny) {
      const e = Stage.extent(sp);
      // pagar: tokoh tidak boleh hilang seluruhnya dari panggung
      nx = clamp(nx, -240 - e.ex + 15, 240 + e.ex - 15);
      ny = clamp(ny, -180 - e.ey + 15, 180 + e.ey - 15);
      const ox = sp.x, oy = sp.y;
      let ok = true;
      if (this.state.props.length && sp.id === this.heroId) {
        const dist = Math.hypot(nx - ox, ny - oy);
        const n = Math.max(1, Math.ceil(dist / 6));
        for (let i = 1; i <= n; i++) {
          const px = ox + (nx - ox) * i / n, py = oy + (ny - oy) * i / n;
          if (!this._checkProps(sp, px, py)) {
            const j = Math.max(0, i - 1);
            nx = ox + (nx - ox) * j / n; ny = oy + (ny - oy) * j / n;
            ok = false; break;
          }
        }
      }
      sp.x = round6(nx); sp.y = round6(ny);
      if (oy < -110 && sp.y > 110) this.log.topResets[sp.id] = (this.log.topResets[sp.id] || 0) + 1;
      this.log.moved += Math.hypot(sp.x - ox, sp.y - oy);
      if (sp.penDown && (sp.x !== ox || sp.y !== oy)) {
        this.stage.penLine(ox, oy, sp.x, sp.y, sp.penColor, sp.penSize);
        this.log.penSegments++;
        const path = this.log.penPath[this.log.penPath.length - 1];
        if (path) path.push([round1(sp.x), round1(sp.y)]);
      }
      this._dirty = 2;
      return ok;
    }

    _checkProps(sp, px, py) {
      const e = Stage.extent(sp);
      const r = Math.min(e.hw, e.hh) * 0.62;
      for (const p of this.state.props) {
        if (p.gone || p.fadeAt) continue;
        const pr = (p.r || 20) * (p.size || 80) / 80;
        const d = Math.hypot(px - p.x, py - p.y);
        if (p.kind === 'star' || p.kind === 'apple') {
          if (d < r + pr) {
            p.fadeAt = performance.now();
            this.log.stars++;
            Sound().play('ding');
            if (this.hooks.onStar) this.hooks.onStar(p);
          }
        } else if (p.kind === 'flag') {
          if (d < r + pr) this.log.flag = true;
        } else if (p.kind === 'rock' || p.kind === 'wall') {
          if (Math.abs(px - p.x) < r + pr * 0.85 && Math.abs(py - p.y) < r + pr * 0.85) {
            this.log.crash = p;
            Sound().play('salah');
            if (this.hooks.onCrash) this.hooks.onCrash(p);
            return false;
          }
        }
      }
      return true;
    }

    _bounce(sp) {
      const e = Stage.extent(sp);
      const rad = (90 - sp.dir) * Math.PI / 180;
      let dx = Math.cos(rad), dy = Math.sin(rad);
      let hit = false;
      if (sp.x - e.ex < -240) { dx = Math.abs(dx); sp.x = -240 + e.ex; hit = true; }
      if (sp.x + e.ex > 240) { dx = -Math.abs(dx); sp.x = 240 - e.ex; hit = true; }
      if (sp.y - e.ey < -180) { dy = Math.abs(dy); sp.y = -180 + e.ey; hit = true; }
      if (sp.y + e.ey > 180) { dy = -Math.abs(dy); sp.y = 180 - e.ey; hit = true; }
      if (hit) {
        sp.dir = Stage.normDir(90 - Math.atan2(dy, dx) * 180 / Math.PI);
        this.log.edgeBounces++;
      }
    }

    _touching(sp, target) {
      if (!sp.visible) return false;
      const e = Stage.extent(sp);
      if (target === '_edge_') {
        const t = sp.x - e.ex * 0.9 < -240 || sp.x + e.ex * 0.9 > 240 || sp.y - e.ey * 0.9 < -180 || sp.y + e.ey * 0.9 > 180;
        if (t) this.log.edgeTouch = (this.log.edgeTouch || 0) + 1;
        return t;
      }
      if (target === '_mouse_') return this.stage.containsPoint(sp, this.stage.mouse.x, this.stage.mouse.y);
      const o = this._sprite(target);
      if (!o || !o.visible) return false;
      const f = Stage.extent(o);
      return Math.abs(sp.x - o.x) < (e.ex + f.ex) * 0.78 && Math.abs(sp.y - o.y) < (e.ey + f.ey) * 0.78;
    }
  }

  // ---------- analisis susunan blok (untuk misi & guru) ----------
  function walk(b, fn) {
    if (!b) return;
    fn(b);
    if (b.inputs) Object.keys(b.inputs).forEach(k => walk(b.inputs[k].block, fn));
    if (b.next) walk(b.next.block, fn);
  }
  Runtime.analyze = function (blocksJson) {
    const tops = (blocksJson && blocksJson.blocks) || [];
    let count = 0, orphans = 0;
    const types = {};
    tops.forEach(t => {
      if (HATS[t.type]) walk(t, b => { count++; types[b.type] = (types[b.type] || 0) + 1; });
      else walk(t, () => { orphans++; });
    });
    return { count, orphans, types };
  };
  // jumlah blok semua tokoh sekaligus (misi dengan beberapa tokoh)
  Runtime.analyzeAll = function (sprites) {
    const out = { count: 0, orphans: 0, types: {}, per: {} };
    (sprites || []).forEach(sp => {
      const a = Runtime.analyze(sp.blocks);
      out.count += a.count; out.orphans += a.orphans; out.per[sp.id] = a;
      Object.keys(a.types).forEach(t => { out.types[t] = (out.types[t] || 0) + a.types[t]; });
    });
    return out;
  };
  Runtime.walk = walk;
  Runtime.HATS = HATS;

  // ---------- pembantu nilai ----------
  function toNum(v) {
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    const s = String(v == null ? '' : v).trim().replace(',', '.');
    if (s === '') return 0;
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }
  function numIfNum(v) {
    if (typeof v === 'number') return v;
    const s = String(v).trim();
    if (s !== '' && !isNaN(Number(s.replace(',', '.')))) return Number(s.replace(',', '.'));
    return v;
  }
  function toStr(v) { return typeof v === 'number' ? Stage.fmt(v) : (typeof v === 'boolean' ? (v ? 'benar' : 'salah') : String(v == null ? '' : v)); }
  function fmtVal(v) { return toStr(v); }
  function toBool(v) {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    const s = String(v).trim().toLowerCase();
    return !(s === '' || s === '0' || s === 'false' || s === 'salah');
  }
  function compare(a, b) {
    const sa = String(a).trim().replace(',', '.'), sb = String(b).trim().replace(',', '.');
    const na = Number(sa), nb = Number(sb);
    if (sa !== '' && sb !== '' && !isNaN(na) && !isNaN(nb)) return na === nb ? 0 : (na > nb ? 1 : -1);
    const la = String(a).trim().toLowerCase(), lb = String(b).trim().toLowerCase();
    return la === lb ? 0 : (la > lb ? 1 : -1);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function round6(v) { return Math.round(v * 1e6) / 1e6; }
  function round1(v) { return Math.round(v * 10) / 10; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  Runtime.util = { toNum, toStr, toBool, compare };
  global.AlgoRuntime = Runtime;
})(window);
