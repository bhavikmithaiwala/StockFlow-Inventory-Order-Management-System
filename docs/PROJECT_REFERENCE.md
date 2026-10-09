# StockFlow — Product and Engineering Reference

**Project title:** StockFlow — Inventory & Order Management System  
**Project type:** Full-stack web application (Angular + Node.js + Express + MongoDB)  
**Purpose:** A small business can manage products, suppliers, incoming stock, sales orders, user permissions, and historical inventory changes.  
**Audience:** A junior full-stack developer's portfolio. It must run locally and be demonstrable without paid services.

## 1. Scope and boundaries

Build **one warehouse / one stock location** initially. Do not add multi-tenant SaaS billing, microservices, payments, AI features, mobile apps, or multi-warehouse transfers. Focus on correct order and inventory behaviour. Any future-facing feature must be labelled planned, not built.

### Main screens

1. Login (admin and staff)
2. Dashboard: totals, stock alerts, recent activity, order status, inventory valuation
3. Products: list/search/sort/paginate, create/edit, activate/deactivate
4. Categories: CRUD with safeguards for referenced categories
5. Suppliers: CRUD and contact information
6. Inventory: stock receipt and adjustments, with reason and validation
7. Stock movements: append-only ledger, filters by product/type/date
8. Orders: create draft, edit draft, confirm, fulfill, cancel, view history
9. Reports: low-stock, inventory valuation, orders by status, CSV exports
10. Users: admin creates staff accounts, adjusts permissions or deactivates users
11. Settings: profile and basic app preferences

Every navigation link must have meaningful content, loading/empty/error states, and accessible keyboard behaviour.

## 2. Tech stack

- **Client:** Angular with standalone components, TypeScript, Angular Router, HttpClient, Reactive Forms, SCSS, RxJS or signals where helpful.
- **API:** Node.js LTS, Express, TypeScript, Zod for input validation, centralized errors and request IDs.
- **Persistence:** MongoDB + Mongoose; one-node replica set for local transactions; indexes for uniqueness and frequently queried filters.
- **Authentication:** HttpOnly opaque session cookie stored hashed in the server database, short/controlled expiration, secure cookie settings in production, CSRF/origin defenses for state-changing endpoints, backend role checks. Do not store auth tokens in localStorage.
- **Tests:** Backend unit tests and API integration tests (Vitest/Supertest or equivalent); Angular component tests; Playwright happy-path E2E; a real MongoDB replica set for transaction tests.
- **Tooling:** Docker Compose, ESLint, Prettier, GitHub Actions, OpenAPI, realistic seed script, README.

Prefer the simplest well-tested architecture. Do not add libraries to inflate the technology list.

## 3. Architecture and responsibility boundaries

```
Angular pages/components
   |
Typed API client + auth/session service
   |
HTTP/JSON through a local dev proxy
   |
Express routes -> auth + validation middleware -> controllers
   |
Domain services (inventory, orders, products, reports)
   |
Mongoose models + MongoDB transactions
   |
MongoDB (replica set for multi-document transactions)
```

Controllers only parse requests and return responses. Services enforce business rules. Frontend should never be trusted for authorization, pricing, or available stock.

## 4. Business rules (most important)

1. Product SKU is unique (normalize whitespace/case). Product unit price is a non-negative integer in cents, and quantity is a non-negative integer.
2. Product deactivation preserves past orders and movement history.
3. Every stock mutation has an append-only StockMovement record in the **same transaction** as the quantity change.
4. Draft orders do not reserve or deduct stock.
5. Confirming an order deducts its stock **exactly once**; fulfillment changes order status only.
6. A confirmed (but not fulfilled) order may be cancelled and restocked **exactly once**. Fulfilled orders cannot be cancelled in this version; use a separate returns feature in future.
7. Confirming or cancelling an already processed order returns a clear business error and must not repeat inventory changes.
8. Products must be active and quantities positive when confirming an order.
9. Order totals use the unit price captured when the order is confirmed; money is calculated using integer cents.
10. The same order may contain multiple products. If **any** product has insufficient stock, none of the products, movement records, or order status may be changed.
11. Two simultaneous orders competing for the last stock must not both succeed.
12. Server must derive order total from trusted product prices or locked-in approved order line snapshots; never trust a client-provided total.
13. User role checks are performed on the backend for every protected operation.
14. An audit record includes product, signed quantity delta, before/after quantities, reason, actor, timestamp, and optional order reference.

### Example inventory race

Product `SKU-1001` has 5 units. Two orders, each requesting 4 units, are confirmed nearly simultaneously. The database must allow only one confirmation. Final stock = 1, only one associated stock deduction movement is recorded, and the losing order stays unchanged.

**Design recommendation:** Use Mongoose transactions and conditional updates in the same session (`quantity: { $gte: requested }` and `$inc: { quantity: -requested }`). For write conflicts, retry only the whole safe transaction with bounded attempts. Assert idempotency. The MongoDB manual explains single-document atomicity and conditional updates; transactions provide atomic multi-document operations.

## 5. Suggested database collections

