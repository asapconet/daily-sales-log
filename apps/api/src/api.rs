mod errors;
mod handlers;
mod models;
mod repository;
mod services;

use axum::{Router, routing::get};
use chrono_tz::Tz;
use sqlx::PgPool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub timezone: Tz,
}

pub fn router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(handlers::health))
        .route(
            "/api/sales",
            get(handlers::list_sales).post(handlers::create_sale),
        )
        .route("/api/sales/summary", get(handlers::sales_summary))
        .route(
            "/api/sales/summary/all-time",
            get(handlers::all_time_summary),
        )
        .route("/api/sales/recent", get(handlers::recent_sales))
        .with_state(state)
}
