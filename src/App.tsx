import React, { useState } from 'react';
import { Shield, Search, AlertTriangle, CheckCircle2, Globe } from 'lucide-react';
import { TargetType, InvestigationDossier } from './types/dossier';

export default function App() {
  const [target, setTarget] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('username');
  const [dossier, setDossier] = useState<InvestigationDossier | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    setLoading(true);
    // Simulated investigation dossier
    setTimeout(() => {
      setDossier({
        id: crypto.randomUUID(),
        target,
        targetType,
        trustScore: 82,
        createdAt: new Date().toISOString(),
        summary: `Автоматическое расследование по цели "${target}". Найдено 4 связанных профиля, 1 предупреждение о повторной активности.`,
        redFlags: [
          {
            id: 'rf-1',
            source: 'pHash Engine',
            title: 'Уникальность медиа-файлов',
            description: 'Повторных совпадений фото в базе известных скам-паттернов не обнаружено.',
            severity: 'low'
          }
        ],
        profiles: [
          { platform: 'GitHub', url: `https://github.com/${target}`, exists: true },
          { platform: 'Telegram', url: `https://t.me/${target}`, exists: true },
          { platform: 'Reddit', url: `https://reddit.com/user/${target}`, exists: false }
        ],
        rawFindings: { engine: 'Sentinel-OSINT Core v0.1' }
      });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-zinc-100">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">Sentinel-OSINT</h1>
            <p className="text-xs text-zinc-400 mt-1">Unified AI-Native Intelligence & Anti-Scam Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            100% Local-First
          </span>
          <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300">
            Tauri v2 + MCP
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {/* Search Hero */}
        <section className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">Целевой объект расследования</label>
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-border p-1 rounded-lg text-xs">
                {(['username', 'phone', 'email', 'image', 'listing_url'] as TargetType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTargetType(type)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      targetType === type ? 'bg-primary text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Введите никнейм, номер телефона (+373...), email или ссылку..."
                className="w-full h-12 pl-11 pr-32 rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-zinc-100 placeholder:text-zinc-500"
              />
              <Search className="w-5 h-5 text-zinc-500 absolute left-3.5 top-3.5" />
              <button
                type="submit"
                disabled={loading || !target.trim()}
                className="absolute right-2 top-2 h-8 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    Анализ...
                  </>
                ) : (
                  <>Собрать досье</>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Results Area */}
        {dossier && (
          <section className="space-y-6 animate-in fade-in duration-300">
            {/* Trust Score Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400">Рейтинг доверия (Trust Score)</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">{dossier.trustScore}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400">Связанные профили</p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {dossier.profiles.filter((p) => p.exists).length} <span className="text-sm font-normal text-zinc-500">из {dossier.profiles.length}</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Globe className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400">Красные флаги / Риски</p>
                  <p className="text-3xl font-bold text-zinc-100 mt-1">{dossier.redFlags.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Profiles & Red Flags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
                  <Globe className="w-4 h-4 text-primary" /> Обнаруженные аккаунты
                </h3>
                <div className="space-y-2">
                  {dossier.profiles.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-border text-xs">
                      <span className="font-medium">{p.platform}</span>
                      {p.exists ? (
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-[200px]">
                          {p.url}
                        </a>
                      ) : (
                        <span className="text-zinc-500">Не найден</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Проверка безопасности
                </h3>
                <div className="space-y-2">
                  {dossier.redFlags.map((rf) => (
                    <div key={rf.id} className="p-3 rounded-lg bg-zinc-900/60 border border-border text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-zinc-200">{rf.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                          {rf.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-zinc-400">{rf.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
