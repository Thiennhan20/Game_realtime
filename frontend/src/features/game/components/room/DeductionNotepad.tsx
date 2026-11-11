'use client';

import React from 'react';
import { Check, ChevronUp, RotateCcw, Sparkles, X } from 'lucide-react';

import { sound, triggerHaptic } from '../../sound';
import type { Translator } from '../../i18n';
import type { DeductionMap, DigitDeductionState, Locale } from '../../types';

interface DeductionNotepadProps {
  deductionMap: DeductionMap;
  onToggleDigit: (digit: number) => void;
  onReset: () => void;
  isAutoEliminate: boolean;
  onToggleAutoEliminate: () => void;
  onClose?: () => void;
  locale: Locale;
  t: Translator;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function DeductionNotepad({
  deductionMap,
  onToggleDigit,
  onReset,
  isAutoEliminate,
  onToggleAutoEliminate,
  onClose,
  locale,
  t,
}: DeductionNotepadProps) {
  const handleDigitClick = (digit: number) => {
    sound.playClick();
    triggerHaptic(20);
    onToggleDigit(digit);
  };

  const handleResetClick = () => {
    sound.playDigitClear();
    triggerHaptic([30, 20]);
    onReset();
  };

  const hasAnyMarked = Object.values(deductionMap).some((state) => state !== 'neutral');

  return (
    <div className="bg-[#0d1017]/95 border border-white/[0.08] p-2.5 sm:p-3 rounded-xl shadow-lg shrink-0 backdrop-blur-sm select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm">📝</span>
          <span className="text-xs sm:text-sm font-mono font-bold tracking-wide uppercase text-white truncate">
            {t('deductionNotepad')}
          </span>

          {/* Quick guide pills */}
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300 font-mono">
              {t('deductionEliminate')}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono">
              {t('deductionConfirmed')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Auto-eliminate toggle */}
          <button
            type="button"
            onClick={onToggleAutoEliminate}
            title={t('autoEliminateZero')}
            className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold transition flex items-center gap-1 cursor-pointer ${
              isAutoEliminate
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                : 'bg-white/[0.03] text-slate-500 border border-white/[0.06] hover:text-slate-400'
            }`}
          >
            <Sparkles size={11} className={isAutoEliminate ? 'text-amber-300' : 'text-slate-600'} />
            <span>{locale === 'vi' ? 'Tự gạch 0 trúng' : 'Auto 0 hit'}</span>
          </button>

          {/* Reset button */}
          {hasAnyMarked && (
            <button
              type="button"
              onClick={handleResetClick}
              title={t('clearNotepad')}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          )}

          {/* Collapse/Close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title={t('collapseNotes')}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/[0.08] transition cursor-pointer ml-0.5"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Guide subtitle on mobile / small screens */}
      <div className="flex sm:hidden items-center justify-between gap-1 text-[10px] font-mono text-slate-400 pb-1.5 mb-1.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <span className="text-rose-400 font-bold">{t('deductionEliminate')}</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-bold">{t('deductionConfirmed')}</span>
        </div>
        <span className="text-[9px] text-slate-500">
          {locale === 'vi' ? 'Chạm 3 lần: Đặt lại' : 'Tap 3: Reset'}
        </span>
      </div>

      {/* Digits 0-9 bar */}
      <div className="grid grid-cols-10 gap-0.5 sm:gap-1.5">
        {DIGITS.map((digit) => {
          const state: DigitDeductionState = deductionMap[digit] || 'neutral';

          let stateStyles = 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border-white/[0.08]';
          if (state === 'eliminated') {
            stateStyles =
              'bg-rose-950/40 hover:bg-rose-900/50 border-rose-500/40 text-rose-300/80 shadow-inner shadow-rose-950/40';
          } else if (state === 'confirmed') {
            stateStyles =
              'bg-emerald-950/50 hover:bg-emerald-900/60 border-emerald-400/60 text-emerald-300 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-400/40';
          }

          return (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              className={`relative h-9 sm:h-10 flex flex-col items-center justify-center rounded-lg border font-mono font-bold transition-all active:scale-95 cursor-pointer ${stateStyles}`}
            >
              {/* Digit text */}
              <span
                className={`text-sm sm:text-base transition-all ${
                  state === 'eliminated'
                    ? 'line-through decoration-rose-500 decoration-2'
                    : state === 'confirmed'
                      ? 'font-black scale-105'
                      : ''
                }`}
              >
                {digit}
              </span>

              {/* Status corner badge */}
              {state === 'eliminated' && (
                <span className="absolute top-0.5 right-0.5 text-[8px] text-rose-400 leading-none">
                  <X size={8} strokeWidth={3} />
                </span>
              )}
              {state === 'confirmed' && (
                <span className="absolute top-0.5 right-0.5 text-[8px] text-emerald-400 leading-none">
                  <Check size={8} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
