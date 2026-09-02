import { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  Layers,
  Database,
  FileText,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { IncidentDossier } from '../services/dossierEngine';
import {
  generateHtmlReport,
  generateStixBundle,
  generateMarkdownReport,
} from '../services/dossierExporter';

interface DossierModalProps {
  dossier: IncidentDossier;
  isOpen: boolean;
  onClose: () => void;
}

export function DossierModal({ dossier, isOpen, onClose }: DossierModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'mitre' | 'timeline' | 'iocs' | 'stix'>('overview');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const stixBundle = generateStixBundle(dossier);
  const markdownText = generateMarkdownReport(dossier);

  const handlePrintHtml = () => {
    const html = generateHtmlReport(dossier);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleDownloadStix = () => {
    const blob = new Blob([JSON.stringify(stixBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dossier.case_number}_stix2.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[88vh] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-primary font-bold">
                  {dossier.case_number} • {dossier.status}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    dossier.overall_threat_level === 'Critical'
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : dossier.overall_threat_level === 'High'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  Угроза: {dossier.overall_threat_level} ({dossier.threat_score}%)
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-100 line-clamp-1">{dossier.case_title}</h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintHtml}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-border flex items-center gap-1.5 transition-all shadow-sm"
              title="Печать или экспорт в PDF"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">HTML / PDF</span>
            </button>

            <button
              onClick={handleDownloadStix}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-border flex items-center gap-1.5 transition-all shadow-sm"
              title="Скачать в формате OASIS STIX 2.1"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">STIX 2.1</span>
            </button>

            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-border flex items-center gap-1.5 transition-all shadow-sm"
              title="Скопировать Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span className="hidden sm:inline">{copied ? 'Скопировано' : 'Markdown'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-tabs bar */}
        <div className="px-6 border-b border-border bg-zinc-950/40 flex items-center gap-2 overflow-x-auto text-xs font-medium py-2.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-primary text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Обзор (Executive)
          </button>
          <button
            onClick={() => setActiveTab('mitre')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'mitre' ? 'bg-primary text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Матрица MITRE ATT&CK ({dossier.mitre_techniques.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'timeline' ? 'bg-primary text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Таймлайн событий ({dossier.timeline.length})
          </button>
          <button
            onClick={() => setActiveTab('iocs')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'iocs' ? 'bg-primary text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Индикаторы IoC ({dossier.iocs.length})
          </button>
          <button
            onClick={() => setActiveTab('stix')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'stix' ? 'bg-primary text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            STIX 2.1 JSON
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-zinc-900 border border-border space-y-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Краткое заключение (Executive Summary)
                </span>
                <p className="text-sm text-zinc-200 leading-relaxed">{dossier.summary}</p>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-zinc-400 font-mono">
                  <span>Аналитик: {dossier.investigator}</span>
                  <span>Время фиксации: {new Date(dossier.created_at).toLocaleString('ru-RU')}</span>
                </div>
              </div>

              {/* Modules summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                    <span>Quishing Guard</span>
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <div className="text-base font-bold text-zinc-100">
                    {dossier.evidence.quishing ? `Риск: ${dossier.evidence.quishing.risk_score}%` : 'Нет данных'}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    {dossier.evidence.quishing?.domain || 'Модуль не вызывался'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                    <span>Voice Spectrogram</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </div>
                  <div className="text-base font-bold text-zinc-100">
                    {dossier.evidence.voice ? `Синтез: ${dossier.evidence.voice.synthetic_threat_score}%` : 'Нет данных'}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    {dossier.evidence.voice ? `Срез ${dossier.evidence.voice.avg_rolloff_hz} Гц` : 'Модуль не вызывался'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                    <span>CleanPixel</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-base font-bold text-zinc-100">
                    {dossier.evidence.cleanpixel ? `Очищено -${(dossier.evidence.cleanpixel.saved_bytes / 1024).toFixed(1)} КБ` : 'Нет данных'}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">
                    {dossier.evidence.cleanpixel ? '0% потери качества' : 'Модуль не вызывался'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MITRE ATT&CK */}
          {activeTab === 'mitre' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Сопоставленные техники матрицы MITRE ATT&CK:
              </span>
              <div className="grid grid-cols-1 gap-3">
                {dossier.mitre_techniques.map((tech, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-zinc-900 border border-border flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-xs border border-primary/20">
                          {tech.technique_id}
                        </span>
                        <h4 className="text-sm font-bold text-zinc-100">{tech.name}</h4>
                        <span className="text-xs text-zinc-500 font-mono">• Тактика: {tech.tactic}</span>
                      </div>
                      <p className="text-xs text-zinc-300">{tech.evidence_description}</p>
                    </div>

                    <a
                      href={`https://attack.mitre.org/techniques/${tech.technique_id.replace('.', '/')}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                      title="Открыть описание на attack.mitre.org"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Хронология событий расследования:
              </span>
              <div className="space-y-3 pl-2 border-l-2 border-primary/40">
                {dossier.timeline.map((event, idx) => (
                  <div key={idx} className="relative pl-6">
                    <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
                    <div className="p-3.5 rounded-2xl bg-zinc-900 border border-border text-xs space-y-1">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="font-bold text-primary">{event.phase}</span>
                        <span className="font-mono">{new Date(event.timestamp).toLocaleTimeString('ru-RU')}</span>
                      </div>
                      <p className="text-zinc-200 font-medium">{event.summary}</p>
                      <div className="text-[10px] text-zinc-500 font-mono">Источник: {event.source_module}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: IOCS */}
          {activeTab === 'iocs' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Индикаторы компрометации (IoC):
              </span>
              <div className="rounded-2xl border border-border overflow-hidden bg-zinc-900">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/60 border-b border-border text-zinc-400">
                    <tr>
                      <th className="p-3 font-semibold">Тип</th>
                      <th className="p-3 font-semibold">Значение</th>
                      <th className="p-3 font-semibold">Описание</th>
                      <th className="p-3 font-semibold">Угроза</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {dossier.iocs.map((ioc, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40">
                        <td className="p-3 font-mono font-bold text-primary uppercase">{ioc.type}</td>
                        <td className="p-3 font-mono text-zinc-200 select-all">{ioc.value}</td>
                        <td className="p-3 text-zinc-400">{ioc.description}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ioc.threat_level === 'Malicious'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {ioc.threat_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: STIX 2.1 */}
          {activeTab === 'stix' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-bold uppercase tracking-wider">Валидный OASIS STIX 2.1 Bundle</span>
                <span className="font-mono">JSON • spec_version: 2.1</span>
              </div>
              <pre className="p-4 rounded-2xl bg-zinc-950 border border-border text-xs font-mono text-emerald-400 overflow-x-auto max-h-[480px]">
                {JSON.stringify(stixBundle, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
