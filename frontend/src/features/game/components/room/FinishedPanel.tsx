'use client';

import { History, Loader2, RefreshCw, Trophy } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';
import { ConfettiCanvas } from '../common/ConfettiCanvas';

interface FinishedPanelProps {
  isWinner: boolean;
  opponentName: string;
  opponentWantsPlayAgain: boolean;
  isRequestingPlayAgain?: boolean;
  canPlayAgain: boolean;
  locale: Locale;
  t: Translator;
  isSpectator?: boolean;
  winnerName?: string;
  onOpenSummary: () => void;
  onOpenGuessHistory: () => void;
  onPlayAgain: () => void;
  onLeaveRoom?: () => void;
}

export function FinishedPanel({
  isWinner,
  opponentName,
  opponentWantsPlayAgain,
  isRequestingPlayAgain = false,
  canPlayAgain,
  locale,
  t,
  isSpectator = false,
  winnerName,
  onOpenSummary,
  onOpenGuessHistory,
  onPlayAgain,
  onLeaveRoom,
}: FinishedPanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 text-center w-full max-w-sm mx-auto">
      {isWinner && <ConfettiCanvas />}
      <div className="space-y-4 w-full">
        <div className="text-6xl">{isSpectator ? '🏁' : isWinner ? '🏆' : '💀'}</div>
        <h3
          className={`text-2xl sm:text-3xl font-black bg-gradient-to-r ${
            isSpectator
              ? 'from-blue-400 to-indigo-400'
              : isWinner
                ? 'from-yellow-400 to-amber-500'
                : 'from-red-500 to-pink-500'
          } text-transparent bg-clip-text`}
        >
          {isSpectator
            ? winnerName
              ? locale === 'vi'
                ? `${winnerName} CHIẾN THẮNG!`
                : `${winnerName} WON!`
              : locale === 'vi'
                ? 'TRẬN ĐẤU KẾT THÚC'
                : 'MATCH FINISHED'
            : isWinner
              ? t('victory')
              : t('defeat')}
        </h3>

        <div className="space-y-2.5 w-full">
          <button
            onClick={onOpenSummary}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-500/20 transition duration-200 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Trophy size={18} className="text-yellow-400" />
            <span>{t('matchSummary')}</span>
          </button>
          <button
            onClick={onOpenGuessHistory}
            className="w-full py-3 bg-slate-900/80 hover:bg-slate-800/90 border border-purple-500/30 text-purple-300 font-extrabold rounded-xl shadow-md transition duration-200 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <History size={18} />
            <span>{locale === 'vi' ? 'Lịch sử lượt đoán' : 'Guess History'}</span>
          </button>
        </div>

        {!isSpectator && (
          <>
            <div className="relative my-3 flex items-center justify-center">
              <div className="border-t border-slate-800 w-full" />
              <span className="absolute bg-slate-950 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                {locale === 'vi' ? 'Thao tác' : 'Actions'}
              </span>
            </div>

            <div className="w-full">
              <button
                onClick={onPlayAgain}
                disabled={!canPlayAgain || isRequestingPlayAgain}
                className={`w-full py-3 text-white font-extrabold rounded-xl transition duration-200 flex items-center justify-center space-x-2 text-sm ${
                  isRequestingPlayAgain
                    ? 'bg-gradient-to-r from-emerald-600/80 to-teal-700/80 border border-emerald-500/40 cursor-wait shadow-md animate-pulse text-emerald-100'
                    : canPlayAgain
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-[0.98]'
                      : 'bg-gradient-to-r from-slate-700 to-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                {isRequestingPlayAgain ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-emerald-300" />
                    <span>
                      {locale === 'vi' ? 'Đang chờ đối thủ...' : 'Waiting for opponent...'}
                    </span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>
                      {canPlayAgain
                        ? t('playAgain')
                        : locale === 'vi'
                          ? 'Đối thủ đã rời'
                          : 'Opponent left'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        <div className="min-h-[18px] mt-2">
          {!isSpectator && opponentWantsPlayAgain && canPlayAgain && (
            <p className="text-xs text-green-400 font-semibold">
              {t('rematchRequest').replace('{username}', opponentName || t('enemy'))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
