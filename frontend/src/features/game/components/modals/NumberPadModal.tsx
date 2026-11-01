import { useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

import { sound, triggerHaptic } from '../../sound';
import type { Locale } from '../../types';

interface NumberPadModalProps {
  isOpen: boolean;
  value: string;
  locale: Locale;
  pastGuesses?: string[];
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function NumberPadModal({
  isOpen,
  value,
  locale,
  pastGuesses = [],
  onChange,
  onSubmit,
  onClose,
}: NumberPadModalProps) {
  const isDuplicate = value.length === 4 && pastGuesses.includes(value);

  const appendDigit = useCallback(
    (digit: string) => {
      if (value.length < 4 && !value.includes(digit)) {
        const nextValue = `${value}${digit}`;
        onChange(nextValue);
        if (nextValue.length === 4 && pastGuesses.includes(nextValue)) {
          sound.playWarning();
          triggerHaptic([60, 40, 60]);
        } else {
          sound.playDigitKey(nextValue.length);
          triggerHaptic(20);
        }
      }
    },
    [value, pastGuesses, onChange],
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
          onChange(value.slice(0, -1));
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        if (value.length === 4 && !isDuplicate) {
          sound.playSubmitGuess();
          triggerHaptic(35);
          onSubmit();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, value, isDuplicate, pastGuesses, onChange, onSubmit, onClose, appendDigit]);

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
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="numberpad-title"
            aria-describedby="numberpad-desc"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            className="relative w-full max-w-sm sm:max-w-md bg-slate-900/95 border border-purple-500/35 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 flex flex-col space-y-6 overflow-hidden z-10"
          >
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🔥</span>
                <div>
                  <h3
                    id="numberpad-title"
                    className="text-sm font-black uppercase text-purple-400 tracking-wider"
                  >
                    {locale === 'vi' ? 'LƯỢT ĐOÁN CỦA BẠN' : 'YOUR GUESS TURN'}
                  </h3>
                  <p id="numberpad-desc" className="text-[10px] text-slate-400">
                    {locale === 'vi' ? 'Chọn 4 chữ số khác nhau (hoặc gõ phím 0-9)' : 'Select 4 unique digits (or type 0-9)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={locale === 'vi' ? 'Đóng bàn phím' : 'Close keypad'}
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-800 hover:border-slate-700 text-slate-300 rounded-full transition cursor-pointer flex items-center justify-center shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="flex justify-center items-center gap-3 py-2 z-10">
              {[0, 1, 2, 3].map((index) => {
                const digit = value[index];
                const isActive = value.length === index;
                return (
                  <div
                    key={index}
                    className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border flex items-center justify-center font-mono text-2xl sm:text-3xl font-black shadow-inner transition-all duration-150 ${
                      digit
                        ? 'bg-purple-500/10 border-purple-500/60 text-purple-300'
                        : isActive
                          ? 'bg-slate-950 border-pink-500/60 text-white animate-pulse shadow-pink-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-800'
                    }`}
                  >
                    {digit || (isActive ? '|' : '·')}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-3 z-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => {
                const digit = String(number);
                const isUsed = value.includes(digit);
                return (
                  <button
                    key={number}
                    type="button"
                    disabled={isUsed || value.length >= 4}
                    onClick={() => appendDigit(digit)}
                    aria-label={`Digit ${number}${isUsed ? ' (already used)' : ''}`}
                    className={`py-3.5 rounded-2xl font-mono text-xl sm:text-2xl font-extrabold flex items-center justify-center border shadow-sm transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                      isUsed
                        ? 'bg-slate-950/60 border-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                        : 'bg-slate-800/70 hover:bg-slate-700 border-slate-700/80 hover:border-purple-500/50 text-slate-100'
                    }`}
                  >
                    {number}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  sound.playDigitClear();
                  triggerHaptic(15);
                  onChange('');
                }}
                disabled={value.length === 0}
                aria-label={locale === 'vi' ? 'Xóa toàn bộ số đã nhập' : 'Clear all entered digits'}
                className="py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center bg-slate-950/40 border border-slate-800 hover:bg-red-500/15 hover:border-red-500/35 hover:text-red-300 text-slate-400 transition duration-150 active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                {locale === 'vi' ? 'XÓA HẾT' : 'CLEAR'}
              </button>

              <button
                type="button"
                disabled={value.includes('0') || value.length >= 4}
                onClick={() => appendDigit('0')}
                aria-label={`Digit 0${value.includes('0') ? ' (already used)' : ''}`}
                className={`py-3.5 rounded-2xl font-mono text-xl sm:text-2xl font-extrabold flex items-center justify-center border shadow-sm transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                  value.includes('0')
                    ? 'bg-slate-950/60 border-slate-900 text-slate-600 opacity-40 cursor-not-allowed'
                    : 'bg-slate-800/70 hover:bg-slate-700 border-slate-700/80 hover:border-purple-500/50 text-slate-100'
                }`}
              >
                0
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playDigitDelete();
                  triggerHaptic(15);
                  onChange(value.slice(0, -1));
                }}
                disabled={value.length === 0}
                aria-label={locale === 'vi' ? 'Xóa 1 chữ số' : 'Delete digit'}
                className="py-3.5 rounded-2xl text-base sm:text-lg font-bold flex items-center justify-center bg-slate-950/40 border border-slate-800 hover:bg-amber-500/15 hover:border-amber-500/35 hover:text-amber-300 text-slate-400 transition duration-150 active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                title="Backspace"
              >
                ⌫
              </button>
            </div>

            {isDuplicate && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex items-center justify-center gap-2 text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/40 rounded-xl py-2 px-3 text-center shadow-lg shadow-amber-500/10 z-10"
              >
                <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                <span>
                  {locale === 'vi'
                    ? 'Bạn đã từng đoán dãy số này trong trận rồi!'
                    : 'You already guessed this code in this match!'}
                </span>
              </motion.div>
            )}

            <button
              onClick={() => {
                if (isDuplicate) return;
                sound.playSubmitGuess();
                triggerHaptic(35);
                onSubmit();
                onClose();
              }}
              disabled={value.length !== 4 || isDuplicate}
              className={`w-full py-4 text-white text-base font-black rounded-2xl shadow-xl transition-all duration-200 flex items-center justify-center gap-2 z-10 ${
                isDuplicate
                  ? 'bg-amber-600/30 border border-amber-500/50 text-amber-300 cursor-not-allowed opacity-75'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-40 disabled:pointer-events-none shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
              }`}
            >
              <span>{isDuplicate ? '⚠️' : '🚀'}</span>
              <span>
                {isDuplicate
                  ? locale === 'vi'
                    ? 'ĐÃ ĐOÁN DÃY SỐ NÀY'
                    : 'ALREADY GUESSED'
                  : locale === 'vi'
                    ? 'GỬI ĐOÁN MẬT MÃ'
                    : 'SUBMIT GUESS'}
              </span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
