'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Crown, Users, ChevronDown, Clock, Search, Shield, Award } from 'lucide-react';
import { getGameApiUrl, getMainSiteUrl, navigateTopWindow } from '@/features/game/utils';
import { RankBadge } from '@/features/game/components/common/RankBadge';
import { getRankByRating } from '@/features/game/ranks';

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
      const apiBase = process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3001/api' : 'https://server-nextjs-firm.onrender.com/api');

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
        const response = await fetch(getGameApiUrl('/api/leaderboard?limit=100'));
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
  }, [locale]);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white font-sans flex flex-col max-w-full overflow-y-auto no-scrollbar">
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
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-6 space-y-6">

        {/* Top Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-3 sm:p-4 rounded-2xl">
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850 w-full sm:w-auto">
            <button
              type="button"
              className="flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 shadow-md cursor-default"
            >
              {locale === 'vi' ? 'Tất cả thời gian' : 'All Time'}
            </button>
            <button
              type="button"
              disabled
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 bg-slate-900/40 cursor-not-allowed flex items-center justify-center gap-1 opacity-70"
              title={locale === 'vi' ? 'Lọc theo tháng (Sắp ra mắt Mùa 1)' : 'Monthly filter (Coming soon in Season 1)'}
            >
              <span>{locale === 'vi' ? 'Tháng này' : 'Monthly'}</span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono">
                {locale === 'vi' ? 'Sắp có' : 'Soon'}
              </span>
            </button>
            <button
              type="button"
              disabled
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 bg-slate-900/40 cursor-not-allowed flex items-center justify-center gap-1 opacity-70"
              title={locale === 'vi' ? 'Lọc theo tuần (Sắp ra mắt Mùa 1)' : 'Weekly filter (Coming soon in Season 1)'}
            >
              <span>{locale === 'vi' ? 'Tuần này' : 'Weekly'}</span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono">
                {locale === 'vi' ? 'Sắp có' : 'Soon'}
              </span>
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
          <div className="py-16 text-center text-slate-500 font-medium text-xs bg-slate-900/40 border border-slate-800 rounded-2xl">
            {locale === 'vi' ? 'Chưa có cao thủ nào trên bảng xếp hạng.' : 'No players on the leaderboard yet.'}
          </div>
        ) : (
          <>
            {/* TOP 3 PODIUM HALL OF FAME */}
            {!cleanQuery && top1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 pb-4 items-end">

                {/* RANK 2 - SILVER PODIUM (RUNNER UP) */}
                {top2 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="order-2 md:order-1 bg-gradient-to-b from-slate-400/20 via-slate-900/90 to-slate-950 backdrop-blur-md border-2 border-slate-300/80 p-5 sm:p-6 rounded-3xl shadow-[0_0_25px_rgba(203,213,225,0.25)] ring-1 ring-slate-300/40 md:-translate-y-2 text-center flex flex-col items-center relative overflow-hidden group hover:border-slate-200 transition duration-300"
                  >
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-slate-300 via-zinc-200 to-slate-400" />
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-28 h-28 bg-slate-300/15 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative mb-3.5">
                      {top2.avatar ? (
                        <img src={top2.avatar} alt={top2.username} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 border-slate-300 object-cover shadow-xl ring-4 ring-slate-300/20" />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 border-slate-300 bg-slate-800 flex items-center justify-center font-bold text-xl text-slate-200 ring-4 ring-slate-300/20">
                          {top2.username.slice(0, 2)}
                        </div>
                      )}
                      <span className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-gradient-to-r from-slate-300 to-zinc-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full border border-white shadow-md flex items-center gap-0.5 whitespace-nowrap">
                        🥈 #2
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-white mb-1">{top2.username}</h3>
                    <div className="mb-3">
                      <RankBadge tier={getRankByRating(top2.rating)} locale={locale} size="sm" />
                    </div>

                    <div className="w-full bg-slate-950/85 p-3 rounded-2xl border border-slate-800/90 space-y-1.5 text-xs shadow-inner">
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{locale === 'vi' ? 'Thắng / Thua:' : 'Wins / Losses:'}</span>
                        <strong className="font-mono">
                          <span className="text-emerald-400">{top2.wins}W</span>
                          <span className="mx-1 text-slate-600 font-normal">-</span>
                          <span className="text-rose-400">{top2.losses}L</span>
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{locale === 'vi' ? 'Tỷ lệ thắng:' : 'Win Rate:'}</span>
                        <strong className="text-slate-200 font-mono font-bold">{top2.winRate}%</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{locale === 'vi' ? 'Điểm Rating:' : 'Rating:'}</span>
                        <strong className="text-slate-100 font-mono font-extrabold text-sm">{top2.rating}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{locale === 'vi' ? 'Rating cao nhất:' : 'Peak Rating:'}</span>
                        <strong className="text-slate-300 font-mono font-bold">{top2.highestRating || top2.rating}</strong>
                      </div>
                    </div>
                  </motion.div>
                ) : <div className="order-2 md:order-1" />}

                {/* RANK 1 - GOLD PODIUM (CHAMPION - TALLEST & MOST PROMINENT) */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="order-1 md:order-2 bg-gradient-to-b from-amber-500/25 via-yellow-950/40 to-slate-950 backdrop-blur-md border-2 border-amber-400/90 p-6 sm:p-7 rounded-3xl shadow-[0_0_35px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/60 md:-translate-y-6 text-center flex flex-col items-center relative overflow-hidden group hover:border-amber-300 transition duration-300"
                >
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-36 bg-amber-400/25 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative mb-4">
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber-400 animate-bounce">
                      <Crown size={26} className="fill-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                    </div>
                    {top1.avatar ? (
                      <img src={top1.avatar} alt={top1.username} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-amber-400 object-cover shadow-2xl ring-4 ring-amber-400/30" />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-amber-400 bg-amber-600/40 flex items-center justify-center font-black text-2xl text-amber-300 ring-4 ring-amber-400/30">
                        {top1.username.slice(0, 2)}
                      </div>
                    )}
                    <span className="absolute -bottom-2.5 right-1/2 translate-x-1/2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs px-3 py-0.5 rounded-full border border-white shadow-xl flex items-center gap-1 whitespace-nowrap">
                      👑 #1
                    </span>
                  </div>

                  <h3 className="font-black text-base sm:text-lg text-white mb-1">{top1.username}</h3>
                  <div className="mb-3.5">
                    <RankBadge tier={getRankByRating(top1.rating)} locale={locale} size="md" />
                  </div>

                  <div className="w-full bg-slate-950/90 p-3.5 rounded-2xl border border-amber-500/40 space-y-1.5 text-xs shadow-inner">
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>{locale === 'vi' ? 'Thắng / Thua:' : 'Wins / Losses:'}</span>
                      <strong className="font-mono">
                        <span className="text-emerald-400">{top1.wins}W</span>
                        <span className="mx-1 text-slate-600 font-normal">-</span>
                        <span className="text-rose-400">{top1.losses}L</span>
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>{locale === 'vi' ? 'Tỷ lệ thắng:' : 'Win Rate:'}</span>
                      <strong className="text-amber-400 font-mono font-bold">{top1.winRate}%</strong>
                    </div>
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>{locale === 'vi' ? 'Điểm Rating:' : 'Rating:'}</span>
                      <strong className="text-yellow-400 font-mono font-black text-base">{top1.rating}</strong>
                    </div>
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>{locale === 'vi' ? 'Rating cao nhất:' : 'Peak Rating:'}</span>
                      <strong className="text-amber-300 font-mono font-bold">{top1.highestRating || top1.rating}</strong>
                    </div>
                  </div>
                </motion.div>

                {/* RANK 3 - BRONZE PODIUM (THIRD PLACE) */}
                {top3 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="order-3 bg-gradient-to-b from-amber-950/40 via-amber-900/20 to-slate-950 backdrop-blur-md border-2 border-amber-700/80 p-5 rounded-3xl shadow-[0_0_18px_rgba(217,119,6,0.2)] ring-1 ring-amber-700/40 text-center flex flex-col items-center relative overflow-hidden group hover:border-amber-600 transition duration-300"
                  >
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-700 via-orange-600 to-amber-800" />
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 bg-amber-700/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="relative mb-3.5">
                      {top3.avatar ? (
                        <img src={top3.avatar} alt={top3.username} className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-3 border-amber-700 object-cover shadow-lg ring-4 ring-amber-700/20" />
                      ) : (
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-3 border-amber-700 bg-amber-950 flex items-center justify-center font-bold text-lg text-amber-300 ring-4 ring-amber-700/20">
                          {top3.username.slice(0, 2)}
                        </div>
                      )}
                      <span className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-gradient-to-r from-amber-700 to-orange-800 text-amber-100 font-black text-xs px-2.5 py-0.5 rounded-full border border-amber-500/40 shadow-md flex items-center gap-0.5 whitespace-nowrap">
                        🥉 #3
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm sm:text-base text-white mb-1">{top3.username}</h3>
                    <div className="mb-3">
                      <RankBadge tier={getRankByRating(top3.rating)} locale={locale} size="sm" />
                    </div>

                    <div className="w-full bg-slate-950/85 p-3 rounded-2xl border border-slate-800/90 space-y-1.5 text-xs shadow-inner">
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{locale === 'vi' ? 'Thắng / Thua:' : 'Wins / Losses:'}</span>
                        <strong className="font-mono">
                          <span className="text-emerald-400">{top3.wins}W</span>
                          <span className="mx-1 text-slate-600 font-normal">-</span>
                          <span className="text-rose-400">{top3.losses}L</span>
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{locale === 'vi' ? 'Tỷ lệ thắng:' : 'Win Rate:'}</span>
                        <strong className="text-slate-300 font-mono font-bold">{top3.winRate}%</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{locale === 'vi' ? 'Điểm Rating:' : 'Rating:'}</span>
                        <strong className="text-amber-400 font-mono font-extrabold text-sm">{top3.rating}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{locale === 'vi' ? 'Rating cao nhất:' : 'Peak Rating:'}</span>
                        <strong className="text-yellow-300 font-mono font-bold">{top3.highestRating || top3.rating}</strong>
                      </div>
                    </div>
                  </motion.div>
                ) : <div className="order-3" />}

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
                                <div className="mt-0.5">
                                  <RankBadge tier={getRankByRating(item.rating)} locale={locale} size="sm" />
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
