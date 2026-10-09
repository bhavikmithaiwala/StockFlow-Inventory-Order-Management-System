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
