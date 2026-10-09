# Compiled full-stack startup

`npm run build` compiles the Express TypeScript API and optimized Angular browser assets. In production mode Express serves the built client from `apps/client/dist/client/browser`, provides Angular route fallback and keeps unknown `/api` endpoints as JSON 404 errors. Missing assets return 404 rather than the SPA document. Missing Angular build or a non-transaction-capable database prevents startup.

Use a running writable MongoDB replica set and previously provisioned accounts. This local command starts the compiled application on one origin:

```powershell
npm run build
$env:NODE_ENV = 'production'
$env:APP_ORIGIN = 'http://localhost:3000'
$env:HOST = '127.0.0.1'
npm run start --workspace @stockflow/api
```

Open `http://localhost:3000`. Secure-cookie local browser behavior was verified with Chrome on localhost; a deployed origin must use HTTPS. Keep `HOST=127.0.0.1` behind a same-origin reverse proxy, or explicitly set the required bind address for a container. Configure `PORT`, `APP_ORIGIN` and `MONGODB_URI` through environment variables. Process environment takes precedence over optional local `.env`. Development provisioning and seed are disabled in production mode; no production deployment was performed.

`GET /api/health` is process liveness. `GET /api/ready` checks an actual writable replica-set primary and returns 503 with a safe error/request ID when unavailable. SIGINT/SIGTERM closes HTTP and disconnects MongoDB. Logs contain request ID/method/route/status/duration and safe error codes rather than credentials or input bodies.

Run `node scripts/check-production.mjs` after building. It creates its own guarded `stockflow_probe_*` database, starts the compiled API on 3001, verifies primary readiness, serves compiled JavaScript and deep links, rejects missing assets/API routes, then opens the compiled app in a real browser and logs in. It checks Secure/HttpOnly/SameSite Strict cookies, authenticated API access and navigation, captures runtime page errors, stops its server and drops only its isolated database. It does not reset the development seed. Local use requires Google Chrome; CI uses installed Playwright Chromium.

Docker database execution remains locally blocked by missing Docker Desktop, per the approved local-MongoDB alternative. Compose YAML was parsed and inspected; container startup was not claimed. CI verifies Compose on Linux independently when its remote run completes. This browser probe validates the compiled application on the local replica set; it is not cloud deployment or container-image verification.
