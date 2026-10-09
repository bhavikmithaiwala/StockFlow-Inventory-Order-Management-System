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
