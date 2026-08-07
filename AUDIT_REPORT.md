# Audit Report — Trip Cost Share (uploaded project → v6 Clean Core)

## Scope

The uploaded archive `Trip Cost Share.rar` contains 10 project files. Nine core files were verified byte-for-byte (CRC/size) against the working v5.8 source set used in this conversation. The custom `config.js` is intentionally treated as user-specific configuration and is **not replaced** by the upgrade package.

Verified core files:

- `index.html`
- `admin.html`
- `app.js`
- `admin.js`
- `navigation.js`
- `styles.css`
- `ui-enhancements.js`
- `apps-script/Code.gs`
- `README_V5.8.md`

## Main problems found in the uploaded project

### 1. Multiple generations of code were mixed together

The archive contains v5.8 application/API files together with an older `ui-enhancements.js` from the v5.3.x UI generation. Version-specific cache keys and labels also came from several revisions. Even when a stale file is not currently loaded, this makes deployment and later maintenance error-prone.

**v6 fix:** one coherent frontend/API generation; `ui-enhancements.js` is removed completely.

### 2. Database setup could run automatically during normal requests

The old `ensureDatabaseReady_()` could call `setupDatabase()` automatically when its schema property did not match. Setup touches multiple sheets, headers and settings and is not appropriate on the normal request path.

**v6 fix:** normal requests never run setup. After installing v6, `setupDatabase()` is run manually once. If that has not been done, the API returns a clear `DB_NOT_READY` error.

### 3. Some Admin writes returned a full database reload

In v5.8, many Admin write operations finished by calling a fresh bootstrap. That means a simple edit could write data and then immediately re-read Participants, Receipts, ExpenseLines and ExpenseShares.

**v6 fix:** every write returns only the changed/deleted record(s). A full bootstrap is only used for initial load or explicit refresh.

### 4. Receipt editing rewrote too much data

The old receipt editing path used `replaceRowsWhere_()`, which rebuilt ranges for `ExpenseLines` and `ExpenseShares`. This becomes increasingly slow as the sheets grow.

**v6 fix:** edit/delete uses targeted row deletion for only the matching `receiptId`, followed by batch append of the replacement rows.

### 5. A 24-hour browser snapshot could display very stale data

The uploaded `app.js` allowed a local snapshot to live for 24 hours. The background sync eventually corrects it, but the first screen can look wrong or inconsistent, especially after Admin edits from another device.

**v6 fix:** default snapshot age is 30 minutes and remains configurable. Manual Refresh always forces fresh server data.

### 6. Receipt creation could be observed in a partially written state

A receipt consists of a Receipt row, ExpenseLines and ExpenseShares. Those are separate Sheet writes. A read request does not use the write lock, so it can theoretically arrive between writes.

**v6 fix:** new receipts write child rows first and the Receipt row last. Bootstrap filters orphan child rows, so readers do not see half-created receipts. Failed transactions attempt rollback.

### 7. Existing orphan rows could corrupt summaries

Failures from older versions can leave `ExpenseLines`/`ExpenseShares` that no longer have a valid parent Receipt/Line.

**v6 fix:** bootstrap only returns lines/shares with valid parents. `diagnoseSystem()` also reports orphan lines, orphan shares and unknown participant references.

### 8. Initial participant selection in a newly rendered expense line was fragile

The old UI had accumulated multiple render paths. During asynchronous load/re-render, an empty participant selector could be preserved instead of rebuilding the default eligible participants.

**v6 fix:** participant selectors only preserve a meaningful prior selection; otherwise they regenerate the correct defaults from attendance/lodging rules.

### 9. Lock duration was still unnecessarily complex

Older versions improved the lock problem, but several generations of locking/retry/caching logic remained layered together.

**v6 fix:**

- Drive image upload happens before Spreadsheet lock.
- Receipt validation/preparation happens before the lock.
- New receipt lock covers only final batch writes.
- `tryLock(5000)` returns a typed `BUSY` error rather than hanging indefinitely.
- Client retries `BUSY` with short backoff.
- Requests carry client-generated IDs so retrying a timed-out create is idempotent and does not duplicate data.

### 10. UI patches had become a maintenance risk

The original project had grown through many CSS/JS patches and navigation changes. This increased the chance of old selectors, duplicate behavior and performance effects surviving after later redesigns.

**v6 fix:** the public UI and Admin UI were rebuilt as a single clean set. No MutationObserver-driven decoration, no continuous background animation, and no live backdrop blur pipeline.

## v6 architecture

### Public pages

- Dashboard
- Participants — name + attendance dates + lodging nights in one form
- Expenses — receipt + payer(s) + line item(s) + split rule
- Admin link

There is no separate Lodging page and no recorded repayment/settlement function.

### Server data model

The existing Sheet schema is preserved exactly:

- Settings
- Participants
- Receipts
- ExpenseLines
- ExpenseShares
- AdminLog

A legacy `Settlements` sheet, if it exists, is left untouched and is not read.

### Write behavior

- `addParticipant` → delta response
- `addReceipt` → delta response
- `adminSaveSettings` → settings delta
- `adminSaveParticipant` → participant delta
- `adminSaveReceipt` → receipt/lines/shares delta
- deletes → deleted ID only

### Calculation rules

Supported split modes:

- Attendance on receipt date
- Lodging on selected night
- Selected people equally
- Person-days
- Weighted units
- Manual amounts
- Everyone equally

All calculations use integer cents for allocation, so totals are exact (for example 1,000 ÷ 3 becomes 333.34 + 333.33 + 333.33).

## Data safety

- No v6 migration rewrites existing records.
- Sheet headers are unchanged from v5.8.
- Upgrade package excludes `config.js`, so the deployed Apps Script URL is not overwritten.
- Existing legacy records remain readable for compatibility.
- Existing receipt files in Google Drive are not modified unless that receipt is explicitly edited/deleted in Admin.

## Tests completed locally

- JavaScript syntax: `app.js`, `admin.js`, `navigation.js` — PASS
- Apps Script JavaScript syntax (checked as JS): PASS
- HTML duplicate IDs: PASS
- JS → HTML element references: PASS
- Public page contains no separate lodging page: PASS
- Public page contains no settlement recording UI: PASS
- v5.8 vs v6 Sheet headers: exact match — PASS
- Exact-cent allocation 1,000 / 3: PASS
- Weighted person-day example: PASS
- Attendance-date eligibility: PASS
- Lodging-night eligibility: PASS
- Public creation rejects legacy-only category values: PASS

A real Google Apps Script/Google Sheet deployment still requires final integration verification after you deploy `Code.gs`, because the local environment cannot execute Google Spreadsheet/Drive services.
