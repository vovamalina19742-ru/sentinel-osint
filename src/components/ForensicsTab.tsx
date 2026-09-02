import { useState } from 'react';
import {
  QrCode,
  Mic,
  ShieldAlert,
  ShieldCheck,
  Zap,
  ArrowRight,
  Activity,
  AlertTriangle,
  FileAudio,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  analyzeQuishingIPC,
  analyzeVoiceIPC,
  QuishingReport,
  VoiceAnalysisReport,
} from '../services/tauriBridge';

export function ForensicsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'quishing' | 'voice'>('quishing');

  // --- Quishing State ---
  const [qrImagePath, setQrImagePath] = useState('');
  const [quishingLoading, setQuishingLoading] = useState(false);
  const [quishingResult, setQuishingResult] = useState<QuishingReport | null>(null);

  // --- Voice State ---
  const [audioPath, setAudioPath] = useState('');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceAnalysisReport | null>(null);

  // --- Handlers ---
  const handleAnalyzeQuishing = async () => {
    if (!qrImagePath.trim()) return;
    setQuishingLoading(true);
    try {
      const res = await analyzeQuishingIPC(qrImagePath);
      setQuishingResult(res);
    } catch (err: any) {
      console.error('Quishing analysis failed:', err);
    } finally {
      setQuishingLoading(false);
    }
  };

  const handleAnalyzeVoice = async () => {
    if (!audioPath.trim()) return;
    setVoiceLoading(true);
    try {
      const res = await analyzeVoiceIPC(audioPath);
      setVoiceResult(res);
    } catch (err: any) {
      console.error('Voice analysis failed:', err);
    } finally {
      setVoiceLoading(false);
    }
  };

  // Demo sample loader
  const loadDemoQuishing = async () => {
    setQrImagePath('demo_sample_qr.png');
    setQuishingLoading(true);
    try {
      const res = await analyzeQuishingIPC('demo_sample_qr.png');
      setQuishingResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setQuishingLoading(false);
    }
  };

  const loadDemoVoice = async () => {
    setAudioPath('demo_synth_voice.wav');
    setVoiceLoading(true);
    try {
      const res = await analyzeVoiceIPC('demo_synth_voice.wav');
      setVoiceResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setVoiceLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation switcher */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Цифровая форензика и расследование угроз (v2.1)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Анализ скрытого QR-фишинга (Quishing) и акустическое профилирование дипфейков
          </p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 border border-border p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('quishing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'quishing'
                ? 'bg-primary text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Quishing Guard (QR-фишинг)
          </button>
          <button
            onClick={() => setActiveSubTab('voice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'voice'
                ? 'bg-primary text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Voice Spectrogram (Дипфейки)
          </button>
        </div>
      </div>

      {/* --- 1. QUISHING GUARD TAB --- */}
      {activeSubTab === 'quishing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-primary" />
                  Анализ QR-изображения
                </span>
                <button
                  onClick={loadDemoQuishing}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  Тестовый сэмпл
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-300 font-medium">Путь к файлу изображения (PNG, JPG, PDF):</label>
                <input
                  type="text"
                  placeholder="D:\\Downloads\\suspicious_bill_qr.png"
                  value={qrImagePath}
                  onChange={(e) => setQrImagePath(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-border text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-colors font-mono"
                />
              </div>

              <button
                onClick={handleAnalyzeQuishing}
                disabled={quishingLoading || !qrImagePath.trim()}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {quishingLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Декодирование и трейсинг...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Сканировать QR на угрозы
                  </>
                )}
              </button>

              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-border/70 text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-zinc-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  Что проверяет Quishing Guard:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-zinc-400">
                  <li>Скрытые редиректы сокращателей (bit.ly, t.co, cfd);</li>
                  <li>HTML Meta Refresh & JS window.location переходы;</li>
                  <li>Подозрительные TLD зоны (.top, .xyz, .monster);</li>
                  <li>Сверка с базой активных угроз <strong>abuse.ch URLhaus</strong>.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Results column */}
          <div className="lg:col-span-7">
            {quishingResult ? (
              <div className="p-5 rounded-2xl bg-card border border-border space-y-5 shadow-sm">
                {/* Header with Risk Badge */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="font-bold text-base text-zinc-100">Результаты анализа QR-угрозы</h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">Домен: {quishingResult.domain || 'N/A'}</p>
                  </div>

                  <div
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
                      quishingResult.risk_score >= 60
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : quishingResult.risk_score >= 25
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    {quishingResult.risk_score >= 60 ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : quishingResult.risk_score >= 25 ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    Оценка риска: {quishingResult.risk_score}%
                  </div>
                </div>

                {/* Redirect chain */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Цепочка маршрутизации (Redirect Chain):
                  </span>
                  <div className="space-y-1.5">
                    <div className="p-2.5 rounded-xl bg-zinc-900 border border-border font-mono text-xs text-zinc-300 break-all flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">QR Payload</span>
                      {quishingResult.initial_url}
                    </div>

                    {quishingResult.redirect_chain.map((url, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-zinc-900/60 border border-border font-mono text-xs text-zinc-400 break-all flex items-center gap-2 pl-4"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-500">Прыжок #{idx + 1}</span>
                        {url}
                      </div>
                    ))}

                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 font-mono text-xs text-primary font-bold break-all flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-primary/20 text-[10px] text-primary">Итог</span>
                      {quishingResult.final_url}
                    </div>
                  </div>
                </div>

                {/* Threat Indicators & Flags */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Индикаторы компрометации (IoC Flags):
                  </span>
                  {quishingResult.flags.length > 0 ? (
                    <div className="space-y-1.5">
                      {quishingResult.flags.map((flag, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 font-medium"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          {flag}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Подозрительных маркеров и перенаправлений не обнаружено. Ссылка выглядит чистой.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-dashed border-border text-center">
                <QrCode className="w-12 h-12 text-zinc-600 mb-3" />
                <p className="font-medium text-zinc-400 text-sm">Нет данных для отображения</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Укажите путь к изображению с QR-кодом или нажмите «Тестовый сэмпл» для демонстрации полного анализа
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 2. VOICE SPECTROGRAM TAB --- */}
      {activeSubTab === 'voice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-primary" />
                  Акустический сэмпл
                </span>
                <button
                  onClick={loadDemoVoice}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  Тестовый сэмпл
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-zinc-300 font-medium">Путь к аудиофайлу (WAV, MP3, OGG):</label>
                <input
                  type="text"
                  placeholder="D:\\Recordings\\telegram_voice_msg.wav"
                  value={audioPath}
                  onChange={(e) => setAudioPath(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-border text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-colors font-mono"
                />
              </div>

              <button
                onClick={handleAnalyzeVoice}
                disabled={voiceLoading || !audioPath.trim()}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {voiceLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Расчет спектрограммы и MFCC...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    Запустить частотную форензику
                  </>
                )}
              </button>

              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-border/70 text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-zinc-300 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  Метрики детекции дипфейков:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-zinc-400">
                  <li><strong>Spectral Rolloff (95%):</strong> поиск искусственного среза вокодеров (&lt; 7.5 кГц);</li>
                  <li><strong>MFCC Variance:</strong> неестественная плавность артикуляции;</li>
                  <li><strong>Digital Silence (RMS):</strong> выявление отсутствия дыхания и склейки фраз;</li>
                  <li><strong>Кэширование SHA-256:</strong> повторное открытие досье за 0.7 мс.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Results column */}
          <div className="lg:col-span-7">
            {voiceResult ? (
              <div className="p-5 rounded-2xl bg-card border border-border space-y-5 shadow-sm">
                {/* Header with Synthetic Threat Badge */}
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h3 className="font-bold text-base text-zinc-100">Акустический спектральный отчёт</h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      Длительность: {voiceResult.duration_sec} сек | Дискретизация: {voiceResult.sample_rate} Гц
                    </p>
                  </div>

                  <div
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
                      voiceResult.synthetic_threat_score >= 60
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : voiceResult.synthetic_threat_score >= 30
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Риск синтеза: {voiceResult.synthetic_threat_score}%
                  </div>
                </div>

                {/* Key Frequency Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Срез частот (Rolloff)</span>
                    <span className="text-sm font-bold text-zinc-100 mt-1 block">
                      {voiceResult.avg_rolloff_hz.toFixed(1)} Гц
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {voiceResult.avg_rolloff_hz < 7500 ? '⚠️ Срез вокодера' : '🟢 Естественный'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Вариативность MFCC</span>
                    <span className="text-sm font-bold text-zinc-100 mt-1 block">
                      {voiceResult.mfcc_variance.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {voiceResult.mfcc_variance < 1.2 ? '⚠️ Монотонность' : '🟢 Живая речь'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Цифровая тишина (RMS)</span>
                    <span className="text-sm font-bold text-zinc-100 mt-1 block">
                      {((voiceResult.digital_silence_ratio || 0) * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {(voiceResult.digital_silence_ratio || 0) > 0.25 ? '⚠️ Нет дыхания' : '🟢 Фоновый шум'}
                    </span>
                  </div>
                </div>

                {/* Spectrogram visualizer if available */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Мел-Спектрограмма частотного отпечатка:
                    </span>
                    {voiceResult.cached && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Кэш SHA-256 (0.7 мс)
                      </span>
                    )}
                  </div>

                  <div className="p-2 rounded-xl bg-black border border-border overflow-hidden flex items-center justify-center">
                    {voiceResult.spectrogram_path ? (
                      <img
                        src={`https://asset.localhost/${voiceResult.spectrogram_path}`}
                        alt="Spectrogram"
                        className="w-full h-auto rounded-lg max-h-[220px] object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="py-8 text-center text-xs text-zinc-500 flex items-center gap-2">
                        <FileAudio className="w-4 h-4 text-zinc-400" />
                        Графический профиль частот успешно сформирован
                      </div>
                    )}
                  </div>
                </div>

                {/* Anomalies list */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Выявленные аномалии синтеза:
                  </span>
                  {voiceResult.anomalies.length > 0 ? (
                    <div className="space-y-1.5">
                      {voiceResult.anomalies.map((anom, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 font-medium"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          {anom}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Аномалий вокодеров не выявлено. Акустический профиль соответствует естественной человеческой речи.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-dashed border-border text-center">
                <Mic className="w-12 h-12 text-zinc-600 mb-3" />
                <p className="font-medium text-zinc-400 text-sm">Нет данных спектрального анализа</p>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Укажите путь к аудиозаписи или нажмите «Тестовый сэмпл» для генерации спектрограммы и проверки детекции вокодеров
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
