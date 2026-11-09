'use client';

import { History, Loader2, RefreshCw, Trophy, UserPlus } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';

interface FinishedPanelProps {
  isWinner: boolean;
  opponentName: string;
  opponentWantsPlayAgain: boolean;
  isRequestingPlayAgain?: boolean;
  canPlayAgain: boolean;
  locale: Locale;
  t: Translator;
  isSpectator?: boolean;
  isReconnecting?: boolean;
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
  isReconnecting = false,
  winnerName,
  onOpenSummary,
  onOpenGuessHistory,
  onPlayAgain,
}: FinishedPanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 text-center w-full max-w-sm mx-auto">
      <div className="w-full bg-[#0d1017] border border-white/[0.08] p-6 sm:p-7 rounded-2xl shadow-2xl space-y-5 text-center">
        {/* Outcome Header */}
        <div className="space-y-2">
          <div className="text-5xl sm:text-6xl">{isSpectator ? '🏁' : isWinner ? '🏆' : '💀'}</div>
          <h3
            className={`text-2xl sm:text-3xl font-mono font-bold tracking-tight uppercase ${
              isSpectator
                ? 'text-cyan-300'
                : isWinner
                  ? 'text-amber-300 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]'
            }`}
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
          <p className="text-xs text-slate-400 font-mono">
            {isSpectator
              ? locale === 'vi'
                ? 'Trận đấu đối kháng đã khép lại'
                : 'Match has concluded'
              : isWinner
                ? locale === 'vi'
                  ? 'Bạn đã giải mã thành công trước!'
                  : 'You cracked the code first!'
                : locale === 'vi'
                  ? `${opponentName || 'Đối thủ'} đã giải mã trước!`
                  : `${opponentName || 'Opponent'} cracked your code first!`}
          </p>
        </div>

        {/* Primary Action CTA: Play Again / Open Waiting Room */}
        {!isSpectator && (
          <div className="w-full pt-1">
            {canPlayAgain ? (
              <button
                type="button"
                onClick={onPlayAgain}
                disabled={isRequestingPlayAgain || isReconnecting}
                className={`w-full py-3.5 text-white font-mono font-bold rounded-xl transition flex items-center justify-center space-x-2 text-sm sm:text-base cursor-pointer shadow-lg active:translate-y-0.5 ${
                  isReconnecting
                    ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400/50 cursor-not-allowed opacity-60'
                    : isRequestingPlayAgain
                    ? 'bg-emerald-800/80 border border-emerald-500/40 cursor-wait text-emerald-200'
                    : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border border-emerald-400/30 shadow-emerald-600/25'
                }`}
              >
                {isReconnecting ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-emerald-400" />
                    <span>{locale === 'vi' ? 'Đang kết nối lại...' : 'Reconnecting...'}</span>
                  </>
                ) : isRequestingPlayAgain ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-emerald-300" />
                    <span>
                      {locale === 'vi' ? 'Đang chờ đối thủ...' : 'Waiting for opponent...'}
                    </span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    <span>{t('playAgain')}</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlayAgain}
                disabled={isRequestingPlayAgain || isReconnecting}
                className={`w-full py-3.5 text-white font-mono font-bold rounded-xl transition flex items-center justify-center space-x-2 text-sm sm:text-base cursor-pointer shadow-lg active:translate-y-0.5 ${
                  isReconnecting
                    ? 'bg-violet-950/40 border border-violet-500/20 text-violet-400/50 cursor-not-allowed opacity-60'
                    : isRequestingPlayAgain
                    ? 'bg-violet-800/80 border border-violet-500/40 cursor-wait text-violet-200'
                    : 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 border border-violet-400/30 shadow-violet-600/25'
                }`}
              >
                {isReconnecting ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-violet-400" />
                    <span>{locale === 'vi' ? 'Đang kết nối lại...' : 'Reconnecting...'}</span>
                  </>
                ) : isRequestingPlayAgain ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-violet-300" />
                    <span>
                      {locale === 'vi' ? 'Đang mở phòng chờ...' : 'Opening room...'}
                    </span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>{t('openWaitingRoom')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Secondary Actions: 2-column side-by-side grid */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          <button
            onClick={onOpenSummary}
            className="py-2.5 px-2.5 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-violet-500/40 text-violet-200 hover:text-white font-mono text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:translate-y-0.5"
          >
            <Trophy size={15} className="text-amber-400 shrink-0" />
            <span className="truncate">{t('matchSummary')}</span>
          </button>

          <button
            onClick={onOpenGuessHistory}
            className="py-2.5 px-2.5 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-violet-500/40 text-violet-200 hover:text-white font-mono text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:translate-y-0.5"
          >
            <History size={15} className="text-violet-400 shrink-0" />
            <span className="truncate">{locale === 'vi' ? 'Lịch sử đoán' : 'Guess History'}</span>
          </button>
        </div>

        {/* Rematch Request Callout */}
        {!isSpectator && opponentWantsPlayAgain && canPlayAgain && (
          <div className="pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold animate-pulse">
              <span>🤝 {t('rematchRequest').replace('{username}', opponentName || t('enemy'))}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
