import { ImageComparisonResult } from '../types/dossier';

// Check if running inside Tauri desktop shell
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Safe invoke wrapper
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

  // Realistic browser simulation for web testing
  await new Promise((r) => setTimeout(r, 600));
  
  // Deterministic mock based on length difference
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
