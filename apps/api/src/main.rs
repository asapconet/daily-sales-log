use axum::{
    Json, Router,
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
};
use chrono::{DateTime, Days, NaiveDate, TimeZone, Utc};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool, postgres::PgPoolOptions};
use std::{env, net::SocketAddr, str::FromStr, sync::Arc};
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    timezone: Tz,
}

#[derive(Deserialize)]
struct DateQuery {
    date: Option<String>,
}

#[derive(Deserialize)]
struct CreateSale {
    item_name: String,
    amount_kobo: i64,
}

#[derive(Serialize, FromRow)]
struct Sale {
    id: Uuid,
    item_name: String,
    amount_kobo: i64,
    created_at: DateTime<Utc>,
}

#[derive(Serialize)]
struct Summary {
    date: String,
    total_kobo: i64,
    transaction_count: i64,
}

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
}

#[derive(Debug)]
struct ApiError(StatusCode, &'static str);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(ErrorBody { error: self.1 })).into_response()
    }
}

fn bad_request(message: &'static str) -> ApiError {
    ApiError(StatusCode::BAD_REQUEST, message)
}

fn date_bounds(date: NaiveDate, timezone: Tz) -> Result<(DateTime<Utc>, DateTime<Utc>), ApiError> {
    let next = date
        .checked_add_days(Days::new(1))
        .ok_or_else(|| bad_request("Invalid business date"))?;
    let start = timezone
        .from_local_datetime(&date.and_hms_opt(0, 0, 0).unwrap())
        .single()
        .ok_or_else(|| bad_request("Business date boundary is ambiguous"))?;
    let end = timezone
        .from_local_datetime(&next.and_hms_opt(0, 0, 0).unwrap())
        .single()
        .ok_or_else(|| bad_request("Business date boundary is ambiguous"))?;
    Ok((start.with_timezone(&Utc), end.with_timezone(&Utc)))
}

fn requested_date(raw: Option<String>, timezone: Tz) -> Result<NaiveDate, ApiError> {
    match raw {
        Some(value)
            if value.len() == 10
                && value.as_bytes().get(4) == Some(&b'-')
                && value.as_bytes().get(7) == Some(&b'-') =>
        {
            NaiveDate::parse_from_str(&value, "%Y-%m-%d")
                .map_err(|_| bad_request("date must use YYYY-MM-DD format"))
        }
        Some(_) => Err(bad_request("date must use YYYY-MM-DD format")),
        None => Ok(Utc::now().with_timezone(&timezone).date_naive()),
    }
}

fn validate_sale(input: CreateSale) -> Result<(String, i64), ApiError> {
    let item_name = input.item_name.trim();
    if item_name.is_empty() {
        return Err(bad_request("Item name is required"));
    }
    if item_name.chars().count() > 120 {
        return Err(bad_request("Item name must be 120 characters or fewer"));
    }
    if input.amount_kobo <= 0 || input.amount_kobo > 9_007_199_254_740_991 {
        return Err(bad_request(
            "Amount must be between 1 and 9,007,199,254,740,991 kobo",
        ));
    }
    Ok((item_name.to_owned(), input.amount_kobo))
}

async fn health(State(state): State<Arc<AppState>>) -> Result<Json<serde_json::Value>, ApiError> {
    sqlx::query("SELECT 1")
        .execute(&state.pool)
        .await
        .map_err(|_| ApiError(StatusCode::SERVICE_UNAVAILABLE, "Database unavailable"))?;
    Ok(Json(serde_json::json!({ "status": "ok" })))
}

async fn create_sale(
    State(state): State<Arc<AppState>>,
    Json(input): Json<CreateSale>,
) -> Result<(StatusCode, Json<Sale>), ApiError> {
    let (item_name, amount_kobo) = validate_sale(input)?;

    let sale = sqlx::query_as::<_, Sale>(
        "INSERT INTO sales (item_name, amount_kobo) VALUES ($1, $2) RETURNING id, item_name, amount_kobo, created_at",
    )
    .bind(item_name)
    .bind(amount_kobo)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| ApiError(StatusCode::INTERNAL_SERVER_ERROR, "Could not save sale"))?;
    Ok((StatusCode::CREATED, Json(sale)))
}

