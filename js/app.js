/* =========================================================
   ALGO — Aplikasi utama (rute, masuk, halaman siswa)
   ========================================================= */
(function (global) {
  'use strict';
  const Api = global.AlgoApi;
  const UI = global.AlgoUI;
  const AM = global.AlgoMissions;
  const Assets = global.AlgoAssets;
  const Editor = global.AlgoEditor;
  const esc = UI.esc;
  const FRESH_MS = 60000;   // data dianggap segar 60 detik → pindah menu tidak memanggil server

  // Logo Algo: huruf A dengan palang ▶ (tombol Jalankan). ICON = ikon aplikasi, LOCKUP = logo + tulisan.
  const ICON = `<svg class="algo-icon" viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="algoG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5A6CEB"/><stop offset="1" stop-color="#3442BE"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#algoG)"/><path d="M162.4 268.0 L325.6 324 L162.4 380.0 Z" fill="#FFB020" stroke="#FFB020" stroke-width="20" stroke-linejoin="round"/><path d="M104 412 L256 106 L408 412" fill="none" stroke="#fff" stroke-width="80" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const LOCKUP = `<svg class="algo-lockup" viewBox="0 -757.0 2266.0 977.0" role="img" aria-label="Algo"><title>Algo</title><g transform="translate(-127.50 -888.49) scale(1.99223)"><path d="M162.4 268.0 L325.6 324 L162.4 380.0 Z" style="fill:var(--logo-play,#FFB020);stroke:var(--logo-play,#FFB020)" stroke-width="20" stroke-linejoin="round"/><path d="M104 412 L256 106 L408 412" fill="none" style="stroke:var(--logo-a,#4C5FD5)" stroke-width="80" stroke-linecap="round" stroke-linejoin="round"/></g><path transform="translate(44.02 0)" d="M775 0V-757H925V0Z M1291 220Q1228 220 1174.0 199.0Q1120 178 1081.5 140.5Q1043 103 1026 52L1165 3Q1176 41 1210.0 63.0Q1244 85 1291 85Q1328 85 1355.0 71.5Q1382 58 1396.5 32.0Q1411 6 1411 -29V-81Q1392 -62 1368 -50Q1324 -27 1265 -27Q1189 -27 1129.0 -61.5Q1069 -96 1035.0 -156.5Q1001 -217 1001.0 -294.0Q1001 -371 1035.0 -430.5Q1069 -490 1128.0 -524.0Q1187 -558 1262 -558Q1321 -558 1365 -535Q1396 -518 1421 -489V-546H1561V-29Q1561 43 1526.0 99.5Q1491 156 1430.5 188.0Q1370 220 1291 220ZM1286 -163Q1324 -163 1352.0 -179.0Q1380 -195 1395.5 -224.0Q1411 -253 1411.0 -292.0Q1411 -331 1395.0 -360.5Q1379 -390 1351.0 -406.5Q1323 -423 1286 -423Q1248 -423 1218.5 -406.5Q1189 -390 1172.5 -360.5Q1156 -331 1156 -292Q1156 -254 1172.5 -225.0Q1189 -196 1218.5 -179.5Q1248 -163 1286 -163Z M1930 12Q1849 12 1782.5 -25.0Q1716 -62 1676.5 -126.5Q1637 -191 1637 -273Q1637 -356 1676.5 -420.0Q1716 -484 1782.5 -521.0Q1849 -558 1930 -558Q2011 -558 2077.0 -521.0Q2143 -484 2182.5 -420.0Q2222 -356 2222 -273Q2222 -191 2182.5 -126.5Q2143 -62 2077.0 -25.0Q2011 12 1930 12ZM1930 -123Q1971 -123 2001.5 -142.0Q2032 -161 2049.5 -195.0Q2067 -229 2067 -273Q2067 -317 2049.5 -350.5Q2032 -384 2001.5 -403.5Q1971 -423 1930 -423Q1889 -423 1858.0 -403.5Q1827 -384 1809.5 -350.5Q1792 -317 1792 -273Q1792 -229 1809.5 -195.0Q1827 -161 1858.0 -142.0Q1889 -123 1930 -123Z" fill="currentColor"/></svg>`;

  // ================= Penyimpanan data siswa / tamu =================
  const Store = {
    me: null,          // data siswa dari server
    progress: {},      // misiId → {bintang, jumlahBlok, percobaan, selesai, solusi, diperbarui}
    projects: [],
    tugas: [],
    settings: {},
    _loadedAt: 0,

    guestKey(k) { return 'algo_guest_' + k; },
    readJSON(k, d) { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } },
    writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { UI.toast('Penyimpanan perangkat penuh.', 'err'); return false; } },

    loadGuest() {
      this.me = { nama: 'Tamu', kelasNama: 'Mode Coba' };
      this.progress = this.readJSON(this.guestKey('progress'), {});
      this.projects = this.readJSON(this.guestKey('projects'), []).map(p => this._meta(p));
      this.tugas = [];
      this.settings = App.info || {};
    },
    _meta(p) { return { id: p.id, judul: p.judul, diperbarui: p.diperbarui, pratinjau: p.pratinjau, tugasId: '' }; },

    _ck() { return 'algo_me_' + (Api.user && Api.user.id); },

    // tampilkan dulu data yang tersimpan di perangkat (tanpa menunggu server)
    hydrate() {
      if (App.role === 'tamu') { if (!this.me) this.loadGuest(); return true; }
      if (this.me) return true;
      const cached = this.readJSON(this._ck(), null);
      if (cached && cached.siswa) { this.applyMe(cached); this._loadedAt = Number(cached._t) || 0; return true; }
      return false;
    },
    fresh() { return App.role === 'tamu' || (this.me && Date.now() - this._loadedAt < FRESH_MS); },

    // salinan di perangkat ikut diperbarui setelah simpan (buka berikutnya langsung benar)
    _persist() {
      if (App.role === 'tamu') return;
      const cached = this.readJSON(this._ck(), null);
      if (!cached) return;
      cached.progres = Object.values(this.progress); cached.proyek = this.projects; cached.tugas = this.tugas;
      try { localStorage.setItem(this._ck(), JSON.stringify(cached)); } catch (e) { /* penuh: abaikan */ }
    },

    // ---------- salinan isi proyek di perangkat (maks. 6 proyek terakhir) ----------
    _pcKey(id) { return 'algo_pc_' + (Api.user && Api.user.id) + '_' + id; },
    _pcGet(id) { return this.readJSON(this._pcKey(id), null); },
    _pcPut(id, at, text) {
      const ik = 'algo_pc_idx_' + (Api.user && Api.user.id);
      let idx = this.readJSON(ik, []).filter(x => x !== id);
      idx.unshift(id);
      idx.slice(6).forEach(x => { try { localStorage.removeItem(this._pcKey(x)); } catch (e) { /* abaikan */ } });
      idx = idx.slice(0, 6);
      try { localStorage.setItem(this._pcKey(id), JSON.stringify({ d: at, t: text })); localStorage.setItem(ik, JSON.stringify(idx)); }
      catch (e) { idx.forEach(x => { try { localStorage.removeItem(this._pcKey(x)); } catch (e2) { /* abaikan */ } }); try { localStorage.removeItem(ik); } catch (e3) { /* abaikan */ } }
    },
    _pcDel(id) { try { localStorage.removeItem(this._pcKey(id)); } catch (e) { /* abaikan */ } },

    applyMe(r) {
      this.me = r.siswa;
      this.settings = r.settings || {};
      this.progress = {};
      (r.progres || []).forEach(p => { this.progress[p.misiId] = p; });
      this.projects = r.proyek || [];
      this.tugas = r.tugas || [];
      if (r.settings) { App.info = Object.assign(App.info || {}, r.settings); localStorage.setItem('algo_info', JSON.stringify(App.info)); }
    },

    async loadMe(force) {
      if (App.role === 'tamu') { this.loadGuest(); return true; }
      this.hydrate();
      if (!force && this.fresh()) return true;
      const r = await Api.q('me');
      if (r && r.success) {
        this.applyMe(r);
        this._loadedAt = Date.now();
        r._t = this._loadedAt;
        try { localStorage.setItem(this._ck(), JSON.stringify(r)); } catch (e) { /* penuh: tetap jalan */ }
        return true;
      }
      if (!this.me) { UI.toast((r && r.message) || 'Gagal memuat data.', 'err'); return false; }
      return true;
    },

    done(id) { const p = this.progress[id]; return !!(p && (p.selesai === true || p.selesai === 'TRUE' || p.bintang > 0)); },
    unlocked(id) { return id === 1 || this.done(id - 1) || !!(App.info && App.info.bukaSemuaMisi); },
    totals() {
      let done = 0, stars = 0;
      AM.MISSIONS.forEach(m => { const p = this.progress[m.id]; if (this.done(m.id)) { done++; stars += Number(p.bintang) || 0; } });
      return { done, stars };
    },

    async saveMission(r) {
      const old = this.progress[r.misiId] || {};
      const better = !old.bintang || r.bintang >= Number(old.bintang);
      this.progress[r.misiId] = {
        misiId: r.misiId, selesai: true,
        bintang: Math.max(Number(old.bintang) || 0, r.bintang),
        jumlahBlok: better ? r.jumlahBlok : old.jumlahBlok,
        percobaan: (Number(old.percobaan) || 0) + (r.percobaan || 1),
        solusi: better ? r.solusi : old.solusi,
        diperbarui: new Date().toISOString()
      };
      if (App.role === 'tamu') { this.writeJSON(this.guestKey('progress'), this.progress); return; }
      this._persist();
      const res = await Api.saveProgress({ misiId: r.misiId, bintang: r.bintang, jumlahBlok: r.jumlahBlok, percobaan: r.percobaan || 1, solusi: JSON.stringify(r.solusi) });
      if (!res || !res.success) UI.toast(res && res.offline ? 'Kemajuan disimpan di perangkat dan akan dikirim saat internet tersambung.' : ((res && res.message) || 'Kemajuan gagal dikirim.'), res && res.offline ? 'info' : 'err', 4200);
    },

    // ---------- proyek ----------
    async getProject(id) {
      if (App.role === 'tamu') {
        const p = this.readJSON(this.guestKey('projects'), []).find(x => x.id === id);
        return p ? { meta: this._meta(p), data: p.data } : null;
      }
      // salinan di perangkat masih sama dengan versi terakhir di server → buka seketika
      const meta = this.projects.find(x => x.id === id);
      const c = this._pcGet(id);
      if (c && meta && c.d && c.d === meta.diperbarui) {
        let data = null; try { data = JSON.parse(c.t); } catch (e) { data = null; }
        if (data) return { meta, data, fromCache: true };
      }
      const r = await Api.call('getProject', { id });
      if (!r || !r.success) { UI.toast((r && r.message) || 'Proyek tidak ditemukan.', 'err'); return null; }
      let data = null; try { data = JSON.parse(r.data); } catch (e) { data = null; }
      if (data) this._pcPut(id, r.proyek.diperbarui, r.data);
      return { meta: r.proyek, data };
    },

    async saveProject(meta, data) {
      const pratinjau = JSON.stringify({ bd: data.backdrop, sp: data.sprites.slice(0, 4).map(s => [s.asset, s.costume]) });
      if (App.role === 'tamu') {
        const list = this.readJSON(this.guestKey('projects'), []);
        let p = list.find(x => x.id === meta.id);
        if (!p) { p = { id: meta.id || AM.newId() }; list.unshift(p); }
        Object.assign(p, { judul: data.name, data, pratinjau, diperbarui: new Date().toISOString() });
        if (!this.writeJSON(this.guestKey('projects'), list)) return { ok: false, msg: 'Penyimpanan perangkat penuh.' };
        this.projects = list.map(x => this._meta(x));
        return { ok: true, id: p.id, diperbarui: p.diperbarui, msg: 'Tersimpan di perangkat ini.' };
      }
      const text = JSON.stringify(data);
      if (text.length > 178000) return { ok: false, msg: 'Proyek terlalu besar untuk disimpan (maks. ±180 KB). Kurangi jumlah blok atau tokoh.' };
      const r = await Api.call('saveProject', { id: meta.id || '', judul: data.name, tugasId: meta.tugasId || '', data: text, pratinjau });
      if (!r || !r.success) return { ok: false, msg: (r && r.message) || 'Gagal menyimpan.' };
      const i = this.projects.findIndex(x => x.id === r.proyek.id);
      if (i >= 0) this.projects[i] = r.proyek; else this.projects.unshift(r.proyek);
      this._pcPut(r.proyek.id, r.proyek.diperbarui, text);
      this._persist();
      return { ok: true, id: r.proyek.id, diperbarui: r.proyek.diperbarui };
    },

    async deleteProject(id) {
      if (App.role === 'tamu') {
        const list = this.readJSON(this.guestKey('projects'), []).filter(x => x.id !== id);
        this.writeJSON(this.guestKey('projects'), list);
        this.projects = list.map(x => this._meta(x));
        return true;
      }
      const r = await Api.call('deleteProject', { id });
      if (!r || !r.success) { UI.toast((r && r.message) || 'Gagal menghapus.', 'err'); return false; }
      this.projects = this.projects.filter(x => x.id !== id);
      this._pcDel(id); this._persist();
      return true;
    }
  };

  // ================= Aplikasi =================
  const App = {
    role: null,     // siswa | guru | tamu
    info: null,
    view: null,

    init() {
      this.view = document.getElementById('app');
      try { this.info = JSON.parse(localStorage.getItem('algo_info') || 'null') || {}; } catch (e) { this.info = {}; }
      if (Api.token && Api.user) this.role = Api.user.role === 'g' ? 'guru' : 'siswa';
      else if (localStorage.getItem('algo_guest') === '1') this.role = 'tamu';
      else this.role = null;
      Api.onAuthLost = (msg) => { UI.toast(msg || 'Sesi berakhir. Silakan masuk lagi.', 'err', 4000); this.role = null; Store.me = null; this._forgetGuru(); location.hash = '#/masuk'; };
      Assets.preload();
      window.addEventListener('hashchange', () => this.route());
      if (Api.configured()) this.refreshInfo();
      this.route();
    },

    _forgetGuru() { const G = global.AlgoGuru; if (G) { G.data = null; G._at = 0; G.progress = {}; G.subs = {}; } },

    async refreshInfo() {
      const r = await Api.q('info');
      if (r && r.success) {
        this.info = r.settings || {};
        localStorage.setItem('algo_info', JSON.stringify(this.info));
        const s = document.querySelector('.school-name');
        if (s) s.textContent = this.info.namaSekolah || '';
        const g = document.querySelector('.guest-link');
        if (g) g.classList.toggle('hidden', this.info.izinkanTamu === false);
      }
    },

    parts() { return (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean); },

    async route() {
      const p = this.parts();
      const page = p[0] || '';
      const editorRoute = (page === 'misi' && p[1]) || (page === 'kreasi' && p[1]) || (page === 'guru' && (p[1] === 'proyek' || p[1] === 'solusi'));
      if (!editorRoute) Editor.close();
      document.body.classList.toggle('in-editor', !!editorRoute);

      if (!this.role) { if (page !== 'masuk') { location.replace('#/masuk'); return; } return this.pageLogin(); }
      if (page === 'masuk') { return this.pageLogin(); }
      if (this.role === 'guru') {
        if (page !== 'guru') { location.replace('#/guru'); return; }
        return global.AlgoGuru.route(this.view, p.slice(1), this);
      }
      if (page === 'guru') { location.replace('#/beranda'); return; }
      if (!Store.hydrate()) {
        // pertama kali di perangkat ini: belum ada salinan, tunggu server sekali
        this.view.innerHTML = '<div class="page-loading ed-loading"><i class="spin" aria-hidden="true"></i> Memuat data…</div>';
        await Store.loadMe(true);
        if (this.parts()[0] !== p[0] || this.parts()[1] !== p[1]) return;
      }
      if (!editorRoute) this.idlePreload();
      switch (page) {
        case 'misi': return p[1] ? this.openMission(+p[1]) : this.pageMap();
        case 'kreasi': return p[1] ? this.openProject(p[1], p[2]) : this.pageKreasi();
        case 'tugas': return this.pageTugas();
        default: return this.pageHome();
      }
    },

    // pustaka blok dipramuat setelah halaman tampil (membuka misi jadi instan)
    idlePreload() {
      if (this._pre || Editor.ready) return;
      this._pre = true;
      const run = () => Editor.preload();
      if (global.requestIdleCallback) global.requestIdleCallback(run, { timeout: 3500 }); else setTimeout(run, 1200);
    },

    // ---------- kerangka halaman ----------
    shell(active, html) {
      const role = this.role;
      const t = Store.tugas.filter(x => x.status !== 'tutup' && !(x.proyek && (x.proyek.dikumpulkan === true || x.proyek.dikumpulkan === 'TRUE'))).length;
      const nav = [
        ['beranda', '🏠', 'Beranda'], ['misi', '🗺️', 'Misi'], ['kreasi', '🎨', 'Kreasi']
      ];
      if (role === 'siswa') nav.push(['tugas', '📋', 'Tugas']);
      this.view.innerHTML = `
        <div class="shell">
          <header class="topbar">
            <a class="brand" href="#/beranda" aria-label="Algo, ke beranda">${LOCKUP}${ICON}</a>
            <nav class="topnav" aria-label="Menu utama">
              ${nav.map(n => `<a href="#/${n[0]}" class="${active === n[0] ? 'on' : ''}"><span class="ni">${n[1]}</span><span class="nl">${n[2]}</span>${n[0] === 'tugas' && t ? `<b class="badge">${t}</b>` : ''}</a>`).join('')}
            </nav>
            <div class="userbox">
              ${role === 'tamu'
                ? `<span class="chip chip-guest">Mode Coba</span>${Api.configured() ? '<button type="button" class="btn btn-sm btn-ghost go-login">Masuk</button>' : ''}`
                : `<button type="button" class="user-chip" aria-label="Akun"><span class="av">${esc((Store.me && Store.me.nama || '?').charAt(0).toUpperCase())}</span><span class="un">${esc(Store.me ? Store.me.nama : '')}</span></button>`}
            </div>
          </header>
          <main class="page">${html}</main>
        </div>`;
      const gl = this.view.querySelector('.go-login');
      if (gl) gl.addEventListener('click', () => { localStorage.removeItem('algo_guest'); this.role = null; Store.me = null; location.hash = '#/masuk'; });
      const uc = this.view.querySelector('.user-chip');
      if (uc) uc.addEventListener('click', () => this.accountMenu());
      window.scrollTo(0, 0);
    },

    accountMenu() {
      const me = Store.me || {};
      UI.modal({
        title: 'Akun', body: `<div class="acct"><div class="av big">${esc((me.nama || '?').charAt(0).toUpperCase())}</div><div><b>${esc(me.nama || '')}</b><div class="muted">${esc(me.kelasNama || '')} · ${esc(me.username || '')}</div></div></div>`,
        actions: [{ label: 'Tutup', cls: 'btn-ghost' }, { label: 'Keluar', cls: 'btn-danger', onClick: () => this.logout() }]
      });
    },

    async logout() {
      Editor.close();
      if (Api.token) Api.call('logout', {});
      Api.clearSession();
      localStorage.removeItem('algo_guest');
      Object.keys(localStorage).filter(k => /^algo_(me_|guru_boot)/.test(k)).forEach(k => localStorage.removeItem(k));
      Store.me = null; Store.progress = {}; Store.projects = []; Store.tugas = []; Store._loadedAt = 0;
      this._forgetGuru();
      this.role = null;
      location.hash = '#/masuk';
    },

    // ---------- halaman masuk ----------
    pageLogin() {
      const ok = Api.configured();
      const info = this.info || {};
      const demo = global.ALGO_DEMO_NOTE;
      this.view.innerHTML = `
        <div class="login-page">
          <div class="login-card">
            <h1 class="brand-big">${LOCKUP}</h1>
            <p class="tagline">Belajar algoritma dengan menyusun blok, langkah demi langkah.</p>
            <div class="school-name">${esc(info.namaSekolah || '')}</div>
            ${ok ? `
              <div class="tabs" role="tablist">
                <button type="button" role="tab" data-r="s" class="on" aria-selected="true">Saya Siswa</button>
                <button type="button" role="tab" data-r="g" aria-selected="false">Saya Guru</button>
              </div>
              ${demo ? `<div class="demo-note">
                <b>Mode demo</b> — data contoh, tersimpan di perangkat ini saja.
                <div class="demo-cred"><span>Siswa: kelas <code>${esc(demo.siswa.kelas)}</code> · <code>${esc(demo.siswa.nama)}</code> · NISN <code>${esc(demo.siswa.p)}</code></span><span>Guru: <code>${esc(demo.guru.u)}</code> / <code>${esc(demo.guru.p)}</code></span></div>
                <div class="demo-act"><button type="button" class="btn btn-sm btn-ghost demo-fill">Isi otomatis</button><button type="button" class="link demo-reset">Atur ulang data demo</button></div>
              </div>` : ''}
              <form class="login-form" novalidate>
                <div class="pick">
                  <label class="field"><span>Kelas</span><select class="input" name="kelas"><option value="">Memuat daftar kelas…</option></select></label>
                  <label class="field"><span>Nama</span><select class="input" name="sid" disabled><option value="">— Pilih kelas dulu —</option></select></label>
                </div>
                <label class="field f-user hidden"><span>Nama pengguna</span><input class="input" name="u" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="contoh: 7a-sari"></label>
                <label class="field"><span class="pl">NISN</span>
                  <span class="pw-wrap"><input class="input" name="p" type="password" inputmode="numeric" autocomplete="current-password" placeholder="10 angka NISN" maxlength="12"><button type="button" class="pw-eye" aria-label="Tampilkan" title="Tampilkan">👁</button></span>
                  <small class="muted f-hint">Belum punya NISN di Algo? Isi PIN dari gurumu.</small>
                </label>
                <div class="form-err hidden" role="alert"></div>
                <button type="submit" class="btn btn-primary btn-block btn-lg">Masuk</button>
                <button type="button" class="link mode-switch hidden">Namamu tidak ada? Masuk dengan nama pengguna</button>
              </form>
              <button type="button" class="link guest-link ${info.izinkanTamu === false ? 'hidden' : ''}">Coba dulu tanpa akun →</button>
            ` : `
              <div class="notice">
                <b>Algo belum terhubung ke server sekolah.</b>
                <p>Kamu tetap bisa belajar dalam <b>Mode Coba</b>. Kemajuanmu tersimpan di perangkat ini saja.</p>
                <p class="muted small">Untuk guru: isi <code>GAS_URL</code> di <code>js/config.js</code> agar fitur masuk siswa & pemantauan aktif.</p>
              </div>
              <button type="button" class="btn btn-primary btn-block btn-lg guest-link">Mulai Mode Coba</button>
            `}
          </div>
          <div class="login-art" aria-hidden="true">
            <div class="art-stage">
              <img src="${Assets.backdropUrl('taman')}" class="art-bg" alt="">
              <img src="${Assets.costumeUrl('algo', 'senang')}" class="art-hero" alt="">
              <img src="${Assets.costumeUrl('bintang', 'berkilau')}" class="art-star" alt="">
              <div class="art-bubble">Halo! Ayo menyusun blok bersamaku.</div>
            </div>
            <div class="art-stack">
              <span class="mb mb-ev">ketika ▶ Jalankan diklik</span>
              <span class="mb mb-co">ulangi <i>3</i> kali</span>
              <span class="mb mb-mo in">maju <i>50</i> langkah</span>
              <span class="mb mb-mo in">putar kiri ↺ <i>90</i> derajat</span>
              <span class="mb mb-lo">katakan <i>Hore!</i></span>
            </div>
          </div>
        </div>`;
      const v = this.view;
      v.querySelectorAll('.guest-link').forEach(b => b.addEventListener('click', () => {
        localStorage.setItem('algo_guest', '1');
        this.role = 'tamu';
        Store.loadGuest();
        location.hash = '#/beranda';
      }));
      this.idlePreload();
      if (!ok) return;
      Api.warm('pub');

      const f = v.querySelector('.login-form');
      const selK = f.kelas, selS = f.sid, pw = f.p;
      const err = v.querySelector('.form-err');
      const showErr = (m) => { err.textContent = m; err.classList.toggle('hidden', !m); };
      let role = 's';
      let typed = false;      // siswa mengetik nama pengguna (bila daftar nama dimatikan / namanya tidak ada)
      let daftar = null;      // {aktif, kelas:[{id, nama, siswa:[{id, nama}]}]}

      // tampilan formulir sesuai peran & cara masuk
      const mode = () => {
        const pick = role === 's' && !typed && daftar && daftar.aktif !== false;
        v.querySelector('.pick').classList.toggle('hidden', !pick);
        v.querySelector('.f-user').classList.toggle('hidden', pick);
        v.querySelector('.pl').textContent = role === 's' ? (pick ? 'NISN' : 'NISN (atau PIN)') : 'Kata sandi';
        pw.setAttribute('inputmode', role === 's' ? 'numeric' : 'text');
        pw.placeholder = role === 's' ? '10 angka NISN' : 'kata sandi guru';
        f.u.placeholder = role === 's' ? 'contoh: 7a-sari' : 'contoh: guru';
        v.querySelector('.f-hint').classList.toggle('hidden', role !== 's');
        const sw = v.querySelector('.mode-switch');
        sw.classList.toggle('hidden', role !== 's' || !daftar || daftar.aktif === false);
        sw.textContent = typed ? '← Pilih kelas & nama dari daftar' : 'Namamu tidak ada? Masuk dengan nama pengguna';
      };

      // isi pilihan kelas & nama (pilihan sebelumnya dipertahankan)
      const fillKelas = () => {
        const list = (daftar && daftar.kelas) || [];
        const keep = selK.value || (() => { try { return localStorage.getItem('algo_last_kelas') || ''; } catch (e) { return ''; } })();
        selK.innerHTML = '<option value="">— Pilih kelasmu —</option>' + list.map(k => `<option value="${esc(k.id)}">${esc(k.nama)}</option>`).join('');
        if (list.some(k => k.id === keep)) selK.value = keep;
        fillNama();
      };
      const fillNama = () => {
        const k = ((daftar && daftar.kelas) || []).find(x => x.id === selK.value);
        const keep = selS.value;
        selS.disabled = !k;
        selS.innerHTML = k ? '<option value="">— Pilih namamu —</option>' + k.siswa.map(x => `<option value="${esc(x.id)}">${esc(x.nama)}</option>`).join('')
          : '<option value="">— Pilih kelas dulu —</option>';
        if (k && k.siswa.some(x => x.id === keep)) selS.value = keep;
      };
      selK.addEventListener('change', () => { showErr(''); fillNama(); try { localStorage.setItem('algo_last_kelas', selK.value); } catch (e) { /* abaikan */ } if (selK.value) selS.focus(); });
      selS.addEventListener('change', () => { showErr(''); if (selS.value) pw.focus(); });

      // daftar kelas & nama: tampil seketika dari salinan perangkat, lalu diperbarui dari server
      try { const c = JSON.parse(localStorage.getItem('algo_daftar') || 'null'); if (c && c.kelas) daftar = c; } catch (e) { daftar = null; }
      if (daftar) fillKelas();
      mode();
      const loading = Api.q('daftarMasuk').then(r => {
        if (!v.contains(f)) return;
        if (r && r.success) {
          daftar = { aktif: r.aktif, kelas: r.kelas };
          try { localStorage.setItem('algo_daftar', JSON.stringify(daftar)); } catch (e) { /* abaikan */ }
          fillKelas();
        } else if (!daftar) {
          typed = true;  // daftar tidak bisa dimuat → tetap bisa masuk dengan nama pengguna
          selK.innerHTML = '<option value="">Daftar kelas tidak bisa dimuat</option>';
          if (r && r.message && /Perintah tidak dikenal/.test(r.message)) daftar = { aktif: false, kelas: [] };
        }
        mode();
      });

      v.querySelector('.mode-switch').addEventListener('click', () => { typed = !typed; showErr(''); mode(); (typed ? f.u : selK).focus(); });
      v.querySelector('.pw-eye').addEventListener('click', (e) => {
        const show = pw.type === 'password';
        pw.type = show ? 'text' : 'password';
        e.currentTarget.textContent = show ? '🙈' : '👁';
        e.currentTarget.setAttribute('aria-label', show ? 'Sembunyikan' : 'Tampilkan');
        pw.focus();
      });
      v.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
        role = b.dataset.r;
        v.querySelectorAll('.tabs button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
        showErr(''); mode();
        if (role === 'g') Api.warm('guru');
      }));
      const df = v.querySelector('.demo-fill');
      if (df) df.addEventListener('click', async () => {
        if (role === 'g') { f.u.value = demo.guru.u; pw.value = demo.guru.p; return; }
        await loading;
        const k = ((daftar && daftar.kelas) || []).find(x => x.nama === demo.siswa.kelas);
        if (k && !typed) {
          selK.value = k.id; fillNama();
          const s = k.siswa.find(x => x.nama === demo.siswa.nama);
          if (s) selS.value = s.id;
        } else f.u.value = demo.siswa.u;
        pw.value = demo.siswa.p;
      });
      const dr = v.querySelector('.demo-reset');
      if (dr) dr.addEventListener('click', async () => { if (await UI.confirmBox('Hapus semua data demo dan mulai dari data contoh awal?', { ok: 'Atur ulang' })) global.AlgoDemo.reset(); });

      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pick = role === 's' && !typed && daftar && daftar.aktif !== false;
        const pass = pw.value.trim();
        const data = { role, password: pass };
        if (pick) {
          if (!selK.value) { showErr('Pilih kelasmu dulu.'); selK.focus(); return; }
          if (!selS.value) { showErr('Pilih namamu dulu.'); selS.focus(); return; }
          data.siswaId = selS.value;
        } else {
          data.username = f.u.value.trim();
          if (!data.username) { showErr('Isi nama pengguna.'); f.u.focus(); return; }
        }
        if (!pass) { showErr(role === 's' ? 'Isi NISN-mu (10 angka).' : 'Isi kata sandi.'); pw.focus(); return; }
        showErr('');
        const done = UI.busy(f.querySelector('button[type=submit]'), 'Memeriksa…');
        const r = await Api.call('login', data);
        done();
        if (!r || !r.success) { showErr((r && r.message) || 'Gagal masuk.'); return; }
        localStorage.removeItem('algo_guest');
        Api.setSession(r.token, r.user);
        this.role = r.user.role === 'g' ? 'guru' : 'siswa';
        Store.me = null;
        if (this.role === 'siswa' && r.boot) { Store.applyMe(r.boot); Store._loadedAt = Date.now(); r.boot._t = Store._loadedAt; Store.writeJSON('algo_me_' + r.user.id, r.boot); }
        if (this.role === 'guru' && r.boot) { r.boot._t = Date.now(); r.boot.v = r.v; global.AlgoGuru.setData(r.boot); }
        location.hash = this.role === 'guru' ? '#/guru' : '#/beranda';
      });
    },

    // ---------- beranda siswa ----------
    pageHome() {
      const me = Store.me || {};
      const t = Store.totals();
      const next = AM.MISSIONS.find(m => !Store.done(m.id)) || null;
      const pct = Math.round(t.done / AM.MISSIONS.length * 100);
      const tugasAktif = Store.tugas.filter(x => x.status !== 'tutup');
      const belum = tugasAktif.filter(x => !(x.proyek && (x.proyek.dikumpulkan === true || x.proyek.dikumpulkan === 'TRUE')));
      this.shell('beranda', `
        <section class="hero-card">
          <div class="hc-text">
            <div class="hc-hi">Halo, ${esc((me.nama || 'teman').split(' ')[0])}! 👋</div>
            <p>${this.role === 'tamu' ? 'Kamu sedang di Mode Coba. Kemajuanmu tersimpan di perangkat ini.' : esc(me.kelasNama ? 'Kelas ' + me.kelasNama : '')}</p>
            ${next ? `<a class="btn btn-primary btn-lg" href="#/misi/${next.id}">${t.done ? 'Lanjutkan' : 'Mulai'} Misi ${next.id}: ${esc(next.judul)} →</a>` : '<a class="btn btn-primary btn-lg" href="#/kreasi">Semua misi selesai! Buat karyamu →</a>'}
          </div>
          <div class="hc-progress">
            <div class="ring" style="--p:${pct}"><div><b>${t.done}</b><span>/ ${AM.MISSIONS.length} misi</span></div></div>
            <div class="hc-stars">★ ${t.stars} <span>/ ${AM.MISSIONS.length * 3} bintang</span></div>
          </div>
        </section>
        <section class="tiles">
          <a class="tile tile-misi" href="#/misi"><span class="ti">🗺️</span><b>Misi Belajar</b><small>${AM.MISSIONS.length} misi bertahap dari nol: urutan, perulangan, kejadian, percabangan, variabel, sampai membuat cerita dan game.</small></a>
          <a class="tile tile-kreasi" href="#/kreasi"><span class="ti">🎨</span><b>Kreasi Bebas</b><small>Buat cerita, animasi, dan game dengan tokohmu sendiri.</small></a>
          ${this.role === 'siswa' ? `<a class="tile tile-tugas" href="#/tugas"><span class="ti">📋</span><b>Tugas dari Guru</b><small>${belum.length ? belum.length + ' tugas belum dikumpulkan' : 'Tidak ada tugas yang menunggu.'}</small>${belum.length ? `<b class="badge">${belum.length}</b>` : ''}</a>` : ''}
        </section>
        <section class="tips">
          <h3>Kenalan dengan blok</h3>
          <div class="tip-grid">
            <div class="tip"><span class="mb mb-ev">ketika ▶ Jalankan diklik</span><p><b>Kejadian</b> — pembuka program.</p></div>
            <div class="tip"><span class="mb mb-mo">maju <i>10</i> langkah</span><p><b>Gerak</b> — memindahkan tokoh.</p></div>
            <div class="tip"><span class="mb mb-co">ulangi <i>10</i> kali</span><p><b>Kendali</b> — mengulang & memilih.</p></div>
            <div class="tip"><span class="mb mb-lo">katakan <i>Halo!</i></span><p><b>Tampilan</b> — bicara & ganti gaya.</p></div>
          </div>
        </section>`);
      if (this.role === 'siswa') this._refreshInBackground('beranda');
    },

    _refreshInBackground(page) {
      if (Store.fresh()) return; // baru saja dimuat → tidak perlu ke server
      const snap = () => JSON.stringify([Store.me, Store.progress, Store.tugas, Store.projects, Store.settings]);
      const before = snap();
      Store.loadMe(true).then(() => {
        if (snap() !== before && (this.parts()[0] || 'beranda') === page && !this.parts()[1] && !UI.topModal()) this.route();
      });
    },

    // ---------- peta misi ----------
    pageMap() {
      const html = AM.BAB.map(b => {
        const ms = AM.MISSIONS.filter(m => m.bab === b.no);
        return `<section class="bab" style="--bab:${b.warna}">
          <h3><span class="bab-ico">${b.ikon}</span> Bab ${b.no} · ${esc(b.judul)}</h3>
          <div class="mission-row">${ms.map(m => {
            const p = Store.progress[m.id];
            const done = Store.done(m.id), open = Store.unlocked(m.id);
            return `<a class="mcard ${done ? 'done' : ''} ${open ? '' : 'locked'}" href="${open ? '#/misi/' + m.id : 'javascript:void(0)'}" ${open ? '' : 'aria-disabled="true"'} data-id="${m.id}">
              <span class="mc-num">${open ? m.id : '🔒'}</span>
              <span class="mc-icon">${m.ikon}</span>
              <b>${esc(m.judul)}</b>
              <small>${esc(m.konsep)}</small>
              ${done ? UI.stars(Number(p.bintang) || 0) : (open ? '<span class="mc-go">Mainkan →</span>' : '<span class="mc-lock">Selesaikan misi sebelumnya</span>')}
            </a>`;
          }).join('')}</div>
        </section>`;
      }).join('');
      const t = Store.totals();
      this.shell('misi', `<div class="page-head"><h2>Peta Misi</h2><p class="muted">${t.done} dari ${AM.MISSIONS.length} misi selesai · ★ ${t.stars}</p></div>${html}`);
      this.view.querySelectorAll('.mcard.locked').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); UI.toast('Selesaikan misi sebelumnya dulu, ya.', 'info'); }));
      if (this.role === 'siswa') this._refreshInBackground('misi');
    },

    openMission(id) {
      const m = AM.MISSIONS.find(x => x.id === id);
      if (!m) { location.replace('#/misi'); return; }
      if (!Store.unlocked(id)) { UI.toast('Misi ini masih terkunci.', 'info'); location.replace('#/misi'); return; }
      const p = Store.progress[id];
      let sol = p && p.solusi;
      if (typeof sol === 'string') { try { sol = JSON.parse(sol); } catch (e) { sol = null; } }
      this.view.innerHTML = '<div class="editor-host"></div>';
      Editor.open(this.view.firstChild, {
        mode: 'misi', mission: m, solution: sol || null, solutionAt: p && p.diperbarui,
        userKey: Api.user ? Api.user.id : 'tamu',
        onExit: () => { location.hash = '#/misi'; },
        onNext: (n) => { location.hash = '#/misi/' + n; },
        onMissionDone: (r) => Store.saveMission(r)
      });
    },

    // ---------- kreasi ----------
    pageKreasi() {
      const projs = Store.projects.filter(p => !p.tugasId);
      const tpl = AM.TEMPLATES.map(t => `<button type="button" class="tpl" data-t="${t.id}"><span class="tpl-ico">${t.ikon}</span><b>${esc(t.judul)}</b><small>${esc(t.ket)}</small></button>`).join('');
      this.shell('kreasi', `
        <div class="page-head"><h2>Kreasi Bebas</h2><p class="muted">Buat cerita, animasi, atau game sesukamu.</p></div>
        <section><h3 class="sec-title">Mulai proyek baru</h3><div class="tpl-row">${tpl}
          <button type="button" class="tpl tpl-file"><span class="tpl-ico">📂</span><b>Buka dari file</b><small>File .algo dari perangkatmu.</small></button></div></section>
        <section><h3 class="sec-title">Proyek saya ${this.role === 'tamu' ? '<span class="chip">tersimpan di perangkat ini</span>' : ''}</h3>
          ${projs.length ? `<div class="proj-grid">${projs.map(p => this.projCard(p)).join('')}</div>` : '<div class="empty">Belum ada proyek. Pilih salah satu cara mulai di atas.</div>'}
        </section>`);
      const v = this.view;
      v.querySelectorAll('.tpl[data-t]').forEach(b => b.addEventListener('click', () => { location.hash = '#/kreasi/baru/' + b.dataset.t; }));
      v.querySelector('.tpl-file').addEventListener('click', async () => {
        const f = await UI.pickFile('.algo,.json,application/json');
        if (!f) return;
        let p = null; try { const j = JSON.parse(f.text); p = j && j.project ? j.project : j; } catch (e) { p = null; }
        if (!Editor.validProject(p)) { UI.toast('File ini bukan proyek Algo.', 'err'); return; }
        this._pendingProject = p;
        location.hash = '#/kreasi/baru/file';
      });
      this.bindProjCards();
      if (this.role === 'siswa') this._refreshInBackground('kreasi');
    },

    projCard(p) {
      let pv = null; try { pv = typeof p.pratinjau === 'string' ? JSON.parse(p.pratinjau) : p.pratinjau; } catch (e) { pv = null; }
      const bd = pv && pv.bd ? Assets.backdropUrl(pv.bd) : Assets.backdropUrl('polos');
      const sps = pv && pv.sp ? pv.sp : [['algo', 'berdiri']];
      return `<div class="proj" data-id="${esc(p.id)}">
        <a class="proj-thumb" href="#/kreasi/${esc(p.id)}" style="background-image:url('${bd}')">${sps.map((s, i) => `<img src="${Assets.costumeUrl(s[0], s[1])}" alt="" style="--i:${i}">`).join('')}</a>
        <div class="proj-info"><b>${esc(p.judul || 'Tanpa judul')}</b><small>${esc(UI.fmtRelative(p.diperbarui))}</small></div>
        <button type="button" class="icon-btn sm proj-del" aria-label="Hapus proyek" title="Hapus">🗑️</button>
      </div>`;
    },

    bindProjCards() {
      this.view.querySelectorAll('.proj-del').forEach(b => b.addEventListener('click', async () => {
        const card = b.closest('.proj'); const id = card.dataset.id;
        const p = Store.projects.find(x => x.id === id);
        const ok = await UI.confirmBox(`Hapus proyek "${p ? p.judul : ''}"? Tindakan ini tidak bisa dibatalkan.`, { ok: 'Hapus', danger: true });
        if (!ok) return;
        const done = UI.busy(b);
        const del = await Store.deleteProject(id);
        done();
        if (del) { card.remove(); UI.toast('Proyek dihapus.', 'ok'); }
      }));
    },

    async openProject(id, extra) {
      let meta = { id: '', tugasId: '' }, data = null, savedAt = null;
      let tugas = null;
      if (id === 'baru') {
        if (extra === 'file' && this._pendingProject) { data = this._pendingProject; this._pendingProject = null; }
        else {
          const t = AM.TEMPLATES.find(x => x.id === extra) || AM.TEMPLATES[0];
          data = t.buat();
        }
      } else if (id === 'tugas') {
        tugas = Store.tugas.find(x => x.id === extra);
        if (!tugas) { UI.toast('Tugas tidak ditemukan.', 'err'); location.replace('#/tugas'); return; }
        if (tugas.proyek && tugas.proyek.id) {
          this.view.innerHTML = '<div class="page-loading ed-loading"><i class="spin" aria-hidden="true"></i> Memuat proyek…</div>';
          const r = await Store.getProject(tugas.proyek.id);
          if (!r) { location.replace('#/tugas'); return; }
          meta = r.meta; data = r.data; savedAt = r.meta.diperbarui;
          if (r.fromCache) this._checkNewer(meta.id, savedAt);
        } else {
          data = AM.TEMPLATES[0].buat();
          data.name = tugas.judul;
          meta = { id: '', tugasId: tugas.id };
        }
      } else {
        this.view.innerHTML = '<div class="page-loading ed-loading"><i class="spin" aria-hidden="true"></i> Memuat proyek…</div>';
        const r = await Store.getProject(id);
        if (!r || !Editor.validProject(r.data)) { UI.toast('Proyek tidak bisa dibuka.', 'err'); location.replace('#/kreasi'); return; }
        meta = r.meta; data = r.data; savedAt = r.meta.diperbarui;
        if (meta.tugasId) tugas = Store.tugas.find(x => x.id === meta.tugasId) || null;
        if (r.fromCache) this._checkNewer(id, savedAt);
      }
      if (!this.parts()[1]) return; // pengguna sudah pindah halaman
      this.view.innerHTML = '<div class="editor-host"></div>';
      const back = tugas ? '#/tugas' : '#/kreasi';
      Editor.open(this.view.firstChild, {
        mode: 'kreasi', project: data, projectId: meta.id || (tugas ? 'tugas-' + tugas.id : 'baru'), savedAt,
        userKey: Api.user ? Api.user.id : 'tamu',
        tugas,
        onSave: async (d) => {
          const r = await Store.saveProject(meta, d);
          if (r.ok) {
            const wasNew = !meta.id;
            meta.id = r.id;
            if (wasNew && id !== 'tugas') history.replaceState(null, '', '#/kreasi/' + r.id);
            if (tugas) { tugas.proyek = Object.assign(tugas.proyek || {}, { id: r.id }); }
          }
          return r;
        },
        onSubmit: async () => {
          if (!tugas || !meta.id) return;
          const r = await Api.call('submitProject', { id: meta.id, kumpul: true });
          if (r && r.success) {
            tugas.proyek = Object.assign(tugas.proyek || {}, r.proyek);
            UI.confetti(50);
            UI.toast('Tugas berhasil dikumpulkan! Gurumu bisa melihatnya sekarang.', 'ok', 3600);
          } else UI.toast((r && r.message) || 'Gagal mengumpulkan.', 'err');
        },
        onExit: () => { location.hash = back; }
      });
    },

    // proyek dibuka dari salinan perangkat: pastikan tidak ada versi lebih baru (mis. disimpan di HP lain)
    _checkNewer(id, at) {
      if (App.role === 'tamu' || Store.fresh()) return;
      Store.loadMe(true).then(() => {
        const m = Store.projects.find(x => x.id === id);
        if (!m || m.diperbarui === at) return;
        const ed = Editor.current;
        const here = this.parts()[1] === id || (this.parts()[1] === 'tugas' && m.tugasId === this.parts()[2]);
        if (!here) return;
        if (ed && !ed.dirty) { UI.toast('Versi terbaru proyek ini dimuat.', 'info'); this.route(); }
        else UI.toast('Proyek ini baru saja diubah di perangkat lain. Simpan akan menimpa versi itu.', 'info', 5000);
      });
    },

    // ---------- tugas (siswa) ----------
    pageTugas() {
      if (this.role !== 'siswa') { location.replace('#/beranda'); return; }
      const list = Store.tugas.slice().sort((a, b) => (a.status === 'tutup') - (b.status === 'tutup') || String(a.batas || '9').localeCompare(String(b.batas || '9')));
      const card = (t) => {
        const pr = t.proyek;
        const sent = pr && (pr.dikumpulkan === true || pr.dikumpulkan === 'TRUE');
        const graded = pr && pr.nilai !== '' && pr.nilai != null;
        const late = t.batas && new Date(t.batas + 'T23:59:59') < new Date();
        let st = '<span class="chip chip-warn">Belum dikerjakan</span>';
        if (pr && pr.id && !sent) st = '<span class="chip chip-info">Sedang dikerjakan</span>';
        if (sent) st = '<span class="chip chip-ok">Sudah dikumpulkan</span>';
        if (graded) st = `<span class="chip chip-grade">Nilai: ${esc(pr.nilai)}</span>`;
        return `<article class="task ${t.status === 'tutup' ? 'closed' : ''}">
          <div class="task-head"><h3>${esc(t.judul)}</h3>${st}</div>
          <p class="task-desc">${esc(t.petunjuk || '').replace(/\n/g, '<br>')}</p>
          <div class="task-meta">
            <span>📅 Batas: ${t.batas ? esc(UI.fmtDate(t.batas)) : 'tidak ada'} ${late && !sent && t.status !== 'tutup' ? '<b class="late">(lewat batas)</b>' : ''}</span>
            ${t.status === 'tutup' ? '<span>🔒 Ditutup guru</span>' : ''}
          </div>
          ${graded && pr.komentar ? `<div class="task-comment"><b>Komentar guru:</b> ${esc(pr.komentar)}</div>` : ''}
          <div class="task-actions">
            ${t.status === 'tutup' ? (pr && pr.id ? `<a class="btn btn-ghost" href="#/kreasi/tugas/${esc(t.id)}">Lihat karyaku</a>` : '')
              : `<a class="btn btn-primary" href="#/kreasi/tugas/${esc(t.id)}">${pr && pr.id ? 'Lanjutkan' : 'Mulai kerjakan'}</a>`}
          </div>
        </article>`;
      };
      this.shell('tugas', `<div class="page-head"><h2>Tugas dari Guru</h2><p class="muted">Kerjakan di Algo, lalu tekan <b>📤 Kumpulkan</b>.</p></div>
        ${list.length ? `<div class="task-list">${list.map(card).join('')}</div>` : '<div class="empty">Belum ada tugas untuk kelasmu.</div>'}`);
      this._refreshInBackground('tugas');
    }
  };

  global.ALGO_BUILD = '1.3.0';
  global.AlgoApp = App;
  global.AlgoStore = Store;
  global.AlgoLogo = LOCKUP;
  global.AlgoIcon = ICON;
  document.addEventListener('DOMContentLoaded', () => App.init());
})(window);
