import { useState, useRef } from 'react';
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
  Image as ImageIcon,
  UploadCloud,
  FileCheck,
  Trash2,
  Lock,
  Flame,
  FileText as FileTextIcon,
} from 'lucide-react';
import {
  analyzeQuishingIPC,
  analyzeVoiceIPC,
  cleanPixelIPC,
  QuishingReport,
  VoiceAnalysisReport,
  CleanPixelReport,
} from '../services/tauriBridge';
import { buildIncidentDossier } from '../services/dossierEngine';
import { DossierModal } from './DossierModal';

export function ForensicsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'quishing' | 'voice' | 'cleanpixel'>('quishing');

  // --- Quishing State ---
  const [qrImagePath, setQrImagePath] = useState('');
  const [quishingLoading, setQuishingLoading] = useState(false);
  const [quishingResult, setQuishingResult] = useState<QuishingReport | null>(null);

  // --- Voice State ---
  const [audioPath, setAudioPath] = useState('');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceAnalysisReport | null>(null);

  // --- CleanPixel State ---
  const [cleanPixelLoading, setCleanPixelLoading] = useState(false);
  const [cleanPixelResult, setCleanPixelResult] = useState<CleanPixelReport | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleProcessCleanPixel = async (filename: string) => {
    setCleanPixelLoading(true);
    try {
      const res = await cleanPixelIPC(filename);
      setCleanPixelResult(res);
    } catch (err) {
      console.error('CleanPixel failed:', err);
    } finally {
      setCleanPixelLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessCleanPixel(file.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessCleanPixel(file.name);
    }
  };

  // Demo sample loaders
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

  const loadDemoCleanPixel = async () => {
    handleProcessCleanPixel('IMG_2026_Pixel_with_GPS.jpg');
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
            Анализ скрытого QR-фишинга (Quishing), детектор синтеза речи и мгновенная очистка EXIF/GUID
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDossierOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            <FileTextIcon className="w-3.5 h-3.5" />
            Сформировать Досье (v2.2)
          </button>

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
            Quishing Guard
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
            Voice Spectrogram
          </button>
          <button
            onClick={() => setActiveSubTab('cleanpixel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeSubTab === 'cleanpixel'
                ? 'bg-primary text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            CleanPixel (EXIF/GUID)
          </button>
        </div>
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
                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md"
              >
                {quishingLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Сканирование и трейсинг...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Распознать QR и оценить риск
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-border/80 text-xs text-zinc-400 space-y-2">
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <Info className="w-4 h-4 text-primary" />
                Что проверяет Quishing Guard:
              </div>
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li>Декодирование через буфер OpenCV (устойчиво к путям на кириллице);</li>
                <li>Безопасный трейсинг цепочки редиректов без загрузки вредоносного тела (stream=True);</li>
                <li>Детекция Meta Refresh и обфусцированных JS-перенаправлений;</li>
                <li>Сверка домена с чёрными списками abuse.ch URLhaus.</li>
              </ul>
            </div>
          </div>

          {/* Results column */}
          <div className="lg:col-span-7">
            {quishingResult ? (
              <div className="p-6 rounded-2xl bg-card border border-border space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <span className="text-xs text-zinc-400 font-mono">Домен назначения:</span>
                    <h3 className="text-lg font-bold text-zinc-100 font-mono flex items-center gap-2">
                      {quishingResult.domain || 'Не определен'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        quishingResult.risk_score >= 50
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : quishingResult.risk_score >= 20
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {quishingResult.risk_score >= 50 ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      Риск Quishing: {quishingResult.risk_score}%
                    </span>
                  </div>
                </div>

                {/* Redirect chain */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Цепочка перенаправлений (Redirect Chain):
                  </span>
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border space-y-2 text-xs font-mono">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">QR Payload</span>
                      <span className="truncate">{quishingResult.initial_url}</span>
                    </div>

                    {quishingResult.redirect_chain.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-amber-300 pl-4 border-l border-border/80">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                        <span className="truncate">{step}</span>
                      </div>
                    ))}

                    <div className="flex items-center gap-2 text-primary font-bold pl-4 border-l border-primary/50">
                      <ArrowRight className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span className="truncate">{quishingResult.final_url}</span>
                    </div>
                  </div>
                </div>

                {/* Flags and IoC */}
                {quishingResult.flags && quishingResult.flags.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Индикаторы компрометации (IoC Flags):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {quishingResult.flags.map((flag, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border text-center text-zinc-500">
                <QrCode className="w-12 h-12 mb-3 opacity-20 text-primary" />
                <p className="text-sm font-medium text-zinc-400">Нет данных для отображения</p>
                <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                  Укажите путь к изображению с QR-кодом или запустите тестовый сэмпл для визуализации маршрута редиректа.
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
                  Аудио-файл голосовой записи
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
                  placeholder="D:\\Recordings\\incoming_call.wav"
                  value={audioPath}
                  onChange={(e) => setAudioPath(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-border text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-primary transition-colors font-mono"
                />
              </div>

              <button
                onClick={handleAnalyzeVoice}
                disabled={voiceLoading || !audioPath.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-md"
              >
                {voiceLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Вычисление спектра и MFCC...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    Построить спектрограмму и оценить синтез
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-border/80 text-xs text-zinc-400 space-y-2">
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <Info className="w-4 h-4 text-primary" />
                Физика детекции аудио-дипфейков:
              </div>
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li><strong>Частотный срез (Rolloff):</strong> нейросетевые вокодеры (HiFi-GAN) резко обрезают спектр выше 7.5–8 кГц;</li>
                <li><strong>Вариативность MFCC:</strong> монотонность синтеза выдаёт неестественно гладкую артикуляцию;</li>
                <li><strong>Цифровая тишина (RMS):</strong> отсутствие микропауз дыхания и фонового шума помещения между словами;</li>
                <li><strong>Кэш SHA-256:</strong> мгновенный повторный вывод (0.7 мс).</li>
              </ul>
            </div>
          </div>

          {/* Results column */}
          <div className="lg:col-span-7">
            {voiceResult ? (
              <div className="p-6 rounded-2xl bg-card border border-border space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <span className="text-xs text-zinc-400 font-mono">Акустический отпечаток:</span>
                    <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                      <FileAudio className="w-4 h-4 text-primary" />
                      Запись {voiceResult.duration_sec} сек • {voiceResult.sample_rate} Гц
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {voiceResult.cached && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> кэш SHA-256
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        voiceResult.synthetic_threat_score >= 60
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : voiceResult.synthetic_threat_score >= 30
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Риск синтеза: {voiceResult.synthetic_threat_score}%
                    </span>
                  </div>
                </div>

                {/* Core acoustic metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-[11px] text-zinc-400 block mb-1">Срез частот (Rolloff)</span>
                    <span className="text-base font-bold text-zinc-100 font-mono">
                      {voiceResult.avg_rolloff_hz} Гц
                    </span>
                    <span className="text-[10px] text-amber-400 block mt-0.5">
                      {voiceResult.avg_rolloff_hz < 7500 ? '⚠️ Срез вокодера' : '🟢 Естественный диапазон'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-[11px] text-zinc-400 block mb-1">Вариативность MFCC</span>
                    <span className="text-base font-bold text-zinc-100 font-mono">
                      {voiceResult.mfcc_variance}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      {voiceResult.mfcc_variance < 1.2 ? '⚠️ Монотонность' : '🟢 Живая речь'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-[11px] text-zinc-400 block mb-1">Цифровая тишина (RMS)</span>
                    <span className="text-base font-bold text-zinc-100 font-mono">
                      {voiceResult.digital_silence_ratio !== undefined ? `${voiceResult.digital_silence_ratio}%` : '0.0%'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      {(voiceResult.digital_silence_ratio || 0) > 30 ? '⚠️ Нет дыхания' : '🟢 Фоновый шум'}
                    </span>
                  </div>
                </div>

                {/* Spectral Anomaly list */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Обнаруженные спектральные аномалии:
                  </span>
                  <div className="space-y-1.5">
                    {voiceResult.anomalies.map((anom, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-zinc-900 border border-border text-xs text-zinc-300 flex items-center gap-2"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{anom}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border text-center text-zinc-500">
                <Activity className="w-12 h-12 mb-3 opacity-20 text-primary" />
                <p className="text-sm font-medium text-zinc-400">Нет данных для отображения</p>
                <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                  Укажите путь к аудиозаписи или нажмите «Тестовый сэмпл» для расчёта акустических признаков нейросетевого голоса.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 3. CLEANPIXEL STUDIO TAB (DRAG & DROP) --- */}
      {activeSubTab === 'cleanpixel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dropzone & Control column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Lossless Metadata Stripper (Rust)
                </span>
                <button
                  onClick={loadDemoCleanPixel}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  Тестовый образец с GPS
                </button>
              </div>

              {/* Drag-and-Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : 'border-border/80 hover:border-primary/50 bg-zinc-900/40 hover:bg-zinc-900/80'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 shadow-inner">
                  {cleanPixelLoading ? (
                    <RefreshCw className="w-7 h-7 text-primary animate-spin" />
                  ) : (
                    <UploadCloud className="w-7 h-7 text-primary" />
                  )}
                </div>

                <h4 className="text-sm font-bold text-zinc-100 mb-1">
                  {cleanPixelLoading
                    ? 'Очистка байтового контейнера...'
                    : 'Перетащите сюда фото (JPEG / PNG)'}
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mb-3">
                  или нажмите для выбора файла на диске. 0% потери качества, пиксели не пережимаются.
                </p>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono bg-zinc-800 text-zinc-300 border border-border">
                  <Flame className="w-3 h-3 text-amber-400" />
                  1000+ фото/сек • CleanPixel Rust Core
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-border/80 text-xs text-zinc-400 space-y-2">
              <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                <Info className="w-4 h-4 text-primary" />
                Что удаляет CleanPixel:
              </div>
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li><strong>GPS координаты:</strong> точная геолокация съёмки (широта, долгота, высота);</li>
                <li><strong>Google & Adobe GUID:</strong> скрытые теги XMP/Gaia ID, привязывающие фото к аккаунту;</li>
                <li><strong>Скрытая EXIF-миниатюра:</strong> оригинальное превью, остающееся даже после замазывания;</li>
                <li><strong>100% сохранение качества:</strong> таблицы квантования и энтропийные пиксели остаются нетронутыми.</li>
              </ul>
            </div>
          </div>

          {/* CleanPixel Result column */}
          <div className="lg:col-span-6">
            {cleanPixelResult ? (
              <div className="p-6 rounded-2xl bg-card border border-border space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <span className="text-xs text-zinc-400 font-mono">Обработанный файл:</span>
                    <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 truncate max-w-[280px]">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      {cleanPixelResult.file_path}
                    </h3>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Метаданные очищены
                  </span>
                </div>

                {/* Size comparison metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-[11px] text-zinc-400 block mb-1">Исходный размер</span>
                    <span className="text-base font-bold text-zinc-100 font-mono">
                      {(cleanPixelResult.original_size_bytes / 1024).toFixed(1)} КБ
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-[11px] text-zinc-400 block mb-1">Очищенный размер</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {(cleanPixelResult.cleaned_size_bytes / 1024).toFixed(1)} КБ
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-[11px] text-zinc-400 block mb-1">Сэкономлено</span>
                    <span className="text-base font-bold text-primary font-mono">
                      -{(cleanPixelResult.saved_bytes / 1024).toFixed(1)} КБ
                    </span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">
                      (-{cleanPixelResult.saved_percent}%)
                    </span>
                  </div>
                </div>

                {/* Privacy guarantees */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Гарантии приватности и целостности:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>GPS-координаты дома удалены</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Google & Adobe GUID стёрты</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Скрытая EXIF-миниатюра вырезана</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-primary flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span>0% потери качества (Lossless)</span>
                    </div>
                  </div>
                </div>

                {/* Stripped items details */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Удалённые бинарные блоки:
                  </span>
                  <div className="p-3 rounded-xl bg-zinc-900 border border-border space-y-1.5 text-xs font-mono">
                    {cleanPixelResult.stripped_items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border text-center text-zinc-500">
                <ImageIcon className="w-12 h-12 mb-3 opacity-20 text-primary" />
                <p className="text-sm font-medium text-zinc-400">Ожидание фото для очистки</p>
                <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                  Перетащите изображение в область слева или нажмите «Тестовый образец с GPS», чтобы проверить моментальную очистку метаданных.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dossier Modal */}
      <DossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        dossier={buildIncidentDossier(quishingResult, voiceResult, cleanPixelResult)}
      />
    </div>
  );
}
