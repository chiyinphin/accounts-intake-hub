const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const path = require('path');
const BUILD = path.join(__dirname, '..', '.build', 'test-build.html');
const html = fs.readFileSync(BUILD, 'utf8');
const errors = [], saved = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail && e.detail.stack || e.message)));
vc.on('error', e => errors.push('console.error: ' + e));
const dom = new JSDOM(html, {
  runScripts: 'dangerously', url: 'https://artifact.test/', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = function () {};
    w.claude = { use: async name => name === 'downloads' ? { save: async o => { saved.push(o); return { status: 'saved' }; } } : null };
    w.addEventListener('error', e => errors.push('window.onerror: ' + e.message));
  }
});
const w = dom.window, d = w.document;
const $ = s => d.querySelector(s), $$ = s => Array.from(d.querySelectorAll(s));
let pass = 0, fail = 0;
function ok(name, cond, extra) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (extra ? ' -> ' + extra : '')); } }
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));
function click(sel) { const el = typeof sel === 'string' ? $(sel) : sel; if (!el) throw new Error('no element ' + sel); el.click(); }
function setVal(sel, v) { const el = $(sel); if (!el) throw new Error('no element ' + sel); el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); el.dispatchEvent(new w.Event('change', { bubbles: true })); }
function setRadio(name, v) { const el = $(`input[name="${name}"][value="${v}"]`); el.checked = true; el.dispatchEvent(new w.Event('input', { bubbles: true })); el.dispatchEvent(new w.Event('change', { bubbles: true })); }
function go(tab) { click(`#tabs [data-tab="${tab}"]`); }
function user(id) { const s = $('#user-select'); s.value = id; s.dispatchEvent(new w.Event('change', { bubbles: true })); }
const S = () => w.__aih.state();

