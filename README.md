# Daily Sales Log

A lightweight POS-style sales logger for recording transactions and reviewing daily and business-wide performance. The React frontend uses a Rust/Axum API backed by PostgreSQL.

## Live deployment

These are the configured deployment URLs; their current availability has not been verified:

- **Frontend:** https://daily-sales-log-fe.onrender.com/
- **API health endpoint:** https://daily-sales-log.onrender.com/health
- **API base URL:** https://daily-sales-log.onrender.com

## Views and features

- **Dashboard (`/`)** shows all-time revenue and transaction count, today's revenue for the current business date, and up to eight recent transactions.
- **Sales Entry (`/sales/new`)** records a sale and shows the current business day's transactions and totals.
- **Sales Log (`/sales`)** filters transactions by business date and displays newest first, with running totals calculated in chronological order.
- Amounts are stored as integer kobo. Timestamps are stored in UTC; business-day boundaries use the configured `Africa/Lagos` timezone by default.
- Responsive desktop sidebar and mobile navigation, plus loading, empty, error, and save feedback states.

## Architecture

- `apps/web/src/` contains the routed React/TypeScript UI, components, sales feature, shared libraries, and styles. Tailwind CSS 4 is integrated through Vite.
- `apps/api/src/main.rs` starts the server; `apps/api/src/api/` contains route registration, handlers, request/response models, validation/date rules, errors, and PostgreSQL queries.
- `apps/api/migrations/` contains SQLx migrations. `render.yaml` configures the Render API and static frontend services; the API Dockerfile and GitHub Actions workflow are also in the repository.

## Local development

Install Bun, Rust/Cargo, and Docker. Start the existing local PostgreSQL service, install frontend dependencies, and create the root `.env` only if it does not already exist:

```sh
docker compose up -d postgres
bun install
test -f .env || cp apps/api/.env.example .env
```

The example configures the Compose database at `localhost:5434`. The API loads the root `.env` when run from the repository root and applies SQLx migrations automatically at startup. Start the API and frontend in separate terminals:

```sh
bun run dev:api
bun run dev:web
```

The API defaults to `0.0.0.0:3000`; Vite serves the frontend on port `5173` by default. Vite proxies `/api` requests to `http://127.0.0.1:3000`. `VITE_API_BASE_URL` is used by production builds to select the API origin; the development proxy is configured directly in Vite.

## Environment variables

API variables (see `apps/api/.env.example`):

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string; keep credentials private. |
| `HOST` | No | `0.0.0.0` | API bind address. |
| `PORT` | No | `3000` | API port; Render supplies it in deployment. |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Exact origin allowed by API CORS. |
| `BUSINESS_TIMEZONE` | No | `Africa/Lagos` | IANA timezone defining business-day boundaries. |

Frontend build variables (see `apps/web/.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Empty | Public API origin when web and API use separate hosts. |
| `VITE_BUSINESS_TIMEZONE` | `Africa/Lagos` | Display timezone; keep consistent with the API. |

`VITE_*` values are public and embedded in the browser bundle. Never put secrets in them.

## API

- `GET /health` runs `SELECT 1` against PostgreSQL and returns `{"status":"ok"}` on success; database failure returns service unavailable.
- `POST /api/sales` accepts `{"item_name":"Bread","amount_kobo":250000}` and returns the saved sale with HTTP 201. `amount_kobo` is an integer amount in kobo; `250000` represents **₦2,500.00**. The API does not take this field as a decimal naira value.
- `GET /api/sales?date=YYYY-MM-DD` returns that business day's transactions oldest first. If `date` is omitted, it defaults to today in the configured timezone.
- `GET /api/sales/summary?date=YYYY-MM-DD` returns the selected date, total kobo, and transaction count; the date also defaults to today in the configured timezone.
- `GET /api/sales/summary/all-time` returns database-aggregated all-time total kobo and transaction count.
- `GET /api/sales/recent` returns up to eight latest transactions across business dates.

Amounts are validated and summed as integers. API errors do not expose database diagnostics.

## Local verification

Run the applicable checks from the repository root:

```sh
bun install --frozen-lockfile
bun run format:check
bun run lint
cargo fmt --manifest-path apps/api/Cargo.toml --all -- --check
cargo check --manifest-path apps/api/Cargo.toml --locked
cargo test --manifest-path apps/api/Cargo.toml --locked
bun run test:web
bun run build:web
docker build -f apps/api/Dockerfile -t daily-sales-log-api .
```

The root scripts `format:check`, `lint`, `test:web`, and `build:web` are defined in `package.json`. The frontend test suite currently has one running-total test; the API has five unit tests for sale validation, integer totals, malformed dates, and `Africa/Lagos` boundaries. These unit tests do not cover PostgreSQL integration behavior.

### Verification results

The following local results are historical and are not results from a new check run for this README change:

| Status | Result |
| --- | --- |
| **Passed** | Rust formatting and compilation; five API unit tests; frontend running-total test; TypeScript check and production build; frozen-lockfile dependency installation. |
| **Passed** | Local PostgreSQL and the local API/Vite-proxy smoke tests for `/health`, creating a sale, date-filtered listing, and daily summary. The current API source also returned a successful all-time summary on temporary localhost port `3001`. One 100-kobo smoke-test sale remains in the local development database. |
| **Not completed** | Docker image build; downloading the Rust base image was too slow, so the build was canceled. |
| **Not run** | GitHub Actions was not run for this change. The workflow runs Rust formatting, API checks/tests, frontend build and running-total test, and a Docker image build. On pushes to `main`, its separate hook-based Render deploy job runs only after checks succeed. No deployment was triggered for this change. |
| **Not verified** | Current production frontend/API health, Render/Neon behavior, production database connectivity, and production persistence. The live URL probes from this environment could not resolve either hostname. |

## Notes

**What I built**

Daily Sales Log records sales, shows current business-day activity, provides historical date inspection, and reports all-time revenue and transaction counts. PostgreSQL is the configured persistence layer; production persistence has not been verified.

**Key decisions**

- **Integer kobo:** prevents floating-point rounding in stored money and totals.
- **Lagos business dates over UTC storage:** keeps date filtering consistent with local trading days while storing server timestamps in UTC.
- **Database aggregates for dashboard figures:** calculates all-time totals without loading the full transaction history into the browser.

**What I’d improve with one more day**

Add PostgreSQL-backed API integration tests and an automated public deployment smoke test.
