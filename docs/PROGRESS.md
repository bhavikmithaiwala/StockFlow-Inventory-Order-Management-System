# StockFlow implementation progress

- [x] Read all project instructions; inspected branch, history, remote, and local files.
- [x] Roadmap 1: private npm workspace, development/check scripts, editor and ignore rules.
- [ ] Roadmap 2: Angular standalone client.

## Verification

- `npm run check:workspace`: passed before foundation commit.
- Remote `main` verified at `09b8d2c`; local branch starts at that same commit.
- Node 22.13.1 and npm 10.9.2 available.

## Next task and environment gaps

Scaffold and build the Angular client, then the Express API. Install dependencies with network access.
Docker and mongod are not on PATH; transaction tests require a real replica set before the phase 1 gate can pass.
No application tests or production builds have run yet. Existing `.vscode` files remain local and untouched.

- Roadmap 2 verified: Angular 20 standalone client, API proxy, production build and TypeScript check; 2 ChromeHeadless component tests passed. Foundation commit: 99c501d.
- User approved local MongoDB instead of Docker verification; Docker remains an explicitly documented gap.

- Roadmap 3 verified: Express 5 TypeScript API, validated environment, request IDs, safe JSON errors and graceful shutdown. Backend compilation and 3 Supertest/Vitest HTTP tests passed. Angular commit: 15eb7a2.
- Angular build/test sandbox access failures were resolved by executing with approved filesystem access.

- Roadmap 4: shared ESLint TypeScript/Angular template accessibility, Prettier and workspace typecheck scripts. Both workspace lint and typecheck passed. API foundation: c19ed7d.

- Roadmap 5: Compose replica-set configuration, isolated Windows startup/init scripts, API replica-set enforcement. Real MongoDB 8.0 primary established on 27018; multi-document commit/rollback probe passed. Docker startup unverified by user-approved exception. Lint tooling commit: 7f1acd3.

- Roadmap 6: responsive application shell, skip link, main landmark and adaptive sidebar. Angular production build passed; database setup commit: 2da94a6.

- Roadmap 7: lazy navigation and live system overview with retry, loading and API failure states; unknown routes redirect safely. Production build passed. Shell commit: 9aa5a34. Authenticated navigation follows auth integration rather than fabricated session state.

- Roadmap 8: accessible color/form/table tokens, visible keyboard focus, reduced-motion support. Production build and 2 ChromeHeadless tests passed. Navigation commit: 8547e5f. Phase 1 complete with Docker verification explicitly blocked; local replica-set transactions verified.

- Roadmap 9: user email/role validation and hashed-session schema with TTL/unique indexes and secret-field exclusion. Backend build and 5 tests passed. Design tokens commit: e3ae2ea.

- Roadmap 10: salted scrypt password hashing and development-only admin provisioning from environment, refusing account overwrite. API build and password test passed. Models commit: 0be7844.

- Roadmap 11: login/logout/me API, hashed opaque cookies, origin defense and central safe errors. API compilation and 2 real-MongoDB auth tests passed (login/me/logout, wrong credentials, foreign origin). Password provisioning commit: a1c2566.

- Roadmap 12: login rate limit, session last-used tracking, stronger scrypt work factor, expiry/deactivated/forged-cookie tests. API build and 5 targeted tests passed. Auth endpoints commit: 4addad5.

- Roadmap 13: backend role middleware and paginated admin user management, staff provisioning and lockout protection. API build and 2 real-database RBAC tests passed. Session security: f83ff7f.

- Roadmap 14: working reactive Angular login form with email/password validation, busy state and API error presentation. Production build passed. Backend RBAC: a03c9a5.

- Roadmap 15: typed API client and signal-backed current-user state; login updates the shell identity. No localStorage auth. Angular build passed. Login form: fbe18eb.

- Roadmap 16: server-verified route guard, logout and session-expiry interceptor. Angular build, 4 browser tests and full backend tests passed. Typed client: 886e2df. Phase 2 authentication/RBAC gate passed.

- Roadmap 17: normalized unique category schema and strict input validation. Build and schema test passed. Phase 2 commit: 9b6c56b; backend milestone 12 tests passed.

- Roadmap 18: category list/create/update APIs, admin writes, database uniqueness and reference safeguard. Build and real DB category API test passed.

- Roadmap 19: supplier contact persistence and paginated management API with strict email validation. Build and 2 catalog API tests passed. Category endpoints: 94e3e4c.

- Roadmap 20: normalized unique SKU, indexed product references, integer cents/stock constraints and strict product input excluding client quantity. Build and model test passed.

- Roadmap 21: product create/edit/detail/deactivate with trusted zero initial stock and active reference validation in transactions. API build and real DB lifecycle test passed.

- Roadmap 22: bounded product pagination, literal search, category/supplier/activity filters and allowlisted stable sorting. Build and 2 product API tests passed, including query-operator rejection. Product lifecycle: 72b6b81.

- Roadmap 23: Angular products search/filter/sort/pagination, real detail view, integer-cent formatting, loading/error/empty states. Production build passed.

- Roadmap 24: create/edit reactive product forms, paginated category/supplier lookup, active flag, integer validation and API error display. Angular build passed. Product views: ff35faf.

- Roadmap 25: real category/supplier management screens with pagination, admin create/edit/deactivate forms and contact details. Both builds and full lint passed; phase 3 catalog gate complete.

- Roadmap 26: append-only audited stock ledger with reconciliation validation and mutation guards. Build and ledger test passed. Catalog UI milestone: f726a24.

- Roadmap 27: receipt quantity/ledger transaction with conditional capacity check and bounded whole-transaction retries. Build and real DB receipt test passed.

- Roadmap 28: signed stock adjustments with nonzero integer/reason validation, conditional bounds and atomic movements. Build and 2 real DB inventory tests passed.

- Roadmap 29: receive/adjust endpoints derive actor from session; staff can receive, only admins adjust. Build and 3 real DB tests passed, including staff restrictions and actor spoof rejection.

- Roadmap 30: real stock receive/adjust form, product stock lookup, signed quantity/reason validation and post-commit stock refresh. Angular build passed.

- Roadmap 31: product/type/date-filtered paginated ledger API and Angular audit table with actor, delta, before/after and reason. Both builds and 4 real DB inventory tests passed.
