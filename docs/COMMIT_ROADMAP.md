# StockFlow — 65-Commit Implementation Roadmap

This is a **target implementation order**, not a historical Git log. Create each commit only after a real change is implemented and the relevant checks pass. If code already exists, avoid duplicating it. Target **at least 60 meaningful new commits** and about 65 when the planned scope warrants it. Do not fabricate commits or dates.

## Phase 1 — Foundation and UI shell (1–8)
1. `chore: configure monorepo package scripts and workspace`
2. `chore: scaffold Angular standalone client`
3. `chore: scaffold TypeScript Express API`
4. `chore: add shared lint format and typecheck settings`
5. `chore: configure MongoDB replica set in Docker Compose`
6. `feat: build responsive Angular application shell`
7. `feat: add client navigation and protected route placeholders`
8. `style: establish accessible design tokens and layout`

## Phase 2 — Authentication and roles (9–16)
9. `feat: add user and hashed session database models`
10. `feat: add development admin provisioning and password hashing`
11. `feat: implement login logout and current-user endpoints`
12. `feat: add session verification and cookie security`
13. `feat: implement server-side admin and staff authorization`
14. `feat: create Angular login form with validation`
15. `feat: connect Angular API client and session state`
16. `feat: protect authenticated routes and handle session expiry`

## Phase 3 — Catalog data and APIs (17–25)
17. `feat: add category model indexes and validators`
18. `feat: implement category management endpoints`
19. `feat: add supplier data model and management API`
20. `feat: create product model SKU uniqueness and validation`
21. `feat: implement product create edit and detail endpoints`
22. `feat: add product list filters sorting and pagination API`
23. `feat: build Angular product list and detail views`
24. `feat: add product create and edit reactive forms`
25. `feat: implement category and supplier management screens`

## Phase 4 — Inventory and movement history (26–34)
26. `feat: define append-only stock movement data model`
27. `feat: implement transactional stock receipt service`
28. `feat: implement validated stock adjustment service`
29. `feat: add inventory receipt and adjustment API routes`
30. `feat: build stock receive and adjust forms`
31. `feat: add searchable paginated stock movement history`
32. `feat: implement reorder thresholds and low-stock endpoint`
33. `feat: display low-stock and out-of-stock indicators`
34. `test: cover stock adjustments ledger and validation rules`

## Phase 5 — Orders and consistency (35–46)
35. `feat: define order model line items and status rules`
36. `feat: implement draft order creation with server validation`
37. `feat: add editable draft orders and server-calculated totals`
38. `feat: build Angular order list filters and detail view`
39. `feat: implement order creation form with product lookup`
40. `feat: add order confirmation service transaction boundary`
41. `feat: use conditional stock decrement to prevent overselling`
42. `feat: atomically record order-confirmed stock movements`
43. `feat: implement fulfillment without second stock deduction`
44. `feat: implement transactional cancellation and stock restoration`
45. `fix: enforce valid status transitions and idempotency`
46. `test: verify concurrent confirmations and complete rollbacks`

## Phase 6 — Dashboards and reporting (47–53)
47. `feat: implement dashboard aggregation endpoints`
48. `feat: build dashboard summary and recent activity widgets`
49. `feat: add category breakdown and order status charts`
50. `feat: implement inventory valuation and low-stock reports`
51. `feat: add order and stock movement report filters`
52. `feat: implement safe CSV exports for report results`
53. `feat: build reporting pages with helpful empty states`

## Phase 7 — Hardening and testing (54–60)
54. `test: cover auth failures and role restrictions`
55. `test: cover duplicate SKU and invalid product inputs`
56. `test: verify order status and cancellation edge cases`
57. `test: add Angular component and API service tests`
58. `test: add browser E2E inventory order workflow`
59. `fix: strengthen API errors logging and request validation`
60. `chore: add deterministic local sample data and seed scripts`

## Phase 8 — Documentation and release (61–65)
61. `docs: add OpenAPI spec and example requests`
62. `docs: explain database model transaction safety and RBAC`
63. `ci: run Angular API lint build and tests on GitHub Actions`
64. `docs: write recruiter-ready README with verified screenshots`
65. `chore: verify Docker startup and production build readiness`

## Phase acceptance gates

- **After 8:** Angular shell and API server start; Docker replica set healthy; scripts documented.
- **After 16:** Admin login works; staff cannot call admin routes; session expiry and logout covered.
- **After 25:** Products, suppliers, and categories persist and display in Angular; pagination and validation work.
- **After 34:** Receive/adjust stock creates matching ledger entries with no negative quantities.
- **After 46:** Order lifecycle works, including competing confirmations, atomic rollback, and cancellation idempotency.
- **After 53:** All dashboard and report statistics derive from MongoDB records, not placeholder numbers.
- **After 60:** Automated backend, frontend, and browser tests cover important workflows with recorded results.
- **After 65:** Local setup and build are repeatable; CI is configured; README includes evidence and limitations.

If a gate fails, fix it before expanding the feature surface. Do not create commits merely to match a desired count. Record actual hashes in `docs/PROGRESS.md` or final report.
