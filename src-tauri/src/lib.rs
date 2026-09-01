pub mod error;
pub mod plugins;

use error::{AppError, Result};
use plugins::db::{delete_dossier, get_history, save_dossier, DbState, InvestigationHistoryItem};
use plugins::phash::{compare_images_bytes, compute_phash_from_bytes, ImageComparisonResult};
use plugins::sidecar::{execute_maigret, run_investigation, InvestigationDossier, ProfileFinding};
use plugins::radar::{self, SnifferState};
use tauri::State;

#[tauri::command]
fn check_target(target: String) -> Result<String> {
    if target.trim().is_empty() {
        return Err(AppError::ValidationError("Target cannot be empty".to_string()));
    }
    Ok(format!("Target '{}' accepted for investigation", target))
}

#[tauri::command]
async fn start_investigation(
    app: tauri::AppHandle,
    target: String,
    target_type: String,
) -> Result<InvestigationDossier> {
    run_investigation(app, target, target_type).await
}

#[tauri::command]
async fn investigate_username(
    app: tauri::AppHandle,
    username: String,
) -> std::result::Result<Vec<ProfileFinding>, String> {
    execute_maigret(&app, &username).await
}

#[tauri::command]
fn compute_phash(image_base64: String) -> Result<String> {
    let clean_b64 = image_base64.split(',').last().unwrap_or(&image_base64);
    let bytes = match base64_decode(clean_b64) {
        Ok(b) => b,
        Err(e) => return Err(AppError::ValidationError(format!("Invalid base64 payload: {}", e))),
    };

    let hash = compute_phash_from_bytes(&bytes)?;
    Ok(format!("{:016x}", hash))
}

#[tauri::command]
fn compare_images(image1_base64: String, image2_base64: String) -> Result<ImageComparisonResult> {
    let clean1 = image1_base64.split(',').last().unwrap_or(&image1_base64);
    let clean2 = image2_base64.split(',').last().unwrap_or(&image2_base64);

    let bytes1 = match base64_decode(clean1) {
        Ok(b) => b,
        Err(e) => return Err(AppError::ValidationError(format!("Image 1 decode error: {}", e))),
    };
    let bytes2 = match base64_decode(clean2) {
        Ok(b) => b,
        Err(e) => return Err(AppError::ValidationError(format!("Image 2 decode error: {}", e))),
    };

    compare_images_bytes(&bytes1, &bytes2)
}

fn base64_decode(input: &str) -> std::result::Result<Vec<u8>, String> {
    let filtered: String = input.chars().filter(|c| !c.is_whitespace()).collect();
    let mut out = Vec::with_capacity(filtered.len() * 3 / 4);
    let mut buf = 0u32;
    let mut bits = 0;

    for c in filtered.chars() {
        if c == '=' {
            break;
        }
        let val = match c {
            'A'..='Z' => c as u32 - 'A' as u32,
            'a'..='z' => c as u32 - 'a' as u32 + 26,
            '0'..='9' => c as u32 - '0' as u32 + 52,
            '+' => 62,
            '/' => 63,
            _ => return Err(format!("Invalid base64 character: {}", c)),
        };

        buf = (buf << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }
    Ok(out)
}

#[tauri::command]
fn save_investigation_dossier(
    db: State<DbState>,
    dossier: InvestigationDossier,
) -> Result<()> {
    let conn = db.conn.lock().map_err(|e| AppError::DatabaseError(e.to_string()))?;
    save_dossier(&conn, &dossier)
}

#[tauri::command]
fn get_investigation_history(
    db: State<DbState>,
    limit: Option<u32>,
) -> Result<Vec<InvestigationHistoryItem>> {
    let conn = db.conn.lock().map_err(|e| AppError::DatabaseError(e.to_string()))?;
    get_history(&conn, limit.unwrap_or(20))
}

#[tauri::command]
fn delete_investigation_dossier(
    db: State<DbState>,
    id: String,
) -> Result<bool> {
    let conn = db.conn.lock().map_err(|e| AppError::DatabaseError(e.to_string()))?;
    delete_dossier(&conn, &id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = DbState::new_file("sentinel_investigations.db").unwrap_or_else(|_| {
        DbState::new_in_memory().expect("In-memory SQLite fallback failed")
    });

    tauri::Builder::default()
        .manage(db)
        .manage(SnifferState::default())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            check_target,
            start_investigation,
            investigate_username,
            compute_phash,
            compare_images,
            save_investigation_dossier,
            get_investigation_history,
            delete_investigation_dossier,
            radar::check_admin_privileges,
            radar::start_radio_sniffer,
            radar::stop_radio_sniffer
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
