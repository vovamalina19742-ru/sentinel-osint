use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, Result};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ThreatSeverity {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntropyAnalysisResult {
    pub input_length: usize,
    pub entropy: f64,
    pub max_possible_entropy: f64,
    pub entropy_ratio: f64,
    pub is_suspicious: bool,
    pub assessment: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DgaDetectionResult {
    pub domain: String,
    pub sld: String,
    pub entropy: f64,
    pub is_dga_suspected: bool,
    pub confidence_percent: f64,
    pub reasons: Vec<String>,
    pub mitre_technique: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HttpC2AnalysisResult {
    pub url: String,
    pub url_entropy: f64,
    pub is_url_suspicious: bool,
    pub headers_entropy: Vec<(String, f64, bool)>,
    pub is_c2_suspected: bool,
    pub reasons: Vec<String>,
    pub mitre_technique: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NamedPipeAlert {
    pub pipe_name: String,
    pub severity: ThreatSeverity,
    pub is_known_c2: bool,
    pub is_whitelisted: bool,
    pub entropy: f64,
    pub description: String,
    pub mitre_technique: String,
}

/// Zero-allocation Shannon entropy calculation
pub fn calculate_shannon_entropy(input: &[u8]) -> f64 {
    if input.is_empty() {
        return 0.0;
    }

    let mut frequencies = [0usize; 256];
    for &byte in input {
        frequencies[byte as usize] += 1;
    }

    let len = input.len() as f64;
    let mut entropy = 0.0;

    for &count in &frequencies {
        if count > 0 {
            let p = count as f64 / len;
            entropy -= p * p.log2();
        }
    }

    entropy
}

/// Golden Baseline: Legitimate Windows System Named Pipes
const LEGIT_WINDOWS_PIPES: &[&str] = &[
    "spoolss",
    "samr",
    "lsarpc",
    "netlogon",
    "wkssvc",
    "srvsvc",
    "epmapper",
    "eventlog",
    "InitShutdown",
    "ntsvcs",
    "scerpc",
    "atsvc",
    "winreg",
    "browser",
    "keysvc",
    "trkwks",
    "protected_storage",
    "W32TIME_ALT",
    "plugplay",
    "AudioEndpointHost",
    "IPSec_PresharedKey_Config",
    "cert",
    "MSKSSRV",
    "AppvCommandProxy",
    "docker_engine",
    "wsl",
];

/// Known C2 Framework Named Pipe Signatures
const C2_PIPE_PATTERNS: &[(&str, &str, &str)] = &[
    ("msagent_", "Cobalt Strike (Default Malleable)", "CRITICAL"),
    ("status_", "Cobalt Strike (Beacon Lateral Movement)", "CRITICAL"),
    ("postex_", "Cobalt Strike (Post-Exploitation Job)", "CRITICAL"),
    ("spoolss_", "Cobalt Strike (Spoofed Spoolss)", "CRITICAL"),
    ("meterpreter", "Metasploit Meterpreter", "CRITICAL"),
    ("mypipe", "Metasploit Generic Pipe", "HIGH"),
    ("sliver", "Sliver C2 Framework", "CRITICAL"),
    ("havoc", "Havoc C2 Framework", "CRITICAL"),
    ("brute_ratel", "Brute Ratel C4 Badger", "CRITICAL"),
    ("badger_", "Brute Ratel C4 Named Pipe", "CRITICAL"),
];

/// Analyze entropy of arbitrary raw string
pub fn analyze_entropy(data: &str) -> EntropyAnalysisResult {
    let bytes = data.as_bytes();
    let entropy = calculate_shannon_entropy(bytes);
    let max_possible = if bytes.is_empty() {
        0.0
    } else {
        (bytes.len() as f64).min(256.0).log2()
    };
    let ratio = if max_possible > 0.0 {
        entropy / max_possible
    } else {
        0.0
    };

    let (is_suspicious, assessment) = if bytes.len() >= 8 && entropy >= 4.2 {
        (
            true,
            "⚠️ Высокая энтропия: строка похожа на зашифрованные данные, DGA или бинарный токен".to_string(),
        )
    } else if bytes.len() >= 6 && entropy >= 3.6 {
        (
            false,
            "🟡 Умеренная энтропия: стандартные хэши / идентификаторы".to_string(),
        )
    } else {
        (
            false,
            "🟢 Низкая энтропия: читаемый естественный текст".to_string(),
        )
    };

    EntropyAnalysisResult {
        input_length: bytes.len(),
        entropy,
        max_possible_entropy: max_possible,
        entropy_ratio: ratio,
        is_suspicious,
        assessment,
    }
}

/// Detect Domain Generation Algorithm (DGA) in DNS domain
pub fn analyze_domain_dga(raw_domain: &str) -> Result<DgaDetectionResult> {
    let domain = raw_domain.trim().to_lowercase();
    if domain.is_empty() {
        return Err(AppError::ValidationError("Domain cannot be empty".to_string()));
    }

    // Extract Second-Level Domain (SLD)
    let parts: Vec<&str> = domain.split('.').collect();
    let sld = if parts.len() >= 2 {
        parts[parts.len() - 2]
    } else {
        parts[0]
    };

    let entropy = calculate_shannon_entropy(sld.as_bytes());
    let mut reasons = Vec::new();
    let mut score = 0.0;

    // Check 1: Shannon Entropy Score
    if entropy >= 3.85 {
        score += 55.0;
        reasons.push(format!("Высокая энтропия SLD ({:.2} >= 3.85) — признак псевдослучайной генерации", entropy));
    } else if entropy >= 3.4 {
        score += 25.0;
        reasons.push(format!("Повышенная энтропия SLD ({:.2})", entropy));
    }

    // Check 2: Length of SLD
    if sld.len() >= 16 {
        score += 25.0;
        reasons.push(format!("Аномальная длина доменного имени ({} символов)", sld.len()));
    }

    // Check 3: Ratio of consonants to vowels
    let vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    let letter_count = sld.chars().filter(|c| c.is_alphabetic()).count();
    let vowel_count = sld.chars().filter(|c| vowels.contains(c)).count();
    
    if letter_count >= 8 {
        let vowel_ratio = vowel_count as f64 / letter_count as f64;
        if vowel_ratio < 0.15 {
            score += 20.0;
            reasons.push("Крайне низкое соотношение гласных букв (признак машинной генерации)".to_string());
        }
    }

    // Check 4: Digits ratio
    let digit_count = sld.chars().filter(|c| c.is_ascii_digit()).count();
    if digit_count > 0 && sld.len() >= 8 {
        let digit_ratio = digit_count as f64 / sld.len() as f64;
        if digit_ratio > 0.4 {
            score += 15.0;
            reasons.push("Высокая концентрация цифр внутри имени домена".to_string());
        }
    }

    let confidence_percent = score.min(99.0);
    let is_dga_suspected = confidence_percent >= 50.0;

    Ok(DgaDetectionResult {
        domain,
        sld: sld.to_string(),
        entropy,
        is_dga_suspected,
        confidence_percent,
        reasons,
        mitre_technique: "T1568.002 (Dynamic Resolution: Domain Generation Algorithms)".to_string(),
    })
}

/// Analyze HTTP Request metadata and headers for C2 Beacons
pub fn analyze_http_c2(
    url: &str,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
) -> Result<HttpC2AnalysisResult> {
    let url_clean = url.trim();
    if url_clean.is_empty() {
        return Err(AppError::ValidationError("URL cannot be empty".to_string()));
    }

    let url_entropy = calculate_shannon_entropy(url_clean.as_bytes());
    let mut reasons = Vec::new();
    let mut headers_entropy = Vec::new();
    let mut is_c2 = false;

    if url_entropy >= 4.4 {
        reasons.push(format!("Аномально высокая энтропия URL ({:.2} >= 4.4)", url_entropy));
        is_c2 = true;
    }

    // Check jQuery mimicry with suspicious parameters
    if url_clean.contains("jquery") && (url_clean.contains("?") || url_entropy >= 4.0) {
        reasons.push("Обнаружена мимикрия под библиотеку jQuery (паттерн Cobalt Strike Malleable)".to_string());
        is_c2 = true;
    }

    if let Some(hdrs) = headers {
        for (k, v) in hdrs {
            let ent = calculate_shannon_entropy(v.as_bytes());
            let is_susp = v.len() >= 32 && ent >= 4.8;
            if is_susp {
                reasons.push(format!("Заголовок '{}' содержит данные с высокой энтропией ({:.2})", k, ent));
                is_c2 = true;
            }
            headers_entropy.push((k, ent, is_susp));
        }
    }

    if let Some(b) = body {
        let body_bytes = b.as_bytes();
        let body_ent = calculate_shannon_entropy(body_bytes);
        if body_bytes.len() >= 64 && body_ent >= 5.2 {
            reasons.push(format!("Тело POST-запроса содержит высокоэнтропийный пейлоад ({:.2})", body_ent));
            is_c2 = true;
        }
    }

    Ok(HttpC2AnalysisResult {
        url: url_clean.to_string(),
        url_entropy,
        is_url_suspicious: url_entropy >= 4.4,
        headers_entropy,
        is_c2_suspected: is_c2,
        reasons,
        mitre_technique: "T1071.001 (Application Layer Protocol: Web Protocols)".to_string(),
    })
}

/// Analyze a single named pipe string
pub fn evaluate_pipe_name(pipe_name: &str) -> NamedPipeAlert {
    let clean_name = pipe_name
        .trim()
        .trim_start_matches(r"\\.\pipe\")
        .trim_start_matches(r"/pipe/")
        .to_lowercase();

    let entropy = calculate_shannon_entropy(clean_name.as_bytes());

    // 1. Check known C2 signatures
    for &(pattern, desc, _sev) in C2_PIPE_PATTERNS {
        if clean_name.starts_with(pattern) || clean_name.contains(pattern) {
            return NamedPipeAlert {
                pipe_name: pipe_name.to_string(),
                severity: ThreatSeverity::Critical,
                is_known_c2: true,
                is_whitelisted: false,
                entropy,
                description: format!("⚠️ ОБНАРУЖЕН АКТИВНЫЙ ХАКЕРСКИЙ C2 PIPE: {}", desc),
                mitre_technique: "T1570 (Lateral Movement: Lateral Tool Transfer)".to_string(),
            };
        }
    }

    // 2. Check Whitelist
    let is_whitelisted = LEGIT_WINDOWS_PIPES
        .iter()
        .any(|&legit| clean_name == legit.to_lowercase() || clean_name.starts_with(&format!("{}_", legit.to_lowercase())));

    if is_whitelisted {
        return NamedPipeAlert {
            pipe_name: pipe_name.to_string(),
            severity: ThreatSeverity::Low,
            is_known_c2: false,
            is_whitelisted: true,
            entropy,
            description: "Легитимный системный канал Windows / ПО".to_string(),
            mitre_technique: "T1570 (System Baseline)".to_string(),
        };
    }

    // 3. Heuristic: Random Hex/Alpha names (e.g. 7-12 random chars)
    let is_random_hex = clean_name.len() >= 6
        && clean_name.len() <= 16
        && clean_name.chars().all(|c| c.is_ascii_hexdigit());

    if is_random_hex || (clean_name.len() >= 8 && entropy >= 3.6) {
        return NamedPipeAlert {
            pipe_name: pipe_name.to_string(),
            severity: ThreatSeverity::High,
            is_known_c2: false,
            is_whitelisted: false,
            entropy,
            description: "Подозрительный именованный канал с псевдослучайным именем (признак C2 Beacon)".to_string(),
            mitre_technique: "T1570 (Lateral Movement)".to_string(),
        };
    }

    NamedPipeAlert {
        pipe_name: pipe_name.to_string(),
        severity: ThreatSeverity::Medium,
        is_known_c2: false,
        is_whitelisted: false,
        entropy,
        description: "Нестандартный сторонний именованный канал (рекомендуется аудит)".to_string(),
        mitre_technique: "T1570 (Lateral Movement)".to_string(),
    }
}

/// Enumerate local named pipes on Windows or provide sandbox mock
#[tauri::command]
pub fn scan_named_pipes() -> Result<Vec<NamedPipeAlert>> {
    let mut pipes = Vec::new();

    #[cfg(target_os = "windows")]
    {
        use std::fs;
        use std::path::Path;

        // In Windows, Named Pipes can be listed via \\.\pipe\
        if let Ok(entries) = fs::read_dir(Path::new(r"\\.\pipe\")) {
            for entry in entries.flatten() {
                if let Ok(name) = entry.file_name().into_string() {
                    pipes.push(format!(r"\\.\pipe\{}", name));
                }
            }
        }
    }

    // If no pipes were enumerated (or on non-windows), add a baseline demo set for testing
    if pipes.is_empty() {
        pipes.push(r"\\.\pipe\spoolss".to_string());
        pipes.push(r"\\.\pipe\samr".to_string());
        pipes.push(r"\\.\pipe\lsarpc".to_string());
        pipes.push(r"\\.\pipe\msagent_4f8a".to_string());
        pipes.push(r"\\.\pipe\sliver_session_9b".to_string());
        pipes.push(r"\\.\pipe\7f4a2b1c8e9d".to_string());
    }

    let results: Vec<NamedPipeAlert> = pipes.into_iter().map(|p| evaluate_pipe_name(&p)).collect();
    Ok(results)
}

#[tauri::command]
pub fn check_entropy_score(data: String) -> Result<EntropyAnalysisResult> {
    Ok(analyze_entropy(&data))
}

#[tauri::command]
pub fn check_domain_dga(domain: String) -> Result<DgaDetectionResult> {
    analyze_domain_dga(&domain)
}

#[tauri::command]
pub fn check_http_c2(
    url: String,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
) -> Result<HttpC2AnalysisResult> {
    analyze_http_c2(&url, headers, body)
}

#[tauri::command]
pub fn check_named_pipe_name(pipe_name: String) -> Result<NamedPipeAlert> {
    Ok(evaluate_pipe_name(&pipe_name))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entropy_zero_and_uniform() {
        assert_eq!(calculate_shannon_entropy(b""), 0.0);
        assert_eq!(calculate_shannon_entropy(b"AAAA"), 0.0);
        
        let ent = calculate_shannon_entropy(b"abcdefghijklmnopqrstuvwxyz0123456789");
        assert!(ent > 4.5);
    }

    #[test]
    fn test_dga_detection() {
        let legit = analyze_domain_dga("google.com").unwrap();
        assert!(!legit.is_dga_suspected);
        assert!(legit.entropy < 3.2);

        let dga = analyze_domain_dga("xkz98qwerty12489asdf.biz").unwrap();
        assert!(dga.is_dga_suspected);
        assert!(dga.entropy >= 3.8);
    }

    #[test]
    fn test_named_pipes_evaluation() {
        let legit = evaluate_pipe_name(r"\\.\pipe\spoolss");
        assert!(legit.is_whitelisted);
        assert_eq!(legit.severity, ThreatSeverity::Low);

        let c2 = evaluate_pipe_name(r"\\.\pipe\msagent_98a");
        assert!(c2.is_known_c2);
        assert_eq!(c2.severity, ThreatSeverity::Critical);

        let random = evaluate_pipe_name(r"\\.\pipe\3f8a9e1c4b2d");
        assert_eq!(random.severity, ThreatSeverity::High);
    }
}
