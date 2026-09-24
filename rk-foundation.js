/* RK FOUNDATION JS */
(function (global) {
'use strict';

var RKF = global.RKF = global.RKF || {};

RKF.version = 'RKF-1.13.0';
RKF.versionCheck = function (expected) { return expected === RKF.version; };

function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
RKF.esc = escHtml;

RKF.modal = {
  _onOpen: {},
  _armed: false,
  _down: null,

  onOpen: function (id, fn) { (RKF.modal._onOpen[id] = RKF.modal._onOpen[id] || []).push(fn); },
  open: function (id) {
    var o = document.getElementById(id); if (!o) return false;
    (RKF.modal._onOpen[id] || []).forEach(function (fn) { try { fn(o); } catch (e) {} });
    o.classList.add('show');
    return true;
  },

  close: function (id) {
    if (id) { var o = document.getElementById(id); if (o) o.classList.remove('show'); return; }
    document.querySelectorAll('.ovl').forEach(function (o) { o.classList.remove('show'); });
  },

  armBackdropGuard: function () {
    if (RKF.modal._armed) return; RKF.modal._armed = true;
    document.addEventListener('mousedown', function (e) {
      RKF.modal._down = (e.target.classList && e.target.classList.contains('ovl')) ? e.target : null;
    }, true);
    document.addEventListener('click', function (e) {
      if (!(e.target.classList && e.target.classList.contains('ovl'))) return; 
      if (RKF.modal._down !== e.target) return;                                
      RKF.modal.close();                                                       /* real close */
    });
  },

  stalePurge: function (id, opts) {
    var o = document.getElementById(id); if (!o) return;
    opts = opts || {};
    o.querySelectorAll('input,select,textarea').forEach(function (el) {
      if (el.dataset && el.dataset.touched) delete el.dataset.touched; 
      if (RKF.inputLaw) RKF.inputLaw.hint(el, null);                    
    });
    (opts.inputs || []).forEach(function (iid) { var el = document.getElementById(iid); if (el) el.value = ''; });
    if (typeof opts.fn === 'function') opts.fn(o);
  },

  a11y: function (id) {
    var list = id ? [document.getElementById(id)].filter(Boolean) : Array.prototype.slice.call(document.querySelectorAll('.ovl'));
    list.forEach(function (o) {
      var m = o.querySelector('.modal'); if (!m) return;
      m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
      var h = m.querySelector('h3');
      if (h) { if (!h.id) h.id = (o.id || 'dlg') + '-title'; m.setAttribute('aria-labelledby', h.id); }
      else { m.setAttribute('aria-label', 'Dialog'); }
      try {
        new MutationObserver(function () {
          if (o.classList.contains('show')) {

            var f = m.querySelector('input:not([type=hidden]):not([readonly]):not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])');
            if (f) try { f.focus(); } catch (e2) {}
          }
        }).observe(o, { attributes: true, attributeFilter: ['class'] });
      } catch (e3) {}
    });
  }
};

RKF.guard = function (fnName, fn) {
  var FLY = RKF.guard._fly;
  var wrapped = function () {
    if (FLY[fnName]) return; FLY[fnName] = true;
    var b = document.activeElement; if (!b || b.tagName !== 'BUTTON') b = null;
    var lbl = b ? b.textContent : null;
    if (b) { b.disabled = true; b.textContent = 'Saving…'; }
    var done = function () { FLY[fnName] = false; if (b) { b.disabled = false; b.textContent = lbl; } };
    var r; try { r = fn.apply(this, arguments); } catch (e) { done(); throw e; }
    if (r && typeof r.then === 'function') return r.then(function (v) { done(); return v; }, function (e) { done(); throw e; });
    done(); return r;
  };
  RKF.guard.wrapped.push(fnName);
  return wrapped;
};
RKF.guard._fly = {};
RKF.guard.wrapped = [];

RKF.zeroRow = function (result) {
  return !!result && !result.error && Array.isArray(result.data) && result.data.length === 0;
};


RKF.toast = function (msg, actions, opts) {
  opts = opts || {};
  var el = opts.el || document.getElementById('toast-el');
  if (!el) {
    el = document.createElement('div'); el.id = 'toast-el';
    el.className = 'rkf-toast' + (opts.variant === 'dark' ? ' rkf-toast-dark' : '');
    document.body.appendChild(el);
  }

  el.classList.add('rkf-toast');
  if (opts.clickable) el.classList.add('rkf-actions-clickable'); 
  clearTimeout(RKF.toast._t);
  el.textContent = msg;
  var rich = Object.prototype.toString.call(actions) === '[object Array]' && actions.length > 0;
  if (rich) {
    actions.forEach(function (a) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'toast-act'; b.textContent = a.label;
      b.style.cssText = 'background:none;border:none;padding:0;margin-left:14px;color:#8fd0ff;font:inherit;font-weight:700;cursor:pointer;text-decoration:underline';
      b.onclick = function () { el.classList.remove('show'); if (typeof a.fn === 'function') a.fn(); };
      el.appendChild(b);
    });
  }
  el.classList.add('show');
  RKF.toast._t = setTimeout(function () { el.classList.remove('show'); }, rich ? 8000 : 2800);
  return el;
};

if (!global.__toastEsc) {
  global.__toastEsc = 1;
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var t = document.getElementById('toast-el'); if (t) t.classList.remove('show'); }
  });
}

RKF.caseLaw = {

  CAPS: /(^|[-_])code$|code$|gstin|gst(?![a-z])|pan(?![a-z])|aadh|aad(?![a-z])|ifsc|hsn|udyam|tally|alias|^m-id$|^nqunit$|^nl-id$|^nl-prefix$|^vtok$|^dtan$|gstataddr|(^|[-_])tan$/,

  EMAIL: /e-?mail|website/,

  SKIP: /search|filter|^q$|^gs-input$|^gsearch$|^imp-text$|^tmpl-text$|^tpl-copy-content$|^custta$|^refta$|^nqcustta$|^nqrefta$|^nritem$|^recpick$|^qa$|^rexecta$|^ls-|^intin$|^rq$|-q$/,

  KEEP: /^vl$|^ev-label$|^tg-sched$|^(tg|ce)-v[12]$|^es-seg-text-|^f-label$|^mt-label$|^mt-base$|^lv-label$|^ptc-calc$|^pono$|^nqpono$|^m2c-|^u-phone$/,

  SENTENCE: /reason|remark|note|(^|[-_])rsn|(^|[-_])rem($|[-_])|^rs-input$|^czask$|^fuout$|^netxt_|^newhy_/,

  norm: function (k) { return String(k || '').toLowerCase(); },
  isCaps: function (k) { k = RKF.caseLaw.norm(k);
    if (/pincode|pin$/.test(k)) return false;      
    return RKF.caseLaw.CAPS.test(k); },
  isEmail: function (k) { return RKF.caseLaw.EMAIL.test(RKF.caseLaw.norm(k)); },
  lower: function (v) { return String(v == null ? '' : v).toLowerCase(); },
  isSkip: function (k) { return RKF.caseLaw.SKIP.test(RKF.caseLaw.norm(k)); },
  isKeep: function (k) { return RKF.caseLaw.KEEP.test(RKF.caseLaw.norm(k)); },

  isSentence: function (k) { return RKF.caseLaw.SENTENCE.test(RKF.caseLaw.norm(k)); },

  keyOf: function (el) { return (el && (el.id || el.name)) || ''; },

  governs: function (el) {
    if (!el || el.readOnly || el.disabled) return false;
    var tag = (el.tagName || '').toLowerCase();
    if (tag === 'textarea') return true;
    if (tag !== 'input') return false;
    var t = (el.getAttribute('type') || 'text').toLowerCase();
    return t === 'text' || t === '' || t === 'email' || t === 'url';
  },

  upper: function (v) { return String(v == null ? '' : v).toUpperCase(); },

  isAllCaps: function (v) {
    var t = String(v == null ? '' : v);
    return /[A-Za-z]/.test(t) && t === t.toUpperCase();
  }
};

