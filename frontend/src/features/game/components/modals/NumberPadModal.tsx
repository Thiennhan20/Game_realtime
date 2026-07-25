import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

import type { Locale } from '../../types';

interface NumberPadModalProps {
  isOpen: boolean;
  value: string;
  locale: Locale;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function NumberPadModal({
  isOpen,
  value,
  locale,
  onChange,
  onSubmit,
  onClose,
}: NumberPadModalProps) {
  const appendDigit = (digit: string) => {
    if (value.length < 4 && !value.includes(digit)) {
      onChange(`${value}${digit}`);
    }
  };

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
                <span className="text-xl">🔥</span>
                <div>
                  <h3 className="text-sm font-black uppercase text-purple-400 tracking-wider">
                    {locale === 'vi' ? 'LƯỢT ĐOÁN CỦA BẠN' : 'YOUR GUESS TURN'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {locale === 'vi' ? 'Chọn 4 chữ số khác nhau' : 'Select 4 unique digits'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-800 hover:border-slate-700 text-slate-400 rounded-full transition cursor-pointer flex items-center justify-center shadow-lg"
              >
                <X size={15} />
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
                    disabled={isUsed || value.length >= 4}
                    onClick={() => appendDigit(digit)}
                    className={`py-3.5 rounded-2xl font-mono text-xl sm:text-2xl font-extrabold flex items-center justify-center border shadow-sm transition-all duration-150 active:scale-95 cursor-pointer ${
                      isUsed
                        ? 'bg-slate-950/20 border-slate-900 text-slate-800 opacity-20 pointer-events-none'
                        : 'bg-slate-800/50 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    {number}
                  </button>
                );
              })}

              <button
                onClick={() => onChange('')}
                disabled={value.length === 0}
                className="py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center bg-slate-950/40 border border-slate-900 hover:bg-red-500/15 hover:border-red-500/35 hover:text-red-400 text-slate-500 transition duration-150 active:scale-95 cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
              >
                {locale === 'vi' ? 'XÓA HẾT' : 'CLEAR'}
              </button>

              <button
                disabled={value.includes('0') || value.length >= 4}
                onClick={() => appendDigit('0')}
                className={`py-3.5 rounded-2xl font-mono text-xl sm:text-2xl font-extrabold flex items-center justify-center border shadow-sm transition-all duration-150 active:scale-95 cursor-pointer ${
                  value.includes('0')
                    ? 'bg-slate-950/20 border-slate-900 text-slate-800 opacity-20 pointer-events-none'
                    : 'bg-slate-800/50 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                0
              </button>

              <button
                onClick={() => onChange(value.slice(0, -1))}
                disabled={value.length === 0}
                className="py-3.5 rounded-2xl text-base sm:text-lg font-bold flex items-center justify-center bg-slate-950/40 border border-slate-900 hover:bg-amber-500/15 hover:border-amber-500/35 hover:text-amber-400 text-slate-500 transition duration-150 active:scale-95 cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                title="Backspace"
              >
                ⌫
              </button>
            </div>

            <button
              onClick={() => {
                onSubmit();
                onClose();
              }}
              disabled={value.length !== 4}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-40 disabled:pointer-events-none text-white text-base font-black rounded-2xl shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.01] active:scale-[0.99] transition duration-200 cursor-pointer flex items-center justify-center gap-2 z-10"
            >
              <span>🚀</span>
              <span>{locale === 'vi' ? 'GỬI ĐOÁN MẬT MÃ' : 'SUBMIT GUESS'}</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
