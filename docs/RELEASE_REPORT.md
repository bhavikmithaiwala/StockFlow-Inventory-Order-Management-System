# StockFlow delivery report

The Angular TypeScript frontend, Express TypeScript backend and MongoDB persistence are implemented in the existing repository. Local release checks passed and the code release `6ae1810` was pushed normally to the existing origin/main; remote Git confirmed the same full hash. Initial commit `09b8d2c`, existing remote/history and unrelated .vscode content were preserved. Author/committer dates are actual development timestamps.

## Implemented scope

Authentication includes salted scrypt passwords, hashed opaque eight-hour sessions, HttpOnly/SameSite Strict cookies (Secure in production), active-user/expiry checks, logout revocation, origin enforcement, rate-limited login and server-side admin/staff permissions. Angular handles login, protected navigation and expired sessions without storing tokens in localStorage.

Catalog includes category/supplier management, contacts, active references and safeguards; products have unique normalized SKUs, descriptions, integer-cent prices, categories/suppliers, search/filter/sort/pagination, create/edit/detail and soft deactivation. Stock starts at zero and changes only through transactional audited operations. Receipts, admin adjustments, actor/reason/before-after movements, filters and reorder/out-of-stock indicators are real persisted features.

Orders support multi-product editable drafts, trusted price snapshots/totals, confirmation with conditional stock deduction, atomic ledger writes, bounded retries and all-line rollback. Fulfillment changes status without deducting twice. Draft cancellation changes no stock; confirmed cancellation restores stock once with a required reason. Terminal transitions and duplicate actions return explicit conflicts. Actor/timestamp history is visible in Angular.

Dashboard aggregates, category/order charts, recent activity, inventory valuation, low-stock/order/movement reports and filtered CSV derive from database records. CSV is quoted and formula-safe. Admin user management and personal name/page-size preferences persist. UI includes responsive layout, labels/focus and loading/error/empty states. The development seed creates six products and four orders through real services and refuses nonempty data.

Release tooling includes workspaces, lint/format/typecheck/build scripts, local replica-set startup/init/probe, complete 36-operation OpenAPI contract, architecture/RBAC docs, isolated unit/API/concurrency/browser tests, real screenshots/video, GitHub Actions and compiled full-stack serving with readiness/deep-link handling.

## Commit evidence

Delivery contains **69 meaningful new commits**: all 65 roadmap steps plus service-boundary refactoring, test-runtime security correction, a verified Linux CI launcher correction and this final evidence report. [COMMITS.md](COMMITS.md) lists actual hashes/timestamps through the verified code/CI release; `node scripts/commit-report.mjs` prints every current commit, including this report's commit. [Published history](https://github.com/bhavikmithaiwala/StockFlow-Inventory-Order-Management-System/commits/main) includes all commits.

| Work                                            | Roadmap count | First / final milestone                  |
| ----------------------------------------------- | ------------- | ---------------------------------------- |
| Foundation, shell and local replica set         | 8             | 99c501d / e3ae2ea                        |
| Authentication and roles                        | 8             | 0be7844 / 9b6c56b                        |
| Catalog APIs and Angular forms                  | 9             | dfca25d / f726a24                        |
| Inventory, audit and alerts                     | 9             | c17deb0 / 65d6b30                        |
| Orders and concurrency                          | 12            | cd8136e / 87df9d7                        |
| Dashboard/reports/CSV                           | 7             | 2c5d2ad / 3e43c05                        |
| Hardening, Users/Settings, tests and seed       | 7             | cccb042 / 6a7cea8                        |
| API/architecture docs, CI, README and readiness | 5             | 57802a4 / 6ae1810                        |
| Additional service responsibility refactor      | 1             | 0bbaad7                                  |
| Additional vulnerable test-runtime correction   | 1             | dc72533                                  |
| Additional Linux CI launcher/runtime correction | 1             | 4783bb5                                  |
| Final delivery evidence                         | 1             | This report commit; see current Git HEAD |

## Verification

