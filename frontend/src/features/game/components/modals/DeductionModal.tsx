'use client';

import React, { useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, HelpCircle, Keyboard, RotateCcw, Sparkles, X } from 'lucide-react';

import type { Translator } from '../../i18n';
import { sound, triggerHaptic } from '../../sound';
import type { DeductionMap, DigitDeductionState, Locale } from '../../types';

interface DeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  deductionMap: DeductionMap;
  onToggleDigit: (digit: number) => void;
  onReset: () => void;
  isAutoEliminate: boolean;
  onToggleAutoEliminate: () => void;
  locale: Locale;
  t: Translator;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function DeductionModal({
  isOpen,
  onClose,
  deductionMap,
  onToggleDigit,
  onReset,
  isAutoEliminate,
  onToggleAutoEliminate,
  locale,
  t,
}: DeductionModalProps) {
  const handleDigitClick = useCallback(
    (digit: number) => {
      sound.playClick();
      triggerHaptic(20);
      onToggleDigit(digit);
    },
    [onToggleDigit],
  );

  const handleResetClick = useCallback(() => {
    sound.playDigitClear();
    triggerHaptic([30, 20]);
    onReset();
  }, [onReset]);

  // Support ESC and 0-9 keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        handleDigitClick(Number.parseInt(event.key, 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleDigitClick]);

  const hasAnyMarked = Object.values(deductionMap).some((state) => state !== 'neutral');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-[#090a0f]/85 backdrop-blur-sm" />

          {/* Modal Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deduction-title"
            aria-describedby="deduction-desc"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 18 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative w-full max-w-md bg-[#0d1017] border border-white/[0.1] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] p-4 sm:p-6 flex flex-col space-y-4 overflow-hidden z-10 select-none max-h-[92dvh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-sm">
                  <span className="text-sm">📝</span>
                </div>
                <div className="min-w-0">
                  <h3
                    id="deduction-title"
                    className="text-xs sm:text-sm font-mono font-bold uppercase text-white tracking-wider truncate"
                  >
                    {t('deductionNotepad')}
                  </h3>
                  <p id="deduction-desc" className="text-[10px] sm:text-[11px] text-slate-400 font-sans truncate">
                    {t('deductionSubtitle')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="w-8 h-8 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-white/[0.15] text-slate-400 hover:text-white rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            {/* Visual Instructions Box */}
            <div className="bg-[#121624] border border-white/[0.06] rounded-xl p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-1 text-[11px] font-mono font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <HelpCircle size={13} />
                  <span>{locale === 'vi' ? 'HƯỚNG DẪN GẠCH SỐ' : 'HOW TO USE'}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {locale === 'vi' ? 'Chạm số để đổi trạng thái' : 'Tap digit to cycle'}
                </span>
              </div>

              {/* 3 Step Visual Badges */}
              <div className="space-y-1.5 pt-0.5 text-[11px] font-sans">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold shrink-0">
                    ✕ {locale === 'vi' ? 'Loại trừ' : 'Out'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {t('deductionStep1')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-bold shrink-0">
                    ✓ {locale === 'vi' ? 'Có trong mã' : 'In Code'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {t('deductionStep2')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-slate-400 font-mono text-[10px] shrink-0">
                    ⚪ {locale === 'vi' ? 'Bình thường' : 'Neutral'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {t('deductionStep3')}
                  </span>
                </div>
              </div>

              {/* Notice regarding Keypad Sync */}
              <div className="pt-1.5 border-t border-white/[0.06] flex items-center gap-1.5 text-[10px] text-violet-300 font-mono">
                <Keyboard size={12} className="shrink-0 text-violet-400" />
                <span>{t('deductionSyncKeypad')}</span>
              </div>
            </div>

            {/* Digits 0-9 Interactive Keypad (2 rows of 5 digits) */}
            <div className="space-y-2">
              <div className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                <span>{locale === 'vi' ? 'Dãy số suy luận (0 - 9)' : 'Deduction Digits (0 - 9)'}</span>
                <span className="text-[9px] text-slate-500 font-sans">
                  {locale === 'vi' ? 'Gõ phím 0-9 để gạch nhanh' : 'Keyboard 0-9 supported'}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                {DIGITS.map((digit) => {
                  const state: DigitDeductionState = deductionMap[digit] || 'neutral';

                  let stateStyles = 'bg-[#121622] hover:bg-[#181d2c] border-white/[0.08] text-slate-200';
                  if (state === 'eliminated') {
                    stateStyles =
                      'bg-rose-950/40 hover:bg-rose-900/50 border-rose-500/50 text-rose-300 shadow-inner shadow-rose-950/50';
                  } else if (state === 'confirmed') {
                    stateStyles =
                      'bg-emerald-950/50 hover:bg-emerald-900/60 border-emerald-400/60 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.25)] ring-1 ring-emerald-400/40 font-black';
                  }

                  return (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleDigitClick(digit)}
                      className={`relative h-13 sm:h-14 flex flex-col items-center justify-center rounded-xl border transition-all active:scale-95 cursor-pointer ${stateStyles}`}
                    >
                      {/* Digit Number */}
                      <span
                        className={`text-xl sm:text-2xl font-mono font-bold transition-all ${
                          state === 'eliminated'
                            ? 'line-through decoration-rose-500 decoration-2 text-rose-400/80'
                            : state === 'confirmed'
                              ? 'scale-105'
                              : ''
                        }`}
                      >
                        {digit}
                      </span>

                      {/* Status Caption */}
                      <span className="text-[8px] font-mono uppercase tracking-wider leading-none mt-0.5">
                        {state === 'eliminated' ? (
                          <span className="text-rose-400 font-bold">
                            {locale === 'vi' ? 'Loại' : 'Out'}
                          </span>
                        ) : state === 'confirmed' ? (
                          <span className="text-emerald-400 font-bold">
                            {locale === 'vi' ? 'Có' : 'In'}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </span>

                      {/* Status Corner Icon */}
                      {state === 'eliminated' && (
                        <span className="absolute top-1 right-1 text-rose-400">
                          <X size={10} strokeWidth={3} />
                        </span>
                      )}
                      {state === 'confirmed' && (
                        <span className="absolute top-1 right-1 text-emerald-400">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {/* Auto-eliminate toggle */}
                <button
                  type="button"
                  onClick={onToggleAutoEliminate}
                  title={t('deductionAutoEliminateDesc')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-mono font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    isAutoEliminate
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                      : 'bg-white/[0.03] text-slate-500 border border-white/[0.06] hover:text-slate-400'
                  }`}
                >
                  <Sparkles size={13} className={isAutoEliminate ? 'text-amber-300' : 'text-slate-600'} />
                  <span>{locale === 'vi' ? 'Tự gạch 0 trúng' : 'Auto 0 hit'}</span>
                </button>

                {/* Reset button */}
                {hasAnyMarked && (
                  <button
                    type="button"
                    onClick={handleResetClick}
                    title={t('clearNotepad')}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/[0.06] transition cursor-pointer flex items-center gap-1 text-xs font-mono"
                  >
                    <RotateCcw size={13} />
                    <span className="hidden xs:inline">{locale === 'vi' ? 'Xóa hết' : 'Clear'}</span>
                  </button>
                )}
              </div>

              {/* Done Button */}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-mono font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-violet-600/20"
              >
                <CheckCircle2 size={15} />
                <span>{t('done')}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

