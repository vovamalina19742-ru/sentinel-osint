import React, { useState } from 'react';
import {
  Shield,
  ShieldAlert,
  Search,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Camera,
  UploadCloud,
  FileSearch,
  RefreshCw,
  Download,
  Printer,
  Database,
  Trash2,
  Clock,
  FileText,
  Sparkles,
  Zap,
} from 'lucide-react';
import { TargetType, InvestigationDossier, ImageComparisonResult, InvestigationStep } from './types/dossier';
import { compareImagesIPC, startInvestigationIPC, isTauriEnvironment, saveDossierIPC, getHistoryIPC, deleteDossierIPC, InvestigationHistoryItem } from './services/tauriBridge';
import { InvestigationProgress } from './components/InvestigationProgress';
import { RadarTab } from './components/RadarTab';
import { ForensicsTab } from './components/ForensicsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<'osint' | 'phash' | 'history' | 'radar' | 'forensics'>('osint');
  const [historyItems, setHistoryItems] = useState<InvestigationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // OSINT State
  const [target, setTarget] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('username');
  const [dossier, setDossier] = useState<InvestigationDossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<InvestigationStep[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentService, setCurrentService] = useState('');

  // pHash Image Scanner State
  const [img1, setImg1] = useState<string | null>(null);
  const [img2, setImg2] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ImageComparisonResult | null>(null);


  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const items = await getHistoryIPC(50);
      setHistoryItems(items);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDossierIPC(id);
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Dynamic Trust Score calculation
  const calculateDynamicScore = (d: InvestigationDossier): number => {
    const verifiedCount = d.profiles.filter((p) => p.exists).length;
    let score = 50 + verifiedCount * 9;

    for (const rf of d.red_flags) {
      if (rf.severity === 'critical') score -= 35;
      else if (rf.severity === 'high') score -= 20;
      else if (rf.severity === 'medium') score -= 10;
    }

    return Math.max(5, Math.min(98, score));
  };

  // Export report to clean Markdown
  const exportMarkdownReport = () => {
    if (!dossier) return;
    const dateStr = new Date(dossier.created_at).toLocaleString('ru-RU');
    const score = calculateDynamicScore(dossier);

    const mdContent = `# 🛡️ Досье расследования: ${dossier.target}
**Платформа:** Sentinel-OSINT v2.1 Forensics
**Дата формирования:** ${dateStr}
**Тип цели:** \`${dossier.target_type}\`
**Итоговый рейтинг доверия (Trust Score):** **${score}%** ${score >= 80 ? '🟢 (Высокий)' : score >= 50 ? '🟡 (Средний)' : '🔴 (Критический риск)'}

---

## 📋 Сводка аналитического отчёта
${dossier.summary}

---

## 🌐 Обнаруженные профили и цифровой след
| Платформа | Статус | Ссылка на профиль |
| :--- | :---: | :--- |
${dossier.profiles.map(p => `| **${p.platform}** | ${p.exists ? '✅ Найден' : '❌ Не найден'} | ${p.exists ? `[${p.url}](${p.url})` : '—'} |`).join('\n')}

---

## ⚠️ Факторы риска и верификация
${dossier.red_flags.length === 0 ? '_Критических факторов риска не обнаружено._' : dossier.red_flags.map(rf => `### [${rf.severity.toUpperCase()}] ${rf.title}\n- **Источник:** ${rf.source}\n- **Описание:** ${rf.description}`).join('\n\n')}

---
*Сформировано автоматически Sentinel-OSINT Core Engine.*
`;

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sentinel_Dossier_${dossier.target}_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export / Print PDF
  const exportPdfReport = () => {
    window.print();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim() || loading) return;

    setLoading(true);
    setDossier(null);
    setSteps([]);
    setProgressPercent(0);
    setCurrentMessage('Запуск поисковых агентов...');

    try {
      const result = await startInvestigationIPC(target, targetType, (step) => {
        setSteps((prev) => {
          // Avoid duplicate ids
          const filtered = prev.filter((s) => s.id !== step.id);
          return [...filtered, step];
        });
        setProgressPercent(step.progress_percent);
        setCurrentMessage(step.message);
        setCurrentService(step.platform);
      });
      setDossier(result);
      await saveDossierIPC(result);
    } catch (err) {
      console.error('Investigation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (slot === 1) setImg1(base64);
      else setImg2(base64);
      setComparisonResult(null);
    };
    reader.readAsDataURL(file);
  };

  const runPhashComparison = async () => {
    if (!img1 || !img2 || comparing) return;
    setComparing(true);
    try {
      const res = await compareImagesIPC(img1, img2);
      setComparisonResult(res);
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setComparing(false);
    }
  };

  const loadSamplePreset = () => {
    try {
      const createSamplePng = (bgColor: string, text: string): string => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, 300, 300);

        // Phone body
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(60, 30, 180, 240, 24);
        } else {
          ctx.rect(60, 30, 180, 240);
        }
        ctx.fill();

        // Phone screen
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(70, 42, 160, 216, 16);
        } else {
          ctx.rect(70, 42, 160, 216);
        }
        ctx.fill();

        // Dynamic Island / Camera
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(150, 58, 7, 0, Math.PI * 2);
        ctx.fill();

        // Text label
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text, 150, 155);

        return canvas.toDataURL('image/png');
      };

      const p1 = createSamplePng('#1e293b', 'Lot #1 (Original)');
      const p2 = createSamplePng('#0f172a', 'Lot #2 (Re-uploaded)');
      setImg1(p1);
      setImg2(p2);
      setComparisonResult(null);
    } catch (err) {
      console.error('Error generating sample:', err);
    }

    setComparisonResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-zinc-100 font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight flex items-center gap-2">
              Sentinel-OSINT
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                v2.1 Forensics
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">Unified AI-Native Intelligence & Anti-Scam Platform</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-border p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('osint')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'osint' ? 'bg-primary text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            Разведка (OSINT)
          </button>
          <button
            onClick={() => setActiveTab('phash')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'phash' ? 'bg-primary text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Анти-скам pHash DCT-II
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              loadHistory();
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-primary text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            История (SQLite)
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'radar' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/40' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>📡</span>
            Радиоразведка
          </button>
          <button
            onClick={() => setActiveTab('forensics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'forensics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/40' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Форензика (v2.1)
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {isTauriEnvironment() ? 'Tauri IPC Active' : 'Web Sandbox'}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {activeTab === 'osint' ? (
          /* TAB 1: OSINT Hub */
          <div className="space-y-6 animate-in fade-in duration-200">
            <section className="bg-card border border-border rounded-2xl p-6 shadow-xl">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-300">Целевой объект расследования</label>
                  <div className="flex items-center gap-1.5 bg-zinc-900 border border-border p-1 rounded-lg text-xs">
                    {(['username', 'email', 'phone', 'image', 'listing_url'] as TargetType[]).map((type) => (
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
                    placeholder={
                      targetType === 'email'
                        ? 'Введите email для проверки по 120+ сайтам (Holehe)...'
                        : 'Введите никнейм для сбора цифрового следа (Maigret)...'
                    }
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
                        Сбор данных...
                      </>
                    ) : (
                      <>Собрать досье</>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Real-time Streaming Progress Bar */}
            {loading && (
              <InvestigationProgress
                steps={steps}
                progressPercent={progressPercent}
                currentMessage={currentMessage}
                currentService={currentService}
              />
            )}

            {/* Dossier Results */}
            {dossier && !loading && (
              <section className="space-y-6 animate-in fade-in duration-300 print:m-0 print:p-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900/60 border border-border p-4 rounded-xl print:hidden">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-zinc-200">
                      Досье на цель: <strong className="text-primary font-mono">{dossier.target}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={exportMarkdownReport}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      Экспорт в Markdown
                    </button>
                    <button
                      type="button"
                      onClick={exportPdfReport}
                      className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Печать / PDF
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-400">Динамический Trust Score</p>
                      <p className={`text-3xl font-bold mt-1 ${
                        calculateDynamicScore(dossier) >= 80 ? 'text-emerald-400' : calculateDynamicScore(dossier) >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {calculateDynamicScore(dossier)}%
                      </p>
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
                      <p className="text-3xl font-bold text-zinc-100 mt-1">{dossier.red_flags.length}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Summary Banner */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-border text-xs text-zinc-300 leading-relaxed">
                  <span className="font-semibold text-primary block mb-1">Сводка аналитического отчёта:</span>
                  {dossier.summary}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card border border-border rounded-xl p-5 space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
                      <Globe className="w-4 h-4 text-primary" /> Обнаруженные аккаунты
                    </h3>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                      <AlertTriangle className="w-4 h-4 text-amber-400" /> Факторы риска и верификация
                    </h3>
                    <div className="space-y-2">
                      {dossier.red_flags.map((rf) => (
                        <div key={rf.id} className="p-3 rounded-lg bg-zinc-900/60 border border-border text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-zinc-200">{rf.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                              {rf.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-zinc-400">{rf.description}</p>
                          <span className="text-[10px] text-zinc-500 font-mono block">Источник: {rf.source}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : activeTab === 'phash' ? (
          /* TAB 2: pHash DCT-II Visual Scanner */
          <div className="space-y-6 animate-in fade-in duration-200">
            <section className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Нативный перцептивный фото-детектор (pHash DCT-II)
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Сравнение двух фотографий на уровне частотных гармоник (устойчив к сжатию, фильтрам и обрезке).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadSamplePreset}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Загрузить тестовый образец
                </button>
              </div>

              {/* Upload Slots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Slot 1 */}
                <div className="border-2 border-dashed border-zinc-700/80 hover:border-primary/60 rounded-2xl p-4 text-center bg-zinc-900/40 transition-colors relative flex flex-col items-center justify-center min-h-[220px]">
                  {img1 ? (
                    <div className="space-y-2 w-full">
                      <img src={img1} alt="Target 1" className="h-36 mx-auto rounded-lg object-contain border border-border bg-black/40" />
                      <p className="text-xs text-zinc-400">Фотография №1 (Проверяемый лот)</p>
                      <label className="text-[11px] text-primary hover:underline cursor-pointer">
                        Заменить
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 1)} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-medium text-zinc-300">Загрузить фото №1 (Цель)</span>
                      <span className="text-[10px] text-zinc-500">PNG, JPG, WebP до 10 МБ</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 1)} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Slot 2 */}
                <div className="border-2 border-dashed border-zinc-700/80 hover:border-primary/60 rounded-2xl p-4 text-center bg-zinc-900/40 transition-colors relative flex flex-col items-center justify-center min-h-[220px]">
                  {img2 ? (
                    <div className="space-y-2 w-full">
                      <img src={img2} alt="Target 2" className="h-36 mx-auto rounded-lg object-contain border border-border bg-black/40" />
                      <p className="text-xs text-zinc-400">Фотография №2 (Эталон / Архив скамов)</p>
                      <label className="text-[11px] text-primary hover:underline cursor-pointer">
                        Заменить
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 2)} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-medium text-zinc-300">Загрузить фото №2 (Архив)</span>
                      <span className="text-[10px] text-zinc-500">PNG, JPG, WebP до 10 МБ</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 2)} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={runPhashComparison}
                  disabled={!img1 || !img2 || comparing}
                  className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-lg shadow-primary/20 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {comparing ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                      Вычисление DCT-II гармоник...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Сверить перцептивные хэши (IPC / Rust)
                    </>
                  )}
                </button>
              </div>

              {/* Results Dashboard */}
              {comparisonResult && (
                <div className="mt-6 p-5 rounded-2xl bg-zinc-900/90 border border-border space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-border/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          comparisonResult.is_duplicate
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {comparisonResult.is_duplicate ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-100">{comparisonResult.verdict}</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Расстояние Хэмминга:{' '}
                          <span className="font-mono font-bold text-zinc-200">{comparisonResult.hamming_distance}</span> из 64 бит
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-zinc-400">Коэффициент сходства</span>
                      <p
                        className={`text-2xl font-black ${
                          comparisonResult.similarity_percent >= 85
                            ? 'text-rose-400'
                            : comparisonResult.similarity_percent >= 75
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {comparisonResult.similarity_percent}%
                      </p>
                    </div>
                  </div>

                  {/* Hash Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-black/40 border border-border">
                      <span className="text-zinc-500 block mb-1">pHash (Фото 1):</span>
                      <span className="text-primary">{comparisonResult.hash1}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-black/40 border border-border">
                      <span className="text-zinc-500 block mb-1">pHash (Фото 2):</span>
                      <span className="text-primary">{comparisonResult.hash2}</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : activeTab === 'history' ? (
          /* TAB 3: SQLite History View */
          <div className="space-y-6 animate-in fade-in duration-200">
            <section className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-zinc-100">Локальная база расследований (SQLite)</h2>
                    <p className="text-xs text-zinc-400">Автономное шифрованное хранение собранных досье с мгновенным доступом.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadHistory}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Обновить
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-zinc-400">Загрузка базы данных...</div>
              ) : historyItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  База пуста. Проведите хотя бы одно расследование, и досье автоматически сохранится здесь.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-border transition-colors group"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className={`text-base font-bold font-mono px-2.5 py-1 rounded-lg ${
                          item.trust_score >= 80
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.trust_score >= 50
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {item.trust_score}%
                        </span>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-zinc-100">{item.target}</span>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {item.target_type}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{item.summary}</p>
                          <span className="text-[10px] text-zinc-500 font-mono block mt-1">
                            {new Date(item.created_at).toLocaleString('ru-RU')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistory(item.id, e)}
                        className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                        title="Удалить запись"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : activeTab === 'radar' ? (
          <RadarTab />
        ) : activeTab === 'forensics' ? (
          <ForensicsTab />
        ) : null}
      </main>
    </div>
  );
}