[Detailed local results](VERIFICATION.md): clean npm ci; full lint/format/typecheck and both builds; **55 backend tests** (8 unit + 47 API/integration), including 3 separately rerun real concurrency cases; **10 Angular ChromeHeadless tests**; **2 Playwright workflows**; real MongoDB multi-document commit/rollback; production browser login/navigation, Secure cookie flags, readiness and static/deep-link/404 behavior; OpenAPI/YAML validation; zero runtime audit vulnerabilities. No failing automated local checks remain.

The E2E workflow and [recorded video](demo/stockflow-workflow.webm) show receipt, confirmation, fulfillment, cancellation, reporting/CSV and direct staff restrictions. [Dashboard](screenshots/dashboard.png), [orders](screenshots/orders.png), [movements](screenshots/movements.png) and [reports](screenshots/reports.png) screenshots are authentic browser captures. Test/probe data uses guarded isolated databases; the development seed is preserved.

Remote verification: the [corrected complete Actions run on 4783bb5](https://github.com/bhavikmithaiwala/StockFlow-Inventory-Order-Management-System/actions/runs/37944373998) **passed every stage**, including actual Compose health, transactions, backend/Angular/E2E, audit, production browser probe and evidence upload. The initial Ubuntu Chromium sandbox launcher was corrected to system Chrome for Karma. Local Docker execution remains blocked, as approved; Linux CI success does not claim local Docker execution.

## Start the application

This workstation has the replica set running. Its preserved .env selects the seeded StockFlow-Inventory-Order-Management-System database (2 users, 6 products, 4 orders, 9 movements, 113 units). In separate terminals at the root, run `npm run dev:api` and `npm run dev:client`, then open **http://localhost:4200**. API: **3000**; project MongoDB: **27018** (rs0); original service: **27017**, untouched. Admin: `admin@stockflow.test`; staff: `staff@stockflow.test`; both passwords: `StockFlowDemo!2026`. Fresh example defaults to stockflow; preserve existing .env.

For a fresh setup use [README.md](../README.md): npm ci, copy .env.example, start local mongod (or Compose), npm run db:init, transaction probe, then npm run seed only on an empty local database. [PRODUCTION.md](PRODUCTION.md) explains a compiled single-origin application on 3000. No paid service, cloud deployment or production secret is required for the local demo.

## 90-second demonstration

1. **0–10s:** Sign in as admin and show live dashboard/alerts. On a fresh seed choose the zero-stock Bubble wrap roll, or prepare another zero-stock product.
2. **10–25s:** Receive five units with a reason; inspect the receipt movement and quantity five.
3. **25–45s:** Draft four units and confirm. Show stock one and the single deduction movement.
4. **45–55s:** Fulfill as admin. Show stock remains one.
5. **55–75s:** Draft one, confirm, then cancel with a reason. Stock returns to one; show the restoration/history.
6. **75–85s:** Filter a report and download CSV. Show the actual valuation/low-stock indicator.
7. **85–90s:** Explain staff API restrictions and run `npm run test:concurrency --workspace @stockflow/api` to show the real competing-confirmation/rollback/restoration proofs. Use the recorded workflow when a live walkthrough needs more time.

## Remaining issues and limits

- Local Docker startup is blocked by absent Docker Desktop, as approved; local transactions use real MongoDB, not mocks.
- Six high development-tool audit findings remain through Karma/chokidar/braces with no patched braces release available. Critical test-worker issues were removed; runtime audit is clean. See [DEPENDENCIES.md](DEPENDENCIES.md).
- CSV is capped at 10,000 rows. Reports during concurrent edits are not point-in-time financial statements. Valuation uses selling price in USD, not purchase cost.
- Admin deactivation/demotion is prohibited to prevent lockout. Password reset, multiple warehouses/tenants and high availability are outside this implementation.
- Actual production operations need HTTPS, authenticated/restricted MongoDB, backups, explicit origin and shared rate limiting for multiple API replicas. No cloud deployment was performed.
