'use client';

import { useMemo, useState } from 'react';

import type { Translator } from '../../i18n';
import type { Locale, Player, Room } from '../../types';
import { GuessListPanel } from '../common/GuessListPanel';

interface PlayingArenaProps {
  room: Room;
  opponent: Player;
  myPlayerIndex: number;
  opponentPlayerIndex: number;
  locale: Locale;
  t: Translator;
}

export function PlayingArena({
  room,
  opponent,
  myPlayerIndex,
  opponentPlayerIndex,
  locale,
  t,
}: PlayingArenaProps) {
  const [activeTab, setActiveTab] = useState<'mine' | 'opponent'>('mine');
  const myGuesses = useMemo(
    () => room.guesses.filter((guess) => guess.playerIndex === myPlayerIndex),
    [room.guesses, myPlayerIndex],
  );
  const opponentGuesses = useMemo(
    () => room.guesses.filter((guess) => guess.playerIndex === opponentPlayerIndex),
    [room.guesses, opponentPlayerIndex],
  );
  const opponentTitle = room.isAiRoom
    ? locale === 'vi'
      ? 'LƯỢT BOT ĐOÁN (TÌM MẬT MÃ CỦA BẠN)'
      : 'AI BOT GUESSES (AT YOUR CODE)'
    : locale === 'vi'
      ? 'LƯỢT ĐỐI THỦ ĐOÁN (TÌM MẬT MÃ CỦA BẠN)'
      : `${opponent.username.toUpperCase()}'S GUESSES`;

  return (
    <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0">
      <div className="flex md:hidden border border-slate-800/80 bg-slate-950/40 p-1 rounded-xl shrink-0 gap-1">
        <button
          onClick={() => setActiveTab('mine')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
            activeTab === 'mine'
              ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          {t('yourGuesses')} ({myGuesses.length})
        </button>
        <button
          onClick={() => setActiveTab('opponent')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
            activeTab === 'opponent'
              ? 'bg-pink-500/15 border border-pink-500/30 text-pink-300'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          {locale === 'vi' ? 'Đối thủ đoán' : 'Opponent Guesses'} ({opponentGuesses.length})
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 min-h-0">
        <GuessListPanel
          guesses={myGuesses}
          title={t('yourOffense')}
          emptyLabel={t('noGuessesYet')}
          locale={locale}
          t={t}
          tone="purple"
          className={activeTab === 'mine' ? 'flex' : 'hidden md:flex'}
        />
        <GuessListPanel
          guesses={opponentGuesses}
          title={opponentTitle}
          emptyLabel={t('enemyNotGuessedYet')}
          locale={locale}
          t={t}
          tone="pink"
          className={activeTab === 'opponent' ? 'flex' : 'hidden md:flex'}
        />
      </div>
    </div>
  );
}
