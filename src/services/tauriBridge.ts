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

export interface QuishingReport {
  found: boolean;
  payload_type: string;
  initial_url: string;
  final_url: string;
  domain: string;
  redirect_chain: string[];
  risk_score: number;
  flags: string[];
  error?: string | null;
}

export interface VoiceAnalysisReport {
  sample_rate: number;
  duration_sec: number;
  avg_rolloff_hz: number;
  mfcc_variance: number;
  spectral_flatness: number;
  digital_silence_ratio?: number;
  synthetic_threat_score: number;
  anomalies: string[];
  spectrogram_path?: string | null;
  cached?: boolean;
  error?: string | null;
}

export async function analyzeQuishingIPC(imagePath: string): Promise<QuishingReport> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<QuishingReport>('analyze_quishing', { imagePath });
  }
  return {
    found: true,
    payload_type: 'url',
    initial_url: 'https://bit.ly/secure-auth-check',
    final_url: 'https://login-portal.top/auth',
    domain: 'login-portal.top',
    redirect_chain: ['https://bit.ly/secure-auth-check', 'https://gateway.cfd/forward'],
    risk_score: 60,
    flags: ['Подозрительный TLD: .top', 'Длинная цепочка редиректов (2 перехода)'],
    error: null,
  };
}

export async function analyzeVoiceIPC(audioPath: string, outputPlotPath?: string): Promise<VoiceAnalysisReport> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<VoiceAnalysisReport>('analyze_voice', { audioPath, outputPlotPath });
  }
  return {
    sample_rate: 22050,
    duration_sec: 4.2,
    avg_rolloff_hz: 6840.5,
    mfcc_variance: 0.84,
    spectral_flatness: 0.061,
    synthetic_threat_score: 90,
    anomalies: [
      'Аномальный срез ВЧ: 6840.5 Гц (паттерн легковесного вокодера)',
      'Неестественно заниженная дисперсия формант (монотонность синтеза)',
      'Высокий уровень спектральной равномерности (фоновый шум диффузии)',
    ],
    spectrogram_path: outputPlotPath || null,
    error: null,
  };
}

export interface CleanPixelReport {
  file_path: string;
  format: string;
  original_size_bytes: number;
  cleaned_size_bytes: number;
  saved_bytes: number;
  saved_percent: number;
  stripped_items: string[];
  success: boolean;
  error?: string | null;
}

export async function cleanPixelIPC(filePath: string, inPlace: boolean = false): Promise<CleanPixelReport> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<CleanPixelReport>('clean_pixel', { filePath, inPlace });
  }
  return {
    file_path: filePath || 'sample_photo.jpg',
    format: 'JPEG',
    original_size_bytes: 3452180,
    cleaned_size_bytes: 3120440,
    saved_bytes: 331740,
    saved_percent: 9.61,
    stripped_items: [
      'APP1-Exif (GPS широта 55.7512, долгота 37.6184): 48 220 байт',
      'APP1-XMP (Google Photos Gaia ID & Adobe GUID): 242 110 байт',
      'APP13 (Photoshop IRB / IPTC метаданные): 32 410 байт',
      'COM (Текстовый комментарий устройства): 9 000 байт',
      'Скрытая EXIF-миниатюра (Thumbnail): удалена',
    ],
    success: true,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// DFIR C2 HUNTER & SHANNON ENTROPY TYPES & IPC
// ---------------------------------------------------------------------------

export interface EntropyAnalysisResult {
  input_length: number;
  entropy: number;
  max_possible_entropy: number;
  entropy_ratio: number;
  is_suspicious: boolean;
  assessment: string;
}

export interface DgaDetectionResult {
  domain: string;
  sld: string;
  entropy: number;
  is_dga_suspected: boolean;
  confidence_percent: number;
  reasons: string[];
  mitre_technique: string;
}

export interface HttpC2AnalysisResult {
  url: string;
  url_entropy: number;
  is_url_suspicious: boolean;
  headers_entropy: Array<[string, number, boolean]>;
  is_c2_suspected: boolean;
  reasons: string[];
  mitre_technique: string;
}

export interface NamedPipeAlert {
  pipe_name: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  is_known_c2: boolean;
  is_whitelisted: boolean;
  entropy: number;
  description: string;
  mitre_technique: string;
}

export function calculateShannonEntropyClient(str: string): number {
  if (!str || str.length === 0) return 0;
  const map: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    map[c] = (map[c] || 0) + 1;
  }
  const len = str.length;
  let entropy = 0;
  for (const c in map) {
    const p = map[c] / len;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * 1000) / 1000;
}

