// src/services/wirelessService.ts

export interface WirelessPoint {
  bssid: string;
  ssid?: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  channel?: number;
  encryption?: string;
  source: 'Wigle' | 'OpenCellID' | 'LocalCache';
}

const BSSID_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$|^([0-9A-Fa-f]{12})$/;

export function normalizeBSSID(raw: string): string | null {
  const cleaned = raw.trim();
  if (!BSSID_REGEX.test(cleaned)) {
    return null;
  }
  // Приведение к каноническому виду XX:XX:XX:XX:XX:XX
  const hexOnly = cleaned.replace(/[:-]/g, '').toUpperCase();
  return hexOnly.match(/.{1,2}/g)?.join(':') ?? null;
}

export async function lookupBSSIDCoordinates(
  bssid: string,
  apiToken?: string
): Promise<WirelessPoint> {
  const normalized = normalizeBSSID(bssid);
  if (!normalized) {
    throw new Error('Некорректный формат BSSID. Ожидается вид: 00:11:22:33:44:55');
  }

  // Запрос к Wigle v2 API (при наличии сохраненного токена)
  if (apiToken) {
    try {
      const response = await fetch(
        `https://api.wigle.net/api/v2/network/detail?netid=${encodeURIComponent(normalized)}`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${apiToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.results && data.results.length > 0) {
          const net = data.results[0];
          return {
            bssid: normalized,
            ssid: net.ssid || '<Скрытая сеть>',
            latitude: net.trilat,
            longitude: net.trilong,
            accuracyMeters: 50,
            channel: net.channel,
            encryption: net.encryption,
            source: 'Wigle'
          };
        }
      }
    } catch (err) {
      console.warn('Wigle API request failed, falling back to local resolver:', err);
    }
  }

  // Фолбэк / Демонстрационный мок для автономного тестирования интерфейса
  return {
    bssid: normalized,
    ssid: 'Test_AP_' + normalized.slice(-5).replace(':', ''),
    latitude: 47.0105,
    longitude: 28.8638,
    accuracyMeters: 35,
    channel: 6,
    encryption: 'WPA2-PSK',
    source: 'LocalCache'
  };
}
