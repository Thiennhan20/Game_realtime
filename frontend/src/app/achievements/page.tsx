'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Award,
  ChevronDown,
  Clock,
  Lock,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { getGameApiUrl, getMainSiteUrl, navigateTopWindow } from '@/features/game/utils';

interface Achievement {
  id: string;
  category: 'pve' | 'pvp' | 'general';
  icon: string;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  target: number;
  progress: number;
  percentage: number;
  isUnlocked: boolean;
}

interface AchievementsResponse {
  achievements: Achievement[];
  summary: {
    unlockedCount: number;
    totalCount: number;
    overallPercentage: number;
  };
}

function AchievementsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<'en' | 'vi'>('en');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [summary, setSummary] = useState({ unlockedCount: 0, totalCount: 0, overallPercentage: 0 });
  const [filterCategory, setFilterCategory] = useState<'all' | 'pve' | 'pvp' | 'unlocked'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const queryLocale = searchParams.get('locale');
      if (queryLocale === 'vi' || queryLocale === 'en') {
        setLocale(queryLocale);
        localStorage.setItem('game_locale', queryLocale);
      } else {
        const storedLocale = localStorage.getItem('game_locale');
        if (storedLocale === 'vi' || storedLocale === 'en') {
          setLocale(storedLocale);
        } else if (navigator.language.toLowerCase().includes('vi')) {
          setLocale('vi');
        }
      }
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [searchParams]);

  const toggleLocale = (selectedLocale: 'en' | 'vi') => {
    setLocale(selectedLocale);
    localStorage.setItem('game_locale', selectedLocale);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError(locale === 'vi' ? 'Bạn cần đăng nhập trước.' : 'Authentication required.');
        setLoading(false);
        return;
      }

      try {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1');
        const apiBase = process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3001/api' : 'https://server-nextjs-firm.onrender.com/api');
        
        const profileRes = await fetch(`${apiBase}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setUserProfile({
            name: profileData.user.name || profileData.user.username || 'User',
            avatar: profileData.user.avatar || ''
          });
        }

        const res = await fetch(getGameApiUrl('/api/achievements'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch achievements');

        const data = (await res.json()) as AchievementsResponse;
        setAchievements(data.achievements || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      } catch (err: unknown) {
        console.error('Error fetching achievements:', err);
        setError(locale === 'vi' ? 'Không thể tải danh sách thành tích.' : 'Failed to load achievements.');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [locale]);

  const filteredAchievements = achievements.filter(item => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'unlocked') return item.isUnlocked;
    if (filterCategory === 'pve') return item.category === 'pve';
    if (filterCategory === 'pvp') return item.category === 'pvp';
    return true;
  });

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white font-sans flex flex-col">
      {/* Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl">
        <div className="max-w-[1700px] w-full mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push(`/?locale=${locale}`)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center shrink-0"
              title={locale === 'vi' ? 'Quay lại game' : 'Back to game'}
            >
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            <div className="hidden xs:block p-2 sm:p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0">
              <Award size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="font-extrabold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 text-transparent bg-clip-text">
                {locale === 'vi' ? 'THÀNH TÍCH & DANH HIỆU' : 'ACHIEVEMENTS & BADGES'}
              </h1>
              <p className="hidden sm:block text-xs text-slate-400">
                {locale === 'vi' ? 'Bộ sưu tập danh hiệu chơi với máy & Đấu trường PvP' : 'Badge collection for PvE and PvP matches'}
              </p>
            </div>
          </div>

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
                  <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl py-2 z-50">
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
                      <Clock size={14} className="text-cyan-400" />
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
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 pt-16 sm:pt-20 space-y-6">
        {/* Hero Progress Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-slate-950 border border-emerald-500/30 p-5 sm:p-6 rounded-3xl shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <Sparkles size={14} />
                <span>{locale === 'vi' ? 'Tiến độ Danh hiệu' : 'Badge Collection'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {locale === 'vi' ? 'DANH HIỆU ĐÃ ĐẠT DƯỢC' : 'UNLOCKED ACHIEVEMENTS'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                {locale === 'vi'
                  ? 'Hoàn thành các thử thách đấu với Máy và người chơi khác để nhận Danh hiệu độc quyền!'
                  : 'Complete PvE and PvP challenges to unlock exclusive badges and titles!'}
              </p>
            </div>

            <div className="w-full md:w-72 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-center space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">{locale === 'vi' ? 'Đã mở khóa:' : 'Unlocked:'}</span>
                <span className="text-emerald-400 font-mono text-base">{summary.unlockedCount} / {summary.totalCount}</span>
              </div>
              
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.overallPercentage}%` }}
                />
              </div>

              <div className="text-[11px] font-bold text-slate-500">
                {summary.overallPercentage}% {locale === 'vi' ? 'Hoàn thành' : 'Completed'}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Categories */}
        <div className="flex items-center gap-2 p-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🎮</span>
            <span>{locale === 'vi' ? 'Tất cả' : 'All'}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('pve')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'pve'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🤖</span>
            <span>{locale === 'vi' ? 'Chơi Với Máy (PvE)' : 'PvE Bot'}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('pvp')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'pvp'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚔️</span>
            <span>{locale === 'vi' ? 'Đấu Người (PvP)' : 'PvP Arena'}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('unlocked')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              filterCategory === 'unlocked'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🔓</span>
            <span>{locale === 'vi' ? 'Đã Đạt' : 'Unlocked'}</span>
          </button>
        </div>

        {/* Achievements Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-xs font-medium">{locale === 'vi' ? 'Đang tải danh sách thành tích...' : 'Loading achievements...'}</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 font-bold text-sm bg-slate-900/40 border border-slate-800 rounded-2xl">
            {error}
          </div>
        ) : filteredAchievements.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-medium text-xs bg-slate-900/40 border border-slate-800 rounded-2xl">
            {locale === 'vi' ? 'Chưa có danh hiệu nào trong danh mục này.' : 'No achievements found in this category.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((item) => {
              const title = locale === 'vi' ? item.titleVi : item.titleEn;
              const desc = locale === 'vi' ? item.descVi : item.descEn;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    item.isUnlocked
                      ? 'bg-gradient-to-b from-slate-900/90 to-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                      : 'bg-slate-900/30 border-slate-800/80 opacity-75'
                  }`}
                >
                  <div>
                    {/* Top Row: Icon & Status Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-4xl p-2.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 shadow-inner">
                        {item.icon}
                      </div>

                      {item.isUnlocked ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold">
                          <ShieldCheck size={12} />
                          <span>{locale === 'vi' ? 'ĐÃ ĐẠT' : 'UNLOCKED'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] font-extrabold">
                          <Lock size={12} />
                          <span>{locale === 'vi' ? 'CHƯA ĐẠT' : 'LOCKED'}</span>
                        </div>
                      )}
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-extrabold text-base text-white mb-1">{title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">{desc}</p>
                  </div>

                  {/* Progress Bar & Counter */}
                  <div className="space-y-1.5 pt-3 border-t border-slate-800/60">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500">{locale === 'vi' ? 'Tiến độ:' : 'Progress:'}</span>
                      <span className={item.isUnlocked ? 'text-emerald-400 font-mono' : 'text-slate-300 font-mono'}>
                        {item.progress} / {item.target}
                      </span>
                    </div>

                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.isUnlocked
                            ? 'bg-emerald-400'
                            : 'bg-purple-500/60'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AchievementsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AchievementsPageContent />
    </Suspense>
  );
}
