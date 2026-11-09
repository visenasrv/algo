/* =========================================================
   ALGO — Panel Guru
   Ringkasan · Kelas & Siswa · Progres Misi · Tugas & Nilai · Pengaturan
   ========================================================= */
(function (global) {
  'use strict';
  const Api = global.AlgoApi;
  const UI = global.AlgoUI;
  const AM = global.AlgoMissions;
  const Editor = global.AlgoEditor;
  const esc = UI.esc;

  const G = {
    data: null,
    _at: 0,
    progress: {},      // kelasId → {rows, at}
    subs: {},          // tugasId → {rows, at}
    app: null,
    view: null,

    // ---------- data ----------
    // salinan di perangkat dipakai dulu; server dihubungi bila data > 60 detik
    hydrate() {
      if (this.data) return true;
      try {
        const c = JSON.parse(localStorage.getItem('algo_guru_boot') || 'null');
        if (c && c.guru) { this.data = c; this._at = Number(c._t) || 0; }
      } catch (e) { this.data = null; }
      return !!this.data;
    },
    fresh() { return this.data && Date.now() - this._at < 60000; },
    setData(r) {
      this.data = r; this._at = Number(r._t) || Date.now(); r._t = this._at;
      try { localStorage.setItem('algo_guru_boot', JSON.stringify(r)); } catch (e) { /* abaikan */ }
      if (r.settings && this.app) { this.app.info = Object.assign(this.app.info || {}, r.settings); try { localStorage.setItem('algo_info', JSON.stringify(this.app.info)); } catch (e) { /* abaikan */ } }
    },
    // force = abaikan batas kesegaran; reread = server membaca ulang SEMUA sheet (tombol "Segarkan data")
    async boot(force, reread) {
      this.hydrate();
      if (!force && this.fresh()) return true;
      const r = await Api.q('gBoot', reread ? { _fresh: true } : {});
      if (r && r.success) { r._t = Date.now(); this.setData(r); return true; }
      if (!this.data) { UI.toast((r && r.message) || 'Gagal memuat data guru.', 'err'); return false; }
      return true;
    },
    _snap() { const d = this.data || {}; return JSON.stringify([d.kelas, d.siswa, d.tugas, d.ringkas, d.aktivitas, d.settings]); },
    kelas(id) { return (this.data.kelas || []).find(k => k.id === id); },
    siswaOf(kelasId) { return (this.data.siswa || []).filter(s => s.kelasId === kelasId && s.aktif !== false && s.aktif !== 'FALSE').sort((a, b) => a.nama.localeCompare(b.nama)); },
    sum(sid) { return (this.data.ringkas && this.data.ringkas.perSiswa && this.data.ringkas.perSiswa[sid]) || { selesai: 0, bintang: 0, terakhir: '' }; },

    // simpan + minta data panel terbaru dalam SATU panggilan (_boot)
    async act(action, data, okMsg) {
      const r = await Api.call(action, Object.assign({}, data, { _boot: true }));
      if (!r || !r.success) { UI.toast((r && r.message) || 'Gagal menyimpan.', 'err', 4000); return null; }
      if (okMsg) UI.toast(okMsg, 'ok');
      this.progress = {}; this.subs = {};
      if (r.boot && r.boot.success) { r.boot._t = Date.now(); r.boot.v = r.v; this.setData(r.boot); }
      else await this.boot(true);
      return r;
    },

    // ---------- rute ----------
    async route(view, parts, app) {
      this.view = view; this.app = app;
      const page = parts[0] || 'ringkasan';
      if (page === 'proyek') return this.openProject(parts[1]);
      if (page === 'solusi') return this.openSolution(parts[1], +parts[2]);
      if (page === 'misi') return this.tryMission(+parts[1]);
      if (!this.hydrate()) {
        view.innerHTML = '<div class="page-loading ed-loading"><i class="spin" aria-hidden="true"></i> Memuat panel guru…</div>';
        const ok = await this.boot(true);
        if (!ok) { this.shell(page, '<div class="empty">Data tidak bisa dimuat. Periksa koneksi lalu muat ulang halaman.</div>'); return; }
      } else if (!this.fresh()) this._revalidate(location.hash);
      app.idlePreload();
      switch (page) {
        case 'kelas': return this.pageKelas(parts[1]);
        case 'progres': return this.pageProgres(parts[1]);
        case 'tugas': return parts[1] ? this.pageTugasDetail(parts[1]) : this.pageTugas();
        case 'pengaturan': return this.pageSettings();
        default: return this.pageHome();
      }
    },

    // segarkan di latar; tampilan diperbarui hanya bila data berubah & guru tidak sedang mengetik/membuka jendela
    _revalidate(hash) {
      const before = this._snap();
      this.boot(true).then(() => {
        if (this._snap() === before || location.hash !== hash || UI.topModal()) return;
        const a = document.activeElement;
        if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
        if (/\/pengaturan/.test(hash)) return;
        this.route(this.view, this.app.parts().slice(1), this.app);
      });
    },

    shell(active, html) {
      const g = this.data && this.data.guru || {};
      const nav = [['', '📊', 'Ringkasan'], ['kelas', '👥', 'Kelas & Siswa'], ['progres', '🗺️', 'Progres Misi'], ['tugas', '📋', 'Tugas & Nilai'], ['pengaturan', '⚙️', 'Pengaturan']];
      this.view.innerHTML = `
        <div class="shell guru">
          <header class="topbar">
            <a class="brand" href="#/guru" aria-label="Algo Guru, ke ringkasan">${global.AlgoLogo}${global.AlgoIcon}<em>Guru</em></a>
            <nav class="topnav" aria-label="Menu guru">
              ${nav.map(n => `<a href="#/guru${n[0] ? '/' + n[0] : ''}" class="${active === (n[0] || 'ringkasan') ? 'on' : ''}"><span class="ni">${n[1]}</span><span class="nl">${n[2]}</span></a>`).join('')}
            </nav>
            <div class="userbox"><button type="button" class="user-chip" aria-label="Akun"><span class="av">${esc((g.nama || 'G').charAt(0).toUpperCase())}</span><span class="un">${esc(g.nama || '')}</span></button></div>
          </header>
          <main class="page">${html}</main>
        </div>`;
      this.view.querySelector('.user-chip').addEventListener('click', () => {
        UI.modal({
          title: 'Akun Guru', body: `<div class="acct"><div class="av big">${esc((g.nama || 'G').charAt(0))}</div><div><b>${esc(g.nama || '')}</b><div class="muted">${esc(g.username || '')} · ${g.peran === 'admin' ? 'Admin' : 'Guru'}</div></div></div>`,
          actions: [{ label: 'Tutup', cls: 'btn-ghost' }, { label: 'Keluar', cls: 'btn-danger', onClick: () => this.app.logout() }]
        });
      });
      window.scrollTo(0, 0);
    },

    // ================= RINGKASAN =================
    pageHome() {
      const d = this.data;
      const siswa = (d.siswa || []).filter(s => s.aktif !== false && s.aktif !== 'FALSE');
      const ring = d.ringkas || {};
      const tugasAktif = (d.tugas || []).filter(t => t.status !== 'tutup');
      const kelasRows = (d.kelas || []).map(k => {
        const ss = this.siswaOf(k.id);
        const avg = ss.length ? ss.reduce((a, s) => a + (this.sum(s.id).selesai || 0), 0) / ss.length : 0;
        return `<a class="kbar" href="#/guru/progres/${esc(k.id)}"><span class="kb-name">${esc(k.nama)}</span><span class="kb-bar"><i style="width:${Math.round(avg / AM.MISSIONS.length * 100)}%"></i></span><span class="kb-val">${avg.toFixed(1)} / ${AM.MISSIONS.length} misi · ${ss.length} siswa</span></a>`;
      }).join('');
      const nameOf = (sid) => { const s = (d.siswa || []).find(x => x.id === sid); return s ? s.nama : 'Siswa'; };
      const act = (d.aktivitas || []).map(a => `<li><span class="act-ico">${a.jenis === 'misi' ? '⭐' : a.jenis === 'kumpul' ? '📤' : '💾'}</span><span><b>${esc(nameOf(a.siswaId))}</b> ${esc(a.ket)}</span><time>${esc(UI.fmtRelative(a.t))}</time></li>`).join('');
      const empty = !(d.kelas || []).length;
      this.shell('ringkasan', `
        <div class="page-head"><h2>Ringkasan</h2><p class="muted">${esc(d.settings && d.settings.namaSekolah || '')}</p></div>
        ${empty ? `<section class="onboard">
          <h3>Mulai dalam 3 langkah</h3>
          <ol><li><b>Buat kelas</b>, misalnya 7A.</li><li><b>Tambah siswa</b> — bisa tempel daftar nama dari Excel. Nama pengguna & PIN dibuat otomatis.</li><li><b>Cetak kartu masuk</b> dan bagikan alamat situs Algo ke siswa.</li></ol>
          <a class="btn btn-primary" href="#/guru/kelas">Buat kelas pertama →</a>
        </section>` : ''}
        <section class="kpis">
          <div class="kpi"><span>Siswa aktif</span><b>${siswa.length}</b><small>${(d.kelas || []).length} kelas</small></div>
          <div class="kpi"><span>Misi diselesaikan</span><b>${ring.misiSelesai || 0}</b><small>rata-rata ${siswa.length ? ((ring.misiSelesai || 0) / siswa.length).toFixed(1) : 0} per siswa</small></div>
          <div class="kpi"><span>Bintang terkumpul</span><b>★ ${ring.bintang || 0}</b><small>dari maks. ${siswa.length * AM.MISSIONS.length * 3}</small></div>
          <div class="kpi"><span>Tugas aktif</span><b>${tugasAktif.length}</b><small>${ring.menungguNilai || 0} karya menunggu dinilai</small></div>
        </section>
        <div class="two-col">
          <section class="card"><h3>Kemajuan per kelas</h3>${kelasRows || '<p class="muted">Belum ada kelas.</p>'}</section>
          <section class="card"><h3>Aktivitas terbaru</h3>${act ? `<ul class="act-list">${act}</ul>` : '<p class="muted">Belum ada aktivitas siswa.</p>'}</section>
        </div>
        <section class="card quick">
          <h3>Pintasan</h3>
          <div class="quick-row">
            <a class="btn btn-ghost" href="#/guru/kelas">👥 Kelola siswa</a>
            <a class="btn btn-ghost" href="#/guru/tugas">📋 Buat tugas</a>
            <button type="button" class="btn btn-ghost try-m">🎮 Coba misi seperti siswa</button>
            <button type="button" class="btn btn-ghost refresh">🔄 Segarkan data</button>
          </div>
        </section>`);
      this.view.querySelector('.refresh').addEventListener('click', async (e) => {
        const done = UI.busy(e.currentTarget, 'Menyegarkan…');
        await this.boot(true, true); done();
        this.pageHome(); UI.toast('Data diperbarui dari spreadsheet.', 'ok');
      });
      this.view.querySelector('.try-m').addEventListener('click', () => this.pickMission());
    },

    pickMission() {
      const body = document.createElement('div');
      body.className = 'menu-list';
      body.innerHTML = AM.MISSIONS.map(m => `<button type="button" data-id="${m.id}">${m.ikon} Misi ${m.id} · ${esc(m.judul)} <small class="muted">(${esc(m.konsep)})</small></button>`).join('');
      const md = UI.modal({ title: 'Coba misi (tidak disimpan)', body });
      body.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { md.close(); location.hash = '#/guru/misi/' + b.dataset.id; }));
    },

    tryMission(id) {
      const m = AM.MISSIONS.find(x => x.id === id);
      if (!m) { location.replace('#/guru'); return; }
      this.view.innerHTML = '<div class="editor-host"></div>';
      Editor.open(this.view.firstChild, {
        mode: 'misi', mission: m, userKey: 'guru',
        onExit: () => { location.hash = '#/guru'; },
        onNext: (n) => { location.hash = '#/guru/misi/' + n; },
        onMissionDone: () => { }
      });
    },

    // ================= KELAS & SISWA =================
    pageKelas(kelasId) {
      const d = this.data;
      const kelas = (d.kelas || []).slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id', { numeric: true }));
      if (!kelasId && kelas.length) kelasId = kelas[0].id;
      const k = this.kelas(kelasId);
      const ss = k ? this.siswaOf(k.id) : [];
      const chips = kelas.map(x => `<a class="kchip ${x.id === kelasId ? 'on' : ''}" href="#/guru/kelas/${esc(x.id)}">${esc(x.nama)} <small>${this.siswaOf(x.id).length}</small></a>`).join('');
      const rows = ss.map((s, i) => {
        const sm = this.sum(s.id);
        return `<tr data-id="${esc(s.id)}">
          <td class="num">${i + 1}</td>
          <td><b>${esc(s.nama)}</b></td>
          <td><code>${esc(s.username)}</code></td>
          <td><span class="pin" data-pin="${esc(s.pin)}">••••</span></td>
          <td>${sm.selesai || 0}/${AM.MISSIONS.length} <span class="muted">★${sm.bintang || 0}</span></td>
          <td class="muted small">${esc(UI.fmtRelative(sm.terakhir))}</td>
          <td class="row-act">
            <button type="button" class="icon-btn sm" data-a="edit" title="Ubah" aria-label="Ubah ${esc(s.nama)}">✏️</button>
            <button type="button" class="icon-btn sm" data-a="pin" title="Buat PIN baru" aria-label="PIN baru ${esc(s.nama)}">🔑</button>
            <button type="button" class="icon-btn sm" data-a="del" title="Hapus" aria-label="Hapus ${esc(s.nama)}">🗑️</button>
          </td></tr>`;
      }).join('');
      this.shell('kelas', `
        <div class="page-head"><h2>Kelas & Siswa</h2></div>
        <div class="kchips">${chips}<button type="button" class="kchip add-k">＋ Kelas baru</button></div>
        ${k ? `<section class="card">
          <div class="card-head">
            <div><h3>${esc(k.nama)}</h3><p class="muted small">${esc(k.keterangan || '')} · ${ss.length} siswa</p></div>
            <div class="card-actions">
              <button type="button" class="btn btn-primary btn-sm add-s">＋ Siswa</button>
              <button type="button" class="btn btn-ghost btn-sm imp-s">📋 Tempel dari Excel</button>
              <button type="button" class="btn btn-ghost btn-sm print-s" ${ss.length ? '' : 'disabled'}>🖨️ Cetak kartu masuk</button>
              <button type="button" class="btn btn-ghost btn-sm show-pin">👁 Tampilkan PIN</button>
              <button type="button" class="icon-btn sm edit-k" title="Ubah kelas" aria-label="Ubah kelas">✏️</button>
              <button type="button" class="icon-btn sm del-k" title="Hapus kelas" aria-label="Hapus kelas">🗑️</button>
            </div>
          </div>
          ${ss.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>No</th><th>Nama</th><th>Nama pengguna</th><th>PIN</th><th>Misi</th><th>Terakhir aktif</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
            : '<div class="empty">Kelas ini belum punya siswa. Klik <b>＋ Siswa</b> atau <b>Tempel dari Excel</b>.</div>'}
        </section>` : '<div class="empty">Belum ada kelas. Klik <b>＋ Kelas baru</b> untuk memulai.</div>'}`);
      const v = this.view;
      v.querySelector('.add-k').addEventListener('click', () => this.formKelas());
      if (!k) return;
      v.querySelector('.edit-k').addEventListener('click', () => this.formKelas(k));
      v.querySelector('.del-k').addEventListener('click', async (e) => {
        const b = e.currentTarget;
        if (ss.length) { UI.toast('Pindahkan atau hapus siswanya dulu sebelum menghapus kelas.', 'err', 4000); return; }
        if (!(await UI.confirmBox(`Hapus kelas ${k.nama}?`, { ok: 'Hapus', danger: true }))) return;
        const done = UI.busy(b);
        const r = await this.act('gDeleteKelas', { id: k.id }, 'Kelas dihapus.');
        done();
        if (r) location.hash = '#/guru/kelas';
      });
      v.querySelector('.add-s').addEventListener('click', () => this.formSiswa(null, k.id));
      v.querySelector('.imp-s').addEventListener('click', () => this.importSiswa(k));
      const pr = v.querySelector('.print-s'); if (pr) pr.addEventListener('click', () => this.printCards(k, ss));
      v.querySelector('.show-pin').addEventListener('click', (e) => {
        const on = e.target.dataset.on !== '1'; e.target.dataset.on = on ? '1' : '';
        e.target.textContent = on ? '🙈 Sembunyikan PIN' : '👁 Tampilkan PIN';
        v.querySelectorAll('.pin').forEach(p => { p.textContent = on ? p.dataset.pin : '••••'; });
      });
      v.querySelectorAll('tbody tr').forEach(tr => {
        const s = ss.find(x => x.id === tr.dataset.id);
        tr.querySelector('[data-a=edit]').addEventListener('click', () => this.formSiswa(s, k.id));
        tr.querySelector('[data-a=pin]').addEventListener('click', async (e) => {
          const b = e.currentTarget;
          if (!(await UI.confirmBox(`Buat PIN baru untuk ${s.nama}? PIN lama tidak berlaku lagi dan ${s.nama} akan keluar dari perangkat lain.`, { ok: 'Buat PIN baru' }))) return;
          const done = UI.busy(b);
          const r = await this.act('gResetPin', { id: s.id });
          done();
          if (r) { UI.modal({ title: 'PIN baru', body: `<p>PIN baru untuk <b>${esc(s.nama)}</b>:</p><p class="big-pin">${esc(r.pin)}</p>`, actions: [{ label: 'OK', cls: 'btn-primary' }] }); this.pageKelas(k.id); }
        });
        tr.querySelector('[data-a=del]').addEventListener('click', async (e) => {
          const b = e.currentTarget;
          if (!(await UI.confirmBox(`Hapus ${s.nama}? Kemajuan misi & proyeknya tetap tersimpan di spreadsheet, tapi siswa tidak bisa masuk lagi.`, { ok: 'Hapus', danger: true }))) return;
          const done = UI.busy(b);
          const r = await this.act('gDeleteSiswa', { id: s.id }, 'Siswa dihapus.');
          done();
          if (r) this.pageKelas(k.id);
        });
      });
    },

    formKelas(k) {
      const m = UI.modal({
        title: k ? 'Ubah kelas' : 'Kelas baru',
        body: `<form class="form"><label class="field"><span>Nama kelas</span><input class="input" name="nama" maxlength="30" value="${esc(k ? k.nama : '')}" placeholder="contoh: 7A" required></label>
               <label class="field"><span>Keterangan (opsional)</span><input class="input" name="ket" maxlength="80" value="${esc(k ? k.keterangan || '' : '')}" placeholder="contoh: Informatika semester 1"></label></form>`,
        actions: [{ label: 'Batal' }, {
          label: 'Simpan', cls: 'btn-primary', onClick: async (api, btn) => {
            const f = api.body.querySelector('form');
            const nama = f.nama.value.trim();
            if (!nama) { UI.toast('Nama kelas wajib diisi.', 'err'); return false; }
            const r = await this.act('gSaveKelas', { id: k ? k.id : '', nama, keterangan: f.ket.value.trim() }, 'Kelas disimpan.');
            if (!r) return false;
            location.hash = '#/guru/kelas/' + r.kelas.id;
            this.pageKelas(r.kelas.id);
          }
        }]
      });
      m.body.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); m.el.querySelector('.modal-foot .btn-primary').click(); });
    },

    formSiswa(s, kelasId) {
      const opts = (this.data.kelas || []).map(k => `<option value="${esc(k.id)}" ${k.id === (s ? s.kelasId : kelasId) ? 'selected' : ''}>${esc(k.nama)}</option>`).join('');
      const m = UI.modal({
        title: s ? 'Ubah siswa' : 'Tambah siswa',
        body: `<form class="form">
          <label class="field"><span>Nama lengkap</span><input class="input" name="nama" maxlength="60" value="${esc(s ? s.nama : '')}" required></label>
          <label class="field"><span>Nama pengguna <small class="muted">(kosongkan agar dibuat otomatis)</small></span><input class="input" name="username" maxlength="30" value="${esc(s ? s.username : '')}" placeholder="contoh: NIS atau 7a-sari" autocapitalize="none"></label>
          <label class="field"><span>Kelas</span><select class="input" name="kelas">${opts}</select></label>
          ${s ? '' : '<p class="muted small">PIN 4 angka dibuat otomatis.</p>'}
        </form>`,
        actions: [{ label: 'Batal' }, {
          label: 'Simpan', cls: 'btn-primary', onClick: async (api, btn) => {
            const f = api.body.querySelector('form');
            const nama = f.nama.value.trim();
            if (!nama) { UI.toast('Nama wajib diisi.', 'err'); return false; }
            const r = await this.act('gSaveSiswa', { id: s ? s.id : '', nama, username: f.username.value.trim(), kelasId: f.kelas.value }, s ? 'Data siswa disimpan.' : null);
            if (!r) return false;
            if (!s) UI.modal({ title: 'Siswa ditambahkan', body: `<p><b>${esc(r.siswa.nama)}</b></p><p>Nama pengguna: <code>${esc(r.siswa.username)}</code></p><p>PIN: <b class="big-pin">${esc(r.siswa.pin)}</b></p>`, actions: [{ label: 'OK', cls: 'btn-primary' }] });
            this.pageKelas(f.kelas.value);
          }
        }]
      });
      m.body.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); m.el.querySelector('.modal-foot .btn-primary').click(); });
    },

    importSiswa(k) {
      UI.modal({
        title: 'Tempel daftar siswa — ' + k.nama, wide: true,
        body: `<p class="muted">Salin kolom dari Excel/Google Sheets lalu tempel di bawah. Satu baris satu siswa.<br>
          Format: <code>Nama</code> saja, atau <code>Nama [Tab] Nama pengguna/NIS</code>. Pemisah boleh Tab, titik koma, atau koma.</p>
          <textarea class="input" rows="10" placeholder="Sari Wulandari&#9;24070101&#10;Bima Pratama&#9;24070102&#10;Ayu Lestari"></textarea>
          <div class="imp-preview muted small"></div>`,
        actions: [{ label: 'Batal' }, {
          label: 'Tambahkan', cls: 'btn-primary', onClick: async (api, btn) => {
            const rows = parseRows(api.body.querySelector('textarea').value);
            if (!rows.length) { UI.toast('Belum ada nama yang ditempel.', 'err'); return false; }
            if (rows.length > 200) { UI.toast('Maksimal 200 siswa sekali tempel.', 'err'); return false; }
            const r = await this.act('gImportSiswa', { kelasId: k.id, rows }, null);
            if (!r) return false;
            UI.toast(`${r.ditambah} siswa ditambahkan${r.dilewati ? `, ${r.dilewati} dilewati (nama pengguna sudah dipakai)` : ''}.`, 'ok', 4500);
            this.pageKelas(k.id);
          }
        }]
      });
      const ta = document.querySelector('.modal textarea');
      const pv = document.querySelector('.imp-preview');
      ta.addEventListener('input', () => { const n = parseRows(ta.value).length; pv.textContent = n ? n + ' siswa akan ditambahkan.' : ''; });
    },

    printCards(k, ss) {
      const site = location.origin + location.pathname;
      const school = this.data.settings && this.data.settings.namaSekolah || '';
      const area = document.createElement('div');
      area.id = 'print-area';
      area.innerHTML = `<div class="cards">${ss.map(s => `
        <div class="pcard">
          <div class="pc-head">${global.AlgoLogo}<span>${esc(school)}</span></div>
          <div class="pc-name">${esc(s.nama)}</div>
          <div class="pc-class">Kelas ${esc(k.nama)}</div>
          <div class="pc-row"><span>Nama pengguna</span><b>${esc(s.username)}</b></div>
          <div class="pc-row"><span>PIN</span><b>${esc(s.pin)}</b></div>
          <div class="pc-url">${esc(site)}</div>
        </div>`).join('')}</div>`;
      document.body.appendChild(area);
      document.body.classList.add('printing');
      const done = () => { document.body.classList.remove('printing'); area.remove(); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      setTimeout(() => { window.print(); setTimeout(done, 1500); }, 200);
    },

    // ================= PROGRES MISI =================
    async loadProgress(kelasId, force) {
      const c = this.progress[kelasId];
      if (!force && c && Date.now() - c.at < 30000) return c.rows;
      const r = await Api.q('gProgress', { kelasId });
      if (!r || !r.success) { UI.toast((r && r.message) || 'Gagal memuat progres.', 'err'); return c ? c.rows : []; }
      this.progress[kelasId] = { rows: r.rows, at: Date.now() };
      return r.rows;
    },

    async pageProgres(kelasId) {
      const kelas = (this.data.kelas || []).slice().sort((a, b) => a.nama.localeCompare(b.nama, 'id', { numeric: true }));
      if (!kelasId && kelas.length) kelasId = kelas[0].id;
      const k = this.kelas(kelasId);
      const chips = kelas.map(x => `<a class="kchip ${x.id === kelasId ? 'on' : ''}" href="#/guru/progres/${esc(x.id)}">${esc(x.nama)}</a>`).join('');
      this.shell('progres', `<div class="page-head"><h2>Progres Misi</h2><p class="muted">Klik sel untuk melihat & menjalankan solusi siswa.</p></div>
        <div class="kchips">${chips}</div><section class="card prog-card"><div class="page-loading sm">Memuat…</div></section>`);
      if (!k) { this.view.querySelector('.prog-card').innerHTML = '<div class="empty">Belum ada kelas.</div>'; return; }
      const rows = await this.loadProgress(k.id);
      if ((this.app.parts()[1] || '') !== 'progres') return;
      const ss = this.siswaOf(k.id);
      const map = {};
      rows.forEach(r => { (map[r.siswaId] = map[r.siswaId] || {})[r.misiId] = r; });
      const colDone = AM.MISSIONS.map(m => ss.filter(s => map[s.id] && map[s.id][m.id]).length);
      const head = AM.MISSIONS.map(m => `<th title="${esc(m.judul)} (${esc(m.konsep)})"><span class="mh-ico">${m.ikon}</span>${m.id}</th>`).join('');
      const body = ss.map((s, i) => {
        let tot = 0, st = 0;
        const cells = AM.MISSIONS.map(m => {
          const p = map[s.id] && map[s.id][m.id];
          if (!p) return '<td class="pc empty-c">·</td>';
          tot++; st += Number(p.bintang) || 0;
          return `<td class="pc s${p.bintang}" data-s="${esc(s.id)}" data-m="${m.id}" tabindex="0" title="${esc(m.judul)}: ${p.bintang} bintang, ${p.jumlahBlok} blok">${'★'.repeat(Number(p.bintang) || 0)}</td>`;
        }).join('');
        return `<tr data-sid="${esc(s.id)}"><td class="num">${i + 1}</td><td class="sname"><div class="sn"><span>${esc(s.nama)}</span>${tot ? `<button type="button" class="icon-btn sm row-reset" title="Reset kemajuan misi ${esc(s.nama)}" aria-label="Reset kemajuan misi ${esc(s.nama)}">↺</button>` : ''}</div></td>${cells}<td class="tot"><b>${tot}</b>/${AM.MISSIONS.length}<br><span class="muted">★${st}</span></td></tr>`;
      }).join('');
      const foot = `<tr class="foot"><td></td><td>Selesai</td>${colDone.map(n => `<td>${ss.length ? Math.round(n / ss.length * 100) : 0}%</td>`).join('')}<td></td></tr>`;
      const card = this.view.querySelector('.prog-card');
      card.innerHTML = ss.length ? `
        <div class="card-head"><h3>${esc(k.nama)} · ${ss.length} siswa</h3>
          <div class="card-actions"><button type="button" class="btn btn-ghost btn-sm csv">⬇️ Unduh CSV</button><button type="button" class="btn btn-ghost btn-sm ref">🔄 Segarkan</button><button type="button" class="btn btn-ghost btn-sm reset-k" ${rows.some(r => ss.some(s => s.id === r.siswaId)) ? '' : 'disabled'}>↺ Reset kemajuan kelas</button></div></div>
        <div class="table-wrap"><table class="tbl matrix"><thead><tr><th>No</th><th>Nama</th>${head}<th>Total</th></tr></thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table></div>
        <p class="muted small legend">★★★ hemat blok · ★★ cukup · ★ selesai dengan banyak blok · “·” belum selesai · ↺ reset kemajuan siswa (mulai lagi dari Misi 1)</p>`
        : '<div class="empty">Belum ada siswa di kelas ini.</div>';
      if (!ss.length) return;
      card.querySelector('.ref').addEventListener('click', async (e) => {
        const done = UI.busy(e.currentTarget, 'Menyegarkan…');
        await this.loadProgress(k.id, true); done();
        this.pageProgres(k.id);
      });
      card.querySelectorAll('.row-reset').forEach(b => b.addEventListener('click', () => {
        const s = ss.find(x => x.id === b.closest('tr').dataset.sid);
        if (s) this.resetProgress(b, k, s);
      }));
      card.querySelector('.reset-k').addEventListener('click', (e) => this.resetProgress(e.currentTarget, k, null));
      card.querySelector('.csv').addEventListener('click', () => {
        const lines = [['No', 'Nama', 'Nama pengguna'].concat(AM.MISSIONS.map(m => 'Misi ' + m.id)).concat(['Misi selesai', 'Total bintang'])];
        ss.forEach((s, i) => {
          let tot = 0, st = 0;
          const c = AM.MISSIONS.map(m => { const p = map[s.id] && map[s.id][m.id]; if (p) { tot++; st += Number(p.bintang) || 0; return p.bintang; } return 0; });
          lines.push([i + 1, s.nama, s.username].concat(c).concat([tot, st]));
        });
        UI.download(`progres-misi-${k.nama}.csv`, '﻿' + lines.map(l => l.map(csvCell).join(';')).join('\r\n'), 'text/csv');
      });
      card.querySelectorAll('td.pc[data-s]').forEach(td => {
        const open = () => {
          const s = ss.find(x => x.id === td.dataset.s); const m = AM.MISSIONS.find(x => x.id === +td.dataset.m);
          const p = map[s.id][m.id];
          UI.modal({
            title: `${s.nama} — Misi ${m.id}`,
            body: `<p><b>${esc(m.ikon)} ${esc(m.judul)}</b> <span class="muted">(${esc(m.konsep)})</span></p>
                   <div class="kv"><span>Bintang</span><b>${UI.stars(Number(p.bintang) || 0)}</b><span>Jumlah blok</span><b>${esc(p.jumlahBlok)} (target ★★★: ≤ ${m.optimal})</b><span>Percobaan</span><b>${esc(p.percobaan)} kali menjalankan</b><span>Terakhir</span><b>${esc(UI.fmtDate(p.diperbarui, true))}</b></div>`,
            actions: [{ label: 'Tutup' }, { label: '▶ Lihat & jalankan solusi', cls: 'btn-primary', onClick: () => { location.hash = `#/guru/solusi/${s.id}/${m.id}`; } }]
          });
        };
        td.addEventListener('click', open);
        td.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
      });
    },

    // ↺ hapus bintang & solusi misi → siswa mulai lagi dari Misi 1 (proyek & tugas tidak tersentuh)
    async resetProgress(btn, k, s) {
      let ok;
      if (s) {
        ok = await UI.confirmBox(`Semua bintang dan solusi misi ${s.nama} akan dihapus, lalu ${s.nama} mulai lagi dari Misi 1. Proyek Kreasi dan tugasnya tidak ikut terhapus. Tindakan ini tidak bisa dibatalkan.`, { title: 'Reset kemajuan misi?', ok: '↺ Reset', danger: true });
      } else {
        const typed = await UI.promptBox(`Semua bintang dan solusi misi SELURUH siswa kelas ${k.nama} akan dihapus, dan mereka mulai lagi dari Misi 1. Proyek Kreasi dan tugas tidak ikut terhapus. Tindakan ini tidak bisa dibatalkan.\n\nKetik nama kelas (${k.nama}) untuk melanjutkan:`, '', { title: 'Reset kemajuan kelas ' + k.nama, ok: '↺ Reset kelas', max: 30 });
        if (typed == null) return;
        ok = typed.trim().toLowerCase() === String(k.nama).trim().toLowerCase();
        if (!ok) { UI.toast('Nama kelas tidak cocok. Reset dibatalkan.', 'err'); return; }
      }
      if (!ok) return;
      const done = UI.busy(btn, s ? '' : 'Mereset…');
      const r = await this.act('gResetProgress', s ? { siswaId: s.id } : { kelasId: k.id });
      done();
      if (!r) return;
      UI.toast(s ? `Kemajuan misi ${s.nama} direset (${r.dihapus} misi dihapus).` : `Kemajuan misi kelas ${k.nama} direset (${r.siswa} siswa, ${r.dihapus} misi dihapus).`, 'ok', 4200);
      if ((this.app.parts()[1] || '') === 'progres') this.pageProgres(k.id);
    },

    async openSolution(siswaId, misiId) {
      const m = AM.MISSIONS.find(x => x.id === misiId);
      this.view.innerHTML = '<div class="page-loading">Memuat solusi…</div>';
      await this.boot();
      const r = await Api.call('gSolution', { siswaId, misiId });
      if (!r || !r.success || !m) { UI.toast((r && r.message) || 'Solusi tidak ditemukan.', 'err'); history.back(); return; }
      let sol = null; try { sol = JSON.parse(r.solusi); } catch (e) { sol = null; }
      const s = (this.data.siswa || []).find(x => x.id === siswaId) || { nama: 'Siswa' };
      this.view.innerHTML = '<div class="editor-host"></div>';
      Editor.open(this.view.firstChild, {
        mode: 'misi', mission: m, solution: sol, readOnly: true, noCelebrate: true,
        solutionInfo: `👤 <b>${esc(s.nama)}</b> · ${UI.stars(Number(r.bintang) || 0)} · ${esc(r.jumlahBlok)} blok · ${esc(r.percobaan)} percobaan`,
        onExit: () => { history.length > 1 ? history.back() : (location.hash = '#/guru/progres'); }
      });
    },

    // ================= TUGAS & NILAI =================
    pageTugas() {
      const d = this.data;
      const list = (d.tugas || []).slice().sort((a, b) => (a.status === 'tutup') - (b.status === 'tutup') || String(b.dibuat).localeCompare(String(a.dibuat)));
      const stat = (d.ringkas && d.ringkas.perTugas) || {};
      const cards = list.map(t => {
        const kel = String(t.kelasIds || '').split(',').filter(Boolean).map(id => (this.kelas(id) || {}).nama).filter(Boolean).join(', ');
        const st = stat[t.id] || { kumpul: 0, nilai: 0 };
        const target = String(t.kelasIds || '').split(',').filter(Boolean).reduce((a, id) => a + this.siswaOf(id).length, 0);
        return `<a class="task g" href="#/guru/tugas/${esc(t.id)}">
          <div class="task-head"><h3>${esc(t.judul)}</h3>${t.status === 'tutup' ? '<span class="chip">Ditutup</span>' : '<span class="chip chip-ok">Dibuka</span>'}</div>
          <div class="task-meta"><span>👥 ${esc(kel || '–')}</span><span>📅 ${t.batas ? esc(UI.fmtDate(t.batas)) : 'tanpa batas'}</span></div>
          <div class="task-prog"><span class="kb-bar"><i style="width:${target ? Math.round(st.kumpul / target * 100) : 0}%"></i></span><small>${st.kumpul}/${target} dikumpulkan · ${st.nilai} dinilai</small></div>
        </a>`;
      }).join('');
      this.shell('tugas', `<div class="page-head"><h2>Tugas & Nilai</h2><button type="button" class="btn btn-primary new-t">＋ Buat tugas</button></div>
        ${list.length ? `<div class="task-list">${cards}</div>` : '<div class="empty">Belum ada tugas. Contoh tugas: “Buat animasi perkenalan diri dengan minimal 2 tokoh dan perulangan.”</div>'}`);
      this.view.querySelector('.new-t').addEventListener('click', () => this.formTugas());
    },

    formTugas(t) {
      const kel = (this.data.kelas || []);
      if (!kel.length) { UI.toast('Buat kelas dulu sebelum membuat tugas.', 'err'); return; }
      const sel = String(t ? t.kelasIds : '').split(',');
      const m = UI.modal({
        title: t ? 'Ubah tugas' : 'Tugas baru', wide: true,
        body: `<form class="form">
          <label class="field"><span>Judul</span><input class="input" name="judul" maxlength="80" value="${esc(t ? t.judul : '')}" placeholder="contoh: Animasi Perkenalan Diri" required></label>
          <label class="field"><span>Petunjuk untuk siswa</span><textarea class="input" name="petunjuk" rows="5" maxlength="2000" placeholder="Jelaskan apa yang harus dibuat dan kriteria penilaiannya.">${esc(t ? t.petunjuk : '')}</textarea></label>
          <div class="field"><span>Untuk kelas</span><div class="checks">${kel.map(k => `<label class="check"><input type="checkbox" name="k" value="${esc(k.id)}" ${sel.includes(k.id) ? 'checked' : ''}> ${esc(k.nama)}</label>`).join('')}</div></div>
          <label class="field"><span>Batas pengumpulan (opsional)</span><input class="input" type="date" name="batas" value="${esc(t ? t.batas || '' : '')}"></label>
          ${t ? `<label class="check"><input type="checkbox" name="tutup" ${t.status === 'tutup' ? 'checked' : ''}> Tutup tugas (siswa tidak bisa mengumpulkan lagi)</label>` : ''}
        </form>`,
        actions: [{ label: 'Batal' }, {
          label: 'Simpan', cls: 'btn-primary', onClick: async (api, btn) => {
            const f = api.body.querySelector('form');
            const judul = f.judul.value.trim();
            const kelasIds = Array.from(f.querySelectorAll('input[name=k]:checked')).map(x => x.value);
            if (!judul) { UI.toast('Judul wajib diisi.', 'err'); return false; }
            if (!kelasIds.length) { UI.toast('Pilih minimal satu kelas.', 'err'); return false; }
            const r = await this.act('gSaveTugas', { id: t ? t.id : '', judul, petunjuk: f.petunjuk.value.trim(), kelasIds: kelasIds.join(','), batas: f.batas.value, status: f.tutup && f.tutup.checked ? 'tutup' : 'buka' }, 'Tugas disimpan.');
            if (!r) return false;
            location.hash = '#/guru/tugas/' + r.tugas.id;
            this.route(this.view, ['tugas', r.tugas.id], this.app);
          }
        }]
      });
      return m;
    },

    async loadSubs(tugasId, force) {
      const c = this.subs[tugasId];
      if (!force && c && Date.now() - c.at < 20000) return c.rows;
      const r = await Api.q('gProjects', { tugasId });
      if (!r || !r.success) { UI.toast((r && r.message) || 'Gagal memuat karya.', 'err'); return c ? c.rows : []; }
      this.subs[tugasId] = { rows: r.rows, at: Date.now() };
      return r.rows;
    },

    async pageTugasDetail(id) {
      const t = (this.data.tugas || []).find(x => x.id === id);
      if (!t) { location.replace('#/guru/tugas'); return; }
      const kelasIds = String(t.kelasIds || '').split(',').filter(Boolean);
      this.shell('tugas', `<div class="page-head"><div><a class="back-link" href="#/guru/tugas">← Semua tugas</a><h2>${esc(t.judul)}</h2></div>
          <div class="card-actions"><button type="button" class="btn btn-ghost btn-sm edit-t">✏️ Ubah</button><button type="button" class="btn btn-ghost btn-sm del-t">🗑️ Hapus</button></div></div>
        <section class="card"><p class="task-desc">${esc(t.petunjuk || '').replace(/\n/g, '<br>') || '<span class="muted">Tanpa petunjuk.</span>'}</p>
          <div class="task-meta"><span>👥 ${esc(kelasIds.map(k => (this.kelas(k) || {}).nama).filter(Boolean).join(', '))}</span><span>📅 ${t.batas ? esc(UI.fmtDate(t.batas)) : 'tanpa batas'}</span><span>${t.status === 'tutup' ? '🔒 Ditutup' : '🟢 Dibuka'}</span></div></section>
        <section class="card subs-card"><div class="page-loading sm">Memuat karya siswa…</div></section>`);
      this.view.querySelector('.edit-t').addEventListener('click', () => this.formTugas(t));
      this.view.querySelector('.del-t').addEventListener('click', async () => {
        if (!(await UI.confirmBox(`Hapus tugas "${t.judul}"? Proyek siswa tetap tersimpan sebagai proyek biasa.`, { ok: 'Hapus', danger: true }))) return;
        const done = UI.busy(this.view.querySelector('.del-t'), 'Menghapus…');
        const r = await this.act('gDeleteTugas', { id: t.id }, 'Tugas dihapus.');
        done();
        if (r) location.hash = '#/guru/tugas';
      });
      const rows = await this.loadSubs(id);
      if (this.app.parts()[2] !== id) return;
      if (!this.view.querySelector('.subs-card')) return;
      const byS = {}; rows.forEach(r => { byS[r.siswaId] = r; });
      const students = [];
      kelasIds.forEach(kid => this.siswaOf(kid).forEach(s => students.push(Object.assign({ kelasNama: (this.kelas(kid) || {}).nama }, s))));
      this._gradeOrder = students.filter(s => byS[s.id]).map(s => byS[s.id].id);
      const tr = students.map((s, i) => {
        const p = byS[s.id];
        const sent = p && (p.dikumpulkan === true || p.dikumpulkan === 'TRUE');
        const graded = p && p.nilai !== '' && p.nilai != null;
        const st = !p ? '<span class="chip chip-warn">Belum mulai</span>' : graded ? '<span class="chip chip-grade">Dinilai</span>' : sent ? '<span class="chip chip-ok">Dikumpulkan</span>' : '<span class="chip chip-info">Dikerjakan</span>';
        return `<tr><td class="num">${i + 1}</td><td><b>${esc(s.nama)}</b><br><span class="muted small">${esc(s.kelasNama || '')}</span></td><td>${st}</td>
          <td class="muted small">${p ? esc(UI.fmtDate(p.diperbarui, true)) : '–'}</td><td class="nilai">${graded ? `<b>${esc(p.nilai)}</b>` : '–'}</td>
          <td>${p ? `<a class="btn btn-sm ${sent && !graded ? 'btn-primary' : 'btn-ghost'}" href="#/guru/proyek/${esc(p.id)}">${sent && !graded ? 'Buka & nilai' : 'Buka'}</a>` : ''}</td></tr>`;
      }).join('');
      const card = this.view.querySelector('.subs-card');
      card.innerHTML = `<div class="card-head"><h3>Karya siswa</h3><div class="card-actions"><button type="button" class="btn btn-ghost btn-sm csv">⬇️ Unduh nilai (CSV)</button><button type="button" class="btn btn-ghost btn-sm ref">🔄 Segarkan</button></div></div>
        ${students.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>No</th><th>Siswa</th><th>Status</th><th>Diperbarui</th><th>Nilai</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>` : '<div class="empty">Belum ada siswa di kelas tujuan.</div>'}`;
      card.querySelector('.ref').addEventListener('click', async (e) => {
        const done = UI.busy(e.currentTarget, 'Menyegarkan…');
        await this.loadSubs(id, true); done();
        this.pageTugasDetail(id);
      });
      card.querySelector('.csv').addEventListener('click', () => {
        const lines = [['No', 'Nama', 'Kelas', 'Status', 'Nilai', 'Komentar']];
        students.forEach((s, i) => {
          const p = byS[s.id];
          const sent = p && (p.dikumpulkan === true || p.dikumpulkan === 'TRUE');
          lines.push([i + 1, s.nama, s.kelasNama, !p ? 'Belum mulai' : sent ? 'Dikumpulkan' : 'Dikerjakan', p ? p.nilai : '', p ? p.komentar : '']);
        });
        UI.download(`nilai-${t.judul}.csv`, '﻿' + lines.map(l => l.map(csvCell).join(';')).join('\r\n'), 'text/csv');
      });
    },

    async openProject(id) {
      this.view.innerHTML = '<div class="page-loading">Memuat karya siswa…</div>';
      await this.boot();
      const r = await Api.call('gGetProject', { id });
      if (!r || !r.success) { UI.toast((r && r.message) || 'Proyek tidak ditemukan.', 'err'); history.back(); return; }
      let data = null; try { data = JSON.parse(r.data); } catch (e) { data = null; }
      if (!Editor.validProject(data)) { UI.toast('Data proyek rusak.', 'err'); history.back(); return; }
      const meta = r.proyek;
      const s = (this.data.siswa || []).find(x => x.id === meta.siswaId) || { nama: 'Siswa' };
      const t = meta.tugasId ? (this.data.tugas || []).find(x => x.id === meta.tugasId) : null;
      this.view.innerHTML = '<div class="editor-host"></div>';
      const order = this._gradeOrder || [];
      const idx = order.indexOf(id);
      Editor.open(this.view.firstChild, {
        mode: 'lihat', project: data, kicker: t ? 'Tugas: ' + t.judul : 'Proyek siswa', title: `${s.nama} — ${meta.judul}`,
        onExit: () => { location.hash = t ? '#/guru/tugas/' + t.id : '#/guru'; },
        gradePanel: (el) => {
          const sent = meta.dikumpulkan === true || meta.dikumpulkan === 'TRUE';
          el.innerHTML = `<h4>Penilaian</h4>
            <p class="muted small">${sent ? '📤 Dikumpulkan' : '✏️ Belum dikumpulkan'} · diperbarui ${esc(UI.fmtDate(meta.diperbarui, true))}</p>
            <form class="grade-form">
              <label class="field"><span>Nilai (0–100)</span><input class="input" type="number" name="nilai" min="0" max="100" value="${esc(meta.nilai == null ? '' : meta.nilai)}"></label>
              <label class="field"><span>Komentar untuk siswa</span><textarea class="input" name="komentar" rows="3" maxlength="500" placeholder="contoh: Bagus! Coba tambahkan perulangan agar lebih hemat blok.">${esc(meta.komentar || '')}</textarea></label>
              <div class="grade-actions">
                ${idx > 0 ? '<button type="button" class="btn btn-ghost btn-sm prev">← Sebelumnya</button>' : ''}
                <button type="submit" class="btn btn-primary btn-sm">Simpan nilai</button>
                ${idx >= 0 && idx < order.length - 1 ? '<button type="button" class="btn btn-ghost btn-sm next">Berikutnya →</button>' : ''}
              </div>
            </form>`;
          const f = el.querySelector('form');
          f.addEventListener('submit', async (e) => {
            e.preventDefault();
            const n = f.nilai.value.trim();
            if (n !== '' && (isNaN(+n) || +n < 0 || +n > 100)) { UI.toast('Nilai harus 0 sampai 100.', 'err'); return; }
            const btn = f.querySelector('button[type=submit]');
            if (btn._busy) return;
            const done = UI.busy(btn, 'Menyimpan…');
            const res = await Api.call('gGrade', { id, nilai: n, komentar: f.komentar.value.trim() });
            done(res && res.success ? 'Tersimpan' : null);
            if (res && res.success) { UI.toast('Nilai disimpan.', 'ok'); meta.nilai = n; this.subs = {}; this._at = 0; }
            else UI.toast((res && res.message) || 'Gagal menyimpan nilai.', 'err');
          });
          const pv = el.querySelector('.prev'); if (pv) pv.addEventListener('click', () => { location.hash = '#/guru/proyek/' + order[idx - 1]; });
          const nx = el.querySelector('.next'); if (nx) nx.addEventListener('click', () => { location.hash = '#/guru/proyek/' + order[idx + 1]; });
        }
      });
    },

    // ================= PENGATURAN =================
    async pageSettings() {
      const d = this.data;
      const st = d.settings || {};
      const me = d.guru || {};
      const admin = me.peran === 'admin';
      this.shell('pengaturan', `
        <div class="page-head"><h2>Pengaturan</h2></div>
        <section class="card">
          <h3>Sekolah & aplikasi</h3>
          <form class="form set-form">
            <label class="field"><span>Nama sekolah (tampil di halaman masuk)</span><input class="input" name="namaSekolah" maxlength="80" value="${esc(st.namaSekolah || '')}"></label>
            <label class="check"><input type="checkbox" name="bukaSemuaMisi" ${st.bukaSemuaMisi ? 'checked' : ''}> Buka semua misi (siswa tidak perlu menyelesaikan misi secara berurutan)</label>
            <label class="check"><input type="checkbox" name="izinkanTamu" ${st.izinkanTamu !== false ? 'checked' : ''}> Tampilkan tombol “Coba dulu tanpa akun” di halaman masuk</label>
            <button type="submit" class="btn btn-primary">Simpan pengaturan</button>
          </form>
        </section>
        <section class="card">
          <h3>Kata sandi saya</h3>
          <form class="form pw-form">
            <label class="field"><span>Kata sandi lama</span><input class="input" type="password" name="lama" autocomplete="current-password"></label>
            <label class="field"><span>Kata sandi baru (min. 6 karakter)</span><input class="input" type="password" name="baru" autocomplete="new-password"></label>
            <label class="field"><span>Ulangi kata sandi baru</span><input class="input" type="password" name="ulang" autocomplete="new-password"></label>
            <button type="submit" class="btn btn-primary">Ganti kata sandi</button>
          </form>
        </section>
        ${admin ? '<section class="card guru-card"><h3>Akun guru</h3><div class="page-loading sm">Memuat…</div></section>' : ''}
        <section class="card">
          <h3>Tentang</h3>
          <div class="kv"><span>Versi aplikasi</span><b>${esc(global.ALGO_BUILD || (global.ALGO_CONFIG || {}).APP_VERSION || '')}</b><span>Versi server</span><b>${esc(d.v || '–')}</b>
          ${admin && d.admin && d.admin.spreadsheetUrl ? `<span>Database</span><b><a href="${esc(d.admin.spreadsheetUrl)}" target="_blank" rel="noopener">Buka Google Sheets ↗</a></b>` : ''}</div>
          <p class="muted small">Ubah data langsung di Google Sheets? Tekan “Segarkan data” di Ringkasan agar Algo membaca ulang.</p>
        </section>`);
      const v = this.view;
      v.querySelector('.set-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        const btn = f.querySelector('button[type=submit]');
        if (btn._busy) return;
        const done = UI.busy(btn, 'Menyimpan…');
        const r = await this.act('gSaveSettings', { namaSekolah: f.namaSekolah.value.trim(), bukaSemuaMisi: f.bukaSemuaMisi.checked, izinkanTamu: f.izinkanTamu.checked }, 'Pengaturan disimpan.');
        done(r ? 'Tersimpan' : null); // isian sudah menampilkan nilai baru → tidak perlu menggambar ulang halaman
      });
      v.querySelector('.pw-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        if (f.baru.value.length < 6) { UI.toast('Kata sandi baru minimal 6 karakter.', 'err'); return; }
        if (f.baru.value !== f.ulang.value) { UI.toast('Ulangan kata sandi tidak sama.', 'err'); return; }
        const btn = f.querySelector('button[type=submit]');
        if (btn._busy) return;
        const done = UI.busy(btn, 'Menyimpan…');
        const r = await Api.call('gChangePassword', { lama: f.lama.value, baru: f.baru.value });
        done(r && r.success ? 'Diganti' : null);
        if (r && r.success) {
          UI.toast('Kata sandi diganti.', 'ok');
          if (r.token) Api.setSession(r.token, Api.user);
          f.reset();
        } else UI.toast((r && r.message) || 'Gagal mengganti kata sandi.', 'err');
      });
      if (admin) this.renderGuruList();
    },

    async renderGuruList() {
      const card = this.view.querySelector('.guru-card');
      const r = await Api.q('gListGuru');
      if (!card || !card.isConnected) return;
      if (!r || !r.success) { card.innerHTML = '<h3>Akun guru</h3><p class="muted">Gagal memuat.</p>'; return; }
      const me = this.data.guru || {};
      card.innerHTML = `<div class="card-head"><h3>Akun guru</h3><button type="button" class="btn btn-primary btn-sm add-g">＋ Guru</button></div>
        <div class="table-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Nama pengguna</th><th>Peran</th><th></th></tr></thead><tbody>
        ${r.rows.map(g => `<tr data-id="${esc(g.id)}"><td><b>${esc(g.nama)}</b></td><td><code>${esc(g.username)}</code></td><td>${g.peran === 'admin' ? 'Admin' : 'Guru'}${g.aktif === false || g.aktif === 'FALSE' ? ' <span class="chip">nonaktif</span>' : ''}</td>
          <td class="row-act">${g.id === me.id ? '<span class="muted small">(Anda)</span>' : '<button type="button" class="icon-btn sm" data-a="pw" title="Atur ulang kata sandi">🔑</button><button type="button" class="icon-btn sm" data-a="del" title="Hapus">🗑️</button>'}</td></tr>`).join('')}
        </tbody></table></div>`;
      card.querySelector('.add-g').addEventListener('click', () => this.formGuru());
      card.querySelectorAll('tr[data-id]').forEach(tr => {
        const g = r.rows.find(x => x.id === tr.dataset.id);
        const pw = tr.querySelector('[data-a=pw]');
        if (pw) pw.addEventListener('click', async () => {
          const np = await UI.promptBox(`Kata sandi baru untuk ${g.nama} (min. 6 karakter):`, '', { title: 'Atur ulang kata sandi' });
          if (!np) return;
          if (np.length < 6) { UI.toast('Minimal 6 karakter.', 'err'); return; }
          const done = UI.busy(pw);
          await this.act('gSaveGuru', { id: g.id, password: np }, 'Kata sandi diatur ulang.');
          done();
        });
        const del = tr.querySelector('[data-a=del]');
        if (del) del.addEventListener('click', async () => {
          if (!(await UI.confirmBox(`Hapus akun guru ${g.nama}?`, { ok: 'Hapus', danger: true }))) return;
          const done = UI.busy(del);
          const r2 = await this.act('gDeleteGuru', { id: g.id }, 'Akun guru dihapus.');
          done();
          if (r2) this.renderGuruList();
        });
      });
    },

    formGuru() {
      UI.modal({
        title: 'Tambah akun guru',
        body: `<form class="form">
          <label class="field"><span>Nama</span><input class="input" name="nama" maxlength="60"></label>
          <label class="field"><span>Nama pengguna</span><input class="input" name="username" maxlength="30" autocapitalize="none"></label>
          <label class="field"><span>Kata sandi awal (min. 6)</span><input class="input" name="password" type="text" maxlength="40"></label>
          <label class="check"><input type="checkbox" name="admin"> Jadikan admin (boleh mengelola akun guru)</label></form>`,
        actions: [{ label: 'Batal' }, {
          label: 'Simpan', cls: 'btn-primary', onClick: async (api) => {
            const f = api.body.querySelector('form');
            if (!f.nama.value.trim() || !f.username.value.trim() || f.password.value.length < 6) { UI.toast('Lengkapi nama, nama pengguna, dan kata sandi (min. 6).', 'err'); return false; }
            const r = await this.act('gSaveGuru', { nama: f.nama.value.trim(), username: f.username.value.trim(), password: f.password.value, peran: f.admin.checked ? 'admin' : 'guru' }, 'Akun guru dibuat.');
            if (!r) return false;
            this.renderGuruList();
          }
        }]
      });
    }
  };

  function parseRows(text) {
    return String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
      const parts = l.split(/\t|;|,/).map(x => x.trim()).filter(Boolean);
      // lewati baris judul
      if (/^(nama|no)$/i.test(parts[0])) return null;
      if (/^\d+$/.test(parts[0]) && parts.length > 1 && !/^\d+$/.test(parts[1])) parts.shift(); // kolom nomor urut
      return { nama: parts[0], username: parts[1] || '' };
    }).filter(r => r && r.nama);
  }
  function csvCell(v) { const s = String(v == null ? '' : v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

  global.AlgoGuru = G;
})(window);
