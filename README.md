# Daily Sales Log

A lightweight POS-style sales logger for recording transactions and reviewing daily and business-wide performance. The React app talks to a Rust/Axum API and PostgreSQL; recorded sales persist across refreshes and restarts.

## Views and features

- **Dashboard (`/`)** shows all-time revenue and transaction count from PostgreSQL aggregates, today’s revenue as a separate figure, and the latest eight transactions.
- **Sales Entry (`/sales/new`)** records a sale and shows the current `Africa/Lagos` business day’s transactions and totals.
- **Sales Log (`/sales`)** filters transactions by business date and shows chronological running totals, with the newest rows first.
- Amounts are stored as integer kobo. Timestamps are stored in UTC; day boundaries are calculated in the configured business timezone.
- Responsive desktop sidebar and mobile navigation; loading, empty, error, and save feedback states.

## Architecture

- `apps/web/src/app`, `components`, `features/sales`, `lib`, and `styles`: routed React/TypeScript UI, sales API/types, shared formatting, Tailwind CSS 4.
- `apps/api/src/main.rs` starts the server; `src/api/` contains route registration, handlers, request/response models, validation/date rules, errors, and PostgreSQL queries.
- `apps/api/migrations/` contains SQLx migrations. Existing Docker Compose, Dockerfile, Render Blueprint, Neon configuration, and GitHub Actions workflow are retained.

## Local development

Install Bun, Rust/Cargo, and Docker. Start the existing local PostgreSQL service, then install frontend dependencies:

```sh
docker compose up -d postgres
bun install
```

Copy `apps/api/.env.example` to the repository root `.env` and set `DATABASE_URL` to the local database URL. Start the API and frontend in separate terminals:

```sh
bun run dev:api
bun run dev:web
```

The API listens on port `3000` by default. It applies SQLx migrations at startup. Vite proxies `/api` requests to the local API. Root scripts include `bun run test:api`, `bun run test:web`, and `bun run build:web`.

## Environment variables

API variables (see `apps/api/.env.example`):

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string; keep secret. |
| `HOST` | No | `0.0.0.0` | API bind address. |
| `PORT` | No | `3000` | API port; Render supplies it in production. |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Exact origin allowed by API CORS. |
| `BUSINESS_TIMEZONE` | No | `Africa/Lagos` | IANA timezone defining business-day boundaries. |

Frontend variables (see `apps/web/.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Empty | Public API origin if web and API have separate hosts. |
| `VITE_BUSINESS_TIMEZONE` | `Africa/Lagos` | Display timezone; keep consistent with the API. |

`VITE_*` values are public and embedded in the browser bundle. Never put secrets in them.

## API

- `GET /health` checks database connectivity.
- `POST /api/sales` accepts `{"item_name":"Bread","amount_kobo":250000}` and returns the saved sale.
- `GET /api/sales?date=YYYY-MM-DD` returns that business day’s transactions, oldest first; date defaults to today in the configured timezone.
- `GET /api/sales/summary?date=YYYY-MM-DD` returns date, total kobo, and transaction count.
- `GET /api/sales/summary/all-time` returns a database-aggregated total and count.
- `GET /api/sales/recent` returns up to eight latest transactions across business dates.

Amounts are validated and summed as integers. API errors do not expose database diagnostics.

## Database and checks

Migrations run automatically on API startup. To apply them manually, install `sqlx-cli` and set a local connection string through `DATABASE_URL`, then run:

```sh
sqlx migrate run --source apps/api/migrations
```

Run local checks with:

```sh
cargo fmt --manifest-path apps/api/Cargo.toml --all -- --check
cargo check --manifest-path apps/api/Cargo.toml --locked
bun install --frozen-lockfile
bun run test:api
bun run test:web
bun run build:web
docker build -f apps/api/Dockerfile -t daily-sales-log-api .
```

The Rust unit tests cover input validation, integer totals, malformed dates, and `Africa/Lagos` boundaries. Database integration behavior requires a reachable PostgreSQL instance and is not covered by those unit tests.

## Deployment and CI

The repository includes a Render Blueprint (`render.yaml`), API Dockerfile, Neon-hosted PostgreSQL setup, and `.github/workflows/ci-cd.yml`. The workflow checks Rust formatting, compilation and tests, frontend build, and Docker image build. On pushes to `main`, its existing deploy job calls Render deploy hooks when these GitHub Actions secrets are configured:

- `RENDER_API_DEPLOY_HOOK`
- `RENDER_FRONTEND_DEPLOY_HOOK`

Configure production `DATABASE_URL`, `FRONTEND_ORIGIN`, `VITE_API_BASE_URL`, and matching `BUSINESS_TIMEZONE` / `VITE_BUSINESS_TIMEZONE` in the hosting services. Create the Neon database, apply migrations (or let API startup apply them), configure the Render services and exact origins, then verify `/health` and a real sale in the public app. No deployment was performed for this refactor.

**Live application URL:** not verified.

## Verification status

**Implemented and locally verified:** three frontend routes, Tailwind production build, all-time and recent-sale API query code, daily listing and summary code, Rust unit tests, chronological running-total test, and CI workflow checks.

**Not verified here:** database-backed HTTP flow, public Render/Neon deployment, and GitHub Actions execution. Those checks require the configured PostgreSQL and hosting accounts/secrets.

## Notes

**What I built**

Daily Sales Log records sales, shows current business-day activity, provides historical date inspection, and reports all-time revenue and transaction counts. PostgreSQL persists transactions.

**Key decisions**

- **Integer kobo:** prevents floating-point rounding in stored money and totals.
- **Lagos business dates over UTC storage:** keeps date filtering consistent with local trading days while storing server timestamps in UTC.
- **Database aggregates for dashboard figures:** computes all-time totals efficiently without loading the full transaction history into the browser.

**What I’d improve with one more day**

Add PostgreSQL-backed API integration tests and an automated public deployment smoke test.
