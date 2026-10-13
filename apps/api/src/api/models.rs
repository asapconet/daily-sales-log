use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct DateQuery {
    pub date: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateSale {
    pub item_name: String,
    pub amount_kobo: i64,
}

#[derive(Serialize, FromRow)]
pub struct Sale {
    pub id: Uuid,
    pub item_name: String,
    pub amount_kobo: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct Summary {
    pub date: String,
    pub total_kobo: i64,
    pub transaction_count: i64,
}

#[derive(Serialize)]
pub struct AllTimeSummary {
    pub total_kobo: i64,
    pub transaction_count: i64,
}

#[derive(Serialize)]
pub struct ErrorBody {
    pub error: &'static str,
}
