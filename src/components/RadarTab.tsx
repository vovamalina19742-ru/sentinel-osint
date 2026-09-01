import React, { useState } from 'react';
import { RadarMap } from './RadarMap';
import { lookupBSSIDCoordinates, WirelessPoint, normalizeBSSID } from '../services/wirelessService';

export const RadarTab: React.FC = () => {
  const [inputBssid, setInputBssid] = useState('');
  const [points, setPoints] = useState<WirelessPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<WirelessPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      {/* Панель поиска */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              Беспроводная радиоразведка (SIGINT / BSSID Geo)
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Режим А: Пассивная геолокация точек доступа по BSSID (MAC-адресу) без повышенных привилегий
            </p>
          </div>
        </div>

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
            {loading ? 'Поиск...' : '📡 Определить координаты'}
          </button>
        </form>

        {error && (
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
            <span>Обнаруженные точки ({points.length})</span>
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
                История гео-поиска точек доступа пока пуста
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
                    <span className="text-emerald-400">{pt.source}</span>
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
