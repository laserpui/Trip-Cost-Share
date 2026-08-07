# Test Report — Trip Cost Share v6 Clean Core

## Automated static checks

Status: PASS

- `node --check app.js`
- `node --check admin.js`
- `node --check navigation.js`
- `node --check` on a `.js` copy of `apps-script/Code.gs`
- no duplicate HTML IDs
- no JavaScript `$()` references to missing HTML IDs
- no separate `data-page="lodging"` page
- no settlement-recording UI on the public index

## Calculation/API logic checks

Status: PASS

1. 1000.00 shared by 3 equal weights
   - 333.34
   - 333.33
   - 333.33
   - exact total 1000.00

2. 5000.00 with person-day weights 2:2:1
   - 2000.00
   - 2000.00
   - 1000.00
   - exact total 5000.00

3. Attendance split on 2026-08-09
   - includes only participants whose attendanceDates contain that date

4. Lodging split on night 2026-08-08
   - includes only participants whose lodgingNights contain that night

5. Public receipt creation
   - accepts only current public categories
   - legacy category values remain server-compatible for editing old records via Admin

## Schema compatibility

Status: PASS

`HEADERS` in v6 matches the uploaded v5.8 project exactly for:

- Settings
- Participants
- Receipts
- ExpenseLines
- ExpenseShares
- AdminLog

## Integration checklist after deployment

Run `diagnoseSystem()` after `setupDatabase()` and verify `errors` is an empty array. Then verify:

- add participant
- add one receipt with one payer / one line
- add a multi-payer receipt
- add a multi-line receipt
- lodging-night split
- edit receipt in Admin
- delete an unreferenced participant
- close/open event
- refresh from a second browser/device
