# Continuous verification

The [GitHub Actions workflow](../.github/workflows/ci.yml) runs on main pushes and pull requests with read-only repository permission and no deployment or production secrets. It installs from the lockfile on Node 22, starts the Compose MongoDB replica set, probes a real transaction commit/rollback, installs Chromium/FFmpeg, checks the workspace/OpenAPI contract, runs lint/format/typecheck, builds both applications, runs all backend tests (including transaction races), Angular ChromeHeadless tests and the actual Playwright workflow. Runtime dependencies are audited. Browser screenshots/video and failure traces are retained as artifacts for fourteen days. The runner database is stopped even after failure.

Tests use unique guarded database names; no production instance is contacted. Local browser tests use installed Google Chrome, while CI explicitly installs Playwright Chromium and supplies its path to Karma. E2E starts its own API/frontend and refuses to reuse an unrelated server.

Local test results are recorded in [PROGRESS.md](PROGRESS.md). They do not imply this workflow has passed remotely. Docker verification on this Windows workstation remains blocked by absent Docker Desktop; local MongoDB was approved by the user. The first pushed workflow run supplies independent Linux Compose evidence. No cloud deployment is part of CI.
