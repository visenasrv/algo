/* =========================================================
   ALGO — Penghubung ke server (Google Apps Script)
   - POST memakai text/plain (tanpa CORS preflight)
   - Baca identik digabung (dedupe) + epoch tulis (anti data basi)
   - Baca dalam satu putaran digabung jadi 1 panggilan "batch"
   - Pengukur waktu: Perf.table() / Perf.summary() di Console
   - Kemajuan misi yang gagal terkirim disimpan dulu (outbox)
   ========================================================= */
(function (global) {
  'use strict';
  const C = global.ALGO_CONFIG || {};
  const READ = /^(ping|info|me|listProjects|getProject|gBoot|gProgress|gSolution|gProjects|gGetProject|gListGuru)$/;

  // ---------- Pengukur ----------
  const Perf = {
    log: [],
    add(r) { this.log.push(r); if (this.log.length > 200) this.log.shift(); },
    table() { console.table(this.log.slice(-30)); },
    summary() {
      const g = {};
      this.log.forEach(r => { const x = g[r.action] = g[r.action] || { n: 0, total: 0, server: 0, cache: 0 }; x.n++; x.total += r.total; x.server += r.server || 0; if (r.cached) x.cache++; });
      const out = {};
      Object.keys(g).forEach(k => { const x = g[k]; out[k] = { kali: x.n, rata_total_ms: Math.round(x.total / x.n), rata_server_ms: Math.round(x.server / x.n), dari_cache: x.cache }; });
      console.table(out);
    }
  };

  // ---------- Sesi ----------
  let token = localStorage.getItem('algo_token') || '';
  let user = null;
  try { user = JSON.parse(localStorage.getItem('algo_user') || 'null'); } catch (e) { user = null; }

  const _inflight = {};
  let _writeEpoch = 0;

  function configured() {
    const u = String(C.GAS_URL || '');
    if (u === 'demo') return true;
    return /^https:\/\/script\.google(usercontent)?\.com\/.+\/exec/.test(u) && !/XXXX/.test(u);
  }

  async function rawCall(action, data) {
    const body = JSON.stringify({ action, token, data: data || {}, v: C.APP_VERSION });
    const t0 = performance.now();
    let res;
    try {
      if (C.GAS_URL === 'demo' && global.AlgoDemo) {
        res = JSON.parse(await global.AlgoDemo.exec(body));
      } else {
        const r = await fetch(C.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, redirect: 'follow' });
        const txt = await r.text();
        try { res = JSON.parse(txt); } catch (e) { res = { success: false, message: 'Server membalas dengan format yang tidak dikenal. Pastikan Deploy diatur "Siapa saja" (Anyone).' }; }
      }
    } catch (e) {
      res = { success: false, offline: true, message: 'Tidak bisa terhubung ke server. Periksa koneksi internet.' };
    }
    Perf.add({ action, total: Math.round(performance.now() - t0), server: res && res.ms, cached: !!(res && res.cached), ok: !!(res && res.success) });
    if (res && res.code === 'AUTH') {
      Api.clearSession();
      if (Api.onAuthLost) Api.onAuthLost(res.message);
    }
    if (res && res.success && !res.offline) Outbox.flushSoon();
    return res;
  }

  function call(action, data) {
    if (!READ.test(action)) { _writeEpoch++; return rawCall(action, data); }
    const k = _writeEpoch + '|' + action + '|' + token + '|' + JSON.stringify(data || {});
    if (_inflight[k]) return _inflight[k];
    const p = rawCall(action, data);
    _inflight[k] = p;
    p.then(() => delete _inflight[k], () => delete _inflight[k]);
    return p;
  }

  // ---------- Penggabung baca otomatis ----------
  const Batcher = {
    q: null,
    add(action, data) {
      return new Promise(res => {
        if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); }
        this.q.push({ action, data: data || {}, res });
      });
    },
    async flush() {
      const q = this.q; this.q = null;
      if (!q || !q.length) return;
      const uniq = []; const map = {};
      q.forEach(it => { const k = it.action + '|' + JSON.stringify(it.data); if (!map[k]) { map[k] = []; uniq.push({ k, action: it.action, data: it.data }); } map[k].push(it.res); });
      if (uniq.length === 1) {
        const r = await call(uniq[0].action, uniq[0].data);
        map[uniq[0].k].forEach(f => f(r));
        return;
      }
      for (let i = 0; i < uniq.length; i += 10) {
        const part = uniq.slice(i, i + 10);
        const r = await rawCall('batch', { calls: part.map(p => ({ action: p.action, data: p.data })) });
        part.forEach((p, j) => {
          const one = r && r.success && r.results ? r.results[j] : r;
          map[p.k].forEach(f => f(one || { success: false, message: 'Gagal memuat.' }));
        });
      }
    }
  };

  // ---------- Outbox (kemajuan misi saat offline) ----------
  const Outbox = {
    key: 'algo_outbox',
    list() { try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (e) { return []; } },
    save(l) { try { localStorage.setItem(this.key, JSON.stringify(l.slice(-40))); } catch (e) { /* abaikan */ } },
    push(item) { const l = this.list().filter(x => !(x.action === item.action && x.data && item.data && x.data.misiId === item.data.misiId && x.uid === item.uid)); l.push(item); this.save(l); },
    _t: null,
    flushSoon() { if (this._busy || !this.list().length) return; clearTimeout(this._t); this._t = setTimeout(() => this.flush(), 800); },
    async flush() {
      if (this._busy) return;
      const l = this.list().filter(x => x.uid === (user && user.id));
      if (!l.length || !token) return;
      this._busy = true;
      try {
        const rest = [];
        for (const it of l) {
          const r = await rawCall(it.action, it.data);
          if (!(r && r.success) && r && r.offline) rest.push(it);
        }
        this.save(this.list().filter(x => x.uid !== (user && user.id)).concat(rest));
      } finally { this._busy = false; }
    }
  };
  global.addEventListener('online', () => Outbox.flushSoon());

  // ---------- Pemanasan server ----------
  function warm(scope) {
    if (!configured() || C.GAS_URL === 'demo') return;
    const k = 'algo_warm_' + scope;
    try {
      const last = +sessionStorage.getItem(k) || 0;
      if (Date.now() - last < 240000) return;
      sessionStorage.setItem(k, String(Date.now()));
    } catch (e) { /* abaikan */ }
    fetch(C.GAS_URL + '?w=' + encodeURIComponent(scope), { mode: 'no-cors' }).catch(() => { /* abaikan */ });
  }

  const Api = {
    Perf,
    configured,
    get token() { return token; },
    get user() { return user; },
    setSession(t, u) {
      token = t || ''; user = u || null;
      localStorage.setItem('algo_token', token);
      localStorage.setItem('algo_user', JSON.stringify(user));
    },
    clearSession() {
      token = ''; user = null;
      localStorage.removeItem('algo_token');
      localStorage.removeItem('algo_user');
    },
    call,
    q(action, data) { return Batcher.add(action, data); },
    warm,
    async saveProgress(data) {
      const r = await call('saveProgress', data);
      if (r && r.offline) Outbox.push({ action: 'saveProgress', data, uid: user && user.id });
      return r;
    },
    onAuthLost: null
  };

  global.AlgoApi = Api;
  global.Perf = Perf;
})(window);
