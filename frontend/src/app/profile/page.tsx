'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Bot,
  Calendar,
  ChevronDown,
  Clock,
  Flame,
  History,
  Home,
  Loader2,
  RefreshCw,
  Shield,
  Swords,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react';

import { EquippedTitleBadge } from '@/features/game/components/common/EquippedTitleBadge';
import { getRankBadgePath, getRankByKey, getRankByRating, getRankProgress } from '@/features/game/ranks';
import type { Locale, PublicGameProfile } from '@/features/game/types';
import { formatElapsedTime, getGameApiUrl, getMainSiteUrl, navigateTopWindow } from '@/features/game/utils';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUserId = searchParams.get('id') || searchParams.get('userId');

  const [locale, setLocale] = useState<Locale>('vi');
  const [profile, setProfile] = useState<PublicGameProfile | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize locale from storage
  useEffect(() => {
    const saved = localStorage.getItem('game_locale') as Locale | null;
    if (saved === 'en' || saved === 'vi') setLocale(saved);
  }, []);

  const toggleLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    localStorage.setItem('game_locale', nextLocale);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Profile
  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload?.userId) setMyUserId(String(payload.userId));
          } catch {
            // ignore token parse error
          }
        }

        const target = requestedUserId || 'me';
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

    void loadProfile();

    return () => {
      active = false;
    };
  }, [requestedUserId, locale]);

  const isMe = Boolean(
    !requestedUserId ||
    requestedUserId === 'me' ||
    (myUserId && profile && String(profile.user.userId) === String(myUserId))
  );

  const numberFormatter = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col font-sans selection:bg-violet-500/30 selection:text-violet-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#090a0f] border-b border-white/[0.08] px-3 py-2.5 sm:px-6 sm:py-3 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <Link
              href="/"
              className="p-2 sm:p-2.5 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-violet-500/40 rounded-xl text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
              title={locale === 'vi' ? 'Quay lại đấu trường' : 'Return to Arena'}
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="hidden xs:block p-2 sm:p-2.5 bg-violet-500/10 text-violet-400 rounded-xl shrink-0 border border-violet-500/20">
              <User size={20} className="sm:w-6 sm:h-6" />
            </div>

            <div className="min-w-0">
              <h1 className="font-mono font-bold text-sm sm:text-base tracking-wider uppercase text-white truncate">
                {isMe
                  ? (locale === 'vi' ? 'HỒ SƠ CỦA BẠN' : 'YOUR DOSSIER')
                  : (locale === 'vi' ? 'HỒ SƠ NGƯỜI CHƠI' : 'PLAYER DOSSIER')}
              </h1>
              <p className="hidden sm:block text-xs text-slate-400 font-mono">
                {locale === 'vi' ? 'Chiến tích, bậc xếp hạng & lịch sử thi đấu' : 'Career performance, rank tier & match records'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="flex items-center bg-[#121622] border border-white/[0.08] p-0.5 rounded-xl text-[10px] font-mono font-bold">
              <button
                onClick={() => toggleLocale('en')}
                className={`px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                  locale === 'en' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => toggleLocale('vi')}
                className={`px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                  locale === 'vi' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                VI
              </button>
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowUserDropdown((prev) => !prev)}
                className="flex items-center justify-center bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] p-1.5 sm:py-1.5 sm:px-3 sm:gap-2 rounded-xl transition duration-150 cursor-pointer shadow-sm"
              >
                <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center font-mono font-bold text-[10px] text-white shrink-0">
                  {profile?.user.name ? profile.user.name.slice(0, 2).toUpperCase() : 'P'}
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-slate-200">
                    {profile?.user.name || 'Player'}
                  </span>
                  <ChevronDown size={14} className="text-slate-500" />
                </div>
              </button>

              {showUserDropdown && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 bg-[#0c1017] border border-white/[0.08] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-mono text-xs"
                >
                  <Link
                    href="/"
                    className="w-full text-left py-2.5 px-4 hover:bg-[#121622] text-slate-200 hover:text-white font-bold flex items-center space-x-2.5 transition"
                  >
                    <Home size={15} className="text-violet-400" />
                    <span>{locale === 'vi' ? 'Sàn đấu chính' : 'Arena Lobby'}</span>
                  </Link>
                  <Link
                    href="/history"
                    className="w-full text-left py-2.5 px-4 hover:bg-[#121622] text-slate-200 hover:text-white font-bold flex items-center space-x-2.5 transition"
                  >
                    <Clock size={15} className="text-cyan-400" />
                    <span>{locale === 'vi' ? 'Lịch sử đấu' : 'Match History'}</span>
                  </Link>
                  <Link
                    href="/leaderboard"
                    className="w-full text-left py-2.5 px-4 hover:bg-[#121622] text-slate-200 hover:text-white font-bold flex items-center space-x-2.5 transition"
                  >
                    <Trophy size={15} className="text-amber-400" />
                    <span>{locale === 'vi' ? 'Bảng xếp hạng' : 'Leaderboard'}</span>
                  </Link>
                  <Link
                    href="/achievements"
                    className="w-full text-left py-2.5 px-4 hover:bg-[#121622] text-slate-200 hover:text-white font-bold flex items-center space-x-2.5 transition"
                  >
                    <Award size={15} className="text-emerald-400" />
                    <span>{locale === 'vi' ? 'Thành tích' : 'Achievements'}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono">
            <Loader2 size={32} className="animate-spin text-violet-400" />
            <span className="text-sm font-bold">
              {locale === 'vi' ? 'Đang trích xuất dữ liệu hồ sơ...' : 'Extracting player dossier...'}
            </span>
          </div>
        ) : error ? (
          <div className="py-16 p-6 rounded-3xl bg-[#0d1017] border border-rose-500/30 text-center max-w-md mx-auto space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle size={22} />
            </div>
            <h3 className="font-mono font-bold text-base text-rose-300 uppercase">
              {locale === 'vi' ? 'Không tìm thấy hồ sơ' : 'Profile Unavailable'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-mono font-bold text-xs rounded-xl transition cursor-pointer"
            >
              {locale === 'vi' ? 'Về sàn đấu' : 'Return to Arena'}
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
                {/* Identity Hero Banner */}
                <div className="p-5 sm:p-6 rounded-3xl bg-[#0d1017] border border-white/[0.08] shadow-xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-4 min-w-0">
                    <div className="relative shrink-0">
                      {profile.user.avatar ? (
                        <img
                          src={profile.user.avatar}
                          alt={profile.user.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-amber-400/80 object-cover shadow-xl"
                        />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-violet-600 flex items-center justify-center font-mono font-bold text-2xl text-white border-2 border-amber-400/80 shadow-xl">
                          {profile.user.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1">
                        <img
                          src={getRankBadgePath(currentTier.key)}
                          alt={currentTier.nameVi}
                          className="w-8 h-8 object-contain drop-shadow"
                        />
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h2 className="font-mono font-bold text-lg sm:text-2xl text-white truncate">
                          {profile.user.name}
                        </h2>
                        {isMe && (
                          <span className="px-2 py-0.5 rounded bg-violet-500/20 border border-violet-500/40 text-violet-300 font-mono text-[10px] font-bold">
                            {locale === 'vi' ? 'BẠN' : 'YOU'}
                          </span>
                        )}
                      </div>

                      {stats.equippedTitle ? (
                        <div className="flex justify-center sm:justify-start">
                          <EquippedTitleBadge title={stats.equippedTitle} locale={locale} size="md" />
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono italic block">
                          {locale === 'vi' ? 'Chưa trang bị danh hiệu' : 'No title equipped'}
                        </span>
                      )}

                      <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-slate-400 font-mono pt-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-500" />
                          <span>
                            {locale === 'vi' ? 'Tham gia:' : 'Joined:'}{' '}
                            {profile.user.createdAt
                              ? new Date(profile.user.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')
                              : '2026'}
                          </span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-amber-400 font-bold">
                          Lv. {numberFormatter.format(stats.level)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isMe && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href="/achievements"
                        className="px-4 py-2 rounded-xl bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Award size={14} className="text-emerald-400" />
                        <span>{locale === 'vi' ? 'Đổi danh hiệu' : 'Change Title'}</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Rank & Rating Progress Card */}
                <div className="p-4 sm:p-5 rounded-3xl bg-[#0d1017] border border-amber-500/30 shadow-xl space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={getRankBadgePath(current.key)}
                        alt={current.nameVi}
                        className="w-10 h-10 object-contain shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm sm:text-base text-white uppercase">
                            {locale === 'vi' ? current.nameVi : current.nameEn}
                          </span>
                          <span className="text-xs font-mono text-amber-400 font-bold">
                            ({numberFormatter.format(rating)} Rating)
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono truncate">
                          {next
                            ? (locale === 'vi'
                                ? `Cần ${numberFormatter.format(pointsToNext)} điểm để lên hạng ${next.nameVi}`
                                : `Need ${numberFormatter.format(pointsToNext)} pts for ${next.nameEn}`)
                            : (locale === 'vi' ? 'Đã đạt bậc xếp hạng cao nhất' : 'Peak rank tier reached')}
                        </p>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-[#121622] border border-white/[0.08] font-mono text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-inner">
                      <Trophy size={14} className="text-amber-400 shrink-0" />
                      <span>{locale === 'vi' ? 'Đỉnh cao' : 'Peak'}: {numberFormatter.format(stats.highestRating ?? rating)} Rating</span>
                    </div>
                  </div>

                  <div className="relative h-2.5 rounded-full bg-[#121622] ring-1 ring-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.35)] transition-[width] duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Level XP Bar */}
                <div className="px-4 py-3 rounded-2xl bg-[#0d1017] border border-white/[0.08] space-y-2 font-mono">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-200">
                      {locale === 'vi' ? 'Tiến trình kinh nghiệm' : 'Level Progression'} (Cấp {numberFormatter.format(stats.level)})
                    </span>
                    <span className="text-slate-400">
                      {numberFormatter.format(stats.currentXp)} / {numberFormatter.format(stats.xpForNextLevel)} XP
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#121622] overflow-hidden ring-1 ring-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-violet-600 transition-[width] duration-500"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>

                {/* PvP Battle Performance Grid */}
                <div className="p-4 sm:p-5 rounded-3xl bg-[#0d1017] border border-white/[0.08] shadow-xl space-y-3 font-mono">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Swords size={14} className="text-violet-400" />
                    <span>{locale === 'vi' ? 'Thành tích đấu trường PvP' : 'PvP Arena Record'}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-[#121622] py-3">
                    <div className="p-2 text-center">
                      <span className="text-base sm:text-lg font-bold text-white block">
                        {numberFormatter.format(stats.totalPvpMatches)}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {locale === 'vi' ? 'Tổng số trận' : 'Total Matches'}
                      </span>
                    </div>

                    <div className="p-2 text-center">
                      <span className="text-base sm:text-lg font-bold text-cyan-400 block">
                        {stats.pvpWinRate}%
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {locale === 'vi' ? 'Tỉ lệ thắng' : 'Win Rate'}
                      </span>
                    </div>

                    <div className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-base sm:text-lg font-bold">
                        <span className="text-emerald-400">{stats.wins}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-rose-400">{stats.losses}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {locale === 'vi' ? 'Thắng / Thua' : 'Wins / Losses'}
                      </span>
                    </div>

                    <div className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-base sm:text-lg font-bold text-amber-400">
                        <Flame size={15} className="shrink-0" />
                        <span>{stats.currentWinStreak}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {locale === 'vi' ? `Kỷ lục: ${stats.bestWinStreak}` : `Best: ${stats.bestWinStreak}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Practice & Achievements Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
                  {/* AI Practice Card */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-[#0d1017] border border-white/[0.08] shadow-xl space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Bot size={15} className="text-cyan-400" />
                        <span>{locale === 'vi' ? 'Đấu Luyện Tập Máy' : 'Bot Practice'}</span>
                      </span>
                      <span className="text-cyan-300">
                        {stats.aiStats.totalAiWins} {locale === 'vi' ? 'chiến thắng' : 'wins'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/[0.06] text-xs">
                      <div className="p-2 rounded-xl bg-[#121622] border border-white/[0.06]">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Dễ</span>
                        <span className="text-sm font-bold text-emerald-400">{stats.aiStats.easy.wins}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#121622] border border-white/[0.06]">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Vừa</span>
                        <span className="text-sm font-bold text-amber-400">{stats.aiStats.medium.wins}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#121622] border border-white/[0.06]">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Khó</span>
                        <span className="text-sm font-bold text-rose-400">{stats.aiStats.hard.wins}</span>
                      </div>
                    </div>
                  </div>

                  {/* Achievements Card */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-[#0d1017] border border-white/[0.08] shadow-xl space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-300 flex items-center gap-1.5">
                        <Award size={15} className="text-emerald-400" />
                        <span>{locale === 'vi' ? 'Kho Thành Tích' : 'Achievements'}</span>
                      </span>
                      <span className="text-emerald-400">
                        {stats.unlockedAchievementsCount} / {stats.totalAchievementsCount}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="relative h-2 rounded-full bg-[#121622] overflow-hidden ring-1 ring-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, Math.round((stats.unlockedAchievementsCount / Math.max(1, stats.totalAchievementsCount)) * 100)))}%`
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 text-right">
                        {Math.min(100, Math.max(0, Math.round((stats.unlockedAchievementsCount / Math.max(1, stats.totalAchievementsCount)) * 100)))}% {locale === 'vi' ? 'hoàn tất' : 'completed'}
                      </p>
                    </div>

                    <Link
                      href="/achievements"
                      className="w-full py-2 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <Award size={13} />
                      <span>{locale === 'vi' ? 'Xem bộ sưu tập thành tích' : 'View All Badges'}</span>
                    </Link>
                  </div>
                </div>

                {/* Recent Form (5 Matches) */}
                <div className="p-4 sm:p-5 rounded-3xl bg-[#0d1017] border border-white/[0.08] shadow-xl space-y-3 font-mono">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-cyan-400" />
                      <span>{locale === 'vi' ? 'Phong độ gần đây (5 trận)' : 'Recent Form (Last 5 Matches)'}</span>
                    </span>
                    <Link
                      href="/history"
                      className="text-cyan-400 hover:text-cyan-300 transition text-[11px] flex items-center gap-0.5"
                    >
                      <span>{locale === 'vi' ? 'Xem tất cả' : 'View All'}</span>
                      <span>→</span>
                    </Link>
                  </div>

                  {stats.recentForm.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-white/[0.08] rounded-2xl">
                      {locale === 'vi' ? 'Chưa có dữ liệu trận đấu gần đây.' : 'No recent match history found.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.recentForm.map((match) => {
                        const isWin = match.result === 'win';
                        const isAbandoned = match.result === 'abandoned';

                        return (
                          <div
                            key={match.matchId}
                            className="p-3 rounded-2xl bg-[#121622] border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                  isWin
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                                    : isAbandoned
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                                }`}
                              >
                                {isWin ? 'W' : isAbandoned ? 'A' : 'L'}
                              </span>
                              <div className="min-w-0">
                                <span className="text-slate-100 font-bold block truncate">
                                  vs {match.opponentName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  {formatElapsedTime(new Date(match.finishedAt).getTime(), locale)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 text-xs">
                              <span className="text-slate-400 text-[11px]">
                                {match.guessCount} {locale === 'vi' ? 'lượt đoán' : 'guesses'}
                              </span>
                              {!match.isAiRoom && (
                                <span
                                  className={`px-2 py-0.5 rounded-lg border font-bold text-xs ${
                                    match.ratingDelta > 0
                                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                      : match.ratingDelta < 0
                                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                      : 'bg-slate-800 border-white/[0.08] text-slate-400'
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
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-slate-400 font-mono text-sm">
        <Loader2 className="animate-spin text-violet-400 mr-2" size={20} />
        <span>Loading...</span>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}

