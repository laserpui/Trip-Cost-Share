# Trip Cost Share v6 — Clean Core

This is a clean rebuild of the uploaded Trip Cost Share project. It keeps the existing Google Sheet schema but replaces the accumulated frontend/API patches with one coherent codebase.

## Main features

- Dashboard summary
- Participants: attendance dates + lodging nights in the same form
- Receipt/expense recording
- Multiple payers when needed
- Multiple line items per receipt
- Receipt image upload to Google Drive
- Exact-cent split calculations
- Attendance-date split
- Lodging-night split
- Selected equal split
- Person-day split
- Weighted split
- Manual per-person amounts
- Summary of responsibility vs. amount advanced
- Transfer recommendation (calculated only; no repayment-recording feature)
- Admin login and management
- Fast cached bootstrap + forced fresh refresh
- Idempotent create requests and short-lock write transactions

## Important: use the Upgrade ZIP for your current live site

The upgrade package intentionally does **not** contain `config.js`.

Keep your current `config.js` because it contains your real Google Apps Script Web App URL.

## Upgrade steps from the uploaded project

1. Back up the current GitHub repository and Google Sheet.
2. From the v6 upgrade ZIP, replace:
   - `index.html`
   - `admin.html`
   - `styles.css`
   - `app.js`
   - `admin.js`
   - `navigation.js`
3. Remove the old `ui-enhancements.js` from the repository. v6 does not use it.
4. Keep your existing `config.js` unchanged.
5. Replace Apps Script `Code.gs` with `apps-script/Code.gs` from v6.
6. In Apps Script Editor, run `setupDatabase()` **once** and grant permissions if requested.
7. Run `diagnoseSystem()` and inspect the Execution log/result. `errors` should be `[]`.
8. Deploy using the **existing** deployment:
   - Deploy → Manage deployments → Edit
   - New version
   - Deploy
   This keeps the same Web App URL.
9. Optional after deployment:
   - run `clearPerformanceCache()`
   - run `warmCache()`
10. Open the GitHub Pages site and use `Ctrl + F5` once.

## Do not run old migration functions

No v4/v5 migration is needed. The v6 schema is intentionally identical to the v5.8 schema.

## Database readiness

v6 never runs database setup automatically during a web request. If `setupDatabase()` has not been run after installing v6, the API returns `DB_NOT_READY` with a clear instruction instead of running expensive setup while users are trying to save data.

## Admin password

The default Admin password remains the one already used by the project. For a live site, you can change it from Apps Script by editing the local variable inside `changeAdminPassword()` and running that function once, then changing it back to `CHANGE_ME` in source.

## Performance behavior

- Browser snapshot default: 30 minutes
- Server bootstrap cache: 120 seconds
- Manual Refresh bypasses cache
- Writes invalidate server caches
- New receipt writes use short lock + batch writes
- Image upload happens before the spreadsheet lock
- Write responses are deltas, not full-database reloads

## Maintenance helpers

### `diagnoseSystem()`

Checks:

- required sheets
- required headers
- row counts
- orphan ExpenseLines
- orphan ExpenseShares
- ExpenseShares referencing unknown participants

### `clearPerformanceCache()`

Clears server-side bootstrap/settings cache.

### `warmCache()`

Builds a fresh bootstrap cache after deployment.

## Files

- `index.html` public application
- `app.js` public application logic
- `admin.html` Admin application
- `admin.js` Admin logic
- `navigation.js` page navigation
- `styles.css` UI styles
- `config.js` sample placeholder in the full package only
- `config.example.js` example settings
- `apps-script/Code.gs` Google Apps Script API
- `AUDIT_REPORT.md` full audit findings
- `TEST_REPORT.md` test coverage/results
- `tests/` local logic/static tests