### Users
`_id, name, emailNormalized [unique], passwordHash, role ('admin'|'staff'), active, createdAt, updatedAt`

### Sessions
`_id, userId, tokenHash, expiresAt [TTL index], createdAt, lastUsedAt`

### Categories
`_id, name, normalizedName [unique], active, createdAt, updatedAt`

### Suppliers
`_id, name, contactName, email, phone, address, active, createdAt, updatedAt`

### Products
`_id, skuNormalized [unique], name, description, categoryId, supplierId, unitPriceCents, quantity, reorderLevel, active, createdAt, updatedAt`

### Orders
`_id, orderNumber [unique], status ('draft'|'confirmed'|'fulfilled'|'cancelled'), items: [{ productId, skuSnapshot, nameSnapshot, quantity, unitPriceCents }], totalCents, createdBy, confirmedAt, fulfilledAt, cancelledAt, cancellationReason, createdAt, updatedAt`

### StockMovements
`_id, productId, type ('receipt'|'adjustment'|'order-confirmed'|'order-cancelled'), delta, beforeQuantity, afterQuantity, reason, actorId, orderId?, createdAt`

Indexes: unique normalized SKU/email/order number; order `status + createdAt`; movements `productId + createdAt`; product filters category/supplier/active. Use unique database constraints, not just endpoint-level checks.

## 6. API contract (first version)

**Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.  
**Products:** `GET /api/products`, `GET /api/products/:id`, `POST /api/products`, `PATCH /api/products/:id`, `DELETE /api/products/:id` (deactivate only).  
**Categories:** `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`.  
**Suppliers:** `GET /api/suppliers`, `POST /api/suppliers`, `PATCH /api/suppliers/:id`.  
**Inventory:** `POST /api/inventory/receive`, `POST /api/inventory/adjust`, `GET /api/inventory/movements`, `GET /api/inventory/low-stock`.  
**Orders:** `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders`, `PATCH /api/orders/:id`, `POST /api/orders/:id/confirm`, `POST /api/orders/:id/fulfill`, `POST /api/orders/:id/cancel`.  
**Reports:** `GET /api/dashboard/stats`, `GET /api/reports/inventory`, `GET /api/reports/orders`, `GET /api/reports/stock-movements`.  
**Users:** `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id` (admin only).

Use predictable JSON response shapes and meaningful HTTP codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 missing, 409 business conflict, 500 unexpected. Never leak stack traces in production API responses. Use pagination and bounded page sizes.

### Sample order workflow

1. Staff creates a draft with items `SKU-1001 x 2` and `SKU-1002 x 1`.
2. Backend validates products and computes display totals. No stock changes yet.
3. Staff confirms. Backend opens a MongoDB transaction, locks in price snapshots, conditionally decrements every item's stock, creates movements, sets status `confirmed`, commits.
4. Admin fulfills. No further stock deduction.
5. If still confirmed, authorized user may cancel (with reason), restock once, and record restoring movements in a transaction.

## 7. Security and quality requirements

- Input schemas validate body, params, and query parameters; reject malformed MongoDB IDs.
- Do not trust `role`, `price`, `total`, `quantityInStock`, or `createdBy` from client-provided data.
- CSRF/origin checks for cookie-authenticated writes, HttpOnly cookies, rate-limited login, safe password hashing, and safe error responses.
- Protect against CSV formula injection: prefix cells beginning with `=`, `+`, `-`, `@` when exported to spreadsheets; escape quotes/newlines correctly.
- Use structured logs without passwords/tokens.
- Never commit `.env`, database dumps with credentials, or production secrets.
- Validate backend build, frontend build, lint, and tests through CI.

## 8. Acceptance and interview demonstration

At the end, the reviewer must be able to:

1. Follow README to run `docker compose up`, install dependencies, seed demo data, and start Angular + API.
2. Login as admin and as staff and demonstrate permission differences.
3. Create a supplier, category, product, and receive stock.
4. Create and confirm an order and see the corresponding stock movement and decremented quantity.
5. Verify order fulfillment does not deduct stock again.
6. Cancel a confirmed order and see stock restored exactly once.
7. Start two concurrent confirmations with insufficient total stock; see one succeed and the other fail, leaving valid quantities and audit records.
8. Use products, orders, filtering, pagination, and low-stock dashboard.
9. View OpenAPI docs, architecture explanation, automated tests, and CI result.
10. Show screenshots and a brief video/GIF with consistent sample data.

Document actual test results and known limitations. Never invent metrics or claim verified deployment without one.

## 9. References for implementation, not copying

- Angular standalone components: https://angular.dev/guide/components
- Angular forms: https://angular.dev/guide/forms
- MongoDB atomicity & concurrency: https://www.mongodb.com/docs/manual/core/write-operations-atomicity/
- Mongoose transactions: https://mongoosejs.com/docs/transactions.html
- Express guide: https://expressjs.com/en/guide/routing.html
- GitHub clone documentation: https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP CSRF Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

Use the official docs to check API syntax and security. Do not reproduce another product's proprietary interface or claim its code as your own.
