use super::{
    errors::ApiError,
    models::Sale,
    services::{internal_error, parse_total},
};
use axum::http::StatusCode;
use chrono::{DateTime, Utc};
use sqlx::PgPool;

pub async fn insert_sale(
    pool: &PgPool,
    item_name: String,
    amount_kobo: i64,
) -> Result<Sale, ApiError> {
    sqlx::query_as::<_, Sale>("INSERT INTO sales (item_name, amount_kobo) VALUES ($1, $2) RETURNING id, item_name, amount_kobo, created_at")
        .bind(item_name).bind(amount_kobo).fetch_one(pool).await
        .map_err(|_| internal_error("Could not save sale"))
}

pub async fn list_day(
    pool: &PgPool,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
) -> Result<Vec<Sale>, ApiError> {
    sqlx::query_as::<_, Sale>("SELECT id, item_name, amount_kobo, created_at FROM sales WHERE created_at >= $1 AND created_at < $2 ORDER BY created_at ASC, id ASC")
        .bind(start).bind(end).fetch_all(pool).await
        .map_err(|_| internal_error("Could not retrieve sales"))
}

pub async fn recent(pool: &PgPool) -> Result<Vec<Sale>, ApiError> {
    sqlx::query_as::<_, Sale>("SELECT id, item_name, amount_kobo, created_at FROM sales ORDER BY created_at DESC, id DESC LIMIT 8")
        .fetch_all(pool).await.map_err(|_| internal_error("Could not retrieve recent sales"))
}

pub async fn summary(
    pool: &PgPool,
    bounds: (DateTime<Utc>, DateTime<Utc>),
) -> Result<(i64, i64), ApiError> {
    let (total, count): (String, i64) = sqlx::query_as("SELECT COALESCE(SUM(amount_kobo), 0)::TEXT, COUNT(*) FROM sales WHERE created_at >= $1 AND created_at < $2")
        .bind(bounds.0).bind(bounds.1).fetch_one(pool).await
        .map_err(|_| internal_error("Could not retrieve sales summary"))?;
    let total = parse_total(&total).ok_or(ApiError(
        StatusCode::INTERNAL_SERVER_ERROR,
        "Sales total exceeds the supported range",
    ))?;
    Ok((total, count))
}

pub async fn all_time_summary(pool: &PgPool) -> Result<(i64, i64), ApiError> {
    let (total, count): (String, i64) =
        sqlx::query_as("SELECT COALESCE(SUM(amount_kobo), 0)::TEXT, COUNT(*) FROM sales")
            .fetch_one(pool)
            .await
            .map_err(|_| internal_error("Could not retrieve all-time summary"))?;
    let total = parse_total(&total).ok_or(ApiError(
        StatusCode::INTERNAL_SERVER_ERROR,
        "Sales total exceeds the supported range",
    ))?;
    Ok((total, count))
}
