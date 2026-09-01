import React, { useState, useEffect, useRef } from 'react';
import { RadarMap } from './RadarMap';
import { lookupBSSIDCoordinates, WirelessPoint, normalizeBSSID } from '../services/wirelessService';
import {
  checkAdminPrivilegesIPC,
  startRadioSnifferIPC,
  stopRadioSnifferIPC,
  SnifferEvent,
  isTauriEnvironment,
} from '../services/tauriBridge';

export const RadarTab: React.FC = () => {
  const [inputBssid, setInputBssid] = useState('');
  const [points, setPoints] = useState<WirelessPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<WirelessPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Режим Б: Локальный сниффер
  const [isSniffing, setIsSniffing] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [snifferPacketCount, setSnifferPacketCount] = useState(0);
  const [uacAlert, setUacAlert] = useState(false);

  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Проверка прав при монтировании компонента
    checkAdminPrivilegesIPC().then((admin) => setIsAdmin(admin));

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  const handleToggleSniffer = async () => {
    setError(null);
    setUacAlert(false);

    if (isSniffing) {
      // Остановка
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      await stopRadioSnifferIPC();
      setIsSniffing(false);
      return;
    }

    // Запуск сниффера: Проверка прав UAC
    const hasAdmin = await checkAdminPrivilegesIPC();
    setIsAdmin(hasAdmin);

    if (!hasAdmin && isTauriEnvironment()) {
      setUacAlert(true);
      setError('ElevationRequired: Для сканирования радиоэфира требуются права администратора (UAC)');
      return;
    }

    try {
      setIsSniffing(true);
      const cleanup = await startRadioSnifferIPC((event: SnifferEvent) => {
        if (event.type === 'BeaconDetected') {
          setSnifferPacketCount((c) => c + 1);
          const beacon = event.payload;

          setPoints((prev) => {
            const existingIdx = prev.findIndex((p) => p.bssid === beacon.bssid);
            if (existingIdx !== -1) {
              // Обновляем параметры существующей сети (уровень сигнала, канал)
              const updated = [...prev];
              updated[existingIdx] = {
                ...updated[existingIdx],
                channel: beacon.channel,
                encryption: beacon.encryption,
                accuracyMeters: Math.max(15, Math.abs(beacon.rssi)),
              };
              return updated;
            }

            // Добавляем новую сеть со смещением вокруг базового центра
            const latOffset = (Math.random() - 0.5) * 0.008;
            const lngOffset = (Math.random() - 0.5) * 0.008;
            const newPoint: WirelessPoint = {
              bssid: beacon.bssid,
              ssid: beacon.ssid,
              latitude: 47.0105 + latOffset,
              longitude: 28.8638 + lngOffset,
              accuracyMeters: Math.max(20, Math.abs(beacon.rssi)),
              channel: beacon.channel,
              encryption: beacon.encryption,
              source: 'LocalCache',
            };
            return [newPoint, ...prev];
          });
        } else if (event.type === 'Error') {
          setError(event.payload.message);
          setIsSniffing(false);
        } else if (event.type === 'Stopped') {
          setIsSniffing(false);
        }
      });

      cleanupRef.current = cleanup;
    } catch (err: any) {
      setError(err.message || 'Ошибка запуска сниффера');
      setIsSniffing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalized = normalizeBSSID(inputBssid);
    if (!normalized) {
      setError('Неверный формат BSSID (например: 00:11:22:33:44:55)');
      return;
    }

    setLoading(true);
    try {
      const result = await lookupBSSIDCoordinates(normalized);
      setPoints((prev) => [result, ...prev.filter((p) => p.bssid !== result.bssid)]);
      setSelectedPoint(result);
      setInputBssid('');
    } catch (err: any) {
      setError(err.message || 'Ошибка поиска координат точки доступа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Верхняя контрольная панель */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              Беспроводная радиоразведка (SIGINT / BSSID Geo)
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Режим А: Пассивная геолокация по BSSID | Режим Б: Локальный сниффер радиоэфира
            </p>
          </div>

          {/* Переключатель Режима Б (Сниффер) */}
          <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded-xl border border-zinc-800 self-start md:self-auto">
            <button
              onClick={handleToggleSniffer}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                isSniffing
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50 animate-pulse'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              <span>{isSniffing ? '⏹️' : '📡'}</span>
              <span>{isSniffing ? 'Остановить сниффер' : 'Запустить сниффер эфира'}</span>
            </button>

            {isSniffing && (
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-md border border-cyan-800/50">
                Пакетов: {snifferPacketCount}
              </span>
            )}

            {isAdmin !== null && (
              <span className={`text-[11px] font-mono px-2 py-1 rounded-md border ${
                isAdmin
                  ? 'bg-emerald-950/60 border-emerald-800/50 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}>
                {isAdmin ? '🛡️ Admin Privileges' : '👤 Standard User'}
              </span>
            )}
          </div>
        </div>

        {/* Форма поиска Режима А */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={inputBssid}
            onChange={(e) => setInputBssid(e.target.value)}
            placeholder="Введите BSSID роутера (например: C4:AD:34:D1:F2:A0)"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition flex items-center gap-2 shadow-lg shadow-cyan-950/40"
          >
            {loading ? 'Поиск...' : '📡 Найти координаты'}
          </button>
        </form>

        {uacAlert && (
          <div className="mt-3 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🛡️</span>
              <span>
                <strong>Внимание (UAC):</strong> Для перехвата сырых радиопакетов требуются повышенные права. Запустите терминал или ярлык от имени администратора.
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-200">
              Admin Required
            </span>
          </div>
        )}

        {error && !uacAlert && (
          <p className="text-rose-400 text-xs mt-3 font-mono bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-lg">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* Основной блок: Карта и список точек */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RadarMap points={points} selectedPoint={selectedPoint} />
        </div>

        {/* Список найденных сетей */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col h-[520px]">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>Обнаруженные точки ({points.length})</span>
              {isSniffing && (
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              )}
            </span>
            {points.length > 0 && (
              <button
                onClick={() => setPoints([])}
                className="text-xs text-zinc-400 hover:text-rose-400 transition"
              >
                Очистить
              </button>
            )}
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {points.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs text-center px-4">
                История радиоразведки пока пуста. Введите BSSID или запустите сниффер эфира.
              </div>
            ) : (
              points.map((pt) => (
                <div
                  key={pt.bssid}
                  onClick={() => setSelectedPoint(pt)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    selectedPoint?.bssid === pt.bssid
                      ? 'bg-cyan-950/50 border-cyan-500/80 shadow-md shadow-cyan-950/40'
                      : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-cyan-300 truncate max-w-[140px]">
                      {pt.ssid || '<Скрытая сеть>'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono border border-zinc-700">
                      Ch {pt.channel ?? '?'}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-zinc-400 mb-1">{pt.bssid}</div>
                  <div className="text-[11px] text-zinc-500 flex justify-between">
                    <span>{pt.latitude.toFixed(4)}, {pt.longitude.toFixed(4)}</span>
                    <span className="text-emerald-400 font-medium">{pt.source}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
