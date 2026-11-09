/* =========================================================
   ALGO — Pembantu tampilan (notifikasi, jendela, konfeti)
   ========================================================= */
(function (global) {
  'use strict';

  // Penyimpanan perangkat bisa diblokir (mode privat / pengaturan browser).
  // Kalau begitu, pakai penyimpanan sementara di memori agar aplikasi tetap jalan.
  (function ensureStorage() {
    let ok = false;
    try { const k = '__algo_t'; global.localStorage.setItem(k, '1'); global.localStorage.removeItem(k); ok = true; } catch (e) { ok = false; }
    if (ok) return;
    const mem = {};
    const shim = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
      clear: () => { Object.keys(mem).forEach(k => delete mem[k]); },
      key: (i) => Object.keys(mem)[i] || null,
      get length() { return Object.keys(mem).length; }
    };
    ['localStorage', 'sessionStorage'].forEach(n => { try { Object.defineProperty(global, n, { value: shim, configurable: true }); } catch (e) { /* abaikan */ } });
  })();

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- notifikasi singkat ----------
  function toast(msg, type, ms) {
    let host = document.getElementById('toasts');
    if (!host) { host = document.createElement('div'); host.id = 'toasts'; host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const t = document.createElement('div');
    t.className = 'toast toast-' + (type || 'info');
    t.textContent = msg;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms || 2800);
  }

  // ---------- tombol sibuk: animasi memuat selama proses ----------
  // const done = busy(tombol, 'Menyimpan…'); … done('Tersimpan') → ✓ sebentar, lalu kembali normal
  function busy(btn, label) {
    if (!btn || btn._busy) return function () { };
    const icon = btn.classList.contains('icon-btn');
    const html = btn.innerHTML, w = btn.offsetWidth;
    btn._busy = true;
    btn.disabled = true;
    btn.classList.add('is-busy');
    btn.setAttribute('aria-busy', 'true');
    if (w && !icon) btn.style.minWidth = w + 'px';
    const text = label === undefined ? 'Menyimpan…' : label;
    btn.innerHTML = '<i class="spin" aria-hidden="true"></i>' + (text && !icon ? '<span class="busy-label">' + esc(text) + '</span>' : '');
    return function done(okLabel) {
      if (!btn._busy) return;
      const restore = () => {
        btn._busy = false; btn.innerHTML = html; btn.disabled = false;
        btn.classList.remove('is-busy', 'is-done'); btn.removeAttribute('aria-busy'); btn.style.minWidth = '';
      };
      if (okLabel && btn.isConnected) {
        btn.classList.remove('is-busy'); btn.classList.add('is-done');
        btn.innerHTML = '<i class="done-ico" aria-hidden="true">✓</i>' + (icon ? '' : '<span class="busy-label">' + esc(okLabel) + '</span>');
        setTimeout(restore, 1100);
      } else restore();
    };
  }

  // ---------- jendela (modal) ----------
  const stack = [];
  function modal(o) {
    const back = document.createElement('div');
    back.className = 'modal-back';
    const box = document.createElement('div');
    box.className = 'modal' + (o.wide ? ' modal-wide' : '') + (o.cls ? ' ' + o.cls : '');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML =
      (o.title ? `<div class="modal-head"><h3>${esc(o.title)}</h3>${o.noClose ? '' : '<button type="button" class="icon-btn modal-x" aria-label="Tutup">✕</button>'}</div>` : '') +
      '<div class="modal-body"></div>' +
      (o.actions && o.actions.length ? '<div class="modal-foot"></div>' : '');
    const body = box.querySelector('.modal-body');
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    back.appendChild(box);
    document.body.appendChild(back);
    requestAnimationFrame(() => back.classList.add('show'));
    let closed = false;
    const api = {
      el: box, body,
      close(val) {
        if (closed) return; closed = true;
        back.classList.remove('show');
        const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
        setTimeout(() => back.remove(), 200);
        if (o.onClose) o.onClose(val);
      }
    };
    stack.push(api);
    if (o.actions) {
      const foot = box.querySelector('.modal-foot');
      o.actions.forEach(a => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + (a.cls || 'btn-ghost');
        b.textContent = a.label;
        b.addEventListener('click', async () => {
          if (b._busy) return;
          if (a.onClick) {
            let r = a.onClick(api, b);
            if (r && typeof r.then === 'function') {
              // proses async (menyimpan ke server) → tombol menampilkan animasi memuat
              const done = a.busy === false ? function () { } : busy(b, a.busy || 'Menyimpan…');
              try { r = await r; } finally { done(); }
            }
            if (r === false) return;
          }
          if (a.close !== false) api.close(a.value);
        });
        foot.appendChild(b);
      });
    }
    const x = box.querySelector('.modal-x');
    if (x) x.addEventListener('click', () => api.close());
    if (!o.noClose) back.addEventListener('mousedown', (e) => { if (e.target === back) api.close(); });
    setTimeout(() => { const f = box.querySelector('[autofocus], input, textarea, select'); if (f) f.focus(); }, 60);
    return api;
  }
  function topModal() {
    for (let i = stack.length - 1; i >= 0; i--) { if (!stack[i].el.isConnected) stack.splice(i, 1); }
    return stack[stack.length - 1];
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) { const m = topModal(); if (m && !m.el.closest('.modal-back').dataset.noesc) m.close(); } });

  function confirmBox(msg, o) {
    o = o || {};
    return new Promise(res => {
      modal({
        title: o.title || 'Konfirmasi', body: `<p>${esc(msg)}</p>`,
        actions: [
          { label: o.cancel || 'Batal', cls: 'btn-ghost', value: false },
          { label: o.ok || 'Ya', cls: o.danger ? 'btn-danger' : 'btn-primary', value: true }
        ],
        onClose: (v) => res(!!v)
      });
    });
  }

  function promptBox(msg, def, o) {
    o = o || {};
    return new Promise(res => {
      let val = null;
      const m = modal({
        title: o.title || 'Isi', body: `<label class="field"><span>${esc(msg)}</span><input type="text" class="input" value="${esc(def || '')}" maxlength="${o.max || 60}"></label>`,
        actions: [
          { label: 'Batal', cls: 'btn-ghost' },
          { label: o.ok || 'OK', cls: 'btn-primary', onClick: (api) => { val = api.body.querySelector('input').value; } }
        ],
        onClose: () => res(val)
      });
      const inp = m.body.querySelector('input');
      inp.select();
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { val = inp.value; m.close(); } });
    });
  }

  // ---------- konfeti ----------
  function confetti(n) {
    const host = document.createElement('div');
    host.className = 'confetti';
    const colors = ['#4C5FD5', '#FFB020', '#22B07D', '#FF6BA6', '#3FB2D8', '#9B6BFF'];
    for (let i = 0; i < (n || 90); i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.6) + 's';
      p.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      host.appendChild(p);
    }
    document.body.appendChild(host);
    setTimeout(() => host.remove(), 3800);
  }

  // ---------- tanggal ----------
  const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function fmtDate(v, withTime) {
    if (!v) return '–';
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    let s = d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear();
    if (withTime) s += ', ' + String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0');
    return s;
  }
  function fmtRelative(v) {
    if (!v) return 'belum pernah';
    const d = new Date(v); const s = (Date.now() - d.getTime()) / 1000;
    if (isNaN(s)) return '–';
    if (s < 60) return 'baru saja';
    if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
    if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' hari lalu';
    return fmtDate(v);
  }

  function debounce(fn, ms) {
    let t;
    const f = function () { const a = arguments, self = this; clearTimeout(t); t = setTimeout(() => fn.apply(self, a), ms); };
    f.flush = () => { clearTimeout(t); fn(); };
    f.cancel = () => clearTimeout(t);
    return f;
  }

  function stars(n, max) {
    let s = '';
    for (let i = 0; i < (max || 3); i++) s += `<span class="st ${i < n ? 'on' : ''}">★</span>`;
    return `<span class="stars">${s}</span>`;
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function pickFile(accept) {
    return new Promise(res => {
      const i = document.createElement('input');
      i.type = 'file'; i.accept = accept || '';
      i.onchange = () => {
        const f = i.files && i.files[0];
        if (!f) return res(null);
        const r = new FileReader();
        r.onload = () => res({ name: f.name, text: r.result });
        r.onerror = () => res(null);
        r.readAsText(f);
      };
      i.click();
    });
  }

  global.AlgoUI = { esc, toast, busy, modal, topModal, confirmBox, promptBox, confetti, fmtDate, fmtRelative, debounce, stars, download, pickFile };
})(window);
