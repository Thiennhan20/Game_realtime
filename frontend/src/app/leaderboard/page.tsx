'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Crown, Users, ChevronDown, Clock, Search, Award, Flame, Swords, TrendingUp } from 'lucide-react';
import { getGameApiUrl, getMainSiteUrl, navigateTopWindow } from '@/features/game/utils';
import { EquippedTitleBadge } from '@/features/game/components/common/EquippedTitleBadge';
import { RankBadge } from '@/features/game/components/common/RankBadge';
import { getRankByRating } from '@/features/game/ranks';
import type { EquippedTitle } from '@/features/game/types';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  rating: number;
  highestRating: number;
  rankTier: string;
  rankNameVi: string;
  rankNameEn: string;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  currentWinStreak: number;
  bestWinStreak: number;
  equippedTitle?: EquippedTitle | null;
}

function LeaderboardPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<'en' | 'vi'>(() => {
    const queryLocale = searchParams.get('locale');
    if (queryLocale === 'vi' || queryLocale === 'en') return queryLocale;
    const storedLocale = typeof window !== 'undefined' ? localStorage.getItem('game_locale') : null;
    if (storedLocale === 'vi' || storedLocale === 'en') return storedLocale;
    if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().includes('vi')) return 'vi';
    return 'en';
  });
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'all' | 'month' | 'week'>('all');
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string } | null>(() => {
    try {
      const cached = localStorage.getItem('auth_user_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string' && parsed.name && parsed.name.toLowerCase() !== 'player') {
          return { name: parsed.name, avatar: parsed.avatar || '' };
        }
      }
    } catch {
      // Ignore parse error
    }
    return null;
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const isLocal = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1');
      // const apiBase = process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3001/api' : 'https://server-nextjs-firm.onrender.com/api'); // Old US Oregon
      const apiBase = process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3001/api' : 'https://server-nextjs-film.onrender.com/api'); // New Singapore

      fetch(`${apiBase}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserProfile({
            name: data.user.name || data.user.username || 'User',
            avatar: data.user.avatar || ''
          });
        }
      })
      .catch(() => {});
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(getGameApiUrl(`/api/leaderboard?limit=100&period=${period}`));
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const data = await response.json();
        if (active && Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        if (active) {
          setError(locale === 'vi' ? 'Không thể tải bảng xếp hạng.' : 'Failed to load leaderboard.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchLeaderboard();
    return () => {
      active = false;
    };
  }, [locale, period]);

  const toggleLocale = (selectedLocale: 'en' | 'vi') => {
    setLocale(selectedLocale);
    localStorage.setItem('game_locale', selectedLocale);
  };

  const cleanQuery = searchQuery.trim().toLowerCase();
  const filteredLeaderboard = leaderboard.filter(item =>
    item.username.toLowerCase().includes(cleanQuery) ||
    (locale === 'vi' ? item.rankNameVi : item.rankNameEn).toLowerCase().includes(cleanQuery)
  );

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const tableDisplayList = cleanQuery ? filteredLeaderboard : filteredLeaderboard.filter(item => item.rank > 3);

  if (!mounted) return null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white font-sans flex flex-col max-w-full overflow-y-auto no-scrollbar">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl shrink-0">
        <div className="max-w-[1700px] w-full mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              onClick={() => router.push(`/?locale=${locale}`)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center shrink-0"
              title={locale === 'vi' ? 'Quay lại game' : 'Back to arena'}
            >
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            <div className="hidden xs:block p-2 bg-amber-500/10 text-amber-400 rounded-xl shrink-0 border border-amber-500/20">
              <Trophy size={18} className="sm:w-5 sm:h-5" />
            </div>

            <div className="min-w-0">
              <h1 className="font-extrabold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-transparent bg-clip-text">
                {locale === 'vi' ? 'BẢNG XẾP HẠNG CAO THỦ' : 'PVP LEADERBOARD'}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-400">
                {locale === 'vi' ? 'Vinh danh những cao thủ PvP có Rating cao nhất' : 'Honoring the highest rated PvP players'}
              </p>
            </div>
          </div>

          {/* Right Section: Language + Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="flex items-center bg-slate-900/60 border border-slate-800/80 p-0.5 rounded-xl text-[10px] font-bold">
              <button
                onClick={() => toggleLocale('en')}
                className={`px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                  locale === 'en' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => toggleLocale('vi')}
                className={`px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                  locale === 'vi' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                VI
              </button>
            </div>

            {userProfile && userProfile.name && userProfile.name.toLowerCase() !== 'player' && userProfile.name.toLowerCase() !== 'user' ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-1.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 p-1 rounded-full sm:px-3 sm:py-1.5 sm:rounded-xl transition duration-150 cursor-pointer"
                >
                  {userProfile.avatar ? (
                    <img src={userProfile.avatar} alt={userProfile.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-700 object-cover" />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs uppercase text-white">
                      {userProfile.name.slice(0, 2)}
                    </div>
                  )}
                  <span className="hidden sm:inline font-medium text-xs text-slate-200">{userProfile.name}</span>
                  <ChevronDown size={14} className="hidden sm:inline text-slate-500" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900/95 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl py-2 z-50">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigateTopWindow(getMainSiteUrl('/profile', locale));
                      }}
                      className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-2 cursor-pointer"
                    >
                      <Users size={14} className="text-purple-400" />
                      <span>{locale === 'vi' ? 'Hồ sơ cá nhân' : 'User Profile'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        router.push(`/history?locale=${locale}`);
                      }}
                      className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-2 cursor-pointer"
                    >
                      <Clock size={14} className="text-purple-400" />
                      <span>{locale === 'vi' ? 'Lịch sử đấu' : 'Match History'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        router.push(`/leaderboard?locale=${locale}`);
                      }}
                      className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-2 cursor-pointer"
                    >
                      <Trophy size={14} className="text-amber-400" />
                      <span>{locale === 'vi' ? 'Bảng xếp hạng' : 'Leaderboard'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        router.push(`/achievements?locale=${locale}`);
                      }}
                      className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-2 cursor-pointer"
                    >
                      <Award size={14} className="text-emerald-400" />
                      <span>{locale === 'vi' ? 'Thành tích' : 'Achievements'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-slate-900/60 border border-slate-800/80 p-1 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl animate-pulse">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-800/80 rounded-full shrink-0" />
                <div className="hidden sm:block w-20 h-3.5 bg-slate-800/80 rounded-md" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-6 pb-24 sm:pb-28 pb-[calc(6rem+env(safe-area-inset-bottom))] space-y-6">

        {/* Top Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-3 sm:p-4 rounded-2xl">
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {locale === 'vi' ? 'Tất cả thời gian' : 'All Time'}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'month'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {locale === 'vi' ? 'Tháng này' : 'Monthly'}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('week')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                period === 'week'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              {locale === 'vi' ? 'Tuần này' : 'Weekly'}
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder={locale === 'vi' ? 'Tìm người chơi...' : 'Search player...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none pl-9 pr-3 py-2 rounded-xl text-base sm:text-xs placeholder-slate-600 text-white shadow-inner"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-xs font-medium">
              {locale === 'vi' ? 'Đang tải bảng xếp hạng...' : 'Loading leaderboard...'}
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 font-bold text-sm bg-slate-900/40 border border-slate-800 rounded-2xl">
            {error}
          </div>
        ) : leaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-14 px-4 text-center bg-gradient-to-b from-slate-900/60 to-slate-950/80 border border-slate-800/80 rounded-3xl max-w-xl mx-auto w-full flex flex-col items-center shadow-2xl"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
              <Trophy size={30} />
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-white mb-1.5">
              {period === 'week'
                ? (locale === 'vi' ? 'Chưa có trận đấu nào trong tuần này' : 'No matches played this week yet')
                : period === 'month'
                  ? (locale === 'vi' ? 'Chưa có trận đấu nào trong tháng này' : 'No matches played this month yet')
                  : (locale === 'vi' ? 'Chưa có cao thủ nào trên bảng xếp hạng' : 'No players on the leaderboard yet')}
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
              {period === 'week'
                ? (locale === 'vi'
                    ? 'Bảng xếp hạng tuần mới đang chờ đợi người mở màn. Hãy xung trận ngay để độc chiếm ngôi vị Quán Quân tuần!'
                    : 'The weekly leaderboard is waiting for its first challenger. Enter a match now to claim the #1 Champion spot!')
                : period === 'month'
                  ? (locale === 'vi'
                      ? 'Đấu trường tháng mới đã khởi tranh! Tham gia đấu PvP ngay để là người đầu tiên ghi danh lên Bảng Vàng tháng!'
                      : 'The monthly arena has begun! Play a PvP match now to be the first on the monthly Hall of Fame!')
                  : (locale === 'vi'
                      ? 'Hãy tham gia đấu trường PvP ngay để ghi danh lên bảng xếp hạng cao thủ!'
                      : 'Join a PvP match now to carve your name on the leaderboard!')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/?locale=${locale}`)}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer"
              >
                <Swords size={15} />
                <span>{locale === 'vi' ? 'Vào đấu trường ngay' : 'Enter Arena Now'}</span>
              </button>
              {period !== 'all' && (
                <button
                  type="button"
                  onClick={() => setPeriod('all')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition cursor-pointer"
                >
                  <Trophy size={14} className="text-amber-400" />
                  <span>{locale === 'vi' ? 'Xem BXH Tất cả thời gian' : 'View All-Time Ranking'}</span>
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <>
            {/* TOP 3 PODIUM HALL OF FAME */}
            {!cleanQuery && top1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 lg:gap-4 pt-0 pb-1 items-end w-full">

                {/* RANK 2 - SILVER PODIUM (RUNNER UP) */}
                {top2 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.35 }}
                    className="order-2 md:order-1 relative rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-center flex flex-col items-center bg-gradient-to-b from-slate-800/40 via-slate-900/90 to-slate-950 backdrop-blur-xl border border-slate-400/30 shadow-[0_8px_25px_-8px_rgba(203,213,225,0.15)] ring-1 ring-white/5 hover:border-slate-300/60 transition-all duration-300 group"
                  >
                    {/* Ambient light glow behind avatar */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-24 bg-slate-300/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Avatar with Silver Ring & Medal */}
                    <div className="relative mb-1.5 flex flex-col items-center">
                      <div className="relative">
                        <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-slate-400 via-zinc-100 to-slate-500 shadow-lg shadow-slate-400/20 ring-2 ring-slate-400/20">
                          {top2.avatar ? (
                            <img
                              src={top2.avatar}
                              alt={top2.username}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-800 flex items-center justify-center font-black text-sm sm:text-base text-slate-200">
                              {top2.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="absolute -bottom-1.5 right-1/2 translate-x-1/2 bg-gradient-to-r from-slate-200 via-zinc-100 to-slate-300 text-slate-950 font-black text-[10px] leading-none px-2 py-0.5 rounded-full border border-white shadow-md flex items-center gap-0.5 whitespace-nowrap">
                          🥈 #2 {locale === 'vi' ? 'Á Quân' : 'Runner-Up'}
                        </span>
                      </div>
                    </div>

                    {/* Username & Rank */}
                    <h3 className="font-extrabold text-sm sm:text-base leading-tight text-white mt-0.5 mb-1 truncate max-w-full">
                      {top2.username}
                    </h3>
                    <div className="mb-1.5 flex flex-wrap items-center justify-center gap-1">
                      <RankBadge tier={getRankByRating(top2.rating)} locale={locale} size="sm" />
                      {top2.equippedTitle && (
                        <EquippedTitleBadge title={top2.equippedTitle} locale={locale} size="xs" />
                      )}
                    </div>

                    {/* Stats Grid 2x2 */}
                    <div className="w-full grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-700/50 text-left">
                      {/* Rating */}
                      <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-700/60 flex flex-col justify-between">
                        <span className="text-[9px] sm:text-[10px] leading-tight text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Trophy size={10} className="text-slate-300 shrink-0" />
                          Rating
                        </span>
                        <div className="mt-0.5 flex items-baseline justify-between gap-1">
                          <span className="text-sm sm:text-base font-black font-mono text-slate-100 leading-none">
                            {top2.rating}
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">
                            Peak {top2.highestRating || top2.rating}
                          </span>
                        </div>
                      </div>

                      {/* Win Rate */}
                      <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-700/60 flex flex-col justify-between">
                        <span className="text-[9px] sm:text-[10px] leading-tight text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp size={10} className="text-emerald-400 shrink-0" />
                          {locale === 'vi' ? 'Tỷ lệ thắng' : 'Win Rate'}
                        </span>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="text-sm sm:text-base font-black font-mono text-emerald-400 leading-none">
                            {top2.winRate}%
                          </span>
                          <div className="flex-1 bg-slate-800 h-1 rounded-full overflow-hidden max-w-[60px]">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                              style={{ width: `${top2.winRate}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Matches */}
                      <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-700/60 flex flex-col justify-between">
                        <span className="text-[9px] sm:text-[10px] leading-tight text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Swords size={10} className="text-slate-300 shrink-0" />
                          {locale === 'vi' ? 'Trận đấu' : 'Matches'}
                        </span>
                        <div className="mt-0.5 flex items-center gap-1 font-mono font-bold text-[11px] leading-none">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {top2.wins}W
                          </span>
                          <span className="text-slate-600 font-light">-</span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            {top2.losses}L
                          </span>
                        </div>
                      </div>

                      {/* Streak */}
                      <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-700/60 flex flex-col justify-between">
                        <span className="text-[9px] sm:text-[10px] leading-tight text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Flame size={10} className="text-orange-400 shrink-0" />
                          {locale === 'vi' ? 'Chuỗi thắng' : 'Streak'}
                        </span>
                        <div className="mt-0.5 flex items-baseline justify-between gap-1">
                          <span className="text-sm sm:text-base font-black font-mono text-orange-400 leading-none">
                            {top2.currentWinStreak || 0}🔥
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">
                            Max {top2.bestWinStreak || top2.currentWinStreak || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="order-2 md:order-1 rounded-2xl px-4 py-6 text-center flex flex-col items-center justify-center bg-slate-900/20 border border-dashed border-slate-800/80 min-h-[210px]">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-2">
                      🥈
                    </div>
                    <span className="text-xs font-bold text-slate-400 mb-1">
                      #2 {locale === 'vi' ? 'Á Quân đang bỏ trống' : 'Runner-Up Slot Open'}
                    </span>
                    <p className="text-[11px] text-slate-600 max-w-[200px]">
                      {locale === 'vi' ? 'Tham gia đấu PvP ngay để chiếm vị trí này!' : 'Play a PvP match now to claim this spot!'}
                    </p>
                  </div>
                )}

                {/* RANK 1 - GOLD PODIUM (CHAMPION - MOST PROMINENT) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="order-1 md:order-2 relative rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5 text-center flex flex-col items-center bg-gradient-to-b from-amber-950/30 via-slate-900/90 to-slate-950 backdrop-blur-xl border-2 border-amber-400/70 shadow-[0_10px_35px_-10px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/25 md:-translate-y-1.5 z-10 hover:border-amber-300 transition-all duration-300 group"
                >
                  {/* Glowing halo behind avatar */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-28 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

                  {/* Crown + Avatar with Radiant Gold Frame */}
                  <div className="relative mb-1.5 flex flex-col items-center">
                    {/* Crown sitting proudly atop the avatar */}
                    <div className="text-amber-400 mb-0.5 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse">
                      <Crown size={18} className="fill-amber-400" />
                    </div>

                    <div className="relative">
                      <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 shadow-xl shadow-amber-500/30 ring-2 ring-amber-400/30">
                        {top1.avatar ? (
                          <img
                            src={top1.avatar}
                            alt={top1.username}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-600 to-yellow-700 flex items-center justify-center font-black text-base sm:text-lg text-amber-100">
                            {top1.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="absolute -bottom-1.5 right-1/2 translate-x-1/2 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-[10px] leading-none px-2.5 py-0.5 rounded-full border border-yellow-100 shadow-lg flex items-center gap-0.5 whitespace-nowrap">
                        #1 {locale === 'vi' ? 'QUÁN QUÂN' : 'CHAMPION'}
                      </span>
                    </div>
                  </div>

                  {/* Username & Rank */}
                  <h3 className="font-black text-base sm:text-lg leading-tight text-white mt-0.5 mb-1 truncate max-w-full drop-shadow-md">
                    {top1.username}
                  </h3>
                  <div className="mb-1.5 flex flex-wrap items-center justify-center gap-1">
                    <RankBadge tier={getRankByRating(top1.rating)} locale={locale} size="sm" />
                    {top1.equippedTitle && (
                      <EquippedTitleBadge title={top1.equippedTitle} locale={locale} size="xs" />
                    )}
                  </div>

                  {/* Stats Grid 2x2 */}
                  <div className="w-full grid grid-cols-2 gap-1.5 pt-2 border-t border-amber-500/25 text-left">
                    {/* Rating */}
                    <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-amber-500/35 shadow-inner flex flex-col justify-between">
                      <span className="text-[9px] sm:text-[10px] leading-tight text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Trophy size={10} className="text-amber-400 shrink-0" />
                        Rating
                      </span>
                      <div className="mt-0.5 flex items-baseline justify-between gap-1">
                        <span className="text-base sm:text-lg font-black font-mono text-yellow-300 leading-none">
                          {top1.rating}
                        </span>
                        <span className="text-[9px] text-amber-200/60 font-semibold whitespace-nowrap">
                          Peak {top1.highestRating || top1.rating}
                        </span>
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-amber-500/35 shadow-inner flex flex-col justify-between">
                      <span className="text-[9px] sm:text-[10px] leading-tight text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp size={10} className="text-emerald-400 shrink-0" />
                        {locale === 'vi' ? 'Tỷ lệ thắng' : 'Win Rate'}
                      </span>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="text-base sm:text-lg font-black font-mono text-emerald-400 leading-none">
                          {top1.winRate}%
                        </span>
                        <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden max-w-[65px]">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-yellow-400 rounded-full"
                            style={{ width: `${top1.winRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Matches */}
                    <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-amber-500/35 shadow-inner flex flex-col justify-between">
                      <span className="text-[9px] sm:text-[10px] leading-tight text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Swords size={10} className="text-amber-400 shrink-0" />
                        {locale === 'vi' ? 'Trận đấu' : 'Matches'}
                      </span>
                      <div className="mt-0.5 flex items-center gap-1 font-mono font-bold text-[11px] leading-none">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                          {top1.wins}W
                        </span>
                        <span className="text-slate-600 font-light">-</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40">
                          {top1.losses}L
                        </span>
                      </div>
                    </div>

                    {/* Streak */}
                    <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-amber-500/35 shadow-inner flex flex-col justify-between">
                      <span className="text-[9px] sm:text-[10px] leading-tight text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Flame size={10} className="text-orange-400 shrink-0" />
                        {locale === 'vi' ? 'Chuỗi thắng' : 'Streak'}
                      </span>
                      <div className="mt-0.5 flex items-baseline justify-between gap-1">
                        <span className="text-base sm:text-lg font-black font-mono text-orange-400 leading-none">
                          {top1.currentWinStreak || 0}🔥
                        </span>
                        <span className="text-[9px] text-amber-200/60 font-semibold whitespace-nowrap">
                          Max {top1.bestWinStreak || top1.currentWinStreak || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* RANK 3 - BRONZE PODIUM (THIRD PLACE) */}
                {top3 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.35 }}
                    className="order-3 relative rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-center flex flex-col items-center bg-gradient-to-b from-amber-950/20 via-slate-900/90 to-slate-950 backdrop-blur-xl border border-amber-700/40 shadow-[0_8px_25px_-8px_rgba(217,119,6,0.15)] ring-1 ring-amber-700/15 hover:border-amber-600/60 transition-all duration-300 group"
                  >
                    {/* Ambient light glow behind avatar */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-24 bg-amber-700/10 rounded-full blur-2xl pointer-events-none" />

                    {/* Avatar with Bronze Ring & Medal */}
                    <div className="relative mb-1.5 flex flex-col items-center">
                      <div className="relative">
                        <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-amber-800 via-amber-500 to-orange-700 shadow-lg shadow-amber-800/20 ring-2 ring-amber-700/20">
                          {top3.avatar ? (
                            <img
                              src={top3.avatar}
                              alt={top3.username}
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-950 flex items-center justify-center font-black text-sm sm:text-base text-amber-200">
                              {top3.username.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span className="absolute -bottom-1.5 right-1/2 translate-x-1/2 bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800 text-amber-50 font-black text-[10px] leading-none px-2 py-0.5 rounded-full border border-amber-500/50 shadow-md flex items-center gap-0.5 whitespace-nowrap">
                          🥉 #3 {locale === 'vi' ? 'Quý Quân' : '3rd Place'}
                        </span>
                      </div>
                    </div>

                    {/* Username & Rank */}
                    <h3 className="font-extrabold text-sm sm:text-base leading-tight text-white mt-0.5 mb-1 truncate max-w-full">
                      {top3.username}
                    </h3>
                    <div className="mb-1.5 flex flex-wrap items-center justify-center gap-1">
                      <RankBadge tier={getRankByRating(top3.rating)} locale={locale} size="sm" />
                      {top3.equippedTitle && (
                        <EquippedTitleBadge title={top3.equippedTitle} locale={locale} size="xs" />
                      )}
                    </div>

                    {/* Stats Grid 2x2 */}
                    <div className="w-full grid grid-cols-2 gap-1.5 pt-2 border-t border-amber-800/30 text-left">
                      {/* Rating */}
                      <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-amber-800/40 flex flex-col justify-between">
                        <span className="text-[9px] sm:text-[10px] leading-tight text-amber-400/80 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Trophy size={10} className="text-amber-500 shrink-0" />
                          Rating
                        </span>
                        <div className="mt-0.5 flex items-baseline justify-between gap-1">
                          <span className="text-sm sm:text-base font-black font-mono text-amber-200 leading-none">
                            {top3.rating}
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">
                            Peak {top3.highestRating || top3.rating}
                          </span>
                        </div>
                      </div>

                      {/* Win Rate */}
                      <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-amber-800/40 flex flex-col justify-between">
                        <span className="text-[9px] sm:text-[10px] leading-tight text-amber-400/80 font-bold uppercase tracking-wider flex items-center gap-1">
                          <TrendingUp size={10} className="text-emerald-400 shrink-0" />
                          {locale === 'vi' ? 'Tỷ lệ thắng' : 'Win Rate'}
                        </span>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="text-sm sm:text-base font-black font-mono text-emerald-400 leading-none">
                            {top3.winRate}%
                          </span>
                          <div className="flex-1 bg-slate-800 h-1 rounded-full overflow-hidden max-w-[60px]">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-amber-600 rounded-full"
                              style={{ width: `${top3.winRate}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Matches */}
                      <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-amber-800/40 flex flex-col justify-between">
                        <span className="text-[9px] sm:text-[10px] leading-tight text-amber-400/80 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Swords size={10} className="text-amber-500 shrink-0" />
                          {locale === 'vi' ? 'Trận đấu' : 'Matches'}
                        </span>
                        <div className="mt-0.5 flex items-center gap-1 font-mono font-bold text-[11px] leading-none">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {top3.wins}W
                          </span>
                          <span className="text-slate-600 font-light">-</span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            {top3.losses}L
                          </span>
                        </div>
                      </div>

                      {/* Streak */}
                      <div className="bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-amber-800/40 flex flex-col justify-between">
                        <span className="text-[9px] sm:text-[10px] leading-tight text-amber-400/80 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Flame size={10} className="text-orange-400 shrink-0" />
                          {locale === 'vi' ? 'Chuỗi thắng' : 'Streak'}
                        </span>
                        <div className="mt-0.5 flex items-baseline justify-between gap-1">
                          <span className="text-sm sm:text-base font-black font-mono text-orange-400 leading-none">
                            {top3.currentWinStreak || 0}🔥
                          </span>
                          <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">
                            Max {top3.bestWinStreak || top3.currentWinStreak || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="order-3 rounded-2xl px-4 py-6 text-center flex flex-col items-center justify-center bg-slate-900/20 border border-dashed border-slate-800/80 min-h-[210px]">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-2">
                      🥉
                    </div>
                    <span className="text-xs font-bold text-slate-400 mb-1">
                      #3 {locale === 'vi' ? 'Quý Quân đang bỏ trống' : '3rd Place Slot Open'}
                    </span>
                    <p className="text-[11px] text-slate-600 max-w-[200px]">
                      {locale === 'vi' ? 'Tham gia đấu PvP ngay để chiếm vị trí này!' : 'Play a PvP match now to claim this spot!'}
                    </p>
                  </div>
                )}

              </div>
            )}

            {/* RANK TABLE / EMPTY STATE */}
            {tableDisplayList.length === 0 && cleanQuery ? (
              <div className="py-16 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-2">
                <Search size={28} className="mx-auto text-slate-600 mb-1" />
                <p className="text-slate-300 font-bold text-sm">
                  {locale === 'vi' ? 'Không tìm thấy người chơi' : 'No players found'}
                </p>
                <p className="text-slate-500 text-xs">
                  {locale === 'vi'
                    ? `Không có kết quả nào khớp với "${searchQuery}"`
                    : `No matching players found for "${searchQuery}"`}
                </p>
              </div>
            ) : tableDisplayList.length === 0 ? (
              <div className="py-6 px-4 text-center bg-slate-900/30 border border-slate-800/60 rounded-2xl">
                <p className="text-slate-400 text-xs font-medium">
                  {locale === 'vi'
                    ? 'Toàn bộ cao thủ của kỳ này đều đã góp mặt trên Bục Vinh Danh Top 3 phía trên.'
                    : 'All ranked players for this period are featured on the Top 3 Podium above.'}
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center space-x-2">
                    <Medal size={16} className="text-amber-400" />
                    <span>{locale === 'vi' ? 'DANH SÁCH BẢNG XẾP HẠNG' : 'RANKING LIST'}</span>
                  </h2>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {tableDisplayList.length} {locale === 'vi' ? 'người chơi' : 'players'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 text-center">{locale === 'vi' ? 'HẠNG' : 'RANK'}</th>
                        <th className="py-3 px-4">{locale === 'vi' ? 'NGƯỜI CHƠI' : 'PLAYER'}</th>
                        <th className="py-3 px-4 text-center">{locale === 'vi' ? 'THẮNG / THUA' : 'W / L'}</th>
                        <th className="py-3 px-4 text-center">{locale === 'vi' ? 'TỶ LỆ THẮNG' : 'WIN RATE'}</th>
                        <th className="py-3 px-4 text-right">{locale === 'vi' ? 'RATING / ĐỈNH' : 'RATING / PEAK'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-805">
                      {tableDisplayList.map((item) => (
                        <tr key={item.userId} className="hover:bg-slate-800/40 transition duration-150">
                          <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sm whitespace-nowrap">
                            {item.rank === 1 ? <span className="text-amber-400">#1</span> :
                             item.rank === 2 ? <span className="text-slate-300">#2</span> :
                             item.rank === 3 ? <span className="text-amber-600">#3</span> :
                             <span className="text-slate-500">#{item.rank}</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              {item.avatar ? (
                                <img src={item.avatar} alt={item.username} className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                                  {item.username.slice(0, 1)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-white text-xs truncate">{item.username}</p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                  <RankBadge tier={getRankByRating(item.rating)} locale={locale} size="sm" />
                                  {item.equippedTitle && (
                                    <EquippedTitleBadge title={item.equippedTitle} locale={locale} size="xs" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-xs whitespace-nowrap">
                            <span className="text-emerald-400">{item.wins}W</span>
                            <span className="mx-1 text-slate-600 font-normal">-</span>
                            <span className="text-rose-400">{item.losses}L</span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                <div className="bg-gradient-to-r from-purple-500 to-amber-400 h-full rounded-full" style={{ width: `${item.winRate}%` }} />
                              </div>
                              <span className="font-mono font-bold text-amber-300">{item.winRate}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-xs whitespace-nowrap">
                            <div className="font-extrabold text-amber-400 text-sm">{item.rating} Rating</div>
                            <div className="text-[10px] text-slate-500 font-medium">Peak: {item.highestRating || item.rating}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LeaderboardPageContent />
    </Suspense>
  );
}
