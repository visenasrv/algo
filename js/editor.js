/* =========================================================
   ALGO — Editor (area kode + panggung)
   Mode: 'misi' (belajar bertahap), 'kreasi' (bebas berkarya),
         'lihat' (guru melihat karya siswa, hanya-baca)
   ========================================================= */
(function (global) {
  'use strict';
  // Pustaka blok (Blockly ±640 KB) dimuat saat editor pertama kali dibutuhkan,
  // bukan saat aplikasi dibuka → halaman masuk & beranda tampil lebih cepat.
  let B = global.Blockly || null;
  let AB = global.AlgoBlocks || null;
  const AM = global.AlgoMissions;
  const RT = global.AlgoRuntime;
  const Stage = global.AlgoStage;
  const UI = global.AlgoUI;
  const Assets = global.AlgoAssets;
  const esc = UI.esc;

  const KEYMAP = { ArrowUp: 'atas', ArrowDown: 'bawah', ArrowLeft: 'kiri', ArrowRight: 'kanan', ' ': 'spasi', Spacebar: 'spasi' };
  const MEDIA = 'js/vendor/blockly/media/';
  const LIBS = () => [
    ['Blockly', 'js/vendor/blockly/blockly_compressed.js?v=13.4.0'],
    ['__msg', 'js/vendor/blockly/msg-id.js?v=13.4.0'],
    ['AlgoBlocks', 'js/blocks.js?v=' + (global.ALGO_BUILD || (global.ALGO_CONFIG && global.ALGO_CONFIG.APP_VERSION) || '1')]
  ];
  // perangkat dengan mouse (bukan layar sentuh) → tampilkan tips gulir mouse
  const MOUSE = !!(global.matchMedia && global.matchMedia('(hover: hover) and (pointer: fine)').matches);
  let current = null;
  let _libs = null;
  let _openSeq = 0;

  function libsReady() { return !!(global.Blockly && global.AlgoBlocks); }
  function bindLibs() { B = global.Blockly; AB = global.AlgoBlocks; }
  // unduh ketiganya sekaligus, jalankan berurutan (async=false menjaga urutan)
  function loadLibs() {
    if (libsReady()) { bindLibs(); return Promise.resolve(); }
    if (_libs) return _libs;
    const need = LIBS().filter(l => l[0] === '__msg' ? !global.Blockly : !global[l[0]]);
    _libs = Promise.all(need.map(l => new Promise((res, rej) => {
      const el = document.createElement('script');
      el.src = l[1]; el.async = false;
      el.onload = res; el.onerror = () => { el.remove(); rej(new Error('Gagal memuat ' + l[1])); };
      document.head.appendChild(el);
    }))).then(() => {
      if (!libsReady()) throw new Error('Pustaka blok tidak lengkap');
      bindLibs();
    }).catch(err => { _libs = null; throw err; });
    return _libs;
  }

  // ---------- pembantu proyek ----------
  function cleanProject(p) {
    return {
      v: 1, name: p.name || 'Proyek', backdrop: p.backdrop || 'polos',
      variables: (p.variables || []).map(v => ({ id: v.id, name: v.name })),
      sprites: p.sprites.map(s => ({
        id: s.id, name: s.name, asset: s.asset, costume: s.costume,
        x: Math.round(s.x), y: Math.round(s.y), dir: Math.round(Stage.normDir(s.dir)), size: Math.round(s.size),
        visible: s.visible !== false, rot: s.rot || 'all', layer: s.layer || 1,
        blocks: s.blocks || { languageVersion: 0, blocks: [] }
      }))
    };
  }
  function validProject(p) {
    return p && Array.isArray(p.sprites) && p.sprites.length > 0 && p.sprites.every(s => s && s.id && s.asset);
  }

  class Editor {
    constructor(host, opts) {
      this.host = host;
      this.o = opts;
      this.mode = opts.mode; // misi | kreasi | lihat
      this.readOnly = !!opts.readOnly || opts.mode === 'lihat';
      this.mission = opts.mission || null;
      this.level = localStorage.getItem('algo_level') === 'lengkap' ? 'lengkap' : 'pemula';
      this.dirty = false;
      this.hintShown = 0;
      this.attempts = 0;
      this.won = false;
      this._listeners = [];
      if (this.mission) {
        this.project = AM.missionProject(this.mission, opts.solution);
      } else {
        this.project = JSON.parse(JSON.stringify(opts.project));
      }
      this.currentId = this.project.current && this.project.sprites.some(s => s.id === this.project.current) ? this.project.current : this.project.sprites[0].id;
      this._build();
    }

    // ---------- membangun tampilan ----------
    _build() {
      const m = this.mission, mode = this.mode;
      const el = document.createElement('div');
      el.className = 'editor mode-' + mode + (this.readOnly ? ' readonly' : '');
      let title = '';
      if (mode === 'misi') {
        const bab = AM.BAB.find(b => b.no === m.bab);
        title = `<div class="ed-kicker">Misi ${m.id} · ${esc(bab ? bab.judul : '')}</div><div class="ed-title">${esc(m.ikon)} ${esc(m.judul)}</div>`;
      } else if (mode === 'lihat') {
        title = `<div class="ed-kicker">${esc(this.o.kicker || 'Lihat karya')}</div><div class="ed-title">${esc(this.o.title || this.project.name)}</div>`;
      } else {
        title = `<input class="ed-name" aria-label="Nama proyek" maxlength="60" value="${esc(this.project.name || 'Proyek Baru')}">`;
      }
      el.innerHTML = `
        <header class="ed-head">
          <button type="button" class="icon-btn ed-back" aria-label="Kembali" title="Kembali">←</button>
          <div class="ed-title-wrap">${title}</div>
          <div class="ed-head-actions">
            ${mode === 'kreasi' && !this.readOnly ? `
              <div class="seg seg-level" role="group" aria-label="Jumlah blok">
                <button type="button" data-l="pemula" class="${this.level === 'pemula' ? 'on' : ''}">Pemula</button>
                <button type="button" data-l="lengkap" class="${this.level === 'lengkap' ? 'on' : ''}">Lengkap</button>
              </div>
              <span class="save-state" aria-live="polite"></span>
              <button type="button" class="btn btn-primary btn-sm ed-save">💾 <span>Simpan</span></button>
              ${this.o.tugas ? '<button type="button" class="btn btn-accent btn-sm ed-submit">📤 <span>Kumpulkan</span></button>' : ''}
            ` : ''}
            ${mode === 'misi' && !this.readOnly ? '<button type="button" class="btn btn-ghost btn-sm ed-restart" title="Hapus susunan blok dan mulai misi ini dari awal">↺ <span>Mulai ulang</span></button>' : ''}
            <button type="button" class="icon-btn ed-howto" aria-label="Cara bermain" title="Cara bermain">?</button>
            ${mode === 'kreasi' ? '<button type="button" class="icon-btn ed-menu" aria-label="Menu lainnya" title="Menu lainnya">⋮</button>' : ''}
          </div>
        </header>
        <div class="ed-body">
          <section class="ed-code">
            <div class="ed-blockly"></div>
            ${this.readOnly ? '' : `<div class="ed-undo">
              ${this.mission ? '' : '<button type="button" class="icon-btn sm ed-fly" aria-label="Sembunyikan daftar blok" title="Sembunyikan daftar blok">⇤</button>'}
              <button type="button" class="icon-btn sm" data-u="undo" aria-label="Batalkan" title="Batalkan">↶</button>
              <button type="button" class="icon-btn sm" data-u="redo" aria-label="Ulangi" title="Ulangi">↷</button>
            </div>`}
            <div class="ed-help"><span class="ed-help-ico">💬</span><div class="ed-help-text">${this.readOnly ? 'Mode lihat: kode tidak bisa diubah. Klik blok untuk melihat penjelasannya.' : (MOUSE ? 'Klik blok untuk penjelasannya · seret blok dari kiri ke sini · 🖱️ Gulir ↕ · Shift+gulir ↔ · Ctrl+gulir = zoom' : 'Klik sebuah blok untuk melihat penjelasannya. Seret blok dari kiri ke area ini.')}</div></div>
          </section>
          <aside class="ed-side">
            <div class="ed-run">
              <button type="button" class="run-btn go"><span class="ri">▶</span><span class="rl">Jalankan</span></button>
              <button type="button" class="run-btn stop" aria-label="Berhenti"><span class="ri">■</span><span class="rl">Berhenti</span></button>
              <div class="seg seg-speed" role="group" aria-label="Kecepatan">
                <button type="button" data-m="normal" class="on" title="Kecepatan normal" aria-label="Normal">🐇<span class="sl"> Normal</span></button>
                <button type="button" data-m="pelan" title="Blok menyala satu per satu" aria-label="Pelan">🐢<span class="sl"> Pelan</span></button>
                <button type="button" data-m="langkah" title="Satu klik = satu blok" aria-label="Langkah">👣<span class="sl"> Langkah</span></button>
              </div>
              <button type="button" class="icon-btn ed-full" aria-label="Layar penuh" title="Layar penuh">⛶</button>
            </div>
            <div class="ed-stage-host"></div>
            <div class="ed-status" role="status"></div>
            <div class="ed-panels"></div>
          </aside>
        </div>`;
      this.host.appendChild(el);
      this.el = el;
      this.$ = (s) => el.querySelector(s);

      // panggung & mesin
      this.stage = new Stage(this.$('.ed-stage-host'));
      this.stage.editable = mode === 'kreasi' && !this.readOnly;
      this.stage.showDirection = !!(m && m.showDir);
      this.rt = new RT(this.stage);
      this._loadRuntime();

      this._buildPanels();
      this._inject();
      this._wire();
      this._refreshPad();
      this._updateCount();
      this._restoreDraft();
      if (m && m.tour && !this.readOnly && !localStorage.getItem('algo_tour_done')) {
        setTimeout(() => this.howto(), 400);
        localStorage.setItem('algo_tour_done', '1');
      }
    }

    _loadRuntime() {
      const m = this.mission;
      this.rt.load(this.project, {
        props: m ? (m.props || []) : [],
        heroId: m ? (m.heroId || AM.spritesOf(m)[0].id) : null,
        animate: m ? !!m.animate : false
      });
      this.stage.render();
    }

    _buildPanels() {
      const host = this.$('.ed-panels');
      const m = this.mission;
      if (m) {
        const sol = this.o.solutionInfo;
        const multi = AM.spritesOf(m).length > 1;
        host.innerHTML = `
          ${multi ? `<div class="panel msp-panel">
            <div class="msp-label">Tokoh di misi ini — klik untuk memprogram:</div>
            <div class="sp-list msp-list" role="list" aria-label="Tokoh di misi ini"></div>
          </div>` : ''}
          <div class="panel mission-card ${window.innerWidth < 860 && !this.readOnly ? 'collapsed' : ''}">
            <button type="button" class="mc-head" aria-expanded="true">
              <span class="mc-ico">🎯</span>
              <span class="mc-goal">${esc(m.tujuan)}</span>
              <span class="mc-caret">▾</span>
            </button>
            <div class="mc-body">
              <p class="mc-story">${esc(m.cerita)}</p>
              <div class="mc-meta">
                <span class="chip chip-concept">Konsep: ${esc(m.konsep)}</span>
                <span class="chip">★★★ jika ≤ ${m.optimal} blok</span>
                <span class="chip chip-count">Blok terpakai: <b>0</b></span>
              </div>
              ${sol ? `<div class="mc-solinfo">${sol}</div>` : ''}
              ${this.readOnly ? '' : `<div class="mc-hints">
                <button type="button" class="btn btn-ghost btn-sm hint-btn">💡 Minta petunjuk (${m.petunjuk.length})</button>
                <ol class="hint-list"></ol>
              </div>`}
              <div class="mc-feedback hidden" role="alert"></div>
            </div>
          </div>`;
        if (multi) this._renderSprites();
      } else {
        host.innerHTML = `
          ${this.o.gradePanel ? '<div class="panel grade-panel"></div>' : ''}
          <div class="panel sprite-panel">
            <div class="sp-props"></div>
            <div class="sp-row">
              <div class="sp-list" role="list" aria-label="Daftar tokoh"></div>
              <div class="sp-backdrop">
                <button type="button" class="bd-btn" ${this.readOnly ? 'disabled' : ''} aria-label="Ganti latar">
                  <img alt="" class="bd-img"><span>Latar</span>
                </button>
              </div>
            </div>
          </div>`;
        this._renderSprites();
        if (this.o.gradePanel) this.o.gradePanel(this.$('.grade-panel'), this);
      }
    }

    // ---------- Blockly ----------
    _inject() {
      AB.init();
      AB.ctx.sprites = this.project.sprites;
      AB.ctx.currentId = this.currentId;
      const toolbox = this.mission
        ? AB.flyoutToolbox(this.mission.blok, this.project.variables)
        : AB.categoryToolbox(this.level);
      const small = window.innerWidth < 760;
      this.ws = B.inject(this.$('.ed-blockly'), {
        toolbox: this.readOnly ? null : toolbox,
        readOnly: this.readOnly,
        renderer: 'zelos',
        theme: AB.makeTheme(),
        media: MEDIA,
        trashcan: !this.readOnly,
        sounds: true,
        zoom: { controls: true, wheel: true, startScale: small ? 0.68 : 0.85, maxScale: 2, minScale: 0.35, scaleSpeed: 1.15, pinch: true },
        // gulir mouse = geser naik-turun, Shift + gulir = kiri-kanan, Ctrl (⌘ di Mac) + gulir = perbesar/perkecil
        move: { scrollbars: true, drag: true, wheel: true },
        grid: { spacing: 28, length: 2, colour: '#E1E6F3', snap: false },
        maxTrashcanContents: 20
      });
      this.ws.registerToolboxCategoryCallback('ALGO_VARS', AB.variableFlyout);
      this.ws.registerButtonCallback('ALGO_NEW_VAR', () => B.Variables.createVariableButtonHandler(this.ws, null, ''));
      B.dialog.setPrompt((msg, def, cb) => UI.promptBox(msg, def, { title: 'Variabel' }).then(v => cb(v)));
      B.dialog.setConfirm((msg, cb) => UI.confirmBox(msg).then(cb));
      B.dialog.setAlert((msg, cb) => { UI.toast(msg, 'err'); if (cb) cb(); });
      if (!this.mission && !this.readOnly) this._pinFlyout();
      this.rt.highlighter = {
        spriteId: this.currentId,
        set: (id, on) => { try { if (this.ws.getBlockById(id)) this.ws.highlightBlock(id, on); } catch (e) { /* abaikan */ } },
        clear: () => { try { this.ws.highlightBlock(null); } catch (e) { /* abaikan */ } }
      };
      this._loadSpriteBlocks();
      // variabel misi baru ada setelah blok dimuat → gambar ulang daftar blok agar namanya benar (bukan "i")
      if (this.mission && !this.readOnly && (this.project.variables || []).length) this._refreshToolbox();
    }

    _loadSpriteBlocks() {
      const sp = this._cur();
      AB.ctx.currentId = sp.id;
      this.rt.highlighter.spriteId = sp.id;
      this._loading = true;
      B.Events.disable();
      try {
        B.serialization.workspaces.load({ blocks: sp.blocks || { languageVersion: 0, blocks: [] }, variables: this.project.variables || [] }, this.ws);
      } catch (e) {
        console.error(e);
        UI.toast('Sebagian blok tidak bisa dimuat.', 'err');
      } finally {
        B.Events.enable();
        this._loading = false;
      }
      if (!this.ws.getTopBlocks(false).length) this.ws.scroll(20, 20);
      else this.ws.scrollCenter();
    }

    _cur() { return this.project.sprites.find(s => s.id === this.currentId) || this.project.sprites[0]; }

    // ---------- daftar blok (Kreasi): tetap terbuka setelah blok diambil ----------
    _toolboxDef() { return this.mission ? AB.flyoutToolbox(this.mission.blok, this.project.variables) : AB.categoryToolbox(this.level); }

    _pinFlyout() {
      const tb = this.ws.getToolbox();
      if (!tb) return;
      this._tuneFlyout();
      let idx = 0;
      try { const v = localStorage.getItem('algo_cat'); if (v !== null && !isNaN(+v)) idx = +v; } catch (e) { /* abaikan */ }
      this._openCategory(idx);
    }

    _tuneFlyout() {
      const tb = this.ws.getToolbox();
      const fl = tb && tb.getFlyout();
      if (!fl) return;
      fl.setAutoClose(false); // tetap terbuka; Blockly menggeser area kode ke kanan daftar blok
      // layar sempit (HP): blok di daftar dibuat lebih kecil agar area kode tetap lega
      const narrow = this.$('.ed-blockly').getBoundingClientRect().width < 600;
      fl.getFlyoutScale = () => (narrow ? Math.min(0.52, this.ws.scale) : this.ws.scale);
    }

    // idx = urutan kategori; -1 = sembunyikan daftar blok
    _openCategory(idx) {
      const tb = this.ws && this.ws.getToolbox();
      if (!tb) return;
      const n = tb.getToolboxItems().length;
      if (idx >= n) idx = 0;
      this._catIdx = idx;
      if (idx < 0) tb.clearSelection(); else tb.selectItemByPosition(idx);
      this._syncFlyBtn();
      setTimeout(() => { if (this.ws) this.ws.resize(); }, 0);
    }

    _onToolboxSelect() {
      if (performance.now() < (this._tbQuietUntil || 0)) return;
      const tb = this.ws.getToolbox();
      const sel = tb && tb.getSelectedItem();
      this._catIdx = sel ? tb.getToolboxItems().indexOf(sel) : -1;
      if (this._catIdx >= 0) this._lastCat = this._catIdx;
      try { localStorage.setItem('algo_cat', String(this._catIdx)); } catch (e) { /* abaikan */ }
      this._syncFlyBtn();
      setTimeout(() => { if (this.ws) this.ws.resize(); }, 0);
    }

    toggleFlyout() {
      if (this._catIdx >= 0) { this._lastCat = this._catIdx; this._openCategory(-1); }
      else this._openCategory(this._lastCat >= 0 ? this._lastCat : 0);
      try { localStorage.setItem('algo_cat', String(this._catIdx)); } catch (e) { /* abaikan */ }
    }

    _syncFlyBtn() {
      const b = this.$('.ed-fly');
      if (!b) return;
      const open = this._catIdx >= 0;
      b.textContent = open ? '⇤' : '⇥';
      b.title = open ? 'Sembunyikan daftar blok' : 'Tampilkan daftar blok';
      b.setAttribute('aria-label', b.title);
    }

    // perbarui isi daftar blok (ganti tokoh / ganti tingkat) tanpa menutupnya
    _refreshToolbox() {
      if (this.readOnly) return;
      const keep = this._catIdx;
      this._tbQuietUntil = performance.now() + 120;
      this.ws.updateToolbox(this._toolboxDef());
      if (!this.mission) {
        this._tuneFlyout();
        this._openCategory(keep == null ? 0 : keep);
      }
    }

    // simpan isi area kode ke tokoh yang sedang dipilih
    sync() {
      if (!this.ws || this.readOnly) return;
      const st = B.serialization.workspaces.save(this.ws);
      const sp = this._cur();
      sp.blocks = st.blocks || { languageVersion: 0, blocks: [] };
      const vars = (st.variables || []).map(v => ({ id: v.id, name: v.name }));
      this.project.variables = vars;
      this.rt.syncVariables(vars);
    }

    // ---------- interaksi ----------
    _wire() {
      const $ = this.$;
      $('.ed-back').addEventListener('click', () => this.exit());
      $('.ed-howto').addEventListener('click', () => this.howto());
      $('.run-btn.go').addEventListener('click', () => this.go());
      $('.run-btn.stop').addEventListener('click', () => this.stop());
      $('.ed-full').addEventListener('click', () => this.toggleFull());
      this.el.querySelectorAll('.seg-speed button').forEach(b => b.addEventListener('click', () => this.setSpeed(b.dataset.m)));
      this.el.querySelectorAll('.ed-undo button[data-u]').forEach(b => b.addEventListener('click', () => this.ws.undo(b.dataset.u === 'redo')));
      const fly = $('.ed-fly'); if (fly) fly.addEventListener('click', () => this.toggleFlyout());
      // Ctrl (⌘ di Mac) + gulir di mana pun di bagian kode = perbesar/perkecil area kode, bukan halaman browser.
      // Satu putaran roda = satu langkah zoom (lebih halus dari bawaan Blockly yang 2 langkah);
      // di atas area kode, zoom berpusat di posisi mouse.
      $('.ed-code').addEventListener('wheel', (e) => {
        if (!(e.ctrlKey || e.metaKey) || !this.ws) return;
        e.preventDefault(); e.stopPropagation();
        const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
        const amount = Math.max(-2, Math.min(2, -dy / 100));
        if (!amount) return;
        const t = e.target;
        const onCode = t && t.closest && t.closest('svg.blocklySvg') && !t.closest('.blocklyFlyout');
        try {
          if (onCode) { const pt = B.browserEvents.mouseToSvg(e, this.ws.getParentSvg(), this.ws.getInverseScreenCTM()); this.ws.zoom(pt.x, pt.y, amount); }
          else this.ws.zoomCenter(amount);
        } catch (err) { this.ws.zoomCenter(amount); }
      }, { capture: true, passive: false });

      if (this.mode === 'kreasi' && !this.readOnly) {
        $('.ed-name').addEventListener('input', () => { this.project.name = $('.ed-name').value; this._markDirty(); });
        this.el.querySelectorAll('.seg-level button').forEach(b => b.addEventListener('click', () => this.setLevel(b.dataset.l)));
        $('.ed-save').addEventListener('click', () => this.save());
        const sub = $('.ed-submit'); if (sub) sub.addEventListener('click', () => this.submit());
      }
      const menu = $('.ed-menu'); if (menu) menu.addEventListener('click', (e) => this._menu(e));
      const bd = $('.bd-btn'); if (bd && !this.readOnly) bd.addEventListener('click', () => this.chooseBackdrop());
      const mh = $('.mc-head'); if (mh) mh.addEventListener('click', () => {
        const card = $('.mission-card'); const open = !card.classList.contains('collapsed');
        card.classList.toggle('collapsed', open); mh.setAttribute('aria-expanded', String(!open));
      });
      const hb = $('.hint-btn'); if (hb) hb.addEventListener('click', () => this.nextHint());
      const rs = $('.ed-restart'); if (rs) rs.addEventListener('click', () => this.restartMission());

      // perubahan pada area kode
      this.ws.addChangeListener((e) => {
        if (this._loading) return;
        if (e.type === B.Events.SELECTED) { this._help(e.newElementId); return; }
        if (e.type === B.Events.TOOLBOX_ITEM_SELECT) { if (!this.mission) this._onToolboxSelect(); return; }
        if (e.type === B.Events.CLICK && e.targetType === 'block' && e.blockId && e.workspaceId === this.ws.id) { this._clickRun(e.blockId); return; }
        if (e.isUiEvent || this.readOnly) return;
        this._changed();
      });
      this._changed = UI.debounce(() => {
        this.sync();
        this._updateCount();
        this._refreshPad();
        this._markDirty();
        this._saveDraft();
      }, 250);

      // mesin
      this.rt.hooks.onRunningChange = (r) => {
        this.el.classList.toggle('running', r);
        if (r) this._status('Program berjalan…', 'run');
      };
      this.rt.hooks.onIdle = () => this._onIdle();
      this.rt.hooks.onFrame = () => { if (this.mission) { this._check(); this._watchdog(); } else this._tickProps(); };
      this.rt.hooks.onStar = () => { if (this.mission) setTimeout(() => this._check(), 0); };
      this.rt.hooks.onCrash = () => this._onCrash();
      this.rt.hooks.onError = () => this._status('Ups, ada blok yang tidak bisa dijalankan.', 'warn');
      this.rt.hooks.onBlockStart = (b) => {
        if (b.type === 'a_ask') this._status('✍️ Ketik jawabanmu di kotak bawah panggung, lalu tekan Kirim.', 'info');
      };

      // panggung
      this.stage.onSpriteClick = (id) => {
        const wasRunning = this.rt.running;
        this.rt.clickSprite(id);
        // misi dengan beberapa tokoh: klik tokoh di panggung juga memilihnya untuk diprogram
        if (this.mission && !wasRunning && this.project.sprites.length > 1 && id !== this.currentId) this.selectSprite(id);
      };
      this.stage.onSpriteDragEnd = (sp) => {
        if (this.mode !== 'kreasi') return;
        if (sp.id !== this.currentId) this.selectSprite(sp.id); else this._renderProps();
        this._markDirty();
      };
      this.stage.onKey = (k, down) => this._padKey(k, down);

      // keyboard
      const kd = (e) => {
        if (!this._keyOk(e)) return;
        const k = KEYMAP[e.key] || (e.key && e.key.length === 1 ? e.key.toLowerCase() : null);
        if (!k) return;
        if (KEYMAP[e.key]) e.preventDefault();
        if (e.repeat) return; // Algo mengulang sendiri selama tombol ditahan (lebih mulus)
        this.rt.keyDown(k);
      };
      const ku = (e) => {
        const k = KEYMAP[e.key] || (e.key && e.key.length === 1 ? e.key.toLowerCase() : null);
        if (k) this.rt.keyUp(k);
      };
      document.addEventListener('keydown', kd);
      document.addEventListener('keyup', ku);
      this._listeners.push(['keydown', kd], ['keyup', ku]);
      // jendela kehilangan fokus → lepaskan semua tombol agar tokoh tidak terus berjalan
      const lose = () => this.rt.releaseKeys();
      const vis = () => { if (document.hidden) this.rt.releaseKeys(); };
      window.addEventListener('blur', lose);
      document.addEventListener('visibilitychange', vis);
      this._listeners.push(['visibilitychange', vis]);
      const bu = (e) => { if (this.dirty && this.mode === 'kreasi' && !this.readOnly) { e.preventDefault(); e.returnValue = ''; } };
      window.addEventListener('beforeunload', bu);
      this._winListeners = [['beforeunload', bu], ['blur', lose]];

      // pembaruan nilai tokoh saat program berjalan (mode kreasi)
      this._propTimer = setInterval(() => { if (this.mode === 'kreasi' && this.rt.running) this._renderProps(true); }, 500);
    }

    _keyOk(e) {
      if (!document.body.contains(this.el)) return false;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return false;
      if (B.WidgetDiv.isVisible() || (B.DropDownDiv && B.DropDownDiv.isVisible && B.DropDownDiv.isVisible())) return false;
      if (UI.topModal()) return false;
      return true;
    }

    _padKey(k, down) {
      // pengulangan saat ditahan diatur oleh mesin Algo (sama mulusnya dengan keyboard)
      if (down) this.rt.keyDown(k); else this.rt.keyUp(k);
    }

    _clickRun(blockId) {
      const b = this.ws.getBlockById(blockId);
      if (!b) return;
      const root = b.getRootBlock();
      const json = B.serialization.blocks.save(root, { addCoordinates: false, addInputBlocks: true, addNextBlocks: true, doFullSerialization: false });
      this.sync();
      if (this.mission && !this.rt.running) this._resetScene();
      this.rt.runStack(this.currentId, json);
    }

    _help(id) {
      const box = this.$('.ed-help-text');
      if (!id) return;
      let b = this.ws.getBlockById(id);
      if (!b) return;
      while (b && b.isShadow() && b.getParent()) b = b.getParent();
      const h = AB.HELP[b.type];
      if (!h) return;
      const cat = AB.CAT_OF[b.type];
      box.innerHTML = `<b class="help-name ${cat ? 'c-' + cat : ''}">${esc(h[0])}</b> ${esc(h[1])}`;
    }

    _updateCount() {
      // misi: hitung blok SEMUA tokoh; kreasi: tokoh yang sedang dipilih
      const a = this.mission ? RT.analyzeAll(this.project.sprites) : RT.analyze(this._cur().blocks);
      this.analysis = a;
      const c = this.$('.chip-count b');
      if (c) {
        c.textContent = a.count;
        const chip = this.$('.chip-count');
        chip.classList.toggle('ok', this.mission && a.count > 0 && a.count <= this.mission.optimal);
        chip.classList.toggle('over', this.mission && a.count > this.mission.optimal);
      }
      if (!this.rt.running) {
        if (a.orphans > 0) this._status(`⚠️ ${a.orphans} blok belum tersambung ke blok pembuka kuning, jadi tidak akan dijalankan.`, 'warn');
        else if (this._lastStatusKind === 'warn' && /tersambung/.test(this._lastStatus || '')) this._status('');
      }
    }

    _refreshPad() { this.stage.showPad(this.rt.usesKeys()); }

    _status(msg, kind) {
      const s = this.$('.ed-status');
      this._lastStatus = msg; this._lastStatusKind = kind;
      s.textContent = msg || '';
      s.className = 'ed-status' + (kind ? ' st-' + kind : '') + (msg ? ' show' : '');
    }

    // ---------- menjalankan ----------
    go() {
      if (this.rt.mode === 'langkah' && this.rt.running) { this.rt.stepOnce(); return; }
      this.sync();
      this._feedback('');
      this.won = false;
      if (this.mission) {
        this._resetScene();
        this._wdShown = false;
        this.attempts++;
        if (this.o.onAttempt) this.o.onAttempt();
      }
      const n = this.rt.start();
      const hasEvents = this._hasEventHats();
      if (n === 0) {
        if (this.mission && this.mission.interaktif && hasEvents) this._status('👉 ' + this.mission.interaktif, 'info');
        else if (hasEvents) this._status('Program siap. Tekan tombol atau klik tokoh untuk memicu blok kejadian.', 'info');
        else this._status('Belum ada blok "ketika ▶ Jalankan diklik". Tempel blok di bawah blok pembuka kuning.', 'warn');
      } else if (this.rt.mode === 'langkah') {
        this._status('Mode langkah: tekan 👣 Langkah untuk menjalankan blok berikutnya.', 'info');
      }
    }

    stop() {
      this.rt.stopAll();
      this._status('Program dihentikan.', '');
      this._renderProps();
    }

    setSpeed(m) {
      this.rt.mode = m;
      this.el.querySelectorAll('.seg-speed button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
      const go = this.$('.run-btn.go');
      go.querySelector('.ri').textContent = m === 'langkah' ? '👣' : '▶';
      go.querySelector('.rl').textContent = m === 'langkah' ? 'Langkah' : 'Jalankan';
      if (m !== 'langkah') this.rt.stepOnce();
      if (m === 'normal' && this.rt.highlighter) this.rt.highlighter.clear();
    }

    _hasEventHats() {
      let has = false;
      this.project.sprites.forEach(sp => ((sp.blocks && sp.blocks.blocks) || []).forEach(b => {
        if (b.type === 'a_when_key' || b.type === 'a_when_clicked' || b.type === 'a_when_msg') has = true;
      }));
      return has;
    }

    _resetScene() {
      const m = this.mission;
      AM.spritesOf(m).forEach(h => {
        const sp = this.project.sprites.find(s => s.id === h.id);
        if (sp) Object.assign(sp, { x: h.x, y: h.y, dir: h.dir, size: h.size, costume: h.costume, visible: h.visible !== false, rot: h.rot, bubble: null, penDown: false, penColor: '#3A6FF2', penSize: 3 });
      });
      this.rt.state.props = (m.props || []).map(p => Object.assign({}, p));
      this.rt.state.backdrop = m.latar;
      Object.values(this.rt.state.variables).forEach(v => {
        const def = (m.vars || []).find(d => d.id === v.id);
        v.value = 0; v.visible = !(def && def.visible === false);
      });
      this.stage.penClear();
      this.rt.resetLog();
      this.rt._dirty = 3;
    }

    _tickProps() { /* cadangan untuk efek mode kreasi */ }

    // ---------- pemeriksaan misi ----------
    _ctx() {
      const vars = {};
      Object.values(this.rt.state.variables).forEach(v => { vars[v.name] = v; });
      const a = this.analysis && this.analysis.per ? this.analysis : RT.analyzeAll(this.project.sprites);
      const heroId = this.rt.heroId || this.project.sprites[0].id;
      return {
        hero: this.project.sprites.find(s => s.id === heroId) || this.project.sprites[0],
        sprite: (id) => this.project.sprites.find(s => s.id === id),
        typesOf: (id) => (a.per[id] || { types: {} }).types,
        types: a.types, count: a.count, vars
      };
    }

    // misi yang berjalan terus (game): beri petunjuk bila belum berhasil setelah beberapa detik
    _watchdog() {
      const m = this.mission;
      if (!m.tungguDetik || this.won || this._wdShown || !this.rt.running) return;
      if (performance.now() - this.rt.log.startedAt < m.tungguDetik * 1000) return;
      this._wdShown = true;
      let msg = '';
      try { msg = m.gagal(this.rt.log, this._ctx()); } catch (e) { msg = ''; }
      if (msg) this._feedback('Hampir! ' + msg, 'try');
    }

    _check() {
      if (this.won || !this.mission || this.readOnly && this.o.noCelebrate) return;
      let ok = false;
      try { ok = !!this.mission.cek(this.rt.log, this._ctx()); } catch (e) { ok = false; }
      if (!ok) return;
      this.won = true;
      const started = performance.now();
      const finish = () => {
        if (!this.el.isConnected) return;
        if (this.rt.running && performance.now() - started < 1600) { setTimeout(finish, 120); return; }
        this.rt.stopAll();
        this._success();
      };
      setTimeout(finish, this.rt.running ? 150 : 450);
    }

    _onIdle() {
      this._renderProps();
      if (!this.mission) { if (!/Program dihentikan/.test(this._lastStatus || '')) this._status('Selesai ✓', 'ok'); return; }
      if (this.won) return;
      this._check();
      if (this.won) return;
      const m = this.mission;
      if (this.rt.log.crash) return;
      if (m.interaktif && this._hasEventHats() && !this.rt.log.answers.length && !this.rt.log.stopped) {
        this._status('👉 ' + m.interaktif, 'info');
        if (this.rt.log.clickHats || this.rt.log.keyHats.size) this._feedback(m.gagal(this.rt.log, this._ctx()), 'try');
        return;
      }
      const a = RT.analyzeAll(this.project.sprites);
      if (a.count <= 1) { this._feedback('Tempel blok di bawah blok pembuka kuning dulu, ya.', 'try'); this._status(''); return; }
      this._status('');
      this._feedback('Hampir! ' + m.gagal(this.rt.log, this._ctx()), 'try');
    }

    _onCrash() {
      this.rt.stopAll();
      this._status('');
      this._feedback('Aduh! Algo menabrak batu. Coba rencanakan jalan lain lalu tekan ▶ Jalankan lagi.', 'bad');
    }

    _feedback(msg, kind) {
      const f = this.$('.mc-feedback');
      if (!f) return;
      if (!msg) { f.classList.add('hidden'); return; }
      f.className = 'mc-feedback fb-' + (kind || 'try');
      f.innerHTML = `<span class="fb-ico">${kind === 'bad' ? '💥' : '🤔'}</span><span>${esc(msg)}</span>`;
      const card = this.$('.mission-card'); if (card) card.classList.remove('collapsed');
    }

    // ↺ kembalikan area kode ke susunan awal misi (bintang yang sudah didapat tetap tersimpan)
    async restartMission() {
      const m = this.mission;
      if (!m || this.readOnly) return;
      const ok = await UI.confirmBox('Susunan blokmu sekarang akan dihapus dan diganti blok awal misi. Bintang yang sudah kamu dapat tetap tersimpan.', { title: 'Mulai misi dari awal?', ok: '↺ Mulai ulang' });
      if (!ok || !this.el.isConnected) return;
      this.rt.stopAll();
      const fresh = AM.missionProject(m, null);
      this.project = fresh;
      this.currentId = fresh.current && fresh.sprites.some(s => s.id === fresh.current) ? fresh.current : fresh.sprites[0].id;
      this._loadRuntime();
      AB.ctx.sprites = this.project.sprites;
      this._loadSpriteBlocks();
      if ((this.project.variables || []).length) this._refreshToolbox();
      if (AM.spritesOf(m).length > 1) this._renderSprites();
      this.won = false; this.attempts = 0; this._wdShown = false;
      this._feedback('');
      this._updateCount(); this._refreshPad();
      this._saveDraft(); // draf baru lebih baru dari solusi lama → tetap dari awal saat dibuka lagi
      this._status('↺ Misi dimulai dari awal. Ayo susun blokmu!', 'info');
      UI.toast('Misi dimulai dari awal.', 'ok');
    }

    nextHint() {
      const m = this.mission;
      if (this.hintShown >= m.petunjuk.length) return;
      const li = document.createElement('li');
      li.textContent = m.petunjuk[this.hintShown];
      this.$('.hint-list').appendChild(li);
      this.hintShown++;
      const btn = this.$('.hint-btn');
      const left = m.petunjuk.length - this.hintShown;
      btn.textContent = left ? `💡 Petunjuk berikutnya (${left})` : '💡 Semua petunjuk sudah dibuka';
      btn.disabled = !left;
    }

    _success() {
      const m = this.mission;
      const a = RT.analyzeAll(this.project.sprites);
      const stars = AM.starsFor(m, a.count);
      this._status('Misi berhasil! 🎉', 'ok');
      this._feedback('');
      this._clearDraft();
      if (this.readOnly) { UI.toast('Program siswa berhasil menyelesaikan misi.', 'ok'); return; }
      const result = { misiId: m.id, bintang: stars, jumlahBlok: a.count, solusi: AM.missionSolution(m, this.project), percobaan: this.attempts };
      if (this.o.onMissionDone) this.o.onMissionDone(result);
      UI.confetti();
      const next = AM.MISSIONS.find(x => x.id === m.id + 1);
      const tip = stars < 3 ? `<p class="win-tip">Kamu memakai <b>${a.count}</b> blok. Bisa lebih hemat? Selesaikan dengan <b>${m.optimal}</b> blok atau kurang untuk ★★★.</p>` : `<p class="win-tip">Sempurna! Kamu hanya memakai <b>${a.count}</b> blok.</p>`;
      UI.modal({
        title: 'Misi Berhasil!', cls: 'win-modal',
        body: `<div class="win"><div class="win-stars">${[0, 1, 2].map(i => `<span class="ws ${i < stars ? 'on' : ''}" style="animation-delay:${0.15 + i * 0.22}s">★</span>`).join('')}</div>
               <p class="win-msg">${esc(m.judul)} selesai. Konsep yang kamu pelajari: <b>${esc(m.konsep)}</b>.</p>${tip}</div>`,
        actions: [
          { label: stars < 3 ? 'Perbaiki lagi' : 'Tetap di sini', cls: 'btn-ghost' },
          next ? { label: `Misi ${next.id} →`, cls: 'btn-primary', onClick: () => { if (this.o.onNext) this.o.onNext(next.id); } }
            : { label: 'Ke Peta Misi', cls: 'btn-primary', onClick: () => this.exit(true) }
        ]
      });
    }

    // ---------- tokoh & latar (mode kreasi) ----------
    _renderSprites() {
      const list = this.$('.sp-list');
      if (!list) return;
      list.innerHTML = this.project.sprites.map(s => `
        <div class="sp-tile ${s.id === this.currentId ? 'on' : ''}" role="listitem" data-id="${esc(s.id)}" tabindex="0" title="${esc(s.name)}">
          <img src="${Assets.costumeUrl(s.asset, s.costume)}" alt="">
          <span>${esc(s.name)}</span>
          ${!this.readOnly && !this.mission && this.project.sprites.length > 1 ? `<button type="button" class="sp-del" data-del="${esc(s.id)}" aria-label="Hapus ${esc(s.name)}">✕</button>` : ''}
        </div>`).join('') + (this.readOnly || this.mission ? '' : '<button type="button" class="sp-add" aria-label="Tambah tokoh"><span>＋</span>Tokoh</button>');
      list.querySelectorAll('.sp-tile').forEach(t => {
        t.addEventListener('click', (e) => { if (e.target.closest('.sp-del')) return; this.selectSprite(t.dataset.id); });
        t.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.selectSprite(t.dataset.id); });
      });
      list.querySelectorAll('.sp-del').forEach(b => b.addEventListener('click', () => this.deleteSprite(b.dataset.del)));
      const add = list.querySelector('.sp-add'); if (add) add.addEventListener('click', () => this.chooseSprite());
      const img = this.$('.bd-img'); if (img) img.src = Assets.backdropUrl(this.rt.state.backdrop);
      this._renderProps();
    }

    _renderProps(liveOnly) {
      const box = this.$('.sp-props');
      if (!box) return;
      const sp = this._cur();
      if (liveOnly && box.querySelector('input[data-p="x"]')) {
        ['x', 'y', 'size', 'dir'].forEach(k => {
          const i = box.querySelector(`input[data-p="${k}"]`);
          if (i && document.activeElement !== i) i.value = Math.round(k === 'dir' ? Stage.normDir(sp[k]) : sp[k]);
        });
        return;
      }
      const ro = this.readOnly ? 'disabled' : '';
      box.innerHTML = `
        <label class="spf spf-name"><span>Tokoh</span><input data-p="name" value="${esc(sp.name)}" maxlength="24" ${ro}></label>
        <label class="spf"><span>x</span><input type="number" data-p="x" value="${Math.round(sp.x)}" ${ro}></label>
        <label class="spf"><span>y</span><input type="number" data-p="y" value="${Math.round(sp.y)}" ${ro}></label>
        <label class="spf"><span>Ukuran</span><input type="number" data-p="size" value="${Math.round(sp.size)}" ${ro}></label>
        <label class="spf"><span>Arah</span><input type="number" data-p="dir" value="${Math.round(Stage.normDir(sp.dir))}" ${ro}></label>
        <button type="button" class="spf-vis ${sp.visible ? 'on' : ''}" ${ro} aria-pressed="${sp.visible}" title="Tampil/sembunyi">${sp.visible ? '👁 Tampil' : '🚫 Sembunyi'}</button>
        <div class="spf spf-rot"><span>Gaya putar</span>
          <div class="seg seg-rot" role="group" aria-label="Gaya putar">
            ${[['all', '↻ Semua arah', 'Gambar ikut miring & berputar sesuai arah'], ['lr', '⇆ Kiri-kanan', 'Gambar hanya menoleh kiri atau kanan (tidak terbalik)'], ['none', '• Tetap', 'Gambar tidak ikut berputar']]
              .map(([v, t, tip]) => `<button type="button" data-rot="${v}" class="${(sp.rot || 'all') === v ? 'on' : ''}" title="${tip}" ${ro}>${t}</button>`).join('')}
          </div>
        </div>`;
      box.querySelectorAll('input').forEach(i => i.addEventListener('change', () => {
        const p = i.dataset.p;
        if (p === 'name') {
          const nm = i.value.trim() || sp.name;
          if (this.project.sprites.some(s => s !== sp && s.name.toLowerCase() === nm.toLowerCase())) { UI.toast('Nama tokoh sudah dipakai.', 'err'); i.value = sp.name; return; }
          sp.name = nm; this._renderSprites();
        } else {
          let v = Number(i.value); if (isNaN(v)) v = 0;
          if (p === 'x') v = Math.max(-240, Math.min(240, v));
          if (p === 'y') v = Math.max(-180, Math.min(180, v));
          if (p === 'size') v = Math.max(5, Math.min(500, v));
          if (p === 'dir') v = Stage.normDir(v);
          sp[p] = v; i.value = Math.round(v);
        }
        this.rt._dirty = 3; this._markDirty();
      }));
      const vis = box.querySelector('.spf-vis');
      if (vis) vis.addEventListener('click', () => { sp.visible = !sp.visible; this.rt._dirty = 3; this._renderProps(); this._markDirty(); });
      box.querySelectorAll('.seg-rot button').forEach(btn => btn.addEventListener('click', () => {
        sp.rot = btn.dataset.rot; this.rt._dirty = 3; this._renderProps(); this._markDirty();
      }));
    }

    selectSprite(id) {
      if (id === this.currentId) return;
      this.sync();
      this._switchTo(id);
    }

    // pindah tokoh TANPA menyimpan area kode (dipanggil setelah sync)
    _switchTo(id) {
      this.currentId = id;
      this.project.current = id;
      this._loadSpriteBlocks();
      this._refreshToolbox();
      this._renderSprites();
      this._updateCount();
    }

    chooseSprite() {
      const groups = {};
      Object.keys(Assets.SPRITES).forEach(id => { const a = Assets.SPRITES[id]; (groups[a.kategori] = groups[a.kategori] || []).push(id); });
      const body = document.createElement('div');
      body.className = 'lib';
      body.innerHTML = Object.keys(groups).map(g => `<h4>${esc(g)}</h4><div class="lib-grid">${groups[g].map(id => {
        const a = Assets.SPRITES[id];
        return `<button type="button" class="lib-item" data-id="${id}"><img src="${Assets.costumeUrl(id, 0)}" alt=""><span>${esc(a.nama)}</span></button>`;
      }).join('')}</div>`).join('');
      const m = UI.modal({ title: 'Pilih Tokoh', body, wide: true });
      body.querySelectorAll('.lib-item').forEach(b => b.addEventListener('click', () => { m.close(); this.addSprite(b.dataset.id); }));
    }

    addSprite(assetId) {
      if (this.project.sprites.length >= 12) { UI.toast('Maksimal 12 tokoh dalam satu proyek.', 'err'); return; }
      this.sync();
      const a = Assets.SPRITES[assetId];
      let name = a.nama, n = 2;
      while (this.project.sprites.some(s => s.name.toLowerCase() === name.toLowerCase())) name = a.nama + ' ' + (n++);
      const sp = {
        id: AM.newId(), name, asset: assetId, costume: Assets.costumeNames(assetId)[0],
        x: Math.round(Math.random() * 200 - 100), y: Math.round(Math.random() * 140 - 70), dir: 90, size: 100, visible: true,
        rot: 'all', // gambar ikut berputar sesuai arah (seperti Scratch); bisa diganti di panel tokoh
        layer: ++this.rt.maxLayer, blocks: { languageVersion: 0, blocks: [] }, bubble: null, penDown: false, penColor: '#3A6FF2', penSize: 3
      };
      this.project.sprites.push(sp);
      this.rt._dirty = 3;
      this._switchTo(sp.id);
      this._markDirty();
    }

    async deleteSprite(id) {
      const sp = this.project.sprites.find(s => s.id === id);
      if (!sp || this.project.sprites.length <= 1) return;
      const ok = await UI.confirmBox(`Hapus tokoh "${sp.name}" beserta semua bloknya?`, { ok: 'Hapus', danger: true });
      if (!ok) return;
      this.sync();
      this.rt.stopAll(true);
      this.project.sprites = this.project.sprites.filter(s => s.id !== id);
      this.rt.state.sprites = this.project.sprites;
      AB.ctx.sprites = this.project.sprites;
      if (this.currentId === id) this._switchTo(this.project.sprites[0].id);
      else this._renderSprites();
      this.rt._dirty = 3;
      this._markDirty();
    }

    chooseBackdrop() {
      const body = document.createElement('div');
      body.className = 'lib';
      body.innerHTML = '<div class="lib-grid lib-bd">' + Object.keys(Assets.BACKDROPS).map(id =>
        `<button type="button" class="lib-item ${id === this.rt.state.backdrop ? 'on' : ''}" data-id="${id}"><img src="${Assets.backdropUrl(id)}" alt=""><span>${esc(Assets.BACKDROPS[id].nama)}</span></button>`).join('') + '</div>';
      const m = UI.modal({ title: 'Pilih Latar', body, wide: true });
      body.querySelectorAll('.lib-item').forEach(b => b.addEventListener('click', () => {
        m.close();
        this.project.backdrop = b.dataset.id;
        this.rt.state.backdrop = b.dataset.id;
        this.rt._dirty = 3;
        this.$('.bd-img').src = Assets.backdropUrl(b.dataset.id);
        this._markDirty();
      }));
    }

    setLevel(l) {
      this.level = l;
      localStorage.setItem('algo_level', l);
      this.el.querySelectorAll('.seg-level button').forEach(b => b.classList.toggle('on', b.dataset.l === l));
      this._refreshToolbox();
      UI.toast(l === 'lengkap' ? 'Semua blok ditampilkan.' : 'Hanya blok dasar yang ditampilkan.', 'info', 1800);
    }

    // ---------- simpan / kumpul ----------
    data() { this.sync(); const p = cleanProject(this.project); p.current = this.currentId; return p; }

    _markDirty() {
      if (this.mode !== 'kreasi' || this.readOnly) return;
      this.dirty = true;
      const s = this.$('.save-state'); if (s) { s.textContent = 'Belum disimpan'; s.className = 'save-state dirty'; }
    }

    async save(silent) {
      if (this.readOnly || this.mode !== 'kreasi' || !this.o.onSave) return true;
      if (this._saving) return this._saving;
      const btn = this.$('.ed-save');
      const done = UI.busy(btn, 'Menyimpan…');
      const s = this.$('.save-state'); s.textContent = 'Menyimpan…'; s.className = 'save-state';
      let ok = false;
      this._saving = (async () => {
        try {
          const res = await this.o.onSave(this.data(), this);
          if (res && res.ok) {
            ok = true;
            this.dirty = false;
            s.textContent = 'Tersimpan ✓'; s.className = 'save-state ok';
            this._clearDraft();
            if (!silent) UI.toast(res.msg || 'Proyek tersimpan.', 'ok');
            return true;
          }
          s.textContent = 'Gagal menyimpan'; s.className = 'save-state err';
          UI.toast((res && res.msg) || 'Gagal menyimpan. Coba lagi.', 'err');
          return false;
        } finally { done(ok ? 'Tersimpan' : null); this._saving = null; }
      })();
      return this._saving;
    }

    async submit() {
      const sb = this.$('.ed-submit');
      if (sb && sb._busy) return;
      const ok = await this.save(true);
      if (!ok || !this.o.onSubmit) return;
      const done = UI.busy(sb, 'Mengirim…');
      try { await this.o.onSubmit(this); } finally { done(); }
    }

    _draftKey() {
      if (this.mission) return 'algo_mdraft_' + (this.o.userKey || 'tamu') + '_' + this.mission.id;
      return 'algo_pdraft_' + (this.o.userKey || 'tamu') + '_' + (this.o.projectId || 'baru');
    }
    _saveDraft() {
      if (this.readOnly) return;
      try {
        const data = this.mission ? AM.missionSolution(this.mission, this.project) : this.data();
        localStorage.setItem(this._draftKey(), JSON.stringify({ t: Date.now(), data }));
      } catch (e) { /* penyimpanan penuh: abaikan */ }
    }
    _clearDraft() { try { localStorage.removeItem(this._draftKey()); } catch (e) { /* abaikan */ } }
    _restoreDraft() {
      if (this.readOnly) return;
      let d = null;
      try { d = JSON.parse(localStorage.getItem(this._draftKey()) || 'null'); } catch (e) { d = null; }
      if (!d || !d.data) return;
      if (this.mission) {
        // ada solusi tersimpan: pakai draf hanya bila lebih baru (misalnya setelah ↺ Mulai ulang)
        if (this.o.solution && !(d.t > (Date.parse(this.o.solutionAt || '') || 0) + 1000)) return;
        if (d.data.multi) this.project.sprites.forEach(sp => { if (d.data.sprites[sp.id]) sp.blocks = d.data.sprites[sp.id]; });
        else if (d.data.blocks) this.project.sprites[0].blocks = d.data;
        this._loadSpriteBlocks(); this._updateCount();
        return;
      }
      const newer = !this.o.savedAt || d.t > new Date(this.o.savedAt).getTime() + 2000;
      if (!newer || !validProject(d.data)) return;
      UI.confirmBox('Ada perubahan yang belum sempat disimpan dari sebelumnya. Pulihkan perubahan itu?', { ok: 'Pulihkan', cancel: 'Abaikan', title: 'Pulihkan pekerjaan' }).then(ok => {
        if (!ok) { this._clearDraft(); return; }
        this.project = d.data;
        this.currentId = d.data.current && d.data.sprites.some(s => s.id === d.data.current) ? d.data.current : d.data.sprites[0].id;
        this._loadRuntime();
        AB.ctx.sprites = this.project.sprites;
        this._loadSpriteBlocks();
        const nm = this.$('.ed-name'); if (nm) nm.value = this.project.name;
        this._renderSprites(); this._updateCount(); this._markDirty();
      });
    }

    _menu(e) {
      const items = [
        !this.readOnly && { t: this.level === 'lengkap' ? '🧩 Tampilkan blok dasar saja (Pemula)' : '🧩 Tampilkan semua blok (Lengkap)', f: () => this.setLevel(this.level === 'lengkap' ? 'pemula' : 'lengkap') },
        { t: '⬇️ Unduh file proyek (.algo)', f: () => this.exportFile() },
        !this.readOnly && { t: '📂 Buka file proyek', f: () => this.importFile() },
        !this.readOnly && { t: '🧹 Rapikan blok', f: () => this.ws.cleanUp() },
        { t: '🖼️ Simpan gambar panggung', f: () => this.snapshot() }
      ].filter(Boolean);
      const body = document.createElement('div');
      body.className = 'menu-list';
      body.innerHTML = items.map((it, i) => `<button type="button" data-i="${i}">${esc(it.t)}</button>`).join('');
      const m = UI.modal({ title: 'Menu', body });
      body.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { m.close(); items[+b.dataset.i].f(); }));
    }

    exportFile() {
      const d = this.data();
      const safe = (d.name || 'proyek').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'proyek';
      UI.download(safe + '.algo', JSON.stringify({ app: 'algo', v: 1, project: d }));
      UI.toast('File proyek diunduh.', 'ok');
    }

    async importFile() {
      const f = await UI.pickFile('.algo,.json,application/json');
      if (!f) return;
      let p = null;
      try { const j = JSON.parse(f.text); p = j && j.project ? j.project : j; } catch (e) { p = null; }
      if (!validProject(p)) { UI.toast('File ini bukan proyek Algo.', 'err'); return; }
      const ok = await UI.confirmBox('Ganti isi proyek ini dengan isi file yang dipilih?', { ok: 'Ganti' });
      if (!ok) return;
      this.project = p;
      this.currentId = p.sprites[0].id;
      this._loadRuntime();
      AB.ctx.sprites = this.project.sprites;
      this._loadSpriteBlocks();
      const nm = this.$('.ed-name'); if (nm) nm.value = p.name || 'Proyek';
      this._renderSprites(); this._updateCount(); this._markDirty();
      UI.toast('Proyek dibuka dari file.', 'ok');
    }

    snapshot() {
      try {
        const url = this.stage.canvas.toDataURL('image/png');
        const a = document.createElement('a'); a.href = url; a.download = (this.project.name || 'panggung') + '.png'; a.click();
      } catch (e) { UI.toast('Gambar tidak bisa disimpan.', 'err'); }
    }

    toggleFull() {
      const on = !this.el.classList.contains('stage-full');
      this.el.classList.toggle('stage-full', on);
      this.$('.ed-full').textContent = on ? '✕' : '⛶';
      setTimeout(() => { this.stage.resize(); B.svgResize(this.ws); }, 50);
    }

    howto() {
      UI.modal({
        title: 'Cara Bermain Algo', wide: true, cls: 'howto-modal',
        body: `<ol class="howto">
          <li><div class="ht-ill"><span class="mb mb-ev">ketika ▶ Jalankan diklik</span></div><div><b>Blok pembuka.</b> Program selalu dimulai dari blok kuning bertopi. Blok yang tidak menempel padanya tidak akan dijalankan.</div></li>
          <li><div class="ht-ill"><span class="mb mb-mo">maju <i>10</i> langkah</span><span class="ht-arrow">⤵</span></div><div><b>Seret & tempel.</b> Seret blok dari daftar di kiri, lalu tempelkan di bawah blok pembuka sampai menempel.</div></li>
          <li><div class="ht-ill"><span class="mb mb-mo">maju <i>300</i> langkah</span></div><div><b>Ubah angka atau teks</b> dengan mengklik kotak putih di dalam blok.</div></li>
          <li><div class="ht-ill"><span class="mini-run">▶ Jalankan</span></div><div><b>Jalankan.</b> Pakai mode 🐢 <b>Pelan</b> untuk melihat blok menyala satu per satu, atau 👣 <b>Langkah</b> untuk menjalankan satu blok setiap klik.</div></li>
          <li><div class="ht-ill"><span class="ht-trash">🗑️</span></div><div><b>Menghapus blok:</b> seret blok kembali ke daftar blok atau ke tempat sampah.</div></li>
          ${MOUSE ? '<li><div class="ht-ill"><span class="ht-trash">🖱️</span></div><div><b>Memakai mouse:</b> gulir untuk menggeser area kode naik-turun (arahkan ke daftar blok untuk menggulir daftarnya). <b>Shift + gulir</b> = geser kiri-kanan. <b>Ctrl + gulir</b> = perbesar / perkecil blok.</div></li>' : ''}
        </ol>`,
        actions: [{ label: 'Mengerti!', cls: 'btn-primary' }]
      });
    }

    async exit(force) {
      if (!force && this.dirty && this.mode === 'kreasi' && !this.readOnly && this.o.onSave) {
        const choice = await new Promise(res => {
          UI.modal({
            title: 'Simpan dulu?', body: '<p>Ada perubahan yang belum disimpan.</p>',
            actions: [
              { label: 'Batal', cls: 'btn-ghost', value: 'batal' },
              { label: 'Keluar tanpa simpan', cls: 'btn-ghost', value: 'buang' },
              { label: 'Simpan & keluar', cls: 'btn-primary', value: 'simpan' }
            ],
            onClose: (v) => res(v || 'batal')
          });
        });
        if (choice === 'batal') return;
        if (choice === 'simpan') { const ok = await this.save(true); if (!ok) return; }
        else this._clearDraft();
      }
      if (this.o.onExit) this.o.onExit(this);
    }

    destroy() {
      clearInterval(this._propTimer);
      this._listeners.forEach(([t, f]) => document.removeEventListener(t, f));
      (this._winListeners || []).forEach(([t, f]) => window.removeEventListener(t, f));
      if (this._changed) this._changed.cancel();
      try { this.rt.destroy(); } catch (e) { /* abaikan */ }
      try { this.ws.dispose(); } catch (e) { /* abaikan */ }
      this.stage.destroy();
      this.el.remove();
    }
  }

  global.AlgoEditor = {
    open(host, opts) {
      if (current) { current.destroy(); current = null; }
      const seq = ++_openSeq;
      if (libsReady()) { bindLibs(); current = new Editor(host, opts); return current; }
      host.innerHTML = '<div class="page-loading ed-loading"><i class="spin" aria-hidden="true"></i> Menyiapkan blok…</div>';
      loadLibs().then(() => {
        if (seq !== _openSeq || !host.isConnected) return;
        host.innerHTML = '';
        current = new Editor(host, opts);
      }).catch(() => {
        if (seq !== _openSeq || !host.isConnected) return;
        host.innerHTML = '<div class="page-loading"><p><b>Pustaka blok gagal dimuat.</b><br>Periksa koneksi internet, lalu coba lagi.</p><button type="button" class="btn btn-primary ed-retry">Coba lagi</button></div>';
        host.querySelector('.ed-retry').addEventListener('click', () => global.AlgoEditor.open(host, opts));
      });
      return null;
    },
    close() { _openSeq++; if (current) { current.destroy(); current = null; } },
    // pramuat diam-diam (dipanggil saat beranda/peta sudah tampil)
    preload() { loadLibs().catch(() => { /* dicoba lagi saat editor dibuka */ }); },
    get ready() { return libsReady(); },
    get current() { return current; },
    cleanProject, validProject
  };
})(window);
