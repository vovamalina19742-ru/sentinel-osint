import React from 'react';
import { InvestigationStep } from '../types/dossier';
import { CheckCircle2, XCircle, Loader2, Globe, ShieldAlert, Radio } from 'lucide-react';

interface Props {
  steps: InvestigationStep[];
  progressPercent: number;
  currentMessage: string;
  currentService?: string;
}

export const InvestigationProgress: React.FC<Props> = ({
  steps,
  progressPercent,
  currentMessage,
  currentService,
}) => {
  const foundCount = steps.filter((s) => s.status === 'found').length;
  const activeService = currentService || steps[steps.length - 1]?.platform || 'Оркестратор';

  return (
    <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-xl animate-in fade-in duration-200">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
          <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
            Опрос сервиса:
            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-mono">
              {activeService}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-zinc-400">
            Обнаружено совпадений:{' '}
            <strong className="text-emerald-400 font-mono text-xs">{foundCount}</strong>
          </span>
          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Glowing Animated Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2.5 rounded-full bg-zinc-800/80 overflow-hidden p-0.5 border border-zinc-700/50">
          <div
            className="h-full bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(59,130,246,0.5)]"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-[11px] text-zinc-400 font-mono truncate flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
          {currentMessage || 'Сканирование внешних источников...'}
        </p>
      </div>

      {/* Live Feed of Services */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-border/70 text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5 truncate">
              {step.status === 'found' ? (
                <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              ) : step.status === 'not_found' ? (
                <div className="w-5 h-5 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                  <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                </div>
              ) : step.status === 'error' ? (
                <div className="w-5 h-5 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                </div>
              )}

              <span className="font-medium text-zinc-200">{step.platform}</span>
              <span className="text-zinc-500 text-[11px] truncate">{step.message}</span>
            </div>

            {step.url && (
              <a
                href={step.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline text-[11px] flex items-center gap-1 shrink-0 ml-2 bg-primary/10 px-2 py-0.5 rounded border border-primary/20"
              >
                <Globe className="w-3 h-3" />
                Профиль
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
