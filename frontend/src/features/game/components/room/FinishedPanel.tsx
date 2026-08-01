import { History, LogOut, RefreshCw, Trophy } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';
import { ConfettiCanvas } from '../common/ConfettiCanvas';

interface FinishedPanelProps {
  isWinner: boolean;
  opponentName: string;
  opponentWantsPlayAgain: boolean;
  canPlayAgain: boolean;
  locale: Locale;
  t: Translator;
  onOpenSummary: () => void;
  onOpenGuessHistory: () => void;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export function FinishedPanel({
  isWinner,
  opponentName,
  opponentWantsPlayAgain,
  canPlayAgain,
  locale,
  t,
  onOpenSummary,
  onOpenGuessHistory,
  onPlayAgain,
  onLeaveRoom,
}: FinishedPanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 text-center w-full max-w-sm mx-auto">
      {isWinner && <ConfettiCanvas />}
      <div className="space-y-4 w-full">
        <div className="text-6xl">{isWinner ? '🏆' : '💀'}</div>
        <h3
          className={`text-3xl font-black bg-gradient-to-r ${
            isWinner ? 'from-yellow-400 to-amber-500' : 'from-red-500 to-pink-500'
          } text-transparent bg-clip-text`}
        >
          {isWinner ? t('victory') : t('defeat')}
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

        <div className="relative my-3 flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="absolute bg-slate-950 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
            {locale === 'vi' ? 'Thao tác' : 'Actions'}
          </span>
        </div>

        <div className="flex flex-row gap-2.5 w-full">
          <button
            onClick={onPlayAgain}
            disabled={!canPlayAgain}
            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-500/20 transition duration-200 flex items-center justify-center space-x-1.5 cursor-pointer text-sm disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none"
          >
            <RefreshCw size={16} />
            <span>
              {canPlayAgain
                ? t('playAgain')
                : locale === 'vi'
                  ? 'Đối thủ đã rời'
                  : 'Opponent left'}
            </span>
          </button>
          <button
            onClick={onLeaveRoom}
            className="flex-1 py-3 bg-slate-900/90 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 font-bold rounded-xl transition duration-200 flex items-center justify-center space-x-1.5 cursor-pointer text-sm"
          >
            <LogOut size={16} />
            <span>{t('backToLobby')}</span>
          </button>
        </div>

        <div className="min-h-[18px] mt-2">
          {opponentWantsPlayAgain && canPlayAgain && (
            <p className="text-xs text-green-400 font-semibold">
              {t('rematchRequest').replace('{username}', opponentName || t('enemy'))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
