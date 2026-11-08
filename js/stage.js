/* =========================================================
   ALGO — Panggung (menggambar tokoh, latar, pena, gelembung)
   Koordinat panggung: tengah = (0,0), x ke kanan, y ke atas.
   Lebar 480 (x: -240..240), tinggi 360 (y: -180..180).
   ========================================================= */
(function (global) {
  'use strict';
  const W = 480, H = 360;
  const A = () => global.AlgoAssets;

  class Stage {
    constructor(host) {
      this.host = host;
      this.wrap = document.createElement('div');
      this.wrap.className = 'stage-wrap';
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'stage-canvas';
      this.canvas.setAttribute('aria-label', 'Panggung Algo');
      this.wrap.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      // lapisan pena (resolusi 2x supaya garis halus)
      this.pen = document.createElement('canvas');
      this.pen.width = W * 2; this.pen.height = H * 2;
      this.penCtx = this.pen.getContext('2d');
      this.penCtx.lineCap = 'round';
      this.penCtx.lineJoin = 'round';

      // kotak tanya-jawab
      this.askBox = document.createElement('form');
      this.askBox.className = 'ask-box hidden';
      this.askBox.innerHTML = '<div class="ask-q"></div><div class="ask-row"><input type="text" autocomplete="off" aria-label="Jawaban"><button type="submit" class="btn btn-primary btn-sm">Kirim ✓</button></div>';
      this.wrap.appendChild(this.askBox);

      // tombol panah di layar (untuk HP)
      this.pad = document.createElement('div');
      this.pad.className = 'key-pad hidden';
      this.pad.innerHTML =
        '<button type="button" data-k="atas" aria-label="Panah atas">▲</button>' +
        '<button type="button" data-k="kiri" aria-label="Panah kiri">◀</button>' +
        '<button type="button" data-k="spasi" class="kp-space" aria-label="Spasi">spasi</button>' +
        '<button type="button" data-k="kanan" aria-label="Panah kanan">▶</button>' +
        '<button type="button" data-k="bawah" aria-label="Panah bawah">▼</button>';
      this.wrap.appendChild(this.pad);

      host.appendChild(this.wrap);

      this.state = null;          // diisi oleh Runtime
      this.showDirection = false; // panah arah kecil (mode misi)
      this.editable = true;       // tokoh boleh digeser dengan jari/mouse
      this.mouse = { x: 0, y: 0, down: false };
      this.onSpriteClick = null;  // (spriteId) => void
      this.onSpriteDragEnd = null;
      this.onKey = null;          // (key, down) => void
      this.isRunning = () => false;
      this._drag = null;
      this.scale = 1;

      this._bindPointer();
      this._bindPad();
      this._resizeObs = new ResizeObserver(() => this.resize());
      this._resizeObs.observe(this.wrap);
      this.resize();
    }

    resize() {
      const r = this.wrap.getBoundingClientRect();
      const cssW = Math.max(120, r.width);
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      this.scale = cssW / W;
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssW * 0.75 * dpr);
      this.pxScale = this.canvas.width / W;
      this.render();
    }

    // ---------- konversi koordinat ----------
    toStage(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect();
      const x = (clientX - r.left) / r.width * W - W / 2;
      const y = H / 2 - (clientY - r.top) / r.height * H;
      return { x: Math.round(x), y: Math.round(y) };
    }

    // ---------- ukuran & tabrakan ----------
    static extent(sp) {
      const a = A().SPRITES[sp.asset] || A().SPRITES.algo;
      const s = (sp.size || 100) / 100;
      const hw = a.w / 2 * s, hh = a.h / 2 * s;
      if (sp.rot === 'all') {
        const rad = (sp.dir - 90) * Math.PI / 180;
        const c = Math.abs(Math.cos(rad)), si = Math.abs(Math.sin(rad));
        return { ex: hw * c + hh * si, ey: hw * si + hh * c, hw, hh };
      }
      return { ex: hw, ey: hh, hw, hh };
    }

    containsPoint(sp, px, py) {
      if (!sp.visible) return false;
      const e = Stage.extent(sp);
      let dx = px - sp.x, dy = py - sp.y;
      if (sp.rot === 'all') {
        const rad = -(sp.dir - 90) * Math.PI / 180; // putar balik
        const rx = dx * Math.cos(rad) + dy * Math.sin(rad);
        const ry = -dx * Math.sin(rad) + dy * Math.cos(rad);
        dx = rx; dy = ry;
      }
      return Math.abs(dx) <= e.hw * 0.9 && Math.abs(dy) <= e.hh * 0.9;
    }

    spriteAt(px, py) {
      if (!this.state) return null;
      const list = this.state.sprites.slice().sort((a, b) => b.layer - a.layer);
      return list.find(sp => this.containsPoint(sp, px, py)) || null;
    }

    // ---------- pena ----------
    penLine(x1, y1, x2, y2, color, size) {
      const c = this.penCtx;
      c.strokeStyle = color; c.lineWidth = Math.max(1, size) * 2;
      c.beginPath();
      c.moveTo((x1 + W / 2) * 2, (H / 2 - y1) * 2);
      c.lineTo((x2 + W / 2) * 2, (H / 2 - y2) * 2);
      c.stroke();
    }
    penDot(x, y, color, size) {
      const c = this.penCtx;
      c.fillStyle = color;
      c.beginPath();
      c.arc((x + W / 2) * 2, (H / 2 - y) * 2, Math.max(1, size), 0, Math.PI * 2);
      c.fill();
    }
    penClear() { this.penCtx.clearRect(0, 0, W * 2, H * 2); }
    stamp(sp) {
      const c = this.penCtx;
      c.save(); c.scale(2, 2);
      this._drawSprite(c, sp, 1);
      c.restore();
    }

    // ---------- menggambar ----------
    render() {
      const ctx = this.ctx;
      const k = this.pxScale || 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      const st = this.state;
      // latar
      const bg = A().image(A().backdropUrl(st ? st.backdrop : 'polos'));
      if (bg.complete && bg.naturalWidth) ctx.drawImage(bg, 0, 0, W, H);
      else { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); }
      // coretan pena
      ctx.drawImage(this.pen, 0, 0, W, H);
      if (!st) return;
      const now = performance.now();
      // benda misi (bintang, batu, bendera)
      (st.props || []).forEach(p => {
        if (p.gone) return;
        let alpha = 1, grow = 1;
        if (p.fadeAt) {
          const t = (now - p.fadeAt) / 350;
          if (t >= 1) { p.gone = true; return; }
          alpha = 1 - t; grow = 1 + t * 0.6;
        } else if (p.kind === 'star') {
          grow = 1 + Math.sin(now / 300 + p.x) * 0.05;
        }
        const asset = { star: 'bintang', rock: 'batu', flag: 'bendera', wall: 'dinding', apple: 'apel' }[p.kind] || 'bintang';
        this._drawSprite(ctx, { asset, costume: 0, x: p.x, y: p.y, dir: 90, size: (p.size || 80) * grow, visible: true, rot: 'none' }, alpha);
      });
      // tokoh
      const sprites = st.sprites.slice().sort((a, b) => a.layer - b.layer);
      sprites.forEach(sp => { if (sp.visible) this._drawSprite(ctx, sp, 1); });
      if (this.showDirection) sprites.forEach(sp => { if (sp.visible) this._drawDir(ctx, sp); });
      // gelembung bicara
      sprites.forEach(sp => { if (sp.visible && sp.bubble && sp.bubble.text !== '') this._drawBubble(ctx, sp); });
      // tampilan variabel
      this._drawMonitors(ctx, st);
    }

    _drawSprite(ctx, sp, alpha) {
      const a = A().SPRITES[sp.asset] || A().SPRITES.algo;
      const img = A().image(A().costumeUrl(sp.asset, sp.costume));
      if (!(img.complete && img.naturalWidth)) return;
      const s = (sp.size || 100) / 100;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(W / 2 + sp.x, H / 2 - sp.y);
      if (sp.rot === 'all') ctx.rotate((sp.dir - 90) * Math.PI / 180);
      else if (sp.rot === 'lr' && normDir(sp.dir) < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -a.w * s / 2, -a.h * s / 2, a.w * s, a.h * s);
      ctx.restore();
    }

    _drawDir(ctx, sp) {
      const rad = (90 - sp.dir) * Math.PI / 180;
      const e = Stage.extent(sp);
      const len = Math.max(e.hw, e.hh) + 12;
      const cx = W / 2 + sp.x, cy = H / 2 - sp.y;
      const tx = cx + Math.cos(rad) * len, ty = cy - Math.sin(rad) * len;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,140,26,.9)'; ctx.fillStyle = 'rgba(255,140,26,.9)';
      ctx.lineWidth = 3; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(rad) * (len - 22), cy - Math.sin(rad) * (len - 22)); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.setLineDash([]);
      ctx.translate(tx, ty); ctx.rotate(-rad);
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    _drawBubble(ctx, sp) {
      const text = String(sp.bubble.text);
      const think = sp.bubble.type === 'think';
      ctx.save();
      ctx.font = '700 13px Nunito, "Segoe UI", Arial, sans-serif';
      const lines = wrap(ctx, text, 150);
      const lh = 17;
      const bw = Math.max(44, Math.min(170, Math.max.apply(null, lines.map(l => ctx.measureText(l).width)) + 20));
      const bh = lines.length * lh + 14;
      const e = Stage.extent(sp);
      let bx = W / 2 + sp.x + e.ex * 0.55;
      let by = H / 2 - sp.y - e.ey - bh - 10;
      let flip = false;
      if (bx + bw > W - 2) { bx = W / 2 + sp.x - e.ex * 0.55 - bw; flip = true; }
      bx = clamp(bx, 2, W - bw - 2);
      by = clamp(by, 2, H - bh - 2);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#B8C0D9'; ctx.lineWidth = 2;
      roundRect(ctx, bx, by, bw, bh, 12); ctx.fill(); ctx.stroke();
      // ekor gelembung
      const tx = flip ? bx + bw - 18 : bx + 18;
      if (think) {
        [[0, 8, 5], [flip ? 6 : -6, 17, 3]].forEach(([dx, dy, r]) => {
          ctx.beginPath(); ctx.arc(tx + dx, by + bh + dy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
      } else {
        ctx.beginPath();
        ctx.moveTo(tx - 7, by + bh - 1); ctx.lineTo(tx + (flip ? 8 : -8), by + bh + 11); ctx.lineTo(tx + 7, by + bh - 1);
        ctx.fill(); ctx.stroke();
        ctx.fillRect(tx - 6, by + bh - 3, 12, 3);
      }
      ctx.fillStyle = '#1F2544';
      ctx.textBaseline = 'top';
      lines.forEach((l, i) => ctx.fillText(l, bx + 10, by + 8 + i * lh));
      ctx.restore();
    }

    _drawMonitors(ctx, st) {
      const vars = st.variables ? Object.values(st.variables).filter(v => v.visible) : [];
      let y = 6;
      ctx.save();
      ctx.font = '700 12px Nunito, "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'middle';
      vars.forEach(v => {
        const label = v.name;
        const val = fmt(v.value);
        const lw = ctx.measureText(label).width;
        const vw = Math.max(26, ctx.measureText(val).width + 14);
        const w = lw + vw + 22;
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = '#D5DBEE'; ctx.lineWidth = 1.5;
        roundRect(ctx, 6, y, w, 24, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3A4166'; ctx.fillText(label, 13, y + 12.5);
        ctx.fillStyle = '#FF8C1A';
        roundRect(ctx, 13 + lw + 6, y + 3, vw, 18, 9); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText(val, 13 + lw + 6 + vw / 2, y + 12.5);
        ctx.textAlign = 'left';
        y += 30;
      });
      ctx.restore();
    }

    // ---------- tanya jawab ----------
    ask(question) {
      return new Promise(resolve => {
        const box = this.askBox;
        box.querySelector('.ask-q').textContent = question || '';
        box.querySelector('.ask-q').style.display = question ? '' : 'none';
        const inp = box.querySelector('input');
        inp.value = '';
        box.classList.remove('hidden');
        setTimeout(() => inp.focus(), 30);
        const done = (val) => {
          box.classList.add('hidden');
          box.onsubmit = null;
          this._askCancel = null;
          resolve(val);
        };
        box.onsubmit = (e) => { e.preventDefault(); done(inp.value); };
        this._askCancel = () => done(null);
      });
    }
    cancelAsk() { if (this._askCancel) this._askCancel(); }

    showPad(show) {
      // tombol panah di layar hanya untuk layar sentuh / layar kecil; di laptop pakai keyboard
      const touch = (global.matchMedia && global.matchMedia('(pointer: coarse)').matches) || global.innerWidth < 860;
      this.pad.classList.toggle('hidden', !(show && touch));
    }

    // ---------- interaksi pointer ----------
    _bindPointer() {
      const cv = this.canvas;
      cv.addEventListener('pointerdown', (e) => {
        const p = this.toStage(e.clientX, e.clientY);
        this.mouse.x = p.x; this.mouse.y = p.y; this.mouse.down = true;
        const sp = this.spriteAt(p.x, p.y);
        if (sp) {
          this._drag = { sp, ox: sp.x - p.x, oy: sp.y - p.y, moved: false, startX: e.clientX, startY: e.clientY };
          cv.setPointerCapture(e.pointerId);
        }
      });
      cv.addEventListener('pointermove', (e) => {
        const p = this.toStage(e.clientX, e.clientY);
        this.mouse.x = clamp(p.x, -240, 240); this.mouse.y = clamp(p.y, -180, 180);
        const d = this._drag;
        if (d && this.editable && !this.isRunning()) {
          if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5) return;
          d.moved = true;
          d.sp.x = clamp(Math.round(p.x + d.ox), -240, 240);
          d.sp.y = clamp(Math.round(p.y + d.oy), -180, 180);
          this.render();
        }
      });
      const up = (e) => {
        this.mouse.down = false;
        const d = this._drag; this._drag = null;
        if (!d) return;
        if (d.moved) { if (this.onSpriteDragEnd) this.onSpriteDragEnd(d.sp); }
        else if (this.onSpriteClick) this.onSpriteClick(d.sp.id);
      };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', () => { this._drag = null; this.mouse.down = false; });
    }

    _bindPad() {
      this.pad.querySelectorAll('button').forEach(b => {
        const k = b.dataset.k;
        const down = (e) => { e.preventDefault(); b.classList.add('on'); if (this.onKey) this.onKey(k, true); };
        const up = (e) => { e.preventDefault(); b.classList.remove('on'); if (this.onKey) this.onKey(k, false); };
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up);
        b.addEventListener('pointerleave', up);
        b.addEventListener('pointercancel', up);
      });
    }

    destroy() { this._resizeObs.disconnect(); this.wrap.remove(); }
  }

  // ---------- pembantu ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function normDir(d) { let x = ((d + 180) % 360 + 360) % 360 - 180; return x === -180 ? 180 : x; }
  function fmt(v) {
    if (typeof v === 'number') return String(Math.round(v * 1e6) / 1e6);
    return String(v);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function wrap(ctx, text, maxW) {
    const out = [];
    String(text).split('\n').forEach(par => {
      const words = par.split(' ');
      let line = '';
      words.forEach(w => {
        // potong kata yang sangat panjang
        while (ctx.measureText(w).width > maxW && w.length > 1) {
          let i = w.length - 1;
          while (i > 1 && ctx.measureText(w.slice(0, i)).width > maxW) i--;
          if (line) { out.push(line); line = ''; }
          out.push(w.slice(0, i)); w = w.slice(i);
        }
        const t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
      });
      out.push(line);
    });
    return out.slice(0, 8);
  }

  Stage.W = W; Stage.H = H;
  Stage.normDir = normDir;
  Stage.fmt = fmt;
  global.AlgoStage = Stage;
})(window);