RKF.inputLaw = {
  patterns: { gstin: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/ },

  pc: function (s) {
    return String(s == null ? '' : s).replace(/[^\s\-\/\.\(]+/g, function (w) {
      if (RKF.caseLaw.isAllCaps(w)) return w;
      w = w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
  },

  sc: function (s) {
    if (s === null || s === undefined) return s;
    return String(s).replace(/(^\s*|[.!?]\s+)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
  },

  hint: function (el, msg) {
    if (!el || !el.id) return;
    var id = el.id + '-dupwarn', h = document.getElementById(id);
    if (msg) {
      if (!h) { h = document.createElement('div'); h.id = id; h.className = 'hint rkf-dupwarn'; el.insertAdjacentElement('afterend', h); }
      h.textContent = msg; h.style.display = 'block'; el.style.borderColor = 'var(--warn,#b07a12)';
    } else {
      if (h) { h.textContent = ''; h.style.display = 'none'; }
      el.style.borderColor = '';
    }
  },

  checkPattern: function (id, v) {
    var p = RKF.inputLaw.patterns[id]; if (!p) return true;
    return p.test(v);
  },
  attach: function (root, config) {
    root = root || document;
    var cfg = config || {};
    var rules = {}; (cfg.dupWarnRules || []).forEach(function (r) { rules[r.id] = r; });
    if (cfg.codePatterns) Object.keys(cfg.codePatterns).forEach(function (k) { RKF.inputLaw.patterns[k] = cfg.codePatterns[k]; });

    root.addEventListener('input', function (e) {
      var t = e.target, id = t && t.id; if (!id) return;
      var r = rules[id];
      if (r && !t.readOnly) {
        var owner = r.existing(t.value);
        RKF.inputLaw.hint(t, owner ? r.msg(owner) : null);
      }
    }, true);
  }
};

RKF.fmtDMY = function (v, opts) {
  if (!v) return (opts && ('empty' in opts)) ? opts.empty : '-';
  if (v instanceof Date) {
    return String(v.getDate()).padStart(2, '0') + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + v.getFullYear();
  }
  var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3] + '-' + m[2] + '-' + m[1]) : String(v);
};

RKF.inr = function (n, opts) {
  var s = Number(n || 0).toLocaleString('en-IN');
  return (opts && opts.symbol) ? '₹' + s : s;
};

RKF.client = function (url, key) {

  setTimeout(function () { try { RKF.idleGuard(15); } catch (e) {} }, 0);

  var framed = false; try { framed = (global.top !== global); } catch (e) { framed = true; }
  if (framed) {
    var pc = null;
    try { pc = (global.parent && global.parent.RKF && global.parent.RKF._client) || null; } catch (e2) { pc = null; }
    if (pc) { RKF._client = pc; return pc; }
  } else {
    var isShell = false;
    try { isShell = (global.document && global.document.documentElement && global.document.documentElement.getAttribute('data-rkf-palette') === 'shell'); } catch (e3) { isShell = false; }
    if (!isShell) {
      try {
        var L = global.location;
        if (L && typeof L.replace === 'function' && typeof L.pathname === 'string') {
          var f = L.pathname.slice(L.pathname.lastIndexOf('/') + 1).replace(/\.html$/i, '');
          L.replace('index.html#' + f);
          return null;   
        }
      } catch (e4) {}
    }
  }
  if (!global.supabase || !global.supabase.createClient) throw new Error('supabase-js missing');
  RKF._client = global.supabase.createClient(url, key, { auth: { lock: function (_n, _t, fn) { return fn(); } } });
  return RKF._client;
};

RKF.load = function (table, cols, filters) {
  var f = filters || {};
  var c = f.client || RKF._client;
  if (!c) return Promise.reject(new Error('RKF.load: no client - call RKF.client(url,key) first'));
  var q = c.from(table).select(cols);
  if (f.eq) Object.keys(f.eq).forEach(function (k) { q = q.eq(k, f.eq[k]); });
  if (f.in) Object.keys(f.in).forEach(function (k) { q = q.in(k, f.in[k]); });
  if (f.order) {
    var oc = (typeof f.order === 'string') ? f.order : f.order.column;
    q = (typeof f.order === 'string') ? q.order(oc) : q.order(oc, { ascending: f.order.ascending !== false });
  }
  if (f.limit) q = q.limit(f.limit);
  return q.then(function (r) {
    if (r.error) throw new Error(table + ': ' + r.error.message);
    return r.data || [];
  });
};

RKF.loading = function (show, text) {
  var s = document.getElementById('uat-loadstrip');
  if (show) {
    if (!s) {
      s = document.createElement('div'); s.id = 'uat-loadstrip'; s.className = 'rkf-loadstrip';
      s.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;text-align:center;padding:5px 0;font-size:11px;font-weight:600;letter-spacing:.4px;background:var(--surface2,#f6f9fc);color:var(--muted,#8a97a6);border-bottom:1px solid var(--line,#e4e9ef)';
      document.body.appendChild(s);
    }
    s.textContent = text || 'Loading live data…';
    return s;
  }
  if (s && s.parentNode) s.parentNode.removeChild(s);
  return null;
};

RKF.keys = {
  register: function (cfg) {
    cfg = cfg || {};
    var map = cfg.ctrlS || null, fallback = cfg.ctrlSFallback || null;
    if (map || fallback) {
      document.addEventListener('keydown', function (e) {
        if (!((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S'))) return;
        e.preventDefault(); 
        var open = RKF._topOpenDialog();

        if (open) { if (map && map[open.id]) map[open.id](); return; }
        if (fallback) fallback();
      });
    }
    if (cfg.escCloses) {
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var open = RKF._topOpenDialog(); if (!open) return;
        if (cfg.escCloses === 'mapped' && !(map && map[open.id])) return; 
        e.preventDefault();
        document.querySelectorAll('.ovl').forEach(function (o) { o.classList.remove('show'); });
      });
    }
    if (cfg.enterSave) {

      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var open = RKF._topOpenDialog(); if (!open || !(map && map[open.id])) return;
        var t = e.target; if (t && (t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault(); map[open.id]();
      });
    }
    if (cfg.altR) {

      document.addEventListener('keydown', function (e) {
        if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'r' || e.key === 'R')) { e.preventDefault(); cfg.altR(); }
      });
    }
  },

  hint: function (btnId, label) {
    var b = document.getElementById(btnId); if (!b) return null;
    var s = document.createElement('span'); s.className = 'kbd-hint rkf-hint';
    s.textContent = label || 'Ctrl+S';
    b.appendChild(s);
    return s;
  }
};

RKF.recents = {
  push: function (t, c, l) {
    try {
      var a = JSON.parse(localStorage.getItem('rk_recents') || '[]'); if (!Array.isArray(a)) a = [];
      a = a.filter(function (x) { return !(x && x.t === t && x.c === c); });
      a.unshift({ t: t, c: String(c), l: String(l || c), at: Date.now() });
      localStorage.setItem('rk_recents', JSON.stringify(a.slice(0, 10)));
    } catch (e) {}
  },
  read: function () {
    try { var a = JSON.parse(localStorage.getItem('rk_recents') || '[]'); return Array.isArray(a) ? a.slice(0, 10) : []; }
    catch (e) { return []; }
  }
};

RKF.theme = {
  apply: function () {
    try { if (localStorage.getItem('rk_theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); } catch (e) {}
  },
  toggle: function () {
    var r = document.documentElement, on = r.getAttribute('data-theme') === 'dark';
    if (on) r.removeAttribute('data-theme'); else r.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('rk_theme', on ? 'light' : 'dark'); } catch (e) {}
  },
  current: function () {
    try { return localStorage.getItem('rk_theme') || 'light'; } catch (e) { return 'light'; }
  }
};

RKF.blocked = function (el, reasonText) {
  if (!el) return null;
  if (el.tagName === 'SELECT') {
    el.innerHTML = '<option value="" disabled selected>' + escHtml(reasonText) + '</option>';
  } else {
    el.classList.add('rkf-blocked');
    el.textContent = reasonText;
  }
  return el;
};

RKF.banner = function (items) {
  var d = document.createElement('div'); d.className = 'rkf-banner';
  (items || []).forEach(function (it) {
    var s = document.createElement('span'); s.className = 'rkf-banner-item';
    if (typeof it === 'string') s.textContent = it;
    else {
      s.textContent = it.label;
      if (it.ok === true) s.classList.add('ok');
      if (it.ok === false) s.classList.add('bad');
    }
    d.appendChild(s);
  });
  return d;
};

RKF.empty = function (el, text, cta) {
  if (!el) return null;
  el.classList.add('rkf-blocked');
  el.textContent = text;
  if (cta && cta.label) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'rkf-empty-cta';
    b.textContent = cta.label;
    b.onclick = function () { if (typeof cta.fn === 'function') cta.fn(); };
    el.appendChild(b);
  }
  return el;
};

RKF.access = {
  RANK: { 'None': 0, 'Read': 1, 'Full': 2 },
  resolve: function (employee, roleMapRows, rmaRows, overrideRows, modules) {
    var RANK = RKF.access.RANK;
    var held = (roleMapRows || []).filter(function (r) { return r.employee_code === employee && r.active; })
      .map(function (r) { return r.role_code; });
    var mods = modules;
    if (!mods) { 
      var seen = {}; mods = [];
      (rmaRows || []).concat(overrideRows || []).forEach(function (r) {
        if (r.module_code && !seen[r.module_code]) { seen[r.module_code] = 1; mods.push({ module_code: r.module_code, module_name: r.module_name || r.module_code, active: true }); }
      });
    }
    return mods.filter(function (m) { return m.active !== false; }).map(function (m) {
      var ov = (overrideRows || []).filter(function (o) { return o.employee_code === employee && o.module_code === m.module_code; })[0];
      if (ov) return { module_code: m.module_code, module_name: m.module_name, access: ov.access_level, origin: 'Employee override' };
      var best = null, bestRole = null;
      (rmaRows || []).forEach(function (r) {
        if (r.module_code !== m.module_code || held.indexOf(r.role_code) < 0) return;
        if (best === null || (RANK[r.access_level] || 0) > (RANK[best] || 0)) { best = r.access_level; bestRole = r.role_code; }
      });
      if (best !== null) return { module_code: m.module_code, module_name: m.module_name, access: best, origin: 'Role ' + bestRole };
      return { module_code: m.module_code, module_name: m.module_name, access: 'None', origin: 'default' };
    });
  },

  secENote: function () {
    return 'Access law (m04.md §E): Admin full control; all other roles see own record only - row-level enforcement activates with the auth identity link (D3a, P2). P1 UAT operator = Admin.';
  }
};

})(typeof window !== 'undefined' ? window : this);

(function (global) {
'use strict';
var RKF = global.RKF; if (!RKF || RKF.typeahead) return;
function escT(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
RKF.typeahead = function (id, opts) {
  opts = opts || {};
  var sel = document.getElementById(id); if (!sel || sel.dataset.ta) return null; sel.dataset.ta = '1';
  var wrap = document.createElement('div'); wrap.className = 'rkf-typeahead'; wrap.setAttribute('data-typeahead', '');
  sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(sel);
  sel.style.display = 'none'; sel.tabIndex = -1;
  var inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'ta-input'; inp.id = id + '-ta'; inp.autocomplete = 'off';
  inp.placeholder = opts.placeholder || 'Type to search…';
  inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-expanded', 'false');
  var list = document.createElement('div'); list.className = 'ta-list'; list.style.display = 'none';
  wrap.appendChild(inp); wrap.appendChild(list);
  var SEL = -1;
  function options() { return Array.prototype.slice.call(sel.options).filter(function (o) { return !o.disabled; }); }
  function close() { list.style.display = 'none'; list.innerHTML = ''; SEL = -1; inp.setAttribute('aria-expanded', 'false'); }
  function paintSel(items) { Array.prototype.forEach.call(items, function (it, i) { it.classList.toggle('sel', i === SEL); }); }
  function openList(q) {
    q = String(q || '').trim().toLowerCase();
    var opts2 = options().filter(function (o) { return !q || o.text.toLowerCase().indexOf(q) >= 0; });
    list.innerHTML = opts2.length
      ? opts2.map(function (o) { return '<div class="ta-item" data-v="' + escT(o.value) + '">' + escT(o.text) + '</div>'; }).join('')
      : '<div class="ta-none">' + escT(opts.emptyMsg || 'No match') + '</div>';
    list.style.display = 'block'; SEL = -1; inp.setAttribute('aria-expanded', 'true');
  }
  function pick(v) {
    sel.value = v;
    var o = options().filter(function (x) { return x.value === v; })[0];
    inp.value = (o && v) ? o.text : '';
    close();
    try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
  }
  function sync() {
    var o = sel.options[sel.selectedIndex];
    inp.value = (o && sel.value) ? o.text : '';
  }
  inp.addEventListener('input', function () { openList(inp.value); });
  inp.addEventListener('focus', function () { sync(); openList(''); });
  inp.addEventListener('keydown', function (e) {
    var items = list.querySelectorAll('.ta-item');
    if (e.key === 'Escape') { if (list.style.display !== 'none') { e.stopPropagation(); e.preventDefault(); close(); } return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.style.display === 'none') { openList(inp.value); return; }
      if (!items.length) return;
      SEL = e.key === 'ArrowDown' ? Math.min(SEL + 1, items.length - 1) : Math.max(SEL - 1, 0);
      paintSel(items);
      if (items[SEL] && items[SEL].scrollIntoView) items[SEL].scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter') {
      if (list.style.display !== 'none' && items.length) {
        e.preventDefault(); e.stopPropagation();
        var it = items[SEL >= 0 ? SEL : 0]; pick(it.getAttribute('data-v'));
      }
      return;
    }
    if (e.key === 'Tab') close();
  });
  list.addEventListener('mousedown', function (e) {
    var it = e.target && e.target.closest ? e.target.closest('.ta-item') : null;
    if (it) { e.preventDefault(); pick(it.getAttribute('data-v')); }
  });
  inp.addEventListener('blur', function () { setTimeout(function () { sync(); close(); }, 120); });
  return wrap;
};
})(typeof window !== 'undefined' ? window : this);

(function (W) {
  'use strict';
  var _dpState = {};
  function $id(i){ return document.getElementById(i); }

  function dmyToIso(s){ if(!s) return ''; var p=s.split('-'); return (p.length===3&&p[0].length===2)?(p[2]+'-'+p[1]+'-'+p[0]):s; }
  function isoToDMY(d){ if(!d) return d; var p=String(d).split('-'); return p.length===3?(p[2]+'-'+p[1]+'-'+p[0]):d; }
  function readDMY(id){ return dmyToIso(($id(id)||{}).value||''); }
  function dmyMask(el){ var v=el.value.replace(/[^0-9]/g,'').slice(0,8); var out=v; if(v.length>4) out=v.slice(0,2)+'-'+v.slice(2,4)+'-'+v.slice(4); else if(v.length>2) out=v.slice(0,2)+'-'+v.slice(2); el.value=out; }
  function dpOpen(ev,id){ ev.stopPropagation(); var cal=$id(id+'-cal'); if(!cal) return; if(cal.style.display==='block'){ cal.style.display='none'; return; } var cur=readDMY(id); var base=cur?new Date(cur):new Date(); _dpState[id]={y:base.getFullYear(),m:base.getMonth()}; dpRender(id); cal.style.display='block';

    var _f=$id(id), _r=_f?_f.getBoundingClientRect():cal.parentNode.getBoundingClientRect();
    var _h=cal.offsetHeight||250, _t=_r.bottom+4, _l=_r.left;
    if(_t+_h>window.innerHeight-8) _t=Math.max(8,_r.top-_h-4);
    if(_l+218>window.innerWidth) _l=Math.max(8,window.innerWidth-218);
    cal.style.position='fixed'; cal.style.top=_t+'px'; cal.style.left=_l+'px'; cal.style.right='auto'; cal.style.marginTop='0'; }
  function dpRender(id){ var st=_dpState[id]; var cal=$id(id+'-cal'); var mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; var first=new Date(st.y,st.m,1).getDay(); var days=new Date(st.y,st.m+1,0).getDate();
    var h='<div class="dp-hd"><button type="button" onclick="dpNav(event,\''+id+'\',-1)">&#8249;</button><span>'+mn[st.m]+' '+st.y+'</span><button type="button" onclick="dpNav(event,\''+id+'\',1)">&#8250;</button></div><div class="dp-grid">';
    ['S','M','T','W','T','F','S'].forEach(function(d){ h+='<div class="dp-dow">'+d+'</div>'; });
    for(var i=0;i<first;i++) h+='<div></div>';
    for(var d=1;d<=days;d++){ var iso=st.y+'-'+String(st.m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0'); h+='<div class="dp-day" onclick="dpPick(event,\''+id+'\',\''+iso+'\')">'+d+'</div>'; }
    h+='</div>'; cal.innerHTML=h; }
  function dpNav(ev,id,dir){ ev.stopPropagation(); var st=_dpState[id]; st.m+=dir; if(st.m<0){st.m=11;st.y--;} if(st.m>11){st.m=0;st.y++;} dpRender(id); }

  function dpPick(ev,id,iso){ ev.stopPropagation(); var el=$id(id); el.value=isoToDMY(iso); $id(id+'-cal').style.display='none';
    try{ el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){} }
  function dateFieldHTML(id){ return '<div class="dpf" style="position:relative;display:flex;align-items:center">'+
    '<input id="'+id+'" class="in" data-datepicker placeholder="DD-MM-YYYY" maxlength="10" oninput="dmyMask(this)" autocomplete="off" style="flex:1"/>'+
    '<button type="button" onclick="dpOpen(event,\''+id+'\')" title="Pick date" style="position:absolute;right:4px;border:none;background:none;cursor:pointer;font-size:15px;line-height:1">&#128197;</button>'+
    '<div id="'+id+'-cal" class="dp-cal" style="display:none"></div></div>'; }

  document.addEventListener('click', function () {
    document.querySelectorAll('.dp-cal').forEach(function (c) { c.style.display = 'none'; });
  });

  W.RKF = W.RKF || {};
  W.RKF.datepicker = { open:dpOpen, render:dpRender, nav:dpNav, pick:dpPick,
                       mask:dmyMask, toIso:dmyToIso, fromIso:isoToDMY,
                       read:readDMY, fieldHTML:dateFieldHTML };

  ['dmyToIso','isoToDMY','readDMY','dmyMask','dpOpen','dpRender','dpNav','dpPick','dateFieldHTML']
    .forEach(function (n) { if (typeof W[n] === 'undefined') W[n] = eval(n); });
})(typeof window !== 'undefined' ? window : this);

(function (W) {
  'use strict';
  function normalise(a2, a3, a4) {
    var kind = '', actions = null;
    if (Object.prototype.toString.call(a2) === '[object Array]') actions = a2;
    else if (typeof a2 === 'string') kind = a2;
    if (typeof a3 === 'string' && typeof a4 === 'function') actions = [{ label: a3, fn: a4 }];
    return { kind: kind, actions: actions };
  }
  W.toast = function (msg, a2, a3, a4) {
    var n = normalise(a2, a3, a4);
    var rich = !!(n.actions && n.actions.length);
    var el = W.RKF.toast(msg, n.actions, { clickable: rich });   
    if (el) {
      el.classList.remove('ok', 'err', 'warn');
      if (n.kind) el.classList.add(n.kind);
    }
    return el;
  };

  W.toastAction = function (msg, label, fn) { return W.toast(msg, '', label, fn); };

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var el = document.getElementById('toast-el');
    if (el) el.classList.remove('show');
  });
})(typeof window !== 'undefined' ? window : this);

(function (W) {
  'use strict';
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtDate(d) {
    if (!d) return '—';
    var p = ('' + d).slice(0, 10).split('-');
    return p.length === 3 ? (p[2] + '-' + p[1] + '-' + p[0]) : d;
  }
  async function saveGuard(btn, label, fn) {
    if (!btn) return fn();
    var t0 = btn.textContent;
    btn.disabled = true; btn.textContent = label || 'Saving…';
    try { return await fn(); }
    finally { btn.disabled = false; btn.textContent = t0; }
  }
  W.RKF = W.RKF || {};
  W.RKF.escHtml = esc; W.RKF.fmtDate = fmtDate; W.RKF.saveGuard = saveGuard;
  ['esc', 'fmtDate', 'saveGuard'].forEach(function (n) {
    if (typeof W[n] === 'undefined') W[n] = { esc: esc, fmtDate: fmtDate, saveGuard: saveGuard }[n];
  });
})(typeof window !== 'undefined' ? window : this);

(function (W) {
  'use strict';
  var NATIVE = /^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY)$/;

  function isControl(el) {
    if (NATIVE.test(el.tagName)) return false;              
    if (el.hasAttribute('tabindex')) return false;           
    if (el.hasAttribute('role')) return false;
    var oc = el.getAttribute('onclick') || '';
    if (!oc) return false;
    if (/stopPropagation\(\)\s*;?\s*$/.test(oc.trim())) return false;  
    return true;
  }

  function promote(root) {
    var n = 0;
    (root || document).querySelectorAll('div[onclick],span[onclick]').forEach(function (el) {
      if (!isControl(el)) return;
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.classList.add('rkf-kbd-activatable');
      n++;
    });
    return n;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    var el = document.activeElement;
    if (!el || !el.classList || !el.classList.contains('rkf-kbd-activatable')) return;
    e.preventDefault();
    el.click();
  });

  function boot() {
    promote(document);
    if (W.MutationObserver) {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          for (var j = 0; j < muts[i].addedNodes.length; j++) {
            var nd = muts[i].addedNodes[j];
            if (nd.nodeType === 1) { if (isControl(nd)) promote(nd.parentNode || document); else promote(nd); }
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  W.rkfA11yAudit = function () {
    var unnamed = [];
    document.querySelectorAll('.rkf-kbd-activatable').forEach(function (el) {
      var name = (el.textContent || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title');
      if (!name) unnamed.push(el.className + ' :: ' + (el.getAttribute('onclick') || '').slice(0, 50));
    });
    return { promoted: document.querySelectorAll('.rkf-kbd-activatable').length,
             unnamed: unnamed.length, detail: unnamed };
  };
  W.RKF = W.RKF || {}; W.RKF.a11y = { promote: promote, audit: W.rkfA11yAudit };
})(typeof window !== 'undefined' ? window : this);

(function (W) {
  'use strict';
  var SEL = '.ovl,[data-rkf-dialog]';
  var OPEN = /(^|\s)(show|on)(\s|$)/;

  function isOpen(el) { return OPEN.test(el.className || ''); }

  function firstEditable(dlg) {
    var c = dlg.querySelectorAll('input,select,textarea');
    for (var i = 0; i < c.length; i++) {
      var el = c[i];
      if (el.disabled || el.readOnly || el.type === 'hidden') continue;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      var cs = W.getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      return el;
    }
    return null;
  }

  var restore = new (W.WeakMap || Object)();
  var lastFocus = null;

  function onOpen(dlg) {
    var prev = document.activeElement;
    if (prev && prev !== document.body && !dlg.contains(prev)) {
      try { restore.set(dlg, prev); } catch (e) { lastFocus = prev; }
    }

    if (dlg.contains(document.activeElement)) return;
    var f = firstEditable(dlg);
    if (f) { try { f.focus(); } catch (e) {} }

  }

  function onClose(dlg) {
    var prev = null;
    try { prev = restore.get(dlg); restore['delete'] && restore['delete'](dlg); } catch (e) { prev = lastFocus; }
    if (!prev) prev = lastFocus;
    if (prev && document.contains(prev)) { try { prev.focus(); } catch (e) {} }
    lastFocus = null;
  }

  function watch(dlg) {
    if (dlg.__rkfDlg) return;
    dlg.__rkfDlg = true;
    var was = isOpen(dlg);
    if (!W.MutationObserver) return;
    new W.MutationObserver(function () {
      var now = isOpen(dlg);
      if (now === was) return;
      was = now;
      if (now) onOpen(dlg); else onClose(dlg);
    }).observe(dlg, { attributes: true, attributeFilter: ['class'] });
  }

  function scan(root) {
    (root || document).querySelectorAll(SEL).forEach(watch);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    setTimeout(function () {
      var open = [];
      document.querySelectorAll('[data-rkf-dialog]').forEach(function (d) { if (isOpen(d)) open.push(d); });
      if (!open.length) return;

      var outer = open.filter(function (d) {
        return !open.some(function (o) { return o !== d && o.contains(d); });
      });
      var top = outer[outer.length - 1];
      if (!top) return;
      top.className = top.className.replace(/(^|\s)(show|on)(\s|$)/g, ' ').trim();
    }, 0);
  });

  function boot() {
    scan(document);
    if (W.MutationObserver) {
      new W.MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          for (var j = 0; j < muts[i].addedNodes.length; j++) {
            var nd = muts[i].addedNodes[j];
            if (nd.nodeType !== 1) continue;
            if (nd.matches && nd.matches(SEL)) watch(nd);
            scan(nd);
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  function topOpenDialog() {
    var open = [];
    document.querySelectorAll(SEL).forEach(function (d) { if (isOpen(d)) open.push(d); });
    if (!open.length) return null;
    var outer = open.filter(function (d) {
      return !open.some(function (o) { return o !== d && o.contains(d); });
    });
    return outer[outer.length - 1] || null;
  }

  W.RKF = W.RKF || {};
  W.RKF._topOpenDialog = topOpenDialog;
  W.RKF.dialog = { watch: watch, scan: scan, firstEditable: firstEditable };
})(typeof window !== 'undefined' ? window : this);

(function (global) {
  var W = global, SURFACES = [];

  function registerSurface(name, cfg) {
    if (!name || !cfg || typeof cfg.close !== 'function') return false;
    var isOpen = (typeof cfg.isOpen === 'function') ? cfg.isOpen : function () { return true; };
    var depth = (typeof cfg.depth === 'number') ? cfg.depth : 0;
    for (var i = 0; i < SURFACES.length; i++) {
      if (SURFACES[i].name === name) { SURFACES[i] = { name: name, isOpen: isOpen, close: cfg.close, depth: depth }; return true; }
    }
    SURFACES.push({ name: name, isOpen: isOpen, close: cfg.close, depth: depth });
    return true;
  }
  function unregisterSurface(name) {
    SURFACES = SURFACES.filter(function (s) { return s.name !== name; });
  }
  function openSurfaces() {
    return SURFACES.filter(function (s) { try { return !!s.isOpen(); } catch (e) { return false; } })
                   .sort(function (a, b) { return b.depth - a.depth; });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = openSurfaces();
    if (!open.length) return;
    var top = open[0];
    try { top.close(); } catch (err) { return; }   
    e.preventDefault();
    e.stopPropagation();
  }, true);   

  W.RKF = W.RKF || {};
  W.RKF.registerSurface = registerSurface;
  W.RKF.unregisterSurface = unregisterSurface;
  W.RKF.registeredSurfaces = function () { return SURFACES.map(function (s) { return s.name; }); };
  W.registerSurface = registerSurface;   
})(typeof window !== 'undefined' ? window : this);

(function (W) {
  'use strict';
  var RKF = W.RKF = W.RKF || {};

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  /* TRI-STATE One loading */
  RKF.triState = function (mount, state, message) {
    if (!mount) return;
    mount.innerHTML = '';
    if (state === 'loading') { mount.appendChild(el('div', 'rkf-state', message || 'Loading')); return; }
    if (state === 'empty')   { mount.appendChild(el('div', 'rkf-empty', message || 'Nothing to show')); return; }
    if (state === 'error')   { mount.appendChild(el('div', 'rkf-error', message || 'Could not load')); return; }
  };

  RKF.activityLog = function (mount, opts) {
    opts = opts || {};
    var c = opts.client || RKF._client;
    if (!mount) return;
    if (!c) { RKF.triState(mount, 'error', 'Not connected'); return; }
    if (!opts.module_code || !opts.record_key) { RKF.triState(mount, 'empty'); return; }

    var COLS = ['Changed on', 'Field', 'Previous value', 'New value', 'Changed by'];
    var box = el('div', 'rkf-alog'), tbl = el('table', 'rkf-table'), thead = el('thead'), tb = el('tbody');
    var htr = el('tr');
    COLS.forEach(function (h) { htr.appendChild(el('th', null, h)); });
    thead.appendChild(htr); tbl.appendChild(thead); tbl.appendChild(tb);
    box.appendChild(tbl);
    var more = el('div', 'rkf-alog-more');
    var loaded = 0;

    function draw(rows) {
      rows.forEach(function (r) {
        var tr = el('tr');
        COLS.forEach(function (k) { tr.appendChild(el('td', null, r[k] == null ? '' : String(r[k]))); });
        tb.appendChild(tr);
      });
      loaded += rows.length;
    }

    function page(before) {
      var payload = { module_code: opts.module_code, record_key: String(opts.record_key) };
      if (opts.record_entity) payload.record_entity = opts.record_entity;
      if (before) payload.before = before;
      return c.rpc('rpc_history_read', { p_payload: payload }).then(function (res) {
        var d = RKF.env(res, { fail: function (m) { RKF.triState(mount, 'error', m); } });
        if (!d) { return; }
        var rows = d.rows || [];
        if (!loaded && !rows.length) { RKF.triState(mount, 'empty', opts.emptyMessage || 'No changes recorded'); return; }
        if (!loaded) { mount.innerHTML = ''; mount.appendChild(box); }
        draw(rows);
        if (more.parentNode) more.parentNode.removeChild(more);
        if (d.next_cursor && rows.length) {
          more.innerHTML = '';
          var b = el('button', 'btn', 'Load more');
          b.type = 'button';
          b.addEventListener('click', function () { b.disabled = true; page(d.next_cursor); });
          more.appendChild(b);
          box.appendChild(more);
        }
      });
    }

    RKF.triState(mount, 'loading');
    return page(null)['catch'](function () {

      RKF.triState(mount, 'error', 'Could not load activity log.');
    });
  };

  /* SERVED MODULE PERMISSION Session-derived */
  var ACCESS = null;
  RKF.moduleAccess = function (moduleCode, opts) {
    opts = opts || {};
    var c = opts.client || RKF._client;
    if (!c || !moduleCode) return Promise.resolve('None');
    if (ACCESS) return Promise.resolve(ACCESS[moduleCode] || 'None');
    return c.rpc('get_effective_permissions').then(function (res) {
      if (res.error) return 'None';
      ACCESS = {};
      (res.data || []).forEach(function (r) { ACCESS[r.module_code] = r.access_level; });
      return ACCESS[moduleCode] || 'None';
    })['catch'](function () { return 'None'; });
  };

  RKF.activityLogGated = function (mount, opts) {
    opts = opts || {};
    if (!mount) return Promise.resolve('None');
    return RKF.moduleAccess(opts.module_code, opts).then(function (lvl) {
      if (lvl !== 'Read' && lvl !== 'Full') {
        if (mount.parentNode) mount.parentNode.removeChild(mount);
        return lvl;
      }
      return Promise.resolve(RKF.activityLog(mount, opts)).then(function () { return lvl; });
    });
  };

  RKF.exportRows = function (rows, filename, columns, opts) {
    rows = rows || [];
    opts = opts || {};
    var out;
    if (rows.length && typeof rows[0] === 'string') {
      out = rows.slice();
    } else {
      var cols = columns && columns.length ? columns
               : (rows.length ? Object.keys(rows[0]) : []);
      var cell = function (v) {
        if (v == null) return '';
        var s = String(v);
        return (/[",\n]/.test(s)) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      out = [cols.join(',')];
      rows.forEach(function (r) { out.push(cols.map(function (k) { return cell(r[k]); }).join(',')); });
    }
    var blob = new Blob([(opts.bom ? '﻿' : '') + out.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'export.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 0);
  };

  RKF.importFile = function (file, onRows, onError) {
    if (!file) return;
    var rd = new FileReader();
    rd.onerror = function () { if (onError) onError('The file could not be read'); };
    rd.onload = function () {
      try {
        var lines = String(rd.result).split(/\r?\n/).filter(function (l) { return l.length; });
        if (!lines.length) { if (onError) onError('The file is empty'); return; }
        var head = lines.shift().split(',').map(function (h) { return h.replace(/^"|"$/g, '').trim(); });
        var rows = lines.map(function (l) {
          var cells = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
          var o = {};
          head.forEach(function (h, i) {
            var v = (cells[i] || '').replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"');
            o[h] = v;
          });
          return o;
        });
        onRows(rows, head);
      } catch (e) { if (onError) onError('The file could not be read'); }
    };
    rd.readAsText(file);
  };

  RKF.queueKV = function (label, value) {
    var kv = el('div', 'rkf-q-kv');
    kv.appendChild(el('span', null, label));
    kv.appendChild(el('div', null, value == null ? '' : String(value)));
    return kv;
  };
  RKF.queueRow = function (pairs) {
    var row = el('div', 'rkf-q-row');
    (pairs || []).forEach(function (p) { row.appendChild(RKF.queueKV(p[0], p[1])); });
    return row;
  };
})(typeof window !== 'undefined' ? window : this);

(function (W) {
  'use strict';
  var RKF = W.RKF = W.RKF || {};

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function initials(name, code) {
    var s = String(name || '').trim();
    if (s) {
      var p = s.split(/\s+/);
      return (p[0].charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
    }
    return String(code || '?').slice(-2).toUpperCase();
  }

  RKF.profile = function (mount, identity, opts) {
    if (!mount) return null;
    opts = opts || {};
    identity = identity || {};

    var wrap = el('div', 'rkf-prof');
    var btn = el('button', 'rkf-prof-btn', initials(identity.full_name, identity.employee_code));
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.title = 'Profile';
    btn.setAttribute('aria-label', 'Profile');

    var pop = el('div', 'rkf-prof-pop');
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Profile');

    var hd = el('div', 'rkf-prof-hd');
    hd.appendChild(el('div', 'rkf-prof-code', identity.employee_code || 'Employee code not resolved'));
    hd.appendChild(el('div', 'rkf-prof-name', identity.full_name || 'Name not resolved'));
    pop.appendChild(hd);

    function row(label, value) {
      var r = el('div', 'rkf-prof-row');
      r.appendChild(el('b', null, label));
      r.appendChild(el('div', null, value));
      return r;
    }
    pop.appendChild(row('Role', identity.role_label || 'Not resolved'));
    pop.appendChild(row('Unit', identity.unit_label || 'Not resolved'));

    var ft = el('div', 'rkf-prof-ft');
    ft.appendChild(row('E-mail', identity.email || 'Not resolved'));
    pop.appendChild(ft);

    wrap.appendChild(btn);
    wrap.appendChild(pop);
    mount.appendChild(wrap);

    function close() { pop.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    function open() { pop.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (pop.classList.contains('open')) { close(); } else { open(); }
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pop.classList.contains('open')) { close(); btn.focus(); }
    });

    var c = opts.client || RKF._client;
    if (c) {
      c.rpc('get_effective_permissions').then(function (res) {
        if (res.error) return;
        var rows = (res.data || []).filter(function (r) {
          return r.access_level === 'Full' || r.access_level === 'Read';
        });
        if (!rows.length) return;               
        var full = rows.filter(function (r) { return r.access_level === 'Full'; }).length;
        var read = rows.length - full;
        var txt = full + ' full' + (read ? ', ' + read + ' read only' : '');
        hd.parentNode.insertBefore(row('Access', txt), ft);
      })['catch'](function () {  });
    }

    return { open: open, close: close, element: wrap };
  };

  /* RAIL */
  RKF.railModules = function (modules, accessMap) {
    var m = accessMap || {};
    return (modules || []).filter(function (mod) {
      if (!mod || mod.active !== true) return false;
      var lvl = m[mod.module_code];
      return lvl === 'Full' || lvl === 'Read';
    });
  };
})(typeof window !== 'undefined' ? window : this);

(function (W) {
  'use strict';
  var RKF = W.RKF = W.RKF || {};
  if (!RKF.caseLaw || RKF._caseLawInstalled) return;
  RKF._caseLawInstalled = true;

  var CL = RKF.caseLaw;

  function decide(el) {
    if (!CL.governs(el)) return null;
    var k = CL.keyOf(el);
    if (k && (CL.isSkip(k) || CL.isKeep(k))) return null;
    if (k && CL.isCaps(k)) return 'upper';
    if (k && CL.isEmail(k)) return 'lower';
    if (k && CL.isSentence(k)) return 'sentence';
    return 'proper';
  }
  RKF.caseLaw.decide = decide;

  document.addEventListener('input', function (e) {
    var el = e.target; if (decide(el) !== 'upper') return;
    var u = CL.upper(el.value);
    if (u !== el.value) {
      var p = el.selectionStart, q = el.selectionEnd;
      el.value = u;
      try { el.setSelectionRange(p, q); } catch (x) {}   
    }
  }, true);

  function put(el, v) {
    if (v === el.value) return;
    el.value = v;
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (x) {}
  }
  function applyCase(el) {
    var d = decide(el); if (!d || d === 'upper') return;
    var v = el.value; if (!v || !v.trim()) return;
    if (d === 'sentence') return put(el, RKF.inputLaw.sc(v));
    if (d === 'lower') return put(el, CL.lower(v));
    put(el, RKF.inputLaw.pc(v));
  }
  RKF.caseLaw.apply = applyCase;

  document.addEventListener('blur', function (e) { applyCase(e.target); }, true);

  document.addEventListener('keydown', function (e) {
    var el = e.target; if (!el) return;
    var save = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');
    var enter = e.key === 'Enter' && (el.tagName || '').toLowerCase() !== 'textarea';
    if (save || enter) applyCase(el);
    if ((e.key === 'Enter' || e.key === ' ') && (el.tagName || '').toLowerCase() === 'th' && el.hasAttribute && el.hasAttribute('aria-sort')) {
      e.preventDefault(); el.click();
    }
  }, true);
})(typeof window !== 'undefined' ? window : this);

/* FORM FIELD */
(function (W) {
  'use strict';
  function el(id){ return document.getElementById(id); }
  function box(id){ return el(id + '-rule'); }
  function mark(id, bad){
    var f = el(id); if (!f) return;
    var wrap = f.closest ? f.closest('.rkf-field, .fld, .field') : null;
    if (wrap) wrap.classList.toggle('is-bad', !!bad);
  }
  var field = {
    rule: function (id, msg) { var b = box(id); if (b) b.textContent = msg || ''; mark(id, !!msg); },
    clear: function (ids) { (ids || []).forEach(function (i) { field.rule(i, ''); }); },
    required: function (pairs) {
      (pairs || []).forEach(function (p) {
        var f = el(p[0]); if (!f) return;
        f.addEventListener('blur', function () { field.rule(p[0], f.value ? '' : p[1]); });
        f.addEventListener('change', function () { field.rule(p[0], ''); });
      });
    },
    firstBad: function (pairs) {
      var first = null;
      (pairs || []).forEach(function (p) {
        var f = el(p[0]);
        var ok = (typeof p[2] === 'function') ? p[2]() : !!(f && f.value);
        field.rule(p[0], ok ? '' : p[1]);
        if (!ok && !first) first = p[0];
      });
      return first;
    }
  };
  W.RKF = W.RKF || {}; W.RKF.field = field;
})(window);

(function (W) {
  'use strict';
  function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function toggleHTML(opts){
    opts = opts || {};
    var attrs = 'type="checkbox"'
      + (opts.on ? ' checked' : '')
      + (opts.disabled ? ' disabled' : '')
      + (opts.name ? ' name="' + esc(opts.name) + '"' : '')
      + (opts.label ? ' aria-label="' + esc(opts.label) + '"' : '')
      + (opts.onchange ? ' onchange="' + opts.onchange + '"' : '');
    return '<label class="rkf-toggle' + (opts.readonly ? ' readonly' : '') + '">'
      + '<input ' + attrs + '/><span class="rkf-toggle-track"></span></label>';
  }

  var TONES = {active:1, pending:1, blocked:1, info:1, special:1, retired:1};
  function chipHTML(text, tone, opts){
    opts = opts || {};
    var cls = 'rkf-chip';
    if (tone && TONES[tone]) cls += ' rkf-chip--' + tone;
    if (opts.small) cls += ' rkf-chip-sm';
    if (opts.code)  cls += ' rkf-chip-code';

    var t = String(text == null ? '' : text);
    if (!t.trim()) return '';
    return '<span class="' + cls + '"' + (opts.title ? ' title="' + esc(opts.title) + '"' : '')
      + '>' + esc(t) + '</span>';
  }

  function toggleRevert(el){ if (el) el.checked = el.defaultChecked; return true; }

  W.RKF = W.RKF || {};
  W.RKF.toggle = { html: toggleHTML, revert: toggleRevert };
  W.RKF.chip   = { html: chipHTML, tones: Object.keys(TONES) };
})(window);

/* ERROR TEXT */
(function (W) {
  'use strict';
  W.RKF = W.RKF || {};
  var VOCAB = {
    "AUTH_ACTOR_INVALID": "Your login is not linked to an active employee record.",
    "AUTH_NOT_AUTHENTICATED": "Not signed in.",
    "AUTH_NOT_BOUND": "Your login is not linked to an active employee record.",
    "AUTH_AMBIGUOUS": "Your login is linked to more than one employee record.",
    "AUTH_NO_ROLE": "Your role does not allow this action.",
    "AUTH_NO_AUTHORITY": "You do not hold the authority for this decision.",
    "VALIDATION": "Some of the values are not acceptable.",
    "NOT_FOUND": "That record no longer exists.",
    "HISTORY_NOT_CONFIGURED": "No change history is configured for this record.",
    "STALE_WRITE": "Someone else changed this record. Nothing saved.",
    "CONFLICT": "That record already exists.",
    "REPLAY": "Already recorded.",
    "AUTH": "Your login does not allow this.",
    "INTERNAL": "Something went wrong. Nothing was saved.",
    "UNEXPECTED": "Something went wrong. Nothing was saved.",
    "SOD_SELF_DECISION": "You cannot decide a request you raised yourself.",
    "EVENT_UNKNOWN": "That event is not one the workflow knows.",
    "MODULE_NOT_DECLARED": "This module is not declared to workflow.",
    "NOT_REGISTERED": "That is not registered.",
    "NOT_A_VOCABULARY": "That list is not a status vocabulary.",
    "WF_CLASS_AMBIGUOUS": "The workflow class could not be decided.",
    "UNIT_NOT_PERMITTED": "That unit is not open to you.",
    "NO_PRINTABLE_TRUTH": "Nothing printable is recorded for this document.",
    "DOC_TEMPLATE_UNREGISTERED": "No template is registered for this document.",
    "DOC_TEMPLATE_MISMATCH": "That template does not belong to this document type.",
    "DOC_NO_DATA_SOURCE": "This document type has no data source.",
    "DOC_NOT_RELEASABLE": "A customer copy cannot be taken in this state.",
    "DOC_IMMUTABLE": "That document cannot be changed.",
    "DOC_ASSET_DUPLICATE": "That asset already exists.",
    "DOC_BUCKET_MISSING": "The asset store is not set up.",
    "DOC_BUCKET_PUBLIC": "The asset store must not be public.",
    "PDF_RENDER_ERROR": "The document could not be produced.",
    "PDF_NOT_READY": "The document is still being prepared. Try again shortly.",
    "PDF_URL_FAILED": "No download link could be made.",
    "M02A_PREFIX_REQUIRED": "A prefix is required for this format.",
    "M02A_LIST_ID_DUP": "That list ID already exists.",
    "M02A_PTCLASS_DUP": "That PT class already exists.",
    "M02A_NUMERIC_REQUIRED": "A numeric value is required for this list.",
    "M02A_PTYPE_FIELDS_REQUIRED": "PTNo calc class and item category are required.",
    "M02A_VALUE_CODE_DUP": "That code already exists.",
    "M02A_LAST_ACTIVE_VALUE": "The last active value cannot be deactivated.",
    "M02A_REASON_REQUIRED": "A reason is required.",
    "M02A_LIST_SHAPE_INVALID": "That list shape is not accepted.",
    "M03_SCOPE_UNKNOWN": "One of those scopes is not available.",
    "M03_USE_STATUS_CHANGE": "Active or Inactive is changed through the status action.",
    "M03_FIELD_NOT_WRITABLE": "One of those fields cannot be set here.",
    "M03_TALLY_ALIAS_REQUIRED": "Tally Alias is required.",
    "M03_ACTIVE_NEEDS_RESPONSIBLE": "An Active unit needs a Primary Responsible.",
    "M03_VALUE_TOO_LONG": "A value is too long.",
    "M03_REASON_REQUIRED": "A reason is required.",
    "M03_DUPLICATE": "That record already exists.",
    "M03_GUARD": "That change was refused.",
    "M03_NOT_PERMITTED": "Not permitted for your role.",
    "M03_REFERENCE_INVALID": "That reference no longer exists.",
    "M04_LAST_ADMIN": "The last Admin cannot be removed.",
    "M04_SOD_CONFLICT": "Those roles cannot be held together.",
    "M04_DELEGATION_OVERLAP": "An active delegation already covers that period.",
    "M04_DUPLICATE": "That record already exists.",
    "M04_REFERENCE_INVALID": "That reference no longer exists.",
    "M04_VALUE_TOO_LONG": "A value is too long.",
    "M04_GUARD": "That change was refused.",
    "MRM_DUPLICATE": "That record already exists.",
    "MRM_REFERENCE_INVALID": "That reference no longer exists.",
    "MRM_VALUE_TOO_LONG": "A value is too long.",
    "MRM_NOT_FOUND": "That record no longer exists.",
    "MRM_BAD_PAYLOAD": "The request was not in an accepted shape.",
    "MRM_IMMUTABLE": "That record cannot be changed.",
    "MRM_PROTECTED": "That record is protected.",
    "MRM_GUARD": "That change was refused.",
    "MRM_REASON_REQUIRED": "A reason is required.",
    "MCONFIG_BAD_PAYLOAD": "The request was not in an accepted shape.",
    "MCONFIG_DUPLICATE": "That record already exists.",
    "MCONFIG_GUARD": "That change was refused.",
    "MCONFIG_REFERENCE_INVALID": "That reference no longer exists.",
    "MCONFIG_VALUE_TOO_LONG": "A value is too long.",
    "M05_NOTE_UNCHANGED": "The note is unchanged.",
    "M06_FROZEN": "Approved \u2014 terms are locked.",
    "M06_SUPERSEDED": "A newer revision exists \u2014 this one is read-only.",
    "M06_CUSTOMER_INVALID": "This customer cannot be quoted right now.",
    "M06_CUSTOMER_UOM_INVALID": "That is not a unit the customer may be billed in.",
    "M06_REFERRER_NOT_ACTIVE": "Only an active referrer can be attached.",
    "M06_ILLEGAL_TRANSITION": "That status cannot follow this one.",
    "M06_TOTALS_DIRTY": "The totals are out of date. Price first.",
    "M06_UNPRICED": "Every line needs a price before approval.",
    "M06_UNPRICEABLE_LINE": "Some lines could not be priced.",
    "M06_UOM_NOT_DECLARED": "That unit is not approved for this item.",
    "M06_CUST_NOT_ELIGIBLE": "This item cannot take that customisation.",
    "M06_NOT_APPROVED": "Only an approved quote can be sent.",
    "M06_REASON_REQUIRED": "A reason is required.",
    "M06_ALREADY_REVISED": "A newer revision already exists.",
    "M06_TERMINAL": "This quote is closed.",
    "M06_RATE_INVALID": "That is not a rate the system can accept.",
    "M06_RATE_REQUIRED": "This line needs a rate.",
    "M06_RATE_ZERO": "A rate of zero cannot be saved.",
    "M06_LENGTH_REQUIRED": "This item needs a length.",
    "M06_LINE_NOT_FOUND": "That line is no longer on this quote.",
    "M06_LINE_REFUSED": "That line was not accepted \u2014 the reason is below.",
    "M06_OVERRIDE_CONFLICT": "Type a rate or return to the list, not both.",
    "M06_CHARGE_KEY_REMOVED": "Charges are saved in the Charges band.",
    "M06_CHARGE_LIST_EMPTY": "No charge list is published.",
    "M06_CHARGE_CODE_INVALID": "That charge is not on the published list.",
    "M06_CHARGE_CODE_INACTIVE": "That charge has been retired from the published list.",
    "M06_PENDING_APPROVAL": "An approval is open. Decide or withdraw it first.",
    "M06_OPEN_APPROVAL": "An approval is open. Nothing changed.",
    "M06_INVALID_DELIVERY_MODE": "That delivery mode is not on the published list.",
    "M06_DELIVERY_SCOPE_REQUIRED": "State the delivery scope first.",
    "M06_EMPLOYEE_INVALID": "That employee is not on the employee master.",
    "M06_NOT_A_SALESPERSON": "That person is not a salesperson.",
    "M06_SAME_VALUE": "Already holds that value.",
    "M06_ASK_EMPTY": "The asked specification cannot be empty.",
    "M06_ASK_LENGTH_INVALID": "The asked length must be greater than zero.",
    "M06_ASK_SW_BASIS_INVALID": "Section weight must be the standard or a specific value.",
    "M06_ASK_UNIT_MISSING": "The asked specification needs its unit.",
    "M06_ASK_UOM_NOT_GOVERNED": "That is not a unit on the published list.",
    "M06_ASK_UOM_NOT_IN_ITEM_SET": "That unit is not approved for this item.",
    "M06_ASK_NOT_CUSTOMIZED": "Add the customisation on this line first.",
    "M06_ATTACHMENT_DUPLICATE_PATH": "That attachment is already on this line.",
    "M06_ATTACHMENT_KIND_INVALID": "That attachment kind is not accepted.",
    "M06_WF_SETSTATUS_REFUSED": "The workflow could not move this quote.",
    "M06_ALREADY_WITHDRAWN": "This quote was already withdrawn.",
    "M06_WITHDRAW_BLOCKED_BY_ORDER": "A sales order stands on this quote.",
    "M06_WITHDRAW_BLOCKED_BY_LEAD": "The lead behind this quote blocks the withdrawal.",
    "M06_ROUTE_NO_WORKFLOW": "No active workflow decides this quote.",
    "M06_ROUTE_NOT_CONFIGURED": "No approval route is configured for this quote.",
    "M06_ROUTE_TIER_NOT_RECOGNISED": "That approval level is not one the company uses.",
    "M07_SELF_APPROVAL": "You cannot approve what you raised yourself.",
    "M07_DELEGATE_SELF_APPROVAL": "The delegate cannot approve what they raised.",
    "M07_DELEGATE_IS_REQUESTER": "The delegate raised this request.",
    "M07_AUTHORITY_NOT_HELD": "The chosen approver does not hold that authority.",
    "M07_AUTHORITY_HOLDER_INVALID": "That authority holder is not valid.",
    "M07_STALE_APPROVAL": "This changed since the approval was raised. Raise it again.",
    "M07_NOT_PENDING": "That approval is no longer waiting on a decision.",
    "M07_NOT_OPEN": "That approval is not open.",
    "M07_NOTE_REQUIRED": "A note is required here.",
    "M07_ONBEHALF_NOT_ACCEPTED": "A decision cannot be recorded on someone else's behalf.",
    "M07_PAYLOAD_ACTOR_NOT_ACCEPTED": "The acting employee comes from your sign-in.",
    "M07_DELEGATION_SELF": "A delegation cannot point at the same person.",
    "M07_DELEGATION_NOT_FOUND": "No delegation is recorded for that person.",
    "M07_DELEGATOR_NOT_PERMITTED": "That person cannot delegate this decision.",
    "M07_NO_HIGHER_TIER": "There is no level above this one to escalate to.",
    "M08_FROZEN": "Approved \u2014 terms are locked.",
    "M08_SUPERSEDED": "A newer revision exists \u2014 this one is read-only.",
    "M08_TERMINAL": "This order is closed.",
    "M08_ALREADY_REVISED": "A newer revision already exists.",
    "M08_PRODUCTION_STARTED": "Production has started on this order.",
    "M08_ALREADY_EDITABLE": "This order is already open to change.",
    "M08_ILLEGAL_TRANSITION": "That status cannot follow this one.",
    "M08_NOT_A_MANUAL_MOVE": "Only Cancel, Credit-Hold and Resume are moved by hand.",
    "M08_SAME_STATUS": "Already holds that status.",
    "M08_SAME_VALUE": "Already holds that value.",
    "M08_NOT_ON_HOLD": "This order is not on credit hold.",
    "M08_NO_PRIOR_STATUS": "No earlier status was recorded, so it cannot resume.",
    "M08_HOLD_ACCOUNTS_ONLY": "Only Accounts can place or release a credit hold.",
    "M08_ORPHAN_GUARD": "Cancelling this would leave work behind it with no order.",
    "M08_CHILDREN_ACTIVE": "Work has been raised from this order.",
    "M08_CUSTOMER_INVALID": "This customer cannot take an order right now.",
    "M08_CUSTOMER_BLOCKED": "This customer is blocked. No order can be raised.",
    "M08_CATEGORY_INVALID": "That is not a direct-order category the company uses.",
    "M08_ORIGIN_SHAPE": "A direct order has a category; a quote order, its quote.",
    "M08_ORIGIN_CARRY_V2": "The quote's figures could not be carried onto the order.",
    "M08_QUOTE_NOT_WON": "Only a won quote becomes a sales order.",
    "M08_QUOTE_LINE_INVALID": "That quote line cannot be carried onto this order.",
    "M08_OVER_CONVERSION": "More has been ordered than the quote line carries.",
    "M08_COVERAGE_GIVEBACK_FAILED": "The quote line could not be given its quantity back.",
    "M08_UNIT_INVALID": "That is not a unit on the unit master.",
    "M08_EXECUTING_UNIT_MISSING": "This order needs an executing unit.",
    "M08_CUSTOMER_PO_REQUIRED": "This order needs the customer's PO number.",
    "M08_DELIVERY_DATE_REQUIRED": "This order needs a required delivery date.",
    "M08_REFERRER_NOT_ACTIVE": "Only an active referrer can be attached.",
    "M08_COMMISSION_NEEDS_REFERRER": "A commission needs a referrer on the order.",
    "M08_DEAL_DISCOUNT_REMOVED": "The deal discount is retired. Discount is per line.",
    "M08_ATTRIBUTE_NOT_GOVERNED": "That field cannot be changed here.",
    "M08_REASON_REQUIRED": "A reason is required.",
    "M08_NOTE_REQUIRED": "A note is required here.",
    "M08_LINE_NOT_FOUND": "That line is no longer on this order.",
    "M08_LINE_REFUSED": "That line was not accepted \u2014 the reason is below.",
    "M08_UOM_NOT_DECLARED": "That unit is not approved for this item.",
    "M08_CUSTOMER_UOM_INVALID": "That is not a unit the customer may be billed in.",
    "M08_LENGTH_REQUIRED": "This item needs a length.",
    "M08_RATE_REQUIRED": "This line needs a rate.",
    "M08_RATE_ZERO": "A rate of zero cannot be saved.",
    "M08_OVERRIDE_CONFLICT": "Type a rate or return to the list, not both.",
    "M08_UNPRICED_LINES": "Every line needs a price before approval.",
    "M08_UNPRICEABLE_LINE": "Some lines could not be priced.",
    "M08_TOTALS_DIRTY": "The totals are out of date. Price first.",
    "M08_CUST_NOT_ELIGIBLE": "This item cannot take that customisation.",
    "M08_CUST_DUPLICATE_LINE": "That customisation is already on this line.",
    "M08_CUST_CHARGE_NEGATIVE": "A customisation charge cannot be negative.",
    "M08_CUST_SPEC_NOT_DECLARED": "That measurement is not declared for this customisation.",
    "M08_CUST_UOM_NOT_DECLARED": "That unit is not declared for this customisation.",
    "M08_CUST_ASK_INCOMPLETE": "This customisation still needs its measurements.",
    "M08_CUST_BRIDGE_MISSING": "This customisation is not configured for this item.",
    "M08_CUST_LEGACY_PAYLOAD": "That customisation was sent in a retired shape.",
    "M08_ASK_EMPTY": "The asked specification cannot be empty.",
    "M08_ASK_LENGTH_INVALID": "The asked length must be greater than zero.",
    "M08_ASK_SW_BASIS_INVALID": "Section weight must be the standard or a specific value.",
    "M08_ASK_UNIT_MISSING": "The asked specification needs its unit.",
    "M08_ASK_UOM_NOT_GOVERNED": "That is not a unit on the published list.",
    "M08_ASK_UOM_NOT_IN_ITEM_SET": "That unit is not approved for this item.",
    "M08_CHARGE_KEY_REMOVED": "Charges are saved in the Charges band.",
    "M08_CHARGE_LIST_EMPTY": "No charge list is published.",
    "M08_CHARGE_CODE_INVALID": "That charge is not on the published list.",
    "M08_CHARGE_CODE_INACTIVE": "That charge has been retired from the published list.",
    "M08_DOC_TYPE_INVALID": "That document type is not on the published list.",
    "M08_DOC_TYPE_INACTIVE": "That document type has been retired.",
    "M08_DOC_LIST_EMPTY": "No document-type list is published.",
    "M08_DOC_ALREADY_WITHDRAWN": "That document was already withdrawn.",
    "M08_CONFIRMATION_DOC_REQUIRED": "A confirmation document is required before this.",
    "M08_DOCUMENT_SNAPSHOT_FAILED": "The customer details could not be frozen onto this order.",
    "M08_OPEN_APPROVAL": "An approval is open. Nothing changed.",
    "M08_APPROVAL_STILL_OPEN": "An approval is open. Decide or withdraw it first.",
    "M08_NOT_PENDING": "That approval is no longer waiting on a decision.",
    "M08_NOT_OPEN": "That approval is not open.",
    "M08_NOT_APPROVED": "Only an approved order can go on from here.",
    "M08_STALE_APPROVAL": "That approval changed since you opened it. Nothing saved.",
    "M08_SELF_APPROVAL": "You cannot approve an order you raised yourself.",
    "M08_DECISION_REFUSED": "That decision was refused \u2014 the reason is below.",
    "M08_AUTO_APPROVE_REFUSED": "This order cannot be approved without a person.",
    "M08_TIER_EXCEEDED": "This is above what you may approve.",
    "M08_NO_HIGHER_TIER": "There is no level above this one to escalate to.",
    "M08_AUTHORITY_NOT_HELD": "You do not hold the authority for this decision.",
    "M08_AUTHORITY_HOLDER_INVALID": "That authority holder is not valid.",
    "M08_ONBEHALF_NOT_ACCEPTED": "A decision cannot be recorded on someone else's behalf.",
    "M08_DELEGATION_NOT_FOUND": "No delegation is recorded for that person.",
    "M08_DELEGATION_SELF": "A delegation cannot point at the same person.",
    "M08_DELEGATE_IS_REQUESTER": "The delegate raised this order.",
    "M08_DELEGATE_SELF_APPROVAL": "The delegate cannot approve what they raised.",
    "M08_DELEGATOR_NOT_PERMITTED": "That person cannot delegate this decision.",
    "M08_ROUTE_NOT_CONFIGURED": "No approval route is configured for this order.",
    "M08_ROUTE_NO_WORKFLOW": "No active workflow decides this order.",
    "M08_ROUTE_NO_AUTHORITY": "Nobody holds the authority to decide this order.",
    "M08_ROUTE_NO_TAT": "No response time is set for this approval level.",
    "M08_ROUTE_SELF": "The route points back at the person who raised it.",
    "M08_ROUTE_TIER_NOT_RECOGNISED": "That approval level is not one the company uses.",
    "M08_ROUTE_FAILED": "The order could not be routed for approval.",
    "M08_WF_SETSTATUS_REFUSED": "The workflow could not move this order.",
    "M08_REFUSED": "That was refused \u2014 the reason is below.",
    "M08_PRIORITY_INVALID": "That priority is not on the published list.",
    "M08_PRIORITY_FLAG_RETIRED": "Pick the priority from the Order Priority list.",
    "M10_NOT_DRAFT": "This document has left the draft.",
    "M10_ORDER_NOT_IN_QUEUE": "The order is no longer in the production queue.",
    "M10_RELEASE_REFUSED": "The release was refused.",
    "M10_RELEASE_NOT_READY": "This document is not ready to release.",
    "M10_CANCEL_REFUSED": "The cancellation was refused.",
    "M10_TERMINAL": "This document is already closed.",
    "M10_UNIT_MISMATCH": "That bay, machine or store belongs to another unit.",
    "M10_UNIT_UNKNOWN": "That unit is not one of the active units.",
    "M10_NOT_YOUR_UNIT": "Not yours to move between factories.",
    "M10_NO_CHANGE": "Nothing changed.",
    "M10_DATE_REQUIRED": "The delivery date cannot be emptied.",
    "M10_LAST_LINE": "A document keeps at least one line.",
    "M10_LAST_OPERATION": "A line keeps at least one operation.",
    "M10_REASON_REQUIRED": "Say why this document is being cancelled.",
    "M10_INCHARGE_NOT_IN_PRODUCTION": "That person cannot be the incharge of this document.",
    "23505": "That record already exists.",
    "23503": "That reference no longer exists.",
    "23502": "A required value is missing.",
    "23514": "Some of the values are not acceptable.",
    "22P02": "That value is not in the expected format.",
    "22003": "That number is too large for this field.",
    "22008": "That is not a real calendar date.",
    "22001": "A value is too long.",
    "42501": "Not permitted for your role.",
    "42883": "That server action is not available.",
    "42703": "The request was not in an accepted shape.",
    "P0001": "That change was refused.",
    "P0002": "That record no longer exists.",
    "PGRST301": "Not signed in, or the session expired.",
    "PGRST116": "That record no longer exists.",
    "PGRST202": "That server action is not available.",
    "57014": "The server took too long. Try again.",
    "08006": "Connection unavailable.",
    "NETWORK": "Connection unavailable."
  };
  var RULES = [
    ["chk_q_rca_close", "Lost or Dropped needs a closing reason."],
    ["chk_q_rca2_needs_rca1", "Pick the main closing reason before the sub-reason."],
    ["chk_q_valdays", "The validity must be at least one day."],
    ["chk_q_leadtimes", "Lead times cannot be negative."],
    ["chk_q_disc", "A discount must be between 0 and 100 percent."],
    ["chk_q_comm", "A commission must be between 0 and 100 percent."],
    ["chk_q_status", "Not a valid quote status."],
    ["chk_q_pt_list", "Pick a payment term from the published list."],
    ["chk_q_ins_list", "Pick an insurance option from the published list."],
    ["chk_q_delterms_list", "Pick a delivery term from the published list."],
    ["chk_q_delscope_list", "Pick a delivery scope from the published list."],
    ["chk_qhc_amount", "A charge cannot be a negative amount."],
    ["chk_qhc_list", "Pick a charge from the published list of charges."],
    ["uq_qhc_quote_code", "That charge is already on this quote."],
    ["chk_ql_qty", "Every line needs a quantity greater than zero."],
    ["chk_ql_rate", "A rate cannot be negative."],
    ["chk_ql_disc", "A line discount must be between 0 and 100 percent."],
    ["chk_ql_comm", "A line commission must be between 0 and 100 percent."],
    ["chk_ql_swbasis", "Section weight must be the standard or a specific value."],
    ["chk_ql_coverage", "More quantity has been converted than the line carries."],
    ["uq_quote_no_rev", "That quote number and revision already exist."],
    ["chk_qa_reqne", "The approver cannot be the person who raised the quote."],
    ["chk_qa_tier", "That approval level is not one the company uses."],
    ["number_series", "Numbering is switched off."],
    ["next_number", "Numbering is switched off."],
    ["chk_so_status", "Not a valid order status."],
    ["chk_so_pt_list", "Pick a payment term from the published list."],
    ["chk_so_ins_list", "Pick an insurance option from the published list."],
    ["chk_so_delterms_list", "Pick a delivery term from the published list."],
    ["chk_so_delscope_list", "Pick a delivery scope from the published list."],
    ["chk_so_delmode_list", "Pick a delivery mode from the published list."],
    ["chk_so_cat_list", "Pick a direct-order category from the published list."],
    ["chk_so_comm", "A commission must be between 0 and 100 percent."],
    ["chk_so_commission_needs_referrer", "A commission needs a referrer on the order."],
    ["chk_so_origin_shape", "A direct order has a category; a quote order, its quote."],
    ["chk_so_origin", "An order is either direct or from a quote."],
    ["chk_so_customer_xor", "An order carries a customer or an internal unit, not both."],
    ["chk_so_orgcust_cat", "An internal-unit order must be that category."],
    ["chk_so_po_date", "The customer's PO cannot be dated after the order."],
    ["chk_so_advance", "An advance cannot exceed the order value."],
    ["chk_so_totals", "A total cannot be negative."],
    ["chk_so_supply", "Supply is either within the state or outside it."],
    ["uq_so_no_rev", "That order number and revision already exist."],
    ["chk_sl_qty", "Every line needs a quantity greater than zero."],
    ["chk_sl_disc", "A line discount must be between 0 and 100 percent."],
    ["chk_sl_comm", "A line commission must be between 0 and 100 percent."],
    ["chk_sl_amount", "A line amount cannot be negative."],
    ["chk_sl_gst", "A GST rate must be between 0 and 100 percent."],
    ["chk_sl_swbasis", "Section weight must be the standard or a specific value."],
    ["uq_sl_line", "That line number is already on this order."],
    ["chk_slc_qty", "A customisation needs a quantity greater than zero."],
    ["chk_slc_manual_unit_price", "A customisation price cannot be negative."],
    ["chk_slc_charge", "A customisation charge cannot be negative."],
    ["uq_slc_line_subline", "That customisation is already on this line."],
    ["chk_slas_not_empty", "The asked specification cannot be empty."],
    ["chk_slas_customer_length", "The asked length must be greater than zero."],
    ["chk_q_commission_needs_referrer", "A commission needs a referrer on the quote."],
    ["uq_cust_gstin", "Duplicate GSTIN \u2014 that customer already exists."],
    ["uq_cust_mobile_type", "Duplicate: same mobile and type already registered."],
    ["uq_cust_pan", "Duplicate PAN \u2014 that customer already exists."],
    ["uq_cust_aadhaar", "Duplicate Aadhaar \u2014 that customer already exists."],
    ["chk_cust_mobile", "Mobile must be 10 digits starting 6-9."],
    ["chk_cctc_mobile", "Mobile must be 10 digits starting 6-9."],
    ["chk_cust_gstin", "GSTIN format invalid."],
    ["chk_caddr_gst", "GSTIN format invalid."],
    ["chk_cust_pan", "PAN format invalid."],
    ["chk_cust_partner_side", "Side must be Debtor, Creditor or Both."],
    ["chk_cust_debtor_side", "A Debtor needs a customer type and a lead source."],
    ["chk_cust_creditor_side", "A Creditor needs vendor type, purchase employee, accounts person and terms."],
    ["chk_cust_vendor_type_list", "Choose the vendor type from the list."],
    ["fk_cust_vendor_type", "Choose the vendor type from the list."],
    ["chk_cust_creditor_terms_list", "Choose the creditor payment terms from the list."],
    ["fk_cust_creditor_terms", "Choose the creditor payment terms from the list."],
    ["fk_cust_purchase_emp", "Choose the purchase employee from the list."],
    ["fk_cust_accounts_emp", "Choose the accounts person from the list."],
    ["chk_cust_msme", "MSME needs the Udyam number and the category."],
    ["chk_cust_msme_category", "MSME category must be Micro, Small or Medium."],
    ["chk_cust_udyam", "Enter the Udyam number exactly as the certificate shows it."],
    ["chk_cust_bank_acno", "Bank account number must be 9 to 18 digits."],
    ["chk_cust_bank_ifsc", "Enter the IFSC exactly as the bank prints it."],
    ["chk_cust_bank_pair", "Enter both the bank account number and the IFSC."],
    ["uq_cust_mobile_vendor_type", "A partner with this mobile and vendor type already exists."],
    ["chk_cust_status", "That is not a status a partner can hold."],
    ["chk_caddr_type", "Choose the address type from the list."],
    ["chk_caddr_consignee_type", "A consignee belongs on a Shipping address."],
    ["chk_caddr_consignee_mobile", "Consignee mobile must be 10 digits starting 6 to 9."],
    ["chk_caddr_consignee_needs_mobile", "A consignee needs a mobile number."],
    ["chk_caddr_pincode", "Pincode must be 6 digits."],
    ["chk_cust_pincode", "Pincode must be 6 digits."],
    ["chk_lead_convert", "An approved customer code is required to convert."],
    ["chk_lead_rca_close", "Lost and Dropped need a reason."],
    ["chk_lead_status", "That status is not a legal lead state."],
    ["chk_lsa_to", "That status is not a legal lead state."],
    ["chk_lead_pincode", "Pincode must be 6 digits and cannot start with 0."],
    ["chk_lead_referral", "Source is Referral \u2014 an Active referrer is required."],
    ["chk_lead_party", "A lead needs an approved customer or a prospect name."],
    ["chk_lpi_qty", "Every product of interest needs a quantity greater than zero."],
    ["chk_lead_priority", "Pick the priority from the published list."],
    ["fk_lead_priority", "Pick the priority from the published list."],
    ["uq_lead_code", "That lead number already exists."],
    ["lead_ccr", "A CCR is required."],
    ["pincode_master", "Pincode not in the postal master."],
    /* 2026-09-21: the sign-in refusals of m01_session_actor / fn_assert_module_writer (672, 673) and the module gate */
    ["ACTOR_MISMATCH", "Opened under another sign-in. Reload the page."],
    ["AUTH_NOT_AUTHENTICATED", "Not signed in, or the session expired."],
    ["AUTH_NOT_BOUND", "Your login is not linked to an active employee record."],
    ["MODULE_NOT_PERMITTED", "Your role does not allow this action."]
  ];
  var SQLISH = /violat|constraint|\brelation\b|\bcolumn\b|syntax|null value|duplicate key|out of range|invalid input|permission denied|\bSQLSTATE\b|\bP0\d{3}\b|\b\d{5}\b|\bpg_|\bfunction\b|\buuid\b|\bjsonb?\b|\bnull\b|\bpayload\b|[A-Za-z0-9]+_[A-Za-z0-9_]+|\b[a-z]+\.[a-z_]+\b|\b[A-Z]{1,4}-\d+\b|\bR\d{2}\b|\b(?:M\d{2}[a-e]?|M-?CONFIG|M-?RM|M-?REF|WFQ|DDR|RPC|API)\b|[{}\[\]<>"`\\]|\(\w+\)$/;
  function words(s) { return String(s).trim().split(/\s+/).filter(Boolean).length; }
  function passes(m) { m = String(m || '').trim(); return !!m && words(m) <= 11 && /[a-z]/.test(m) && !SQLISH.test(m); }
  function cap(m) { m = String(m).trim(); return m.charAt(0).toUpperCase() + m.slice(1); }
  function codeOf(e) {
    if (!e || typeof e === 'string') return '';
    return String(e.rpcCode || e.code || e.error_code || (e.error && e.error.code) || '').trim();
  }
  function msgOf(e) {
    if (!e) return '';
    if (typeof e === 'string') return e;
    return String(e.message || e.error_description || (e.error && e.error.message) || e.reason || '');
  }
  function detailOf(e) {
    if (!e || typeof e === 'string') return '';
    var d = (e.rpcDetail !== undefined ? e.rpcDetail : (e.detail !== undefined ? e.detail : (e.details !== undefined ? e.details : e.hint)));
    if (d === null || d === undefined) return '';
    if (typeof d === 'string') return d;
    try { return JSON.stringify(d); } catch (x) { return String(d); }
  }
  function ruleOf(s) {
    s = String(s || ''); if (!s) return '';
    for (var i = 0; i < RULES.length; i++) if (s.indexOf(RULES[i][0]) >= 0) return RULES[i][1];
    return '';
  }
  /* 2026-09-21 (P8): a save sent after the sign-in is gone reaches the server as nobody and comes back 'permission denied';
     that is not a role matter. supabase-js keeps the sign-in in localStorage (sb-<project>-auth-token); signing out in any tab removes it. */
  function signedOut() {
    try { for (var i = 0; i < W.localStorage.length; i++) { var k = W.localStorage.key(i); if (/^sb-.+-auth-token$/.test(k)) return !W.localStorage.getItem(k); } return true; }
    catch (x) { return false; }
  }
  W.RKF.errText = function (e, opts) {
    opts = opts || {};
    var code = codeOf(e), msg = msgOf(e), det = detailOf(e);
    if (/\bjwt\b|PGRST301|not authorized|invalid claim|session expired/i.test(msg + ' ' + code)) return VOCAB.PGRST301;
    if (/permission denied|row-level security/i.test(msg)) return signedOut() ? VOCAB.PGRST301 : VOCAB['42501'];
    if (/failed to fetch|networkerror|load failed|network request failed|ERR_INTERNET|timed? ?out/i.test(msg)) return VOCAB.NETWORK;
    if (passes(msg)) return cap(msg);
    var r = ruleOf(msg) || ruleOf(det); if (r) return r;
    if (VOCAB[code]) return VOCAB[code];
    return opts.fallback || 'No reason was given.';
  };
  W.RKF.errCode = codeOf;
  W.RKF.errPasses = passes;
  W.RKF.errVocab = function (code) { return VOCAB[code] || ''; };
})(window);

/* PROMOTIONS */
(function (W) {
  'use strict';
  W.RKF = W.RKF || {};

  W.RKF.env = function (res, opts) {
    opts = opts || {};
    var say = opts.fail || function (m) { if (W.toast) W.toast(m, 'err'); };
    if (res && res.error) {
      say(W.RKF.errText(res.error));
      return null;
    }
    var env = (res && res.data) || {};
    if (env.ok !== true) {
      say(W.RKF.errText(env.error || {}));
      return null;
    }
    if (opts.okMsg && W.toast) {
      W.toast(opts.okMsg, 'ok');
    }
    return env;
  };

  W.RKF.actor = function (client) {
    return Promise.resolve()
      .then(function () { return client.auth.getSession(); })
      .then(function (s) {
        var em = s && s.data && s.data.session && s.data.session.user
               ? s.data.session.user.email : null;
        if (!em) return null;
        return client.from('employees').select('id,full_name').eq('email', em).maybeSingle()
          .then(function (e) { return (e && e.data) ? { id: e.data.id, name: e.data.full_name } : null; });
      })
      .catch(function () { return null; });   
  };

  function drawerEl() {
    var d = document.getElementById('rkf-history-drawer');
    if (d) return d;
    d = document.createElement('div');
    d.className = 'rkf-drawer'; d.id = 'rkf-history-drawer'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = '<div class="dw-hd"><h3>Change history</h3>'
                + '<button class="dw-x" type="button" aria-label="Close">&times;</button></div>'
                + '<div class="dw-body" id="rkf-history-body"></div>';
    document.body.appendChild(d);
    d.querySelector('.dw-x').addEventListener('click', function () { W.RKF.history.close(); });
    return d;
  }

  /* address and consignee fields */
  W.RKF.addr = {
    KINDS: ['Billing', 'Shipping'],
    isSite: function (kind) { return kind === 'Shipping'; },
    isBill: function (kind) { return kind === 'Billing'; },
    blank: function (kind, isDefault) {
      return { kind: kind || 'Shipping', isDefault: !!isDefault, line1: '', line2: '', city: '', area: '', district: '',
               pincode: '', state: '', gstAtAddr: '', consName: '', consContact: '', consMobile: '' };
    },
    fromRow: function (x) {
      return { aid: x.address_id, kind: x.addr_type, isDefault: !!x.is_default, line1: x.address_line || '', line2: x.address_line2 || '',
               city: x.city || '', area: x.area || '', district: x.district || '', pincode: String(x.pincode || '').trim(),
               state: x.state || '', gstAtAddr: x.gst_at_addr || '', consName: x.consignee_name || '',
               consContact: x.consignee_contact_name || '', consMobile: x.consignee_mobile || '' };
    },
    payload: function (a) {
      var L = W.RKF.inputLaw, C = W.RKF.caseLaw;
      return { addr_type: a.kind, pincode: a.pincode, area: L.pc(a.area || ''), district: L.pc(a.district || ''),
               state: a.state || '', city: L.pc(a.city || ''), address_line: L.pc(a.line1 || ''), address_line2: L.pc(a.line2 || ''),
               gst_at_addr: C.upper(a.gstAtAddr || ''), is_default: !!a.isDefault,
               consignee_name: L.pc(a.consName || ''), consignee_contact_name: L.pc(a.consContact || ''), consignee_mobile: a.consMobile || '' };
    },
    /* address check */
    check: function (a) {
      if (!String(a.line1 || '').trim()) return 'An address line is required.';
      if (!/^[0-9]{6}$/.test(String(a.pincode || ''))) return 'Pincode must be 6 digits.';
      if (a.consName && !/^[6-9][0-9]{9}$/.test(String(a.consMobile || ''))) return 'A consignee needs a mobile number.';
      if (a.gstAtAddr && !W.RKF.inputLaw.patterns.gstin.test(String(a.gstAtAddr).toUpperCase())) return 'GSTIN format invalid.';
      if (!W.RKF.addr.isSite(a.kind) && (a.consName || a.consContact || a.consMobile))
        return 'A consignee belongs on a Shipping address.';
      return '';
    },
    lines: function (a, partnerName) {
      var who = W.RKF.addr.isSite(a.kind) ? (a.consName || partnerName || '') : (partnerName || '');
      return { company: who, street: [a.line1, a.line2].filter(Boolean).join(', '),
               place: [a.city || a.district, a.area, a.district, a.state].filter(function (x, i, l) { return x && l.indexOf(x) === i; }).join(' · '),
               pin: a.pincode || '', gstin: a.gstAtAddr || '' };
    },
    pin: function (client, a, done) {
      var v = String(a.pincode || '').trim();
      if (!client || v.length !== 6) { a._pin = undefined; if (done) done(null); return; }
      client.from('pincode_master').select('city,taluk,district,state_name,state_code').eq('pincode', v).maybeSingle()
        .then(function (r) {
          var h = (!r.error && r.data) ? r.data : null;
          if (h) { a.city = h.city; a.area = h.taluk || ''; a.district = h.district; a.state = h.state_name || h.state_code || ''; }
          a._pin = h ? 'found' : 'missing';
          if (done) done(h);
        })['catch'](function () { a._pin = 'missing'; if (done) done(null); });
    },
    /* address fields */
    fields: function (a, opts) {
      opts = opts || {};
      var ns = opts.ns || 'ad', on = opts.on || 'RKFaddrSet', esc = W.RKF.esc, ro = opts.readOnly;
      function f(key, label, extra, req, cls) {
        return '<div class="ff' + (cls ? ' ' + cls : '') + '"><label for="' + ns + key + '">' + esc(label) + (req ? ' <span class="rq">*</span>' : '') + '</label>' +
          '<input class="in" id="' + ns + key + '" value="' + esc(a[key] || '') + '"' + (ro ? ' readonly' : ' oninput="' + on + '(\'' + key + '\',this.value)"') +
          (extra || '') + '/></div>';
      }
      var h = '';
      if (W.RKF.addr.isSite(a.kind)) {
        h += '<div class="frow">' + f('consName', 'Company (consignee)', ' placeholder="' + esc(opts.partnerName || 'this partner') + '"', false, 'w2') +
             f('consContact', 'Consignee contact') + f('consMobile', 'Consignee mobile', ' maxlength="10"', false, 'sm') + '</div>';
      } else if (opts.partnerName) {
        h += '<div class="frow"><div class="ff"><label>Company</label><div class="ro lockro"><span class="lk" aria-hidden="true">&#128274;</span>' + esc(opts.partnerName) + '</div></div></div>';
      }
      h += '<div class="frow">' + f('line1', 'Address line 1', '', true, 'w2') + f('line2', 'Address line 2', '', false, 'w2') + '</div>';
      function g(key, label) {
        if (a._pin === 'missing' || ro) return f(key, label);
        return '<div class="ff"><label for="' + ns + key + '">' + esc(label) + '</label><input class="in rkf-derived" id="' + ns + key + '" value="' + esc(a[key] || '') + '" readonly/></div>';
      }
      h += '<div class="frow">' + f('pincode', 'Pincode', ' maxlength="6" onblur="' + (opts.onPin || (on.replace(/Set$/, 'Pin'))) + '(this.value)"', true, 'sm') +
           g('city', 'City') + g('area', 'Area / Taluk') + g('district', 'District') + g('state', 'State') + '</div>';
      h += '<div class="frow">' + f('gstAtAddr', 'GSTIN at this address', ' maxlength="15"') + '</div>';
      return h;
    }
  };

  W.RKF.history = {
    open: function (opts) {
      opts = opts || {};
      var d = drawerEl();

      if (W.RKF.registerSurface) {
        W.RKF.registerSurface('rkf-history-drawer', {
          isOpen: function () {
            var el = document.getElementById('rkf-history-drawer');
            return !!el && el.classList.contains('open');
          },
          close: function () { W.RKF.history.close(); },
          depth: 30
        });
      }
      d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
      d._rkfFocus = opts.focus || null;
      var h = d.querySelector('.dw-hd h3');
      if (h) h.textContent = opts.title ? ('Change history - ' + opts.title) : 'Change history';
      var body = document.getElementById('rkf-history-body');
      if (opts.empty) {                       
        if (W.RKF.triState) W.RKF.triState(body, 'empty', opts.empty);
        else body.textContent = opts.empty;
        return;
      }
      if (W.RKF.activityLogGated) W.RKF.activityLogGated(body, opts);
    },
    close: function () {
      var d = document.getElementById('rkf-history-drawer'); if (!d) return;
      d.classList.remove('open'); d.setAttribute('aria-hidden', 'true');
      if (d._rkfFocus) { var b = document.getElementById(d._rkfFocus); if (b) { try { b.focus(); } catch (e) {} } }
    }
  };

  W.RKF.req = ' <span class="rkf-req">*</span>';

  W.RKF.compareValues = function (a, b) {
    var an = (a && a.numeric_value), bn = (b && b.numeric_value);
    if (an !== null && an !== undefined && an !== '' &&
        bn !== null && bn !== undefined && bn !== '') {
      var d = Number(an) - Number(bn);
      if (d) return d;
    }
    var at = String((a && (a.label !== undefined ? a.label : a.code)) || '');
    var bt = String((b && (b.label !== undefined ? b.label : b.code)) || '');
    return at.localeCompare(bt, undefined, { numeric: true, sensitivity: 'base' });
  };

  W.RKF.sortedValues = function (rows) { return (rows || []).slice().sort(W.RKF.compareValues); };

  W.RKF.sort = {
    state: function (k, dir) { return { k: k, dir: dir || 1 }; },
    toggle: function (st, k) { if (st.k === k) st.dir *= -1; else { st.k = k; st.dir = 1; } return st; },
    th: function (st, k, lbl, onclick, cls, title, idp) {
      return '<th' + (cls ? ' class="' + cls + '"' : '') + ' id="' + (idp || 'th-') + k + '" scope="col" onclick="' + onclick + '" tabindex="0"' +
        (title ? ' title="' + W.RKF.esc(title) + '"' : '') + ' aria-sort="' + (st.k === k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none') + '">' +
        lbl + (st.k === k ? (st.dir > 0 ? ' &#9650;' : ' &#9660;') : '') + '</th>';
    },
    cell: function (html) {
      var s = String(html == null ? '' : html);
      if (/class="na"/.test(s)) return '';
      var t = s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      var d = t.match(/^(\d{2})-(\d{2})-(\d{4})(.*)$/); if (d) return d[3] + '-' + d[2] + '-' + d[1] + d[4];
      var n = t.replace(/[\u20b9,\s%]/g, ''); if (/^-?\d+(\.\d+)?$/.test(n)) return parseFloat(n);
      return t.toLowerCase();
    },
    rows: function (rows, st, valOf, tie) {
      return rows.sort(function (a, b) {
        var va = valOf(a, st.k), vb = valOf(b, st.k);
        if (va < vb) return -1 * st.dir; if (va > vb) return 1 * st.dir;
        return tie ? tie(a, b) : 0;
      });
    }
  };
})(window);

(function (W) {
  'use strict';
  W.RKF = W.RKF || {};
  W.RKF.decide = function (act, payload, opts) {
    opts = opts || {};
    var c = opts.client || W.RKF._client;
    if (!c) return Promise.resolve({ error: { message: 'RKF.decide: no client' } });
    var p = {};
    Object.keys(payload || {}).forEach(function (k) {
      if (k === 'p_actor_emp' || k === 'on_behalf_of') return;  
      p[k] = payload[k];
    });
    if (p.p_app_key && !p.request_id) p.request_id = p.p_app_key;
    if (p.request_id && !p.p_app_key) p.p_app_key = p.request_id;
    return c.rpc('wf_decide', { p_payload: p, p_act: act });
  };

  W.RKF.decidePanel = function (mount, opts) {
    opts = opts || {};
    if (!mount || !opts.approval || !opts.approval.approval_id) return null;
    var acts = (opts.acts || []).filter(function (m) { return m && m.act; });
    if (!acts.length) { mount.innerHTML = ''; return null; }  
    var esc = W.RKF.esc || function (s) { return String(s == null ? '' : s); };
    var a = opts.approval;
    var uid = 'rkfdp-' + String(a.approval_id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    mount.innerHTML =
      '<div class="rkf-decide" id="' + uid + '">'
      + '<div class="rkf-decide-note"><textarea class="in" rows="2" id="' + uid + '-note" '
      + 'placeholder="Reason / note (required except to approve)"></textarea></div>'
      + '<div class="rkf-decide-acts" id="' + uid + '-acts"></div>'
      + '<div class="rkf-decide-msg" id="' + uid + '-msg"></div></div>';
    var box = document.getElementById(uid + '-acts');
    acts.forEach(function (m, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (i === 0 ? 'btn-p' : (m.act === 'reject' || m.act === 'void' ? 'btn-d' : 'btn-g')) + ' btn-sm';
      b.textContent = m.label || m.act;
      b.addEventListener('click', function () {
        var note = (document.getElementById(uid + '-note').value || '').trim();
        var msg = document.getElementById(uid + '-msg');
        var payload = { approval_id: a.approval_id };
        payload[m.note_key || 'note'] = note;
        var key = uid + '-' + m.act;
        W.RKF._dpKeys = W.RKF._dpKeys || {};
        if (!W.RKF._dpKeys[key]) W.RKF._dpKeys[key] = (W.crypto && W.crypto.randomUUID) ? W.crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
              var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
        payload.request_id = W.RKF._dpKeys[key];   
        b.disabled = true; var t0 = b.textContent; b.textContent = 'Working…';
        W.RKF.decide(m.act, payload, { client: opts.client }).then(function (res) {
          b.disabled = false; b.textContent = t0;
          var env = W.RKF.env(res, { fail: function (t) { if (msg) msg.innerHTML = '<div class="dedupe-warn hard show"><b>Refused:</b> ' + esc(t) + '</div>'; } });

          if (!env) {
            if (!(res && res.error)) delete W.RKF._dpKeys[key];   
            return;
          }
          delete W.RKF._dpKeys[key];
          if (typeof opts.onDone === 'function') opts.onDone(env);
        });
      });
      box.appendChild(b);
      box.appendChild(document.createTextNode(' '));
    });
    return mount;
  };
})(window);

(function (W) {
  'use strict';
  W.RKF = W.RKF || {};

  W.RKF.fmtIST = function (ts, withTime) {
    if (!ts) return '';
    var d = new Date(ts); if (isNaN(d)) return String(ts);
    var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d)
      .reduce(function (o, x) { o[x.type] = x.value; return o; }, {});
    return p.day + '-' + p.month + '-' + p.year + (withTime ? (' ' + p.hour + ':' + p.minute) : '');
  };

  W.RKF.idleGuard = function (minutes) {
    if (W.RKF._idleArmed) return; W.RKF._idleArmed = true;

    var cur = W.RKF._idleWanted || minutes || 15;
    var ms = cur * 60000, t;
    W.RKF._idleCur = cur;
    var framed = false; try { framed = (W.top !== W); } catch (e) { framed = true; }
    function fromChild (e) {

      var mine = ''; try { mine = W.location.origin; } catch (x) {}
      return !!(e && e.data && e.data.rkf === 'activity' && mine && e.origin === mine);
    }
    if (framed) {
      var last = 0;
      function tell () {
        var now = Date.now(); if (now - last < 1000) return; last = now;
        try { W.parent.postMessage({ rkf: 'activity' }, '*'); } catch (e) {}
      }
      ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart'].forEach(function (ev) {
        document.addEventListener(ev, tell, { passive: true, capture: true });
      });
      document.addEventListener('visibilitychange', function () { if (!document.hidden) tell(); });
      W.addEventListener('message', function (e) { if (fromChild(e)) tell(); }); 
      return;
    }
    function out () {
      try { if (W.RKF._client) W.RKF._client.auth.signOut(); } catch (e) {}
      var o = document.createElement('div');
      o.setAttribute('style', 'position:fixed;inset:0;z-index:99999;background:var(--bg,#f4f6f8);' +
        'display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;' +
        'font-family:inherit;color:var(--ink,#1c2733);font-size:15px');
      o.innerHTML = '<div><div style="font-weight:800;margin-bottom:8px">You were signed out.</div>' +
        'Signed out after ' + cur + ' idle minutes.<br>' +
        '<button type="button" style="margin-top:14px;padding:8px 16px;font-family:inherit;cursor:pointer" ' +
        'onclick="location.reload()">Sign in again</button></div>';
      document.body.appendChild(o);
    }
    function reset () { clearTimeout(t); t = setTimeout(out, ms); }
    ['mousemove', 'mousedown', 'keydown', 'wheel', 'scroll', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, reset, { passive: true, capture: true });
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) reset(); });
    W.addEventListener('message', function (e) { if (fromChild(e)) reset(); });
    reset();

    W.RKF._idleApply = function (n) { cur = n; W.RKF._idleCur = n; ms = n * 60000; reset(); return cur; };
  };

  W.RKF._idleWanted = null; W.RKF._idleCur = null; W.RKF._idleApply = null;
  W.RKF.idleGuard.setMinutes = function (n) {
    n = Number(n);
    if (!isFinite(n) || n <= 0) return W.RKF._idleCur || W.RKF._idleWanted || 15;
    W.RKF._idleWanted = n;
    if (W.RKF._idleApply) return W.RKF._idleApply(n);
    return n;
  };
  W.RKF.idleGuard.minutes = function () { return W.RKF._idleCur || W.RKF._idleWanted || 15; };

  W.RKF.accessGate = function (moduleCode, opts) {
    opts = opts || {};
    var c = opts.client || W.RKF._client;
    function block (why) {
      var m = document.querySelector('.main') || document.body;
      m.innerHTML = '<div style="padding:40px;text-align:center;font-family:inherit;color:var(--ink,#1c2733)">' +
        '<div style="font-weight:800;margin-bottom:8px">This screen is not open to you.</div>' +
        (why || '') +
        '</div>';
      return 'None';
    }
    if (!c) return Promise.resolve(block('This screen could not start.'));
    return c.rpc('get_effective_permissions').then(function (r) {
      if (r.error) return block('Your access could not be read.');
      var row = (r.data || []).filter(function (x) { return x.module_code === moduleCode; })[0];
      var lvl = row ? row.access_level : 'None';
      if (lvl !== 'Read' && lvl !== 'Full') return block();
      return lvl;
    }).catch(function () { return block('Your access could not be read.'); });
  };

  /* ONE RUN AT A TIME */
  function serialOne(loader) {
    var running = null, again = false;
    function run() {
      if (running) { again = true; return running; }        
      var p;
      try { p = Promise.resolve(loader()); }
      catch (e) { p = Promise.resolve(); }                  
      running = p.then(null, function () {}).then(function () {
        running = null;
        if (again) { again = false; return run(); }         
      });
      return running;
    }
    return run;
  }
  W.RKF._serialOne = serialOne;

  W.RKF.liveTables = function (client, tables, loader, opts) {
    opts = opts || {};
    if (!client || typeof client.channel !== 'function') return null;
    if (!tables || !tables.length || typeof loader !== 'function') return null;
    var gap = opts.eventDebounceMs || 900, t = null, chan = null;
    var run = opts._serial || serialOne(loader);   
    function fire() {
      if (typeof opts.hold === 'function' && opts.hold()) return;
      if (t) clearTimeout(t);
      t = setTimeout(function () {
        t = null;
        if (typeof opts.hold === 'function' && opts.hold()) return;   
        try { run(); }   
        catch (e) {  }
      }, gap);
    }
    try {
      chan = client.channel(opts.channel || ('rkf-' + String(tables[0]) + '-' + Math.random().toString(16).slice(2)));
      tables.forEach(function (tb) {
        chan.on('postgres_changes', { event: '*', schema: 'public', table: tb }, fire);
      });
      chan.subscribe(function (st) { if (typeof opts.onState === 'function') opts.onState(st); });
    } catch (e) { return null; }
    W.addEventListener('pagehide', function () {
      try { if (t) clearTimeout(t); if (chan && client.removeChannel) client.removeChannel(chan); } catch (e) {}
      chan = null;
    });
    return chan;
  };

  W.RKF.live = function (client, tables, loader, opts) {
    opts = opts || {};

    var o = {}, k;
    for (k in opts) { if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k]; }
    o._serial = serialOne(loader);
    W.RKF.liveMasters(loader, o);
    return W.RKF.liveTables(client, tables, loader, o);
  };
  W.RKF.liveMasters = function (loader, opts) {
    opts = opts || {};
    var stamp = 0, gap = opts.throttleMs || 5000;
    var run = opts._serial || serialOne(loader);   
    W.addEventListener('focus', async function () {
      if (Date.now() - stamp < gap) return;
      if (typeof opts.hold === 'function' && opts.hold()) return;
      stamp = Date.now();
      try { await run(); } catch (e) {  }
    });
  };
})(window);

(function (W) {
  var CACHE = {};          
  var PENDING = null;      

  function readQueue(client) {
    if (PENDING) return PENDING;                  
    PENDING = Promise.resolve()
      .then(function () { return client.rpc('fn_workflow_queue'); })
      .then(function (r) {
        PENDING = null;
        if (r && r.error) throw r.error;
        return (r && r.data) || [];
      })
      .catch(function (e) { PENDING = null; throw e; });
    return PENDING;
  }

  W.RKF = W.RKF || {};
  W.RKF.queueGrant = async function (client, approvalId) {
    var id = String(approvalId || '').trim();
    if (!id || !client || typeof client.rpc !== 'function') return false;
    if (Object.prototype.hasOwnProperty.call(CACHE, id)) return CACHE[id];
    try {
      var rows = await readQueue(client);
      var hit = false, i;
      for (i = 0; i < rows.length; i++) {
        if (rows[i] && String(rows[i].approval_id) === id) { hit = true; break; }
      }
      CACHE[id] = hit;
      return hit;
    } catch (e) {
      return false;                               
    }
  };

  W.RKF.urlApproval = function () {
    try {
      var qs = new URLSearchParams(W.location.search);
      var v = qs.get('approval') || qs.get('approval_id') || '';
      if (!v) {
        var h = String(W.location.hash || '').replace(/^#/, '');
        if (h.indexOf('=') >= 0) {
          var hp = new URLSearchParams(h);
          v = hp.get('approval') || hp.get('approval_id') || '';
        }
      }
      return String(v || '').trim();
    } catch (e) { return ''; }
  };

  W.RKF._queueGrantCache = CACHE;                 
})(window);
