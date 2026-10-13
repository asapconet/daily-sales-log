mod api;

use api::{AppState, router};
use chrono_tz::Tz;
use sqlx::postgres::PgPoolOptions;
use std::{env, net::SocketAddr, str::FromStr, sync::Arc};
use tower_http::cors::{Any, CorsLayer};

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
    let app = router(Arc::new(AppState { pool, timezone })).layer(cors);
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_owned());
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_owned());
    let address = SocketAddr::from_str(&format!("{host}:{port}"))?;
    let listener = tokio::net::TcpListener::bind(address).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
