import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Check, Clock, Sparkles, Swords, Target, Zap } from 'lucide-react';

import type { Translator } from '../../i18n';
import type {
  AuthUser,
  Locale,
  MatchStats,
  Player,
  PlayerXpResult,
  Room,
  UnlockedAchievementNotice,
} from '../../types';
import { formatDuration } from '../../utils';
import { EquippedTitleBadge } from '../common/EquippedTitleBadge';

interface MatchSummaryModalProps {
  isOpen: boolean;
  room: Room;
  stats: MatchStats | null;
  xpResult: PlayerXpResult | null;
  newlyUnlockedAchievements?: UnlockedAchievementNotice[];
  equippedTitleId?: string | null;
  isEquippingTitleId?: string | null;
  user: AuthUser;
  me: Player | null;
  opponent: Player | null;
  myPlayerIndex: number;
  secretReveal: string | null;
  locale: Locale;
  t: Translator;
  onClose: () => void;
  onLeaveRoom?: () => void;
  onOpenGuessHistory?: () => void;
  onEquipTitle?: (achievementId: string | null) => void;
}

export function MatchSummaryModal({
  isOpen,
  room,
  stats,
  xpResult,
  newlyUnlockedAchievements = [],
  equippedTitleId = null,
  isEquippingTitleId = null,
  user,
  me,
  opponent,
  myPlayerIndex,
  secretReveal,
  locale,
  t,
  onClose,
  onLeaveRoom,
  onOpenGuessHistory,
  onEquipTitle,
}: MatchSummaryModalProps) {
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

  if (!stats) return null;

  const isAbandoned = stats.status === 'abandoned' || stats.status === 'cancelled' || stats.ratingReason === 'abandoned';
  const isForfeited = stats.status === 'forfeited' || Boolean(stats.forfeitReason);
  const isDraw = room.winnerIndex === null && !isAbandoned && !isForfeited;
  const isWinner = room.winnerIndex === myPlayerIndex;

  let headlineIcon = isWinner ? '🏆' : '💀';
  let headlineTitle = isWinner ? t('victory') : t('defeat');
  let headlineDesc = isWinner
    ? t('victoryDesc')
    : t('defeatDesc').replace('{username}', opponent?.username || '');
  let headerGradient = isWinner
    ? 'from-yellow-500/10 to-transparent'
    : 'from-red-500/10 to-transparent';
  let titleGradient = isWinner
    ? 'from-yellow-400 to-amber-500'
    : 'from-red-500 to-pink-500';

  if (isAbandoned) {
    headlineIcon = '⚠️';
    headlineTitle = locale === 'vi' ? 'TRẬN ĐẤU BỊ HỦY' : 'MATCH CANCELLED';
    headlineDesc = locale === 'vi'
      ? 'Trận đấu kết thúc không có người thắng, không tính XP và Rating.'
      : 'Match ended with no winner. No XP or Rating awarded.';
    headerGradient = 'from-amber-500/10 to-transparent';
    titleGradient = 'from-amber-400 to-yellow-500';
  } else if (isDraw) {
    headlineIcon = '🤝';
    headlineTitle = locale === 'vi' ? 'TRẬN ĐẤU HÒA' : 'DRAW MATCH';
    headlineDesc = locale === 'vi'
      ? 'Cả hai người chơi hòa nhau.'
      : 'Both players drew the match.';
    headerGradient = 'from-cyan-500/10 to-transparent';
    titleGradient = 'from-cyan-400 to-blue-500';
  } else if (isForfeited) {
    if (isWinner) {
      headlineIcon = '🏳️';
      headlineTitle = locale === 'vi' ? 'ĐỐI THỦ BỎ CUỘC' : 'OPPONENT FORFEITED';
      headlineDesc = locale === 'vi'
        ? `${opponent?.username || 'Đối thủ'} đã rời khỏi trận đấu.`
        : `${opponent?.username || 'Opponent'} forfeited the match.`;
      headerGradient = 'from-emerald-500/10 to-transparent';
      titleGradient = 'from-emerald-400 to-teal-500';
    } else {
      headlineIcon = '💀';
      headlineTitle = locale === 'vi' ? 'BẠN ĐÃ BỎ CUỘC' : 'YOU FORFEITED';
      headlineDesc = locale === 'vi'
        ? 'Bạn đã thoát trận trước khi hoàn thành.'
        : 'You left the match before completion.';
      headerGradient = 'from-rose-500/10 to-transparent';
      titleGradient = 'from-rose-500 to-red-500';
    }
  }

  const isSettlementFailed = stats.ratingReason === 'settlement_failed' || stats.xpEligibilityReason === 'SETTLEMENT_FAILED';

  const showXpResult = Boolean(xpResult);
  const minimumGuessesNotMet =
    stats.xpEligibilityReason === 'minimum_guesses_not_met';
  const displayedXpEarned = xpResult?.xpEarned ?? 0;

  const ratingDelta = xpResult?.ratingDelta ?? 0;
  const rankBefore = xpResult?.rankBefore;
  const rankAfter = xpResult?.rankAfter;
  const rankBeforeEn = xpResult?.rankBeforeEn;
  const rankAfterEn = xpResult?.rankAfterEn;
  const isEarlyForfeitRating = (stats.ratingReason === 'early_forfeit_penalty' || stats.forfeitReason === 'early_forfeit') && ratingDelta === 0;
  const isRankChanged = Boolean(
    (rankBefore && rankAfter && rankBefore !== rankAfter) ||
    (rankBeforeEn && rankAfterEn && rankBeforeEn !== rankAfterEn)
  );

  const formattedRatingDelta = ratingDelta > 0 ? `+${ratingDelta}` : `${ratingDelta}`;

  const formatRankName = (rankVi: string | undefined, rankEn: string | undefined): string => {
    if (locale === 'en') {
      if (rankEn) return rankEn;
    }
    if (rankVi) {
      const map: Record<string, { vi: string; en: string }> = {
        'Đồng': { vi: 'Đồng', en: 'Bronze' },
        'Bạc': { vi: 'Bạc', en: 'Silver' },
        'Vàng': { vi: 'Vàng', en: 'Gold' },
        'Bạch Kim': { vi: 'Bạch Kim', en: 'Platinum' },
        'Kim Cương': { vi: 'Kim Cương', en: 'Diamond' },
        'Cao Thủ': { vi: 'Cao Thủ', en: 'Master' },
      };
      const entry = map[rankVi];
      return entry ? (locale === 'vi' ? entry.vi : entry.en) : rankVi;
    }
    return rankEn || '';
  };

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
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-summary-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg max-h-[90dvh] bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col transform-gpu"
          >
            <div
              className={`p-6 pb-4 text-center shrink-0 bg-gradient-to-b ${headerGradient}`}
            >
              <div className="text-5xl mb-3">{headlineIcon}</div>
              <h3
                id="match-summary-title"
                className={`text-2xl font-black bg-gradient-to-r ${titleGradient} text-transparent bg-clip-text`}
              >
                {headlineTitle}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {headlineDesc}
              </p>
              {showXpResult ? (
                <div className="mt-3 flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {/* XP Badge */}
                    <div
                      aria-live="polite"
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-black ${
                        displayedXpEarned > 0
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      <span>{`+${displayedXpEarned} XP`}</span>
                    </div>

                    {/* Rating Badge (Only for PvP) */}
                    {!room.isAiRoom && (
                      <div
                        aria-live="polite"
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-black ${
                          ratingDelta > 0
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : ratingDelta < 0
                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                            : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        <Zap size={14} aria-hidden="true" />
                        <span>{`${formattedRatingDelta} Rating`}</span>
                      </div>
                    )}
                  </div>

                  {/* Rank promotion / demotion banner */}
                  {isRankChanged && (
                    <div className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                      {ratingDelta > 0
                        ? (locale === 'vi' ? `Thăng hạng: ${formatRankName(rankAfter, rankAfterEn)}` : `Promoted: ${formatRankName(rankAfter, rankAfterEn)}`)
                        : (locale === 'vi' ? `Hạ hạng: ${formatRankName(rankAfter, rankAfterEn)}` : `Demoted: ${formatRankName(rankAfter, rankAfterEn)}`)}
                    </div>
                  )}

                  {/* Explanatory notes */}
                  {isSettlementFailed ? (
                    <p className="max-w-sm text-[10px] font-medium text-amber-300">
                      {locale === 'vi'
                        ? 'Khung kết quả chưa thể lưu. Bạn nhận +0 Rating.'
                        : 'Match result could not be saved. You received +0 Rating.'}
                    </p>
                  ) : isEarlyForfeitRating ? (
                    <p className="max-w-sm text-[10px] font-medium text-slate-400">
                      {t('earlyForfeitRatingDesc')}
                    </p>
                  ) : xpResult ? (
                    <p className="max-w-sm text-[10px] font-medium text-slate-400">
                      {xpResult.xpEarned > 0 ? (
                        <>
                          {locale === 'vi' ? 'Cấp' : 'Level'} {xpResult.level}
                          {' · '}
                          {xpResult.currentXp}/{xpResult.xpForNextLevel} XP
                        </>
                      ) : minimumGuessesNotMet ? (
                        locale === 'vi' ? (
                          <>Mỗi người cần ít nhất 3 lượt đoán để nhận XP.</>
                        ) : (
                          'Each player needs at least 3 guesses to earn XP.'
                        )
                      ) : locale === 'vi' ? (
                        'Trận này không nhận được XP.'
                      ) : (
                        'No XP was earned for this match.'
                      )}
                    </p>
                  ) : null}
                </div>
              ) : !isAbandoned && (
                <div className="mt-3 flex items-center justify-center gap-2 py-1 text-xs font-semibold text-slate-400 animate-pulse">
                  <Sparkles size={13} className="text-purple-400 animate-spin" />
                  <span>{locale === 'vi' ? 'Đang tổng kết điểm...' : 'Calculating rewards...'}</span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-2 space-y-3.5 min-h-0">
              {newlyUnlockedAchievements.length > 0 && (
                <div className="bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-purple-500/15 border border-amber-400/45 rounded-2xl p-3.5 space-y-2.5 shadow-[0_4px_24px_rgba(245,158,11,0.15)]">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-amber-400 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                      {locale === 'vi'
                        ? `🎖️ Mở khóa ${newlyUnlockedAchievements.length} thành tích mới!`
                        : `🎖️ Unlocked ${newlyUnlockedAchievements.length} New Achievement${newlyUnlockedAchievements.length > 1 ? 's' : ''}!`}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {newlyUnlockedAchievements.map((badge) => {
                      const isEquipped = equippedTitleId === badge.id;
                      const isBusy = isEquippingTitleId === badge.id;
                      return (
                        <div
                          key={badge.id}
                          className="flex items-center justify-between gap-2.5 bg-slate-950/75 border border-amber-500/30 rounded-xl p-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-lg shrink-0">
                              {badge.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                                {locale === 'vi' ? badge.titleVi : badge.titleEn}
                              </p>
                              <p className="text-[11px] text-slate-300 line-clamp-1">
                                {locale === 'vi' ? badge.descVi : badge.descEn}
                              </p>
                            </div>
                          </div>
                          {onEquipTitle && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                onEquipTitle(isEquipped ? null : badge.id)
                              }
                              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold border transition cursor-pointer flex items-center gap-1 ${
                                isEquipped
                                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                                  : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/50 text-amber-200 hover:text-white'
                              }`}
                            >
                              {isEquipped ? (
                                <>
                                  <Check size={12} />
                                  <span>
                                    {locale === 'vi' ? 'Đang dùng' : 'Equipped'}
                                  </span>
                                </>
                              ) : (
                                <span>
                                  {locale === 'vi' ? 'Trang bị' : 'Equip'}
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    <div className="text-sm min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-200">{t('you')}</span>
                        {isWinner && (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                            👑 Winner
                          </span>
                        )}
                      </div>
                      {me?.equippedTitle && (
                        <EquippedTitleBadge
                          title={me.equippedTitle}
                          locale={locale}
                          size="xs"
                          className="mt-0.5"
                        />
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
                  <div className="flex items-center gap-2 min-w-0">
                    {opponent?.avatar ? (
                      <img
                        src={opponent.avatar}
                        alt={opponent.username}
                        className="w-8 h-8 rounded-full border border-slate-600 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0">
                        {(opponent?.username || '??').slice(0, 2)}
                      </div>
                    )}
                    <div className="text-sm min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-200 truncate">
                          {opponent?.username || t('enemy')}
                        </span>
                        {!isWinner && (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                            👑 Winner
                          </span>
                        )}
                      </div>
                      {opponent?.equippedTitle && (
                        <EquippedTitleBadge
                          title={opponent.equippedTitle}
                          locale={locale}
                          size="xs"
                          className="mt-0.5"
                        />
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
                    {(isWinner ? stats.loserSecret : stats.winnerSecret) ||
                      secretReveal ||
                      '????'}
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

            <div className="px-6 py-4 bg-slate-950/30 border-t border-slate-850 shrink-0 flex items-center justify-center">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-w-[200px] py-3 px-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold rounded-xl transition duration-200 cursor-pointer shadow-lg shadow-purple-500/25 text-sm flex items-center justify-center tracking-wide"
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
