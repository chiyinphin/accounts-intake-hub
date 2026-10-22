# Accounts Intake Hub

Single-file accounts intake app for a law-firm accounts team. Capture bills, payments and receipts (WhatsApp / email / upload / scan), route them through maker/checker approval, track statutory due dates, and export approved entries to FoxPro-style DBF-import files, Excel, CSV or JSON.

The release artefact is one self-contained HTML file: `dist/accounts-intake-hub.html`. Open it directly in a browser; state is kept in `localStorage` (in-memory fallback if blocked).

> Demo data only. All names, matters and amounts are fictional.

## Layout

```
src/        core.js (pure rules engine) · i18n.js (EN/BM) · app.js (UI) · styles.css · dark.css · template.html
scripts/    build.js · test.js (core self-tests) · i18ncheck.js (EN/BM key + placeholder parity)
tests/      smoke.js (jsdom end-to-end flow, 113 checks)
dist/       accounts-intake-hub.html (release build)
```

## Commands

```
npm install
npm run build           # dist/accounts-intake-hub.html (standalone page, prod: test hook stripped)
npm run build:artifact  # same, as a fragment for the claude.ai artifact wrapper (no doctype/viewport meta)
npm run build:test      # .build/test-build.html (exposes window.__aih for tests)
npm run test:core       # 69 rule checks; optional date arg: node scripts/test.js 2026-12-31
npm run test:i18n
npm run test:smoke
npm test             # all of the above
```

Node >= 20. Runtime has no build dependency; SheetJS 0.18.5 is loaded from cdnjs for `.xlsx` export (CSV fallback if it fails to load). `jsdom` and `xlsx` are dev-only, for the smoke test.

## Calendar

The Calendar tab is a read-only view derived from existing data (nothing extra is stored). Layers: statutory and custom **deadlines** (overdue / due soon / upcoming / done), **documents** by document date (inbox items by capture date), **approvals** by approval date, and **exports** by batch. Month, week and agenda views; a day panel reuses the normal entry rows and reminder controls, so a deadline can be added or marked done from there. Filter by ledger (all / office / client); Monday or Sunday week start in Setup; English and Bahasa Malaysia date formats. Keyboard: arrow keys move between days, Home/End go to the week edges, Page Up/Down change month.

"Download deadlines (.ics)" exports open deadlines only (RFC 5545, with reminders two days and on the morning of). Amounts, payees and matter numbers are deliberately left out of the file. Public and state holidays are not included, because wrong holiday data is worse than none.

## Business rules (enforced in `src/core.js`)

1. Client-ledger entries require a matter number.
2. `total = net + tax`, rounded to 2 dp.
3. Duplicate detection (same payee with same total + date, or same payee with same ref no.; rejected and inbox items ignored) blocks submit unless an override reason is given.
4. A maker cannot approve their own entry.
5. Reject / return require a reason.
6. Approved entries are immutable; the only way back is Reopen, with a reason.
7. Client-ledger payment above the matter balance needs an approver override reason.
8. Every state change writes an append-only audit record with before/after.
9. Export includes only approved, not-yet-exported entries; each export is a batch snapshot.

## Export formats

- **FoxPro layout:** 15 uppercase fields, names <= 10 chars (`DOCNO, DOCDATE, DOCTYPE, PAYEE, REFNO, DESCRIP, NETAMT, TAXAMT, TOTAMT, LEDGER, MATTERNO, CATEGORY, MAKER, CHECKER, APPRDATE`). Field map, date format, delimiter, decimal mark, header row and BOM are configurable in Setup. Match these to the real DBF structure before first live import.
- **Generic CSV / xlsx:** cells starting with `=`, `+`, `-`, `@` are neutralised against formula injection.
- **JSON:** full entry snapshot for loading into PostgreSQL or SQL Accounting via your own importer.

## Statutory reminders

Due on the 15th of the following month, with weekend roll (next / previous / none) and month-length clamp. The payroll calculator uses placeholder rates (EPF 13% / 12% above RM5,000 and 11% employee; SOCSO 1.75% / 0.5% to a RM6,000 ceiling; EIS 0.2% / 0.2%). **Verify every rate against current KWSP / PERKESO / LHDN schedules before relying on any figure.**

## Integration hooks (stubs)

- `extractFromDocument(file)` in `src/app.js`: simulated extractor; replace with OCR / AI service.
- Export batches and JSON snapshot: intended seam for PostgreSQL / SQL Accounting sync.
- Users and roles are demo selections, not authentication. Put real access control in front of any production deployment.
