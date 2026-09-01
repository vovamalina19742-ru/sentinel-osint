import { ImageComparisonResult, InvestigationDossier, InvestigationStep, TargetType } from '../types/dossier';

export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export async function compareImagesIPC(
  image1Base64: string,
  image2Base64: string
): Promise<ImageComparisonResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<ImageComparisonResult>('compare_images', {
      image1Base64,
      image2Base64,
    });
  }

  await new Promise((r) => setTimeout(r, 600));
  const diffRatio = Math.abs(image1Base64.length - image2Base64.length) / Math.max(image1Base64.length, 1);
  const distance = Math.min(64, Math.floor(diffRatio * 20));
  const sim = Math.max(0, Math.round((1 - distance / 64) * 1000) / 10);

  const isDup = distance <= 8;
  const severity = distance <= 3 ? 'critical' : distance <= 8 ? 'high' : distance <= 14 ? 'medium' : 'low';
  const verdict =
    distance <= 3
      ? '⚠️ КРИТИЧЕСКИЙ РИСК: 100% дубликат фото из базы известных скам-паттернов'
      : distance <= 8
      ? '⚠️ ВЫСОКИЙ РИСК: Перезалитое фото с косметической обрезкой/сжатием'
      : distance <= 14
      ? 'Подозрительное сходство композиции (рекомендуется ручной осмотр)'
      : 'Фото уникально, совпадений не обнаружено';

  return {
    hash1: '8f3c2a1b9e0d4f5a',
    hash2: distance === 0 ? '8f3c2a1b9e0d4f5a' : '8f3c2a1b9e0d4f5b',
    hamming_distance: distance,
    similarity_percent: sim,
    is_duplicate: isDup,
    risk_severity: severity,
    verdict,
  };
}

export async function startInvestigationIPC(
  target: string,
  targetType: TargetType,
  onStep: (step: InvestigationStep) => void
): Promise<InvestigationDossier> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');

    const unlisten = await listen<InvestigationStep>('investigation-step', (event) => {
      onStep(event.payload);
    });

    try {
      const dossier = await invoke<InvestigationDossier>('start_investigation', {
        target,
        targetType,
      });
      return dossier;
    } finally {
      unlisten();
    }
  }

  // Web Browser Sandbox Simulation with live step streaming
  const platforms =
    targetType === 'email'
      ? [
          { name: 'Google Workspace', exists: true, url: 'https://mail.google.com' },
          { name: 'GitHub', exists: true, url: 'https://github.com' },
          { name: 'Telegram Messenger', exists: false, url: 'https://t.me' },
          { name: 'Twitter / X', exists: true, url: 'https://x.com' },
          { name: 'Steam Community', exists: true, url: 'https://steamcommunity.com' },
        ]
      : [
          { name: 'GitHub', exists: true, url: `https://github.com/${target}` },
          { name: 'Telegram', exists: true, url: `https://t.me/${target}` },
          { name: 'Reddit', exists: false, url: `https://reddit.com/user/${target}` },
          { name: 'Steam', exists: true, url: `https://steamcommunity.com/id/${target}` },
          { name: 'Habr', exists: true, url: `https://habr.com/ru/users/${target}` },
        ];

  onStep({
    id: 'step-0',
    target,
    platform: 'Core Orchestrator',
    status: 'running',
    message: `Инициализация конвейера разведки для «${target}»...`,
    progress_percent: 10,
  });

  for (let i = 0; i < platforms.length; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const p = platforms[i];
    const pct = 15 + Math.round(((i + 1) / platforms.length) * 80);
    onStep({
      id: `step-${i + 1}`,
      target,
      platform: p.name,
      status: p.exists ? 'found' : 'not_found',
      message: p.exists ? `Активный профиль обнаружен на ${p.name}` : `На ${p.name} аккаунт отсутствует`,
      progress_percent: pct,
      url: p.exists ? p.url : undefined,
    });
  }

  await new Promise((r) => setTimeout(r, 300));
  onStep({
    id: 'step-done',
    target,
    platform: 'Trust Score Aggregator',
    status: 'found',
    message: 'Анализ завершен, досье сформировано.',
    progress_percent: 100,
  });

  return {
    id: crypto.randomUUID(),
    target,
    target_type: targetType,
    trust_score: 88,
    created_at: new Date().toISOString(),
    summary: `Разведка по цели «${target}» успешно завершена. Найдено ${platforms.filter(p => p.exists).length} совпадений. Уровень надежности подтвержден.`,
    red_flags: [
      {
        id: 'rf-1',
        source: targetType === 'email' ? 'Holehe Engine' : 'Maigret Sidecar',
        title: 'Верификация цифрового следа',
        description: 'Обнаружена устойчивая история аккаунтов на авторитетных сервисах без признаков скам-активности.',
        severity: 'low',
      },
    ],
    profiles: platforms.map((p) => ({
      platform: p.name,
      url: p.url,
      exists: p.exists,
    })),
    raw_findings: {
      engine: 'Sentinel-OSINT Sidecar Runner v0.2',
      execution: 'sandboxed',
    },
  };
}

export interface ProfileFinding {
  platform: string;
  url: string;
  exists: boolean;
}

export interface ProgressEvent {
  stage: string;
  percent: number;
  current_service: string;
}

