use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error, Serialize, Deserialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    #[error("Sidecar execution failed: {0}")]
    SidecarError(String),

    #[error("Invalid target format: {0}")]
    ValidationError(String),

    #[error("Storage/Database error: {0}")]
    DatabaseError(String),

    #[error("Network/Timeout error: {0}")]
    NetworkError(String),
}

pub type Result<T> = std::result::Result<T, AppError>;
