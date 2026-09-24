/* RKF-1.0.0 smoke checks (UEP-001 CP4 Slice 1) - jsdom harness.
   Usage: node rkf_smoke_checks.js [path-to-rk-foundation.js]
   Verifies each RKF API exists + core behaviors. No network, no screens. */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const SRC = process.argv[2] || path.join(__dirname, '..', 'rk-foundation.js');
const code = fs.readFileSync(SRC, 'utf8');

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;
window.eval(code);
const RKF = window.RKF;
const document = window.document;

let pass = 0, fail = 0;
const failures = [];
function check(name, cond) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; failures.push(name); console.log('  FAIL  ' + name); }
}

/* ---- 1. namespace + version ---- */
check('RKF namespace exists', !!RKF);
check('RKF.version === RKF-1.0.0', RKF.version === 'RKF-1.0.0');
check('versionCheck true/false', RKF.versionCheck('RKF-1.0.0') === true && RKF.versionCheck('RKF-9.9.9') === false);

/* ---- 2. API surface exists ---- */
const apis = [
  ['modal.open', RKF.modal && RKF.modal.open], ['modal.close', RKF.modal && RKF.modal.close],
  ['modal.armBackdropGuard', RKF.modal && RKF.modal.armBackdropGuard],
  ['modal.stalePurge', RKF.modal && RKF.modal.stalePurge], ['modal.a11y', RKF.modal && RKF.modal.a11y],
  ['guard', RKF.guard], ['zeroRow', RKF.zeroRow],
  ['toast', RKF.toast], ['inputLaw.attach', RKF.inputLaw && RKF.inputLaw.attach],
  ['fmtDMY', RKF.fmtDMY], ['inr', RKF.inr], ['client', RKF.client], ['load', RKF.load], ['loading', RKF.loading],
  ['keys.register', RKF.keys && RKF.keys.register], ['keys.hint', RKF.keys && RKF.keys.hint],
  ['recents.push', RKF.recents && RKF.recents.push], ['theme.apply', RKF.theme && RKF.theme.apply],
  ['theme.toggle', RKF.theme && RKF.theme.toggle], ['blocked', RKF.blocked], ['banner', RKF.banner],
  ['empty', RKF.empty], ['access.resolve', RKF.access && RKF.access.resolve],
  ['access.secENote', RKF.access && RKF.access.secENote]
];
check('all ' + apis.length + ' API members are functions/objects',
  apis.every(a => typeof a[1] === 'function' || typeof a[1] === 'object'));

/* ---- 3. toast renders + action fires ---- */
RKF.toast('hello smoke');
const tEl = document.getElementById('toast-el');
check('toast renders text + .show', !!tEl && tEl.textContent === 'hello smoke' && tEl.classList.contains('show'));
let undone = false;
RKF.toast('with action', [{ label: 'Undo', fn: function () { undone = true; } }]);
const act = tEl.querySelector('button.toast-act');
act.click();
check('toast action fires + dismisses', undone === true && !tEl.classList.contains('show'));

/* ---- 4. guard blocks re-entry, restores button ---- */
let calls = 0; let release;
const gated = RKF.guard('smokeSave', function () { calls++; return new Promise(r => { release = r; }); });
const btn = document.createElement('button'); btn.textContent = 'Save Unit'; document.body.appendChild(btn); btn.focus();
const p1 = gated();
gated(); gated();
check('guard blocks re-entry (1 call of 3)', calls === 1);
check('guard disables + relabels Saving…', btn.disabled === true && btn.textContent === 'Saving…');

/* ---- 5. zeroRow ---- */
check('zeroRow true on empty data', RKF.zeroRow({ data: [], error: null }) === true);
check('zeroRow false on rows / error', RKF.zeroRow({ data: [{}], error: null }) === false && RKF.zeroRow({ data: [], error: { message: 'x' } }) === false);

/* ---- 6. inputLaw delegated: proper-cases DYNAMIC field, skips verbatim ---- */
RKF.inputLaw.attach(document, {
  properIds: ['nm'], verbatimIds: ['tal'], upperIds: ['cd'],
  dupWarnRules: [{ id: 'cd', existing: v => (String(v).toUpperCase() === 'U1' ? { code: 'U1', name: 'Trichy' } : null), msg: o => o.code + ' already exists' }]
});
const nm = document.createElement('input'); nm.id = 'nm'; document.body.appendChild(nm); /* created AFTER attach */
nm.value = 'john   doe (south) a/b';
nm.dispatchEvent(new window.FocusEvent('blur'));
check('delegated proper-case on dynamic field', nm.value === 'John   Doe (South) A/B');
const tal = document.createElement('input'); tal.id = 'tal'; document.body.appendChild(tal);
tal.value = 'RKMR-mixed Case';
tal.dispatchEvent(new window.FocusEvent('blur'));
check('verbatim id untouched (DDR-186)', tal.value === 'RKMR-mixed Case');
const cd = document.createElement('input'); cd.id = 'cd'; document.body.appendChild(cd);
cd.value = 'u1';
cd.dispatchEvent(new window.Event('input', { bubbles: true }));
const warn = document.getElementById('cd-dupwarn');
check('upperIds live uppercase', cd.value === 'U1');
check('dupWarn hint renders owner msg', !!warn && warn.textContent === 'U1 already exists');
cd.value = 'U2';
cd.dispatchEvent(new window.Event('input', { bubbles: true }));
check('dupWarn hint clears', warn.textContent === '' && warn.style.display === 'none');