async fn list_sales(
    State(state): State<Arc<AppState>>,
    Query(query): Query<DateQuery>,
) -> Result<Json<Vec<Sale>>, ApiError> {
    let date = requested_date(query.date, state.timezone)?;
    let (start, end) = date_bounds(date, state.timezone)?;
    let sales = sqlx::query_as::<_, Sale>(
        "SELECT id, item_name, amount_kobo, created_at FROM sales WHERE created_at >= $1 AND created_at < $2 ORDER BY created_at ASC, id ASC",
    )
    .bind(start)
    .bind(end)
    .fetch_all(&state.pool)
    .await
    .map_err(|_| ApiError(StatusCode::INTERNAL_SERVER_ERROR, "Could not retrieve sales"))?;
    Ok(Json(sales))
}

async fn sales_summary(
    State(state): State<Arc<AppState>>,
    Query(query): Query<DateQuery>,
) -> Result<Json<Summary>, ApiError> {
    let date = requested_date(query.date, state.timezone)?;
    let (start, end) = date_bounds(date, state.timezone)?;
    let (total, count) = sqlx::query_as::<_, (i64, i64)>(
        "SELECT COALESCE(SUM(amount_kobo), 0)::BIGINT, COUNT(*)::BIGINT FROM sales WHERE created_at >= $1 AND created_at < $2",
    )
    .bind(start)
    .bind(end)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| ApiError(StatusCode::INTERNAL_SERVER_ERROR, "Could not retrieve sales summary"))?;
    Ok(Json(Summary {
        date: date.to_string(),
        total_kobo: total,
        transaction_count: count,
    }))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv().ok();
    let database_url = env::var("DATABASE_URL")?;
    let timezone = env::var("BUSINESS_TIMEZONE")
        .unwrap_or_else(|_| "Africa/Lagos".to_owned())
        .parse::<Tz>()?;
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;
    sqlx::migrate!("./migrations").run(&pool).await?;

    let frontend_origin =
        env::var("FRONTEND_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".to_owned());
    let cors = CorsLayer::new()
        .allow_origin(frontend_origin.parse::<axum::http::HeaderValue>()?)
        .allow_methods(Any)
        .allow_headers(Any);
    let state = Arc::new(AppState { pool, timezone });
    let app = Router::new()
        .route("/health", get(health))
        .route("/api/sales", get(list_sales).post(create_sale))
        .route("/api/sales/summary", get(sales_summary))
        .with_state(state)
        .layer(cors);

    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_owned());
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_owned());
    let address = SocketAddr::from_str(&format!("{host}:{port}"))?;
    let listener = tokio::net::TcpListener::bind(address).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_and_trims_sale_input_without_changing_minor_units() {
        let (name, amount) = validate_sale(CreateSale {
            item_name: "  Rice  ".into(),
            amount_kobo: 125_050,
        })
        .unwrap();
        assert_eq!(name, "Rice");
        assert_eq!(amount, 125_050);
    }

    #[test]
    fn rejects_blank_long_and_nonpositive_sale_input() {
        for input in [
            CreateSale {
                item_name: " \t ".into(),
                amount_kobo: 100,
            },
            CreateSale {
                item_name: "x".repeat(121),
                amount_kobo: 100,
            },
            CreateSale {
                item_name: "Tea".into(),
                amount_kobo: 0,
            },
            CreateSale {
                item_name: "Tea".into(),
                amount_kobo: -1,
            },
            CreateSale {
                item_name: "Tea".into(),
                amount_kobo: 9_007_199_254_740_992,
            },
        ] {
            assert!(validate_sale(input).is_err());
        }
    }

    #[test]
    fn lagos_business_day_is_a_half_open_utc_interval() {
        let date = NaiveDate::from_ymd_opt(2026, 10, 13).unwrap();
        let (start, end) = date_bounds(date, chrono_tz::Africa::Lagos).unwrap();
        assert_eq!(start.to_rfc3339(), "2026-10-12T23:00:00+00:00");
        assert_eq!(end.to_rfc3339(), "2026-10-13T23:00:00+00:00");
        assert_eq!(end - start, chrono::Duration::hours(24));
    }

    #[test]
    fn rejects_malformed_business_dates() {
        assert!(requested_date(Some("13-10-2026".into()), chrono_tz::Africa::Lagos).is_err());
        assert!(requested_date(Some("2026-1-13".into()), chrono_tz::Africa::Lagos).is_err());
        assert!(requested_date(Some("2026-02-30".into()), chrono_tz::Africa::Lagos).is_err());
    }
}