(async () => {
  await tick(50);
  console.log('Boot');
  ok('page booted without errors', errors.length === 0, errors.join(' | '));
  ok('dashboard shows KPI tiles', $$('.kpi').length === 6);
  ok('hidden attribute wins over author display rules (drawer, more-sheet)', /\[hidden\]\s*\{\s*display:\s*none\s*!important/.test($$('style').map(x => x.textContent).join('\n')));
  ok('inbox KPI = 3, awaiting = 4', $$('.kpi-n')[0].textContent === '3' && $$('.kpi-n')[1].textContent === '4', $$('.kpi-n').map(x => x.textContent).join(','));
  ok('needs-attention list has items', $$('#view .card .erow').length >= 5);

  console.log('Every tab renders in EN and BM');
  for (const lang of ['en', 'ms']) {
    if (lang === 'ms') click('#lang-btn');
    for (const tab of ['dashboard', 'inbox', 'entry', 'approvals', 'calendar', 'compliance', 'export', 'audit', 'setup']) {
      go(tab); await tick(5);
      const txt = $('#view').textContent;
      ok(`${lang}/${tab} renders`, txt.length > 80 && !/\b(?:nav|btn|ce|err|co|se|ex|au|ap|dash|att|man|kv|cal)\.[A-Za-z]/.test(txt), errors.slice(-1)[0]);
    }
  }
  click('#lang-btn');
  ok('language back to EN', $('#brand-name').textContent === 'Accounts Intake Hub');

  console.log('Inbox: paste parser and file upload');
  go('inbox');
  setVal('#paste-text', 'Bill from Unifi Business dated 5 Oct 2026\nInvoice no UB-900123\nTotal RM 399.00');
  ok('live parse shows amount and payee', /399\.00/.test($('#paste-result').textContent) && /Unifi Business/.test($('#paste-result').textContent));
  const before = S().entries.length;
  click('[data-act="add-paste"]'); await tick(5);
  ok('paste added an inbox entry', S().entries.length === before + 1 && S().entries[S().entries.length - 1].status === 'inbox');
  const f = new w.File(['x'], 'tnb_nov.pdf', { type: 'application/pdf' });
  const fi = $('#file-input'); Object.defineProperty(fi, 'files', { value: [f], configurable: true }); fi.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(5);
  ok('file upload added an inbox entry', S().entries.some(e => e.attachments[0] && e.attachments[0].name === 'tnb_nov.pdf'));
  const ex = $$('[data-act="extract"]').pop(); ex.click(); await tick(450);
  ok('simulated extractor opened the entry form pre-filled', $('#f-payee') && $('#f-payee').value === 'Tenaga Nasional Berhad' && /simulated/i.test($('#view').textContent));

  console.log('Entry: validation, duplicate, submit (as Aina)');
  user('aina'); go('entry'); click('[data-act="new-entry"]');
  setVal('#f-payee', 'Smoke Test Supplier'); setVal('#f-docDate', '2026-10-20'); setVal('#f-netAmount', '100.10'); setVal('#f-taxAmount', '0.20');
  ok('total auto-calculates', $('#f-total').textContent === 'RM 100.30', $('#f-total').textContent);
  setRadio('f-ledger', 'client'); ok('matter row appears for client ledger', !$('#matter-row').hidden);
  click('[data-act="submit-entry"]'); await tick(5);
  ok('R1 blocks submit without matter (UI)', /matter number is required/i.test($('#err-matterNo').textContent), $('#err-matterNo').textContent);
  setVal('#f-matterNo', 'M/2026/0142');
  ok('matter info shows client balance', /Tan & Sons/.test($('#matter-info').textContent));
  click('[data-act="submit-entry"]'); await tick(5);
  const mine = S().entries.filter(e => e.payee === 'Smoke Test Supplier')[0];
  ok('entry submitted', mine && mine.status === 'submitted' && mine.createdBy === 'aina' && mine.totalAmount === 100.3);

  console.log('Duplicate warning blocks submit until overridden');
  click('[data-act="new-entry"]');
  setVal('#f-payee', 'Smoke Test Supplier'); setVal('#f-docDate', '2026-10-20'); setVal('#f-netAmount', '100.10'); setVal('#f-taxAmount', '0.20'); setRadio('f-ledger', 'client'); setVal('#f-matterNo', 'M/2026/0142');
  ok('duplicate box visible', !$('#dup-box').hidden);
  click('[data-act="submit-entry"]'); await tick(5);
  ok('submit blocked without override', S().entries.filter(e => e.payee === 'Smoke Test Supplier' && e.status === 'submitted').length === 1 && $('#dup-err').textContent.length > 0);
  $('#f-dupok').checked = true; setVal('#f-dupreason', 'Second invoice, same amount'); click('[data-act="submit-entry"]'); await tick(5);
  ok('submit allowed with override reason', S().entries.filter(e => e.payee === 'Smoke Test Supplier' && e.status === 'submitted').length === 2);

  console.log('Approvals: maker/checker, balance override, reject, return, reopen');
  user('am'); go('approvals');
  ok('approver sees the pending queue', $$('#view .erow').length >= 6);
  const own = S().entries.filter(e => e.payee === 'Smoke Test Supplier')[0];
  // Account Manager creates and submits an entry, then tries to approve it
  go('entry'); click('[data-act="new-entry"]'); setVal('#f-payee', 'AM Own Entry'); setVal('#f-docDate', '2026-10-21'); setVal('#f-netAmount', '50'); click('[data-act="submit-entry"]'); await tick(5);
  const amE = S().entries.filter(e => e.payee === 'AM Own Entry')[0];
  ok('AM entry submitted', amE && amE.status === 'submitted');
  go('approvals'); $$('#view .erow').find(r => /AM Own Entry/.test(r.textContent)).click();
  ok('R4: approve button disabled for own entry', $('[data-act="approve"]').disabled === true && /another approver/i.test($('#drawer').textContent));
  click('[data-act="close-drawer"]');
  user('partner'); go('approvals'); $$('#view .erow').find(r => /AM Own Entry/.test(r.textContent)).click(); click('[data-act="approve"]'); await tick(5);
  ok('R4: a different approver can approve it', S().entries.find(e => e.id === amE.id).status === 'approved');
  user('am'); go('approvals'); $$('#view .erow').find(r => /Stamp Office/.test(r.textContent)).click();
  click('[data-act="approve"]'); await tick(5);
  ok('R7: approval above balance needs a reason', /above the client balance/i.test($('#drawer-msg').textContent) && !$('#drawer-msg').hidden, $('#drawer-msg') && $('#drawer-msg').textContent);
  setVal('#d-balance', 'Client topping up by cheque'); click('[data-act="approve"]'); await tick(5);
  ok('R7: approved with override', S().entries.find(e => e.payee === 'Stamp Office (LHDN)').status === 'approved');
  go('approvals'); $$('#view .erow').find(r => /Popular Book/.test(r.textContent)).click();
  click('[data-act="reject"]'); await tick(5);
  ok('R5: reject without a reason is refused', /reason is required/i.test($('#drawer-msg').textContent));
  setVal('#d-return', 'Add the tax invoice'); click('[data-act="return"]'); await tick(5);
  ok('R5: return with comment sets status returned', S().entries.find(e => e.payee === 'Popular Book Co').status === 'returned');
  user('aina'); go('approvals'); click('[data-act="ap-filter"][data-v="all"]');
  $$('#view .erow').find(r => /Pos Laju/.test(r.textContent) && /Approved/.test(r.textContent)).click();
  ok('clerk cannot reopen (no reopen control)', !$('[data-act="reopen"]'));
  click('[data-act="close-drawer"]'); user('am'); go('approvals'); click('[data-act="ap-filter"][data-v="all"]');
  $$('#view .erow').find(r => /Pos Laju/.test(r.textContent) && /Approved/.test(r.textContent)).click();
  click('[data-act="reopen"]'); await tick(5);
  ok('R6: reopen needs a reason', /reason is required/i.test($('#drawer-msg').textContent));
  setVal('#d-reopen', 'Wrong ledger'); click('[data-act="reopen"]'); await tick(5);
  ok('R6: reopened entry is returned for editing', S().entries.filter(e => e.payee === 'Pos Laju' && e.status === 'returned').length === 1);

  console.log('Export: batch, FoxPro layout, downloads');
  go('export');
  const readyBefore = $$('#view .erow').length;
  ok('ready list shows approved entries', readyBefore >= 3, String(readyBefore));
  click('[data-act="sel-all"]'); await tick(5);
  ok('select all enables Create batch', !$('[data-act="create-batch"]').disabled);
  ok('fox preview header has the DBF field names', /DOCNO/.test($('#view table thead').textContent) && /APPRDATE/.test($('#view table thead').textContent));
  click('[data-act="create-batch"]'); await tick(5);
  const newBatch = S().batches[S().batches.length - 1];
  ok('batch created and entries stamped', newBatch.count >= 3 && S().entries.filter(e => e.exportBatchId === newBatch.id).length === newBatch.count);
  w.eval(fs.readFileSync(path.join(path.dirname(require.resolve('xlsx/package.json')), 'dist', 'xlsx.full.min.js'), 'utf8').replace(/^\s*/, ''));
  for (const fmt of ['fox', 'csv', 'json', 'xlsx']) {
    const btn = $(`[data-act="dl"][data-fmt="${fmt}"][data-id="${newBatch.id}"]`); btn.click(); await tick(30);
  }
  const names = saved.map(s => s.filename);
  ok('four files offered through the downloads capability', names.length === 4, names.join(', '));
  const fox = saved.find(s => /_foxpro\.csv$/.test(s.filename)), gen = saved.find(s => /_generic\.csv$/.test(s.filename)), xl = saved.find(s => /\.xlsx$/.test(s.filename)), js = saved.find(s => /\.json$/.test(s.filename));
  ok('FoxPro CSV: header row + one line per entry, no BOM', fox && fox.data.split('\r\n')[0].startsWith('DOCNO,DOCDATE,DOCTYPE') && fox.data.charCodeAt(0) !== 0xFEFF && fox.data.trim().split('\r\n').length === newBatch.count + 1, fox && fox.data.slice(0, 80));
  ok('FoxPro CSV: dates as YYYYMMDD, upper-case codes', fox && /,\d{8},(BILL|PAYMENT|RECEIPT),/.test(fox.data));
  ok('generic CSV starts with a BOM', gen && gen.data.charCodeAt(0) === 0xFEFF);
  ok('xlsx is a real zip (PK header)', xl && xl.data instanceof w.Uint8Array || (xl && xl.data && xl.data.constructor && /Uint8Array|ArrayBuffer/.test(xl.data.constructor.name)), xl && xl.data && xl.data.constructor.name);
  ok('xlsx has two sheets and a row per entry', (() => { try { const X = w.XLSX; const wb = X.read(xl.data, { type: 'array' }); return wb.SheetNames.join() === 'Entries,FoxPro layout' && X.utils.sheet_to_json(wb.Sheets['Entries']).length === newBatch.count; } catch (e) { return false; } })());
  ok('json payload parses with all entries', js && JSON.parse(js.data).entries.length === newBatch.count);
  ok('batch re-download works for an older batch (seed batch)', (() => { saved.length = 0; $(`[data-act="dl"][data-fmt="fox"][data-id="${S().batches[0].id}"]`).click(); return true; })());
  await tick(30); ok('seed batch fox file offered', saved.length === 1 && saved[0].data.trim().split('\r\n').length === S().batches[0].count + 1);

  console.log('Settings: layout validation blocks FoxPro download');
  go('setup');
  const nameInput = $('[data-map="0"][data-mk="name"]'); setVal('[data-map="0"][data-mk="name"]', 'DOCUMENTNUMBER');
  ok('invalid name is flagged in Settings', /longer than 10/.test($('#view').textContent));
  go('export'); saved.length = 0; $(`[data-act="dl"][data-fmt="fox"][data-id="${S().batches[0].id}"]`).click(); await tick(30);
  ok('FoxPro download refused while layout invalid', saved.length === 0);
  go('setup'); setVal('[data-map="0"][data-mk="name"]', 'DOCNO');
  setVal('[data-set="export.delimiter"]', 'semicolon'); setVal('[data-set="export.decimal"]', ','); setVal('[data-set="export.dateFmt"]', 'DD/MM/YYYY');
  go('export'); saved.length = 0; $(`[data-act="dl"][data-fmt="fox"][data-id="${S().batches[0].id}"]`).click(); await tick(30);
  ok('layout settings flow into the file (; delimiter, comma decimals, DD/MM/YYYY)', saved.length === 1 && /;\d{2}\/\d{2}\/\d{4};/.test(saved[0].data.split('\r\n')[1]) && /;\d+,\d{2};/.test(saved[0].data.split('\r\n')[1]), saved[0] && saved[0].data.split('\r\n')[1]);

  console.log('Compliance');
  go('compliance');
  ok('overdue and due-soon chips present', $$('.rem .chip.st-overdue').length === 1 && $$('.rem .chip.st-soon').length === 1);
  setVal('#gen-period', '2031-03'); click('[data-act="rem-gen"]'); await tick(5);
  ok('generator adds 4 statutory reminders', S().reminders.filter(r => r.period === '2031-03').length === 4);
  click('[data-act="rem-filter"][data-v="all"]'); await tick(5);
  const rem = S().reminders.find(r => r.status === 'open' && r.kind === 'EPF' && r.period !== '2031-03');
  click(`[data-act="rem-done-open"][data-id="${rem.id}"]`); setVal('#rd-ref', 'KWSP-123'); setVal('#rd-amt', '4290'); click(`[data-act="rem-done-save"][data-id="${rem.id}"]`); await tick(5);
  ok('mark submitted records ref and amount', S().reminders.find(r => r.id === rem.id).status === 'done' && S().reminders.find(r => r.id === rem.id).refNo === 'KWSP-123');
  const payBefore = S().entries.length; click('[data-act="pay-entries"]'); await tick(5);
  ok('payroll creates 4 draft payment entries', S().entries.length === payBefore + 4 && S().entries.slice(-4).every(e => e.status === 'draft' && e.type === 'payment'));
  setVal('.pay-in[data-i="0"][data-k="wage"]', '3000');
  ok('payroll results update live (EPF 3000 -> 390)', /390\.00/.test($('#pay-results').textContent));

  console.log('Audit log and self-tests');
  go('audit'); const n0 = $$('#audit-body tr').length; setVal('#audit-q', 'ENT-2026-0001');
  ok('audit filter narrows rows', $$('#audit-body tr').length < n0 && $$('#audit-body tr').length >= 3);
  saved.length = 0; click('[data-act="audit-csv"]'); await tick(30);
  ok('audit CSV offered', saved.length === 1 && /^﻿Event,Time/.test(saved[0].data));
  go('setup'); click('[data-act="run-tests"]'); await tick(30);
  const sum = $('#test-summary') && $('#test-summary').textContent;
  ok('in-page self-tests all pass', /^(\d+) of \1 passed$/.test(sum || ''), sum);

  console.log('Reset');
  click('[data-act="reset"]'); click('[data-act="reset-confirm"]'); await tick(10);
  ok('reset restores the demo set', S().entries.length === 16 && S().batches.length === 1);

  console.log('Calendar');
  const C = w.Core, T = C.todayLocal(), ui = () => w.__aih.ui, SEL = () => ui().cal.sel;
  const key = (sel, k, o = {}) => { const el = typeof sel === 'string' ? $(sel) : sel; el.dispatchEvent(new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o))); };
  user('am'); go('calendar'); await tick(5);
  ok('calendar tab renders a month grid with weekday headers', $('[role="grid"]') && $$('[role="columnheader"]').length === 7 && $$('.cal-row[role="row"]').length >= 5 && $$('.cal-row[role="row"]').length <= 7);
  ok('Monday is the first column by default', /^(Mon|Isn)/.test($$('[role="columnheader"]')[0].textContent));
  ok('today is marked and selected', $('.cal-day[aria-current="date"]') && $('.cal-day[aria-current="date"]').getAttribute('data-date') === T && SEL() === T && $('.dn.today'));
  ok('exactly one day is in the tab order (roving tabindex)', $$('.cal-day[tabindex="0"]').length === 1 && $$('.cal-day[tabindex="-1"]').length === $$('.cal-day').length - 1);
  ok('summary strip shows 4 tiles with 1 overdue and 1 due soon', $$('.kpis.k4 .kpi').length === 4 && $$('.kpis.k4 .kpi-n')[0].textContent === '1' && $$('.kpis.k4 .kpi-n')[1].textContent === '1', $$('.kpis.k4 .kpi-n').map(x => x.textContent).join(','));

  click('.kpis.k4 [data-act="cal-jump"].bad'); await tick(5);
  ok('overdue tile jumps to the overdue deadline and the panel shows it with actions', SEL() === C.addDays(T, -5) && $('.cal-panel .rem .chip.st-overdue') && $('.cal-panel [data-act="rem-done-open"]'));
  ok('the jumped-to day keeps keyboard focus', d.activeElement && d.activeElement.getAttribute('data-date') === SEL());

  click('[data-act="cal-today"]'); click('[data-act="cal-next"]'); await tick(5);
  const nextMonth = C.shiftMonth(T, 1);
  ok('next month moves selection and heading', SEL() === nextMonth && $('.cal-title').textContent === new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(C.parseISO(nextMonth)), $('.cal-title').textContent);
  click('[data-act="cal-prev"]'); click('[data-act="cal-prev"]'); click('[data-act="cal-today"]'); await tick(5);
  ok('Today returns to today', SEL() === T);
  setVal('#cal-month', '2031-02'); await tick(5);
  ok('month picker jumps and clamps the day', SEL().slice(0, 7) === '2031-02' && +SEL().slice(8) <= 28 && /February 2031/.test($('.cal-title').textContent), SEL());
  click('[data-act="cal-today"]');

  console.log('Calendar: keyboard');
  const cur = SEL(), ws = C.weekDays(cur, 1);
  key('.cal-day[tabindex="0"]', 'ArrowDown'); ok('ArrowDown = +7 days', SEL() === C.addDays(cur, 7) && d.activeElement.getAttribute('data-date') === SEL());
  key('.cal-day[tabindex="0"]', 'ArrowLeft'); ok('ArrowLeft = -1 day', SEL() === C.addDays(cur, 6));
  key('.cal-day[tabindex="0"]', 'ArrowUp'); key('.cal-day[tabindex="0"]', 'ArrowRight'); ok('ArrowUp then ArrowRight nets back to the start day', SEL() === cur);
  key('.cal-day[tabindex="0"]', 'PageDown'); ok('PageDown = next month', SEL() === C.shiftMonth(cur, 1));
  key('.cal-day[tabindex="0"]', 'PageUp', { shiftKey: true }); ok('Shift+PageUp = previous year', SEL() === C.shiftMonth(C.shiftMonth(cur, 1), -12));
  click('[data-act="cal-today"]'); key('.cal-day[tabindex="0"]', 'Home'); ok('Home = start of week (Monday)', SEL() === ws[0]);
  key('.cal-day[tabindex="0"]', 'End'); ok('End = end of week (Sunday)', SEL() === ws[6]);
  click('[data-act="cal-today"]');

  console.log('Calendar: layers, ledger, views');
  click('[data-act="cal-view"][data-v="agenda"]'); await tick(5);
  const cardsAll = $$('.cev').length, dlCards = $$('.cev.ev-deadlines').length, docCards = $$('.cev.ev-documents').length;
  ok('agenda lists items grouped by day', cardsAll > 0 && $$('.ag-day').length > 0);
  click('[data-act="cal-layer"][data-v="deadlines"]'); await tick(5);
  ok('turning Deadlines off hides them but keeps the count', $$('.cev.ev-deadlines').length === 0 && $('[data-act="cal-layer"][data-v="deadlines"]').getAttribute('aria-pressed') === 'false' && +$('[data-act="cal-layer"][data-v="deadlines"] b').textContent >= dlCards);
  click('[data-act="cal-layer"][data-v="deadlines"]');
  click('[data-act="cal-ledger"][data-v="client"]'); await tick(5);
  ok('client ledger filter leaves only client documents', $$('.cev.ev-documents').length > 0 && $$('.cev.ev-documents').every(x => x.classList.contains('l-client')) && $$('.cev.ev-documents').length < docCards);
  click('[data-act="cal-ledger"][data-v="all"]');
  const docCard = $('.cev.ev-documents'); docCard.click(); await tick(5);
  ok('clicking a document opens its drawer', !$('#drawer').hidden && /ENT-/.test($('#drawer').textContent));
  click('[data-act="close-drawer"]');
  click('[data-act="cal-today"]'); click('[data-act="cal-view"][data-v="week"]'); await tick(5);
  ok('week view shows 7 days starting Monday', $$('.wk-col').length === 7 && C.weekDays(SEL(), 1)[0] === $$('.wk-head')[0].getAttribute('data-date'));
  key('.wk-head[aria-pressed="true"]', 'ArrowRight'); ok('week view: ArrowRight moves a day and keeps focus on a day header', SEL() === C.addDays(T, 1) && d.activeElement.classList.contains('wk-head'));
  click('[data-act="cal-next"]'); ok('week view: Next = +7 days', SEL() === C.addDays(T, 8));
  click('[data-act="cal-today"]');
  const ls = JSON.parse(w.localStorage.getItem('aih.ui.v1') || '{}');
  ok('view and filters persist in the browser', ls.cal && ls.cal.view === 'week' && ls.cal.ledger === 'all' && ls.cal.layers.deadlines === true, JSON.stringify(ls.cal));
  click('[data-act="cal-view"][data-v="month"]');

  console.log('Calendar: day panel for approvals and exports');
  const apr = S().entries.find(e => e.status === 'approved' && e.approvedAt), aprDate = C.localDateOf(apr.approvedAt);
  ui().cal.sel = aprDate; w.__aih.render(); await tick(5);
  ok('panel shows the approval with who approved it', /Approvals/.test($('.cal-panel').textContent) && new RegExp(apr.id).test($('.cal-panel').textContent) && /Approved by/.test($('.cal-panel').textContent));
  const bd = C.localDateOf(S().batches[0].createdAt); ui().cal.sel = bd; w.__aih.render(); await tick(5);
  ok('panel shows the export batch', /Exports/.test($('.cal-panel').textContent) && new RegExp(S().batches[0].id).test($('.cal-panel').textContent));
  click('.cal-panel [data-act="go"][data-tab="export"]'); await tick(5);
  ok('export row opens the Export tab', ui().tab === 'export');
  go('calendar'); click('[data-act="cal-today"]');

  console.log('Calendar: add and complete a reminder from the panel');
  const target = C.addDays(T, 9), nRem = S().reminders.length;
  click('[data-act="cal-add-toggle"]'); click('[data-act="cal-tpl"][data-k="co.tpl.cp204"]');
  ok('template fills the title', $('#cal-title').value === 'CP204 (tax estimate instalment)');
  setVal('#cal-title', 'Board resolution, filing'); setVal('#cal-date', target);
  click('[data-act="cal-add"]'); await tick(5);
  const added = S().reminders[S().reminders.length - 1];
  ok('reminder saved as CUSTOM on the chosen date and the day is selected', S().reminders.length === nRem + 1 && added.kind === 'CUSTOM' && added.due === target && SEL() === target && /Board resolution/.test($('.cal-panel').textContent));
  ok('the change is in the audit log', S().audit.some(a => a.action === 'reminder' && /added/.test(a.note) && a.after && a.after.id === added.id));
  click('[data-act="cal-add-toggle"]'); click('[data-act="cal-add"]'); await tick(5);
  ok('empty reminder is refused with a message', S().reminders.length === nRem + 1 && $$('#toast .toast.bad').length > 0);
  click('.cal-panel [data-act="rem-done-open"]'); setVal('#rd-ref', 'SSM-1'); setVal('#rd-amt', '60'); click('.cal-panel [data-act="rem-done-save"]'); await tick(5);
  ok('mark submitted from the calendar records ref and amount', S().reminders.find(r => r.id === added.id).status === 'done' && S().reminders.find(r => r.id === added.id).refNo === 'SSM-1' && $('.cal-panel .chip.st-done'));
  ok('finished deadline is drawn as done in the grid', $$('.cal-pill.ev-deadlines.s-done').length >= 1);

  console.log('Calendar: .ics download');
  saved.length = 0; click('[data-act="cal-ics"]'); await tick(30);
  const open = S().reminders.filter(r => r.status !== 'done').length, ics = saved[0];
  ok('ics offered through the downloads capability', saved.length === 1 && /\.ics$/.test(ics.filename), saved.map(x => x.filename).join());
  ok('ics has one event per open deadline and standard CRLF line ends', ics && ics.data.startsWith('BEGIN:VCALENDAR\r\n') && (ics.data.match(/BEGIN:VEVENT/g) || []).length === open && !/(^|[^\r])\n/.test(ics.data), ics && String((ics.data.match(/BEGIN:VEVENT/g) || []).length) + ' vs ' + open);

  console.log('Calendar: week start, Bahasa Malaysia, dark theme hook');
  go('setup'); setVal('[data-set="weekStart"]', '0'); go('calendar'); await tick(5);
  ok('week start Sunday: grid begins on Sunday', /^(Sun|Ahd)/.test($$('[role="columnheader"]')[0].textContent) && S().settings.weekStart === 0 && S().audit.some(a => a.action === 'settings' && a.after && a.after.weekStart === 0));
  go('setup'); setVal('[data-set="weekStart"]', '1');
  click('#lang-btn'); go('calendar'); await tick(5);
  ok('BM: month heading and weekdays are Malay', $('.cal-title').textContent === new Intl.DateTimeFormat('ms-MY', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(C.parseISO(SEL())) && /^Isn/.test($$('[role="columnheader"]')[0].textContent) && /Kalendar/.test($('#tabs [aria-current="page"]').textContent), $('.cal-title').textContent + ' / ' + $$('[role="columnheader"]')[0].textContent);
  ok('BM: grid cells have Malay accessible labels', /item|Tiada jadual/.test($('.cal-day').getAttribute('aria-label')), $('.cal-day').getAttribute('aria-label'));
  click('#lang-btn');
  ok('calendar CSS uses theme tokens only (no hard-coded colours in the calendar block)', (() => { const css = Array.from(d.querySelectorAll('style')).map(x => x.textContent).join('\n'); const part = css.slice(css.indexOf('/* calendar */')); return part.length > 500 && !/#[0-9a-fA-F]{3,8}\b/.test(part.replace(/color-mix\([^)]*\)/g, '')); })());
  ok('no runtime errors during the whole run', errors.length === 0, errors.join(' | '));
  console.log(`\n${pass} ok, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('SMOKE TEST CRASHED', e); console.error(errors.join('\n')); process.exit(2); });
