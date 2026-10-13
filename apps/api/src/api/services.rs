use super::{
    errors::{ApiError, bad_request},
    models::CreateSale,
};
use axum::http::StatusCode;
use chrono::{DateTime, Days, NaiveDate, TimeZone, Utc};
use chrono_tz::Tz;

pub fn date_bounds(
    date: NaiveDate,
    timezone: Tz,
) -> Result<(DateTime<Utc>, DateTime<Utc>), ApiError> {
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

pub fn requested_date(raw: Option<String>, timezone: Tz) -> Result<NaiveDate, ApiError> {
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

pub fn validate_sale(input: CreateSale) -> Result<(String, i64), ApiError> {
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

#[cfg(test)]
pub fn total_kobo(mut amounts: impl Iterator<Item = i64>) -> Option<i64> {
    amounts
        .try_fold(0_i64, i64::checked_add)
        .filter(|total| *total <= 9_007_199_254_740_991)
}

pub fn parse_total(total: &str) -> Option<i64> {
    total
        .parse::<i64>()
        .ok()
        .filter(|value| *value <= 9_007_199_254_740_991)
}

pub fn internal_error(message: &'static str) -> ApiError {
    ApiError(StatusCode::INTERNAL_SERVER_ERROR, message)
}
