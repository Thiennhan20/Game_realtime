'use client';

import dynamic from 'next/dynamic';
import { memo, useState } from 'react';
import { AlertCircle, Flame, RefreshCw, Trophy, Zap } from 'lucide-react';

import { getRankBadgePath, getRankByKey, getRankByRating } from '../../ranks';
import type { GameProfile, Locale } from '../../types';
import { EquippedTitleBadge } from '../common/EquippedTitleBadge';

const RankInfoModal = dynamic(
  () => import('../modals/RankInfoModal').then((mod) => mod.RankInfoModal),
  { ssr: false }
);

interface PlayerStatsCardProps {
  locale: Locale;
  profile: GameProfile | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  className?: string;
}

export const PlayerStatsCard = memo(function PlayerStatsCard({
  locale,
  profile,
  isLoading,
  error,
  onRetry,
  className = '',
}: PlayerStatsCardProps) {
  const [isRankInfoOpen, setIsRankInfoOpen] = useState(false);
  const labels =
    locale === 'vi'
      ? {
          title: 'Thành tích đấu trường',
          level: 'Cấp',
          wins: 'Thắng',
          losses: 'Thua',
          winRate: 'Tỷ lệ',
          streak: 'Chuỗi',
          bestStreak: 'Tốt nhất',
          totalXp: 'Tổng kinh nghiệm',
          progress: 'Tiến trình kinh nghiệm',
          loading: 'Đang tải thành tích...',
          loadError: 'Chưa thể tải thành tích.',
          retry: 'Thử lại',
          matches: 'trận đã đấu',
          rating: 'Rating',
          highestRating: 'Cao nhất',
          rank: 'Bậc hạng',
        }
      : {
          title: 'Arena performance',
          level: 'Level',
          wins: 'Wins',
          losses: 'Losses',
          winRate: 'Win rate',
          streak: 'Streak',
          bestStreak: 'Best',
          totalXp: 'Total experience',
          progress: 'Experience progress',
          loading: 'Loading performance...',
          loadError: 'Unable to load performance.',
          retry: 'Retry',
          matches: 'matches played',
          rating: 'Rating',
          highestRating: 'Peak',
          rank: 'Rank',
        };

  if (isLoading) {
    return (
      <section
        className={`bg-[#0d1017] border border-white/[0.08] p-3.5 rounded-xl shadow-xl ${className}`}
        aria-label={labels.loading}
        aria-busy="true"
      >
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="h-3 w-36 rounded bg-white/[0.06]" />
            <div className="h-6 w-20 rounded-lg bg-white/[0.06]" />
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.06]" />
          <div className="h-10 w-full rounded-lg bg-white/[0.03]" />
        </div>
        <span className="sr-only">{labels.loading}</span>
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section
        className={`bg-[#0d1017] border border-rose-500/30 p-3.5 rounded-xl shadow-xl ${className}`}
        role="status"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs font-mono font-bold text-slate-300">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{labels.loadError}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            aria-label={labels.retry}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.1] bg-[#121622] hover:bg-[#181d2c] px-2.5 py-1.5 text-xs font-mono font-bold text-slate-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
          >
            <RefreshCw size={12} aria-hidden="true" />
            <span>{labels.retry}</span>
          </button>
        </div>
      </section>
    );
  }

  const rating = profile.rating ?? 1000;
  const highestRating = profile.highestRating ?? rating;
  const currentTier = getRankByKey(profile.rankKey) ?? getRankByRating(rating);

  const totalMatches = profile.wins + profile.losses;
  const winRate = totalMatches > 0 ? Math.round((profile.wins / totalMatches) * 100) : 0;
  const xpProgress =
    profile.xpForNextLevel > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((profile.currentXp / profile.xpForNextLevel) * 100)),
        )
      : 0;
  const numberFormatter = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');
  const summaryStats = [
    { label: labels.wins, value: profile.wins, color: 'text-emerald-400' },
    { label: labels.losses, value: profile.losses, color: 'text-rose-400' },
    { label: labels.winRate, value: `${winRate}%`, color: 'text-cyan-400' },
    {
      label: labels.streak,
      value: profile.currentWinStreak,
      color: 'text-amber-400',
      icon: true,
    },
  ];

  return (
    <section
      className={`bg-[#0d1017] border border-white/[0.08] p-3.5 rounded-xl shadow-xl ${className}`}
      aria-label={labels.title}
    >
      {/* Top 2 Lines: Title & Subtitle + Clean Rank Icon Button on Right */}
      <div className="pb-2.5 border-b border-white/[0.06] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Trophy size={14} className="text-violet-400 shrink-0" />
            <h3 className="truncate text-white font-mono font-bold text-xs sm:text-sm uppercase tracking-wider">
              {labels.title}
            </h3>
          </div>
          <p className="mt-0.5 text-xs font-mono text-slate-400">
            {numberFormatter.format(totalMatches)} {labels.matches}
            <span className="mx-1 text-slate-600">•</span>
            {labels.bestStreak} {numberFormatter.format(profile.bestWinStreak)}
          </p>
        </div>

        {/* Crisp Rank Icon Button */}
        <button
          type="button"
          onClick={() => setIsRankInfoOpen(true)}
          aria-label={locale === 'vi' ? 'Xem bậc xếp hạng' : 'View rank tiers'}
          title={`${labels.rank}: ${locale === 'vi' ? currentTier.nameVi : currentTier.nameEn}`}
          className="group relative flex items-center justify-center p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <img
            src={getRankBadgePath(currentTier.key)}
            alt={locale === 'vi' ? currentTier.nameVi : currentTier.nameEn}
            className="w-5 h-5 object-contain group-hover:scale-105 transition"
          />
        </button>
      </div>

      {/* Rating, Peak & Equipped Title Badges Header */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 font-mono text-xs">
        <div
          className="flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-bold text-cyan-300"
          title={labels.rating}
        >
          <Zap size={11} className="text-cyan-400 shrink-0" />
          <span>{numberFormatter.format(rating)} Rating</span>
        </div>

        <div
          className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-300"
          title={labels.highestRating}
        >
          <Trophy size={11} className="text-amber-400 shrink-0" />
          <span>Peak: {numberFormatter.format(highestRating)}</span>
        </div>

        {profile.equippedTitle && (
          <EquippedTitleBadge
            title={profile.equippedTitle}
            locale={locale}
            size="sm"
            className="font-sans"
          />
        )}
      </div>

      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs font-mono font-bold">
          <span className="text-slate-200">
            {labels.level} {numberFormatter.format(profile.level)}
          </span>
          <span className="text-slate-400">
            {numberFormatter.format(profile.currentXp)}
            <span className="text-slate-600"> / </span>
            {numberFormatter.format(profile.xpForNextLevel)} XP
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`${labels.progress}: ${xpProgress}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={xpProgress}
          className="h-2 overflow-hidden rounded-full bg-[#090a0f] ring-1 ring-white/[0.08]"
        >
          <div
            className="h-full rounded-full bg-violet-600 transition-[width] duration-500"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-4 divide-x divide-white/[0.06] rounded-lg border border-white/[0.08] bg-[#121622] py-2">
        {summaryStats.map((item) => (
          <div key={item.label} className="min-w-0 px-1 text-center font-mono">
            <div
              className={`flex items-center justify-center gap-0.5 text-xs font-bold ${item.color}`}
            >
              {item.icon && <Flame size={12} className="shrink-0" />}
              <span>{item.value}</span>
            </div>
            <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <RankInfoModal
        isOpen={isRankInfoOpen}
        locale={locale}
        profile={profile}
        onClose={() => setIsRankInfoOpen(false)}
      />
    </section>
  );
});
