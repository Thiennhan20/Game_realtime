import type { Translator } from '../../i18n';
import type { Locale } from '../../types';

interface GuessTurnBarProps {
  isMyTurn: boolean;
  isNumberPadOpen: boolean;
  opponentName: string;
  locale: Locale;
  t: Translator;
  onOpenNumberPad: () => void;
  onCloseNumberPad: () => void;
}

export function GuessTurnBar({
  isMyTurn,
  isNumberPadOpen,
  opponentName,
  locale,
  t,
  onOpenNumberPad,
  onCloseNumberPad,
}: GuessTurnBarProps) {
  return (
    <div className="bg-slate-900/70 border border-slate-800/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg shrink-0">
      {isMyTurn ? (
        <div className="min-h-[42px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 uppercase tracking-wider min-w-0">
            <span className="shrink-0">🔥</span>
            <span className="truncate">
              {locale === 'vi' ? 'Lượt đoán của bạn!' : 'Your turn to guess!'}
            </span>
          </div>

          {!isNumberPadOpen ? (
            <div className="relative">
              <div className="absolute bottom-full right-0 mb-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded-lg whitespace-nowrap shadow-md pointer-events-none z-20">
                {locale === 'vi' ? 'Bấm vào để chọn số đoán' : 'Click to select guess'}
                <div className="absolute top-full right-8 border-4 border-transparent border-t-pink-500" />
              </div>
              <button
                onClick={onOpenNumberPad}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25 transition duration-200 cursor-pointer shrink-0"
              >
                {locale === 'vi' ? 'Đoán số' : 'Guess'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-purple-400 font-semibold shrink-0">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
              <span>{locale === 'vi' ? 'Đang mở' : 'Active'}</span>
              <button
                onClick={onCloseNumberPad}
                className="underline text-slate-400 hover:text-white transition ml-1"
              >
                {locale === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-[42px] text-center text-xs sm:text-sm font-semibold text-slate-400 flex items-center justify-center space-x-2">
          <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
          <span className="truncate max-w-[240px]">
            {t('waitingOpponentGuess').replace('{username}', opponentName)}
          </span>
        </div>
      )}
    </div>
  );
}
