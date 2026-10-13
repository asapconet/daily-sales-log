# Daily Sales Log

A small sales-entry dashboard for recording a shop’s daily transactions. The React frontend reads and writes through a Rust/Axum API; PostgreSQL persists each sale across refreshes and service restarts.

## Features

- Record an item and NGN amount with client and server validation.
- View a business-day total, transaction count, and transaction history.
- Filter by business date; business days use `Africa/Lagos` by default.
- Show each running total in chronological order, with newest transactions displayed first.
- Store amounts as integer kobo and timestamps as UTC `TIMESTAMPTZ` values.
- See loading, empty, success, and error states on mobile and desktop.

## Stack

- `apps/web`: React, TypeScript, Vite, and Bun.
- `apps/api`: Rust, Axum, Tokio, and SQLx.
- PostgreSQL with SQLx migrations.

## Local setup

Install Bun and Rust/Cargo, and run PostgreSQL. Create an empty database, then copy the API environment example and set its connection string:

```sh
createdb daily_sales_log
cp apps/api/.env.example .env
```

Install frontend dependencies and start the API and web app in separate terminals:

```sh
bun install
bun run dev:api
bun run dev:web
```

The API listens on port `3000` by default. On startup it connects to PostgreSQL and applies migrations from `apps/api/migrations`. Vite proxies `/api` requests to the local API.

## Environment variables

API settings are read from the process environment (or the root `.env` file for local development):

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | — | PostgreSQL connection URL; keep it secret. |
| `HOST` | No | `0.0.0.0` | HTTP bind address. |
| `PORT` | No | `3000` | HTTP port; the hosting platform supplies this in production. |
| `FRONTEND_ORIGIN` | No | `http://localhost:5173` | Exact browser origin allowed by CORS. |
| `BUSINESS_TIMEZONE` | No | `Africa/Lagos` | IANA timezone used to define daily boundaries. |

Frontend build variables are listed in [apps/web/.env.example](apps/web/.env.example):

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Empty (same origin) | Public API origin when the frontend and API use separate hosts. |
| `VITE_BUSINESS_TIMEZONE` | `Africa/Lagos` | Must match the API business timezone. |

Vite embeds `VITE_*` variables into the public browser bundle. Never put credentials in them.

## API

- `GET /health` — database connectivity check.
- `POST /api/sales` — JSON body: `{"item_name":"Bread","amount_kobo":250000}`. Returns `201` and the saved sale.
- `GET /api/sales?date=YYYY-MM-DD` — sales for a business date, oldest first; defaults to today in the configured timezone.
- `GET /api/sales/summary?date=YYYY-MM-DD` — `date`, `total_kobo`, and `transaction_count` for that business date.

Both read endpoints use a half-open interval from local midnight to the next local midnight, converted to UTC. API errors contain a readable message without database diagnostics.

## Migrations and checks

Migrations run automatically on API startup. To apply them manually, install `sqlx-cli` and run:

```sh
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/daily_sales_log"
sqlx migrate run --source apps/api/migrations
```

Run the focused API tests, API compilation check, and frontend production build with:

```sh
bun run test:api
cargo check --manifest-path apps/api/Cargo.toml
bun run build:web
```

The API tests cover validation, integer totals, malformed dates, and Lagos day boundaries. A running PostgreSQL instance is needed to verify actual migration and HTTP/database behavior.

## Deployment

The repository includes a [Render Blueprint](render.yaml) for the API and static frontend, plus a production API [Dockerfile](apps/api/Dockerfile). The API uses Render’s paid `0.5c-512mb` service plan to avoid the free service’s idle sleep; Render currently lists that size at about $7/month. Render static sites are free. The database is provisioned separately with Neon so its lifecycle and connection URL remain explicit. Check [Render’s current limits and pricing](https://render.com/docs/free) before deployment.

1. Push this repository to GitHub and connect it to Render.
2. Create a Neon PostgreSQL project in a European region close to Render Frankfurt. For production use, choose Neon Launch or another plan with the persistence and recovery support you need. Neon’s current [Free plan limits](https://neon.com/blog/neon-free-plan-1-gb-per-project) make it suitable for prototypes and assessment demos, with limited compute and recovery.
3. Create a Render Blueprint from `render.yaml`. Supply `DATABASE_URL` from Neon and `FRONTEND_ORIGIN` using the deployed static site’s exact HTTPS origin when prompted.
4. Confirm the static service’s `VITE_API_BASE_URL` matches the deployed API origin. The frontend variable is applied at build time, so redeploy after changing it.
5. Wait for the API health check, then open the static site and add a sale. Refresh the page and confirm that the saved row and daily totals remain.

Render requires a connected GitHub account. Neon and Render account creation may require identity verification or billing details depending on the selected plans. The Blueprint does not contain database credentials. The `FRONTEND_ORIGIN` prompt and the public API URL must be checked against the actual service URLs before the first deploy.

**Live application URL:** not deployed yet.

## Notes

**What I built**

Daily Sales Log is a full-stack app for recording sales and tracking business-day revenue. It persists transactions in PostgreSQL and displays daily summaries and chronological running totals.

**Key decisions**

- **Kobo integers:** Sales and totals use integer minor units to avoid floating-point arithmetic in stored and calculated money.
- **UTC storage with a business timezone:** Timestamps are stored in UTC; date queries use local midnight boundaries in `Africa/Lagos` by default.
- **SQLx migrations and PostgreSQL:** The schema is versioned and startup applies migrations against the real database.

**What I’d improve with one more day**

Add database-backed API integration tests, improve reporting across date ranges, and add an automated public-deployment smoke check.
