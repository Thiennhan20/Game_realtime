'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Delete,
  Flame,
  Loader2,
  NotebookPen,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';

import type { Translator } from '../../i18n';
import { sound, triggerHaptic } from '../../sound';
import type {
  DailyChallengeData,
  DailyLeaderboardEntry,
  DeductionMap,
  DigitDeductionState,
  Locale,
} from '../../types';
import { formatDuration, getGameApiUrl } from '../../utils';
import { DeductionModal } from './DeductionModal';

interface DailyChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  locale: Locale;
  t: Translator;
  onRefreshGameProfile?: () => void;
  onRequireLogin?: () => void;
}

export function DailyChallengeModal({
  isOpen,
  onClose,
  token,
  locale,
  t,
  onRefreshGameProfile,
  onRequireLogin,
}: DailyChallengeModalProps) {
  const [activeTab, setActiveTab] = useState<'puzzle' | 'leaderboard'>('puzzle');
  const [challengeData, setChallengeData] = useState<DailyChallengeData | null>(null);
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Guess list scroll ref for auto-scrolling to newest guess
  const guessListRef = useRef<HTMLDivElement | null>(null);

  // Deduction Notepad state & pop-up modal
  const [deductionMap, setDeductionMap] = useState<DeductionMap>({});
  const [isAutoEliminate, setIsAutoEliminate] = useState(true);
  const [isDeductionModalOpen, setIsDeductionModalOpen] = useState(false);

  // Load challenge on modal open
  const loadDailyChallenge = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(getGameApiUrl('/api/daily-challenge'), { headers });
      if (!response.ok) {
        throw new Error('Failed to load daily challenge');
      }
      const data: DailyChallengeData = await response.json();
      setChallengeData(data);
      setTimerSeconds(data.durationSeconds || 0);

      // Initialize deduction notepad auto-elimination based on previous guesses
      if (data.guesses && data.guesses.length > 0) {
        setDeductionMap((prev) => {
          const next = { ...prev };
          data.guesses.forEach((g) => {
            if (g.correctPosition === 0 && g.correctNumbers === 0) {
              for (const char of g.guess) {
                const digit = Number.parseInt(char, 10);
                if (!Number.isNaN(digit)) {
                  next[digit] = 'eliminated';
                }
              }
            }
          });
          return next;
        });
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error loading challenge');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    setIsLoadingLeaderboard(true);
    try {
      const response = await fetch(getGameApiUrl('/api/daily-challenge/leaderboard'));
      if (response.ok) {
        const json = await response.json();
        setLeaderboard(json.leaderboard || []);
      }
    } catch {
      // Ignore background leaderboard fetch error
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDailyChallenge();
      loadLeaderboard();
      setCurrentGuess('');
    }
  }, [isOpen, loadDailyChallenge, loadLeaderboard]);

  // Auto-scroll guess list to latest guess
  useEffect(() => {
    if (guessListRef.current) {
      guessListRef.current.scrollTop = guessListRef.current.scrollHeight;
    }
  }, [challengeData?.guesses?.length]);

  // Live timer tick when puzzle is open and active
  useEffect(() => {
    if (!isOpen || !challengeData || challengeData.isFinished || activeTab !== 'puzzle') {
      return;
    }

    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, challengeData, activeTab]);

  // Handle deduction pad toggles
  const handleToggleDeductionDigit = useCallback((digit: number) => {
    setDeductionMap((prev) => {
      const current = prev[digit] || 'neutral';
      let nextState: DigitDeductionState = 'eliminated';
      if (current === 'eliminated') nextState = 'confirmed';
      else if (current === 'confirmed') nextState = 'neutral';
      return { ...prev, [digit]: nextState };
    });
  }, []);

  const handleResetDeductions = useCallback(() => {
    setDeductionMap({});
  }, []);

  const handleToggleAutoEliminate = useCallback(() => {
    setIsAutoEliminate((prev) => !prev);
  }, []);

  // Handle digit input via on-screen pad or physical keyboard
  const handleAddDigit = useCallback(
    (digit: string) => {
      if (challengeData?.isFinished || isSubmitting) return;
      if (currentGuess.length >= 4) return;
      if (currentGuess.includes(digit)) return; // 4 unique digits

      sound.playDigitKey(currentGuess.length + 1);
      triggerHaptic(20);
      setCurrentGuess((prev) => prev + digit);
    },
    [challengeData, isSubmitting, currentGuess],
  );

  const handleDeleteDigit = useCallback(() => {
    if (challengeData?.isFinished || isSubmitting) return;
    if (currentGuess.length === 0) return;

    sound.playDigitDelete();
    triggerHaptic(20);
    setCurrentGuess((prev) => prev.slice(0, -1));
  }, [challengeData, isSubmitting, currentGuess]);

  const handleClearDigits = useCallback(() => {
    if (challengeData?.isFinished || isSubmitting) return;
    sound.playDigitClear();
    triggerHaptic(25);
    setCurrentGuess('');
  }, [challengeData, isSubmitting]);

  // Submit guess
  const handleSubmitGuess = useCallback(async () => {
    if (currentGuess.length !== 4 || new Set(currentGuess).size !== 4) return;
    if (challengeData?.isFinished || isSubmitting) return;

    if (!token) {
      onRequireLogin?.();
      return;
    }

    // Check duplicate guess
    if (challengeData?.guesses?.some((g) => g.guess === currentGuess)) {
      sound.playWarning();
      setErrorMessage(
        locale === 'vi'
          ? 'Bạn đã đoán dãy số này hôm nay rồi!'
          : 'You already guessed this code today!',
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    sound.playSubmitGuess();
    triggerHaptic([30, 20]);

    try {
      const response = await fetch(getGameApiUrl('/api/daily-challenge/guess'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guess: currentGuess,
          durationSeconds: timerSeconds,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit guess');
      }

      setChallengeData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          guessCount: result.guessCount,
          isSolved: result.isSolved,
          isFinished: result.isFinished,
          durationSeconds: result.durationSeconds,
          revealedSecret: result.revealedSecret,
          xpAwarded: result.xpAwarded,
          guesses: result.guesses,
        };
      });

      // Auto-eliminate digits if 0 Đúng 0 Sai
      if (isAutoEliminate && result.guessResult) {
        if (
          result.guessResult.correctPosition === 0 &&
          result.guessResult.correctNumbers === 0
        ) {
          setDeductionMap((prev) => {
            const next = { ...prev };
            for (const char of currentGuess) {
              const d = Number.parseInt(char, 10);
              if (!Number.isNaN(d)) next[d] = 'eliminated';
            }
            return next;
          });
        }
      }

      // Play success / defeat sounds
      if (result.isSolved) {
        sound.playVictory();
        onRefreshGameProfile?.();
        loadLeaderboard();
      } else if (result.isFinished) {
        sound.playDefeat();
      } else {
        sound.playMyGuessResult(
          result.guessResult?.correctNumbers || 0,
          result.guessResult?.correctPosition || 0,
        );
      }

      setCurrentGuess('');
    } catch (err: unknown) {
      sound.playError();
      setErrorMessage(err instanceof Error ? err.message : 'Error submitting guess');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentGuess,
    challengeData,
    isSubmitting,
    token,
    locale,
    timerSeconds,
    isAutoEliminate,
    onRequireLogin,
    onRefreshGameProfile,
    loadLeaderboard,
  ]);

  // Physical keyboard support
  useEffect(() => {
    if (!isOpen || activeTab !== 'puzzle' || challengeData?.isFinished) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        handleAddDigit(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        handleDeleteDigit();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        handleSubmitGuess();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    activeTab,
    challengeData,
    handleAddDigit,
    handleDeleteDigit,
    handleSubmitGuess,
  ]);

  const hasAnyMarked = Object.values(deductionMap).some((state) => state !== 'neutral');

  if (!isOpen) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      >
        <div className="w-full max-w-lg bg-[#0c1017] border border-white/[0.12] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden">
          {/* Modal Header */}
          <div className="px-3.5 py-3 sm:px-5 sm:py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#0f1422] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-sm">
                <Calendar size={17} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-mono font-bold text-sm sm:text-base text-white truncate">
                    {t('dailyChallenge')}
                  </h3>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/30 text-[10px] font-mono font-bold text-amber-300 shrink-0">
                    {challengeData?.date || ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate font-sans">
                  {t('dailyChallengeSubtitle')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <X size={17} />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-white/[0.08] bg-[#090c14] shrink-0 px-3 pt-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('puzzle')}
              className={`flex-1 pb-2.5 px-3 text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                activeTab === 'puzzle'
                  ? 'border-amber-400 text-amber-300 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={14} />
              <span>{t('dailyPuzzleTab')}</span>
              {challengeData?.isSolved && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 pb-2.5 px-3 text-xs sm:text-sm font-mono font-bold flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'border-amber-400 text-amber-300 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy size={14} />
              <span>{t('dailyLeaderboardTab')}</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-3">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={24} className="animate-spin text-amber-400" />
                <span className="text-xs font-mono">
                  {locale === 'vi' ? 'Đang tải thử thách hôm nay...' : 'Loading daily challenge...'}
                </span>
              </div>
            ) : activeTab === 'puzzle' ? (
              <>
                {/* Top Status Bar: Turns counter & Live Timer */}
                <div className="flex items-center justify-between gap-2 bg-[#121624] border border-white/[0.08] p-2.5 rounded-xl text-xs font-mono font-bold shrink-0">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Flame size={14} className="text-amber-400 shrink-0" />
                    <span>
                      {locale === 'vi'
                        ? `Lượt đoán: ${challengeData?.guessCount || 0}/8`
                        : `Guesses: ${challengeData?.guessCount || 0}/8`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock size={14} className="text-cyan-400 shrink-0" />
                    <span>{formatDuration(challengeData?.durationSeconds || timerSeconds)}</span>
                  </div>

                  {challengeData?.isSolved ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px]">
                      {locale === 'vi' ? '✓ ĐÃ PHÁ GIẢI' : '✓ SOLVED'}
                    </span>
                  ) : challengeData?.isFinished ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-400/40 text-[10px]">
                      {locale === 'vi' ? '✕ HẾT LƯỢT' : '✕ OVER'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px]">
                      +50 XP
                    </span>
                  )}
                </div>

                {/* Error Notice */}
                {errorMessage && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between gap-2">
                    <span>{errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="p-0.5 text-rose-400 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* Compact Guess History List (Styled identically to PvP/Bot Arena) */}
                <div
                  ref={guessListRef}
                  className="space-y-1.5 bg-[#080a11] border border-white/[0.06] p-2.5 rounded-xl max-h-[220px] overflow-y-auto"
                >
                  {(!challengeData?.guesses || challengeData.guesses.length === 0) ? (
                    <div className="py-6 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-1">
                      <span>{locale === 'vi' ? 'Chưa có lượt đoán nào' : 'No guesses yet'}</span>
                      <span className="text-[11px] text-slate-600 font-sans">
                        {locale === 'vi'
                          ? 'Nhập 4 chữ số khác nhau bên dưới để bắt đầu giải mã!'
                          : 'Enter 4 unique digits below to start cracking!'}
                      </span>
                    </div>
                  ) : (
                    challengeData.guesses.map((guessItem, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 sm:py-2 rounded-lg bg-[#101422] border border-white/[0.06] hover:border-white/[0.12] transition"
                      >
                        {/* Row Number & 4-Digit Guess */}
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <span className="text-[11px] font-mono font-bold text-slate-500 w-5 shrink-0">
                            #{index + 1}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {guessItem.guess.split('').map((char, cIdx) => (
                              <span
                                key={cIdx}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#181e33] border border-white/[0.15] text-white font-mono font-bold text-sm sm:text-base flex items-center justify-center shadow-sm"
                              >
                                {char}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Clues: Matched with PvP & Bot Arena */}
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs font-mono font-bold">
                          {/* Số đúng (Cows) */}
                          <div
                            className="flex items-center gap-1"
                            title={locale === 'vi' ? 'Số đúng (nhưng sai vị trí)' : 'Correct digits'}
                          >
                            <span className="text-xs">🟢</span>
                            <span
                              className={`font-extrabold ${
                                guessItem.correctNumbers > 0
                                  ? 'text-yellow-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {guessItem.correctNumbers}
                            </span>
                            <span className="hidden xs:inline text-[11px] font-sans font-normal text-slate-300">
                              {locale === 'vi' ? 'số đúng' : 'digits'}
                            </span>
                          </div>

                          {/* Vị trí đúng (Bulls) */}
                          <div
                            className="flex items-center gap-1"
                            title={locale === 'vi' ? 'Vị trí đúng (cả số và vị trí)' : 'Correct position'}
                          >
                            <span className="text-xs">🎯</span>
                            <span
                              className={`font-extrabold ${
                                guessItem.correctPosition > 0
                                  ? 'text-emerald-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {guessItem.correctPosition}
                            </span>
                            <span className="hidden xs:inline text-[11px] font-sans font-normal text-slate-300">
                              {locale === 'vi' ? 'vị trí' : 'pos'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Finished State Announcement & Secret Reveal */}
                {challengeData?.isFinished ? (
                  <div className="bg-[#101422] border border-white/[0.08] p-3.5 sm:p-4 rounded-xl space-y-3 text-center">
                    {challengeData.isSolved ? (
                      <>
                        <div className="inline-flex items-center justify-center p-2 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 mb-1">
                          <CheckCircle2 size={24} />
                        </div>
                        <h4 className="font-mono font-bold text-base sm:text-lg text-emerald-300">
                          {t('dailySolvedTitle')}
                        </h4>
                        <p className="text-xs text-slate-300 font-sans">
                          {locale === 'vi'
                            ? `Bạn đã phá giải mật mã hôm nay trong ${challengeData.guessCount}/8 lượt (${formatDuration(challengeData.durationSeconds || timerSeconds)})!`
                            : `You cracked today's code in ${challengeData.guessCount}/8 guesses (${formatDuration(challengeData.durationSeconds || timerSeconds)})!`}
                        </p>
                        <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold">
                          {t('dailyXpReward')}
                        </div>
                      </>
                    ) : (
                      <>
                        <h4 className="font-mono font-bold text-base text-rose-300">
                          {t('dailyFailedTitle')}
                        </h4>
                        <p className="text-xs text-slate-400 font-sans">
                          {t('dailyFailedDesc')}
                        </p>
                      </>
                    )}

                    {/* Secret Code Reveal */}
                    {challengeData.revealedSecret && (
                      <div className="pt-2">
                        <span className="text-[11px] font-mono text-slate-400 block mb-1">
                          {t('dailySecretWas')}
                        </span>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181e33] border border-amber-400/50 shadow-inner">
                          {challengeData.revealedSecret.split('').map((char, i) => (
                            <span
                              key={i}
                              className="w-7 h-7 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono font-black text-sm flex items-center justify-center"
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Interactive Input Area & On-Screen Keypad */
                  <div className="bg-[#0f1422] border border-white/[0.08] p-3 rounded-xl space-y-2.5">
                    {/* Current 4-digit input display + Notes Pop-up Button */}
                    <div className="flex items-center justify-between gap-2">
                      {/* 4 Digit slots */}
                      <div className="flex items-center gap-1.5 flex-1 justify-center max-w-[200px]">
                        {Array.from({ length: 4 }).map((_, i) => {
                          const digit = currentGuess[i] || '';
                          const isCurrent = currentGuess.length === i;
                          return (
                            <div
                              key={i}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center font-mono font-bold text-base sm:text-lg transition-all ${
                                digit
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                                  : isCurrent
                                    ? 'bg-white/[0.04] border-amber-400/60 text-amber-300 ring-2 ring-amber-400/25 animate-pulse'
                                    : 'bg-[#080a11] border-white/[0.1] text-slate-600'
                              }`}
                            >
                              {digit || (isCurrent ? '|' : '·')}
                            </div>
                          );
                        })}
                      </div>

                      {/* Quick Actions: Delete + Notes Pop-up Button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleDeleteDigit}
                          disabled={currentGuess.length === 0}
                          aria-label="Delete digit"
                          className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                          <Delete size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsDeductionModalOpen(true)}
                          title={locale === 'vi' ? 'Mở sổ tay ghi chú suy luận' : 'Open deduction notepad'}
                          className={`relative px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                            hasAnyMarked
                              ? 'bg-amber-500/20 border-amber-400/50 text-amber-200 shadow-sm'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-300 hover:text-white'
                          }`}
                        >
                          <NotebookPen size={14} className="text-amber-400" />
                          <span className="hidden xs:inline">
                            {locale === 'vi' ? 'Ghi chú' : 'Notes'}
                          </span>
                          {hasAnyMarked && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 shadow-sm" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* On-screen Digits 0-9 Keypad */}
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-0.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => {
                        const str = String(digit);
                        const isChosen = currentGuess.includes(str);
                        const isEliminated = deductionMap[digit] === 'eliminated';
                        const isConfirmed = deductionMap[digit] === 'confirmed';

                        return (
                          <button
                            key={digit}
                            type="button"
                            onClick={() => handleAddDigit(str)}
                            disabled={isChosen || currentGuess.length >= 4}
                            className={`relative h-10 sm:h-11 rounded-lg border font-mono font-bold text-sm sm:text-base transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                              isChosen
                                ? 'bg-amber-500/25 border-amber-400/50 text-amber-200 opacity-50 cursor-not-allowed'
                                : isEliminated
                                  ? 'bg-rose-950/20 hover:bg-rose-950/40 border-rose-500/20 text-slate-500'
                                  : isConfirmed
                                    ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-400/50 text-emerald-200'
                                    : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-slate-200'
                            }`}
                          >
                            <span className={isEliminated ? 'line-through text-slate-600' : ''}>
                              {digit}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Submit Guess Button */}
                    <button
                      type="button"
                      onClick={handleSubmitGuess}
                      disabled={currentGuess.length !== 4 || isSubmitting}
                      className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-mono font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                        currentGuess.length === 4 && !isSubmitting
                          ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 border border-amber-400 shadow-amber-500/20 cursor-pointer active:scale-[0.99]'
                          : 'bg-white/[0.03] text-slate-600 border border-white/[0.06] cursor-not-allowed opacity-50'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>
                            {locale === 'vi' ? 'Đang đối chiếu...' : 'Checking code...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>
                            {locale === 'vi' ? 'Gửi Lượt Đoán' : 'Submit Guess'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Leaderboard Tab */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>
                    {locale === 'vi'
                      ? `Top 20 người giải mã hôm nay (${challengeData?.date || ''})`
                      : `Top 20 codebreakers today (${challengeData?.date || ''})`}
                  </span>
                  <span className="text-amber-400 font-bold">
                    {leaderboard.length} {locale === 'vi' ? 'người' : 'solvers'}
                  </span>
                </div>

                {isLoadingLeaderboard ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 size={20} className="animate-spin text-amber-400" />
                    <span className="text-xs font-mono">
                      {locale === 'vi' ? 'Đang tải bảng xếp hạng...' : 'Loading leaderboard...'}
                    </span>
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="py-12 text-center space-y-2 bg-[#080a11] border border-white/[0.06] rounded-xl p-4">
                    <Trophy size={28} className="mx-auto text-slate-600" />
                    <p className="text-xs font-mono text-slate-400">
                      {locale === 'vi'
                        ? 'Chưa có ai phá giải thành công hôm nay!'
                        : 'No one has cracked today’s code yet!'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-sans">
                      {locale === 'vi'
                        ? 'Hãy là người đầu tiên ghi danh lên bảng vàng!'
                        : 'Be the first to secure the top spot!'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {leaderboard.map((item) => {
                      const isTop1 = item.rank === 1;
                      const isTop2 = item.rank === 2;
                      const isTop3 = item.rank === 3;

                      return (
                        <div
                          key={item.rank}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition ${
                            isTop1
                              ? 'bg-amber-500/10 border-amber-400/40 shadow-sm'
                              : isTop2
                                ? 'bg-slate-300/10 border-slate-300/30'
                                : isTop3
                                  ? 'bg-amber-700/10 border-amber-600/30'
                                  : 'bg-[#101422] border-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Rank badge */}
                            <div
                              className={`w-6 h-6 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                                isTop1
                                  ? 'bg-amber-400 text-slate-950'
                                  : isTop2
                                    ? 'bg-slate-300 text-slate-950'
                                    : isTop3
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-white/[0.04] text-slate-400'
                              }`}
                            >
                              {item.rank}
                            </div>

                            {/* Avatar */}
                            {item.avatar ? (
                              <img
                                src={item.avatar}
                                alt={item.username}
                                className="w-7 h-7 rounded-full object-cover border border-white/[0.1] shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-[10px] font-mono font-bold text-white shrink-0">
                                {item.username.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <span className="font-mono font-bold text-xs sm:text-sm text-slate-200 truncate">
                              {item.username}
                            </span>
                          </div>

                          {/* Guesses & Time */}
                          <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                            <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-amber-300">
                              {item.guessCount} {locale === 'vi' ? 'lượt' : 'tries'}
                            </span>
                            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                              <Clock size={12} className="text-cyan-400" />
                              {formatDuration(item.durationSeconds)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deduction Notes Pop-up Modal */}
      <DeductionModal
        isOpen={isDeductionModalOpen}
        onClose={() => setIsDeductionModalOpen(false)}
        deductionMap={deductionMap}
        onToggleDigit={handleToggleDeductionDigit}
        onReset={handleResetDeductions}
        isAutoEliminate={isAutoEliminate}
        onToggleAutoEliminate={handleToggleAutoEliminate}
        locale={locale}
        t={t}
      />
    </>
  );
}
