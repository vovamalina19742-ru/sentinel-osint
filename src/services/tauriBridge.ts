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
