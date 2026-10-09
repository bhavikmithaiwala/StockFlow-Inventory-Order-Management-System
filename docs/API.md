# StockFlow API

The complete [OpenAPI 3.0.3 contract](openapi.json) is also served at `GET /api/openapi.json`. Import it into an OpenAPI client. Regenerate with `node scripts/generate-openapi.mjs`, format with `npx prettier --write docs/openapi.json`, then validate with `node scripts/check-openapi.mjs`. There are 36 operations including process health and real database readiness (503 when unavailable).

Development base URL: `http://localhost:3000/api`. Angular proxies `/api` from port 4200. Authentication uses an HttpOnly session cookie, never a browser storage token. Every write, including login, must send the exact configured `APP_ORIGIN` as its Origin header. Unknown body properties and write query parameters are rejected. Reads require authentication except health and this contract.

PowerShell examples against a seeded local instance:

```powershell
$api = 'http://localhost:3000/api'
$headers = @{ Origin = 'http://localhost:4200' }
Invoke-RestMethod "$api/auth/login" -Method Post -Headers $headers -ContentType application/json -Body (@{ email = 'admin@stockflow.test'; password = 'StockFlowDemo!2026' } | ConvertTo-Json) -SessionVariable stockflowSession
$products = Invoke-RestMethod "$api/products?active=true&limit=20&sort=name" -WebSession $stockflowSession
$productId = $products.data[0]._id
Invoke-RestMethod "$api/inventory/receive" -Method Post -Headers $headers -WebSession $stockflowSession -ContentType application/json -Body (@{ productId = $productId; quantity = 5; reason = 'Delivery received' } | ConvertTo-Json)
$order = Invoke-RestMethod "$api/orders" -Method Post -Headers $headers -WebSession $stockflowSession -ContentType application/json -Body (@{ items = @(@{ productId = $productId; quantity = 2 }) } | ConvertTo-Json -Depth 4)
$orderId = $order.data._id
Invoke-RestMethod "$api/orders/$orderId/confirm" -Method Post -Headers $headers -WebSession $stockflowSession -ContentType application/json -Body '{}'
Invoke-RestMethod "$api/orders/$orderId/cancel" -Method Post -Headers $headers -WebSession $stockflowSession -ContentType application/json -Body '{"reason":"Customer cancelled"}'
Invoke-WebRequest "$api/reports/inventory?format=csv" -WebSession $stockflowSession -OutFile inventory.csv
Invoke-RestMethod "$api/auth/logout" -Method Post -Headers $headers -WebSession $stockflowSession
```

These examples change real local stock and orders. Demo credentials are public development data. New products start with zero quantity; receive stock through the ledger API. Prices and totals are integer cents calculated on the server. Confirmation snapshots current prices; subsequent catalog edits do not rewrite confirmed history.

Lists return `{ data: [...], meta: { page, limit, total } }`; single records return `{ data: ... }`. Inventory reports also return a whole-filter quantity/value summary. IDs are MongoDB `_id` except the auth user projection uses `id`. Populated product/category/supplier/actor references may be objects, as described in the contract. Date filters include complete UTC days. CSV exports include all filtered results, cap at 10,000 records, quote values and neutralize spreadsheet formulas.

Errors return `{ error: { code, message, requestId } }` and the `X-Request-ID` header. Typical codes include `UNAUTHENTICATED` (401), `INVALID_ORIGIN`/role denial (403), `INSUFFICIENT_STOCK` and `INVALID_ORDER_STATUS` (409). Repeating confirmation or cancellation returns a conflict rather than another stock effect. Draft cancellation changes no stock; fulfilled orders cannot be cancelled. Only admins manage catalog/users, adjust stock or fulfill orders; staff can receive stock and create/edit/confirm/cancel orders. See [architecture and RBAC](ARCHITECTURE.md).
