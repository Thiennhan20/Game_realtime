'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Award,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  History,
  Loader2,
  RefreshCw,
  Shield,
  Swords,
  Trophy,
  User,
  X,
  Zap,
} from 'lucide-react';

import { getRankBadgePath, getRankByKey, getRankByRating, getRankProgress } from '../../ranks';
import { sound } from '../../sound';
import type { Locale, PublicGameProfile } from '../../types';
import { formatElapsedTime, getGameApiUrl } from '../../utils';
import { EquippedTitleBadge } from '../common/EquippedTitleBadge';
import { RankBadge } from '../common/RankBadge';

interface PlayerProfileModalProps {
  isOpen: boolean;
  userId: string | null;
  currentUserId?: string | null;
  locale: Locale;
  onClose: () => void;
  onOpenAchievements?: () => void;
  onOpenHistory?: () => void;
  onSwitchAccount?: () => void;
}

export function PlayerProfileModal({
  isOpen,
  userId,
  currentUserId,
  locale,
  onClose,
  onOpenAchievements,
  onOpenHistory,
  onSwitchAccount,
}: PlayerProfileModalProps) {
  const [profile, setProfile] = useState<PublicGameProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMe = Boolean(
    userId === 'me' ||
    (userId && currentUserId && String(userId) === String(currentUserId))
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setProfile(null);
      setError(null);
      return;
    }

    let active = true;
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const target = userId || 'me';
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(getGameApiUrl(`/api/profile/${target}`), { headers });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || (locale === 'vi' ? 'Không thể tải hồ sơ người chơi' : 'Failed to load player profile'));
        }

        const data = await res.json();
        if (active && data.profile) {
          setProfile(data.profile);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      active = false;
    };
  }, [isOpen, userId, locale]);

  const numberFormatter = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[320] flex items-center justify-center p-2.5 sm:p-4 bg-[#090a0f]/90"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-profile-title"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0d1017] border border-white/[0.08] w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-auto max-h-[90vh] transform-gpu"
          >
            {/* Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#090a0f]/90 shrink-0 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-xl shrink-0">
                  <User size={16} />
                </div>
                <div className="min-w-0">
                  <h2 id="player-profile-title" className="text-xs sm:text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5 truncate">
                    <span>{isMe ? (locale === 'vi' ? 'Hồ sơ của bạn' : 'Your Profile') : (locale === 'vi' ? 'Hồ sơ người chơi' : 'Player Profile')}</span>
                  </h2>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {locale === 'vi' ? 'Chiến tích & bảng thông số thi đấu' : 'Career performance & battle stats'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 bg-[#121622] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] rounded-xl transition duration-150 cursor-pointer shrink-0 flex items-center justify-center"
                title={locale === 'vi' ? 'Đóng' : 'Close'}
                aria-label={locale === 'vi' ? 'Đóng' : 'Close'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-5 pb-8 sm:pb-9 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono">
                  <Loader2 size={26} className="animate-spin text-violet-400" />
                  <span className="text-xs">{locale === 'vi' ? 'Đang tải hồ sơ chiến tích...' : 'Loading player dossier...'}</span>
                </div>
              ) : error ? (
                <div className="py-12 px-4 text-center space-y-3">
                  <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle size={22} />
                  </div>
                  <p className="text-sm font-mono text-rose-300 font-bold">{error}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoading(true);
                      setError(null);
                      // Trigger re-fetch
                    }}
                    className="px-4 py-2 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] text-slate-200 text-xs font-mono font-bold rounded-xl transition cursor-pointer"
                  >
                    {locale === 'vi' ? 'Thử lại' : 'Try Again'}
                  </button>
                </div>
              ) : profile ? (
                (() => {
                  const stats = profile.stats;
                  const rating = stats.rating ?? 1000;
                  const currentTier = getRankByKey(stats.rankKey) ?? getRankByRating(rating);
                  const { current, next, progress, pointsToNext } = getRankProgress(rating);
                  const xpProgress = stats.xpForNextLevel > 0
                    ? Math.min(100, Math.max(0, Math.round((stats.currentXp / stats.xpForNextLevel) * 100)))
                    : 0;

                  return (
                    <div className="space-y-4">
                      {/* Identity Card */}
                      <div className="p-4 rounded-2xl bg-[#121622] border border-white/[0.08] shadow-lg flex items-center gap-3.5 sm:gap-4">
                        <div className="relative shrink-0">
                          {profile.user.avatar ? (
                            <img
                              src={profile.user.avatar}
                              alt={profile.user.name}
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-amber-400/80 object-cover shadow-md"
                            />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-violet-600 flex items-center justify-center font-mono font-bold text-lg sm:text-xl text-white border-2 border-amber-400/80 shadow-md">
                              {profile.user.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1">
                            <img
                              src={getRankBadgePath(currentTier.key)}
                              alt={currentTier.nameVi}
                              className="w-6 h-6 object-contain drop-shadow"
                            />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="font-mono font-bold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-[280px]">
                              {profile.user.name}
                            </h3>
                            {isMe && (
                              <span className="px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-300 font-mono text-[9px] font-bold">
                                {locale === 'vi' ? 'BẠN' : 'YOU'}
                              </span>
                            )}
                          </div>

                          {stats.equippedTitle ? (
                            <EquippedTitleBadge title={stats.equippedTitle} locale={locale} size="sm" />
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono italic block">
                              {locale === 'vi' ? 'Chưa trang bị danh hiệu' : 'No title equipped'}
                            </span>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} className="text-slate-500" />
                              <span>
                                {profile.user.createdAt
                                  ? formatElapsedTime(new Date(profile.user.createdAt).getTime(), locale)
                                  : 'Active'}
                              </span>
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-amber-400 font-bold">
                              Lv. {numberFormatter.format(stats.level)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Rank & Rating Progress Card */}
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#090a0f] border border-amber-500/30 shadow-lg space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={getRankBadgePath(current.key)}
                              alt={current.nameVi}
                              className="w-8 h-8 object-contain shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs sm:text-sm text-white uppercase">
                                  {locale === 'vi' ? current.nameVi : current.nameEn}
                                </span>
                                <span className="text-[10px] font-mono text-amber-400 font-bold">
                                  ({numberFormatter.format(rating)} Rating)
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                {next
                                  ? (locale === 'vi'
                                      ? `Cần ${numberFormatter.format(pointsToNext)} điểm lên ${next.nameVi}`
                                      : `Need ${numberFormatter.format(pointsToNext)} pts for ${next.nameEn}`)
                                  : (locale === 'vi' ? 'Đã đạt bậc hạng cao nhất' : 'Peak tier achieved')}
                              </p>
                            </div>
                          </div>

                          <div className="px-2.5 py-1 rounded-xl bg-[#121622] border border-white/[0.08] font-mono text-xs font-bold text-amber-300 flex items-center gap-1 shrink-0 shadow-inner">
                            <Trophy size={12} className="text-amber-400 shrink-0" />
                            <span>Peak: {numberFormatter.format(stats.highestRating ?? rating)}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative h-2 rounded-full bg-[#121622] ring-1 ring-white/[0.08] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.35)] transition-[width] duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Level XP Bar */}
                      <div className="px-3.5 py-2.5 rounded-xl bg-[#121622] border border-white/[0.06] space-y-1.5 font-mono">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-200">
                            {locale === 'vi' ? 'Cấp độ' : 'Level'} {numberFormatter.format(stats.level)}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {numberFormatter.format(stats.currentXp)} / {numberFormatter.format(stats.xpForNextLevel)} XP
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#090a0f] overflow-hidden ring-1 ring-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-violet-600 transition-[width] duration-500"
                            style={{ width: `${xpProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* PvP Battle Performance Grid */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                          <Swords size={12} className="text-violet-400" />
                          <span>{locale === 'vi' ? 'Đấu trường PvP' : 'PvP Arena Record'}</span>
                        </div>
                        <div className="grid grid-cols-4 divide-x divide-white/[0.06] rounded-xl border border-white/[0.08] bg-[#121622] py-2.5 font-mono">
                          <div className="px-1 text-center">
                            <span className="text-xs sm:text-sm font-bold text-white block">
                              {numberFormatter.format(stats.totalPvpMatches)}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500">
                              {locale === 'vi' ? 'Trận đấu' : 'Matches'}
                            </span>
                          </div>
                          <div className="px-1 text-center">
                            <span className="text-xs sm:text-sm font-bold text-cyan-400 block">
                              {stats.pvpWinRate}%
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500">
                              {locale === 'vi' ? 'Tỉ lệ thắng' : 'Win rate'}
                            </span>
                          </div>
                          <div className="px-1 text-center">
                            <div className="flex items-center justify-center gap-1 text-xs sm:text-sm font-bold">
                              <span className="text-emerald-400">{stats.wins}</span>
                              <span className="text-slate-600">/</span>
                              <span className="text-rose-400">{stats.losses}</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-500">
                              {locale === 'vi' ? 'Thắng / Thua' : 'W / L'}
                            </span>
                          </div>
                          <div className="px-1 text-center">
                            <div className="flex items-center justify-center gap-0.5 text-xs sm:text-sm font-bold text-amber-400">
                              <Flame size={12} className="shrink-0" />
                              <span>{stats.currentWinStreak}</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-500" title={`Best: ${stats.bestWinStreak}`}>
                              {locale === 'vi' ? `Kỷ lục: ${stats.bestWinStreak}` : `Best: ${stats.bestWinStreak}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 2 Sub-panels: AI Stats & Achievements */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                        {/* AI Stats */}
                        <div className="p-3 rounded-xl bg-[#121622] border border-white/[0.08] space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-300 flex items-center gap-1">
                              <Bot size={13} className="text-cyan-400" />
                              <span>{locale === 'vi' ? 'Đấu với Máy' : 'Bot Battles'}</span>
                            </span>
                            <span className="text-cyan-300 font-bold text-[11px]">
                              {stats.aiStats.totalAiWins} {locale === 'vi' ? 'thắng' : 'wins'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.06]">
                            <span>Dễ: <strong className="text-emerald-400">{stats.aiStats.easy.wins}</strong></span>
                            <span>Vừa: <strong className="text-amber-400">{stats.aiStats.medium.wins}</strong></span>
                            <span>Khó: <strong className="text-rose-400">{stats.aiStats.hard.wins}</strong></span>
                          </div>
                        </div>

                        {/* Achievements */}
                        <div className="p-3 rounded-xl bg-[#121622] border border-white/[0.08] space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-300 flex items-center gap-1">
                              <Award size={13} className="text-emerald-400" />
                              <span>{locale === 'vi' ? 'Thành tích' : 'Achievements'}</span>
                            </span>
                            <span className="text-emerald-400 font-bold text-[11px]">
                              {stats.unlockedAchievementsCount} / {stats.totalAchievementsCount}
                            </span>
                          </div>
                          <div className="relative h-1.5 rounded-full bg-[#090a0f] overflow-hidden ring-1 ring-white/[0.06]">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                              style={{
                                width: `${Math.min(100, Math.max(0, Math.round((stats.unlockedAchievementsCount / Math.max(1, stats.totalAchievementsCount)) * 100)))}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Recent Form (5 Matches) */}
                      <div className="space-y-1.5 font-mono">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-cyan-400" />
                            <span>{locale === 'vi' ? 'Phong độ gần đây (5 trận)' : 'Recent Form (Last 5)'}</span>
                          </span>
                        </div>

                        {stats.recentForm.length === 0 ? (
                          <div className="p-3 rounded-xl bg-[#090a0f]/40 border border-dashed border-white/[0.08] text-center text-xs text-slate-500">
                            {locale === 'vi' ? 'Chưa có trận đấu nào gần đây.' : 'No recent matches recorded.'}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {stats.recentForm.map((match) => {
                              const isWin = match.result === 'win';
                              const isAbandoned = match.result === 'abandoned';
                              return (
                                <div
                                  key={match.matchId}
                                  className="px-3 py-2 rounded-xl bg-[#121622] border border-white/[0.06] flex items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] shrink-0 ${
                                        isWin
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                          : isAbandoned
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                      }`}
                                    >
                                      {isWin ? 'W' : isAbandoned ? 'A' : 'L'}
                                    </span>
                                    <span className="truncate text-slate-200 font-bold max-w-[140px] sm:max-w-[200px]">
                                      vs {match.opponentName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400">
                                    <span>{match.guessCount} {locale === 'vi' ? 'đoán' : 'guesses'}</span>
                                    {!match.isAiRoom && (
                                      <span
                                        className={`font-bold ${
                                          match.ratingDelta > 0
                                            ? 'text-emerald-400'
                                            : match.ratingDelta < 0
                                            ? 'text-rose-400'
                                            : 'text-slate-400'
                                        }`}
                                      >
                                        {match.ratingDelta > 0 ? `+${match.ratingDelta}` : `${match.ratingDelta}`} Elo
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </div>

            {/* Footer Buttons */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-white/[0.08] bg-[#090a0f]/90 shrink-0 flex items-center justify-between gap-2">
              {isMe ? (
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  {onOpenAchievements && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAchievements();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Award size={13} className="text-emerald-400" />
                      <span>{locale === 'vi' ? 'Kho thành tích' : 'Achievements'}</span>
                    </button>
                  )}
                  {onOpenHistory && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenHistory();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <History size={13} className="text-cyan-400" />
                      <span>{locale === 'vi' ? 'Lịch sử đấu' : 'Match History'}</span>
                    </button>
                  )}
                  {isMe && onSwitchAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSwitchAccount();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw size={13} className="text-amber-400" />
                      <span>{locale === 'vi' ? 'Đổi tài khoản' : 'Switch Account'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-[11px] font-mono text-slate-500">
                  {locale === 'vi' ? 'Xem thông số người chơi công khai' : 'Public Player Profile'}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-mono font-bold text-xs rounded-xl transition cursor-pointer border border-violet-400/30 shadow-md shrink-0 ml-auto"
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