export async function checkEntropyScoreIPC(data: string): Promise<EntropyAnalysisResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<EntropyAnalysisResult>('check_entropy_score', { data });
  }
  const ent = calculateShannonEntropyClient(data);
  const maxEnt = data.length > 1 ? Math.min(8.0, Math.log2(data.length)) : 0;
  const isSuspicious = ent >= 4.0;
  return {
    input_length: data.length,
    entropy: ent,
    max_possible_entropy: Math.round(maxEnt * 1000) / 1000,
    entropy_ratio: maxEnt > 0 ? Math.round((ent / maxEnt) * 1000) / 1000 : 0,
    is_suspicious: isSuspicious,
    assessment: isSuspicious
      ? '⚠️ Высокая энтропия: строка хаотична (возможен C2 токен, зашифрованный пейлоад или Base64 shellcode)'
      : 'Нормальная энтропия человекочитаемого текста или стандартного пути',
  };
}

export async function checkDomainDgaIPC(domain: string): Promise<DgaDetectionResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<DgaDetectionResult>('check_domain_dga', { domain });
  }
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  const parts = clean.split('.');
  const sld = parts.length >= 2 ? parts[parts.length - 2] : clean;
  const ent = calculateShannonEntropyClient(sld);
  const isDga = ent >= 3.85 || (sld.length >= 14 && ent >= 3.6);
  const reasons: string[] = [];
  if (ent >= 3.85) reasons.push(`Высокая энтропия SLD (${ent.toFixed(2)} ≥ 3.85)`);
  if (sld.length >= 14) reasons.push(`Аномальная длина SLD (${sld.length} символов)`);
  if (/[0-9]{4,}/.test(sld)) reasons.push('Пакетные числовые последовательности в домене');

  return {
    domain: clean,
    sld,
    entropy: ent,
    is_dga_suspected: isDga,
    confidence_percent: isDga ? Math.min(99, Math.round((ent / 4.5) * 100)) : 10,
    reasons: reasons.length ? reasons : ['Энтропия и структура домена в пределах нормы'],
    mitre_technique: 'T1568.002 (Dynamic Resolution: Domain Generation Algorithms)',
  };
}

export async function checkHttpC2IPC(
  url: string,
  headers?: Record<string, string>,
  body?: string
): Promise<HttpC2AnalysisResult> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<HttpC2AnalysisResult>('check_http_c2', { url, headers, body });
  }
  const urlEnt = calculateShannonEntropyClient(url);
  const isUrlSuspicious = urlEnt >= 4.4;
  const headersEntropy: Array<[string, number, boolean]> = [];
  const reasons: string[] = [];

  if (isUrlSuspicious) {
    reasons.push(`Энтропия URI (${urlEnt.toFixed(2)}) превышает порог 4.40`);
  }

  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      const hEnt = calculateShannonEntropyClient(v);
      const isSusp = hEnt >= 4.8;
      headersEntropy.push([k, hEnt, isSusp]);
      if (isSusp) {
        reasons.push(`Заголовок «${k}» содержит данные высокой энтропии (${hEnt.toFixed(2)})`);
      }
    }
  }

  const isC2 = isUrlSuspicious || headersEntropy.some(([, , susp]) => susp);

  return {
    url,
    url_entropy: urlEnt,
    is_url_suspicious: isUrlSuspicious,
    headers_entropy: headersEntropy,
    is_c2_suspected: isC2,
    reasons: reasons.length ? reasons : ['Признаков маскировки C2 HTTP трафика не выявлено'],
    mitre_technique: 'T1071.001 (Application Layer Protocol: Web Protocols)',
  };
}

