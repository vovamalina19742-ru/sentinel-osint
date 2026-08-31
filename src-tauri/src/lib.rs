pub mod error;

use error::Result;

#[tauri::command]
fn check_target(target: String) -> Result<String> {
    if target.trim().is_empty() {
        return Err(error::AppError::ValidationError("Target cannot be empty".to_string()));
    }
    Ok(format!("Target '{}' accepted for investigation", target))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![check_target])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
