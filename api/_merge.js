

'use strict';

// ---------------------------------------------------------------- path lookup

function lookup(ctx, path) {
  if (path === '.') return ctx;
  let cur = ctx;
  for (const part of path.split('.')) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

// ---------------------------------------------------------------- formatting
const FORMAT = {

  inr(v) {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  },

  qty(v) {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  },

  date(v) {
    if (!v) return '';
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
  },
  upper(v) { return v === null || v === undefined ? '' : String(v).toUpperCase(); },

  or_na(v) {
    return (v === null || v === undefined || v === '') ? 'not available' : String(v);
  }
};

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function render(value, filter) {
  let out;
  if (filter) {
    const fn = FORMAT[filter];
    if (!fn) throw new Error(`unknown format helper "${filter}" - the merge has no such formatter, and it will not invent one`);
    out = fn(value);
  } else {
    out = (value === null || value === undefined) ? '' : String(value);
  }
  return out;
}

function merge(template, data) {
  if (typeof template !== 'string') throw new Error('template body must be a string');
  const BLOCK = /\{\{([#^])\s*([\w.]+)\s*\}\}([\s\S]*?)\{\{\/\s*\2\s*\}\}/;

  function pass(tpl, stack) {

    let m;
    while ((m = BLOCK.exec(tpl)) !== null) {
      const [whole, kind, path, body] = m;
      const val = resolve(path, stack);
      let replacement = '';
      if (kind === '#') {
        if (Array.isArray(val)) {
          replacement = val.map(item => pass(body, [item, ...stack])).join('');
        } else if (val !== undefined && val !== null && val !== false && val !== '') {
          replacement = pass(body, (typeof val === 'object' ? [val, ...stack] : stack));
        }
      } else { // inverted
        const empty = val === undefined || val === null || val === false || val === ''
                   || (Array.isArray(val) && val.length === 0);
        if (empty) replacement = pass(body, stack);
      }
      tpl = tpl.slice(0, m.index) + replacement + tpl.slice(m.index + whole.length);
      BLOCK.lastIndex = 0;
    }

    tpl = tpl.replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g,
      (_, p) => render(resolve(p, stack)));
    tpl = tpl.replace(/\{\{\s*([\w.]+)\s*(?:\|\s*(\w+)\s*)?\}\}/g,
      (_, p, f) => esc(render(resolve(p, stack), f)));
    return tpl;
  }

  function resolve(path, stack) {
    for (const scope of stack) {
      if (scope === null || scope === undefined) continue;
      const v = lookup(scope, path);
      if (v !== undefined) return v;
    }
    return undefined;
  }

  return pass(template, [data]);
}

module.exports = { merge, FORMAT, esc, lookup };
