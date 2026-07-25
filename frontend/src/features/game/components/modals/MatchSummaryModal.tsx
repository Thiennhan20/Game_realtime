import { AnimatePresence, motion } from 'framer-motion';
import { Clock, History, Swords, Target } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { AuthUser, Locale, MatchStats, Player, Room } from '../../types';
import { formatDuration } from '../../utils';

interface MatchSummaryModalProps {
  isOpen: boolean;
  room: Room;
  stats: MatchStats | null;
  user: AuthUser;
  me: Player | null;
  opponent: Player | null;
  myPlayerIndex: number;
  secretReveal: string | null;
  locale: Locale;
  t: Translator;
  onClose: () => void;
  onOpenGuessHistory: () => void;
}

export function MatchSummaryModal({
  isOpen,
  room,
  stats,
  user,
  me,
  opponent,
  myPlayerIndex,
  secretReveal,
  locale,
  t,
  onClose,
  onOpenGuessHistory,
}: MatchSummaryModalProps) {
  if (!stats) return null;

  const isWinner = room.winnerIndex === myPlayerIndex;

  return (
    <AnimatePresence>
      {isOpen && room.state === 'FINISHED' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg max-h-[90dvh] bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col transform-gpu"
          >
            <div
              className={`p-6 pb-4 text-center shrink-0 ${
                isWinner
                  ? 'bg-gradient-to-b from-yellow-500/10 to-transparent'
                  : 'bg-gradient-to-b from-red-500/10 to-transparent'
              }`}
            >
              <div className="text-5xl mb-3">{isWinner ? '🏆' : '💀'}</div>
              <h3
                className={`text-2xl font-black bg-gradient-to-r ${
                  isWinner ? 'from-yellow-400 to-amber-500' : 'from-red-500 to-pink-500'
                } text-transparent bg-clip-text`}
              >
                {isWinner ? t('victory') : t('defeat')}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isWinner
                  ? t('victoryDesc')
                  : t('defeatDesc').replace('{username}', opponent?.username || '')}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-2 space-y-3.5 min-h-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Clock size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      {t('matchDuration')}
                    </span>
                    <span className="font-mono text-lg font-extrabold text-white">
                      {formatDuration(stats.duration)}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Target size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      {locale === 'vi' ? 'Tổng số lượt đoán' : 'Total Guesses'}
                    </span>
                    <span className="font-mono text-lg font-extrabold text-white">
                      {stats.totalGuesses} {locale === 'vi' ? 'lượt' : 'total'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {me?.avatar ? (
                      <img
                        src={me.avatar}
                        alt={me.username}
                        className="w-8 h-8 rounded-full border border-slate-600"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold uppercase">
                        {user.name.slice(0, 2)}
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-bold text-slate-200">{t('you')}</span>
                      {isWinner && (
                        <span className="ml-1.5 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                          👑 Winner
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      {t('yourGuesses')}
                    </span>
                    <span className="font-mono text-lg font-extrabold text-white">
                      {isWinner ? stats.winnerGuessCount : stats.loserGuessCount}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-700/40 my-2" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {opponent?.avatar ? (
                      <img
                        src={opponent.avatar}
                        alt={opponent.username}
                        className="w-8 h-8 rounded-full border border-slate-600"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-xs font-bold uppercase">
                        {(opponent?.username || '??').slice(0, 2)}
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-bold text-slate-200">
                        {opponent?.username || t('enemy')}
                      </span>
                      {!isWinner && (
                        <span className="ml-1.5 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                          👑 Winner
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      {t('opponentGuessesCount')}
                    </span>
                    <span className="font-mono text-lg font-extrabold text-white">
                      {isWinner ? stats.loserGuessCount : stats.winnerGuessCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                    {t('yourSecret')}
                  </span>
                  <span className="font-mono text-xl font-extrabold tracking-widest text-emerald-400">
                    {isWinner ? stats.winnerSecret : stats.loserSecret}
                  </span>
                </div>
                <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                    {t('enemySecret')}
                  </span>
                  <span className="font-mono text-xl font-extrabold tracking-widest text-purple-400">
                    {secretReveal || '????'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Swords size={18} className="text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">
                    {t('firstMove')}
                  </span>
                  <span className="text-sm font-bold text-slate-200">
                    {stats.rpsWinnerIndex === myPlayerIndex
                      ? `${t('you')} (${locale === 'vi' ? 'thắng oẳn tù tì' : 'won RPS'})`
                      : `${opponent?.username || t('enemy')} (${
                          locale === 'vi' ? 'thắng oẳn tù tì' : 'won RPS'
                        })`}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950/30 border-t border-slate-850 shrink-0 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={onOpenGuessHistory}
                className="w-full sm:w-auto px-5 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold rounded-xl transition duration-200 flex items-center justify-center space-x-2 cursor-pointer text-sm"
              >
                <History size={16} />
                <span>
                  {locale === 'vi' ? 'Xem lịch sử lượt đoán' : 'View Guess History'}
                </span>
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-8 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold rounded-xl transition duration-200 cursor-pointer shadow-md text-sm"
              >
                {locale === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
