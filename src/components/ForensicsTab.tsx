import { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  Mic,
  ShieldAlert,
  Zap,
  ArrowRight,
  Activity,
  AlertTriangle,
  FileAudio,
  RefreshCw,
  Sparkles,
  Info,
  Image as ImageIcon,
  UploadCloud,
  FileText as FileTextIcon,
  Network,
  Terminal,
  Crosshair,
  Layers,
  Search,
  Sliders,
} from 'lucide-react';
import {
  analyzeQuishingIPC,
  analyzeVoiceIPC,
  cleanPixelIPC,
  checkDomainDgaIPC,
  checkHttpC2IPC,
  scanNamedPipesIPC,
  checkNamedPipeNameIPC,
  calculateShannonEntropyClient,
  QuishingReport,
  VoiceAnalysisReport,
  CleanPixelReport,
  EntropyAnalysisResult,
  DgaDetectionResult,
  HttpC2AnalysisResult,
  NamedPipeAlert,
} from '../services/tauriBridge';
import { buildIncidentDossier } from '../services/dossierEngine';
import { DossierModal } from './DossierModal';

export function ForensicsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'quishing' | 'voice' | 'cleanpixel' | 'c2hunter'>('quishing');

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

  // --- C2 Hunter State ---
  const [c2SubMode, setC2SubMode] = useState<'entropy' | 'dga' | 'http_c2' | 'named_pipes'>('entropy');
  
  // 1. Shannon Live Entropy
  const [entropyInput, setEntropyInput] = useState('W3NhbXBsZV9wYXlsb2FkX3dpdGhfYmFzZTY0X2hpZ2hfZW50cm9weV9zaGVsbGNvZGVd');
  const [entropyResult, setEntropyResult] = useState<EntropyAnalysisResult | null>(null);

  // 2. DGA Domain
  const [domainInput, setDomainInput] = useState('xkz98qwerty12489asdf.biz');
  const [dgaLoading, setDgaLoading] = useState(false);
  const [dgaResult, setDgaResult] = useState<DgaDetectionResult | null>(null);

  // 3. HTTP C2
  const [httpUrlInput, setHttpUrlInput] = useState('https://c2-beacon.darknet.top/api/v2/gate?token=9f8a2b1c4e7d0f3a8b2c');
  const [httpHeadersInput, setHttpHeadersInput] = useState('Cookie: session=aW5qZWN0X2xvYWRlcl94ODZfc2hlbGwK\nAuthorization: Bearer 8f3c2a1b9e0d4f5a');
  const [httpC2Loading, setHttpC2Loading] = useState(false);
  const [httpC2Result, setHttpC2Result] = useState<HttpC2AnalysisResult | null>(null);

  // 4. Named Pipes
  const [pipeInput, setPipeInput] = useState('\\\\.\\pipe\\msagent_84f9');
  const [pipesLoading, setPipesLoading] = useState(false);
  const [namedPipesList, setNamedPipesList] = useState<NamedPipeAlert[]>([]);
  const [pipeSingleResult, setPipeSingleResult] = useState<NamedPipeAlert | null>(null);

  // Calculate live entropy as user types
  useEffect(() => {
    if (entropyInput) {
      const ent = calculateShannonEntropyClient(entropyInput);
      const maxPossible = entropyInput.length > 1 ? Math.min(8.0, Math.log2(entropyInput.length)) : 0;
      const ratio = maxPossible > 0 ? ent / maxPossible : 0;
      const isSusp = ent >= 4.0;
      setEntropyResult({
        input_length: entropyInput.length,
        entropy: ent,
        max_possible_entropy: Math.round(maxPossible * 1000) / 1000,
        entropy_ratio: Math.round(ratio * 1000) / 1000,
        is_suspicious: isSusp,
        assessment: isSusp
          ? '⚠️ Высокая энтропия: хаотичный псевдослучайный паттерн (C2 Payload / Shellcode / Base64)'
          : 'Нормальная энтропия: естественный текст, стандартный URL или легитимный идентификатор',
      });
    } else {
      setEntropyResult(null);
    }
  }, [entropyInput]);

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

  const handleAnalyzeDGA = async () => {
    if (!domainInput.trim()) return;
    setDgaLoading(true);
    try {
      const res = await checkDomainDgaIPC(domainInput);
      setDgaResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setDgaLoading(false);
    }
  };

  const handleAnalyzeHttpC2 = async () => {
    if (!httpUrlInput.trim()) return;
    setHttpC2Loading(true);
    try {
      const headersMap: Record<string, string> = {};
      httpHeadersInput.split('\n').forEach(line => {
        const idx = line.indexOf(':');
        if (idx > -1) {
          const k = line.substring(0, idx).trim();
          const v = line.substring(idx + 1).trim();
          if (k && v) headersMap[k] = v;
        }
      });
      const res = await checkHttpC2IPC(httpUrlInput, headersMap);
      setHttpC2Result(res);
    } catch (err) {
      console.error(err);
    } finally {
      setHttpC2Loading(false);
    }
  };

  const handleScanNamedPipes = async () => {
    setPipesLoading(true);
    try {
      const res = await scanNamedPipesIPC();
      setNamedPipesList(res);
    } catch (err) {
      console.error(err);
    } finally {
      setPipesLoading(false);
    }
  };

  const handleCheckSinglePipe = async () => {
    if (!pipeInput.trim()) return;
    try {
      const res = await checkNamedPipeNameIPC(pipeInput);
      setPipeSingleResult(res);
    } catch (err) {
      console.error(err);
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
            Цифровая форензика и расследование угроз (v2.3)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            DFIR C2 Hunter (энтропия Шеннона, DGA, Named Pipes), Quishing Guard, детектор дипфейков и CleanPixel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDossierOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            <FileTextIcon className="w-3.5 h-3.5" />
            Сформировать Досье (v2.3)
          </button>

          <div className="flex items-center gap-1 bg-zinc-900 border border-border p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('c2hunter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeSubTab === 'c2hunter'
                  ? 'bg-primary text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              DFIR C2 Hunter
            </button>
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
              CleanPixel
            </button>
          </div>
        </div>
      </div>

      {/* --- 0. DFIR C2 HUNTER & SHANNON ENTROPY TAB --- */}
      {activeSubTab === 'c2hunter' && (
        <div className="space-y-6">
          {/* C2 Sub-Modes Header */}
          <div className="flex items-center justify-between bg-card/60 p-3 rounded-2xl border border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setC2SubMode('entropy')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  c2SubMode === 'entropy'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                1. Энтропия Шеннона H(X)
              </button>
              <button
                onClick={() => setC2SubMode('dga')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  c2SubMode === 'dga'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                2. DGA Domain Hunter
              </button>
              <button
                onClick={() => setC2SubMode('http_c2')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  c2SubMode === 'http_c2'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                3. HTTP C2 Metadata
              </button>
              <button
                onClick={() => setC2SubMode('named_pipes')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  c2SubMode === 'named_pipes'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                4. Named Pipes Anomaly
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-900 border border-border text-zinc-400">
                PT NAD & MITRE ATT&CK Matrix v2.3
              </span>
            </div>
          </div>

          {/* Sub-Mode 1: Shannon Entropy Live Matrix */}
          {c2SubMode === 'entropy' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 space-y-4">
                <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      Интерактивный сканер энтропии Шеннона
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEntropyInput('Hello World, this is normal human readable text!')}
                        className="text-[11px] text-zinc-400 hover:text-cyan-400 transition-colors"
                      >
                        [Обычный текст]
                      </button>
                      <button
                        onClick={() => setEntropyInput('aW5qZWN0X2xvYWRlcl94ODZfc2hlbGxjb2RlXzB4Zjlh')}
                        className="text-[11px] text-zinc-400 hover:text-cyan-400 transition-colors"
                      >
                        [Base64 C2]
                      </button>
                      <button
                        onClick={() => setEntropyInput('4f8a1c9e2b7d0f3a5e8c1b4d7f0e3a6c')}
                        className="text-[11px] text-zinc-400 hover:text-cyan-400 transition-colors"
                      >
                        [Hex Random]
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-zinc-300 font-medium">
                      Входная строка / Пейлоад / Токен / URI / Шелл-код:
                    </label>
                    <textarea
                      rows={4}
                      value={entropyInput}
                      onChange={(e) => setEntropyInput(e.target.value)}
                      placeholder="Вставьте любую строку или токен для мгновенного измерения энтропии..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-border text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-400 transition-colors font-mono"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Формула энтропии Шеннона:</span>
                    </div>
                    <p className="font-mono text-cyan-300/90 pl-5">
                      H(X) = - Σ (P(x_i) * log2(P(x_i)))
                    </p>
                    <p className="text-[11px] text-zinc-500 pl-5">
                      Измеряет непредсказуемость байт. Человеческий язык: ~2.0–3.2 бит/символ. Base64 / AES / Shellcode: ~4.5–6.0+ бит/символ.
                    </p>
                  </div>
                </div>
              </div>

              {/* Entropy Results Column */}
              <div className="lg:col-span-6 space-y-4">
                {entropyResult ? (
                  <div className="p-5 rounded-2xl bg-card border border-border space-y-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Метрики хаотичности (H-Score)
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                          entropyResult.is_suspicious
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {entropyResult.is_suspicious ? 'SUSPICIOUS ENTROPY' : 'BENIGN / NORMAL'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-zinc-900 border border-border">
                        <span className="text-xs text-zinc-400 block mb-1">Энтропия H(X)</span>
                        <div className="text-3xl font-black font-mono text-cyan-400">
                          {entropyResult.entropy.toFixed(3)}
                          <span className="text-xs text-zinc-500 font-normal ml-1">бит/симв</span>
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">
                          Порог подозрения: ≥ 4.00
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-zinc-900 border border-border">
                        <span className="text-xs text-zinc-400 block mb-1">Коэффициент рандомизации</span>
                        <div className="text-3xl font-black font-mono text-zinc-200">
                          {(entropyResult.entropy_ratio * 100).toFixed(1)}%
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">
                          Длина: {entropyResult.input_length} байт
                        </span>
                      </div>
                    </div>

                    {/* Gauge Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Шкала энтропии:</span>
                        <span className="font-mono text-cyan-300">{entropyResult.entropy.toFixed(2)} / 8.00 бит</span>
                      </div>
                      <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            entropyResult.entropy >= 5.0
                              ? 'bg-gradient-to-r from-amber-500 to-red-500'
                              : entropyResult.entropy >= 4.0
                              ? 'bg-gradient-to-r from-cyan-500 to-amber-500'
                              : 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                          }`}
                          style={{ width: `${Math.min(100, (entropyResult.entropy / 8.0) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono px-1">
                        <span>0.0 (Повторы)</span>
                        <span>3.2 (Текст)</span>
                        <span>4.0 (DGA/URI)</span>
                        <span>6.0+ (Шифр/Пейлоад)</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-border space-y-1 text-xs">
                      <span className="font-bold text-zinc-300">Криминалистическое заключение:</span>
                      <p className="text-zinc-400 leading-relaxed">{entropyResult.assessment}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[260px] flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border text-center text-zinc-500">
                    <Sliders className="w-10 h-10 mb-2 opacity-20 text-cyan-400" />
                    <p className="text-sm font-medium text-zinc-400">Введите данные для расчета энтропии</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-Mode 2: DGA Domain Hunter */}
          {c2SubMode === 'dga' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Crosshair className="w-4 h-4 text-indigo-400" />
                      Анализ DGA Алгоритмов
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setDomainInput('google.com')}
                        className="text-[11px] text-zinc-400 hover:text-indigo-400"
                      >
                        [google.com]
                      </button>
                      <button
                        onClick={() => setDomainInput('xkz98qwerty12489asdf.biz')}
                        className="text-[11px] text-zinc-400 hover:text-indigo-400"
                      >
                        [DGA Botnet]
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-zinc-300 font-medium">Целевой домен (FQDN или SLD):</label>
                    <input
                      type="text"
                      value={domainInput}
                      onChange={(e) => setDomainInput(e.target.value)}
                      placeholder="e.g. 7f8a9e1c2b3d4f5.top"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-border text-sm text-zinc-100 font-mono focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <button
                    onClick={handleAnalyzeDGA}
                    disabled={dgaLoading || !domainInput.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    {dgaLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Crosshair className="w-4 h-4" />
                        Сканировать на DGA Признаки
                      </>
                    )}
                  </button>

                  <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-xs text-indigo-300 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" />
                      MITRE ATT&CK T1568.002
                    </span>
                    <p className="text-[11px] text-zinc-400">
                      Вредоносное ПО использует алгоритмы псевдослучайной генерации имен (DGA) для обхода блокировок C2 серверов.
                    </p>
                  </div>
                </div>
              </div>

              {/* DGA Results Column */}
              <div className="lg:col-span-7 space-y-4">
                {dgaResult ? (
                  <div className="p-5 rounded-2xl bg-card border border-border space-y-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                          Результат классификации домена
                        </span>
                        <span className="text-sm font-mono text-zinc-200">{dgaResult.domain}</span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                          dgaResult.is_dga_suspected
                            ? 'bg-red-500/15 text-red-400 border-red-500/40'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {dgaResult.is_dga_suspected ? '⚠️ DGA SUSPECTED' : '✅ LEGITIMATE DOMAIN'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                        <span className="text-[11px] text-zinc-400 block mb-1">SLD Энтропия</span>
                        <span className="text-2xl font-black font-mono text-indigo-400">
                          {dgaResult.entropy.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                        <span className="text-[11px] text-zinc-400 block mb-1">Уверенность детекта</span>
                        <span className="text-2xl font-black font-mono text-zinc-200">
                          {dgaResult.confidence_percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                        <span className="text-[11px] text-zinc-400 block mb-1">SLD Имя</span>
                        <span className="text-sm font-mono text-zinc-300 truncate block">
                          {dgaResult.sld}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Факторы подозрительности:
                      </span>
                      <div className="p-3 rounded-xl bg-zinc-900 border border-border space-y-1.5 text-xs font-mono">
                        {dgaResult.reasons.map((r, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-zinc-300">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                dgaResult.is_dga_suspected ? 'bg-red-400' : 'bg-emerald-400'
                              }`}
                            />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                      <span className="font-mono text-indigo-300">{dgaResult.mitre_technique}</span>
                      <span className="text-[11px] text-zinc-500">DFIR Standard</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[260px] flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border text-center text-zinc-500">
                    <Crosshair className="w-10 h-10 mb-2 opacity-20 text-indigo-400" />
                    <p className="text-sm font-medium text-zinc-400">Нажмите «Сканировать на DGA Признаки»</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-Mode 3: HTTP C2 Metadata Inspector */}
          {c2SubMode === 'http_c2' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Network className="w-4 h-4 text-amber-400" />
                      Инспектор HTTP C2 Маяков
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-zinc-300 font-medium">HTTP URL / Маршрут C2:</label>
                    <input
                      type="text"
                      value={httpUrlInput}
                      onChange={(e) => setHttpUrlInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-zinc-300 font-medium">HTTP Headers (Cookie, Auth, Custom):</label>
                    <textarea
                      rows={3}
                      value={httpHeadersInput}
                      onChange={(e) => setHttpHeadersInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-border text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    onClick={handleAnalyzeHttpC2}
                    disabled={httpC2Loading || !httpUrlInput.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    {httpC2Loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Network className="w-4 h-4" />
                        Анализировать HTTP C2 Трафик
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* HTTP C2 Results Column */}
              <div className="lg:col-span-7 space-y-4">
                {httpC2Result ? (
                  <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                          Вердикт C2 Сетевого Маяка
                        </span>
                        <span className="text-xs font-mono text-zinc-300 truncate max-w-sm block">
                          {httpC2Result.url}
                        </span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                          httpC2Result.is_c2_suspected
                            ? 'bg-red-500/15 text-red-400 border-red-500/40'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {httpC2Result.is_c2_suspected ? '⚠️ C2 BEACON SUSPECTED' : '✅ BENIGN TRAFFIC'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                        <span className="text-[11px] text-zinc-400 block mb-1">Энтропия URI</span>
                        <span className="text-2xl font-black font-mono text-amber-400">
                          {httpC2Result.url_entropy.toFixed(2)}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                        <span className="text-[11px] text-zinc-400 block mb-1">Подозрительных заголовков</span>
                        <span className="text-2xl font-black font-mono text-zinc-200">
                          {httpC2Result.headers_entropy.filter(([, , s]) => s).length}
                        </span>
                      </div>
                    </div>

                    {httpC2Result.headers_entropy.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Энтропия заголовков:
                        </span>
                        <div className="p-3 rounded-xl bg-zinc-900 border border-border space-y-2 text-xs font-mono">
                          {httpC2Result.headers_entropy.map(([k, ent, isSusp], idx) => (
                            <div key={idx} className="flex items-center justify-between text-zinc-300">
                              <span className="text-zinc-400">{k}:</span>
                              <div className="flex items-center gap-2">
                                <span className={isSusp ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                                  {ent.toFixed(2)} бит
                                </span>
                                {isSusp && (
                                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px]">
                                    HIGH ENTROPY
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                      <span className="font-mono text-amber-300">{httpC2Result.mitre_technique}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[260px] flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border text-center text-zinc-500">
                    <Network className="w-10 h-10 mb-2 opacity-20 text-amber-400" />
                    <p className="text-sm font-medium text-zinc-400">Нажмите «Анализировать HTTP C2 Трафик»</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-Mode 4: Named Pipes Anomaly Scanner */}
          {c2SubMode === 'named_pipes' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-red-400" />
                        Аудит Windows Именованных Каналов
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-zinc-300 font-medium">Проверить конкретный Named Pipe:</label>
                      <input
                        type="text"
                        value={pipeInput}
                        onChange={(e) => setPipeInput(e.target.value)}
                        placeholder="\\.\pipe\msagent_84f9"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-border text-sm text-zinc-100 font-mono focus:outline-none focus:border-red-400"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCheckSinglePipe}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Search className="w-3.5 h-3.5" />
                        Проверить имя
                      </button>
                      <button
                        onClick={handleScanNamedPipes}
                        disabled={pipesLoading}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
                      >
                        {pipesLoading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Terminal className="w-3.5 h-3.5" />
                            Сканировать систему
                          </>
                        )}
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[11px] text-zinc-500 block mb-2 font-medium">Быстрые пресеты для теста:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            setPipeInput('\\\\.\\pipe\\msagent_4f8a');
                            handleCheckSinglePipe();
                          }}
                          className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] font-mono hover:bg-red-500/20 transition-colors"
                        >
                          Cobalt Strike (msagent)
                        </button>
                        <button
                          onClick={() => {
                            setPipeInput('\\\\.\\pipe\\sliver_session_9b');
                            handleCheckSinglePipe();
                          }}
                          className="px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] font-mono hover:bg-red-500/20 transition-colors"
                        >
                          Sliver C2
                        </button>
                        <button
                          onClick={() => {
                            setPipeInput('\\\\.\\pipe\\spoolss');
                            handleCheckSinglePipe();
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono hover:bg-emerald-500/20 transition-colors"
                        >
                          Windows Print (spoolss)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pipe Single Inspection Result */}
                <div className="lg:col-span-7 space-y-4">
                  {pipeSingleResult ? (
                    <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          Анализ именованного канала
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                            pipeSingleResult.severity === 'critical'
                              ? 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse'
                              : pipeSingleResult.severity === 'high'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                          }`}
                        >
                          {pipeSingleResult.severity.toUpperCase()}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-900 border border-border font-mono text-sm text-zinc-200">
                        {pipeSingleResult.pipe_name}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-zinc-900 border border-border">
                          <span className="text-[11px] text-zinc-400 block mb-1">Статус сигнатуры</span>
                          <span className="text-sm font-bold text-zinc-200">
                            {pipeSingleResult.is_known_c2
                              ? '🚨 ХАКЕРСКИЙ C2 ФРЕЙМВОРК'
                              : pipeSingleResult.is_whitelisted
                              ? '✅ СИСТЕМНЫЙ БЕЛЫЙ СПИСОК'
                              : '⚠️ НЕИЗВЕСТНЫЙ КАНАЛ'}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-900 border border-border">
                          <span className="text-[11px] text-zinc-400 block mb-1">Энтропия имени</span>
                          <span className="text-sm font-bold font-mono text-cyan-400">
                            {pipeSingleResult.entropy.toFixed(2)} бит
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-900 border border-border text-xs text-zinc-300 leading-relaxed">
                        {pipeSingleResult.description}
                      </div>

                      <div className="text-[11px] font-mono text-zinc-500">
                        MITRE Technique: {pipeSingleResult.mitre_technique}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border text-center text-zinc-500">
                      <Terminal className="w-10 h-10 mb-2 opacity-20 text-red-400" />
                      <p className="text-sm font-medium text-zinc-400">Проверьте имя канала или запустите аудит всей системы</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Named Pipes Scanned List Table */}
              {namedPipesList.length > 0 && (
                <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-red-400" />
                      Обнаруженные системные каналы ({namedPipesList.length})
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-border text-zinc-400">
                          <th className="pb-2">Named Pipe</th>
                          <th className="pb-2">Энтропия</th>
                          <th className="pb-2">Уровень риска</th>
                          <th className="pb-2">Классификация</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {namedPipesList.map((pipe, idx) => (
                          <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                            <td className="py-2.5 text-zinc-200 font-bold">{pipe.pipe_name}</td>
                            <td className="py-2.5 text-cyan-400">{pipe.entropy.toFixed(2)}</td>
                            <td className="py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  pipe.severity === 'critical'
                                    ? 'bg-red-500/20 text-red-400'
                                    : pipe.severity === 'high'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {pipe.severity}
                              </span>
                            </td>
                            <td className="py-2.5 text-zinc-400 text-[11px] font-sans">
                              {pipe.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
                    Декодирование и проверка редиректов...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Запустить Quishing Guard
                  </>
                )}
              </button>
            </div>

            {/* Quick Tips */}
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-border space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                <Info className="w-4 h-4 text-primary" />
                <span>Как работает Quishing Guard:</span>
              </div>
              <p>
                Модуль нативно сканирует битовую матрицу QR-кода, извлекает целевой URL, без перехода в браузере раскручивает цепочку HTTP 301/302 редиректов и проверяет конечный TLD/домен на фишинг.
              </p>
            </div>
          </div>

          {/* Results column */}
          <div className="lg:col-span-7 space-y-4">
            {quishingResult ? (
              <div className="p-5 rounded-2xl bg-card border border-border space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Результат аудита QR-кода
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                      quishingResult.risk_score >= 50
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {quishingResult.risk_score >= 50 ? 'HIGH RISK' : 'SAFE / LOW RISK'}
                  </span>
                </div>

                {/* Metric score */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-xs text-zinc-400 block mb-1">Оценка угрозы</span>
                    <div className="text-3xl font-black font-mono text-zinc-100">
                      {quishingResult.risk_score}
                      <span className="text-xs text-zinc-500 font-normal"> / 100</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-xs text-zinc-400 block mb-1">Конечный домен</span>
                    <div className="text-sm font-bold font-mono text-zinc-100 truncate">
                      {quishingResult.domain || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Redirects trace */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Цепочка перенаправлений (Redirect Chain):
                  </span>
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border space-y-2 text-xs font-mono">
                    <div className="text-zinc-400 truncate">
                      <span className="text-zinc-500">QR Raw: </span>
                      {quishingResult.initial_url}
                    </div>
                    {quishingResult.redirect_chain.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-primary">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{url}</span>
                      </div>
                    ))}
                    <div className="pt-1 text-zinc-200 font-bold truncate">
                      <span className="text-zinc-500 font-normal">Финал: </span>
                      {quishingResult.final_url}
                    </div>
                  </div>
                </div>

                {/* Flags */}
                {quishingResult.flags.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Обнаруженные маркеры риска:
                    </span>
                    <div className="space-y-1.5">
                      {quishingResult.flags.map((flag, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 shrink-0" />
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
                <p className="text-sm font-medium text-zinc-400">Ожидание сканирования QR-кода</p>
                <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                  Укажите путь к изображению с подозрительным QR-кодом слева или нажмите «Тестовый сэмпл» для симуляции проверки.
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
                  Анализ голосового аудио
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
                  placeholder="D:\\Downloads\\suspicious_voice_msg.wav"
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
                    БПФ-спектральный анализ и MFCC...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    Анализировать спектрограмму
                  </>
                )}
              </button>
            </div>

            {/* Voice explanation */}
            <div className="p-4 rounded-2xl bg-zinc-900/50 border border-border space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5 font-medium text-zinc-300">
                <Info className="w-4 h-4 text-primary" />
                <span>Признаки синтезированного голоса:</span>
              </div>
              <p>
                Нейросетевые генераторы речи (ElevenLabs, Bark, HiFi-GAN) оставляют артефакты: резкий спад частот (Rolloff) выше 7–8 кГц, неестественно монотонную дисперсию формант и ровную плотность спектра.
              </p>
            </div>
          </div>

          {/* Results column */}
          <div className="lg:col-span-7 space-y-4">
            {voiceResult ? (
              <div className="p-5 rounded-2xl bg-card border border-border space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Результаты акустической форензики
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                      voiceResult.synthetic_threat_score >= 50
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {voiceResult.synthetic_threat_score >= 50 ? 'SYNTHETIC / DEEPFAKE' : 'NATURAL HUMAN'}
                  </span>
                </div>

                {/* Score and metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-xs text-zinc-400 block mb-1">Синтез-индекс</span>
                    <div className="text-2xl font-black font-mono text-zinc-100">
                      {voiceResult.synthetic_threat_score}%
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-xs text-zinc-400 block mb-1">Частотный срез</span>
                    <div className="text-lg font-bold font-mono text-zinc-100">
                      {voiceResult.avg_rolloff_hz.toFixed(0)} Гц
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-xs text-zinc-400 block mb-1">Длительность</span>
                    <div className="text-lg font-bold font-mono text-zinc-100">
                      {voiceResult.duration_sec.toFixed(1)} с
                    </div>
                  </div>
                </div>

                {/* Anomalies list */}
                {voiceResult.anomalies.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Акустические аномалии:
                    </span>
                    <div className="space-y-1.5">
                      {voiceResult.anomalies.map((anom, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{anom}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl bg-card border border-border text-center text-zinc-500">
                <FileAudio className="w-12 h-12 mb-3 opacity-20 text-primary" />
                <p className="text-sm font-medium text-zinc-400">Ожидание аудиозаписи</p>
                <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                  Укажите путь к аудиофайлу слева или нажмите «Тестовый сэмпл» для демонстрации спектрального детектора дипфейков.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 3. CLEANPIXEL TAB --- */}
      {activeSubTab === 'cleanpixel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dropzone column */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Моментальная очистка метаданных
                </span>
                <button
                  onClick={loadDemoCleanPixel}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  Тестовый образец с GPS
                </button>
              </div>

              {/* Drag and drop area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-zinc-500 bg-zinc-900/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                  {cleanPixelLoading ? (
                    <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">
                    {cleanPixelLoading ? 'Очистка метаданных...' : 'Перетащите изображение сюда или кликните'}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Поддерживаются JPEG, PNG, WebP (Lossless очистка без пересжатия)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CleanPixel Result column */}
          <div className="lg:col-span-7 space-y-4">
            {cleanPixelResult ? (
              <div className="p-5 rounded-2xl bg-card border border-border space-y-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                      Отчет байтовой очистки (CleanPixel Core)
                    </span>
                    <span className="text-xs font-mono text-zinc-400">{cleanPixelResult.file_path}</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    100% CLEANED
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-xs text-zinc-400 block mb-1">Сэкономлено</span>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {(cleanPixelResult.saved_bytes / 1024).toFixed(1)} КБ
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-xs text-zinc-400 block mb-1">Сжатие метаданных</span>
                    <div className="text-xl font-bold font-mono text-zinc-100">
                      -{cleanPixelResult.saved_percent.toFixed(1)}%
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-border">
                    <span className="text-xs text-zinc-400 block mb-1">Формат файла</span>
                    <div className="text-xl font-bold font-mono text-zinc-100">
                      {cleanPixelResult.format}
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
        dossier={buildIncidentDossier(
          quishingResult,
          voiceResult,
          cleanPixelResult,
          {
            dga: dgaResult,
            httpC2: httpC2Result,
            namedPipe: pipeSingleResult,
          }
        )}
      />
    </div>
  );
}
