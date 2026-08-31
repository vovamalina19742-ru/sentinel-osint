use crate::error::{AppError, Result};
use image::imageops::FilterType;
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

const SAMPLE_SIZE: usize = 32;
const HASH_SIZE: usize = 8;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageComparisonResult {
    pub hash1: String,
    pub hash2: String,
    pub hamming_distance: u32,
    pub similarity_percent: f64,
    pub is_duplicate: bool,
    pub risk_severity: String, // low, medium, high, critical
    pub verdict: String,
}

/// Compute 64-bit perceptual hash (DCT-II) from raw image bytes
pub fn compute_phash_from_bytes(bytes: &[u8]) -> Result<u64> {
    let img = image::load_from_memory(bytes)
        .map_err(|e| AppError::ValidationError(format!("Failed to decode image: {}", e)))?;

    // 1. Convert to 32x32 grayscale
    let gray_img = img.grayscale().resize_exact(
        SAMPLE_SIZE as u32,
        SAMPLE_SIZE as u32,
        FilterType::Lanczos3,
    );

    let mut matrix = [[0.0f64; SAMPLE_SIZE]; SAMPLE_SIZE];
    for y in 0..SAMPLE_SIZE {
        for x in 0..SAMPLE_SIZE {
            let pixel = gray_img.as_bytes()[y * SAMPLE_SIZE + x];
            matrix[y][x] = pixel as f64;
        }
    }

    // 2. Compute 2D Discrete Cosine Transform (DCT-II)
    let mut dct = [[0.0f64; HASH_SIZE]; HASH_SIZE];
    let n = SAMPLE_SIZE as f64;

    for u in 0..HASH_SIZE {
        for v in 0..HASH_SIZE {
            let mut sum = 0.0f64;
            for x in 0..SAMPLE_SIZE {
                for y in 0..SAMPLE_SIZE {
                    let cos_x = ((2.0 * x as f64 + 1.0) * u as f64 * PI / (2.0 * n)).cos();
                    let cos_y = ((2.0 * y as f64 + 1.0) * v as f64 * PI / (2.0 * n)).cos();
                    sum += matrix[y][x] * cos_x * cos_y;
                }
            }

            let alpha_u = if u == 0 { 1.0 / 2.0f64.sqrt() } else { 1.0 };
            let alpha_v = if v == 0 { 1.0 / 2.0f64.sqrt() } else { 1.0 };
            dct[u][v] = (2.0 / n) * alpha_u * alpha_v * sum;
        }
    }

    // 3. Extract top-left 8x8 (excluding DC component at [0][0])
    let mut values = Vec::with_capacity(64);
    for u in 0..HASH_SIZE {
        for v in 0..HASH_SIZE {
            if !(u == 0 && v == 0) {
                values.push(dct[u][v]);
            }
        }
    }

    // 4. Calculate median
    let mut sorted = values.clone();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let median = sorted[sorted.len() / 2];

    // 5. Construct 64-bit hash
    let mut hash: u64 = 0;
    for (i, val) in values.iter().enumerate() {
        if *val > median {
            hash |= 1 << i;
        }
    }

    Ok(hash)
}

/// Calculate Hamming distance between two 64-bit hashes
pub fn hamming_distance(h1: u64, h2: u64) -> u32 {
    (h1 ^ h2).count_ones()
}

/// Calculate similarity score (0.0 to 100.0%)
pub fn similarity_percent(dist: u32) -> f64 {
    let max_dist = 64.0f64;
    let sim = (1.0 - (dist as f64 / max_dist)) * 100.0;
    (sim * 10.0).round() / 10.0
}

/// Compare two images provided as base64 or raw bytes
pub fn compare_images_bytes(bytes1: &[u8], bytes2: &[u8]) -> Result<ImageComparisonResult> {
    let h1 = compute_phash_from_bytes(bytes1)?;
    let h2 = compute_phash_from_bytes(bytes2)?;
    let dist = hamming_distance(h1, h2);
    let sim = similarity_percent(dist);

    let (is_dup, severity, verdict) = if dist <= 3 {
        (
            true,
            "critical".to_string(),
            "⚠️ КРИТИЧЕСКИЙ РИСК: Идентичное фото (100% совпадение с известным скам-паттерном)"
                .to_string(),
        )
    } else if dist <= 8 {
        (
            true,
            "high".to_string(),
            "⚠️ ВЫСОКИЙ РИСК: Перезалитое фото с незначительными изменениями (обрезка/яркость)"
                .to_string(),
        )
    } else if dist <= 14 {
        (
            false,
            "medium".to_string(),
            "Подозрительное сходство композиции (проверить вручную)".to_string(),
        )
    } else {
        (
            false,
            "low".to_string(),
            "Фото уникально, совпадений не обнаружено".to_string(),
        )
    };

    Ok(ImageComparisonResult {
        hash1: format!("{:016x}", h1),
        hash2: format!("{:016x}", h2),
        hamming_distance: dist,
        similarity_percent: sim,
        is_duplicate: is_dup,
        risk_severity: severity,
        verdict,
    })
}