/* ---- 7. fmtDMY + inr ---- */
check('fmtDMY iso -> DD-MM-YYYY', RKF.fmtDMY('2026-07-11') === '11-07-2026');
check('fmtDMY falsy -> "-" (m04 law) + opts.empty mode', RKF.fmtDMY('') === '-' && RKF.fmtDMY(null, { empty: null }) === null);
check('fmtDMY Date object', RKF.fmtDMY(new window.Date(2026, 6, 11)) === '11-07-2026');
check('inr en-IN grouping bare + symbol opt-in', RKF.inr(1234567) === '12,34,567' && RKF.inr(1234567, { symbol: true }) === '₹' + '12,34,567');

/* ---- 8. recents dedup + cap 10 ---- */
for (let i = 0; i < 12; i++) RKF.recents.push('Unit', 'U' + i, 'Unit ' + i);
RKF.recents.push('Unit', 'U11', 'Unit 11 again');
const rec = RKF.recents.read();
check('recents cap 10', rec.length === 10);
check('recents dedup + newest first', rec[0].c === 'U11' && rec.filter(x => x.t === 'Unit' && x.c === 'U11').length === 1);

/* ---- 9. access.resolve 4 cases (O-09) ---- */
const roleMap = [{ employee_code: 'RKE-1', role_code: 'SALES', active: true }, { employee_code: 'RKE-1', role_code: 'ACC', active: true }, { employee_code: 'RKE-1', role_code: 'OLD', active: false }];
const rma = [
  { role_code: 'SALES', module_code: 'M06', access_level: 'Read', active: true },
  { role_code: 'ACC', module_code: 'M06', access_level: 'Full', active: true },
  { role_code: 'SALES', module_code: 'M08', access_level: 'Read', active: true },
  { role_code: 'OLD', module_code: 'M02', access_level: 'Full', active: true }
];
const ov = [{ employee_code: 'RKE-1', module_code: 'M08', access_level: 'None' }];
const mods = [{ module_code: 'M06', module_name: 'Quotes', active: true }, { module_code: 'M08', module_name: 'SO', active: true }, { module_code: 'M02', module_name: 'Products', active: true }, { module_code: 'M01', module_name: 'Customers', active: true }];
const eff = RKF.access.resolve('RKE-1', roleMap, rma, ov, mods);
const by = {}; eff.forEach(r => by[r.module_code] = r);
check('resolve: override wins', by.M08.access === 'None' && by.M08.origin === 'Employee override');
check('resolve: highest role wins (Full>Read)', by.M06.access === 'Full' && by.M06.origin === 'Role ACC');
check('resolve: inactive role ignored -> default None', by.M02.access === 'None' && by.M02.origin === 'default');
check('resolve: no rows -> default None', by.M01.access === 'None' && by.M01.origin === 'default');

/* ---- 10. theme toggle persists ---- */
RKF.theme.toggle();
check('theme toggle -> dark attr + rk_theme persisted', document.documentElement.getAttribute('data-theme') === 'dark' && window.localStorage.getItem('rk_theme') === 'dark');
RKF.theme.toggle();
check('theme toggle back -> light persisted', document.documentElement.getAttribute('data-theme') === null && window.localStorage.getItem('rk_theme') === 'light');

/* ---- 11. modal open/close + a11y + blocked/banner/empty ---- */
document.body.insertAdjacentHTML('beforeend', '<div class="ovl" id="test-modal"><div class="modal"><h3>Test Dialog</h3><input id="tm-in"/></div></div>');
RKF.modal.a11y('test-modal');
const mEl = document.querySelector('#test-modal .modal');
check('a11y: role=dialog + labelled', mEl.getAttribute('role') === 'dialog' && mEl.getAttribute('aria-modal') === 'true' && !!mEl.getAttribute('aria-labelledby'));
let hookRan = false;
RKF.modal.onOpen('test-modal', function () { hookRan = true; });
RKF.modal.open('test-modal');
check('modal open adds .show + runs onOpen hook', document.getElementById('test-modal').classList.contains('show') && hookRan);
RKF.modal.close();
check('modal close() closes all .ovl', !document.getElementById('test-modal').classList.contains('show'));
const sel = document.createElement('select'); document.body.appendChild(sel);
RKF.blocked(sel, 'Waiting on M04 - no employees yet');
check('blocked select -> honest disabled option', sel.options.length === 1 && sel.options[0].disabled && sel.options[0].textContent === 'Waiting on M04 - no employees yet');
const ban = RKF.banner(['M-CONFIG live', { label: 'M04 missing', ok: false }]);
check('banner builds strip', ban.className === 'rkf-banner' && ban.children.length === 2 && ban.children[1].classList.contains('bad'));
const emptyHost = document.createElement('div'); document.body.appendChild(emptyHost);
let ctaFired = false;
RKF.empty(emptyHost, 'Nothing here yet', { label: 'Add one', fn: function () { ctaFired = true; } });
emptyHost.querySelector('button').click();
check('empty state + CTA fires', emptyHost.classList.contains('rkf-blocked') && ctaFired);

/* ---- 12. guard settles (async) then re-callable ---- */
release();
p1.then(function () {
  check('guard restores button on settle', btn.disabled === false && btn.textContent === 'Save Unit');
  gated();
  check('guard re-callable after settle', calls === 2);
  console.log('\nRKF smoke: ' + pass + ' passed, ' + fail + ' failed' + (fail ? ' -> ' + failures.join(' | ') : ''));
  process.exit(fail ? 1 : 0);
});
