'use client';

import { useState } from 'react';
import { AlertCircle, Flame, RefreshCw, Shield, Trophy, Zap } from 'lucide-react';

import { getRankByKey, getRankByRating } from '../../ranks';
import type { GameProfile, Locale } from '../../types';
import { RankInfoModal } from '../modals/RankInfoModal';

interface PlayerStatsCardProps {
  locale: Locale;
  profile: GameProfile | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  className?: string;
}

export function PlayerStatsCard({
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
        className={`bg-slate-900/50 backdrop-blur-md border border-slate-800/80 p-3.5 rounded-xl lg:rounded-2xl shadow-xl ${className}`}
        aria-label={labels.loading}
        aria-busy="true"
      >
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="h-3 w-36 rounded bg-slate-800" />
            <div className="h-6 w-20 rounded-lg bg-slate-800" />
          </div>
          <div className="h-3 w-full rounded-full bg-slate-800" />
          <div className="h-12 w-full rounded-lg bg-slate-950/60" />
        </div>
        <span className="sr-only">{labels.loading}</span>
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section
        className={`bg-slate-900/50 backdrop-blur-md border border-rose-500/20 p-3.5 rounded-xl lg:rounded-2xl shadow-xl ${className}`}
        role="status"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-300">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{labels.loadError}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            aria-label={labels.retry}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
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
      className={`bg-slate-900/50 backdrop-blur-md border border-slate-800/80 p-3.5 rounded-xl lg:rounded-2xl shadow-xl ${className}`}
      aria-label={labels.title}
    >
      {/* Top 2 Lines: Title & Subtitle + Glowing Rank Icon Button on Right */}
      <div className="pb-2.5 border-b border-slate-700/60 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Trophy size={15} className="text-purple-400 shrink-0" />
            <h3 className="truncate bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-xs sm:text-sm font-black uppercase tracking-wider text-transparent">
              {labels.title}
            </h3>
          </div>
          <p className="mt-0.5 text-xs font-medium text-slate-300">
            {numberFormatter.format(totalMatches)} {labels.matches}
            <span className="mx-1 text-slate-600">•</span>
            {labels.bestStreak} {numberFormatter.format(profile.bestWinStreak)}
          </p>
        </div>

        {/* Small, Framed, Glowing Rank Icon Button on Right */}
        <button
          type="button"
          onClick={() => setIsRankInfoOpen(true)}
          aria-label={locale === 'vi' ? 'Xem bậc xếp hạng' : 'View rank tiers'}
          title={`${labels.rank}: ${locale === 'vi' ? currentTier.nameVi : currentTier.nameEn}`}
          className="group relative flex items-center justify-center p-2 rounded-xl border border-amber-500/50 bg-gradient-to-b from-amber-500/20 to-amber-600/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)] hover:shadow-[0_0_16px_rgba(245,158,11,0.6)] hover:border-amber-400 hover:scale-105 transition duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <img
            src={`/ranks/${currentTier.key}.png`}
            alt={locale === 'vi' ? currentTier.nameVi : currentTier.nameEn}
            className="w-5 h-5 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] group-hover:scale-110 transition duration-200"
          />
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
        </button>
      </div>

      {/* Rating & Peak Badges Header (ONLY 2 Badges) */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 font-mono text-xs">
        <div
          className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-bold text-cyan-300"
          title={labels.rating}
        >
          <Zap size={12} className="text-cyan-400 shrink-0" />
          <span>{numberFormatter.format(rating)} Rating</span>
        </div>

        <div
          className="flex items-center gap-1 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 font-bold text-yellow-300"
          title={labels.highestRating}
        >
          <Trophy size={12} className="text-yellow-400 shrink-0" />
          <span>Peak: {numberFormatter.format(highestRating)}</span>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
          <span className="text-slate-200">
            {labels.level} {numberFormatter.format(profile.level)}
          </span>
          <span className="font-mono text-slate-300">
            {numberFormatter.format(profile.currentXp)}
            <span className="text-slate-500"> / </span>
            {numberFormatter.format(profile.xpForNextLevel)} XP
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={`${labels.progress}: ${xpProgress}%`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={xpProgress}
          className="h-2 overflow-hidden rounded-full bg-slate-950 ring-1 ring-slate-800"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 shadow-[0_0_10px_rgba(217,70,239,0.35)] transition-[width] duration-500"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-4 divide-x divide-slate-800/80 rounded-lg border border-slate-800/70 bg-slate-950/45 py-2">
        {summaryStats.map((item) => (
          <div key={item.label} className="min-w-0 px-1 text-center">
            <div
              className={`flex items-center justify-center gap-0.5 text-xs font-black ${item.color}`}
            >
              {item.icon && <Flame size={12} className="shrink-0" />}
              <span>{item.value}</span>
            </div>
            <p className="mt-0.5 truncate text-[10px] sm:text-xs font-bold uppercase tracking-wide text-slate-400">
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
}
