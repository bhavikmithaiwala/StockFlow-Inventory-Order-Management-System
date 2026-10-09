# Codex Task — Implement StockFlow in the Already-Cloned Repository

You are in the **existing local clone** of my GitHub StockFlow repository. The user already created the GitHub repository and cloned it to this computer. Do **not** create a new repository, call `git init`, or replace the configured `origin` remote.

The application is **StockFlow — Inventory & Order Management System**.

## Read before starting

Read the following files fully and use them as the product contract:

1. `AGENTS.md`
2. `docs/PROJECT_REFERENCE.md`
3. `docs/COMMIT_ROADMAP.md`

Use the official technical reference links at the end of the project reference document for current Angular, MongoDB, Express, and security practices. Do not copy other products' source code or claim features that are not implemented.

## Deliverable

Build an actual, working and documented **Angular + TypeScript frontend**, **Node.js + Express + TypeScript backend**, and **MongoDB persistence layer**.

The app must support:
- Admin and staff authentication and enforced role-based permissions.
- Categories, suppliers, products, SKU uniqueness, and inactive products.
- Stock receipt, stock adjustment, audited movement history, and reorder alerts.
- Order drafting, editing, confirming, fulfilling, and cancelling.
- Transaction-safe stock deduction, prevention of overselling under concurrent requests, and exactly-once stock restoration on valid cancellation.
- Dashboard analytics, reports, CSV export, search, filters, pagination, accessible responsive UI, and appropriate failure states.
- Local Docker Compose database, seed data, API docs, real test coverage, CI, README, architecture notes, and screenshots of the working product.

## Working method

1. First run `git status`, `git remote -v`, `git log -5 --oneline`, inspect the files and project state, and confirm `origin` points to the correct GitHub account. Do not overwrite existing content.
2. Scaffold frontend/backend within the cloned repository. Use a monorepo folder structure, keeping the existing Git metadata in place.
3. Implement the sequential roadmap in `docs/COMMIT_ROADMAP.md` with **at least 60 meaningful NEW commits**, targeting 65, and keep the commits scoped and understandable. Do not generate the entire application as one big change and arbitrarily fabricate commits afterward. Make each commit when the feature is genuinely implemented, reviewed, and checked.
4. Use real Git timestamps for newly performed work. Do not forge an October–December 2025 development history; that period may be used as a historical planning reference only.
5. Run relevant tests after each vertical feature and comprehensive checks at the end. Fix failures rather than reporting false positives. Use a real MongoDB transaction-capable replica set for concurrency and rollback tests.
6. Update `docs/PROGRESS.md` as you go with completed features, next steps, test results, and blockers. Continue autonomously across phases until complete or a real blocker stops you.
7. Build realistic demo fixtures, create a demo workflow, and include real screenshots. Do not claim a live demo until one is deployed.
8. Once all checks pass, check `origin/main` and push with normal fast-forward Git push if authenticated. Do not force-push, rewrite commits, or bypass remote changes. Do not purchase cloud hosting or leak credentials.

## Quality checks

Include npm scripts for:
- frontend/backend development
- frontend/backend lint
- frontend/backend TypeScript compilation and production builds
- backend unit tests
- API integration tests
- frontend component tests
- at least one E2E workflow in Playwright

Critical API tests must prove:
- Two simultaneous order confirmations competing for the same low stock cannot both succeed.
- If an order contains multiple products and one lacks stock, the entire transaction rolls back.
- A retry or double-click cannot deduct or restore stock twice.
- A staff user cannot access admin-only endpoints even if invoking the API directly.
- Monetary amounts, negative stock, duplicate SKU, malformed input, and inaccessible data produce consistent errors.

## Final report

Summarize what was actually implemented; number of new commits, their feature breakdown and hashes; commands to start the system; MongoDB/Angular/API ports; unit/integration/E2E test results; GitHub push status; security design; known limitations; and a 90-second working demo script.

Do not stop at the planning phase. Begin by reading the project reference files and inspecting this existing clone. Implement the first valid commit and continue through the roadmap.
