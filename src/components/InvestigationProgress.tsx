import React from 'react';
import { InvestigationStep } from '../types/dossier';
import { CheckCircle2, XCircle, Loader2, Globe, ShieldAlert } from 'lucide-react';

interface Props {
  steps: InvestigationStep[];
  progressPercent: number;
  currentMessage: string;
}

export const InvestigationProgress: React.FC<Props> = ({ steps, progressPercent, currentMessage }) => {
  return (
    <div className="p-5 rounded-2xl bg-card border border-border space-y-4 shadow-lg animate-in fade-in duration-200">
      {/* Top Header & Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            Агентная разведка в реальном времени...
          </span>
          <span className="font-mono font-bold text-primary">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-emerald-500 to-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-[11px] text-zinc-400 font-mono truncate">{currentMessage}</p>
      </div>

      {/* Live Steps Stream */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/70 border border-border/80 text-xs"
          >
            <div className="flex items-center gap-2.5 truncate">
              {step.status === 'found' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : step.status === 'not_found' ? (
                <XCircle className="w-4 h-4 text-zinc-500 shrink-0" />
              ) : step.status === 'error' ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
              )}
              <span className="font-medium text-zinc-200">{step.platform}</span>
              <span className="text-zinc-500 text-[11px] truncate">{step.message}</span>
            </div>

            {step.url && (
              <a
                href={step.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline text-[11px] flex items-center gap-1 shrink-0 ml-2"
              >
                <Globe className="w-3 h-3" />
                Ссылка
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