export async function scanNamedPipesIPC(): Promise<NamedPipeAlert[]> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<NamedPipeAlert[]>('scan_named_pipes');
  }
  // Sandbox Demo Pipes
  return [
    {
      pipe_name: '\\\\.\\pipe\\spoolss',
      severity: 'low',
      is_known_c2: false,
      is_whitelisted: true,
      entropy: 2.12,
      description: 'Легитимный системный канал Windows (Print Spooler)',
      mitre_technique: 'T1570 (System Baseline)',
    },
    {
      pipe_name: '\\\\.\\pipe\\samr',
      severity: 'low',
      is_known_c2: false,
      is_whitelisted: true,
      entropy: 2.0,
      description: 'Легитимный системный канал Windows (Security Account Manager)',
      mitre_technique: 'T1570 (System Baseline)',
    },
    {
      pipe_name: '\\\\.\\pipe\\msagent_84f9',
      severity: 'critical',
      is_known_c2: true,
      is_whitelisted: false,
      entropy: 3.82,
      description: '⚠️ ОБНАРУЖЕН АКТИВНЫЙ ХАКЕРСКИЙ C2 PIPE: Cobalt Strike Default Pipe Profile',
      mitre_technique: 'T1570 (Lateral Movement: Lateral Tool Transfer)',
    },
    {
      pipe_name: '\\\\.\\pipe\\sliver_session_01',
      severity: 'critical',
      is_known_c2: true,
      is_whitelisted: false,
      entropy: 3.75,
      description: '⚠️ ОБНАРУЖЕН АКТИВНЫЙ ХАКЕРСКИЙ C2 PIPE: BishopFox Sliver C2 Framework Pipe',
      mitre_technique: 'T1570 (Lateral Movement: Lateral Tool Transfer)',
    },
    {
      pipe_name: '\\\\.\\pipe\\a9f4c2e1b8d3',
      severity: 'high',
      is_known_c2: false,
      is_whitelisted: false,
      entropy: 3.78,
      description: 'Подозрительный канал с псевдослучайным именем (признак C2 Beacon)',
      mitre_technique: 'T1570 (Lateral Movement)',
    },
  ];
}

export async function checkNamedPipeNameIPC(pipeName: string): Promise<NamedPipeAlert> {
  if (isTauriEnvironment()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<NamedPipeAlert>('check_named_pipe_name', { pipeName });
  }
  const clean = pipeName.toLowerCase().replace(/^\\\\\\.\\pipe\\/, '').replace(/^\/pipe\//, '');
  const ent = calculateShannonEntropyClient(clean);
  const knownC2: Record<string, string> = {
    msagent: 'Cobalt Strike Default Pipe',
    status: 'Cobalt Strike Status Channel',
    postex: 'Cobalt Strike Post-Exploitation Pipe',
    meterpreter: 'Metasploit Meterpreter Pipe',
    sliver: 'Sliver C2 Framework Pipe',
    havoc: 'Havoc C2 Demon Pipe',
  };

  for (const [k, desc] of Object.entries(knownC2)) {
    if (clean.includes(k)) {
      return {
        pipe_name: pipeName,
        severity: 'critical',
        is_known_c2: true,
        is_whitelisted: false,
        entropy: ent,
        description: `⚠️ ОБНАРУЖЕН АКТИВНЫЙ ХАКЕРСКИЙ C2 PIPE: ${desc}`,
        mitre_technique: 'T1570 (Lateral Movement: Lateral Tool Transfer)',
      };
    }
  }

  const whitelist = ['spoolss', 'samr', 'lsarpc', 'netlogon', 'wkssvc', 'srvsvc', 'epmapper'];
  if (whitelist.includes(clean)) {
    return {
      pipe_name: pipeName,
      severity: 'low',
      is_known_c2: false,
      is_whitelisted: true,
      entropy: ent,
      description: 'Легитимный системный канал Windows / ПО',
      mitre_technique: 'T1570 (System Baseline)',
    };
  }

  const isHex = clean.length >= 6 && /^[0-9a-f]+$/i.test(clean);
  return {
    pipe_name: pipeName,
    severity: isHex || ent >= 3.6 ? 'high' : 'medium',
    is_known_c2: false,
    is_whitelisted: false,
    entropy: ent,
    description: isHex || ent >= 3.6 ? 'Подозрительный канал с псевдослучайным именем (признак C2 Beacon)' : 'Нестандартный канал',
    mitre_technique: 'T1570 (Lateral Movement)',
  };
}
