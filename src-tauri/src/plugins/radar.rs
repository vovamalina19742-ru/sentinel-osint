use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

// Потоковое событие от сниффера к UI
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum SnifferEvent {
    BeaconDetected {
        bssid: String,
        ssid: String,
        rssi: i32,
        channel: u8,
        encryption: String,
    },
    Error { message: String },
    Stopped,
}

// Состояние активного сниффера
pub struct SnifferState {
    pub is_running: Arc<AtomicBool>,
    pub child_pid: Arc<Mutex<Option<u32>>>,
}

impl Default for SnifferState {
    fn default() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            child_pid: Arc::new(Mutex::new(None)),
        }
    }
}

/// Кроссплатформенная проверка прав администратора / root
#[tauri::command]
pub fn check_admin_privileges() -> bool {
    #[cfg(windows)]
    {
        use std::mem::MaybeUninit;
        use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
        use windows_sys::Win32::Security::{
            GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
        };
        use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

        unsafe {
            let mut token: HANDLE = std::ptr::null_mut();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
                return false;
            }

            let mut elevation: MaybeUninit<TOKEN_ELEVATION> = MaybeUninit::uninit();
            let mut returned_size: u32 = 0;

            let success = GetTokenInformation(
                token,
                TokenElevation,
                elevation.as_mut_ptr().cast(),
                std::mem::size_of::<TOKEN_ELEVATION>() as u32,
                &mut returned_size,
            );

            CloseHandle(token);

            if success != 0 {
                elevation.assume_init().TokenIsElevated != 0
            } else {
                false
            }
        }
    }

    #[cfg(not(windows))]
    {
        nix::unistd::getuid().is_root()
    }
}

/// Запуск процесса-сайдкара сниффера
#[tauri::command]
pub async fn start_radio_sniffer(
    app: AppHandle,
    state: State<'_, SnifferState>,
) -> Result<String, String> {
    if state.is_running.load(Ordering::SeqCst) {
        return Ok("Сниффер уже запущен".into());
    }

    if !check_admin_privileges() {
        return Err("ElevationRequired: Для сканирования радиоэфира требуются права администратора".into());
    }

    state.is_running.store(true, Ordering::SeqCst);
    let is_running_clone = state.is_running.clone();
    let child_pid_clone = state.child_pid.clone();

    // Фоновая задача чтения stdout
    tauri::async_runtime::spawn(async move {
        let python_cmd = if cfg!(windows) { "python" } else { "python3" };
        let mut child = match Command::new(python_cmd)
            .args(["sidecars/sniffer.py"])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit("sniffer-event", SnifferEvent::Error {
                    message: format!("Не удалось запустить сайдкар: {}", e),
                });
                is_running_clone.store(false, Ordering::SeqCst);
                return;
            }
        };

        if let Some(pid) = child.id() {
            let mut lock = child_pid_clone.lock().await;
            *lock = Some(pid);
        }

        if let Some(stdout) = child.stdout.take() {
            let mut reader = BufReader::new(stdout).lines();

            while is_running_clone.load(Ordering::SeqCst) {
                tokio::select! {
                    line = reader.next_line() => {
                        match line {
                            Ok(Some(raw_json)) => {
                                if let Ok(event) = serde_json::from_str::<SnifferEvent>(&raw_json) {
                                    let _ = app.emit("sniffer-event", event);
                                }
                            }
                            Ok(None) => break, // EOF
                            Err(_) => break,
                        }
                    }
                }
            }
        }

        let _ = child.kill().await;
        let mut lock = child_pid_clone.lock().await;
        *lock = None;
        is_running_clone.store(false, Ordering::SeqCst);
        let _ = app.emit("sniffer-event", SnifferEvent::Stopped);
    });

    Ok("Сниффер успешно запущен".into())
}

/// Принудительная остановка сниффера
#[tauri::command]
pub async fn stop_radio_sniffer(state: State<'_, SnifferState>) -> Result<String, String> {
    state.is_running.store(false, Ordering::SeqCst);
    let mut lock = state.child_pid.lock().await;
    if let Some(pid) = *lock {
        #[cfg(windows)]
        {
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/F"])
                .output();
        }
        #[cfg(not(windows))]
        {
            let _ = std::process::Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
        }
        *lock = None;
    }
    Ok("Сниффер остановлен".into())
}
