import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

import { sound, triggerHaptic } from '../../sound';
import type { DeductionMap, Locale } from '../../types';

interface NumberPadModalProps {
  isOpen: boolean;
  value?: string;
  locale: Locale;
  pastGuesses?: string[];
  deductionMap?: DeductionMap;
  onChange?: (value: string) => void;
  onSubmit: (guess: string) => void;
  onClose: () => void;
}

export function NumberPadModal({
  isOpen,
  value: initialValue = '',
  locale,
  pastGuesses = [],
  deductionMap,
  onChange,
  onSubmit,
  onClose,
}: NumberPadModalProps) {
  const [localValue, setLocalValue] = useState(initialValue);

  // Synchronize/reset local value when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalValue(initialValue || '');
    }
  }, [isOpen, initialValue]);

  const value = localValue;
  const isDuplicate = value.length === 4 && pastGuesses.includes(value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitTimeRef = useRef(0);

  const handleSubmit = useCallback(() => {
    const now = Date.now();
    if (isDuplicate || isSubmitting || now - lastSubmitTimeRef.current < 500) return;
    lastSubmitTimeRef.current = now;
    setIsSubmitting(true);
    sound.playSubmitGuess();
    triggerHaptic(35);
    onSubmit(value);
    onClose();
    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);
  }, [value, isDuplicate, isSubmitting, onSubmit, onClose]);

  const appendDigit = useCallback(
    (digit: string) => {
      setLocalValue((prev) => {
        if (prev.length < 4 && !prev.includes(digit)) {
          const nextValue = `${prev}${digit}`;
          if (nextValue.length === 4 && pastGuesses.includes(nextValue)) {
            sound.playWarning();
            triggerHaptic([60, 40, 60]);
          } else {
            sound.playDigitKey(nextValue.length);
            triggerHaptic(20);
          }
          onChange?.(nextValue);
          return nextValue;
        }
        return prev;
      });
    },
    [pastGuesses, onChange],
  );

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
        appendDigit(event.key);
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        if (value.length > 0) {
          sound.playDigitDelete();
          triggerHaptic(15);
          setLocalValue((prev) => {
            const next = prev.slice(0, -1);
            onChange?.(next);
            return next;
          });
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (value.length === 4 && !isDuplicate && !isSubmitting) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, value, isDuplicate, isSubmitting, pastGuesses, onChange, handleSubmit, onClose, appendDigit]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div className="absolute inset-0 bg-[#090a0f]/90" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="numberpad-title"
            aria-describedby="numberpad-desc"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative w-full max-w-sm sm:max-w-md bg-[#0d1017] border border-white/[0.08] rounded-2xl shadow-2xl p-5 sm:p-7 flex flex-col space-y-5 overflow-hidden z-10"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 z-10">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.7)] shrink-0" />
                <div>
                  <h3
                    id="numberpad-title"
                    className="text-xs sm:text-sm font-mono font-bold uppercase text-white tracking-wider"
                  >
                    {locale === 'vi' ? 'BÀN PHÍM DỰ ĐOÁN' : 'DECISION KEYPAD'}
                  </h3>
                  <p id="numberpad-desc" className="text-[10px] text-slate-400 font-mono">
                    {locale === 'vi' ? 'Chọn 4 chữ số khác nhau (hoặc gõ phím 0-9)' : 'Select 4 unique digits (or type 0-9)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={locale === 'vi' ? 'Đóng bàn phím' : 'Close keypad'}
                className="w-8 h-8 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-white/[0.15] text-slate-400 hover:text-white rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="flex justify-center items-center gap-3 py-1 z-10">
              {[0, 1, 2, 3].map((index) => {
                const digit = value[index];
                const isActive = value.length === index;
                return (
                  <div
                    key={index}
                    className={`w-12 h-14 sm:w-14 sm:h-16 rounded-xl border flex items-center justify-center font-mono text-2xl sm:text-3xl font-bold transition-all duration-150 ${
                      digit
                        ? 'bg-violet-500/15 border-violet-400/60 text-white shadow-sm'
                        : isActive
                          ? 'bg-[#121622] border-violet-400/80 text-slate-500 ring-2 ring-violet-500/30'
                          : 'bg-[#090a0f] border-white/[0.06] text-slate-700'
                    }`}
                  >
                    {digit || '·'}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2.5 z-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => {
                const digit = String(number);
                const isUsed = value.includes(digit);
                const deduction = deductionMap?.[number];
                return (
                  <button
                    key={number}
                    type="button"
                    disabled={isUsed || value.length >= 4}
                    onClick={() => appendDigit(digit)}
                    aria-label={`Digit ${number}${isUsed ? ' (already used)' : ''}`}
                    className={`relative py-3 rounded-xl font-mono text-xl sm:text-2xl font-bold flex items-center justify-center border transition-all duration-100 active:scale-95 active:translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                      isUsed
                        ? 'bg-white/[0.02] border-white/[0.03] text-slate-600 opacity-30 cursor-not-allowed'
                        : deduction === 'eliminated'
                          ? 'bg-rose-950/25 hover:bg-rose-900/35 border-rose-500/30 text-rose-300/70 shadow-sm'
                          : deduction === 'confirmed'
                            ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-400/50 text-emerald-300 font-black shadow-sm ring-1 ring-emerald-400/30'
                            : 'bg-[#121622] hover:bg-[#181d2c] border-white/[0.08] hover:border-violet-500/40 text-slate-100 shadow-sm'
                    }`}
                  >
                    <span className={deduction === 'eliminated' && !isUsed ? 'line-through decoration-rose-400/80' : ''}>
                      {number}
                    </span>
                    {!isUsed && deduction === 'eliminated' && (
                      <span className="absolute top-1 right-1.5 text-[9px] text-rose-400 leading-none">✕</span>
                    )}
                    {!isUsed && deduction === 'confirmed' && (
                      <span className="absolute top-1 right-1.5 text-[9px] text-emerald-400 leading-none">✓</span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  sound.playDigitClear();
                  triggerHaptic(15);
                  setLocalValue('');
                  onChange?.('');
                }}
                disabled={value.length === 0}
                aria-label={locale === 'vi' ? 'Xóa toàn bộ số đã nhập' : 'Clear all entered digits'}
                className="py-3 rounded-xl font-mono text-xs font-bold flex items-center justify-center bg-[#121622] border border-white/[0.08] hover:bg-rose-500/15 hover:border-rose-500/35 hover:text-rose-300 text-slate-400 transition duration-100 active:scale-95 active:translate-y-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {locale === 'vi' ? 'XÓA HẾT' : 'CLEAR'}
              </button>

              <button
                type="button"
                disabled={value.includes('0') || value.length >= 4}
                onClick={() => appendDigit('0')}
                aria-label={`Digit 0${value.includes('0') ? ' (already used)' : ''}`}
                className={`relative py-3 rounded-xl font-mono text-xl sm:text-2xl font-bold flex items-center justify-center border transition-all duration-100 active:scale-95 active:translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                  value.includes('0')
                    ? 'bg-white/[0.02] border-white/[0.03] text-slate-600 opacity-30 cursor-not-allowed'
                    : deductionMap?.[0] === 'eliminated'
                      ? 'bg-rose-950/25 hover:bg-rose-900/35 border-rose-500/30 text-rose-300/70 shadow-sm'
                      : deductionMap?.[0] === 'confirmed'
                        ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-400/50 text-emerald-300 font-black shadow-sm ring-1 ring-emerald-400/30'
                        : 'bg-[#121622] hover:bg-[#181d2c] border-white/[0.08] hover:border-violet-500/40 text-slate-100 shadow-sm'
                }`}
              >
                <span className={deductionMap?.[0] === 'eliminated' && !value.includes('0') ? 'line-through decoration-rose-400/80' : ''}>
                  0
                </span>
                {!value.includes('0') && deductionMap?.[0] === 'eliminated' && (
                  <span className="absolute top-1 right-1.5 text-[9px] text-rose-400 leading-none">✕</span>
                )}
                {!value.includes('0') && deductionMap?.[0] === 'confirmed' && (
                  <span className="absolute top-1 right-1.5 text-[9px] text-emerald-400 leading-none">✓</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playDigitDelete();
                  triggerHaptic(15);
                  setLocalValue((prev) => {
                    const next = prev.slice(0, -1);
                    onChange?.(next);
                    return next;
                  });
                }}
                disabled={value.length === 0}
                aria-label={locale === 'vi' ? 'Xóa 1 chữ số' : 'Delete digit'}
                className="py-3 rounded-xl font-mono text-base font-bold flex items-center justify-center bg-[#121622] border border-white/[0.08] hover:bg-amber-500/15 hover:border-amber-500/35 hover:text-amber-300 text-slate-400 transition duration-100 active:scale-95 active:translate-y-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Backspace"
              >
                ⌫
              </button>
            </div>

            {isDuplicate && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex items-center justify-center gap-2 text-xs font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-xl py-2 px-3 text-center z-10"
              >
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <span>
                  {locale === 'vi'
                    ? 'Bạn đã từng đoán dãy số này trong trận rồi!'
                    : 'You already guessed this code in this match!'}
                </span>
              </motion.div>
            )}

            <button
              onClick={handleSubmit}
              disabled={value.length !== 4 || isDuplicate || isSubmitting}
              className={`w-full py-3.5 text-sm sm:text-base font-mono font-bold rounded-xl shadow-lg transition-all duration-150 flex items-center justify-center gap-2 z-10 cursor-pointer ${
                isDuplicate
                  ? 'bg-amber-500/15 border border-amber-500/35 text-amber-300 cursor-not-allowed'
                  : 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 active:translate-y-0.5 border border-violet-400/40 text-white shadow-violet-600/25 disabled:opacity-30 disabled:pointer-events-none'
              }`}
            >
              {isDuplicate ? (
                <span>⚠️ {locale === 'vi' ? 'ĐÃ ĐOÁN DÃY SỐ NÀY' : 'ALREADY GUESSED'}</span>
              ) : (
                <span>{locale === 'vi' ? 'XÁC NHẬN DỰ ĐOÁN' : 'CONFIRM GUESS'}</span>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
