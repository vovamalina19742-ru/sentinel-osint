pub mod error;
pub mod plugins;

use error::{AppError, Result};
use plugins::phash::{compare_images_bytes, compute_phash_from_bytes, ImageComparisonResult};

#[tauri::command]
fn check_target(target: String) -> Result<String> {
    if target.trim().is_empty() {
        return Err(AppError::ValidationError("Target cannot be empty".to_string()));
    }
    Ok(format!("Target '{}' accepted for investigation", target))
}

#[tauri::command]
fn compute_phash(image_base64: String) -> Result<String> {
    let clean_b64 = image_base64.split(',').last().unwrap_or(&image_base64);
    
    // Decode base64
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
    // Simple custom standard base64 decoder to avoid unnecessary external crate
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            check_target,
            compute_phash,
            compare_images
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
