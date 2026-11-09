'use client';

import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
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
          <div className="absolute inset-0 bg-black/85" />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guess-history-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl max-h-[90dvh] bg-[#0d1017] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col transform-gpu"
          >
            <div className="p-4 sm:p-5 pb-3 border-b border-white/[0.06] flex items-center gap-3 shrink-0 bg-[#090a0f]/40">
              <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-400">
                <History size={20} />
              </div>
              <div>
                <h3 id="guess-history-title" className="text-base sm:text-lg font-mono font-bold text-white uppercase tracking-tight">
                  {locale === 'vi' ? 'Lịch sử lượt đoán trận đấu' : 'Match Guessing History'}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {locale === 'vi'
                    ? `Chi tiết tất cả lượt đoán giữa ${me?.username || t('you')} và ${opponentName}`
                    : `All guess records between ${me?.username || t('you')} and ${opponentName}`}
                </p>
              </div>
            </div>

            <div className="flex md:hidden border-b border-white/[0.06] bg-[#090a0f]/60 p-1.5 shrink-0 gap-1.5 px-4">
              <button
                onClick={() => setActiveTab('mine')}
                className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition duration-200 ${
                  activeTab === 'mine'
                    ? 'bg-violet-600/20 border border-violet-500/40 text-violet-300'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {t('yourGuesses')} ({myGuesses.length})
              </button>
              <button
                onClick={() => setActiveTab('opponent')}
                className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition duration-200 ${
                  activeTab === 'opponent'
                    ? 'bg-violet-600/20 border border-violet-500/40 text-violet-300'
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

            <div className="px-5 py-3.5 bg-[#090a0f]/80 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              {hasSummary && (
                <button
                  onClick={onOpenSummary}
                  className="w-full sm:w-auto px-4 py-2 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-violet-500/40 text-violet-200 hover:text-white text-xs font-mono font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:translate-y-0.5"
                >
                  <Trophy size={14} className="text-amber-400" />
                  <span>{locale === 'vi' ? 'Xem tổng kết kết quả' : 'View Summary'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 active:translate-y-0.5 text-white font-mono font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer border border-violet-400/30 shadow-md shadow-violet-600/20"
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
