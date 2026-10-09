# Instructions for Codex: StockFlow

Read `docs/PROJECT_REFERENCE.md` and `docs/COMMIT_ROADMAP.md` before editing. This is the **existing, already cloned** GitHub repository. DO NOT run `git init`, `gh repo create`, or replace `origin`.

## Delivery requirements
- Build and verify the Angular + TypeScript frontend, Node.js + Express + TypeScript backend, and MongoDB persistence.
- Minimum 60 **meaningful new** feature/refactor/test/docs commits; target 65 as listed in the roadmap. Each commit must represent real, tested changes. Do not fabricate, split empty commits, or create meaningless commits to meet the number.
- Use real author and committer dates for work performed. An October–December 2025 reference period is NOT authorization to falsely backdate new work.
- Never rebase, reset, or rewrite published commits without specific permission. Never force push.
- Keep useful work already in the repo; preserve unrelated local changes.
- Keep all changes reviewable and buildable. Run the most relevant test suite at milestones; run full checks at the end. Never assert that tests passed unless run.
- No cloud payments, secrets, production deployments, or destructive remote actions without confirmation.
- Use MongoDB transactions in a replica set for any multi-document stock/order update and test concurrency with a real transaction-capable database.
- Maintain a short `docs/PROGRESS.md` checklist that records implemented features, tests actually run, next task, and blockers as work progresses. Update it meaningfully during commits; do not create a progress-only commit for every feature.
- Use clear error codes; validate input; enforce all permissions server-side.
- No placeholder pages, fake success metrics, or fake screenshots in final release.

## Workflow
1. `git status`, `git remote -v`, `git log -5 --oneline`; inspect files and scripts.
2. Choose the next unfinished roadmap feature; implement it fully; run checks; commit the scoped changes.
3. Continue independently where possible. Ask only about genuine blockers such as external authentication, secrets, or destructive actions.
4. At the end run lint, type-check/build, backend unit/API tests, Angular tests, concurrency transaction test, E2E demonstration; document any gaps explicitly.
5. Push through a normal fast-forward only when configured and permitted, after verifying `origin/main`; no force pushes.

## Portfolio proof
README must include setup, real screenshots, real workflow demo, database/API architecture, test commands, evidence for concurrency safety, limitations, and actual technical decisions. Make all content accurate.
