# StockFlow progress

- [x] Roadmap 1–8: workspaces, Angular/Express, lint/format, accessible shell, isolated replica set.
- [x] Roadmap 9–16: hashed opaque sessions, scrypt, origin/rate defenses, roles and Angular guards.
- [x] Roadmap 17–25: real catalog APIs/screens, normalized uniqueness, filtering and pagination.
- [x] Roadmap 26–34: audited transactional receipts/adjustments, movement history and stock alerts.
- [x] Roadmap 35–46: complete order lifecycle, bounded retries, exact-once deductions/restoration and real API races/rollback.
- [x] Roadmap 47–53: actual dashboard/charts/reports and formula-safe CSV exports.
- [x] Roadmap 54–60: Users/Settings, persisted preferences, hardening, expanded tests, authentic browser evidence and non-destructive demo seed.
- [x] Roadmap 61: validated OpenAPI contract covering 35 operations, served publicly, with cookie-session workflow examples. API build and 5 foundation tests passed.
- [x] Roadmap 62: documented actual models, indexes, transaction invariants, RBAC, security and operational limitations; checked against source and real concurrency tests.
- [ ] Roadmap 63–65: CI, README and full release verification (next).

## Checks actually run

- Latest full backend suite after service refactor: 53 tests passed in 17 files. One additional API contract test now passes.
- Both production builds passed. Latest full lint/typecheck passed at order/report milestones; repeat at release.
- Angular: 10 ChromeHeadless tests passed.
- Playwright: 2 real browser workflows passed, with catalog/stock/order/report CSV and staff API/navigation restrictions.
- Real MongoDB 8.0 replica set: commit/rollback, competing confirmations, multi-product rollback, duplicate confirmation and concurrent cancellation passed.
- Seed actually run on empty local stockflow: 6 products, 4 orders, persisted admin/staff accounts. Refuses nonempty databases.
- Screenshots/video in docs/screenshots and docs/demo are captured from actual isolated one-product E2E workflow, not the six-product seed.

## Blockers and limitations

- Docker Desktop unavailable; user approved local MongoDB and documenting Docker verification as blocked.
- Existing service on 27017 untouched; isolated workspace mongod on 27018.
- Windows build/browser processes need approved sandbox access.
- Admin deactivation/demotion prohibited to prevent lockout. CSV capped at 10,000 matching records.
- No cloud deployment performed; release push remains pending full checks.
- Existing origin/history and .vscode content preserved. Actual new commit dates used.

## Evidence

`git log --reverse --oneline 09b8d2c..HEAD` lists actual incremental hashes.
Latest hardening: 1362fde; demo seed follows in this commit.

- Additional architecture refactor: route adapters only validate/authorize/serialize; authentication/catalog/dashboard/report/read operations now reside in services with shared query schemas. Full API build, workspace lint and all backend regression tests passed.
