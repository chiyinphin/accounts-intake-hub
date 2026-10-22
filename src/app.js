(function () {
  'use strict';
  var KEY = 'aih.state.v1', UIKEY = 'aih.ui.v1';
  var TABS = [['dashboard', 'nav.dashboard', 'grid'], ['inbox', 'nav.inbox', 'inbox'], ['entry', 'nav.entry', 'file'], ['approvals', 'nav.approvals', 'check'],
    ['calendar', 'nav.calendar', 'cal'], ['compliance', 'nav.compliance', 'shield'], ['export', 'nav.export', 'out'], ['audit', 'nav.audit', 'list'], ['setup', 'nav.setup', 'sliders']];
  var PRIMARY = ['dashboard', 'inbox', 'entry', 'approvals'];
  var ICON = {
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    left: '<polyline points="15 18 9 12 15 6"/>',
    right: '<polyline points="9 18 15 12 9 6"/>',
    cal2: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/><line x1="8" y1="18" x2="8.01" y2="18"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    dl: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    out: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'
  };
  var DELIMS = { comma: ',', semicolon: ';', tab: '\t', pipe: '|' };
  var WD = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ms: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'] };
  var KIND_PAYEE = { EPF: 'KWSP (EPF)', SOCSO: 'PERKESO (SOCSO)', EIS: 'PERKESO (EIS)', PCB: 'LHDN (PCB)' };

  var state, storageOk = true, blobStore = {}, dlCap;
  var ui = {
    tab: 'dashboard', userId: 'aina', entryId: null, entryDraft: null, entryNote: '', attach: [], drawerId: null, copyDlg: null,
    apFilter: 'pending', exportSel: {}, exportLayout: 'fox', auditF: { user: '', action: '', q: '' }, remFilter: 'open', remDoneId: null,
    payRows: [{ name: 'Staff A', wage: 3200, pcb: 0 }, { name: 'Staff B', wage: 4800, pcb: 85 }, { name: 'Staff C', wage: 6500, pcb: 260 }],
    payPeriod: '', genPeriod: '', selftest: null, moreOpen: false, confirmReset: false, pasteSource: 'whatsapp', uploadSource: 'upload', pasteText: '', remTitle: '',
    cal: { view: 'month', sel: '', layers: { deadlines: true, documents: true, approvals: true, exports: true }, ledger: 'all', add: false, addTitle: '', focus: '' }
  };
  var CAL_VIEWS = ['month', 'week', 'agenda'], CAL_LEDGERS = ['all', 'office', 'client'];

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function lang() { return (state && state.settings && state.settings.lang) || 'en'; }
  function t(k, v) {
    var s = (I18N[lang()] || {})[k];
    if (s === undefined) s = I18N.en[k];
    if (s === undefined) return k;
    if (v) Object.keys(v).forEach(function (n) { s = s.split('{' + n + '}').join(v[n]); });
    return s;
  }
  function money(n) { return Core.fmtMoney(n); }
  function fmtTs(iso) { var d = new Date(iso); return isNaN(d) ? '' : pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function me() { return Core.userById(state, ui.userId) || state.users[0]; }
  function num(v) { var x = parseFloat(String(v).replace(/,/g, '')); return isFinite(x) ? x : 0; }
  function val(sel) { var el = $(sel); return el ? String(el.value || '').trim() : ''; }
  function icon(n) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + ICON[n] + '</svg>'; }
  function chip(s) { return '<span class="chip st-' + esc(s) + '">' + esc(t('st.' + s)) + '</span>'; }
  function ltag(l) { return '<span class="ltag l-' + esc(l) + '">' + esc(t('ledger.' + l)) + '</span>'; }
  function opts(list, cur, labelFn) { return list.map(function (x) { return '<option value="' + esc(x) + '"' + (x === cur ? ' selected' : '') + '>' + esc(labelFn ? labelFn(x) : x) + '</option>'; }).join(''); }
  function getPath(o, p) { return p.split('.').reduce(function (a, k) { return a ? a[k] : undefined; }, o); }
  function setPath(o, p, v) { var ks = p.split('.'), last = ks.pop(); var tgt = ks.reduce(function (a, k) { return a[k]; }, o); tgt[last] = v; }
  function fill(def, cur) {
    if (!cur || typeof cur !== 'object' || Array.isArray(def)) return cur === undefined ? def : cur;
    var out = {}; Object.keys(def).forEach(function (k) { out[k] = typeof def[k] === 'object' && !Array.isArray(def[k]) ? fill(def[k], cur[k]) : (cur[k] === undefined ? def[k] : cur[k]); });
    return out;
  }
  function prevMonth() { var d = new Date(); var y = d.getFullYear(), m = d.getMonth(); if (m < 1) { m = 12; y--; } return y + '-' + pad(m); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function toast(msg, bad) {
    var el = document.createElement('div'); el.className = 'toast' + (bad ? ' bad' : ''); el.textContent = msg;
    $('#toast').appendChild(el); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, bad ? 6500 : 3500);
  }
  function showErr(err, sel) {
    if (!err || err.name !== 'CoreError') throw err;
    var m = t('ce.' + err.code);
    var el = sel ? $(sel) : null;
    if (el) { el.textContent = m; el.hidden = false; } else toast(m, true);
  }

  /* ---------- persistence ---------- */
  function loadAll() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); if (s && s.v === 1 && Array.isArray(s.entries)) state = s; }
    } catch (e) { storageOk = false; }
    if (!state) state = Core.seedState(Core.todayLocal());
    state.settings = fill(Core.defaultSettings(), state.settings);
    try {
      var u = JSON.parse(localStorage.getItem(UIKEY) || 'null');
      if (u) {
        if (u.userId && Core.userById(state, u.userId)) ui.userId = u.userId;
        if (u.tab && TABS.some(function (x) { return x[0] === u.tab; })) ui.tab = u.tab;
        if (u.cal) {
          if (CAL_VIEWS.indexOf(u.cal.view) >= 0) ui.cal.view = u.cal.view;
          if (CAL_LEDGERS.indexOf(u.cal.ledger) >= 0) ui.cal.ledger = u.cal.ledger;
          Core.CAL_LAYERS.forEach(function (k) { if (u.cal.layers && typeof u.cal.layers[k] === 'boolean') ui.cal.layers[k] = u.cal.layers[k]; });
        }
      }
    } catch (e) { /* ignore */ }
    var h = (location.hash || '').replace('#', '');
    if (TABS.some(function (x) { return x[0] === h; })) ui.tab = h;
    if (!Core.userById(state, ui.userId)) ui.userId = state.users[0].id;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); localStorage.setItem(UIKEY, JSON.stringify({ userId: ui.userId, tab: ui.tab, cal: { view: ui.cal.view, ledger: ui.cal.ledger, layers: ui.cal.layers } })); storageOk = true; } catch (e) { storageOk = false; }
  }
  function commit(msg) { save(); render(); if (msg) toast(msg); }

  /* ---------- entry rows ---------- */
  function entryTitle(e) { return e.payee || (e.attachments[0] && e.attachments[0].name) || t('src.' + e.source); }
  function erow(e, o) {
    o = o || {};
    var desc = e.description || (e.rawText ? e.rawText.replace(/\s+/g, ' ').slice(0, 90) : '');
    var date = e.docDate ? Core.fmtDate(e.docDate) : Core.fmtDate(Core.localDateOf(e.createdAt));
    var dups = ['draft', 'returned', 'submitted'].indexOf(e.status) >= 0 ? Core.findDuplicates(e, state.entries).length : 0;
    var lead = o.check ? '<input type="checkbox" tabindex="-1" aria-hidden="true"' + (o.checked ? ' checked' : '') + '> ' : '';
    var attrs = o.check ? ' role="checkbox" aria-checked="' + (o.checked ? 'true' : 'false') + '" data-act="toggle-sel" data-id="' + esc(e.id) + '"' : ' role="button" data-act="open-drawer" data-id="' + esc(e.id) + '"';
    return '<div class="erow" tabindex="0"' + attrs + '>' +
      '<div class="er-main"><span class="er-id">' + lead + esc(e.id) + '</span><span class="er-payee">' + esc(entryTitle(e)) + '</span>' + (desc ? '<span class="er-desc">' + esc(desc) + '</span>' : '') + '</div>' +
      '<div class="er-tags"><span class="type">' + esc(t('type.' + e.type)) + '</span>' + (e.status === 'inbox' && !e.payee ? '' : ltag(e.ledger)) + chip(e.status) + (dups ? '<span class="chip st-soon">' + esc(t('entry.dupTitle')) + '</span>' : '') + '</div>' +
      '<div class="er-amt"><span class="num">' + (e.totalAmount > 0 ? esc(money(e.totalAmount)) : '&mdash;') + '</span><span class="er-date">' + esc(date) + '</span></div>' +
      (o.extra ? '<div class="er-act">' + o.extra + '</div>' : '') + '</div>';
  }
  function attachHTML(list) {
    return list.map(function (a, i) {
      var isImg = /^image\//.test(a.type) || /\.(jpe?g|png|gif|webp)$/i.test(a.name);
      var thumb = a.url && isImg ? '<img src="' + esc(a.url) + '" alt="">' : '<div class="fi">' + esc((a.name.split('.').pop() || 'file').slice(0, 4).toUpperCase()) + '</div>';
      return '<div class="attach">' + thumb + '<div class="meta"><div>' + esc(a.name) + '</div><div class="muted">' + esc(Math.max(1, Math.round(a.size / 1024))) + ' KB' + (a.url ? '' : ' &middot; ' + esc(t('entry.noPreview'))) + '</div></div>' +
        (o_rm(i)) + '</div>';
    }).join('');
  }
  function o_rm(i) { return i === undefined ? '' : '<button class="btn sm quiet" data-act="rm-attach" data-i="' + i + '">' + esc(t('btn.remove')) + '</button>'; }

  /* ---------- views ---------- */
  function vDashboard() {
    var today = Core.todayLocal(), s = Core.dashboardStats(state, today), u = me();
    function kpi(tab, label, n, sub, cls, extra) {
      return '<button class="kpi ' + (cls || '') + '" data-act="go" data-tab="' + tab + '"' + (extra || '') + '><span class="kpi-l">' + esc(label) + '</span><span class="kpi-n">' + n + '</span><span class="kpi-s">' + esc(sub) + '</span></button>';
    }
    function pairs(b) { return '<span class="pair"><span>' + esc(t('dash.monthOut')) + '</span><b>' + esc(money(b.out)) + '</b></span><span class="pair"><span>' + esc(t('dash.monthIn')) + '</span><b>' + esc(money(b.inn)) + '</b></span>'; }
    var h = '<div class="page-head"><h1>' + esc(t('dash.title')) + '</h1><span class="muted">' + esc(t('dash.asAt', { date: Core.fmtDate(today) })) + '</span></div><div class="stack">';
    h += '<div class="kpis">' +
      kpi('inbox', t('dash.inbox'), s.inbox, t('dash.inboxSub')) +
      kpi('approvals', t('dash.await'), s.submitted, t('dash.awaitSub'), '', ' data-filter="pending"') +
      kpi('compliance', t('dash.overdue'), s.overdue, t('dash.overdueSub'), s.overdue ? 'bad' : '') +
      kpi('compliance', t('dash.soon'), s.soon, t('dash.soonSub'), s.soon ? 'warn' : '') +
      '<button class="kpi" data-act="go" data-tab="approvals" data-filter="approved"><span class="kpi-l">' + esc(t('dash.office')) + '</span>' + pairs(s.month.office) + '<span class="kpi-s">' + esc(t('dash.month')) + '</span></button>' +
      '<button class="kpi" data-act="go" data-tab="approvals" data-filter="approved"><span class="kpi-l">' + esc(t('dash.client')) + '</span>' + pairs(s.month.client) + '<span class="kpi-s">' + esc(t('dash.month')) + '</span></button></div>';
    h += '<div class="grid2"><div class="card"><h3>' + esc(t('dash.attention')) + '</h3>';
    if (!s.attention.length) h += '<p class="empty">' + esc(t('dash.clear')) + '</p>';
    else {
      h += '<div class="list">' + s.attention.map(function (a) {
        var txt, act, id = a.entryId || '';
        if (a.kind === 'overdue') { txt = t('att.overdue', { title: a.title, due: Core.fmtDate(a.due) }); act = 'data-act="go" data-tab="compliance"'; }
        else {
          act = 'data-act="open-drawer" data-id="' + esc(id) + '"';
          if (a.kind === 'balance') txt = t('att.balance', { id: id, amt: money(a.detail.total), matter: a.detail.matterNo, short: money(a.detail.shortBy) });
          else if (a.kind === 'duplicate') txt = t('att.duplicate', { id: id, ids: a.detail.join(', ') });
          else if (a.kind === 'returned') txt = t('att.returned', { id: id, detail: a.detail });
          else txt = t('att.rejected', { id: id, detail: a.detail });
        }
        var cls = a.kind === 'overdue' || a.kind === 'balance' ? 'st-overdue' : a.kind === 'duplicate' || a.kind === 'returned' ? 'st-soon' : 'st-rejected';
        return '<div class="erow" style="grid-template-columns:auto minmax(0,1fr)" tabindex="0" role="button" ' + act + '><span class="chip ' + cls + '">' + esc(t(a.kind === 'overdue' ? 'st.overdue' : a.kind === 'balance' ? 'entry.balTitle' : a.kind === 'duplicate' ? 'entry.dupTitle' : a.kind === 'returned' ? 'st.returned' : 'st.rejected')) + '</span><span>' + esc(txt) + '</span></div>';
      }).join('') + '</div>';
    }
    h += '</div><div class="card"><h3>' + esc(t('dash.recent')) + '</h3><div class="hist">' +
      state.audit.slice().sort(function (a, b) { return a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : (a.id < b.id ? 1 : -1); }).slice(0, 6).map(function (ev) {
        return '<div><span class="ts">' + esc(fmtTs(ev.ts)) + '</span><span><b>' + esc(Core.userName(state, ev.user)) + '</b> ' + esc(t('act.' + ev.action)) + ' ' + esc(ev.entryId) + '</span></div>';
      }).join('') + '</div></div></div>';
    h += '<p class="note small">' + esc(t('dash.demo')) + '</p></div>';
    return h;
  }

  function parsePaste() {
    var p = Core.parsePasted(ui.pasteText);
    return p;
  }
  function pasteResultHTML() {
    if (!ui.pasteText.trim()) return '<p class="muted small">' + esc(t('inbox.nothing')) + '</p>';
    var p = parsePaste();
    var chips = [['amount', p.amount !== null ? money(p.amount) : ''], ['date', p.date ? Core.fmtDate(p.date) : ''], ['refNo', p.refNo], ['payee', p.payee], ['type', t('type.' + p.type)]];
    return '<div class="found">' + chips.map(function (c) {
      var lbl = c[0] === 'amount' ? t('f.total') : c[0] === 'date' ? t('f.docDate') : c[0] === 'refNo' ? t('f.refNo') : c[0] === 'payee' ? t('f.payee') : t('f.type');
      return '<span class="chip ' + (c[1] ? '' : 'miss') + '">' + esc(lbl) + ': ' + esc(c[1] || '—') + '</span>';
    }).join('') + '</div>';
  }
  function vInbox() {
    var items = state.entries.filter(function (e) { return e.status === 'inbox'; }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    var h = '<div class="page-head"><h1>' + esc(t('inbox.title')) + '</h1></div><div class="stack"><div class="grid2 even">';
    h += '<div class="card stack"><label class="drop" id="drop"><input id="file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf" hidden>' + icon('out') + '<strong>' + esc(t('inbox.drop')) + '</strong><span class="small">' + esc(t('inbox.dropSub')) + '</span></label>' +
      '<div class="field"><label for="upload-source">' + esc(t('inbox.source')) + '</label><select id="upload-source" data-ui="uploadSource">' + opts(Core.SOURCES, ui.uploadSource, function (x) { return t('src.' + x); }) + '</select></div>' +
      '<p class="muted small">' + esc(t('inbox.stub')) + '</p></div>';
    h += '<div class="card stack"><div class="field"><label for="paste-text">' + esc(t('inbox.paste')) + '</label><textarea id="paste-text" placeholder="' + esc(t('inbox.pastePh')) + '">' + esc(ui.pasteText) + '</textarea></div>' +
      '<div id="paste-result">' + pasteResultHTML() + '</div><div class="row"><select id="paste-source" data-ui="pasteSource" style="width:auto">' + opts(Core.SOURCES, ui.pasteSource, function (x) { return t('src.' + x); }) + '</select>' +
      '<button class="btn primary" data-act="add-paste">' + esc(t('btn.addInbox')) + '</button></div></div></div>';
    h += '<div class="card"><h3>' + esc(t('inbox.queue')) + ' (' + items.length + ')</h3>';
    if (!items.length) h += '<p class="empty">' + esc(t('inbox.empty')) + '</p>';
    else {
      h += '<div class="list">' + items.map(function (e) {
        var extra = '<button class="btn sm primary" data-act="open-entry" data-id="' + esc(e.id) + '">' + esc(t('btn.open')) + '</button>' +
          (e.attachments.length ? '<button class="btn sm" data-act="extract" data-id="' + esc(e.id) + '">' + esc(t('btn.extract')) + '</button>' : '') +
          '<span class="muted small">' + esc(t('src.' + e.source)) + ' &middot; ' + esc(Core.userName(state, e.createdBy)) + '</span>';
        return erow(e, { extra: extra });
      }).join('') + '</div><p class="muted small" style="margin-top:10px">' + esc(t('inbox.simNote')) + '</p>';
    }
    return h + '</div></div>';
  }

  function blankDraft() {
    return { type: 'bill', source: 'upload', docDate: Core.todayLocal(), payee: '', refNo: '', description: '', category: '', netAmount: '', taxAmount: '', ledger: 'office', matterNo: '', rawText: '' };
  }
  function entryToDraft(e) {
    var d = blankDraft();
    ['type', 'source', 'docDate', 'payee', 'refNo', 'description', 'category', 'ledger', 'matterNo', 'rawText'].forEach(function (k) { d[k] = e[k] || d[k]; });
    d.docDate = e.docDate || ''; d.category = e.category || ''; d.matterNo = e.matterNo || '';
    d.netAmount = e.netAmount ? String(e.netAmount) : ''; d.taxAmount = e.taxAmount ? String(e.taxAmount) : '';
    return d;
  }
  function openEntry(id, prefill, note) {
    ui.entryId = id || null; ui.entryNote = note || '';
    var e = id ? Core.findEntry(state, id) : null;
    ui.entryDraft = e ? entryToDraft(e) : blankDraft();
    if (prefill) Object.keys(prefill).forEach(function (k) { if (prefill[k] !== undefined && prefill[k] !== null && prefill[k] !== '') ui.entryDraft[k] = (k === 'netAmount' || k === 'taxAmount') ? String(prefill[k]) : prefill[k]; });
    var store = (e && blobStore[e.id]) || [];
    ui.attach = e ? e.attachments.map(function (a) { var m = store.filter(function (s) { return s.name === a.name; })[0]; return { name: a.name, size: a.size, type: a.type, url: m ? m.url : '' }; }) : [];
    ui.drawerId = null;
    setTab('entry');
  }
  function draftAsEntry() {
    var d = ui.entryDraft, x = { id: ui.entryId, type: d.type, docDate: d.docDate, payee: d.payee, refNo: d.refNo, netAmount: Core.round2(num(d.netAmount)), taxAmount: Core.round2(num(d.taxAmount)), ledger: d.ledger, matterNo: d.ledger === 'client' ? d.matterNo : '', status: 'draft' };
    x.totalAmount = Core.computeTotal(x.netAmount, x.taxAmount);
    return x;
  }
  function collectPatch() {
    var d = ui.entryDraft;
    return { type: d.type, source: d.source, docDate: d.docDate, payee: d.payee, refNo: d.refNo, description: d.description, category: d.category,
      netAmount: num(d.netAmount), taxAmount: num(d.taxAmount), ledger: d.ledger, matterNo: d.ledger === 'client' ? d.matterNo : '',
      attachments: ui.attach.map(function (a) { return { name: a.name, size: a.size, type: a.type }; }), rawText: d.rawText };
  }
  function vEntry() {
    if (!ui.entryDraft) { ui.entryDraft = blankDraft(); ui.attach = []; }
    var d = ui.entryDraft, e = ui.entryId ? Core.findEntry(state, ui.entryId) : null, u = me();
    var mine = state.entries.filter(function (x) { return (x.status === 'inbox') || ((x.status === 'draft' || x.status === 'returned') && x.createdBy === u.id); }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    var payees = {}; state.entries.forEach(function (x) { if (x.payee) payees[x.payee] = 1; });
    function fld(label, id, inner, cls) { return '<div class="field ' + (cls || '') + '"><label for="' + id + '">' + esc(label) + '</label>' + inner + '<span class="ferr" id="err-' + id.replace('f-', '') + '"></span></div>'; }
    function seg(name, list, cur, lblPrefix) {
      return '<div class="seg" role="radiogroup">' + list.map(function (x) { return '<label><input type="radio" name="' + name + '" data-f="' + name.replace('f-', '') + '" value="' + x + '"' + (x === cur ? ' checked' : '') + '><span>' + esc(t(lblPrefix + x)) + '</span></label>'; }).join('') + '</div>';
    }
    var h = '<div class="page-head"><h1>' + esc(t('entry.title')) + '</h1><div class="row"><span class="muted">' + (e ? esc(t('entry.edit', { id: e.id })) + ' ' + chip(e.status) : esc(t('entry.new'))) + '</span><button class="btn" data-act="new-entry">' + esc(t('btn.new')) + '</button></div></div>';
    h += '<div class="grid2"><div class="card stack"><div class="fields">';
    h += '<div class="field full"><span class="lbl">' + esc(t('f.type')) + '</span>' + seg('f-type', Core.TYPES, d.type, 'type.') + '</div>';
    h += fld(t('f.docDate'), 'f-docDate', '<input id="f-docDate" type="date" data-f="docDate" value="' + esc(d.docDate) + '">');
    h += fld(t('f.refNo'), 'f-refNo', '<input id="f-refNo" type="text" data-f="refNo" value="' + esc(d.refNo) + '" autocomplete="off">');
    h += fld(t('f.payee'), 'f-payee', '<input id="f-payee" type="text" list="payee-list" data-f="payee" value="' + esc(d.payee) + '" autocomplete="off"><datalist id="payee-list">' + Object.keys(payees).map(function (p) { return '<option value="' + esc(p) + '">'; }).join('') + '</datalist>', 'full');
    h += fld(t('f.description'), 'f-description', '<input id="f-description" type="text" data-f="description" value="' + esc(d.description) + '">', 'full');
    h += fld(t('f.category'), 'f-category', '<select id="f-category" data-f="category"><option value="">' + esc(t('f.none')) + '</option>' + opts(Core.CATEGORIES, d.category) + '</select>');
    h += fld(t('f.source'), 'f-source', '<select id="f-source" data-f="source">' + opts(Core.SOURCES, d.source, function (x) { return t('src.' + x); }) + '</select>');
    h += '<div class="field full"><span class="lbl">' + esc(t('f.ledger')) + '</span>' + seg('f-ledger', Core.LEDGERS, d.ledger, 'ledger.') + '</div>';
    h += '<div class="field full" id="matter-row"' + (d.ledger === 'client' ? '' : ' hidden') + '><label for="f-matterNo">' + esc(t('f.matter')) + '</label><select id="f-matterNo" data-f="matterNo"><option value="">' + esc(t('entry.pickMatter')) + '</option>' +
      state.matters.map(function (m) { return '<option value="' + esc(m.matterNo) + '"' + (m.matterNo === d.matterNo ? ' selected' : '') + '>' + esc(m.matterNo + ' — ' + m.clientName) + '</option>'; }).join('') + '</select><span class="muted small" id="matter-info"></span><span class="ferr" id="err-matterNo"></span></div>';
    h += fld(t('f.net'), 'f-netAmount', '<input id="f-netAmount" type="number" inputmode="decimal" step="0.01" min="0" data-f="netAmount" value="' + esc(d.netAmount) + '">');
    h += fld(t('f.tax'), 'f-taxAmount', '<input id="f-taxAmount" type="number" inputmode="decimal" step="0.01" min="0" data-f="taxAmount" value="' + esc(d.taxAmount) + '">');
    h += '<div class="full"><div class="totalbox"><span class="lbl">' + esc(t('f.total')) + '</span><span class="num" id="f-total">' + esc(money(Core.computeTotal(num(d.netAmount), num(d.taxAmount)))) + '</span></div></div>';
    h += '</div><div class="row"><button class="btn" data-act="save-entry">' + esc(t('btn.saveDraft')) + '</button><button class="btn primary" data-act="submit-entry">' + esc(t('btn.submit')) + '</button></div></div>';
    h += '<div class="stack">';
    if (ui.entryNote) h += '<p class="note">' + esc(t(ui.entryNote)) + '</p>';
    if (e && e.status === 'returned' && e.returnComment) h += '<div class="note warn"><strong>' + esc(t('entry.returned')) + '</strong><br>' + esc(e.returnComment) + '</div>';
    if (d.rawText) h += '<div class="card"><h3>' + esc(t('entry.raw')) + '</h3><p class="small" style="white-space:pre-wrap;overflow-wrap:anywhere">' + esc(d.rawText) + '</p></div>';
    h += '<div class="note warn" id="dup-box" hidden><strong>' + esc(t('entry.dupTitle')) + '</strong><div id="dup-list" class="small"></div><label class="row small" style="margin-top:8px"><input type="checkbox" id="f-dupok"> ' + esc(t('entry.dupTick')) + '</label><input id="f-dupreason" type="text" placeholder="' + esc(t('entry.dupReason')) + '" style="margin-top:6px"><span class="ferr" id="dup-err"></span></div>';
    h += '<div class="note bad" id="bal-box" hidden><strong>' + esc(t('entry.balTitle')) + '</strong><div id="bal-text" class="small"></div></div>';
    h += '<div class="card"><h3>' + esc(t('f.attachments')) + '</h3><div class="stack"><div id="attach-list" class="stack">' + attachHTML(ui.attach) + '</div>' +
      '<label class="btn" style="align-self:flex-start"><input id="f-files" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf" hidden>' + esc(t('entry.addFiles')) + '</label><p class="muted small">' + esc(t('entry.attachNote')) + '</p></div></div>';
    h += '<div class="card"><h3>' + esc(t('entry.mine')) + '</h3>' + (mine.length ? '<div class="list">' + mine.map(function (x) { return erow(x, { extra: '<button class="btn sm primary" data-act="open-entry" data-id="' + esc(x.id) + '">' + esc(t('btn.open')) + '</button>' }); }).join('') + '</div>' : '<p class="empty">' + esc(t('entry.mineEmpty')) + '</p>') + '</div>';
    return h + '</div></div>';
  }
  function refreshEntryHints() {
    if (ui.tab !== 'entry' || !ui.entryDraft) return;
    var x = draftAsEntry(), w = Core.entryWarnings(x, state);
    var tot = $('#f-total'); if (tot) tot.textContent = money(x.totalAmount);
    var mi = $('#matter-info'), m = Core.findMatter(state, x.matterNo);
    if (mi) mi.textContent = m ? t('entry.matterInfo', { name: m.clientName, bal: money(m.clientBalance) }) : '';
    var db = $('#dup-box');
    if (db) {
      db.hidden = !w.duplicates.length;
      $('#dup-list').innerHTML = w.duplicates.map(function (id) { var o = Core.findEntry(state, id); return esc(id + ' · ' + o.payee + ' · ' + money(o.totalAmount) + ' · ' + Core.fmtDate(o.docDate) + ' · ' + t('st.' + o.status)); }).join('<br>');
    }
    var bb = $('#bal-box');
    if (bb) { bb.hidden = !w.balance; if (w.balance) $('#bal-text').textContent = t('entry.balText', { short: money(w.balance.shortBy), bal: money(w.balance.balance), matter: w.balance.matterNo }); }
    var mr = $('#matter-row'); if (mr) mr.hidden = ui.entryDraft.ledger !== 'client';
  }
  function persistEntry() {
    var patch = collectPatch(), e;
    if (ui.entryId) e = Core.saveEntry(state, me(), patch, ui.entryId);
    else { e = Core.saveEntry(state, me(), patch); ui.entryId = e.id; }
    blobStore[e.id] = ui.attach.filter(function (a) { return a.url; });
    return e;
  }
  function showFieldErrors(errs) {
    $$('.ferr').forEach(function (n) { n.textContent = ''; });
    $$('.invalid').forEach(function (n) { n.classList.remove('invalid'); });
    var first = null;
    Object.keys(errs).forEach(function (k) {
      var m = $('#err-' + k); if (m) m.textContent = t('err.' + errs[k]);
      var inp = $('[data-f="' + k + '"]:not([type="radio"])'); if (inp) { inp.classList.add('invalid'); if (!first) first = inp; }
    });
    if (first) first.focus();
  }

  function vApprovals() {
    var u = me(), f = ui.apFilter;
    var list = state.entries.filter(function (e) { return f === 'pending' ? e.status === 'submitted' : f === 'approved' ? e.status === 'approved' : e.status !== 'inbox'; }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    var h = '<div class="page-head"><h1>' + esc(t('ap.title')) + '</h1><div class="seg tabs2">' +
      [['pending', 'ap.pending'], ['approved', 'ap.approved'], ['all', 'ap.all']].map(function (x) { return '<button data-act="ap-filter" data-v="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + esc(t(x[1])) + '</button>'; }).join('') + '</div></div><div class="stack">';
    if (!Core.isApprover(u)) h += '<p class="note">' + esc(t('ap.clerkNote')) + '</p>';
    h += '<div class="card">' + (list.length ? '<div class="list">' + list.map(function (e) { return erow(e); }).join('') + '</div>' : '<p class="empty">' + esc(t('ap.empty')) + '</p>') + '</div></div>';
    return h;
  }
  function detailOf(ev) {
    var parts = [];
    if (ev.before && ev.after) {
      Object.keys(ev.after).forEach(function (k) {
        function f(v) { return Array.isArray(v) ? v.length + ' file(s)' : (v === '' || v === null || v === undefined) ? '—' : String(v); }
        parts.push(k + ': ' + f(ev.before[k]) + ' → ' + f(ev.after[k]));
      });
    }
    if (ev.note) parts.push(ev.note);
    return parts.join('; ');
  }
  function drawerHTML(e) {
    var u = me(), w = Core.entryWarnings(e, state), appr = Core.isApprover(u);
    var m = Core.findMatter(state, e.matterNo);
    var hist = state.audit.filter(function (x) { return x.entryId === e.id; }).sort(function (a, b) { return a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : (a.id < b.id ? -1 : 1); });
    var kv = [[t('f.type'), t('type.' + e.type)], [t('f.docDate'), Core.fmtDate(e.docDate)], [t('f.refNo'), e.refNo], [t('f.description'), e.description], [t('f.category'), e.category], [t('f.source'), t('src.' + e.source)],
      [t('f.net'), money(e.netAmount)], [t('f.tax'), money(e.taxAmount)], [t('f.total'), money(e.totalAmount)], [t('f.ledger'), t('ledger.' + e.ledger)],
      [t('f.matter'), e.matterNo ? e.matterNo + (m ? ' — ' + m.clientName : '') : ''], [t('kv.by'), Core.userName(state, e.createdBy)], [t('kv.created'), fmtTs(e.createdAt)]];
    if (e.approvedBy) { kv.push([t('kv.approvedBy'), Core.userName(state, e.approvedBy)], [t('kv.approvedAt'), fmtTs(e.approvedAt)]); }
    if (e.exportBatchId) kv.push([t('kv.batch'), e.exportBatchId]);
    if (e.rejectReason) kv.push([t('kv.rejectReason'), e.rejectReason]);
    if (e.returnComment) kv.push([t('kv.returnComment'), e.returnComment]);
    if (e.duplicateOverrideReason) kv.push([t('entry.dupTitle'), e.duplicateOverrideReason]);
    if (e.balanceOverrideReason) kv.push([t('kv.balOverride'), e.balanceOverrideReason]);
    var store = blobStore[e.id] || [];
    var atts = e.attachments.map(function (a) { var s = store.filter(function (x) { return x.name === a.name; })[0]; return { name: a.name, size: a.size, type: a.type, url: s ? s.url : '' }; });
    var h = '<div class="drawer-head"><div><div class="er-id">' + esc(e.id) + '</div><h2>' + esc(entryTitle(e)) + '</h2><div class="row" style="margin-top:6px">' + chip(e.status) + ltag(e.ledger) + '</div></div><button class="btn quiet" data-act="close-drawer">' + esc(t('btn.close')) + '</button></div><div class="drawer-body">';
    if (w.duplicates.length && ['draft', 'returned', 'submitted'].indexOf(e.status) >= 0) h += '<div class="note warn"><strong>' + esc(t('entry.dupTitle')) + '</strong><br>' + esc(w.duplicates.join(', ')) + (e.duplicateOverrideReason ? '<br>' + esc(t('ap.dupOverride', { reason: e.duplicateOverrideReason })) : '') + '</div>';
    if (w.balance && ['draft', 'returned', 'submitted'].indexOf(e.status) >= 0) h += '<div class="note bad"><strong>' + esc(t('entry.balTitle')) + '</strong><br>' + esc(t('entry.balText', { short: money(w.balance.shortBy), bal: money(w.balance.balance), matter: w.balance.matterNo })) + '</div>';
    h += '<dl class="kv">' + kv.filter(function (x) { return x[1] !== '' && x[1] !== undefined; }).map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>';
    if (atts.length) h += '<div class="stack">' + attachHTML(atts.map(function (a) { return a; })).replace(/<button[^>]*data-act="rm-attach"[^>]*>.*?<\/button>/g, '') + '</div>';
    if (e.rawText) h += '<div><h3>' + esc(t('entry.raw')) + '</h3><p class="small" style="white-space:pre-wrap;overflow-wrap:anywhere;margin-top:6px">' + esc(e.rawText) + '</p></div>';
    h += '<p class="note bad" id="drawer-msg" hidden></p>';
    var id = esc(e.id);
    if (e.status === 'submitted') {
      if (!appr) h += '<p class="note">' + esc(t('ap.clerkNote')) + '</p>';
      else {
        var own = e.createdBy === u.id;
        if (own) h += '<p class="note warn">' + esc(t('ap.own')) + '</p>';
        if (w.balance) h += '<div class="field"><label for="d-balance">' + esc(t('ap.balReason')) + '</label><input id="d-balance" type="text"></div>';
        h += '<div class="row"><button class="btn primary" data-act="approve" data-id="' + id + '"' + (own ? ' disabled' : '') + '>' + esc(t('btn.approve')) + '</button></div>';
        h += '<div class="field"><label for="d-reject">' + esc(t('ap.reasonReject')) + '</label><textarea id="d-reject"></textarea><div><button class="btn danger sm" data-act="reject" data-id="' + id + '">' + esc(t('btn.reject')) + '</button></div></div>';
        h += '<div class="field"><label for="d-return">' + esc(t('ap.reasonReturn')) + '</label><textarea id="d-return"></textarea><div><button class="btn sm" data-act="return" data-id="' + id + '">' + esc(t('btn.return')) + '</button></div></div>';
      }
    }
    if (e.status === 'approved' && appr) h += '<div class="field"><label for="d-reopen">' + esc(t('ap.reasonReopen')) + '</label><textarea id="d-reopen"></textarea><div><button class="btn sm" data-act="reopen" data-id="' + id + '">' + esc(t('btn.reopen')) + '</button></div></div>';
    if (['inbox', 'draft', 'returned'].indexOf(e.status) >= 0 && (e.status === 'inbox' || e.createdBy === u.id || appr)) h += '<div class="row"><button class="btn primary" data-act="open-entry" data-id="' + id + '">' + esc(t('btn.edit')) + '</button></div>';
    h += '<div><h3>' + esc(t('ap.history')) + '</h3><div class="hist" style="margin-top:8px">' + hist.map(function (x) {
      return '<div><span class="ts">' + esc(fmtTs(x.ts)) + '</span><span><b>' + esc(Core.userName(state, x.user)) + '</b> ' + esc(t('act.' + x.action)) + (x.note ? ': ' + esc(x.note) : '') + '</span></div>';
    }).join('') + '</div></div></div>';
    return h;
  }
  function renderDrawer() {
    var dr = $('#drawer'), sc = $('#scrim');
    if (ui.copyDlg) {
      dr.innerHTML = '<div class="drawer-head"><div><h2>' + esc(ui.copyDlg.filename) + '</h2><p class="muted small">' + esc(t('ex.unavailable')) + '</p></div><button class="btn quiet" data-act="close-drawer">' + esc(t('btn.close')) + '</button></div><div class="drawer-body"><textarea id="copy-text" readonly style="min-height:280px;font-family:var(--f-mono);font-size:.8rem"></textarea><div class="row"><button class="btn primary" data-act="copy-text">' + esc(t('btn.copy')) + '</button></div></div>';
      $('#copy-text').value = ui.copyDlg.text;
      dr.hidden = false; sc.hidden = false; return;
    }
    var e = ui.drawerId ? Core.findEntry(state, ui.drawerId) : null;
    if (!e) { dr.hidden = true; sc.hidden = true; dr.innerHTML = ''; return; }
    dr.innerHTML = drawerHTML(e); dr.hidden = false; sc.hidden = false;
  }

  function remDueText(r, today) {
    var d = Core.diffDays(r.due, today), wd = WD[lang()][Core.parseISO(r.due).getUTCDay()];
    var rel = r.status === 'done' ? '' : d < 0 ? (d === -1 ? t('co.oneOver') : t('co.overdueBy', { n: -d })) : d === 0 ? t('co.today') : d === 1 ? t('co.oneDay') : t('co.inDays', { n: d });
    return t('co.dueOn', { date: Core.fmtDate(r.due) + ' ' + wd }) + (rel ? ' · ' + rel : '');
  }
  function payResultsHTML() {
    var res = Core.calcPayroll(ui.payRows.map(function (r) { return { name: r.name, wage: num(r.wage), pcb: num(r.pcb) }; }), state.settings.rates), T = res.totals;
    function r2(x) { return '<td class="r num">' + Core.fmtNumber(x) + '</td>'; }
    return '<div class="scroll"><table><thead><tr><th>' + esc(t('co.name')) + '</th><th class="r">' + esc(t('co.epfEr')) + '</th><th class="r">' + esc(t('co.epfEe')) + '</th><th class="r">' + esc(t('co.socso')) + '</th><th class="r">' + esc(t('co.eis')) + '</th><th class="r">PCB</th></tr></thead><tbody>' +
      res.rows.map(function (x) { return '<tr><td>' + esc(x.name || '—') + '</td>' + r2(x.epfEr) + r2(x.epfEe) + r2(Core.round2(x.socsoEr + x.socsoEe)) + r2(Core.round2(x.eisEr + x.eisEe)) + r2(x.pcb) + '</tr>'; }).join('') +
      '<tr class="tot"><td>' + esc(t('co.totals')) + '</td>' + r2(T.epfEr) + r2(T.epfEe) + r2(Core.round2(T.socsoEr + T.socsoEe)) + r2(Core.round2(T.eisEr + T.eisEe)) + r2(T.pcb) + '</tr></tbody></table></div>';
  }
  function remItemHTML(r, today) {
    var st = Core.reminderStatus(r, today);
    var s = '<div class="rem"><div><div class="t">' + esc(r.title) + '</div><div class="d">' + esc(remDueText(r, today)) + '</div></div><div>' + '<span class="chip st-' + st + '">' + esc(t('st.' + st)) + '</span></div>';
    if (r.status === 'done') s += '<div class="act muted small">' + esc(t('co.refAmt', { ref: r.refNo || '—', amt: money(r.amount) })) + '</div>';
    else if (ui.remDoneId === r.id) s += '<div class="act"><div class="done-form"><input id="rd-ref" type="text" placeholder="' + esc(t('co.refNo')) + '"><input id="rd-amt" type="number" step="0.01" min="0" placeholder="' + esc(t('co.amount')) + '"><span class="row"><button class="btn sm primary" data-act="rem-done-save" data-id="' + esc(r.id) + '">' + esc(t('btn.save')) + '</button><button class="btn sm" data-act="rem-done-cancel">' + esc(t('btn.cancel')) + '</button></span></div></div>';
    else s += '<div class="act"><button class="btn sm" data-act="rem-done-open" data-id="' + esc(r.id) + '">' + esc(t('btn.markDone')) + '</button><button class="btn sm" data-act="rem-pay" data-id="' + esc(r.id) + '">' + esc(t('btn.createPay')) + '</button></div>';
    return s + '</div>';
  }
  function vCompliance() {
    var today = Core.todayLocal(), f = ui.remFilter, u = me();
    var list = state.reminders.filter(function (r) { return f === 'all' || (f === 'done' ? r.status === 'done' : r.status !== 'done'); }).sort(function (a, b) { return f === 'done' ? (a.due < b.due ? 1 : -1) : (a.due < b.due ? -1 : 1); });
    var h = '<div class="page-head"><h1>' + esc(t('co.title')) + '</h1><div class="seg tabs2">' +
      [['open', 'co.open'], ['done', 'co.done'], ['all', 'co.all']].map(function (x) { return '<button data-act="rem-filter" data-v="' + x[0] + '" aria-pressed="' + (f === x[0]) + '">' + esc(t(x[1])) + '</button>'; }).join('') + '</div></div><div class="stack">';
    h += '<p class="note small">' + esc(t('co.demo')) + '</p><div class="grid2"><div class="card">' + (list.length ? list.map(function (r) { return remItemHTML(r, today); }).join('') : '<p class="empty">' + esc(t('co.empty')) + '</p>') + '</div>';
    h += '<div class="stack"><div class="card stack"><h3>' + esc(t('co.addTitle')) + '</h3><div><span class="lbl">' + esc(t('co.templates')) + '</span><div class="chips" style="margin-top:6px">' +
      [['co.tpl.formc'], ['co.tpl.cp204'], ['co.tpl.stamp'], ['co.tpl.ssm']].map(function (x) { return '<button data-act="rem-tpl" data-k="' + x[0] + '">' + esc(t(x[0])) + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="rem-title">' + esc(t('co.custom')) + '</label><input id="rem-title" type="text" value="' + esc(ui.remTitle) + '"></div><div class="field"><label for="rem-date">' + esc(t('co.date')) + '</label><input id="rem-date" type="date"></div>' +
      '<div><button class="btn primary" data-act="rem-add">' + esc(t('btn.add')) + '</button></div></div>';
    h += '<div class="card stack"><h3>' + esc(t('co.gen')) + '</h3><p class="muted small">' + esc(t('co.genNote')) + '</p><div class="field"><label for="gen-period">' + esc(t('co.wage')) + '</label><input id="gen-period" type="month" data-ui="genPeriod" value="' + esc(ui.genPeriod) + '"></div><div><button class="btn" data-act="rem-gen">' + esc(t('btn.generate')) + '</button></div></div></div></div>';
    h += '<div class="card stack"><h3>' + esc(t('co.payroll')) + '</h3><p class="note warn small">' + esc(t('co.payNote')) + '</p><div class="field" style="max-width:14rem"><label for="pay-period">' + esc(t('co.wage')) + '</label><input id="pay-period" type="month" data-ui="payPeriod" value="' + esc(ui.payPeriod) + '"></div>' +
      '<div class="scroll"><table><thead><tr><th>' + esc(t('co.name')) + '</th><th class="r">' + esc(t('co.grossWage')) + '</th><th class="r">' + esc(t('co.pcb')) + '</th><th></th></tr></thead><tbody>' +
      ui.payRows.map(function (r, i) { return '<tr><td><input class="pay-in" data-i="' + i + '" data-k="name" type="text" value="' + esc(r.name) + '" aria-label="' + esc(t('co.name')) + '"></td><td><input class="pay-in" data-i="' + i + '" data-k="wage" type="number" step="0.01" min="0" value="' + esc(r.wage) + '" style="text-align:right" aria-label="' + esc(t('co.grossWage')) + '"></td><td><input class="pay-in" data-i="' + i + '" data-k="pcb" type="number" step="0.01" min="0" value="' + esc(r.pcb) + '" style="text-align:right" aria-label="' + esc(t('co.pcb')) + '"></td><td><button class="btn sm quiet" data-act="pay-rm" data-i="' + i + '">' + esc(t('btn.remove')) + '</button></td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="row"><button class="btn sm" data-act="pay-add">' + esc(t('co.addRow')) + '</button></div><div id="pay-results">' + payResultsHTML() + '</div><div><button class="btn primary" data-act="pay-entries">' + esc(t('btn.payEntries')) + '</button></div></div></div>';
    return h;
  }

  /* ---------- calendar ---------- */
  function calLocale() { return lang() === 'ms' ? 'ms-MY' : 'en-GB'; }
  function calFmt(iso, o) {
    try { return new Intl.DateTimeFormat(calLocale(), Object.assign({ timeZone: 'UTC' }, o)).format(Core.parseISO(iso)); } catch (e) { return Core.fmtDate(iso); }
  }
  var LONG_DATE = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  function calRange() {
    var c = ui.cal, ws = state.settings.weekStart;
    if (c.view === 'week') { var d = Core.weekDays(c.sel, ws); return { from: d[0], to: d[6], days: d }; }
    if (c.view === 'agenda') return Core.monthBounds(c.sel.slice(0, 7));
    var g = Core.monthGrid(c.sel.slice(0, 7), ws);
    return { from: g[0][0].date, to: g[g.length - 1][6].date, grid: g };
  }
  function calData() {
    var r = calRange(), today = Core.todayLocal(), counts = {}, by = {};
    var all = Core.calendarEvents(state, today, { from: r.from, to: r.to, ledger: ui.cal.ledger });
    Core.CAL_LAYERS.forEach(function (l) { counts[l] = 0; });
    all.forEach(function (e) { counts[e.layer]++; if (ui.cal.layers[e.layer]) (by[e.date] = by[e.date] || []).push(e); });
    return { range: r, today: today, counts: counts, by: by };
  }
  function calEvText(ev, full) {
    if (ev.layer === 'deadlines') return full ? ev.title : ev.short;
    if (ev.layer === 'documents') return ev.title || t('src.' + ev.source);
    if (ev.layer === 'approvals') return t('cal.pillApproved', { id: ev.entryId });
    return ev.title;
  }
  function calEvClass(ev) {
    var c = 'ev ev-' + ev.layer;
    if (ev.layer === 'deadlines') c += ' s-' + ev.status; else if (ev.layer === 'documents' || ev.layer === 'approvals') c += ' l-' + ev.ledger;
    return c;
  }
  function calStep(dir) { var c = ui.cal; c.sel = c.view === 'week' ? Core.addDays(c.sel, 7 * dir) : Core.shiftMonth(c.sel, dir); }
  function calSetMonth(ym) {
    var b = Core.monthBounds(ym); ui.cal.sel = ym + '-' + pad(Math.min(+ui.cal.sel.slice(8), +b.to.slice(8)));
  }
  function calFocusOf(el) {
    var s = '[data-act="' + el.getAttribute('data-act') + '"]';
    ['data-v', 'data-date'].forEach(function (a) { var v = el.getAttribute(a); if (v !== null) s += '[' + a + '="' + v + '"]'; });
    ui.cal.focus = s;
  }
  function calKpisHTML(today) {
    var c = ui.cal, s = Core.calendarSummary(state, today, c.sel.slice(0, 7)), m = calFmt(c.sel, { month: 'long' });
    function tile(cls, label, n, sub, date) {
      var inner = '<span class="kpi-l">' + esc(label) + '</span><span class="kpi-n">' + esc(n) + '</span><span class="kpi-s">' + esc(sub) + '</span>';
      return date ? '<button type="button" class="kpi ' + cls + '" data-act="cal-jump" data-date="' + esc(date) + '">' + inner + '</button>' : '<div class="kpi ' + cls + '">' + inner + '</div>';
    }
    return '<div class="kpis k4">' +
      tile(s.overdue ? 'bad' : '', t('cal.kOverdue'), s.overdue, s.overdue ? t('cal.kOverdueSub') : t('cal.kNone'), s.overdueFirst) +
      tile(s.next7 ? 'warn' : '', t('cal.kSoon'), s.next7, s.next7 ? t('cal.kSoonSub') : t('cal.kNone'), s.next7First) +
      tile('', t('cal.kMonth', { month: m }), s.monthOpen + s.monthDone, t('cal.kMonthSub', { open: s.monthOpen, done: s.monthDone }), '') +
      tile('', t('cal.kApproved', { month: m }), s.approvedCount, t('cal.kApprovedSub', { amt: money(s.approvedTotal) }), '') + '</div>';
  }
  function calToolbarHTML(d) {
    var c = ui.cal, ws = state.settings.weekStart;
    var title = c.view === 'week' ? t('cal.weekOf', { date: calFmt(d.range.days[0], { day: 'numeric', month: 'short', year: 'numeric' }) }) : calFmt(c.sel, { month: 'long', year: 'numeric' });
    var h = '<div class="cal-bar"><div class="row cal-nav"><button type="button" class="btn icon" data-act="cal-prev" aria-label="' + esc(t('cal.prev')) + '">' + icon('left') + '</button>' +
      '<button type="button" class="btn icon" data-act="cal-next" aria-label="' + esc(t('cal.next')) + '">' + icon('right') + '</button>' +
      '<h2 class="cal-title">' + esc(title) + '</h2><button type="button" class="btn sm" data-act="cal-today">' + esc(t('cal.today')) + '</button></div>' +
      '<div class="row cal-tools"><input id="cal-month" class="cal-month" type="month" value="' + esc(c.sel.slice(0, 7)) + '" aria-label="' + esc(t('cal.jump')) + '">' +
      '<div class="seg tabs2" role="group" aria-label="' + esc(t('cal.view')) + '">' + [['month', 'cal.month'], ['week', 'cal.week'], ['agenda', 'cal.agenda']].map(function (x) {
        return '<button type="button" data-act="cal-view" data-v="' + x[0] + '" aria-pressed="' + (c.view === x[0]) + '">' + esc(t(x[1])) + '</button>';
      }).join('') + '</div></div></div>';
    h += '<div class="cal-filters"><div class="row cal-layers" role="group" aria-label="' + esc(t('cal.layers')) + '">' + Core.CAL_LAYERS.map(function (l) {
      return '<button type="button" class="cal-layer" data-act="cal-layer" data-v="' + l + '" aria-pressed="' + !!c.layers[l] + '"><span class="sw sw-' + l + '"></span>' + esc(t('cal.l.' + l)) + ' <b>' + d.counts[l] + '</b></button>';
    }).join('') + '</div><div class="seg tabs2" role="group" aria-label="' + esc(t('cal.ledger')) + '">' + CAL_LEDGERS.map(function (l) {
      return '<button type="button" data-act="cal-ledger" data-v="' + l + '" aria-pressed="' + (c.ledger === l) + '">' + esc(l === 'all' ? t('cal.all') : t('ledger.' + l)) + '</button>';
    }).join('') + '</div><button type="button" class="btn sm" data-act="cal-ics" title="' + esc(t('cal.icsNote')) + '">' + icon('dl') + esc(t('cal.ics')) + '</button></div>';
    return h;
  }
  function calWeekdayNames(ws) {
    return Core.weekDays('2026-10-05', ws).map(function (iso) { return { name: calFmt(iso, { weekday: 'short' }), we: [0, 6].indexOf(Core.parseISO(iso).getUTCDay()) >= 0 }; });
  }
  function calCellHTML(cell, evs, today) {
    var c = ui.cal, sel = c.sel === cell.date, over = evs.filter(function (e) { return e.layer === 'deadlines' && e.status === 'overdue'; }).length;
    var dl = calFmt(cell.date, LONG_DATE);
    var label = !evs.length ? t('cal.cellNone', { date: dl }) : over ? t('cal.cellOver', { date: dl, n: evs.length, o: over }) : evs.length === 1 ? t('cal.cellOne', { date: dl }) : t('cal.cell', { date: dl, n: evs.length });
    var pills = evs.slice(0, 3).map(function (e) { return '<span class="cal-pill ' + calEvClass(e) + '">' + esc(calEvText(e)) + '</span>'; }).join('') + (evs.length > 3 ? '<span class="cal-more">' + esc(t('cal.more', { n: evs.length - 3 })) + '</span>' : '');
    var dots = evs.slice(0, 6).map(function (e) { return '<span class="cal-dot ' + calEvClass(e) + '"></span>'; }).join('');
    var we = cell.dow === 0 || cell.dow === 6;
    return '<div role="gridcell" class="cal-cell' + (cell.inMonth ? '' : ' out') + (we ? ' we' : '') + (sel ? ' sel' : '') + '" aria-selected="' + sel + '">' +
      '<button type="button" class="cal-day" data-act="cal-sel" data-date="' + cell.date + '" tabindex="' + (sel ? 0 : -1) + '" aria-label="' + esc(label) + '"' + (cell.date === today ? ' aria-current="date"' : '') + '>' +
      '<span class="dn' + (cell.date === today ? ' today' : '') + '">' + (+cell.date.slice(8)) + '</span><span class="cal-pills" aria-hidden="true">' + pills + '</span><span class="cal-dots" aria-hidden="true">' + dots + '</span></button></div>';
  }
  function calMonthHTML(d) {
    var names = calWeekdayNames(state.settings.weekStart);
    return '<div class="cal-grid" role="grid" aria-label="' + esc(calFmt(ui.cal.sel, { month: 'long', year: 'numeric' })) + '"><div class="cal-row cal-head" role="row">' +
      names.map(function (n) { return '<div role="columnheader" class="cal-wd' + (n.we ? ' we' : '') + '">' + esc(n.name) + '</div>'; }).join('') + '</div>' +
      d.range.grid.map(function (row) { return '<div class="cal-row" role="row">' + row.map(function (cell) { return calCellHTML(cell, d.by[cell.date] || [], d.today); }).join('') + '</div>'; }).join('') + '</div>';
  }
  function calCardHTML(ev) {
    var sub, id = ev.reminderId || ev.entryId || ev.batchId;
    if (ev.layer === 'deadlines') sub = t('st.' + ev.status);
    else if (ev.layer === 'documents') sub = t('type.' + ev.kind) + ' · ' + t('st.' + ev.status);
    else if (ev.layer === 'approvals') sub = Core.userName(state, ev.by);
    else sub = t('cal.batchLine', { n: ev.count, amt: money(ev.amount), name: Core.userName(state, ev.by) });
    var amt = ev.layer === 'documents' || ev.layer === 'approvals' ? ' <span class="num">' + esc(money(ev.amount)) + '</span>' : '';
    return '<button type="button" class="cev ' + calEvClass(ev) + '" data-act="cal-open" data-layer="' + ev.layer + '" data-id="' + esc(id) + '" data-date="' + ev.date + '"><span class="cev-t">' + esc(calEvText(ev, true)) + '</span><span class="cev-s">' + esc(sub) + amt + '</span></button>';
  }
  function calWeekHTML(d) {
    var ws = state.settings.weekStart;
    return '<div class="cal-week">' + d.range.days.map(function (day) {
      var evs = d.by[day] || [], dow = Core.parseISO(day).getUTCDay(), sel = ui.cal.sel === day;
      return '<section class="wk-col' + (dow === 0 || dow === 6 ? ' we' : '') + (sel ? ' sel' : '') + '" aria-label="' + esc(calFmt(day, LONG_DATE)) + '">' +
        '<button type="button" class="wk-head" data-act="cal-sel" data-date="' + day + '" aria-pressed="' + sel + '"' + (day === d.today ? ' aria-current="date"' : '') + '><span>' + esc(calFmt(day, { weekday: 'short' })) + '</span><span class="dn' + (day === d.today ? ' today' : '') + '">' + (+day.slice(8)) + '</span><span class="wk-mon">' + esc(calFmt(day, { month: 'short' })) + '</span></button>' +
        '<div class="wk-evs">' + (evs.length ? evs.map(calCardHTML).join('') : '<p class="wk-none muted small">&mdash;</p>') + '</div></section>';
    }).join('') + '</div>';
  }
  function calAgendaHTML(d) {
    var days = Object.keys(d.by).sort();
    if (!days.length) return '<p class="empty">' + esc(t('cal.agendaEmpty', { month: calFmt(ui.cal.sel, { month: 'long', year: 'numeric' }) })) + '</p>';
    return '<div class="cal-agenda">' + days.map(function (day) {
      return '<section class="ag-day' + (day === ui.cal.sel ? ' sel' : '') + '"><h4><button type="button" class="ag-h" data-act="cal-sel" data-date="' + day + '">' + esc(calFmt(day, LONG_DATE)) + '</button>' + (day === d.today ? ' <span class="chip st-soon">' + esc(t('cal.relToday')) + '</span>' : '') + '</h4>' + d.by[day].map(calCardHTML).join('') + '</section>';
    }).join('') + '</div>';
  }
  function calAddHTML() {
    var c = ui.cal;
    if (!c.add) return '<div><button type="button" class="btn sm" data-act="cal-add-toggle" aria-expanded="false">' + esc(t('cal.addReminder')) + '</button></div>';
    return '<div class="card flat stack"><div class="field"><label for="cal-title">' + esc(t('cal.reminderTitle')) + '</label><input id="cal-title" type="text" value="' + esc(c.addTitle) + '"></div>' +
      '<div class="chips">' + ['co.tpl.formc', 'co.tpl.cp204', 'co.tpl.stamp', 'co.tpl.ssm'].map(function (k) { return '<button type="button" data-act="cal-tpl" data-k="' + k + '">' + esc(t(k)) + '</button>'; }).join('') + '</div>' +
      '<div class="field"><label for="cal-date">' + esc(t('co.date')) + '</label><input id="cal-date" type="date" value="' + esc(c.sel) + '"></div>' +
      '<div class="row"><button type="button" class="btn primary sm" data-act="cal-add">' + esc(t('btn.add')) + '</button><button type="button" class="btn sm" data-act="cal-add-toggle" aria-expanded="true">' + esc(t('btn.cancel')) + '</button></div></div>';
  }
  function calPanelHTML(d) {
    var c = ui.cal, evs = d.by[c.sel] || [], rel = Core.diffDays(c.sel, d.today);
    var relTxt = rel === 0 ? t('cal.relToday') : rel === 1 ? t('cal.relTomorrow') : rel === -1 ? t('cal.relYesterday') : rel > 0 ? t('cal.relIn', { n: rel }) : t('cal.relAgo', { n: -rel });
    var h = '<div><h2 class="cal-ph">' + esc(calFmt(c.sel, LONG_DATE)) + '</h2><p class="muted small">' + esc(relTxt) + ' · ' + esc(evs.length === 1 ? t('cal.itemOne') : t('cal.items', { n: evs.length })) + '</p></div>';
    h += calAddHTML();
    if (!evs.length) return h + '<p class="empty">' + esc(t('cal.none')) + '</p>';
    Core.CAL_LAYERS.forEach(function (l) {
      var list = evs.filter(function (e) { return e.layer === l; });
      if (!list.length) return;
      h += '<section class="cal-sec"><h3>' + esc(t('cal.l.' + l)) + ' <span class="muted">' + list.length + '</span></h3>';
      if (l === 'deadlines') {
        h += list.map(function (ev) { var r = state.reminders.filter(function (x) { return x.id === ev.reminderId; })[0]; return r ? remItemHTML(r, d.today) : ''; }).join('');
      } else if (l === 'documents') {
        h += '<div class="list">' + list.map(function (ev) { var e = Core.findEntry(state, ev.entryId); return e ? erow(e) : ''; }).join('') + '</div>';
      } else if (l === 'approvals') {
        h += '<div class="list">' + list.map(function (ev) {
          return '<div class="erow" tabindex="0" role="button" data-act="open-drawer" data-id="' + esc(ev.entryId) + '"><div class="er-main"><span class="er-id">' + esc(ev.entryId) + '</span><span class="er-payee">' + esc(calEvText({ layer: 'documents', title: ev.title, source: ev.source })) + '</span><span class="er-desc">' +
            esc(t('cal.approvedBy', { name: Core.userName(state, ev.by), time: fmtTs(ev.at).slice(11) })) + '</span></div><div class="er-tags">' + ltag(ev.ledger) + chip(ev.status) + '</div><div class="er-amt"><span class="num">' + esc(money(ev.amount)) + '</span></div></div>';
        }).join('') + '</div>';
      } else {
        h += '<div class="list">' + list.map(function (ev) {
          return '<div class="erow" tabindex="0" role="button" data-act="go" data-tab="export"><div class="er-main"><span class="er-id">' + esc(ev.batchId) + '</span><span class="er-payee">' + esc(t('cal.openExport')) + '</span><span class="er-desc">' +
            esc(t('cal.batchLine', { n: ev.count, amt: money(ev.amount), name: Core.userName(state, ev.by) })) + '</span></div><div class="er-tags">' + chip('exported') + '</div><div class="er-amt"><span class="num">' + esc(money(ev.amount)) + '</span></div></div>';
        }).join('') + '</div>';
      }
      h += '</section>';
    });
    return h;
  }
  function vCalendar() {
    var d = calData(), c = ui.cal;
    return '<div class="page-head"><h1>' + esc(t('cal.title')) + '</h1></div><div class="stack">' + calKpisHTML(d.today) +
      '<div class="cal-layout' + (c.view === 'week' ? ' wide' : '') + '"><div class="card cal-card">' + calToolbarHTML(d) + (c.view === 'month' ? calMonthHTML(d) : c.view === 'week' ? calWeekHTML(d) : calAgendaHTML(d)) +
      '<p class="muted small">' + esc(t('cal.hint')) + '</p></div><aside class="card cal-panel stack" aria-label="' + esc(calFmt(c.sel, LONG_DATE)) + '">' + calPanelHTML(d) + '</aside></div></div>';
  }

  function foxProblems() { return Core.validateFoxMap(state.settings.export.map); }
  function vExport() {
    var u = me(), cfg = state.settings.export, ctx = Core.ctxFor(state);
    var ready = state.entries.filter(function (e) { return e.status === 'approved' && !e.exportBatchId; }).sort(function (a, b) { return a.approvedAt < b.approvedAt ? 1 : -1; });
    var selIds = ready.filter(function (e) { return ui.exportSel[e.id]; }), probs = foxProblems();
    var total = selIds.reduce(function (s, e) { return s + e.totalAmount; }, 0);
    var h = '<div class="page-head"><h1>' + esc(t('ex.title')) + '</h1></div><div class="stack"><div class="card stack"><h3>' + esc(t('ex.ready')) + ' (' + ready.length + ')</h3>';
    if (!ready.length) h += '<p class="empty">' + esc(t('ex.none')) + '</p>';
    else {
      h += '<div class="row"><label class="row small"><input type="checkbox" data-act="sel-all"' + (selIds.length === ready.length ? ' checked' : '') + '> ' + esc(t('ex.selectAll')) + '</label><span class="muted small">' + esc(t('ex.selected', { n: selIds.length, total: money(total) })) + '</span></div>' +
        '<div class="list">' + ready.map(function (e) { return erow(e, { check: true, checked: !!ui.exportSel[e.id] }); }).join('') + '</div>';
      if (!Core.isApprover(u)) h += '<p class="note">' + esc(t('ex.approverOnly')) + '</p>';
      h += '<div><button class="btn primary" data-act="create-batch"' + (selIds.length && Core.isApprover(u) ? '' : ' disabled') + '>' + esc(t('btn.createBatch')) + '</button></div>';
      var prev = (selIds.length ? selIds : ready).slice(0, 6), tb = Core.buildTable(prev, ui.exportLayout, cfg, ctx);
      h += '<div class="row" style="justify-content:space-between"><h3>' + esc(t('ex.preview')) + '</h3><div class="seg tabs2"><button data-act="ex-layout" data-v="fox" aria-pressed="' + (ui.exportLayout === 'fox') + '">' + esc(t('ex.fox')) + '</button><button data-act="ex-layout" data-v="generic" aria-pressed="' + (ui.exportLayout === 'generic') + '">' + esc(t('ex.generic')) + '</button></div></div>';
      if (ui.exportLayout === 'fox' && probs.length) h += '<p class="note bad small">' + esc(t('ex.fixLayout')) + '</p>';
      h += '<div class="scroll"><table><thead><tr>' + tb.header.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        tb.rows.map(function (r) { return '<tr>' + r.map(function (v) { return '<td class="' + (typeof v === 'number' ? 'r num' : '') + '">' + esc(typeof v === 'number' ? Core.fmtNumber(v, ui.exportLayout === 'fox' ? cfg.decimal : '.') : v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    }
    h += '</div><div class="card stack"><h3>' + esc(t('ex.batches')) + ' (' + state.batches.length + ')</h3>';
    if (!state.batches.length) h += '<p class="empty">' + esc(t('ex.noBatches')) + '</p>';
    else {
      h += state.batches.slice().reverse().map(function (b) {
        return '<div class="stack" style="border-top:1px solid var(--line);padding-top:12px"><div class="row" style="justify-content:space-between"><div><strong class="mono">' + esc(b.id) + '</strong><div class="muted small">' + esc(fmtTs(b.createdAt)) + ' · ' + esc(Core.userName(state, b.createdBy)) + ' · ' + esc(t('ex.entries', { n: b.count })) + ' · ' + esc(money(b.total)) + '</div></div></div>' +
          '<div class="row">' + ['xlsx', 'csv', 'fox', 'json'].map(function (f) { return '<button class="btn sm" data-act="dl" data-fmt="' + f + '" data-id="' + esc(b.id) + '">' + esc(t('ex.dl.' + f)) + '</button>'; }).join('') + '</div></div>';
      }).join('') + '<p class="muted small">' + esc(t('ex.layoutNote')) + '</p>';
    }
    return h + '</div></div>';
  }

  function vAudit() {
    var F = ui.auditF, q = F.q.toLowerCase();
    var all = state.audit.slice().sort(function (a, b) { return a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : (a.id < b.id ? 1 : -1); });
    var rows = all.filter(function (ev) { return (!F.user || ev.user === F.user) && (!F.action || ev.action === F.action) && (!q || (ev.entryId + ' ' + ev.note + ' ' + detailOf(ev)).toLowerCase().indexOf(q) >= 0); });
    var shown = rows.slice(0, 200);
    var acts = ['create', 'edit', 'submit', 'approve', 'reject', 'return', 'reopen', 'export', 'settings', 'reminder'];
    var h = '<div class="page-head"><h1>' + esc(t('au.title')) + '</h1><button class="btn" data-act="audit-csv">' + esc(t('au.csv')) + '</button></div><div class="stack"><div class="card stack"><div class="row">' +
      '<select data-audit="user" style="width:auto" aria-label="' + esc(t('au.user')) + '"><option value="">' + esc(t('au.user')) + ': ' + esc(t('au.all')) + '</option>' + state.users.map(function (x) { return '<option value="' + esc(x.id) + '"' + (F.user === x.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select>' +
      '<select data-audit="action" style="width:auto" aria-label="' + esc(t('au.action')) + '"><option value="">' + esc(t('au.action')) + ': ' + esc(t('au.all')) + '</option>' + acts.map(function (x) { return '<option value="' + x + '"' + (F.action === x ? ' selected' : '') + '>' + esc(t('act.' + x)) + '</option>'; }).join('') + '</select>' +
      '<input id="audit-q" data-audit="q" type="search" style="flex:1 1 14rem;width:auto" placeholder="' + esc(t('au.search')) + '" value="' + esc(F.q) + '"></div>' +
      '<div class="scroll"><table><thead><tr><th>' + esc(t('au.time')) + '</th><th>' + esc(t('au.user')) + '</th><th>' + esc(t('au.action')) + '</th><th>' + esc(t('au.entry')) + '</th><th>' + esc(t('au.detail')) + '</th></tr></thead><tbody id="audit-body">' + auditRows(shown) + '</tbody></table></div><p class="muted small" id="audit-count">' + esc(t('au.showing', { n: shown.length, m: rows.length })) + '</p></div></div>';
    return h;
  }
  function auditRows(list) {
    if (!list.length) return '<tr><td colspan="5" class="empty">' + esc(t('au.empty')) + '</td></tr>';
    return list.map(function (ev) { return '<tr><td class="mono" style="white-space:nowrap">' + esc(fmtTs(ev.ts)) + '</td><td>' + esc(Core.userName(state, ev.user)) + '</td><td>' + esc(t('act.' + ev.action)) + '</td><td class="mono">' + esc(ev.entryId) + '</td><td class="small" style="overflow-wrap:anywhere;min-width:14rem">' + esc(detailOf(ev)) + '</td></tr>'; }).join('');
  }

  function numField(label, path, step) {
    return '<div class="field"><label>' + esc(label) + '<input type="number" step="' + (step || '0.01') + '" min="0" data-set="' + path + '" data-type="num" value="' + esc(getPath(state.settings, path)) + '"></label></div>';
  }
  function vSetup() {
    var s = state.settings, cfg = s.export, probs = foxProblems(), res = ui.selftest;
    var delimKey = Object.keys(DELIMS).filter(function (k) { return DELIMS[k] === cfg.delimiter; })[0] || 'comma';
    var h = '<div class="page-head"><h1>' + esc(t('se.title')) + '</h1></div><div class="stack">';
    h += '<div class="grid2 even"><div class="card stack"><h3>' + esc(t('se.lang')) + '</h3><div class="seg"><label><input type="radio" name="lang" data-lang="en"' + (lang() === 'en' ? ' checked' : '') + '><span>English</span></label><label><input type="radio" name="lang" data-lang="ms"' + (lang() === 'ms' ? ' checked' : '') + '><span>Bahasa Malaysia</span></label></div>' +
      '<p class="muted small">' + esc(storageOk ? t('se.storage.ok') : t('se.storage.mem')) + '</p></div>';
    h += '<div class="card stack"><h3>' + esc(t('se.users')) + '</h3>' + state.users.map(function (x, i) {
      return '<div class="row"><input type="text" data-user="' + i + '" data-uk="name" value="' + esc(x.name) + '" aria-label="' + esc(t('se.userName')) + '" style="flex:1 1 9rem;width:auto"><select data-user="' + i + '" data-uk="role" style="width:auto" aria-label="' + esc(t('se.userRole')) + '">' + opts(['clerk', 'approver'], x.role, function (r) { return t('role.' + r); }) + '</select></div>';
    }).join('') + '<div class="row"><input id="new-user" type="text" placeholder="' + esc(t('se.userName')) + '" style="flex:1 1 9rem;width:auto"><button class="btn sm" data-act="user-add">' + esc(t('se.addUser')) + '</button></div></div></div>';
    h += '<div class="grid2 even"><div class="card stack"><h3>' + esc(t('se.dues')) + '</h3><div class="fields">' + ['EPF', 'SOCSO', 'EIS', 'PCB'].map(function (k) { return '<div class="field"><label>' + esc(k + ' · ' + t('se.dueDay')) + '<input type="number" min="1" max="31" step="1" data-set="dueDays.' + k + '" data-type="int" value="' + esc(s.dueDays[k]) + '"></label></div>'; }).join('') + '</div>' +
      '<div class="field"><label>' + esc(t('se.roll')) + '<select data-set="rollRule">' + opts(['next', 'prev', 'none'], s.rollRule, function (x) { return t('se.roll.' + x); }) + '</select></label></div>' +
      '<div class="field"><label>' + esc(t('se.weekStart')) + '<select data-set="weekStart" data-type="wk">' + opts(['1', '0'], String(s.weekStart), function (x) { return t('se.wk.' + x); }) + '</select></label></div></div>';
    h += '<div class="card stack"><h3>' + esc(t('se.rates')) + '</h3><p class="note warn small">' + esc(t('se.verify')) + '</p><div class="fields">' +
      numField(t('se.epfLow'), 'rates.epfEmployerLow') + numField(t('se.epfHigh'), 'rates.epfEmployerHigh') + numField(t('se.epfThr'), 'rates.epfThreshold') + numField(t('se.epfEe'), 'rates.epfEmployee') +
      numField(t('se.socsoEr'), 'rates.socsoEmployer') + numField(t('se.socsoEe'), 'rates.socsoEmployee') + numField(t('se.socsoCap'), 'rates.socsoCeiling') +
      numField(t('se.eisEr'), 'rates.eisEmployer') + numField(t('se.eisEe'), 'rates.eisEmployee') + numField(t('se.eisCap'), 'rates.eisCeiling') + '</div>' +
      '<label class="row small"><input type="checkbox" data-set="rates.epfRoundUp" data-type="bool"' + (s.rates.epfRoundUp ? ' checked' : '') + '> ' + esc(t('se.epfRound')) + '</label></div></div>';
    h += '<div class="card stack"><h3>' + esc(t('se.export')) + '</h3><div class="fields">' +
      '<div class="field"><label>' + esc(t('se.dateFmt')) + '<select data-set="export.dateFmt">' + opts(['YYYYMMDD', 'DD/MM/YYYY', 'YYYY-MM-DD'], cfg.dateFmt) + '</select></label></div>' +
      '<div class="field"><label>' + esc(t('se.delim')) + '<select data-set="export.delimiter" data-type="delim">' + opts(Object.keys(DELIMS), delimKey, function (k) { return t('se.delim.' + k); }) + '</select></label></div>' +
      '<div class="field"><label>' + esc(t('se.decimal')) + '<select data-set="export.decimal"><option value="."' + (cfg.decimal === '.' ? ' selected' : '') + '>' + esc(t('se.dec.dot')) + '</option><option value=","' + (cfg.decimal === ',' ? ' selected' : '') + '>' + esc(t('se.dec.comma')) + '</option></select></label></div></div>' +
      '<label class="row small"><input type="checkbox" data-set="export.header" data-type="bool"' + (cfg.header ? ' checked' : '') + '> ' + esc(t('se.header')) + '</label>' +
      '<label class="row small"><input type="checkbox" data-set="export.foxBom" data-type="bool"' + (cfg.foxBom ? ' checked' : '') + '> ' + esc(t('se.bom')) + '</label>' +
      '<label class="row small"><input type="checkbox" data-set="export.foxUpper" data-type="bool"' + (cfg.foxUpper ? ' checked' : '') + '> ' + esc(t('se.upper')) + '</label>' +
      '<h3 style="margin-top:6px">' + esc(t('se.map')) + '</h3><p class="muted small">' + esc(t('se.mapNote')) + '</p><div class="scroll"><table><thead><tr><th>' + esc(t('se.mapOn')) + '</th><th>' + esc(t('se.mapName')) + '</th><th>' + esc(t('se.mapSrc')) + '</th><th></th></tr></thead><tbody>' +
      cfg.map.map(function (m, i) {
        var bad = probs.some(function (p) { return p.index === i; });
        return '<tr><td><input type="checkbox" data-map="' + i + '" data-mk="enabled"' + (m.enabled ? ' checked' : '') + ' aria-label="' + esc(t('se.mapOn')) + '"></td><td><input type="text" maxlength="24" data-map="' + i + '" data-mk="name" value="' + esc(m.name) + '" class="mono' + (bad ? ' invalid' : '') + '" style="min-width:8rem" aria-label="' + esc(t('se.mapName')) + '"></td><td><select data-map="' + i + '" data-mk="src" aria-label="' + esc(t('se.mapSrc')) + '">' + opts(Core.SRC_FIELDS, m.src) + '</select></td><td style="white-space:nowrap"><button class="btn sm quiet" data-act="map-up" data-i="' + i + '">' + esc(t('btn.up')) + '</button><button class="btn sm quiet" data-act="map-down" data-i="' + i + '">' + esc(t('btn.down')) + '</button><button class="btn sm quiet" data-act="map-rm" data-i="' + i + '">' + esc(t('btn.remove')) + '</button></td></tr>';
      }).join('') + '</tbody></table></div>' +
      (probs.length ? '<div class="note bad small">' + probs.map(function (p) { return esc((p.name || '(blank)') + ': ' + t('se.p.' + p.code)); }).join('<br>') + '</div>' : '<p class="note ok small">' + esc(t('se.mapOk')) + '</p>') +
      '<div class="row"><button class="btn sm" data-act="map-add">' + esc(t('se.mapAdd')) + '</button><button class="btn sm" data-act="map-reset">' + esc(t('se.mapReset')) + '</button></div></div>';
    h += '<div class="card stack"><h3>' + esc(t('se.tests')) + '</h3><p class="muted small">' + esc(t('se.testsNote')) + '</p><div><button class="btn primary" data-act="run-tests">' + esc(t('btn.runTests')) + '</button></div>';
    if (res) {
      var pass = res.filter(function (r) { return r.pass; }).length;
      h += '<p class="' + (pass === res.length ? 'pass' : 'fail') + '" id="test-summary">' + esc(t('se.testsSummary', { pass: pass, total: res.length })) + '</p><div class="scroll"><table><thead><tr><th></th><th>Rule</th><th>Check</th></tr></thead><tbody>' +
        res.map(function (r) { return '<tr><td class="' + (r.pass ? 'pass' : 'fail') + '">' + (r.pass ? 'PASS' : 'FAIL') + '</td><td class="mono">' + esc(r.group) + '</td><td>' + esc(r.name) + (r.detail ? '<div class="fail small">' + esc(r.detail) + '</div>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    h += '<h3 style="margin-top:8px">' + esc(t('se.manual')) + '</h3><ol class="small" style="margin:0;padding-left:1.2rem;display:flex;flex-direction:column;gap:4px">' + [1, 2, 3, 4, 5, 6, 7].map(function (n) { return '<li>' + esc(t('man.' + n)) + '</li>'; }).join('') + '</ol></div>';
    h += '<div class="card stack"><h3>' + esc(t('se.data')) + '</h3><p class="muted small">' + esc(t('se.dataNote')) + '</p><div class="row">' +
      (ui.confirmReset ? '<button class="btn danger" data-act="reset-confirm">' + esc(t('btn.confirmReset')) + '</button><button class="btn" data-act="reset-cancel">' + esc(t('btn.cancel')) + '</button>' : '<button class="btn danger" data-act="reset">' + esc(t('btn.reset')) + '</button>') + '</div></div></div>';
    return h;
  }

  var VIEWS = { dashboard: vDashboard, inbox: vInbox, entry: vEntry, approvals: vApprovals, calendar: vCalendar, compliance: vCompliance, export: vExport, audit: vAudit, setup: vSetup };

  /* ---------- chrome and render ---------- */
  function counts() {
    var today = Core.todayLocal(), s = Core.dashboardStats(state, today);
    return { inbox: s.inbox, approvals: s.submitted, compliance: s.overdue };
  }
  function renderChrome() {
    var u = me(), c = counts();
    document.documentElement.lang = lang() === 'ms' ? 'ms' : 'en';
    $('#brand-name').textContent = t('app.name'); $('#brand-sub').textContent = t('app.sub'); $('#who-label').textContent = t('who');
    var sel = $('#user-select'); sel.innerHTML = state.users.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.name) + '</option>'; }).join(''); sel.value = u.id;
    var rp = $('#role-pill'); rp.textContent = t('role.' + u.role); rp.className = 'role ' + u.role;
    $('#lang-btn').textContent = t('lang.btn');
    function badge(id) { return c[id] ? '<span class="badge' + (id === 'compliance' ? ' warn' : '') + '">' + c[id] + '</span>' : ''; }
    $('#tabs').innerHTML = TABS.map(function (x) { return '<button data-act="go" data-tab="' + x[0] + '"' + (ui.tab === x[0] ? ' aria-current="page"' : '') + '>' + icon(x[2]) + esc(t(x[1])) + badge(x[0]) + '</button>'; }).join('');
    var inMore = PRIMARY.indexOf(ui.tab) < 0;
    $('#bottom').innerHTML = TABS.filter(function (x) { return PRIMARY.indexOf(x[0]) >= 0; }).map(function (x) { return '<button data-act="go" data-tab="' + x[0] + '"' + (ui.tab === x[0] ? ' aria-current="page"' : '') + '>' + icon(x[2]) + '<span>' + esc(t(x[1])) + '</span>' + badge(x[0]) + '</button>'; }).join('') +
      '<button data-act="more"' + (inMore ? ' aria-current="page"' : '') + ' aria-expanded="' + ui.moreOpen + '">' + icon('more') + '<span>' + esc(t('nav.more')) + '</span></button>';
    var ms = $('#more-sheet'); ms.hidden = !ui.moreOpen;
    ms.innerHTML = TABS.filter(function (x) { return PRIMARY.indexOf(x[0]) < 0; }).map(function (x) { return '<button data-act="go" data-tab="' + x[0] + '">' + icon(x[2]) + esc(t(x[1])) + badge(x[0]) + '</button>'; }).join('');
  }
  function render() {
    renderChrome();
    var v = $('#view'), keepScroll = window.pageYOffset;
    v.innerHTML = VIEWS[ui.tab]();
    if (ui.tab === 'entry') refreshEntryHints();
    renderDrawer();
    window.scrollTo(0, keepScroll);
    if (ui.tab === 'calendar' && ui.cal.focus) { var f = $(ui.cal.focus); ui.cal.focus = ''; if (f && f.focus) f.focus({ preventScroll: true }); }
  }
  function setTab(tab) {
    ui.tab = tab; ui.moreOpen = false;
    try { location.hash = tab; } catch (e) { /* ignore */ }
    save(); render(); window.scrollTo(0, 0);
  }

  /* ---------- downloads ---------- */
  function getDl() {
    if (dlCap !== undefined) return Promise.resolve(dlCap);
    if (!(window.claude && window.claude.use)) { dlCap = null; return Promise.resolve(null); }
    return window.claude.use('downloads').then(function (d) { dlCap = d || null; return dlCap; }, function () { dlCap = null; return null; });
  }
  function deliver(name, data) {
    return getDl().then(function (dl) {
      if (dl) {
        return dl.save({ filename: name, data: data }).then(function () { toast(t('ex.saved', { name: name })); }, function (err) {
          var c = err && err.code;
          if (c === 'declined') { toast(t('ex.cancelled')); return; }
          if (c === 'rate_limited') { toast(t('ex.busy'), true); return; }
          fallbackSave(name, data);
        });
      }
      fallbackSave(name, data);
    });
  }
  function fallbackSave(name, data) {
    if (window.claude) {
      if (typeof data === 'string') { ui.copyDlg = { filename: name, text: data }; renderDrawer(); }
      toast(t('ex.unavailable'), true); return;
    }
    try {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' })); a.download = name;
      document.body.appendChild(a); a.click(); a.parentNode.removeChild(a); toast(t('ex.saved', { name: name }));
    } catch (e) { toast(t('ex.unavailable'), true); }
  }
  function buildXlsx(batch) {
    var cfg = state.settings.export, ctx = Core.ctxFor(state), X = window.XLSX;
    var g = Core.buildTable(batch.snapshot, 'generic', cfg, ctx), f = Core.buildTable(batch.snapshot, 'fox', cfg, ctx);
    var wb = X.utils.book_new(), w1 = X.utils.aoa_to_sheet([g.header].concat(g.rows)), w2 = X.utils.aoa_to_sheet([f.header].concat(f.rows));
    w1['!cols'] = g.header.map(function (h, i) { return { wch: [10, 12, 9, 10, 28, 16, 34, 20, 12, 10, 12, 8, 8, 14, 16, 16, 12, 14][i] || 12 }; });
    X.utils.book_append_sheet(wb, w1, 'Entries'); X.utils.book_append_sheet(wb, w2, 'FoxPro layout');
    return new Uint8Array(X.write(wb, { bookType: 'xlsx', type: 'array' }));
  }
  function download(fmt, batchId) {
    var batch = state.batches.filter(function (b) { return b.id === batchId; })[0];
    if (!batch) return;
    var cfg = state.settings.export, ctx = Core.ctxFor(state), tb;
    if (fmt === 'json') return deliver(batch.id + '.json', Core.buildJSON(state, batch));
    if (fmt === 'fox') {
      if (foxProblems().length) { toast(t('ex.fixLayout'), true); return; }
      tb = Core.buildTable(batch.snapshot, 'fox', cfg, ctx);
      return deliver(batch.id + '_foxpro.' + (cfg.delimiter === '\t' ? 'txt' : 'csv'), (cfg.foxBom ? '﻿' : '') + Core.toDelimited(tb, { delimiter: cfg.delimiter, decimal: cfg.decimal, header: cfg.header }));
    }
    if (fmt === 'xlsx' && window.XLSX) {
      try { return deliver(batch.id + '.xlsx', buildXlsx(batch)); } catch (e) { /* fall back to CSV */ }
    }
    if (fmt === 'xlsx') toast(t('ex.xlsxMissing'), true);
    tb = Core.buildTable(batch.snapshot, 'generic', cfg, ctx);
    return deliver(batch.id + '_generic.csv', '﻿' + Core.toDelimited(tb, { delimiter: ',', decimal: '.', header: true, neutralise: true }));
  }

  /* ---------- simulated extraction hook ---------- */
  /* Replace the body with a call to your OCR/AI service. Resolve the same shape as Core.simulateExtract. */
  function extractFromDocument(file) {
    return sleep(350).then(function () { return Core.simulateExtract(file.name, Core.todayLocal()); });
  }

  /* ---------- actions ---------- */
  function addFiles(files, source) {
    var n = 0, skipped = 0;
    Array.prototype.forEach.call(files, function (f) {
      if (!/\.(pdf|jpe?g|png|gif|webp)$/i.test(f.name) && !/^image\//.test(f.type)) { skipped++; return; }
      var meta = { name: f.name, size: f.size, type: f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : 'image/jpeg') };
      var e = Core.addInboxItem(state, me(), { source: source, attachments: [meta] });
      var url = ''; try { url = URL.createObjectURL(f); } catch (x) { /* ignore */ }
      blobStore[e.id] = [{ name: meta.name, size: meta.size, type: meta.type, url: url }];
      n++;
    });
    commit(n ? t('inbox.title') + ': +' + n : '');
    if (skipped) toast(skipped + ' file(s) skipped: PDF, JPG or PNG only.', true);
  }
  function closeDrawer() { ui.drawerId = null; ui.copyDlg = null; renderDrawer(); }
  var A = {
    go: function (el) {
      if (el.getAttribute('data-filter')) { ui.apFilter = el.getAttribute('data-filter'); }
      setTab(el.getAttribute('data-tab'));
    },
    more: function () { ui.moreOpen = !ui.moreOpen; renderChrome(); },
    lang: function () { state.settings.lang = lang() === 'en' ? 'ms' : 'en'; commit(); },
    'open-drawer': function (el) { ui.drawerId = el.getAttribute('data-id'); ui.copyDlg = null; renderDrawer(); },
    'close-drawer': closeDrawer,
    'open-entry': function (el) {
      var e = Core.findEntry(state, el.getAttribute('data-id'));
      openEntry(e.id, null, e.status === 'inbox' && e.rawText ? 'inbox.fromText' : '');
    },
    'new-entry': function () { ui.entryNote = ''; ui.entryId = null; ui.entryDraft = blankDraft(); ui.attach = []; render(); },
    extract: function (el) {
      var e = Core.findEntry(state, el.getAttribute('data-id'));
      el.disabled = true;
      extractFromDocument(e.attachments[0]).then(function (r) {
        if (!r.matched) { openEntry(e.id, null, ''); toast(t('inbox.noMatch'), true); return; }
        openEntry(e.id, { type: r.type, payee: r.payee, category: r.category, netAmount: r.netAmount, taxAmount: r.taxAmount, description: r.description, docDate: r.docDate }, 'inbox.sim');
      });
    },
    'add-paste': function () {
      if (!ui.pasteText.trim()) return;
      var p = Core.parsePasted(ui.pasteText);
      Core.addInboxItem(state, me(), { source: ui.pasteSource, rawText: ui.pasteText.trim(), payee: p.payee, refNo: p.refNo, docDate: p.date || '', netAmount: p.amount || 0, taxAmount: 0, type: p.type });
      ui.pasteText = ''; commit(t('btn.addInbox'));
    },
    'rm-attach': function (el) { ui.attach.splice(+el.getAttribute('data-i'), 1); $('#attach-list').innerHTML = attachHTML(ui.attach); },
    'save-entry': function () {
      try { var e = persistEntry(); commit(t('entry.saved', { id: e.id })); } catch (err) { showErr(err); }
    },
    'submit-entry': function () {
      var e;
      try { e = persistEntry(); } catch (err) { showErr(err); return; }
      var w = Core.entryWarnings(e, state), reason = '';
      if (w.duplicates.length) {
        var ok = $('#f-dupok') && $('#f-dupok').checked; reason = val('#f-dupreason');
        if (!ok || !reason) { save(); refreshEntryHints(); $('#dup-err').textContent = t('ce.DUPLICATE'); var tgt = ok ? $('#f-dupreason') : $('#f-dupok'); if (tgt) tgt.focus(); return; }
      }
      try {
        Core.submitEntry(state, me(), e.id, { dupReason: reason });
        ui.entryId = null; ui.entryDraft = null; ui.attach = []; ui.entryNote = '';
        commit(t('entry.submitted', { id: e.id }));
      } catch (err) {
        if (err && err.code === 'VALIDATION') { save(); showFieldErrors(err.extra.errors); } else showErr(err);
      }
    },
    'ap-filter': function (el) { ui.apFilter = el.getAttribute('data-v'); render(); },
    approve: function (el) {
      var id = el.getAttribute('data-id');
      try { Core.approveEntry(state, me(), id, { balanceReason: val('#d-balance') }); ui.drawerId = null; commit(t('ap.approved.ok', { id: id })); }
      catch (err) { showErr(err, '#drawer-msg'); if (err.code === 'BALANCE_OVERRIDE_REQUIRED' && $('#d-balance')) $('#d-balance').focus(); }
    },
    reject: function (el) {
      var id = el.getAttribute('data-id');
      try { Core.rejectEntry(state, me(), id, val('#d-reject')); ui.drawerId = null; commit(t('ap.rejected.ok', { id: id })); } catch (err) { showErr(err, '#drawer-msg'); }
    },
    'return': function (el) {
      var id = el.getAttribute('data-id'), e = Core.findEntry(state, id);
      try { Core.returnEntry(state, me(), id, val('#d-return')); ui.drawerId = null; commit(t('ap.returned.ok', { id: id, name: Core.userName(state, e.createdBy) })); } catch (err) { showErr(err, '#drawer-msg'); }
    },
    reopen: function (el) {
      var id = el.getAttribute('data-id');
      try { Core.reopenEntry(state, me(), id, val('#d-reopen')); ui.drawerId = null; commit(t('ap.reopened.ok', { id: id })); } catch (err) { showErr(err, '#drawer-msg'); }
    },
    'rem-filter': function (el) { ui.remFilter = el.getAttribute('data-v'); render(); },
    'rem-done-open': function (el) { ui.remDoneId = el.getAttribute('data-id'); render(); },
    'rem-done-cancel': function () { ui.remDoneId = null; render(); },
    'rem-done-save': function (el) {
      try { Core.markReminderDone(state, me(), el.getAttribute('data-id'), val('#rd-ref'), num(val('#rd-amt'))); ui.remDoneId = null; commit(t('co.marked')); } catch (err) { showErr(err); }
    },
    'rem-pay': function (el) {
      var r = state.reminders.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      openEntry(null, { type: 'payment', payee: KIND_PAYEE[r.kind] || '', description: r.title, category: r.kind === 'CUSTOM' ? '' : 'Statutory contributions', netAmount: r.amount || '', docDate: Core.todayLocal(), source: 'other' });
    },
    'rem-tpl': function (el) { ui.remTitle = t(el.getAttribute('data-k')); var i = $('#rem-title'); if (i) { i.value = ui.remTitle; i.focus(); } },
    'rem-add': function () {
      var title = val('#rem-title'), due = val('#rem-date');
      if (!title || !Core.parseISO(due)) { toast(t('err.required') + ': ' + t('co.custom') + ', ' + t('co.date'), true); return; }
      Core.addReminder(state, me(), { kind: 'CUSTOM', title: title, due: due }); ui.remTitle = ''; commit(t('co.added'));
    },
    'rem-gen': function () {
      var p = ui.genPeriod; if (!/^\d{4}-\d{2}$/.test(p)) { toast(t('err.required') + ': ' + t('co.wage'), true); return; }
      var made = Core.generateStatutory(state, me(), p);
      commit(made.length ? t('co.genDone', { n: made.length, period: p }) : t('co.genNone', { period: p }));
    },
    'pay-add': function () { ui.payRows.push({ name: '', wage: 0, pcb: 0 }); render(); },
    'pay-rm': function (el) { ui.payRows.splice(+el.getAttribute('data-i'), 1); render(); },
    'pay-entries': function () {
      var res = Core.calcPayroll(ui.payRows.map(function (r) { return { name: r.name, wage: num(r.wage), pcb: num(r.pcb) }; }), state.settings.rates);
      var ps = Core.payrollEntryPatches(res, ui.payPeriod, Core.todayLocal());
      ps.forEach(function (p) { Core.saveEntry(state, me(), p); });
      commit(t('co.paid', { n: ps.length }));
    },
    'cal-sel': function (el) { ui.cal.sel = el.getAttribute('data-date'); calFocusOf(el); save(); render(); },
    'cal-jump': function (el) { ui.cal.sel = el.getAttribute('data-date'); ui.cal.focus = '.cal-day[data-date="' + ui.cal.sel + '"], .wk-head[data-date="' + ui.cal.sel + '"]'; render(); },
    'cal-prev': function (el) { calStep(-1); calFocusOf(el); render(); },
    'cal-next': function (el) { calStep(1); calFocusOf(el); render(); },
    'cal-today': function (el) { ui.cal.sel = Core.todayLocal(); calFocusOf(el); render(); },
    'cal-view': function (el) { ui.cal.view = el.getAttribute('data-v'); calFocusOf(el); save(); render(); },
    'cal-layer': function (el) { var k = el.getAttribute('data-v'); ui.cal.layers[k] = !ui.cal.layers[k]; calFocusOf(el); save(); render(); },
    'cal-ledger': function (el) { ui.cal.ledger = el.getAttribute('data-v'); calFocusOf(el); save(); render(); },
    'cal-open': function (el) {
      var layer = el.getAttribute('data-layer'), id = el.getAttribute('data-id');
      ui.cal.sel = el.getAttribute('data-date');
      if (layer === 'exports') { setTab('export'); return; }
      if (layer === 'documents' || layer === 'approvals') { ui.drawerId = id; ui.copyDlg = null; }
      calFocusOf(el); render();
    },
    'cal-add-toggle': function () { ui.cal.add = !ui.cal.add; ui.cal.addTitle = ui.cal.add ? ui.cal.addTitle : ''; render(); var i = $('#cal-title'); if (i) i.focus(); },
    'cal-tpl': function (el) { ui.cal.addTitle = t(el.getAttribute('data-k')); var i = $('#cal-title'); if (i) { i.value = ui.cal.addTitle; i.focus(); } },
    'cal-add': function () {
      var title = val('#cal-title'), due = val('#cal-date');
      if (!title || !Core.parseISO(due)) { toast(t('err.required') + ': ' + t('cal.reminderTitle') + ', ' + t('co.date'), true); return; }
      Core.addReminder(state, me(), { kind: 'CUSTOM', title: title, due: due });
      ui.cal.add = false; ui.cal.addTitle = ''; ui.cal.sel = due; commit(t('co.added'));
    },
    'cal-ics': function () {
      var r = Core.buildICS(state, { labels: { calName: t('cal.ics.cal'), statutory: t('cal.ics.stat'), custom: t('cal.ics.custom'), wage: t('cal.ics.wage') } });
      if (!r.count) { toast(t('cal.icsEmpty'), true); return; }
      deliver('accounts-intake-hub-deadlines.ics', r.text);
    },
    'toggle-sel': function (el) { var id = el.getAttribute('data-id'); ui.exportSel[id] = !ui.exportSel[id]; render(); },
    'sel-all': function (el) {
      var ready = state.entries.filter(function (e) { return e.status === 'approved' && !e.exportBatchId; });
      ui.exportSel = {}; if (el.checked) ready.forEach(function (e) { ui.exportSel[e.id] = true; }); render();
    },
    'ex-layout': function (el) { ui.exportLayout = el.getAttribute('data-v'); render(); },
    'create-batch': function () {
      var ids = state.entries.filter(function (e) { return ui.exportSel[e.id]; }).map(function (e) { return e.id; });
      try { var b = Core.createBatch(state, me(), ids); ui.exportSel = {}; commit(t('ex.batchMade', { id: b.id })); } catch (err) { showErr(err); }
    },
    dl: function (el) { download(el.getAttribute('data-fmt'), el.getAttribute('data-id')); },
    'copy-text': function () {
      var ta = $('#copy-text'); ta.select();
      var done = function () { toast(t('ex.copied')); }, failed = function () { toast(t('ex.copyFail'), true); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, failed); else failed();
    },
    'audit-csv': function () {
      var rows = state.audit.slice().sort(function (a, b) { return a.ts < b.ts ? 1 : -1; }).map(function (ev) { return [ev.id, ev.ts, Core.userName(state, ev.user), ev.action, ev.entryId, detailOf(ev)]; });
      deliver('audit-log.csv', '﻿' + Core.toDelimited({ header: ['Event', 'Time (UTC)', 'User', 'Action', 'Entry', 'Detail'], rows: rows }, { neutralise: true }));
    },
    'run-tests': function () { ui.selftest = Core.runSelfTests(Core.todayLocal()); render(); var s = $('#test-summary'); if (s) s.scrollIntoView({ block: 'center' }); },
    reset: function () { ui.confirmReset = true; render(); },
    'reset-cancel': function () { ui.confirmReset = false; render(); },
    'reset-confirm': function () {
      var l = state.settings.lang; state = Core.seedState(Core.todayLocal()); state.settings.lang = l;
      blobStore = {}; ui.entryId = null; ui.entryDraft = null; ui.attach = []; ui.exportSel = {}; ui.confirmReset = false; ui.drawerId = null; ui.selftest = null;
      commit(t('se.reset.ok'));
    },
    'user-add': function () {
      var name = val('#new-user'); if (!name) return;
      var id = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'user'; while (Core.userById(state, id)) id += '2';
      state.users.push({ id: id, name: name, role: 'clerk' });
      Core.audit(state, me(), 'settings', '', null, { user: name, role: 'clerk' }, 'team member added'); commit(t('se.changed'));
    },
    'map-add': function () { state.settings.export.map.push({ name: 'NEWFIELD', src: 'id', enabled: true }); commit(); },
    'map-reset': function () { state.settings.export.map = Core.defaultFoxMap(); Core.audit(state, me(), 'settings', '', null, null, 'FoxPro field mapping reset'); commit(t('se.changed')); },
    'map-rm': function (el) { state.settings.export.map.splice(+el.getAttribute('data-i'), 1); Core.audit(state, me(), 'settings', '', null, null, 'FoxPro field removed'); commit(); },
    'map-up': function (el) { moveMap(+el.getAttribute('data-i'), -1); },
    'map-down': function (el) { moveMap(+el.getAttribute('data-i'), 1); }
  };
  function moveMap(i, d) {
    var m = state.settings.export.map, j = i + d; if (j < 0 || j >= m.length) return;
    var x = m[i]; m[i] = m[j]; m[j] = x; Core.audit(state, me(), 'settings', '', null, null, 'FoxPro field order changed'); commit();
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (ev.target.id === 'scrim') { closeDrawer(); return; }
    if (!el) return;
    var fn = A[el.getAttribute('data-act')];
    if (fn) { if (el.tagName === 'INPUT') { fn(el); return; } fn(el); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && (ui.drawerId || ui.copyDlg)) { closeDrawer(); return; }
    var dayEl = ui.tab === 'calendar' && !ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.target.closest ? ev.target.closest('.cal-day, .wk-head') : null;
    if (dayEl) {
      var cur = dayEl.getAttribute('data-date'), ws = state.settings.weekStart, wk = Core.weekDays(cur, ws), nd = null, month = ui.cal.view !== 'week';
      if (ev.key === 'ArrowLeft') nd = Core.addDays(cur, -1);
      else if (ev.key === 'ArrowRight') nd = Core.addDays(cur, 1);
      else if (ev.key === 'ArrowUp' && dayEl.classList.contains('cal-day')) nd = Core.addDays(cur, -7);
      else if (ev.key === 'ArrowDown' && dayEl.classList.contains('cal-day')) nd = Core.addDays(cur, 7);
      else if (ev.key === 'Home') nd = wk[0];
      else if (ev.key === 'End') nd = wk[6];
      else if (ev.key === 'PageUp') nd = month ? Core.shiftMonth(cur, ev.shiftKey ? -12 : -1) : Core.addDays(cur, -7);
      else if (ev.key === 'PageDown') nd = month ? Core.shiftMonth(cur, ev.shiftKey ? 12 : 1) : Core.addDays(cur, 7);
      if (nd) { ev.preventDefault(); ui.cal.sel = nd; ui.cal.focus = '.cal-day[data-date="' + nd + '"], .wk-head[data-date="' + nd + '"]'; render(); return; }
    }
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches && ev.target.matches('[data-act][tabindex]') && ev.target.tagName !== 'BUTTON') { ev.preventDefault(); ev.target.click(); }
  });
  document.addEventListener('input', function (ev) {
    var el = ev.target, f = el.getAttribute && el.getAttribute('data-f');
    if (f && ui.entryDraft) {
      ui.entryDraft[f] = el.value;
      if (el.classList) el.classList.remove('invalid');
      var er = $('#err-' + f); if (er) er.textContent = '';
      refreshEntryHints(); return;
    }
    if (el.id === 'paste-text') { ui.pasteText = el.value; $('#paste-result').innerHTML = pasteResultHTML(); return; }
    if (el.id === 'rem-title') { ui.remTitle = el.value; return; }
    if (el.id === 'cal-title') { ui.cal.addTitle = el.value; return; }
    if (el.classList && el.classList.contains('pay-in')) {
      var r = ui.payRows[+el.getAttribute('data-i')], k = el.getAttribute('data-k');
      r[k] = k === 'name' ? el.value : el.value; $('#pay-results').innerHTML = payResultsHTML(); return;
    }
    var da = el.getAttribute && el.getAttribute('data-audit');
    if (da) { ui.auditF[da] = el.value; if (da === 'q') { rerenderAuditBody(); } }
  });
  function rerenderAuditBody() {
    var F = ui.auditF, q = F.q.toLowerCase();
    var rows = state.audit.slice().sort(function (a, b) { return a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : (a.id < b.id ? 1 : -1); }).filter(function (ev) { return (!F.user || ev.user === F.user) && (!F.action || ev.action === F.action) && (!q || (ev.entryId + ' ' + ev.note + ' ' + detailOf(ev)).toLowerCase().indexOf(q) >= 0); });
    var shown = rows.slice(0, 200);
    $('#audit-body').innerHTML = auditRows(shown); $('#audit-count').textContent = t('au.showing', { n: shown.length, m: rows.length });
  }
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.id === 'user-select') { ui.userId = el.value; commit(); return; }
    if (el.id === 'file-input') { addFiles(el.files, ui.uploadSource); el.value = ''; return; }
    if (el.id === 'cal-month') { if (/^\d{4}-\d{2}$/.test(el.value)) { calSetMonth(el.value); ui.cal.focus = '#cal-month'; render(); } return; }
    if (el.id === 'f-files') {
      Array.prototype.forEach.call(el.files, function (f) { var url = ''; try { url = URL.createObjectURL(f); } catch (x) { /* ignore */ } ui.attach.push({ name: f.name, size: f.size, type: f.type || '', url: url }); });
      $('#attach-list').innerHTML = attachHTML(ui.attach); el.value = ''; return;
    }
    var du = el.getAttribute('data-ui'); if (du) { ui[du] = el.value; return; }
    var da = el.getAttribute('data-audit'); if (da) { ui.auditF[da] = el.value; if (da !== 'q') render(); return; }
    if (el.getAttribute('data-lang')) { state.settings.lang = el.getAttribute('data-lang'); commit(); return; }
    var ds = el.getAttribute('data-set');
    if (ds) {
      var type = el.getAttribute('data-type'), nv = el.value;
      if (type === 'bool') nv = el.checked; else if (type === 'num') nv = Math.max(0, num(nv)); else if (type === 'int') nv = Math.min(31, Math.max(1, Math.floor(num(nv)))); else if (type === 'delim') nv = DELIMS[nv]; else if (type === 'wk') nv = nv === '0' ? 0 : 1;
      var old = getPath(state.settings, ds); setPath(state.settings, ds, nv);
      var b = {}, a = {}; b[ds] = old; a[ds] = nv; Core.audit(state, me(), 'settings', '', b, a, ''); commit(t('se.changed')); return;
    }
    var mi = el.getAttribute('data-map');
    if (mi !== null) {
      var m = state.settings.export.map[+mi], k = el.getAttribute('data-mk'), ov = m[k];
      m[k] = k === 'enabled' ? el.checked : k === 'name' ? el.value.trim().toUpperCase() : el.value;
      var bb = {}, aa = {}; bb['map.' + mi + '.' + k] = ov; aa['map.' + mi + '.' + k] = m[k]; Core.audit(state, me(), 'settings', '', bb, aa, ''); commit(); return;
    }
    var ui2 = el.getAttribute('data-user');
    if (ui2 !== null) {
      var u = state.users[+ui2], uk = el.getAttribute('data-uk'), val2 = el.value.trim(); if (uk === 'name' && !val2) { el.value = u.name; return; }
      var b3 = {}, a3 = {}; b3[u.id + '.' + uk] = u[uk]; u[uk] = val2; a3[u.id + '.' + uk] = val2; Core.audit(state, me(), 'settings', '', b3, a3, ''); commit(t('se.changed'));
    }
  });
  document.addEventListener('dragover', function (ev) { var d = ev.target.closest ? ev.target.closest('#drop') : null; if (d) { ev.preventDefault(); d.classList.add('over'); } });
  document.addEventListener('dragleave', function (ev) { var d = ev.target.closest ? ev.target.closest('#drop') : null; if (d) d.classList.remove('over'); });
  document.addEventListener('drop', function (ev) {
    var d = ev.target.closest ? ev.target.closest('#drop') : null;
    if (d) { ev.preventDefault(); d.classList.remove('over'); if (ev.dataTransfer && ev.dataTransfer.files.length) addFiles(ev.dataTransfer.files, ui.uploadSource); }
  });
  $('#lang-btn').addEventListener('click', A.lang);

  /* ---------- start ---------- */
  loadAll();
  ui.payPeriod = prevMonth(); ui.genPeriod = prevMonth(); ui.cal.sel = Core.todayLocal();
  getDl();
  render();
  window.__aih = { state: function () { return state; }, ui: ui, A: A, render: render };
})();