export async function investigateUsernameIPC(
  username: string,
  onProgress?: (event: ProgressEvent) => void
): Promise<ProfileFinding[]> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');
    let unlisten: (() => void) | undefined;
    if (onProgress) {
      unlisten = await listen<ProgressEvent>('investigation-progress', (e) => {
        onProgress(e.payload);
      });
    }
    try {
      return await invoke<ProfileFinding[]>('investigate_username', { username });
    } finally {
      if (unlisten) unlisten();
    }
  }

  // Эмуляция для браузера
  if (onProgress) {
    onProgress({ stage: 'Инициализация Maigret', percent: 10, current_service: 'Запуск подпроцесса' });
    await new Promise((r) => setTimeout(r, 300));
    onProgress({ stage: 'Сканирование профилей', percent: 50, current_service: 'Telegram, GitHub...' });
    await new Promise((r) => setTimeout(r, 400));
    onProgress({ stage: 'Завершено', percent: 100, current_service: 'Готово' });
  }

  return [
    { platform: 'Telegram', url: `https://t.me/${username}`, exists: true },
    { platform: 'GitHub', url: `https://github.com/${username}`, exists: true },
    { platform: 'Habr', url: `https://habr.com/ru/users/${username}`, exists: true },
    { platform: 'Instagram', url: `https://instagram.com/${username}`, exists: false },
    { platform: 'Steam', url: `https://steamcommunity.com/id/${username}`, exists: true },
  ];
}

export interface InvestigationHistoryItem {
  id: string;
  target: string;
  target_type: string;
  trust_score: number;
  summary: string;
  created_at: string;
}

export async function saveDossierIPC(dossier: InvestigationDossier): Promise<void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('save_investigation_dossier', { dossier });
    return;
  }

  // LocalStorage fallback for browser sandbox
  try {
    const key = 'sentinel_history';
    const existing: InvestigationHistoryItem[] = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((item) => item.id !== dossier.id);
    const updated: InvestigationHistoryItem[] = [
      {
        id: dossier.id,
        target: dossier.target,
        target_type: dossier.target_type,
        trust_score: dossier.trust_score,
        summary: dossier.summary,
        created_at: dossier.created_at,
      },
      ...filtered,
    ].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('LocalStorage save error:', err);
  }
}

export async function getHistoryIPC(limit = 20): Promise<InvestigationHistoryItem[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<InvestigationHistoryItem[]>('get_investigation_history', { limit });
  }

  // LocalStorage fallback
  try {
    const key = 'sentinel_history';
    const items: InvestigationHistoryItem[] = JSON.parse(localStorage.getItem(key) || '[]');
    return items.slice(0, limit);
  } catch {
    return [];
  }
}

export async function deleteDossierIPC(id: string): Promise<boolean> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<boolean>('delete_investigation_dossier', { id });
  }

  // LocalStorage fallback
  try {
    const key = 'sentinel_history';
    const existing: InvestigationHistoryItem[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export interface SnifferBeaconPayload {
  bssid: string;
  ssid: string;
  rssi: number;
  channel: number;
  encryption: string;
}

export type SnifferEvent =
  | { type: 'BeaconDetected'; payload: SnifferBeaconPayload }
  | { type: 'Error'; payload: { message: string } }
  | { type: 'Stopped' };

export async function checkAdminPrivilegesIPC(): Promise<boolean> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('check_admin_privileges');
    } catch (err) {
      console.error('Error checking admin privileges:', err);
      return false;
    }
  }
  return true; // Web Sandbox Mock
}

export async function startRadioSnifferIPC(
  onEvent: (event: SnifferEvent) => void
): Promise<() => void> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');

    const unlisten = await listen<SnifferEvent>('sniffer-event', (e) => {
      onEvent(e.payload);
    });

    await invoke<string>('start_radio_sniffer');

    return () => {
      unlisten();
      invoke('stop_radio_sniffer').catch(console.error);
    };
  }

  // Web Sandbox Mode (Эмуляция потока реальных маяков)
  let running = true;
  const mockAps = [
    { ssid: 'Target_AP_Secure', bssid: 'C4:AD:34:D1:F2:A0', channel: 1, encryption: 'WPA3', rssi: -48, lat: 47.0120, lng: 28.8650 },
    { ssid: 'Staff_Net_5G', bssid: '70:85:C2:5D:89:12', channel: 36, encryption: 'WPA2-Enterprise', rssi: -62, lat: 47.0090, lng: 28.8610 },
    { ssid: 'Guest_Free_WiFi', bssid: '00:1A:2B:3C:4D:5E', channel: 6, encryption: 'Open', rssi: -75, lat: 47.0135, lng: 28.8675 },
    { ssid: 'CCTV_Camera_Outdoor', bssid: 'B8:27:EB:AA:BB:CC', channel: 11, encryption: 'WPA2-PSK', rssi: -55, lat: 47.0080, lng: 28.8660 },
  ];

  const timer = setInterval(() => {
    if (!running) return;
    const ap = mockAps[Math.floor(Math.random() * mockAps.length)];
    onEvent({
      type: 'BeaconDetected',
      payload: {
        ssid: ap.ssid,
        bssid: ap.bssid,
        channel: ap.channel,
        encryption: ap.encryption,
        rssi: ap.rssi + Math.floor(Math.random() * 10 - 5),
      },
    });
  }, 1600);

  return () => {
    running = false;
    clearInterval(timer);
    onEvent({ type: 'Stopped' });
  };
}

export async function stopRadioSnifferIPC(): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke<string>('stop_radio_sniffer');
    } catch (err) {
      console.error('Error stopping radio sniffer:', err);
    }
  }
}
