# StockFlow progress

- [x] Roadmap 1–8: workspaces, Angular/Express builds, lint/format, local replica set, accessible shell.
- [x] Roadmap 9–16: hashed opaque sessions, scrypt, origin defense, rate limits, backend roles/users, Angular login/guards.
- [x] Roadmap 17–25: catalog persistence/APIs/screens, normalized uniqueness, filtering/pagination, validation.
- [x] Roadmap 26–34: append-only ledger, transactional stock APIs/forms/history, reorder alerts, rollback/concurrent receipts.
- [ ] Roadmap 35–46: order lifecycle and competing confirmations (next).
- [ ] Roadmap 47–65: dashboard/reports, expanded tests, seed, documentation, CI and real portfolio evidence.

## Checks actually run

- Full backend milestone: 27 tests passed in 11 files; integration tests use isolated real MongoDB databases.
- Both production builds, full lint and typecheck passed.
- Angular: 4 ChromeHeadless tests passed at authentication milestone. Later catalog/inventory builds passed; browser workflow pending.
- Real replica-set writable-primary, multi-document commit/rollback, ledger-failure rollback and concurrent receipts verified.

## Environment and blockers

- Existing origin retained; initial main 09b8d2c. No push yet: release checks remain.
- Docker Desktop unavailable; user approved local MongoDB and recording Docker verification as blocked.
- Isolated MongoDB 8.0 on 27018 uses tools/mongodb; existing service on 27017 untouched.
- Windows build/test processes need approved sandbox access.
- Admin deactivation/demotion prohibited to prevent lockout in this version.
- Existing .vscode content preserved and ignored.

## Commit evidence

Run `git log --reverse --oneline 09b8d2c..HEAD` for actual incremental hashes.
Latest feature: stock indicators 02a8d10; inventory tests follow in this commit.

- Roadmap 35: indexed order/line/history model, legal state transitions and safe integer totals. Build and domain test passed. Inventory test milestone: 65d6b30.

- Roadmap 36: validated draft creation/detail API with trusted price snapshots, server totals and unchanged stock. Build and real DB draft API test passed.

- Roadmap 37: optimistic draft-only edits, trusted recalculated totals and edit history. Build and 2 real DB order tests passed.

- Roadmap 38: paginated order status/search/date API plus Angular list/detail/history with actor names and price snapshots. Both production builds passed.

- Roadmap 39: real multi-line draft create/edit form, searchable product lookup, duplicate checks and server-authoritative save. Angular production build passed.

- Roadmap 40: complete transactional confirmation including mandatory conditional deduction and same-transaction ledger, trusted price recapture and Angular action. Both builds and 3 order API tests passed. Safety kept indivisible; follow-up 41/42 harden contention and ledger uniqueness.

- Roadmap 41: conditional order version lock and canonical product lock order reduce contention while retaining conditional stock deductions. Real competing confirmations: exactly one succeeds, stock 1, one movement, loser draft. Build and 4 order tests passed.

- Roadmap 42: unique database order/product/type ledger constraint and type-specific audit direction/reference validation. Build and 6 targeted tests passed; duplicate order movement rejected by MongoDB.

- Roadmap 43: admin-only fulfillment changes status/history atomically without stock mutation; Angular fulfill action. Both builds and 6 order tests passed, including staff denial and repeat rejection.

- Roadmap 44: transactional draft/confirmed cancellation with mandatory reason, exactly-once restoration/ledger and Angular action. Both builds and 7 order tests passed; fulfilled cancellation rejected.

- Roadmap 45: fixed normalized-ID use in domain drafts; verified blank cancellation, draft cancellation without restock and simultaneous duplicate confirmation. Build and 9 order tests passed.

- Roadmap 46: dedicated real-DB API races, all-product rollback and simultaneous cancellation; named unit/API/concurrency scripts. Full backend 40 tests passed, lint/typecheck passed. Resource-limited test workers fix default timeout under expensive scrypt; no security work-factor reduction. Order phase complete.

- Roadmap 47: protected dashboard aggregation of actual product quantities/valuation, reorder alerts, status counts and recent orders/movements. Build and real DB aggregation test passed.

- Roadmap 48: actual Angular dashboard summaries, reorder alerts, recent orders/activity, refresh and failure/empty states. Production build passed.

- Roadmap 49: actual category aggregation and accessible meter charts for order statuses/category units with text values. Both builds and dashboard DB test passed.

- Roadmap 50: inventory valuation/low-stock report with category/supplier/activity filters, full-filter totals and paginated rows. Build and 2 report/dashboard DB tests passed.

- Roadmap 51: filtered paginated order and movement reports with validated UTC date ranges, statuses, product/type filters and populated audit references. Build and 3 real report tests passed.

- Roadmap 52: filtered whole-result CSV exports capped at 10,000 records, formula neutralization, quote/newline escaping and UTF-8 BOM. Build and 5 export/report tests passed.

- Roadmap 53: Angular inventory/order/movement report filters, full-result totals, paginated tables, safe CSV downloads and meaningful empty/error states. Both builds and full lint passed. Reporting phase complete.

- Roadmap 54 plus required account screens: real admin Users UI, own-profile/settings persistence, applied catalog/order page-size preference and admin route guard. Both builds and 8 auth/RBAC tests passed, including login limit, missing Origin and profile role-spoof rejection.

- Roadmap 55: duplicate SKU, spoofed stock, invalid/fractional money, malformed ID and missing-reference API coverage. 3 real product API tests passed.

- Roadmap 56: draft fulfillment/processed-edit/price-spoof rejection, inactive confirmation, historical price preservation and whole-cancellation rollback at capacity. 12 real DB order tests passed.
