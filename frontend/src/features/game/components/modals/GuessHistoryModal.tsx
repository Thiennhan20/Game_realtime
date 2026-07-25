'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Trophy } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale, Player, Room } from '../../types';
import { GuessListPanel } from '../common/GuessListPanel';

interface GuessHistoryModalProps {
  isOpen: boolean;
  room: Room;
  me: Player | null;
  opponent: Player | null;
  myPlayerIndex: number;
  opponentPlayerIndex: number;
  hasSummary: boolean;
  locale: Locale;
  t: Translator;
  onClose: () => void;
  onOpenSummary: () => void;
}

export function GuessHistoryModal({
  isOpen,
  room,
  me,
  opponent,
  myPlayerIndex,
  opponentPlayerIndex,
  hasSummary,
  locale,
  t,
  onClose,
  onOpenSummary,
}: GuessHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'mine' | 'opponent'>('mine');
  const myGuesses = useMemo(
    () => room.guesses.filter((guess) => guess.playerIndex === myPlayerIndex),
    [room.guesses, myPlayerIndex],
  );
  const opponentGuesses = useMemo(
    () => room.guesses.filter((guess) => guess.playerIndex === opponentPlayerIndex),
    [room.guesses, opponentPlayerIndex],
  );
  const opponentName = opponent?.username || (room.isAiRoom ? 'AI Bot' : t('enemy'));
  const opponentTitle =
    locale === 'vi'
      ? room.isAiRoom
        ? 'LƯỢT BOT ĐOÁN (TÌM MẬT MÃ CỦA BẠN)'
        : 'LƯỢT ĐỐI THỦ ĐOÁN (TÌM MẬT MÃ CỦA BẠN)'
      : room.isAiRoom
        ? 'AI BOT GUESSES (AT YOUR CODE)'
        : 'OPPONENT GUESSES (AT YOUR CODE)';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[105] flex items-center justify-center p-3 sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl max-h-[90dvh] bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col transform-gpu"
          >
            <div className="p-5 sm:p-6 pb-4 border-b border-slate-800/80 flex items-center gap-3 shrink-0">
              <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
                <History size={22} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {locale === 'vi' ? 'Lịch sử lượt đoán trận đấu' : 'Match Guessing History'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {locale === 'vi'
                    ? `Chi tiết tất cả lượt đoán giữa ${me?.username || t('you')} và ${opponentName}`
                    : `All guess records between ${me?.username || t('you')} and ${opponentName}`}
                </p>
              </div>
            </div>

            <div className="flex md:hidden border-b border-slate-800 bg-slate-950/60 p-1.5 shrink-0 gap-1.5 px-4">
              <button
                onClick={() => setActiveTab('mine')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition duration-200 ${
                  activeTab === 'mine'
                    ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {t('yourGuesses')} ({myGuesses.length})
              </button>
              <button
                onClick={() => setActiveTab('opponent')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition duration-200 ${
                  activeTab === 'opponent'
                    ? 'bg-pink-500/20 border border-pink-500/40 text-pink-300'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {opponentName} ({opponentGuesses.length})
              </button>
            </div>

            <div className="flex-1 p-4 sm:p-6 min-h-0 flex flex-col">
              <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
                <GuessListPanel
                  guesses={myGuesses}
                  title={locale === 'vi' ? 'LƯỢT BẠN ĐOÁN (TÌM MẬT MÃ ĐỐI THỦ)' : 'YOUR GUESSES'}
                  emptyLabel={t('noGuessesYet')}
                  locale={locale}
                  t={t}
                  tone="purple"
                  variant="modal"
                  className={activeTab === 'mine' ? 'flex' : 'hidden md:flex'}
                />
                <GuessListPanel
                  guesses={opponentGuesses}
                  title={opponentTitle}
                  emptyLabel={t('enemyNotGuessedYet')}
                  locale={locale}
                  t={t}
                  tone="pink"
                  variant="modal"
                  className={activeTab === 'opponent' ? 'flex' : 'hidden md:flex'}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {hasSummary && (
                <button
                  onClick={onOpenSummary}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trophy size={14} className="text-yellow-400" />
                  <span>{locale === 'vi' ? 'Xem tổng kết kết quả' : 'View Summary'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold text-sm rounded-xl transition cursor-pointer"
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
