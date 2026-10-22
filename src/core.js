/* Accounts Intake Hub: core logic. Pure functions, no DOM. Shared by the page and the Node tests. */
var Core = (function () {
  'use strict';

  /* ---------- clock ---------- */
  var clockFn = function () { return new Date(); };
  function setClock(fn) { clockFn = fn || function () { return new Date(); }; }
  function nowISO() { return clockFn().toISOString(); }
  function pad(n, w) { return String(n).padStart(w || 2, '0'); }
  function todayLocal() {
    var d = clockFn();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function localDateOf(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /* ---------- constants ---------- */
  var TYPES = ['bill', 'payment', 'receipt'];
  var LEDGERS = ['office', 'client'];
  var SOURCES = ['whatsapp', 'email', 'scan', 'upload', 'other'];
  var STATUSES = ['inbox', 'draft', 'submitted', 'approved', 'returned', 'rejected', 'exported'];
  var CATEGORIES = ['Utilities', 'Telecoms', 'Courier & postage', 'Stationery & printing', 'Court fees', 'Stamp duty',
    'Search & registration fees', 'Rent', 'Professional fees', 'Travel', 'Statutory contributions', 'Client deposit', 'Other'];
  var EDITABLE = ['type', 'source', 'docDate', 'payee', 'refNo', 'description', 'category', 'netAmount', 'taxAmount',
    'ledger', 'matterNo', 'attachments', 'rawText'];
  var DIFF_KEYS = EDITABLE.concat(['totalAmount']);
  var SRC_FIELDS = ['id', 'docDate', 'type', 'payee', 'refNo', 'description', 'netAmount', 'taxAmount', 'totalAmount',
    'ledger', 'matterNo', 'category', 'createdBy', 'approvedBy', 'approvedAt', 'source', 'status', 'exportBatchId', 'currency'];
  var DATE_SRC = { docDate: 1, approvedAt: 1 };
  var NUM_SRC = { netAmount: 1, taxAmount: 1, totalAmount: 1 };
  var UPPER_SRC = { type: 1, ledger: 1, source: 1, status: 1 };

  function CoreError(code, message, extra) {
    var e = new Error(message || code);
    e.name = 'CoreError';
    e.code = code;
    e.extra = extra || {};
    return e;
  }

  /* ---------- number and date helpers ---------- */
  function round2(n) {
    var x = Number(n);
    if (!isFinite(x)) return 0;
    return (x < 0 ? -1 : 1) * Math.round(Math.abs(x) * 100 + 1e-7) / 100;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fmtMoney(n) {
    var v = round2(n), neg = v < 0, s = Math.abs(v).toFixed(2).split('.');
    return (neg ? '-' : '') + 'RM ' + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + s[1];
  }
  function fmtNumber(n, decimal) {
    var s = round2(n).toFixed(2);
    return decimal === ',' ? s.replace('.', ',') : s;
  }
  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return dt;
  }
  function toISO(dt) { return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); }
  function addDays(iso, n) { var dt = parseISO(iso); dt.setUTCDate(dt.getUTCDate() + n); return toISO(dt); }
  function diffDays(aIso, bIso) { return Math.round((parseISO(aIso) - parseISO(bIso)) / 86400000); }
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  }
  function fmtByPattern(iso, pattern) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    if (!m) return '';
    if (pattern === 'YYYYMMDD') return m[1] + m[2] + m[3];
    if (pattern === 'YYYY-MM-DD') return m[1] + '-' + m[2] + '-' + m[3];
    return m[3] + '/' + m[2] + '/' + m[1];
  }
  function rollDue(iso, rule) {
    if (!rule || rule === 'none') return iso;
    var cur = iso;
    for (var i = 0; i < 4; i++) {
      var dow = parseISO(cur).getUTCDay();
      if (dow !== 0 && dow !== 6) break;
      cur = addDays(cur, rule === 'prev' ? -1 : 1);
    }
    return cur;
  }
  /* Contributions for wage month YYYY-MM fall due on dueDay of the following month. */
  function statutoryDue(ym, dueDay, rule) {
    var p = ym.split('-'), y = +p[0], m = +p[1];
    var ny = y, nm = m + 1;
    if (nm > 12) { nm = 1; ny++; }
    var dim = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
    var day = Math.min(Math.max(1, Math.floor(dueDay)), dim);
    return rollDue(ny + '-' + pad(nm) + '-' + pad(day), rule);
  }
  function reminderStatus(r, today) {
    if (r.status === 'done') return 'done';
    var d = diffDays(r.due, today);
    if (d < 0) return 'overdue';
    if (d <= 7) return 'soon';
    return 'upcoming';
  }

  /* ---------- settings and state ---------- */
  function defaultFoxMap() {
    return [
      ['DOCNO', 'id'], ['DOCDATE', 'docDate'], ['DOCTYPE', 'type'], ['PAYEE', 'payee'], ['REFNO', 'refNo'],
      ['DESCRIP', 'description'], ['NETAMT', 'netAmount'], ['TAXAMT', 'taxAmount'], ['TOTAMT', 'totalAmount'],
      ['LEDGER', 'ledger'], ['MATTERNO', 'matterNo'], ['CATEGORY', 'category'], ['MAKER', 'createdBy'],
      ['CHECKER', 'approvedBy'], ['APPRDATE', 'approvedAt']
    ].map(function (p) { return { name: p[0], src: p[1], enabled: true }; });
  }
  function defaultSettings() {
    return {
      lang: 'en',
      rollRule: 'next',
      weekStart: 1, // calendar week starts on Monday (1) or Sunday (0)
      dueDays: { EPF: 15, SOCSO: 15, EIS: 15, PCB: 15 },
      rates: {
        epfEmployerLow: 13, epfEmployerHigh: 12, epfThreshold: 5000, epfEmployee: 11, epfRoundUp: true,
        socsoEmployer: 1.75, socsoEmployee: 0.5, socsoCeiling: 6000,
        eisEmployer: 0.2, eisEmployee: 0.2, eisCeiling: 6000
      },
      export: { dateFmt: 'YYYYMMDD', delimiter: ',', decimal: '.', header: true, foxBom: false, foxUpper: true, map: defaultFoxMap() }
    };
  }
  function emptyState() {
    return {
      v: 1,
      seq: { entry: 0, audit: 0, batch: 0, reminder: 0 },
      users: [], matters: [], entries: [], reminders: [], audit: [], batches: [],
      settings: defaultSettings()
    };
  }
  function userById(state, id) { return state.users.filter(function (u) { return u.id === id; })[0] || null; }
  function userName(state, id) { var u = userById(state, id); return u ? u.name : (id || ''); }
  function isApprover(u) { return !!u && u.role === 'approver'; }
  function findEntry(state, id) { return state.entries.filter(function (e) { return e.id === id; })[0] || null; }
  function findMatter(state, no) {
    var n = String(no || '').trim().toLowerCase();
    return state.matters.filter(function (m) { return m.matterNo.toLowerCase() === n; })[0] || null;
  }
  function ctxFor(state) { return { userName: function (id) { return userName(state, id); } }; }

  /* ---------- audit ---------- */
  function audit(state, user, action, entryId, before, after, note) {
    state.seq.audit = (state.seq.audit || 0) + 1;
    state.audit.push({
      id: 'AUD-' + pad(state.seq.audit, 6), ts: nowISO(), user: user ? user.id : 'system', action: action,
      entryId: entryId || '', before: before || null, after: after || null, note: note || ''
    });
  }
  function diff(a, b, keys) {
    var before = {}, after = {}, changed = false;
    keys.forEach(function (k) {
      var x = JSON.stringify(a ? a[k] : undefined), y = JSON.stringify(b[k]);
      if (x !== y) { before[k] = a ? a[k] : null; after[k] = b[k]; changed = true; }
    });
    return changed ? { before: before, after: after } : null;
  }
  function summaryOf(e) {
    return { type: e.type, payee: e.payee, docDate: e.docDate, totalAmount: e.totalAmount, ledger: e.ledger, matterNo: e.matterNo, status: e.status };
  }

  /* ---------- entries ---------- */
  function blankEntry(user) {
    return {
      id: null, type: 'bill', source: 'upload', docDate: '', payee: '', refNo: '', description: '', category: '',
      netAmount: 0, taxAmount: 0, totalAmount: 0, currency: 'MYR', ledger: 'office', matterNo: '',
      status: 'draft', createdBy: user ? user.id : '', createdAt: '', approvedBy: '', approvedAt: '',
      rejectReason: '', returnComment: '', duplicateOverrideReason: '', balanceOverrideReason: '',
      attachments: [], exportBatchId: '', rawText: ''
    };
  }
  function nextEntryId(state) {
    state.seq.entry = (state.seq.entry || 0) + 1;
    return 'ENT-' + clockFn().getFullYear() + '-' + pad(state.seq.entry, 4);
  }
  function computeTotal(net, tax) { return round2(round2(net) + round2(tax)); }
  function applyPatch(e, patch) {
    EDITABLE.forEach(function (k) {
      if (!(k in patch)) return;
      var v = patch[k];
      if (k === 'netAmount' || k === 'taxAmount') v = round2(v);
      else if (k === 'attachments') v = (v || []).map(function (a) { return { name: String(a.name), size: +a.size || 0, type: String(a.type || '') }; });
      else v = String(v === null || v === undefined ? '' : v).trim();
      e[k] = v;
    });
    e.totalAmount = computeTotal(e.netAmount, e.taxAmount); // R2
  }
  function validateEntry(e, state) {
    var err = {};
    if (TYPES.indexOf(e.type) < 0) err.type = 'invalid';
    if (!parseISO(e.docDate)) err.docDate = e.docDate ? 'invalid_date' : 'required';
    if (!String(e.payee || '').trim()) err.payee = 'required';
    if (!(Number(e.netAmount) > 0)) err.netAmount = 'amount_positive';
    if (!(Number(e.taxAmount) >= 0)) err.taxAmount = 'invalid_amount';
    if (LEDGERS.indexOf(e.ledger) < 0) err.ledger = 'invalid';
    else if (e.ledger === 'client') { // R1
      if (!String(e.matterNo || '').trim()) err.matterNo = 'matter_required';
      else if (!findMatter(state, e.matterNo)) err.matterNo = 'matter_unknown';
    }
    return err;
  }
  function normText(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  /* R3: same payee + total + date, or same ref + payee. Rejected and inbox items are ignored. */
  function findDuplicates(e, entries) {
    return entries.filter(function (o) {
      if (o.id === e.id || o.status === 'rejected' || o.status === 'inbox') return false;
      var samePayee = normText(o.payee) !== '' && normText(o.payee) === normText(e.payee);
      if (!samePayee) return false;
      var byAmountDate = round2(o.totalAmount) === round2(e.totalAmount) && o.docDate === e.docDate;
      var byRef = normText(e.refNo) !== '' && normText(o.refNo) === normText(e.refNo);
      return byAmountDate || byRef;
    });
  }
  /* R7: client-ledger payment above the matter's client balance. */
  function balanceBreach(e, state) {
    if (e.ledger !== 'client' || e.type !== 'payment') return null;
    var m = findMatter(state, e.matterNo);
    if (!m) return null;
    if (round2(e.totalAmount) > round2(m.clientBalance)) {
      return { matterNo: m.matterNo, clientName: m.clientName, balance: round2(m.clientBalance), total: round2(e.totalAmount), shortBy: round2(e.totalAmount - m.clientBalance) };
    }
    return null;
  }
  function entryWarnings(e, state) {
    return { duplicates: findDuplicates(e, state.entries).map(function (d) { return d.id; }), balance: balanceBreach(e, state) };
  }
  function assertEditable(e, user) {
    if (e.status === 'approved' || e.status === 'exported') throw CoreError('IMMUTABLE', 'Approved entries are locked.'); // R6
    if (e.status === 'submitted') throw CoreError('LOCKED_SUBMITTED', 'Entry is awaiting approval.');
    if (e.status === 'rejected') throw CoreError('LOCKED_REJECTED', 'Rejected entries cannot be edited.');
    if (e.status !== 'inbox' && e.createdBy !== user.id && !isApprover(user)) throw CoreError('NOT_OWNER', 'Only the creator can edit this entry.');
  }
  function saveEntry(state, user, patch, id) {
    var e;
    if (id) {
      e = findEntry(state, id);
      if (!e) throw CoreError('NOT_FOUND', 'Entry not found.');
      assertEditable(e, user);
      var before = clone(e);
      applyPatch(e, patch);
      if (e.status === 'inbox') e.status = 'draft';
      var d = diff(before, e, DIFF_KEYS.concat(['status']));
      if (d) audit(state, user, 'edit', e.id, d.before, d.after, '');
    } else {
      e = blankEntry(user);
      applyPatch(e, patch);
      e.id = nextEntryId(state);
      e.createdAt = nowISO();
      e.status = 'draft';
      state.entries.push(e);
      audit(state, user, 'create', e.id, null, summaryOf(e), 'draft');
    }
    return e;
  }
  function addInboxItem(state, user, item) {
    var e = blankEntry(user);
    applyPatch(e, item || {});
    e.id = nextEntryId(state);
    e.createdAt = nowISO();
    e.status = 'inbox';
    state.entries.push(e);
    audit(state, user, 'create', e.id, null, summaryOf(e), 'inbox: ' + e.source);
    return e;
  }
  function cloneAsDraft(state, user, id) {
    var o = findEntry(state, id);
    if (!o) throw CoreError('NOT_FOUND', 'Entry not found.');
    var n = saveEntry(state, user, o);
    audit(state, user, 'create', n.id, null, null, 'copied from ' + o.id);
    return n;
  }
  function submitEntry(state, user, id, opts) {
    opts = opts || {};
    var e = findEntry(state, id);
    if (!e) throw CoreError('NOT_FOUND', 'Entry not found.');
    if (e.status !== 'draft' && e.status !== 'returned') throw CoreError('BAD_STATE', 'Only drafts or returned entries can be submitted.');
    if (e.createdBy !== user.id && !isApprover(user)) throw CoreError('NOT_OWNER', 'Only the creator can submit this entry.');
    var errs = validateEntry(e, state);
    if (Object.keys(errs).length) throw CoreError('VALIDATION', 'Entry has errors.', { errors: errs });
    var dups = findDuplicates(e, state.entries);
    var reason = String(opts.dupReason || '').trim();
    if (dups.length && !reason) throw CoreError('DUPLICATE', 'Possible duplicate.', { duplicates: dups.map(function (d) { return d.id; }) }); // R3
    var before = { status: e.status, duplicateOverrideReason: e.duplicateOverrideReason };
    e.status = 'submitted';
    e.returnComment = '';
    e.duplicateOverrideReason = dups.length ? reason : '';
    audit(state, user, 'submit', e.id, before, { status: 'submitted', duplicateOverrideReason: e.duplicateOverrideReason },
      dups.length ? 'duplicate override; matches ' + dups.map(function (d) { return d.id; }).join(', ') : '');
    return e;
  }
  function needApprover(user) { if (!isApprover(user)) throw CoreError('FORBIDDEN', 'Approver role required.'); }
  function needSubmitted(e) {
    if (!e) throw CoreError('NOT_FOUND', 'Entry not found.');
    if (e.status !== 'submitted') throw CoreError('BAD_STATE', 'Entry is not awaiting approval.');
  }
  function approveEntry(state, user, id, opts) {
    opts = opts || {};
    needApprover(user);
    var e = findEntry(state, id);
    needSubmitted(e);
    if (e.createdBy === user.id) throw CoreError('SELF_APPROVAL', 'You cannot approve an entry you created.'); // R4
    var breach = balanceBreach(e, state), reason = String(opts.balanceReason || '').trim();
    if (breach && !reason) throw CoreError('BALANCE_OVERRIDE_REQUIRED', 'Payment exceeds client balance.', { breach: breach }); // R7
    e.status = 'approved';
    e.approvedBy = user.id;
    e.approvedAt = nowISO();
    e.balanceOverrideReason = breach ? reason : '';
    audit(state, user, 'approve', e.id, { status: 'submitted' }, { status: 'approved', approvedBy: user.id }, breach ? 'balance override: ' + reason : '');
    return e;
  }
  function rejectEntry(state, user, id, reason) {
    needApprover(user);
    var e = findEntry(state, id);
    needSubmitted(e);
    reason = String(reason || '').trim();
    if (!reason) throw CoreError('REASON_REQUIRED', 'A reason is required.'); // R5
    e.status = 'rejected';
    e.rejectReason = reason;
    audit(state, user, 'reject', e.id, { status: 'submitted' }, { status: 'rejected' }, reason);
    return e;
  }
  function returnEntry(state, user, id, comment) {
    needApprover(user);
    var e = findEntry(state, id);
    needSubmitted(e);
    comment = String(comment || '').trim();
    if (!comment) throw CoreError('REASON_REQUIRED', 'A comment is required.'); // R5
    e.status = 'returned';
    e.returnComment = comment;
    audit(state, user, 'return', e.id, { status: 'submitted' }, { status: 'returned' }, comment);
    return e;
  }
  function reopenEntry(state, user, id, reason) {
    needApprover(user);
    var e = findEntry(state, id);
    if (!e) throw CoreError('NOT_FOUND', 'Entry not found.');
    if (e.status === 'exported') throw CoreError('EXPORTED_LOCKED', 'Entry is in an export batch and cannot be reopened.');
    if (e.status !== 'approved') throw CoreError('BAD_STATE', 'Only approved entries can be reopened.');
    reason = String(reason || '').trim();
    if (!reason) throw CoreError('REASON_REQUIRED', 'A reason is required.'); // R6
    var before = { status: 'approved', approvedBy: e.approvedBy, approvedAt: e.approvedAt };
    e.status = 'returned';
    e.returnComment = 'Reopened: ' + reason;
    e.approvedBy = '';
    e.approvedAt = '';
    e.balanceOverrideReason = '';
    audit(state, user, 'reopen', e.id, before, { status: 'returned' }, reason);
    return e;
  }

  /* ---------- export ---------- */
  function validateFoxMap(map) {
    var problems = [], seen = {};
    (map || []).forEach(function (m, i) {
      if (!m.enabled) return;
      var n = String(m.name || '');
      if (!/^[A-Z][A-Z0-9_]{0,9}$/.test(n)) problems.push({ index: i, name: n, code: n.length > 10 ? 'too_long' : 'bad_name' });
      if (seen[n]) problems.push({ index: i, name: n, code: 'duplicate' });
      seen[n] = true;
      if (SRC_FIELDS.indexOf(m.src) < 0) problems.push({ index: i, name: n, code: 'bad_source' });
    });
    return problems;
  }
  function srcValue(e, src, cfg, ctx, layout) {
    var v = e[src];
    if (src === 'createdBy' || src === 'approvedBy') return v ? ctx.userName(v) : '';
    if (src === 'approvedAt') v = v ? localDateOf(v) : '';
    if (DATE_SRC[src]) return layout === 'fox' ? fmtByPattern(v, cfg.dateFmt) : fmtDate(v);
    if (NUM_SRC[src]) return round2(v);
    if (layout === 'fox' && cfg.foxUpper && UPPER_SRC[src]) return String(v || '').toUpperCase();
    return v === undefined || v === null ? '' : v;
  }
  var GENERIC_COLS = [
    ['Entry No', 'id'], ['Doc Date', 'docDate'], ['Type', 'type'], ['Source', 'source'], ['Payee', 'payee'],
    ['Ref No', 'refNo'], ['Description', 'description'], ['Category', 'category'], ['Net (RM)', 'netAmount'],
    ['Tax (RM)', 'taxAmount'], ['Total (RM)', 'totalAmount'], ['Currency', 'currency'], ['Ledger', 'ledger'],
    ['Matter No', 'matterNo'], ['Maker', 'createdBy'], ['Checker', 'approvedBy'], ['Approved On', 'approvedAt'], ['Batch', 'exportBatchId']
  ];
  function buildTable(entries, layout, cfg, ctx) {
    var cols = layout === 'fox'
      ? cfg.map.filter(function (m) { return m.enabled; }).map(function (m) { return [m.name, m.src]; })
      : GENERIC_COLS;
    return {
      header: cols.map(function (c) { return c[0]; }),
      rows: entries.map(function (e) { return cols.map(function (c) { return srcValue(e, c[1], cfg, ctx, layout); }); })
    };
  }
  function csvCell(v, o) {
    if (v === null || v === undefined) v = '';
    if (typeof v === 'number') v = fmtNumber(v, o.decimal);
    else {
      v = String(v);
      if (o.neutralise && /^[=+\-@\t\r]/.test(v)) v = "'" + v; // stop spreadsheet formula injection
    }
    if (v.indexOf(o.delimiter) >= 0 || /["\r\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }
  function toDelimited(table, o) {
    o = o || {};
    var opt = { delimiter: o.delimiter || ',', decimal: o.decimal || '.', neutralise: !!o.neutralise };
    var lines = [];
    if (o.header !== false) lines.push(table.header.map(function (h) { return csvCell(String(h), { delimiter: opt.delimiter, decimal: '.', neutralise: false }); }).join(opt.delimiter));
    table.rows.forEach(function (r) { lines.push(r.map(function (v) { return csvCell(v, opt); }).join(opt.delimiter)); });
    return lines.join('\r\n') + '\r\n';
  }
  function batchEntries(state, batch) { return batch.snapshot; }
  function createBatch(state, user, ids) {
    needApprover(user);
    if (!ids || !ids.length) throw CoreError('NOTHING_SELECTED', 'Select at least one entry.');
    var bad = [], picked = [];
    ids.forEach(function (id) {
      var e = findEntry(state, id);
      if (!e || e.status !== 'approved' || e.exportBatchId) bad.push(id); else picked.push(e); // R9
    });
    if (bad.length) throw CoreError('NOT_EXPORTABLE', 'Only approved, not-yet-exported entries can be exported.', { ids: bad });
    state.seq.batch = (state.seq.batch || 0) + 1;
    var bid = 'BAT-' + clockFn().getFullYear() + '-' + pad(state.seq.batch, 4);
    var total = 0;
    picked.forEach(function (e) {
      e.status = 'exported';
      e.exportBatchId = bid;
      total += e.totalAmount;
    });
    var batch = { id: bid, createdAt: nowISO(), createdBy: user.id, entryIds: picked.map(function (e) { return e.id; }), count: picked.length, total: round2(total), snapshot: clone(picked) };
    state.batches.push(batch);
    picked.forEach(function (e) { audit(state, user, 'export', e.id, { status: 'approved' }, { status: 'exported', exportBatchId: bid }, bid); });
    return batch;
  }
  function buildJSON(state, batch) {
    return JSON.stringify({
      batchId: batch.id, createdAt: batch.createdAt, createdBy: userName(state, batch.createdBy), currency: 'MYR',
      count: batch.count, total: batch.total, entries: batch.snapshot
    }, null, 2);
  }

  /* ---------- paste parser ---------- */
  var MONTHS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, mac: 3, apr: 4, april: 4, may: 5, mei: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, ogos: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, okt: 10, oktober: 10, nov: 11, november: 11,
    dec: 12, december: 12, dis: 12, disember: 12 };
  var NUM = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)';
  var WA_PREFIX = /^\[?\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[APap][Mm])?\]?\s*(?:-\s*)?[^:\n]{1,40}:\s*/gm;
  function toNumber(s) { return round2(parseFloat(String(s).replace(/,/g, ''))); }
  function isoFromParts(y, m, d) {
    if (y < 100) y += 2000;
    var iso = y + '-' + pad(m) + '-' + pad(d);
    return parseISO(iso) ? iso : null;
  }
  function parseAmount(text) {
    var kw = new RegExp('\\b(?:grand\\s+total|total\\s*(?:due|payable|amount)?|amount\\s*(?:due|payable)?|balance\\s+due|jumlah(?:\\s+bayaran)?|amaun)\\s*[:\\-]?\\s*(?:RM|MYR)?\\s*' + NUM, 'ig');
    var rm = new RegExp('(?:RM|MYR)\\s*' + NUM, 'ig');
    var m, last = null, cands = [];
    while ((m = kw.exec(text))) last = toNumber(m[1]);
    while ((m = rm.exec(text))) cands.push(toNumber(m[1]));
    if (last !== null) return { amount: last, candidates: cands };
    if (cands.length) return { amount: Math.max.apply(null, cands), candidates: cands };
    return { amount: null, candidates: [] };
  }
  function parseDate(text) {
    var m, re;
    re = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
    while ((m = re.exec(text))) { var a = isoFromParts(+m[1], +m[2], +m[3]); if (a) return a; }
    re = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})\b/g;
    while ((m = re.exec(text))) { var b = isoFromParts(+m[3], +m[2], +m[1]); if (b) return b; }
    re = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/g;
    while ((m = re.exec(text))) {
      var mo = MONTHS[m[2].toLowerCase()];
      if (mo) { var c = isoFromParts(+m[3], mo, +m[1]); if (c) return c; }
    }
    return null;
  }
  function parseRef(text) {
    var re = /\b(?:invoice|invois|inv|ref(?:erence)?|receipt|resit|bil|doc(?:ument)?)\s*(?:no\.?|number|num|#)?\s*[:#.\-]?\s*((?=[A-Z0-9\-\/]*\d)[A-Z0-9][A-Z0-9\-\/]{2,})/i;
    var m = re.exec(text);
    return m ? m[1].replace(/[-\/]+$/, '') : '';
  }
  function parsePayee(text) {
    var m = /^\s*(?:payee|pay to|paid to|supplier|vendor|bill from|from|dari|kepada|penerima)\s*[:\-]\s*(.+?)\s*$/im.exec(text);
    if (m && /^[A-Za-z]/.test(m[1])) return m[1].trim();
    var kw = /\b(?:bill from|invoice from|invois dari|receipt from|resit dari|payment to|paid to|pay to|kepada|dari|from)\s+/ig;
    while ((m = kw.exec(text))) {
      var rest = text.slice(m.index + m[0].length);
      var cut = rest.split(/\n|\s+(?:RM|MYR)\b|\s+(?:inv|invoice|ref|dated|on|for|amount|total|due)\b|[,;]|\.\s|\s+\d/i)[0].trim();
      if (cut.length >= 3 && /^[A-Za-z]/.test(cut)) return cut;
    }
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (l.length >= 3 && l.length <= 60 && /[A-Za-z]{3}/.test(l) && !/^(?:invoice|total|date|amount|ref|rm|myr)\b/i.test(l) && !/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(l) && !/(?:RM|MYR)\s*\d/i.test(l)) return l;
    }
    return '';
  }
  function parsePasted(raw) {
    var text = String(raw || '').replace(/\r/g, '').replace(WA_PREFIX, '');
    var a = parseAmount(text), out = { amount: a.amount, candidates: a.candidates, date: parseDate(text), refNo: parseRef(text), payee: parsePayee(text), type: '', found: [] };
    if (/\b(?:receipt|resit|received|diterima)\b/i.test(text)) out.type = 'receipt';
    else if (/\b(?:payment|bayaran|pembayaran|paid|transfer|dibayar)\b/i.test(text)) out.type = 'payment';
    else out.type = 'bill';
    if (out.amount !== null) out.found.push('amount');
    if (out.date) out.found.push('date');
    if (out.refNo) out.found.push('refNo');
    if (out.payee) out.found.push('payee');
    return out;
  }
  /* Simulated extraction: values come from the file name only. The real OCR/AI hook replaces this. */
  var MOCK_RULES = [
    { k: /tnb|tenaga|electric/i, payee: 'Tenaga Nasional Berhad', category: 'Utilities', net: 487.3, tax: 0, type: 'bill', desc: 'Electricity bill' },
    { k: /unifi|internet|broadband/i, payee: 'Unifi Business', category: 'Telecoms', net: 376.42, tax: 22.58, type: 'bill', desc: 'Internet subscription' },
    { k: /courier|poslaju|pos[\s_-]?laju|gdex|dhl/i, payee: 'Pos Laju', category: 'Courier & postage', net: 42.3, tax: 0, type: 'payment', desc: 'Courier charges' },
    { k: /stamp|duti/i, payee: 'Stamp Office (LHDN)', category: 'Stamp duty', net: 1250, tax: 0, type: 'payment', desc: 'Stamp duty remittance' },
    { k: /filing|efiling|court|mahkamah/i, payee: 'Judiciary e-Filing', category: 'Court fees', net: 300, tax: 0, type: 'payment', desc: 'Court filing fee' }
  ];
  function simulateExtract(fileName, today) {
    var name = String(fileName || '');
    var hit = MOCK_RULES.filter(function (r) { return r.k.test(name); })[0];
    if (!hit) return { matched: false, simulated: true };
    return { matched: true, simulated: true, payee: hit.payee, category: hit.category, netAmount: hit.net, taxAmount: hit.tax, type: hit.type, description: hit.desc, docDate: today, refNo: '' };
  }

  /* ---------- payroll contributions (placeholder rates, editable) ---------- */
  function calcPayroll(rows, r) {
    var out = [], tot = { wage: 0, epfEr: 0, epfEe: 0, socsoEr: 0, socsoEe: 0, eisEr: 0, eisEe: 0, pcb: 0 };
    rows.forEach(function (row) {
      var wage = round2(row.wage), pcb = round2(row.pcb || 0);
      var epfRate = wage <= r.epfThreshold ? r.epfEmployerLow : r.epfEmployerHigh;
      var epfEr = round2(wage * epfRate / 100), epfEe = round2(wage * r.epfEmployee / 100);
      if (r.epfRoundUp) { epfEr = Math.ceil(epfEr); epfEe = Math.ceil(epfEe); }
      var sw = Math.min(wage, r.socsoCeiling), ew = Math.min(wage, r.eisCeiling);
      var x = { name: row.name || '', wage: wage, epfEr: epfEr, epfEe: epfEe,
        socsoEr: round2(sw * r.socsoEmployer / 100), socsoEe: round2(sw * r.socsoEmployee / 100),
        eisEr: round2(ew * r.eisEmployer / 100), eisEe: round2(ew * r.eisEmployee / 100), pcb: pcb };
      Object.keys(tot).forEach(function (k) { tot[k] = round2(tot[k] + x[k]); });
      out.push(x);
    });
    return { rows: out, totals: tot };
  }
  function payrollEntryPatches(result, ym, today) {
    var t = result.totals, label = ym;
    function p(payee, cat, amt, desc) {
      return { type: 'payment', source: 'other', docDate: today, payee: payee, refNo: '', description: desc + ' ' + label, category: cat, netAmount: amt, taxAmount: 0, ledger: 'office', matterNo: '' };
    }
    return [
      p('KWSP (EPF)', 'Statutory contributions', round2(t.epfEr + t.epfEe), 'EPF contribution, wages'),
      p('PERKESO (SOCSO)', 'Statutory contributions', round2(t.socsoEr + t.socsoEe), 'SOCSO contribution, wages'),
      p('PERKESO (EIS)', 'Statutory contributions', round2(t.eisEr + t.eisEe), 'EIS contribution, wages'),
      p('LHDN (PCB)', 'Statutory contributions', t.pcb, 'PCB remittance, wages')
    ].filter(function (x) { return x.netAmount > 0; });
  }

  /* ---------- reminders ---------- */
  function addReminder(state, user, r) {
    state.seq.reminder = (state.seq.reminder || 0) + 1;
    var rem = { id: 'REM-' + pad(state.seq.reminder, 3), kind: r.kind || 'CUSTOM', title: r.title, period: r.period || '', due: r.due, status: 'open', refNo: '', amount: 0, doneAt: '', doneBy: '' };
    state.reminders.push(rem);
    audit(state, user, 'reminder', '', null, { id: rem.id, title: rem.title, due: rem.due }, 'added');
    return rem;
  }
  function generateStatutory(state, user, ym) {
    var made = [];
    ['EPF', 'SOCSO', 'EIS', 'PCB'].forEach(function (k) {
      var exists = state.reminders.some(function (r) { return r.kind === k && r.period === ym; });
      if (exists) return;
      made.push(addReminder(state, user, { kind: k, title: k + ' contribution, wages ' + ym, period: ym, due: statutoryDue(ym, state.settings.dueDays[k], state.settings.rollRule) }));
    });
    return made;
  }
  function markReminderDone(state, user, id, refNo, amount) {
    var r = state.reminders.filter(function (x) { return x.id === id; })[0];
    if (!r) throw CoreError('NOT_FOUND', 'Reminder not found.');
    r.status = 'done'; r.refNo = String(refNo || '').trim(); r.amount = round2(amount); r.doneAt = nowISO(); r.doneBy = user.id;
    audit(state, user, 'reminder', '', { status: 'open' }, { id: r.id, status: 'done', refNo: r.refNo, amount: r.amount }, 'submitted: ' + r.title);
    return r;
  }

  /* ---------- calendar ---------- */
  var CAL_LAYERS = ['deadlines', 'documents', 'approvals', 'exports'];
  var LAYER_RANK = { deadlines: 0, documents: 1, approvals: 2, exports: 3 };
  var DL_RANK = { overdue: 0, soon: 1, upcoming: 2, done: 3 };
  function normWeekStart(w) { return Number(w) === 0 ? 0 : 1; }
  /* Rows of 7 days covering the month of ym (YYYY-MM), padded with the neighbouring months' days. */
  function monthGrid(ym, weekStart) {
    var ws = normWeekStart(weekStart), first = ym + '-01', dow = parseISO(first).getUTCDay();
    var lead = (dow - ws + 7) % 7, start = addDays(first, -lead);
    var dim = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
    var weeks = Math.ceil((lead + dim) / 7), rows = [];
    for (var w = 0; w < weeks; w++) {
      var row = [];
      for (var d = 0; d < 7; d++) {
        var iso = addDays(start, w * 7 + d);
        row.push({ date: iso, inMonth: iso.slice(0, 7) === ym, dow: parseISO(iso).getUTCDay() });
      }
      rows.push(row);
    }
    return rows;
  }
  function weekDays(iso, weekStart) {
    var ws = normWeekStart(weekStart), lead = (parseISO(iso).getUTCDay() - ws + 7) % 7, start = addDays(iso, -lead), out = [];
    for (var i = 0; i < 7; i++) out.push(addDays(start, i));
    return out;
  }
  /* Move by whole months, keeping the day of month where it exists (31 Jan + 1 month = 28/29 Feb). */
  function shiftMonth(iso, n) {
    var y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n, d = +iso.slice(8, 10);
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    var dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return y + '-' + pad(m + 1) + '-' + pad(Math.min(d, dim));
  }
  function monthBounds(ym) {
    return { from: ym + '-01', to: ym + '-' + pad(new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate()) };
  }
  /* One flat, sorted list of calendar items from the existing data. Nothing is stored; it is derived on demand.
     o: { from, to, layers: {deadlines, documents, approvals, exports}, ledger: 'all' | 'office' | 'client' } */
  function calendarEvents(state, today, o) {
    o = o || {};
    var from = o.from || '', to = o.to || '', ledger = o.ledger || 'all', out = [];
    var on = o.layers || { deadlines: true, documents: true, approvals: true, exports: true };
    function inRange(d) { return !!d && (!from || d >= from) && (!to || d <= to); }
    if (on.deadlines) state.reminders.forEach(function (r) {
      if (!inRange(r.due)) return;
      var st = reminderStatus(r, today);
      out.push({ id: 'dl:' + r.id, layer: 'deadlines', date: r.due, kind: r.kind, status: st, title: r.title,
        short: r.kind === 'CUSTOM' ? r.title : r.kind + (r.period ? ' ' + r.period : ''), reminderId: r.id, rank: DL_RANK[st] });
    });
    state.entries.forEach(function (e) {
      if (ledger !== 'all' && (e.ledger !== ledger || e.status === 'inbox')) return; // inbox items are not filed to a ledger yet
      var title = e.payee || (e.attachments && e.attachments[0] && e.attachments[0].name) || '';
      if (on.documents) {
        var d = e.docDate || localDateOf(e.createdAt);
        if (inRange(d)) out.push({ id: 'doc:' + e.id, layer: 'documents', date: d, kind: e.type, status: e.status, title: title, source: e.source,
          entryId: e.id, ledger: e.ledger, amount: e.totalAmount, rank: 0 });
      }
      if (on.approvals && e.approvedAt && (e.status === 'approved' || e.status === 'exported')) {
        var a = localDateOf(e.approvedAt);
        if (inRange(a)) out.push({ id: 'apr:' + e.id, layer: 'approvals', date: a, kind: e.type, status: e.status, title: title, source: e.source,
          entryId: e.id, ledger: e.ledger, amount: e.totalAmount, by: e.approvedBy, at: e.approvedAt, rank: 0 });
      }
    });
    if (on.exports) state.batches.forEach(function (b) {
      var d = localDateOf(b.createdAt);
      if (!inRange(d)) return;
      var snap = ledger === 'all' ? b.snapshot : b.snapshot.filter(function (x) { return x.ledger === ledger; });
      if (!snap.length) return;
      var total = 0; snap.forEach(function (x) { total += x.totalAmount; });
      out.push({ id: 'bat:' + b.id, layer: 'exports', date: d, kind: 'batch', status: 'exported', title: b.id, batchId: b.id,
        count: snap.length, amount: round2(total), by: b.createdBy, at: b.createdAt, rank: 0 });
    });
    out.sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : (LAYER_RANK[a.layer] - LAYER_RANK[b.layer]) || (a.rank - b.rank) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
    return out;
  }
  /* Figures for the strip above the calendar. Overdue and next-7-days ignore the visible month on purpose. */
  function calendarSummary(state, today, ym) {
    var s = { overdue: 0, overdueFirst: '', next7: 0, next7First: '', monthOpen: 0, monthDone: 0, monthDocs: 0, approvedCount: 0, approvedTotal: 0 };
    var b = monthBounds(ym);
    state.reminders.forEach(function (r) {
      var st = reminderStatus(r, today);
      if (st === 'overdue') { s.overdue++; if (!s.overdueFirst || r.due < s.overdueFirst) s.overdueFirst = r.due; }
      if (st === 'soon') { s.next7++; if (!s.next7First || r.due < s.next7First) s.next7First = r.due; }
      if (r.due >= b.from && r.due <= b.to) { if (r.status === 'done') s.monthDone++; else s.monthOpen++; }
    });
    state.entries.forEach(function (e) {
      if (e.status !== 'inbox' && e.docDate >= b.from && e.docDate <= b.to) s.monthDocs++;
      if ((e.status === 'approved' || e.status === 'exported') && e.approvedAt) {
        var a = localDateOf(e.approvedAt);
        if (a >= b.from && a <= b.to) { s.approvedCount++; s.approvedTotal = round2(s.approvedTotal + e.totalAmount); }
      }
    });
    return s;
  }
  /* iCalendar (RFC 5545). Open deadlines only: no amounts, payees or matter numbers leave the app. */
  function icsEscape(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
  }
  function icsFold(line) {
    var out = [], cur = '', len = 0;
    Array.from(line).forEach(function (ch) {
      var c = ch.codePointAt(0), n = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
      if (len + n > 75) { out.push(cur); cur = ' ' + ch; len = 1 + n; } else { cur += ch; len += n; }
    });
    out.push(cur);
    return out.join('\r\n');
  }
  function buildICS(state, o) {
    o = o || {};
    var L = o.labels || {}, stamp = nowISO().replace(/[-:]|\.\d{3}/g, '');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Accounts Intake Hub//Deadlines//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'X-WR-CALNAME:' + icsEscape(L.calName || 'Accounts Intake Hub deadlines')];
    var open = state.reminders.filter(function (r) { return r.status !== 'done' && parseISO(r.due); })
      .sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : (a.id < b.id ? -1 : 1); });
    open.forEach(function (r) {
      var d0 = r.due.replace(/-/g, ''), d1 = addDays(r.due, 1).replace(/-/g, '');
      var desc = (r.kind === 'CUSTOM' ? (L.custom || 'Reminder') : (L.statutory || 'Statutory deadline') + ' (' + r.kind + ')') + (r.period ? '. ' + (L.wage || 'Wage month') + ' ' + r.period : '');
      lines.push('BEGIN:VEVENT', 'UID:' + r.id + '@accounts-intake-hub', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d0, 'DTEND;VALUE=DATE:' + d1,
        'SUMMARY:' + icsEscape(r.title), 'DESCRIPTION:' + icsEscape(desc), 'CATEGORIES:' + icsEscape(r.kind === 'CUSTOM' ? 'Reminder' : 'Statutory'),
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(r.title), 'TRIGGER:-P2DT15H', 'END:VALARM', // 09:00, three days before
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(r.title), 'TRIGGER:PT9H', 'END:VALARM', // 09:00 on the day
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return { text: lines.map(icsFold).join('\r\n') + '\r\n', count: open.length };
  }

  /* ---------- dashboard ---------- */
  function dashboardStats(state, today) {
    var ym = today.slice(0, 7);
    var s = { inbox: 0, submitted: 0, overdue: 0, soon: 0, month: { office: { out: 0, inn: 0 }, client: { out: 0, inn: 0 } }, attention: [] };
    state.entries.forEach(function (e) {
      if (e.status === 'inbox') s.inbox++;
      if (e.status === 'submitted') s.submitted++;
      if ((e.status === 'approved' || e.status === 'exported') && localDateOf(e.approvedAt).slice(0, 7) === ym) {
        var b = s.month[e.ledger] || s.month.office;
        if (e.type === 'receipt') b.inn = round2(b.inn + e.totalAmount); else b.out = round2(b.out + e.totalAmount);
      }
    });
    state.reminders.forEach(function (r) {
      var st = reminderStatus(r, today);
      if (st === 'overdue') { s.overdue++; s.attention.push({ kind: 'overdue', sev: 1, reminderId: r.id, title: r.title, due: r.due }); }
      if (st === 'soon') s.soon++;
    });
    state.entries.forEach(function (e) {
      if (['draft', 'returned', 'submitted'].indexOf(e.status) >= 0) {
        var w = entryWarnings(e, state);
        if (e.status === 'submitted' && w.balance) s.attention.push({ kind: 'balance', sev: 2, entryId: e.id, detail: w.balance });
        if (w.duplicates.length) s.attention.push({ kind: 'duplicate', sev: 3, entryId: e.id, detail: w.duplicates });
      }
      if (e.status === 'returned') s.attention.push({ kind: 'returned', sev: 4, entryId: e.id, detail: e.returnComment });
      if (e.status === 'rejected') s.attention.push({ kind: 'rejected', sev: 5, entryId: e.id, detail: e.rejectReason });
    });
    s.attention.sort(function (a, b) { return a.sev - b.sev; });
    return s;
  }

  /* ---------- demo data ---------- */
  function seedState(todayISO) {
    var saved = clockFn;
    var st = emptyState();
    var T = todayISO || todayLocal();
    var dom = parseISO(T).getUTCDate();
    st.users = [
      { id: 'aina', name: 'Aina', role: 'clerk' }, { id: 'daniel', name: 'Daniel', role: 'clerk' },
      { id: 'am', name: 'Account Manager', role: 'approver' }, { id: 'partner', name: 'Partner', role: 'approver' }
    ];
    st.matters = [
      { matterNo: 'M/2026/0142', clientName: 'Tan & Sons Sdn Bhd', title: 'Sale and purchase of shoplot', clientBalance: 25000 },
      { matterNo: 'M/2026/0151', clientName: 'Borneo Timber Sdn Bhd', title: 'Tenancy agreement', clientBalance: 3500 },
      { matterNo: 'M/2026/0163', clientName: 'Wong Mei Ling', title: 'Probate and administration', clientBalance: 12800.5 },
      { matterNo: 'M/2025/0388', clientName: 'Kinabalu Heritage Bhd', title: 'Loan documentation', clientBalance: 850 },
      { matterNo: 'M/2026/0170', clientName: 'Dayang Salmah', title: 'Divorce petition', clientBalance: 1200 },
      { matterNo: 'M/2026/0177', clientName: 'Lim & Associates Sdn Bhd', title: 'Share transfer', clientBalance: 40000 }
    ];
    function at(daysAgo, hh, mm) {
      var iso = addDays(T, -daysAgo);
      clockFn = function () { return new Date(iso + 'T' + pad(hh) + ':' + pad(mm || 0) + ':00+08:00'); };
    }
    function U(id) { return userById(st, id); }
    function apprDay(c) { return Math.min(c - 1, dom - 1); }
    function mk(uid, c, patch) { at(c, 9, 10); return saveEntry(st, U(uid), patch); }
    function sub(uid, e, c, reason) { at(c, 9, 40); return submitEntry(st, U(uid), e.id, { dupReason: reason }); }
    function ok(uid, e, c, reason) { at(apprDay(c), 15, 20); return approveEntry(st, U(uid), e.id, { balanceReason: reason }); }
    function dd(k) { return addDays(T, -k); }

    var e1 = mk('aina', 16, { type: 'bill', source: 'email', docDate: dd(17), payee: 'Tenaga Nasional Berhad', refNo: 'TNB-2609-48812', description: 'Electricity, office floor 3', category: 'Utilities', netAmount: 842.1, taxAmount: 0, ledger: 'office' });
    sub('aina', e1, 16); ok('am', e1, 16);
    var e2 = mk('daniel', 15, { type: 'bill', source: 'whatsapp', docDate: dd(16), payee: 'Unifi Business', refNo: 'UB-558120', description: 'Internet subscription', category: 'Telecoms', netAmount: 376.42, taxAmount: 22.58, ledger: 'office' });
    sub('daniel', e2, 15); ok('partner', e2, 15);
    at(Math.max(0, apprDay(15) - 1), 17, 5);
    createBatch(st, U('am'), [e1.id, e2.id]);

    var e3 = mk('aina', 6, { type: 'payment', source: 'scan', docDate: dd(6), payee: 'Pos Laju', refNo: 'PL-2026-30112', description: 'Courier, bundle to Kuching', category: 'Courier & postage', netAmount: 86.5, taxAmount: 0, ledger: 'office' });
    sub('aina', e3, 6); ok('am', e3, 6);
    var e4 = mk('aina', 9, { type: 'payment', source: 'email', docDate: dd(9), payee: 'Judiciary e-Filing', refNo: 'EF-77120', description: 'Filing fee, originating summons', category: 'Court fees', netAmount: 300, taxAmount: 0, ledger: 'client', matterNo: 'M/2026/0142' });
    sub('aina', e4, 9); ok('partner', e4, 9);
    var e5 = mk('daniel', 2, { type: 'payment', source: 'scan', docDate: dd(2), payee: 'Stamp Office (LHDN)', refNo: 'SD-2026-9917', description: 'Stamp duty, tenancy agreement', category: 'Stamp duty', netAmount: 4500, taxAmount: 0, ledger: 'client', matterNo: 'M/2026/0151' });
    sub('daniel', e5, 2);
    var e6 = mk('aina', 2, { type: 'bill', source: 'upload', docDate: dd(3), payee: 'Popular Book Co', refNo: 'PBC-884201', description: 'Stationery and file covers', category: 'Stationery & printing', netAmount: 140.47, taxAmount: 8.43, ledger: 'office' });
    sub('aina', e6, 2);
    var e7 = mk('daniel', 3, { type: 'receipt', source: 'whatsapp', docDate: dd(3), payee: 'Dayang Salmah', refNo: 'TT-20261019', description: 'Client deposit, fund transfer', category: 'Client deposit', netAmount: 5000, taxAmount: 0, ledger: 'client', matterNo: 'M/2026/0170' });
    sub('daniel', e7, 3);
    var e8 = mk('aina', 12, { type: 'bill', source: 'email', docDate: dd(12), payee: 'Printing Kerani', refNo: 'PR-7781', description: 'Binding and printing, 12 sets', category: 'Stationery & printing', netAmount: 240, taxAmount: 0, ledger: 'office' });
    sub('aina', e8, 12); ok('am', e8, 12);
    var e9 = mk('daniel', 3, { type: 'bill', source: 'email', docDate: dd(3), payee: 'Printing Kerani', refNo: 'PR-7781', description: 'Binding and printing, 12 sets (re-issued)', category: 'Stationery & printing', netAmount: 240, taxAmount: 0, ledger: 'office' });
    sub('daniel', e9, 3, 'Supplier re-issued the invoice after a correction; original to be credited.');
    mk('daniel', 1, { type: 'payment', source: 'scan', docDate: dd(6), payee: 'pos laju', refNo: 'PL-2026-30113', description: 'Courier, bundle to Kuching', category: 'Courier & postage', netAmount: 86.5, taxAmount: 0, ledger: 'office' });
    var e11 = mk('aina', 4, { type: 'payment', source: 'scan', docDate: dd(5), payee: 'Land Office', refNo: '', description: 'Search fee', category: 'Search & registration fees', netAmount: 120, taxAmount: 0, ledger: 'client', matterNo: 'M/2026/0163' });
    sub('aina', e11, 4);
    at(Math.max(0, apprDay(4)), 16, 10);
    returnEntry(st, U('am'), e11.id, 'Attach the official receipt and confirm the search was for this matter.');
    var e12 = mk('daniel', 5, { type: 'bill', source: 'whatsapp', docDate: dd(5), payee: 'Kopitiam Sentral', refNo: '', description: 'Team lunch', category: 'Other', netAmount: 54, taxAmount: 0, ledger: 'office' });
    sub('daniel', e12, 5);
    at(Math.max(0, apprDay(5)), 16, 30);
    rejectEntry(st, U('partner'), e12.id, 'Personal expense, not reimbursable by the firm.');
    mk('aina', 1, { type: 'bill', source: 'email', docDate: dd(1), payee: 'Landlord Properties Sdn Bhd', refNo: 'RENT-2610', description: 'Office rent, October', category: 'Rent', netAmount: 3800, taxAmount: 0, ledger: 'office' });
    at(0, 9, 5);
    addInboxItem(st, U('aina'), { source: 'whatsapp', rawText: 'Bill from Pos Laju invoice no PL-2026-33018 RM 42.30 dated 21 Oct 2026' });
    at(0, 9, 12);
    addInboxItem(st, U('daniel'), { source: 'email', attachments: [{ name: 'tnb_oct2026.pdf', size: 184320, type: 'application/pdf' }] });
    at(0, 9, 20);
    addInboxItem(st, U('aina'), { source: 'scan', attachments: [{ name: 'stamp_duty_receipt.jpg', size: 622592, type: 'image/jpeg' }] });

    /* Demo reminders, dated relative to today. */
    var prev = T.slice(0, 7);
    var py = +prev.slice(0, 4), pm = +prev.slice(5, 7) - 1;
    if (pm < 1) { pm = 12; py--; }
    var per = py + '-' + pad(pm);
    at(0, 8, 0);
    function rem(kind, title, off, period, done) {
      var r = addReminder(st, U('am'), { kind: kind, title: title, period: period, due: addDays(T, off) });
      if (done) markReminderDone(st, U('am'), r.id, done.ref, done.amount);
      return r;
    }
    rem('EPF', 'EPF contribution, wages ' + per, -5, per);
    rem('SOCSO', 'SOCSO contribution, wages ' + per, 4, per);
    rem('EIS', 'EIS contribution, wages ' + per, 19, per);
    rem('PCB', 'PCB remittance, wages ' + per, 19, per);
    rem('CUSTOM', 'CP204 tax estimate instalment', 33, '');
    rem('CUSTOM', 'Annual return (SSM)', 58, '');
    rem('EPF', 'EPF contribution, wages (two months back)', -35, '', { ref: 'KWSP-ACK-88102', amount: 4290 });

    clockFn = saved;
    return st;
  }

  /* ---------- self tests ---------- */
  function runSelfTests(todayISO) {
    var results = [], saved = clockFn;
    var T = todayISO || todayLocal();
    function t(group, name, fn) {
      var pass = false, detail = '';
      try { var r = fn(); pass = r === true || r === undefined; if (r !== true && r !== undefined) detail = String(r); } catch (err) { detail = 'threw ' + (err.code || err.name) + ': ' + err.message; }
      results.push({ group: group, name: name, pass: pass, detail: detail });
    }
    function eq(a, b) { return JSON.stringify(a) === JSON.stringify(b) ? true : 'expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a); }
    function throwsCode(fn, code) {
      try { fn(); } catch (err) { return err.code === code ? true : 'expected ' + code + ' got ' + (err.code || err.message); }
      return 'expected ' + code + ' but nothing was thrown';
    }
    function fresh() { return seedState(T); }
    function byPayee(st, payee, status) { return st.entries.filter(function (e) { return e.payee === payee && (!status || e.status === status); })[0]; }
    function baseDraft(extra) {
      var p = { type: 'bill', docDate: T, payee: 'Test Supplier', refNo: 'T-1', description: 'x', category: 'Other', netAmount: 100, taxAmount: 6, ledger: 'office', matterNo: '' };
      Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
      return p;
    }

    t('R1', 'Client ledger without a matter number is rejected', function () {
      var st = fresh();
      var e = baseDraft({ ledger: 'client', matterNo: '' });
      return eq(validateEntry(e, st).matterNo, 'matter_required');
    });
    t('R1', 'Unknown matter number is rejected, known matter passes', function () {
      var st = fresh();
      var a = validateEntry(baseDraft({ ledger: 'client', matterNo: 'M/9999/0000' }), st).matterNo;
      var b = validateEntry(baseDraft({ ledger: 'client', matterNo: 'M/2026/0142' }), st).matterNo;
      return eq([a, b], ['matter_unknown', undefined]);
    });
    t('R1', 'Submit of a client entry without a matter throws VALIDATION', function () {
      var st = fresh(), u = userById(st, 'aina');
      var e = saveEntry(st, u, baseDraft({ ledger: 'client', matterNo: '' }));
      return throwsCode(function () { submitEntry(st, u, e.id); }, 'VALIDATION');
    });
    t('R2', 'Total = net + tax, rounded to 2 decimals', function () {
      var st = fresh(), u = userById(st, 'aina');
      var e = saveEntry(st, u, baseDraft({ netAmount: 0.1, taxAmount: 0.2 }));
      var f = saveEntry(st, u, baseDraft({ netAmount: 1234.5, taxAmount: 74.07, refNo: 'T-2' }));
      return eq([e.totalAmount, f.totalAmount], [0.3, 1308.57]);
    });
    t('R2', 'Total is recomputed when net or tax is edited', function () {
      var st = fresh(), u = userById(st, 'aina');
      var e = saveEntry(st, u, baseDraft());
      saveEntry(st, u, { netAmount: 200.005 }, e.id);
      return eq([e.netAmount, e.totalAmount], [200.01, 206.01]);
    });
    t('R3', 'Same payee + total + date is flagged (case and spacing ignored)', function () {
      var st = fresh();
      var d = byPayee(st, 'pos laju', 'draft');
      return eq(findDuplicates(d, st.entries).map(function (x) { return x.id; }), [byPayee(st, 'Pos Laju', 'approved').id]);
    });
    t('R3', 'Submitting a duplicate needs an override reason', function () {
      var st = fresh(), u = userById(st, 'daniel');
      var d = byPayee(st, 'pos laju', 'draft');
      var first = throwsCode(function () { submitEntry(st, u, d.id); }, 'DUPLICATE');
      if (first !== true) return first;
      submitEntry(st, u, d.id, { dupReason: 'Second parcel, same day and same fee.' });
      return eq([d.status, d.duplicateOverrideReason !== ''], ['submitted', true]);
    });
    t('R3', 'Same ref + payee is flagged even when date and amount differ', function () {
      var st = fresh();
      var probe = baseDraft({ payee: 'Printing Kerani', refNo: 'pr-7781', netAmount: 999, docDate: addDays(T, -40) });
      probe.totalAmount = 999; probe.id = null;
      return findDuplicates(probe, st.entries).length === 2 ? true : 'expected 2 matches';
    });
    t('R3', 'Rejected entries are not treated as duplicates', function () {
      var st = fresh();
      var rej = byPayee(st, 'Kopitiam Sentral', 'rejected');
      var probe = baseDraft({ payee: 'Kopitiam Sentral', netAmount: 54, docDate: rej.docDate }); probe.totalAmount = 54; probe.id = null;
      return eq(findDuplicates(probe, st.entries).length, 0);
    });
    t('R4', 'Creator cannot approve their own entry', function () {
      var st = fresh(), am = userById(st, 'am');
      var e = saveEntry(st, am, baseDraft());
      submitEntry(st, am, e.id);
      return throwsCode(function () { approveEntry(st, am, e.id); }, 'SELF_APPROVAL');
    });
    t('R4', 'A different approver can approve it', function () {
      var st = fresh(), am = userById(st, 'am');
      var e = saveEntry(st, am, baseDraft());
      submitEntry(st, am, e.id);
      approveEntry(st, userById(st, 'partner'), e.id);
      return eq([e.status, e.approvedBy], ['approved', 'partner']);
    });
    t('R4', 'A clerk cannot approve', function () {
      var st = fresh();
      var e = st.entries.filter(function (x) { return x.status === 'submitted'; })[0];
      return throwsCode(function () { approveEntry(st, userById(st, 'aina'), e.id); }, 'FORBIDDEN');
    });
    t('R5', 'Reject needs a reason', function () {
      var st = fresh(), e = byPayee(st, 'Popular Book Co', 'submitted');
      var a = throwsCode(function () { rejectEntry(st, userById(st, 'am'), e.id, '  '); }, 'REASON_REQUIRED');
      if (a !== true) return a;
      rejectEntry(st, userById(st, 'am'), e.id, 'Not our invoice.');
      return eq([e.status, e.rejectReason], ['rejected', 'Not our invoice.']);
    });
    t('R5', 'Return needs a comment and goes back to the creator for editing', function () {
      var st = fresh(), e = byPayee(st, 'Popular Book Co', 'submitted');
      var a = throwsCode(function () { returnEntry(st, userById(st, 'am'), e.id, ''); }, 'REASON_REQUIRED');
      if (a !== true) return a;
      returnEntry(st, userById(st, 'am'), e.id, 'Add the tax breakdown.');
      saveEntry(st, userById(st, 'aina'), { description: 'Stationery, with tax breakdown' }, e.id);
      return eq([e.status, e.returnComment, e.createdBy], ['returned', 'Add the tax breakdown.', 'aina']);
    });
    t('R5', 'Another clerk cannot edit a returned entry', function () {
      var st = fresh(), e = byPayee(st, 'Land Office', 'returned');
      return throwsCode(function () { saveEntry(st, userById(st, 'daniel'), { description: 'hack' }, e.id); }, 'NOT_OWNER');
    });
    t('R6', 'Approved entries cannot be edited', function () {
      var st = fresh(), e = byPayee(st, 'Pos Laju', 'approved');
      return throwsCode(function () { saveEntry(st, userById(st, 'aina'), { netAmount: 1 }, e.id); }, 'IMMUTABLE');
    });
    t('R6', 'Reopen needs approver and a reason, then the entry is editable again', function () {
      var st = fresh(), e = byPayee(st, 'Pos Laju', 'approved');
      var a = throwsCode(function () { reopenEntry(st, userById(st, 'aina'), e.id, 'x'); }, 'FORBIDDEN');
      var b = throwsCode(function () { reopenEntry(st, userById(st, 'am'), e.id, ''); }, 'REASON_REQUIRED');
      if (a !== true) return a;
      if (b !== true) return b;
      reopenEntry(st, userById(st, 'am'), e.id, 'Wrong ledger');
      saveEntry(st, userById(st, 'aina'), { description: 'fixed' }, e.id);
      return eq([e.status, e.approvedBy], ['returned', '']);
    });
    t('R6', 'Exported entries cannot be reopened', function () {
      var st = fresh(), e = byPayee(st, 'Tenaga Nasional Berhad', 'exported');
      return throwsCode(function () { reopenEntry(st, userById(st, 'am'), e.id, 'x'); }, 'EXPORTED_LOCKED');
    });
    t('R7', 'Client payment above the matter balance is flagged', function () {
      var st = fresh(), e = byPayee(st, 'Stamp Office (LHDN)', 'submitted');
      var b = balanceBreach(e, st);
      return eq([b.balance, b.total, b.shortBy], [3500, 4500, 1000]);
    });
    t('R7', 'Approval is blocked without an override reason, allowed with one', function () {
      var st = fresh(), e = byPayee(st, 'Stamp Office (LHDN)', 'submitted'), am = userById(st, 'am');
      var a = throwsCode(function () { approveEntry(st, am, e.id); }, 'BALANCE_OVERRIDE_REQUIRED');
      if (a !== true) return a;
      approveEntry(st, am, e.id, { balanceReason: 'Client topped up by cheque, banking in tomorrow.' });
      return eq([e.status, e.balanceOverrideReason !== ''], ['approved', true]);
    });
    t('R7', 'Receipts and in-balance payments are not flagged', function () {
      var st = fresh();
      return eq([balanceBreach(byPayee(st, 'Dayang Salmah', 'submitted'), st), balanceBreach(byPayee(st, 'Judiciary e-Filing', 'approved'), st)], [null, null]);
    });
    t('R8', 'Every state change writes an audit event with the acting user', function () {
      var st = fresh(), aina = userById(st, 'aina'), am = userById(st, 'am'), n0 = st.audit.length;
      var e = saveEntry(st, aina, baseDraft({ payee: 'Audit Probe' }));
      saveEntry(st, aina, { description: 'changed' }, e.id);
      submitEntry(st, aina, e.id);
      returnEntry(st, am, e.id, 'again');
      submitEntry(st, aina, e.id);
      approveEntry(st, am, e.id);
      reopenEntry(st, am, e.id, 'check');
      var ev = st.audit.slice(n0).filter(function (x) { return x.entryId === e.id; });
      return eq(ev.map(function (x) { return x.action + ':' + x.user; }),
        ['create:aina', 'edit:aina', 'submit:aina', 'return:am', 'submit:aina', 'approve:am', 'reopen:am']);
    });
    t('R8', 'Edit events carry before and after values', function () {
      var st = fresh(), aina = userById(st, 'aina');
      var e = saveEntry(st, aina, baseDraft({ payee: 'Diff Probe' }));
      saveEntry(st, aina, { payee: 'Diff Probe 2' }, e.id);
      var ev = st.audit.filter(function (x) { return x.entryId === e.id && x.action === 'edit'; })[0];
      return eq([ev.before.payee, ev.after.payee], ['Diff Probe', 'Diff Probe 2']);
    });
    t('R8', 'The audit log is append-only (no delete or rewrite API, ids unique and increasing)', function () {
      var st = fresh();
      var ids = st.audit.map(function (x) { return x.id; });
      var sorted = ids.slice().sort();
      var noDelete = !Core.deleteAudit && !Core.clearAudit;
      return noDelete && eq(ids, sorted) === true && new Set(ids).size === ids.length ? true : 'audit ids not unique/ordered or a delete API exists';
    });
    t('R8', 'Rejected submissions (self-approval, missing reason) write no audit event', function () {
      var st = fresh(), n0 = st.audit.length, am = userById(st, 'am');
      var e = saveEntry(st, am, baseDraft()); submitEntry(st, am, e.id);
      var n1 = st.audit.length;
      try { approveEntry(st, am, e.id); } catch (x) { /* expected */ }
      return eq(st.audit.length, n1);
    });
    t('R9', 'Export accepts only approved, not-yet-exported entries', function () {
      var st = fresh(), am = userById(st, 'am');
      var sub = st.entries.filter(function (x) { return x.status === 'submitted'; })[0];
      var exp = st.entries.filter(function (x) { return x.status === 'exported'; })[0];
      var a = throwsCode(function () { createBatch(st, am, [sub.id]); }, 'NOT_EXPORTABLE');
      var b = throwsCode(function () { createBatch(st, am, [exp.id]); }, 'NOT_EXPORTABLE');
      var c = throwsCode(function () { createBatch(st, am, []); }, 'NOTHING_SELECTED');
      return a === true && b === true && c === true ? true : [a, b, c].join(' | ');
    });
    t('R9', 'A batch stamps its id, locks the entries and cannot be created twice', function () {
      var st = fresh(), am = userById(st, 'am');
      var ids = st.entries.filter(function (x) { return x.status === 'approved'; }).map(function (x) { return x.id; });
      var b = createBatch(st, am, ids);
      var stamped = ids.every(function (id) { var e = findEntry(st, id); return e.status === 'exported' && e.exportBatchId === b.id; });
      var again = throwsCode(function () { createBatch(st, am, ids); }, 'NOT_EXPORTABLE');
      return stamped && again === true ? true : 'stamped=' + stamped + ' again=' + again;
    });
    t('R9', 'Only an approver can create a batch', function () {
      var st = fresh();
      var id = st.entries.filter(function (x) { return x.status === 'approved'; })[0].id;
      return throwsCode(function () { createBatch(st, userById(st, 'aina'), [id]); }, 'FORBIDDEN');
    });
    t('R9', 'A past batch re-downloads the same rows', function () {
      var st = fresh(), b = st.batches[0], ctx = ctxFor(st);
      var x = toDelimited(buildTable(b.snapshot, 'fox', st.settings.export, ctx), { delimiter: ',' });
      var y = toDelimited(buildTable(b.snapshot, 'fox', st.settings.export, ctx), { delimiter: ',' });
      return x === y && b.count === 2 ? true : 'rows differ or batch count wrong';
    });

    function P(s) { return parsePasted(s); }
    t('Parser', 'Invoice no, DD/MM/YYYY date and keyworded total', function () {
      var r = P('TNB bill\nInvoice No: TNB-2026-8841\nDate: 12/10/2026\nTotal due RM 1,234.56');
      return eq([r.amount, r.date, r.refNo], [1234.56, '2026-10-12', 'TNB-2026-8841']);
    });
    t('Parser', 'Payee after "Bill from", "12 Oct 2026" date, MYR amount, inv# ref', function () {
      var r = P('Bill from Unifi Business dated 5 Oct 2026 amount MYR 399.00 inv# UB123456');
      return eq([r.payee, r.date, r.amount, r.refNo], ['Unifi Business', '2026-10-05', 399, 'UB123456']);
    });
    t('Parser', 'Bahasa Malaysia text: kepada, DD-MM-YYYY, RM1500 with no space', function () {
      var r = P('Resit pembayaran kepada Mahkamah Tinggi Kota Kinabalu\n12-10-2026\nRM1500');
      return eq([r.payee, r.date, r.amount, r.type], ['Mahkamah Tinggi Kota Kinabalu', '2026-10-12', 1500, 'receipt']);
    });
    t('Parser', 'WhatsApp timestamp prefix is not read as the document date', function () {
      var r = P('[22/10/26, 9:15 am] Ah Meng: Payee: Syarikat Maju\nRM 85.50 on 3 Oct 2026');
      return eq([r.payee, r.date, r.amount], ['Syarikat Maju', '2026-10-03', 85.5]);
    });
    t('Parser', 'Last keyworded total wins over the subtotal', function () {
      var r = P('Subtotal RM 100.00\nSST RM 6.00\nTotal RM 106.00');
      return eq(r.amount, 106);
    });
    t('Parser', 'Impossible dates and text with nothing useful return empty fields', function () {
      var r = P('hello, 31/02/2026 see you');
      return eq([r.amount, r.date, r.refNo], [null, null, '']);
    });
    t('Parser', 'Simulated extractor matches file-name keywords and is flagged as simulated', function () {
      var a = simulateExtract('IMG_tnb_oct.pdf', T), b = simulateExtract('random.pdf', T);
      return eq([a.matched, a.simulated, a.payee, b.matched], [true, true, 'Tenaga Nasional Berhad', false]);
    });

    t('FoxPro', 'Default layout has the 15 agreed fields, uppercase, 10 characters or fewer', function () {
      var m = defaultFoxMap();
      return eq(m.map(function (x) { return x.name; }), ['DOCNO', 'DOCDATE', 'DOCTYPE', 'PAYEE', 'REFNO', 'DESCRIP', 'NETAMT', 'TAXAMT', 'TOTAMT', 'LEDGER', 'MATTERNO', 'CATEGORY', 'MAKER', 'CHECKER', 'APPRDATE'])
        === true && m.every(function (x) { return x.name.length <= 10 && x.name === x.name.toUpperCase(); }) && validateFoxMap(m).length === 0 ? true : 'default map invalid';
    });
    t('FoxPro', 'Validator flags names over 10 characters, lowercase, duplicates and unknown sources', function () {
      var p = validateFoxMap([
        { name: 'CLIENTMATTER', src: 'matterNo', enabled: true }, { name: 'payee', src: 'payee', enabled: true },
        { name: 'REFNO', src: 'refNo', enabled: true }, { name: 'REFNO', src: 'refNo', enabled: true },
        { name: 'ZZ', src: 'nope', enabled: true }, { name: 'SKIPPED_NAME_TOO_LONG', src: 'id', enabled: false }]);
      return eq(p.map(function (x) { return x.code; }), ['too_long', 'bad_name', 'duplicate', 'bad_source']);
    });
    t('FoxPro', 'Export formats dates, decimals and delimiter from settings', function () {
      var st = fresh(), cfg = clone(st.settings.export);
      cfg.dateFmt = 'DD/MM/YYYY'; cfg.decimal = ','; cfg.delimiter = ';';
      var tbl = buildTable([st.batches[0].snapshot[0]], 'fox', cfg, ctxFor(st));
      var csv = toDelimited(tbl, { delimiter: ';', decimal: ',', header: true });
      var line = csv.split('\r\n')[1];
      return /;\d{2}\/\d{2}\/\d{4};BILL;/.test(line) && /;842,10;/.test(line) ? true : line;
    });
    t('FoxPro', 'Header row can be switched off', function () {
      var st = fresh();
      var tbl = buildTable(st.batches[0].snapshot, 'fox', st.settings.export, ctxFor(st));
      return eq(toDelimited(tbl, { header: false }).split('\r\n').length, 3);
    });
    t('Export', 'Generic CSV neutralises spreadsheet formulas and quotes delimiters', function () {
      var tbl = { header: ['A', 'B'], rows: [['=HYPERLINK("x")', 'a,b'], ['-5 cash', 12.5]] };
      var csv = toDelimited(tbl, { neutralise: true });
      return eq(csv.split('\r\n').slice(1, 3), ["\"'=HYPERLINK(\"\"x\"\")\",\"a,b\"", "'-5 cash,12.50"]);
    });
    t('Export', 'JSON payload carries the batch id and every entry', function () {
      var st = fresh(), o = JSON.parse(buildJSON(st, st.batches[0]));
      return eq([o.batchId, o.entries.length], [st.batches[0].id, 2]);
    });

    t('Compliance', 'Statutory due date: 15th of next month, weekend roll next/prev/none', function () {
      return eq([statutoryDue('2026-10', 15, 'next'), statutoryDue('2026-10', 15, 'prev'), statutoryDue('2026-10', 15, 'none')], ['2026-11-16', '2026-11-13', '2026-11-15']);
    });
    t('Compliance', 'Due day is clamped to the month length (31st in February)', function () {
      return eq(statutoryDue('2026-01', 31, 'none'), '2026-02-28');
    });
    t('Compliance', 'Reminder status boundaries: overdue, due today, 7 days, 8 days, done', function () {
      var mk2 = function (off, st2) { return { due: addDays('2026-10-22', off), status: st2 || 'open' }; };
      return eq([-1, 0, 7, 8].map(function (o) { return reminderStatus(mk2(o), '2026-10-22'); }).concat(reminderStatus(mk2(-9, 'done'), '2026-10-22')),
        ['overdue', 'soon', 'soon', 'upcoming', 'done']);
    });
    t('Compliance', 'Generating statutory reminders does not duplicate an existing period', function () {
      var st = fresh(), am = userById(st, 'am');
      var a = generateStatutory(st, am, '2031-03').length, b = generateStatutory(st, am, '2031-03').length;
      return eq([a, b], [4, 0]);
    });
    t('Compliance', 'Payroll: EPF at 13% up to the threshold, 12% above, rounded up to the ringgit', function () {
      var r = calcPayroll([{ wage: 3000 }, { wage: 6000 }, { wage: 3333.33 }], defaultSettings().rates).rows;
      return eq([r[0].epfEr, r[0].epfEe, r[1].epfEr, r[1].epfEe, r[2].epfEr, r[2].epfEe], [390, 330, 720, 660, 434, 367]);
    });
    t('Compliance', 'Payroll: SOCSO and EIS apply to wages up to the ceiling only', function () {
      var r = calcPayroll([{ wage: 7000, pcb: 120 }], defaultSettings().rates);
      var x = r.rows[0];
      return eq([x.socsoEr, x.socsoEe, x.eisEr, x.eisEe, r.totals.pcb], [105, 30, 12, 12, 120]);
    });
    t('Compliance', 'Payroll entry patches skip zero amounts', function () {
      var r = calcPayroll([{ wage: 3000 }], defaultSettings().rates);
      return eq(payrollEntryPatches(r, '2026-10', T).map(function (p) { return p.payee; }), ['KWSP (EPF)', 'PERKESO (SOCSO)', 'PERKESO (EIS)']);
    });

    t('Seed', 'About 16 entries covering all seven statuses', function () {
      var st = fresh(), seen = {};
      st.entries.forEach(function (e) { seen[e.status] = 1; });
      return st.entries.length >= 15 && STATUSES.every(function (s) { return seen[s]; }) ? true : 'count ' + st.entries.length + ', statuses ' + Object.keys(seen).join(',');
    });
    t('Seed', 'Two duplicate pairs and one client payment over its balance', function () {
      var st = fresh();
      var dupEntries = st.entries.filter(function (e) { return ['draft', 'submitted', 'returned'].indexOf(e.status) >= 0 && findDuplicates(e, st.entries).length; });
      var breaches = st.entries.filter(function (e) { return e.status === 'submitted' && balanceBreach(e, st); });
      return eq([dupEntries.length, breaches.length], [2, 1]);
    });
    t('Seed', 'Reminders: one overdue, one due within 7 days, the rest upcoming or done', function () {
      var st = fresh(), c = { overdue: 0, soon: 0, upcoming: 0, done: 0 };
      st.reminders.forEach(function (r) { c[reminderStatus(r, T)]++; });
      return eq([c.overdue, c.soon, c.upcoming >= 3, c.done >= 1], [1, 1, true, true]);
    });
    t('Seed', 'Dashboard counts match the data', function () {
      var st = fresh(), s = dashboardStats(st, T);
      return eq([s.inbox, s.submitted, s.overdue, s.soon], [3, 4, 1, 1]);
    });

    t('Calendar', 'Month grid starts on the chosen weekday and covers the month (Oct 2026)', function () {
      var m = monthGrid('2026-10', 1), s = monthGrid('2026-10', 0);
      return eq([m.length, m[0][0].date, m[4][6].date, s.length, s[0][0].date, s[4][6].date], [5, '2026-09-28', '2026-11-01', 5, '2026-09-27', '2026-10-31']);
    });
    t('Calendar', 'Month grid height varies from 4 to 6 rows (Feb 2026 Sun/Mon start, Mar 2026 Mon start)', function () {
      return eq([monthGrid('2026-02', 0).length, monthGrid('2026-02', 1).length, monthGrid('2026-03', 1).length], [4, 5, 6]);
    });
    t('Calendar', 'Week days follow the week start; week start defaults to Monday', function () {
      var mon = weekDays('2026-10-22', 1), sun = weekDays('2026-10-22', 0);
      return eq([mon[0], mon[6], sun[0], sun[6], defaultSettings().weekStart, normWeekStart('0'), normWeekStart(undefined)],
        ['2026-10-19', '2026-10-25', '2026-10-18', '2026-10-24', 1, 0, 1]);
    });
    t('Calendar', 'Month shift clamps the day and rolls the year', function () {
      return eq([shiftMonth('2026-01-31', 1), shiftMonth('2028-01-31', 1), shiftMonth('2026-12-15', 1), shiftMonth('2026-01-10', -1), shiftMonth('2026-03-31', -1)],
        ['2026-02-28', '2028-02-29', '2027-01-15', '2025-12-10', '2026-02-28']);
    });
    t('Calendar', 'Deadlines layer lists every reminder on its due date with the reminder status', function () {
      var st = fresh(), ev = calendarEvents(st, T, { layers: { deadlines: true } }), c = {};
      ev.forEach(function (e) { c[e.status] = (c[e.status] || 0) + 1; });
      var okDates = ev.every(function (e) { return st.reminders.filter(function (r) { return r.id === e.reminderId; })[0].due === e.date; });
      return eq([ev.length, c.overdue, c.soon, c.upcoming, c.done, okDates], [7, 1, 1, 4, 1, true]);
    });
    t('Calendar', 'With every layer off nothing is returned; items sort by date, then layer', function () {
      var st = fresh(), none = calendarEvents(st, T, { layers: {} }), all = calendarEvents(st, T, {});
      var sorted = all.every(function (e, i) { return i === 0 || all[i - 1].date < e.date || (all[i - 1].date === e.date && LAYER_RANK[all[i - 1].layer] <= LAYER_RANK[e.layer]); });
      return eq([none.length, all.length > 20, sorted], [0, true, true]);
    });
    t('Calendar', 'A date range keeps only items inside it', function () {
      var st = fresh(), ev = calendarEvents(st, T, { from: T, to: addDays(T, 5) });
      return eq([ev.length > 0, ev.every(function (e) { return e.date >= T && e.date <= addDays(T, 5); })], [true, true]);
    });
    t('Calendar', 'Documents sit on their document date; inbox items on the day they arrived', function () {
      var st = fresh(), ev = calendarEvents(st, T, { layers: { documents: true } });
      var ok = ev.every(function (x) { var e = findEntry(st, x.entryId); return x.date === (e.docDate || localDateOf(e.createdAt)); });
      return eq([ev.length, ok], [st.entries.length, true]);
    });
    t('Calendar', 'Ledger filter keeps only that ledger and drops unfiled inbox items', function () {
      var st = fresh(), res = [];
      ['client', 'office'].forEach(function (l) { // inbox items default to the office ledger, so check both
        var ev = calendarEvents(st, T, { layers: { documents: true }, ledger: l });
        var want = st.entries.filter(function (e) { return e.ledger === l && e.status !== 'inbox'; }).length;
        res.push(ev.length === want && ev.every(function (e) { return e.ledger === l && e.status !== 'inbox'; }));
      });
      return eq(res, [true, true]);
    });
    t('Calendar', 'Approvals follow approvedAt and drop out when an entry is reopened', function () {
      var st = fresh(), before = calendarEvents(st, T, { layers: { approvals: true } }).length;
      reopenEntry(st, userById(st, 'am'), byPayee(st, 'Pos Laju', 'approved').id, 'Wrong ledger');
      return eq([before, calendarEvents(st, T, { layers: { approvals: true } }).length], [5, 4]);
    });
    t('Calendar', 'Export batches show once and leave a ledger filter they have no entries in', function () {
      var st = fresh(), L = { exports: true };
      var all = calendarEvents(st, T, { layers: L }), cl = calendarEvents(st, T, { layers: L, ledger: 'client' }), of = calendarEvents(st, T, { layers: L, ledger: 'office' });
      return eq([all.length, all[0].count, cl.length, of.length], [1, 2, 0, 1]);
    });
    t('Calendar', 'Summary: overdue and next-7-days agree with the dashboard; approved total agrees too', function () {
      var st = fresh(), ym = T.slice(0, 7), s = calendarSummary(st, T, ym), d = dashboardStats(st, T);
      var sum = round2(d.month.office.out + d.month.office.inn + d.month.client.out + d.month.client.inn);
      return eq([s.overdue, s.next7, s.overdueFirst, s.next7First, s.approvedTotal], [d.overdue, d.soon, addDays(T, -5), addDays(T, 4), sum]);
    });
    t('Calendar', 'ICS has one event per open deadline, CRLF line ends and all-day dates', function () {
      var st = fresh(), r = buildICS(st, {}), txt = r.text, open = st.reminders.filter(function (x) { return x.status !== 'done'; });
      var first = open.slice().sort(function (a, b) { return a.due < b.due ? -1 : 1; })[0];
      var n1 = (txt.match(/BEGIN:VEVENT/g) || []).length, n2 = (txt.match(/END:VEVENT/g) || []).length;
      return eq([r.count, n1, n2, /\r\n$/.test(txt), /(^|[^\r])\n/.test(txt), txt.indexOf('DTSTART;VALUE=DATE:' + first.due.replace(/-/g, '')) > 0, /UID:REM-\d+@accounts-intake-hub/.test(txt)],
        [open.length, open.length, open.length, true, false, true, true]);
    });
    t('Calendar', 'ICS neutralises injected lines, commas and semicolons in titles', function () {
      var st = fresh();
      addReminder(st, userById(st, 'am'), { kind: 'CUSTOM', title: 'Pay A, B; C\r\nATTENDEE:mailto:x@y.z', due: addDays(T, 3) });
      var unfolded = buildICS(st, {}).text.replace(/\r\n /g, '');
      return eq([unfolded.indexOf('SUMMARY:Pay A\\, B\\; C\\nATTENDEE:mailto:x@y.z') > 0, /^ATTENDEE/m.test(unfolded)], [true, false]);
    });
    t('Calendar', 'ICS lines fold at 75 octets (multi-byte safe) and unfold to the original text', function () {
      var st = fresh(), title = 'Bayaran balik kepada Pejabat Tanah dan Galian, Kota Kinabalu: yuran carian résumé ' + new Array(12).join('é');
      addReminder(st, userById(st, 'am'), { kind: 'CUSTOM', title: title, due: addDays(T, 5) });
      var txt = buildICS(st, {}).text, enc = new TextEncoder();
      var longest = Math.max.apply(null, txt.split('\r\n').map(function (l) { return enc.encode(l).length; }));
      return eq([longest <= 75, txt.replace(/\r\n /g, '').indexOf('SUMMARY:' + title.replace(/,/g, '\\,')) > 0], [true, true]);
    });
    t('Calendar', 'ICS carries no amounts, payees or matter numbers and omits finished deadlines', function () {
      var txt = buildICS(fresh(), {}).text;
      var leaks = ['Tenaga', 'Pos Laju', 'M/2026', 'RM ', 'KWSP-ACK'].filter(function (w) { return txt.indexOf(w) >= 0; });
      return eq([leaks, txt.indexOf('two months back') < 0], [[], true]);
    });

    clockFn = saved;
    return results;
  }

  return {
    TYPES: TYPES, LEDGERS: LEDGERS, SOURCES: SOURCES, STATUSES: STATUSES, CATEGORIES: CATEGORIES, SRC_FIELDS: SRC_FIELDS,
    setClock: setClock, nowISO: nowISO, todayLocal: todayLocal, localDateOf: localDateOf,
    round2: round2, clone: clone, fmtMoney: fmtMoney, fmtNumber: fmtNumber, fmtDate: fmtDate, fmtByPattern: fmtByPattern,
    parseISO: parseISO, addDays: addDays, diffDays: diffDays, rollDue: rollDue, statutoryDue: statutoryDue, reminderStatus: reminderStatus,
    defaultSettings: defaultSettings, defaultFoxMap: defaultFoxMap, emptyState: emptyState, seedState: seedState,
    userById: userById, userName: userName, isApprover: isApprover, findEntry: findEntry, findMatter: findMatter, ctxFor: ctxFor,
    blankEntry: blankEntry, validateEntry: validateEntry, findDuplicates: findDuplicates, balanceBreach: balanceBreach, entryWarnings: entryWarnings,
    computeTotal: computeTotal, saveEntry: saveEntry, addInboxItem: addInboxItem, cloneAsDraft: cloneAsDraft,
    submitEntry: submitEntry, approveEntry: approveEntry, rejectEntry: rejectEntry, returnEntry: returnEntry, reopenEntry: reopenEntry,
    validateFoxMap: validateFoxMap, buildTable: buildTable, toDelimited: toDelimited, createBatch: createBatch, buildJSON: buildJSON,
    parsePasted: parsePasted, simulateExtract: simulateExtract, calcPayroll: calcPayroll, payrollEntryPatches: payrollEntryPatches,
    addReminder: addReminder, generateStatutory: generateStatutory, markReminderDone: markReminderDone, dashboardStats: dashboardStats,
    CAL_LAYERS: CAL_LAYERS, normWeekStart: normWeekStart, monthGrid: monthGrid, weekDays: weekDays, shiftMonth: shiftMonth, monthBounds: monthBounds,
    calendarEvents: calendarEvents, calendarSummary: calendarSummary, buildICS: buildICS,
    audit: audit, runSelfTests: runSelfTests
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Core;
