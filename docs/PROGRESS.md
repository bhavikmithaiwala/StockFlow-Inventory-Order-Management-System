# StockFlow progress

- [x] Roadmap 1–8: workspaces, Angular/Express, lint/format, accessible shell, isolated replica set.
- [x] Roadmap 9–16: hashed opaque sessions, scrypt, origin/rate defenses, roles and Angular guards.
- [x] Roadmap 17–25: real catalog APIs/screens, normalized uniqueness, filtering and pagination.
- [x] Roadmap 26–34: audited transactional receipts/adjustments, movement history and stock alerts.
- [x] Roadmap 35–46: complete order lifecycle, bounded retries, exact-once deductions/restoration and real API races/rollback.
- [x] Roadmap 47–53: actual dashboard/charts/reports and formula-safe CSV exports.
- [x] Roadmap 54–60: Users/Settings, persisted preferences, hardening, expanded tests, authentic browser evidence and non-destructive demo seed.
- [x] Roadmap 61: validated OpenAPI contract, now covering 36 operations including database readiness, served publicly, with cookie-session workflow examples.
- [x] Roadmap 62: documented actual models, indexes, transaction invariants, RBAC, security and operational limitations; checked against source and real concurrency tests.
- [x] Roadmap 63: GitHub Actions configured for replica-set probe, lint/format/typecheck/build, API/Angular/E2E tests, runtime audit and evidence artifacts. Workflow/Compose YAML checks, lint, OpenAPI validation and real local transaction probe passed. Remote run pending push.
- [x] Roadmap 64: setup/demo/test/architecture README with authentic screenshots/video, seed safeguards, role differences and honest Docker/dependency limitations. Evidence links and setup commands checked.
- [x] Roadmap 65: compiled full-stack serving, database readiness, production browser probe, clean install and full local release checks. Docker execution remains blocked under the approved local-MongoDB alternative.
- [x] Code release 6ae1810 pushed normally; remote HEAD matched; 67 meaningful new commits at that release.
- [ ] Next: verify corrected remote CI and publish final evidence report.

## Checks actually run

- Clean npm ci passed. Full workspace lint, formatting, typecheck and both production builds passed at release.
- Full backend: 55 tests in 17 files passed. Dedicated unit: 8; API/integration: 47; concurrency: 3 (included in API/full totals).
- Angular: 10 ChromeHeadless tests passed.
- Playwright: 2 real browser workflows passed, with catalog/stock/order/report CSV and staff API/navigation restrictions.
- Real MongoDB 8.0 replica set: commit/rollback, competing confirmations, multi-product rollback, duplicate confirmation and concurrent cancellation passed.
- Production Chrome probe passed: writable-primary readiness, compiled assets, deep links, login, Secure/HttpOnly/Strict cookies, authenticated navigation and safe missing API/asset behavior. Isolated probe DB cleaned up.
- OpenAPI 36 operations validated; workflow/Compose YAML checks passed; runtime audit reported zero vulnerabilities.
- First remote CI actually passed Docker Compose health, real transaction probe, lint/format/typecheck/build and backend tests. Karma launch failed on Ubuntu AppArmor for downloaded Chromium; corrected workflow selects system Google Chrome with its supported sandbox, explicit Ubuntu 24.04 and current action runtimes.
- Seed actually run on empty local stockflow: 6 products, 4 orders, persisted admin/staff accounts. Refuses nonempty databases.
- Screenshots/video in docs/screenshots and docs/demo are captured from actual isolated one-product E2E workflow, not the six-product seed.

## Blockers and limitations

- Docker Desktop unavailable; user approved local MongoDB and documenting Docker verification as blocked.
- Existing service on 27017 untouched; isolated workspace mongod on 27018.
- Windows build/browser processes need approved sandbox access.
- Admin deactivation/demotion prohibited to prevent lockout. CSV capped at 10,000 matching records.
- No cloud deployment performed. origin/main fetched and verified as an ancestor before the release push; no history rewriting.
- Existing origin/history and .vscode content preserved. Actual new commit dates used.

## Evidence

`git log --reverse --oneline 09b8d2c..HEAD` lists actual incremental hashes.
Incremental inventory and actual timestamps: COMMITS.md; generate the current complete report with node scripts/commit-report.mjs.

- Additional architecture refactor: route adapters only validate/authorize/serialize; authentication/catalog/dashboard/report/read operations now reside in services with shared query schemas. Full API build, workspace lint and all backend regression tests passed.
- Dependency hardening: upgraded/overrode Vitest to 4.1.11; all 54 backend tests, both builds and 10 Angular tests passed. Runtime audit: zero vulnerabilities. Six remaining high development findings through Karma/braces documented in DEPENDENCIES.md; no patched braces release is available.
