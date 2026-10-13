use super::models::ErrorBody;
use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};

#[derive(Debug)]
pub struct ApiError(pub StatusCode, pub &'static str);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(ErrorBody { error: self.1 })).into_response()
    }
}

pub fn bad_request(message: &'static str) -> ApiError {
    ApiError(StatusCode::BAD_REQUEST, message)
}
