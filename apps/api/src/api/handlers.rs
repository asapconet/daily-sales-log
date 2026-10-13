use super::{
    AppState,
    errors::ApiError,
    models::{AllTimeSummary, CreateSale, DateQuery, Sale, Summary},
    repository,
    services::{date_bounds, requested_date, validate_sale},
};
use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use std::sync::Arc;

pub async fn health(
    State(state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>, ApiError> {
    sqlx::query("SELECT 1")
        .execute(&state.pool)
        .await
        .map_err(|_| ApiError(StatusCode::SERVICE_UNAVAILABLE, "Database unavailable"))?;
    Ok(Json(serde_json::json!({ "status": "ok" })))
}

pub async fn create_sale(
    State(state): State<Arc<AppState>>,
    Json(input): Json<CreateSale>,
) -> Result<(StatusCode, Json<Sale>), ApiError> {
    let (item_name, amount_kobo) = validate_sale(input)?;
    let sale = repository::insert_sale(&state.pool, item_name, amount_kobo).await?;
    Ok((StatusCode::CREATED, Json(sale)))
}

pub async fn list_sales(
    State(state): State<Arc<AppState>>,
    Query(query): Query<DateQuery>,
) -> Result<Json<Vec<Sale>>, ApiError> {
    let date = requested_date(query.date, state.timezone)?;
    let bounds = date_bounds(date, state.timezone)?;
    Ok(Json(
        repository::list_day(&state.pool, bounds.0, bounds.1).await?,
    ))
}

pub async fn sales_summary(
    State(state): State<Arc<AppState>>,
    Query(query): Query<DateQuery>,
) -> Result<Json<Summary>, ApiError> {
    let date = requested_date(query.date, state.timezone)?;
    let (total_kobo, transaction_count) =
        repository::summary(&state.pool, date_bounds(date, state.timezone)?).await?;
    Ok(Json(Summary {
        date: date.to_string(),
        total_kobo,
        transaction_count,
    }))
}

pub async fn all_time_summary(
    State(state): State<Arc<AppState>>,
) -> Result<Json<AllTimeSummary>, ApiError> {
    let (total_kobo, transaction_count) = repository::all_time_summary(&state.pool).await?;
    Ok(Json(AllTimeSummary {
        total_kobo,
        transaction_count,
    }))
}

pub async fn recent_sales(State(state): State<Arc<AppState>>) -> Result<Json<Vec<Sale>>, ApiError> {
    Ok(Json(repository::recent(&state.pool).await?))
}

#[cfg(test)]
mod tests {
    use super::super::{
        models::CreateSale,
        services::{date_bounds, parse_total, requested_date, total_kobo, validate_sale},
    };
    use chrono::NaiveDate;

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
    fn rejects_blank_long_nonpositive_and_unsafe_sale_input() {
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
    fn calculates_totals_with_integer_arithmetic() {
        assert_eq!(
            total_kobo([100_000, 50_000, 200_000].into_iter()),
            Some(350_000)
        );
        assert_eq!(total_kobo([].into_iter()), Some(0));
        assert_eq!(total_kobo([i64::MAX, 1].into_iter()), None);
        assert_eq!(total_kobo([9_007_199_254_740_991, 1].into_iter()), None);
        assert_eq!(parse_total("350000"), Some(350_000));
        assert_eq!(parse_total("9007199254740992"), None);
        assert_eq!(parse_total("not-a-total"), None);
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
