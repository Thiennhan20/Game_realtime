import { Keyboard } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';

interface GuessTurnBarProps {
  isMyTurn: boolean;
  isNumberPadOpen: boolean;
  opponentName: string;
  currentGuessInput?: string;
  locale: Locale;
  t: Translator;
  onOpenNumberPad: () => void;
  onCloseNumberPad: () => void;
}

export function GuessTurnBar({
  isMyTurn,
  isNumberPadOpen,
  opponentName,
  currentGuessInput = '',
  locale,
  t,
  onOpenNumberPad,
  onCloseNumberPad,
}: GuessTurnBarProps) {
  return (
    <div className="bg-[#0d1017] border border-white/[0.08] p-3 sm:p-3.5 rounded-xl shadow-md shrink-0">
      {isMyTurn ? (
        <div className="min-h-[44px] flex items-center justify-between gap-3">
          {/* Left: Active turn status with emerald radar beacon (no fire emoji) */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.7)] shrink-0" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-emerald-300 truncate">
                {locale === 'vi' ? 'LƯỢT ĐOÁN CỦA BẠN' : 'YOUR GUESS TURN'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
                • {locale === 'vi' ? 'Gõ 0-9 hoặc bấm nút' : 'Type 0-9 or click'}
              </span>
            </div>
          </div>

          {/* Right: Keypad Trigger with restored Guidance Callout */}
          {!isNumberPadOpen ? (
            <div className="relative shrink-0 flex items-center gap-2.5">
              {/* Interactive PIN slot preview - clicking opens keypad */}
              <button
                type="button"
                onClick={onOpenNumberPad}
                title={locale === 'vi' ? 'Bấm để mở bàn phím' : 'Click to open keypad'}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-violet-500/30 transition cursor-pointer"
              >
                {[0, 1, 2, 3].map((idx) => {
                  const digit = currentGuessInput[idx];
                  return (
                    <span
                      key={idx}
                      className={`w-6 h-7 rounded flex items-center justify-center font-mono text-xs font-bold border ${
                        digit
                          ? 'bg-violet-500/20 border-violet-400/50 text-white'
                          : 'bg-[#090a0f] border-white/[0.06] text-slate-600'
                      }`}
                    >
                      {digit || '·'}
                    </span>
                  );
                })}
              </button>

              {/* Main Guess Button with restored Instruction Callout */}
              <div className="relative">
                {/* Restored Guidance Callout with downward pointer */}
                <div
                  aria-hidden="true"
                  className="absolute bottom-full right-0 mb-2 z-20 pointer-events-none select-none flex flex-col items-end"
                >
                  <div className="bg-[#121622] border border-violet-500/35 text-violet-200 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md shadow-lg shadow-black/60 whitespace-nowrap flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span>
                      {locale === 'vi' ? 'Bấm vào để chọn số đoán' : 'Click to select guess'}
                    </span>
                  </div>
                  <div className="w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-violet-500/40 mr-4 -mt-[1px]" />
                </div>

                <button
                  onClick={onOpenNumberPad}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 active:translate-y-0.5 text-white text-xs sm:text-sm font-mono font-bold rounded-lg border border-violet-400/40 shadow-md shadow-violet-600/25 transition cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <Keyboard size={15} className="text-violet-200" />
                  <span>{locale === 'vi' ? 'Đoán số' : 'Guess'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-violet-300 font-mono font-semibold shrink-0">
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              <span>{locale === 'vi' ? 'Đang mở' : 'Active'}</span>
              <button
                onClick={onCloseNumberPad}
                className="underline text-slate-400 hover:text-white transition ml-1 cursor-pointer"
              >
                {locale === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-[44px] text-center text-xs sm:text-sm font-mono font-medium text-slate-400 flex items-center justify-center space-x-2">
          <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          <span className="truncate max-w-[280px]">
            {t('waitingOpponentGuess').replace('{username}', opponentName)}
          </span>
        </div>
      )}
    </div>
  );
}
