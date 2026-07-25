'use client';

import { useEffect, useRef } from 'react';

import type { Translator } from '../../i18n';
import type { Guess, Locale } from '../../types';

type GuessListTone = 'purple' | 'pink';
type GuessListVariant = 'arena' | 'modal';

interface GuessListPanelProps {
  guesses: Guess[];
  title: string;
  emptyLabel: string;
  locale: Locale;
  t: Translator;
  tone: GuessListTone;
  variant?: GuessListVariant;
  className?: string;
}

const toneStyles = {
  purple: {
    dot: 'text-purple-400',
    header: 'bg-purple-950/10',
    title: 'text-purple-300',
    count: 'text-purple-400 bg-purple-500/10',
    guess: 'text-purple-300',
    hover: 'hover:border-purple-500/30',
  },
  pink: {
    dot: 'text-pink-400',
    header: 'bg-pink-950/10',
    title: 'text-pink-300',
    count: 'text-pink-400 bg-pink-500/10',
    guess: 'text-pink-300',
    hover: 'hover:border-pink-500/30',
  },
} satisfies Record<GuessListTone, Record<string, string>>;

export function GuessListPanel({
  guesses,
  title,
  emptyLabel,
  locale,
  t,
  tone,
  variant = 'arena',
  className = '',
}: GuessListPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const styles = toneStyles[tone];
  const isModal = variant === 'modal';

  useEffect(() => {
    if (!isModal && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [guesses.length, isModal]);

  return (
    <div
      className={`flex-1 flex-col ${
        isModal ? 'bg-slate-900/40' : 'bg-slate-900/20'
      } border border-slate-800/80 ${
        isModal
          ? 'rounded-2xl overflow-hidden min-h-0'
          : 'rounded-xl sm:rounded-2xl overflow-hidden h-[218px] min-h-[218px] md:h-[366px] md:min-h-[366px] shrink-0'
      } ${className}`}
    >
      <div
        className={`${isModal ? 'p-3' : 'p-2.5 sm:p-3'} ${
          isModal
            ? tone === 'purple' ? 'bg-purple-950/20' : 'bg-pink-950/20'
            : styles.header
        } border-b border-slate-800 flex items-center justify-between shrink-0`}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <span className={`${styles.dot} shrink-0`}>●</span>
          <h4
            className={`${isModal ? 'text-xs sm:text-sm' : 'text-xs'} font-extrabold uppercase tracking-wider ${isModal ? styles.title : ''} truncate`}
          >
            {title}
          </h4>
        </div>
        <span
          className={`${isModal ? 'text-xs px-2.5' : 'text-[10px] px-2'} font-bold ${styles.count} py-0.5 rounded-full shrink-0`}
        >
          {isModal
            ? `${guesses.length} ${locale === 'vi' ? 'lượt' : 'guesses'}`
            : t('guessesCount').replace('{count}', String(guesses.length))}
        </span>
      </div>

      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto custom-scrollbar min-h-0 ${
          isModal
            ? 'p-3 space-y-2'
            : 'p-2.5 sm:p-3 space-y-1.5 h-[182px] md:h-[318px]'
        }`}
      >
        {guesses.map((guess, index) => (
          <div
            key={`${guess.timestamp}-${index}`}
            className={`flex items-center justify-between ${
              isModal
                ? `p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl ${styles.hover} transition`
                : 'p-2 sm:p-2.5 bg-slate-950/50 border border-slate-900 rounded-lg sm:rounded-xl'
            } text-sm`}
          >
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <span className="text-slate-500 text-xs font-mono font-bold shrink-0">
                #{index + 1}
              </span>
              <span
                className={`font-mono font-black ${
                  isModal ? 'text-base tracking-widest' : 'text-sm sm:text-base tracking-wider'
                } ${styles.guess}`}
              >
                {guess.guess}
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 text-xs shrink-0">
              <div className="flex items-center space-x-0.5 sm:space-x-1" title="Correct numbers">
                <span>🟢</span>
                <span
                  className={
                    isModal ? 'font-bold text-yellow-400 text-sm' : 'font-extrabold text-[10px] sm:text-xs'
                  }
                >
                  {isModal ? (
                    guess.correctNumbers
                  ) : (
                    <>
                      <span className="hidden xs:inline">
                        {t('correctDigits').replace('{count}', String(guess.correctNumbers))}
                      </span>
                      <span className="xs:hidden">{guess.correctNumbers}</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center space-x-0.5 sm:space-x-1" title="Correct positions">
                <span>🎯</span>
                <span
                  className={
                    isModal ? 'font-bold text-emerald-400 text-sm' : 'font-extrabold text-[10px] sm:text-xs'
                  }
                >
                  {isModal ? (
                    guess.correctPosition
                  ) : (
                    <>
                      <span className="hidden xs:inline">
                        {t('correctPosition').replace('{count}', String(guess.correctPosition))}
                      </span>
                      <span className="xs:hidden">{guess.correctPosition}</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}

        {guesses.length === 0 && (
          <div
            className={`h-full flex items-center justify-center ${
              isModal
                ? 'text-slate-500 text-sm py-12'
                : 'text-slate-600 text-xs sm:text-sm py-8'
            }`}
          >
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}
