'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Award,
  Check,
  ChevronDown,
  Clock,
  Flame,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Timer,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { EquippedTitleBadge } from '@/features/game/components/common/EquippedTitleBadge';
import type { EquippedTitle } from '@/features/game/types';
import { getGameApiUrl, getMainSiteUrl, navigateTopWindow } from '@/features/game/utils';

type RarityTier = 'common' | 'rare' | 'epic' | 'legendary';

interface Achievement {
  id: string;
  category: 'pve' | 'pvp' | 'general' | 'progression';
  rarity?: RarityTier;
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

interface CareerStats {
  level: number;
  totalXp: number;
  totalWins: number;
  pvpWins: number;
  pvpLosses: number;
  aiTotalWins: number;
  bestWinStreak: number;
  highestRating: number;
  bestGuessCount: number | null;
  fastestWinSeconds: number | null;
}

interface AchievementsResponse {
  achievements: Achievement[];
  equippedTitleId?: string | null;
  equippedTitle?: EquippedTitle | null;
  summary: {
    unlockedCount: number;
    totalCount: number;
    overallPercentage: number;
  };
  careerStats?: CareerStats;
}

const RARITY_STYLES: Record<RarityTier, {
  labelVi: string;
  labelEn: string;
  pillClass: string;
  unlockedCardClass: string;
  barClass: string;
  iconBoxClass: string;
}> = {
  common: {
    labelVi: 'Phổ thông',
    labelEn: 'Common',
    pillClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    unlockedCardClass: 'bg-gradient-to-b from-slate-900/90 to-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-950/20',
    barClass: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    iconBoxClass: 'border-emerald-500/30 bg-emerald-950/30'
  },
  rare: {
    labelVi: 'Hiếm',
    labelEn: 'Rare',
    pillClass: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    unlockedCardClass: 'bg-gradient-to-b from-slate-900/90 to-cyan-950/30 border-cyan-500/45 shadow-lg shadow-cyan-950/25',
    barClass: 'bg-gradient-to-r from-cyan-500 to-sky-400',
    iconBoxClass: 'border-cyan-500/30 bg-cyan-950/30'
  },
  epic: {
    labelVi: 'Sử thi',
    labelEn: 'Epic',
    pillClass: 'bg-purple-500/15 border-purple-500/35 text-purple-300',
    unlockedCardClass: 'bg-gradient-to-b from-slate-900/90 to-purple-950/35 border-purple-500/50 shadow-lg shadow-purple-950/30',
    barClass: 'bg-gradient-to-r from-purple-500 to-fuchsia-400',
    iconBoxClass: 'border-purple-500/35 bg-purple-950/30'
  },
  legendary: {
    labelVi: 'Huyền thoại',
    labelEn: 'Legendary',
    pillClass: 'bg-amber-500/20 border-amber-400/45 text-amber-300',
    unlockedCardClass: 'bg-gradient-to-b from-slate-900/90 via-amber-950/20 to-amber-950/40 border-amber-400/60 shadow-xl shadow-amber-950/30 ring-1 ring-amber-400/20',
    barClass: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400',
    iconBoxClass: 'border-amber-400/40 bg-amber-950/35'
  }
};

function AchievementsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<'en' | 'vi'>('en');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [equippedTitleId, setEquippedTitleId] = useState<string | null>(null);
  const [equippedTitle, setEquippedTitle] = useState<EquippedTitle | null>(null);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [summary, setSummary] = useState({ unlockedCount: 0, totalCount: 0, overallPercentage: 0 });
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'pve' | 'pvp' | 'general' | 'progression'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
        // const apiBase = process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3001/api' : 'https://server-nextjs-firm.onrender.com/api'); // Old US Oregon
        const apiBase = process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3001/api' : 'https://server-nextjs-film.onrender.com/api'); // New Singapore
        
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
        setEquippedTitleId(data.equippedTitleId || null);
        setEquippedTitle(data.equippedTitle || null);
        if (data.summary) {
          setSummary(data.summary);
        }
        if (data.careerStats) {
          setCareerStats(data.careerStats);
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

  const handleEquipTitle = async (targetId: string | null) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setEquippingId(targetId || 'unequip');
      const res = await fetch(getGameApiUrl('/api/achievements/equip'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ achievementId: targetId }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        equippedTitleId: string | null;
        equippedTitle: EquippedTitle | null;
      };
      setEquippedTitleId(data.equippedTitleId || null);
      setEquippedTitle(data.equippedTitle || null);

      // Update localStorage game_profile_cache so Lobby reflects immediately
      try {
        const cached = localStorage.getItem('game_profile_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            parsed.equippedTitleId = data.equippedTitleId || null;
            parsed.equippedTitle = data.equippedTitle || null;
            localStorage.setItem('game_profile_cache', JSON.stringify(parsed));
          }
        }
      } catch {
        // Ignore storage error
      }
    } catch (err) {
      console.error('Failed to equip title:', err);
    } finally {
      setEquippingId(null);
    }
  };

  const cleanQuery = searchQuery.trim().toLowerCase();
  const filteredAchievements = useMemo(() => {
    return achievements
      .filter((item) => {
        if (filterCategory !== 'all' && item.category !== filterCategory) return false;
        if (statusFilter === 'unlocked' && !item.isUnlocked) return false;
        if (statusFilter === 'locked' && item.isUnlocked) return false;
        if (cleanQuery) {
          const title = (locale === 'vi' ? item.titleVi : item.titleEn).toLowerCase();
          const desc = (locale === 'vi' ? item.descVi : item.descEn).toLowerCase();
          if (!title.includes(cleanQuery) && !desc.includes(cleanQuery)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
        return b.percentage - a.percentage;
      });
  }, [achievements, filterCategory, statusFilter, cleanQuery, locale]);

  const { pveCount, pvpCount, generalCount, progressionCount } = useMemo(() => {
    let pve = 0;
    let pvp = 0;
    let general = 0;
    let progression = 0;
    for (const item of achievements) {
      if (item.category === 'pve') pve++;
      else if (item.category === 'pvp') pvp++;
      else if (item.category === 'general') general++;
      else if (item.category === 'progression') progression++;
    }
    return { pveCount: pve, pvpCount: pvp, generalCount: general, progressionCount: progression };
  }, [achievements]);

  const lockedCount = useMemo(
    () => Math.max(0, summary.totalCount - summary.unlockedCount),
    [summary.totalCount, summary.unlockedCount]
  );

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white font-sans flex flex-col">
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
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowUserDropdown((isOpen) => !isOpen)}
                  aria-label={userProfile.name}
                  aria-expanded={showUserDropdown}
                  className="flex items-center justify-center bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 p-0.5 sm:py-1.5 sm:px-3 sm:gap-2 rounded-full sm:rounded-xl transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {userProfile.avatar && !avatarError ? (
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.name}
                      onError={() => setAvatarError(true)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-700 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs uppercase text-white shrink-0">
                      {userProfile.name.slice(0, 2)}
                    </div>
                  )}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <span className="font-medium text-sm text-slate-200">
                      {userProfile.name}
                    </span>
                    <ChevronDown size={14} className="text-slate-500" />
                  </div>
                </button>

                {showUserDropdown && (
                  <div
                    role="menu"
                    aria-label="User navigation"
                    className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowUserDropdown(false);
                        navigateTopWindow(getMainSiteUrl('/profile', locale));
                      }}
                      className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-sm font-semibold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                    >
                      <Users size={16} className="text-purple-400" />
                      <span>{locale === 'vi' ? 'Hồ sơ cá nhân' : 'User Profile'}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowUserDropdown(false);
                        router.push(`/history?locale=${locale}`);
                      }}
                      className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-sm font-semibold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                    >
                      <Clock size={16} className="text-cyan-400" />
                      <span>{locale === 'vi' ? 'Lịch sử đấu' : 'Match History'}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowUserDropdown(false);
                        router.push(`/leaderboard?locale=${locale}`);
                      }}
                      className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-sm font-semibold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                    >
                      <Trophy size={16} className="text-amber-400" />
                      <span>{locale === 'vi' ? 'Bảng xếp hạng' : 'Leaderboard'}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowUserDropdown(false);
                        router.push(`/achievements?locale=${locale}`);
                      }}
                      className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-sm font-semibold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                    >
                      <Award size={16} className="text-emerald-400" />
                      <span>{locale === 'vi' ? 'Thành tích' : 'Achievements'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center bg-slate-900/60 border border-slate-800/80 p-0.5 sm:px-3 sm:py-1.5 rounded-full sm:rounded-xl animate-pulse">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-800/80 rounded-full shrink-0" />
                <div className="hidden sm:block w-20 h-3.5 bg-slate-800/80 rounded-md sm:ml-2" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 pt-16 sm:pt-20 pb-24 sm:pb-28 pb-[calc(6rem+env(safe-area-inset-bottom))] space-y-6">
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

              {/* Currently Equipped Title Pill */}
              <div className="pt-1.5 flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="text-[11px] font-bold text-slate-400">
                  {locale === 'vi' ? 'Danh hiệu đang trang bị:' : 'Equipped Title:'}
                </span>
                {equippedTitle ? (
                  <div className="inline-flex items-center gap-1.5">
                    <EquippedTitleBadge title={equippedTitle} locale={locale} size="md" />
                    <button
                      type="button"
                      disabled={equippingId !== null}
                      onClick={() => void handleEquipTitle(null)}
                      title={locale === 'vi' ? 'Tháo danh hiệu' : 'Unequip title'}
                      className="p-1 rounded-full bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs italic text-slate-500">
                    {locale === 'vi'
                      ? 'Chưa trang bị (Chọn 1 danh hiệu đã mở khóa bên dưới)'
                      : 'None equipped (Pick an unlocked badge below)'}
                  </span>
                )}
              </div>
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

          {/* Career Records Overview Strip */}
          {careerStats && (
            <div className="relative mt-5 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl px-3.5 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap size={12} className="text-purple-400 shrink-0" />
                  {locale === 'vi' ? 'Cấp độ & XP' : 'Level & XP'}
                </span>
                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="text-base sm:text-lg font-black font-mono text-purple-300">
                    Lv.{careerStats.level}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {careerStats.totalXp} XP
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl px-3.5 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Swords size={12} className="text-emerald-400 shrink-0" />
                  {locale === 'vi' ? 'Tổng trận thắng' : 'Total Wins'}
                </span>
                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                    {careerStats.totalWins}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {careerStats.pvpWins} PvP • {careerStats.aiTotalWins} AI
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl px-3.5 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Trophy size={12} className="text-amber-400 shrink-0" />
                  {locale === 'vi' ? 'Đỉnh Rating' : 'Peak Rating'}
                </span>
                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="text-base sm:text-lg font-black font-mono text-amber-300">
                    {careerStats.highestRating}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    PvP Elo
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl px-3.5 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Flame size={12} className="text-orange-400 shrink-0" />
                  {locale === 'vi' ? 'Chuỗi thắng đỉnh' : 'Best Streak'}
                </span>
                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="text-base sm:text-lg font-black font-mono text-orange-400">
                    {careerStats.bestWinStreak}🔥
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {locale === 'vi' ? 'Liên tiếp' : 'In a row'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl px-3.5 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Target size={12} className="text-cyan-400 shrink-0" />
                  {locale === 'vi' ? 'Đoán ít lượt nhất' : 'Best Guess'}
                </span>
                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="text-base sm:text-lg font-black font-mono text-cyan-300">
                    {careerStats.bestGuessCount !== null
                      ? `${careerStats.bestGuessCount} ${locale === 'vi' ? 'lượt' : 'turns'}`
                      : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {locale === 'vi' ? 'Kỷ lục' : 'Record'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl px-3.5 py-2.5 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Timer size={12} className="text-rose-400 shrink-0" />
                  {locale === 'vi' ? 'Thắng nhanh nhất' : 'Fastest Win'}
                </span>
                <div className="mt-1 flex items-baseline justify-between gap-1">
                  <span className="text-base sm:text-lg font-black font-mono text-rose-300">
                    {careerStats.fastestWinSeconds !== null
                      ? `${careerStats.fastestWinSeconds}s`
                      : '—'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {locale === 'vi' ? 'Tốc độ' : 'Speed'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filter Categories + Status + Search Bar */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-3 rounded-2xl">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <span>🎮</span>
              <span>{locale === 'vi' ? 'Tất cả' : 'All'}</span>
              <span className="text-[10px] opacity-75 font-mono">({achievements.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('pve')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'pve'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <span>🤖</span>
              <span>{locale === 'vi' ? 'Chơi Với Máy' : 'PvE Bot'}</span>
              <span className="text-[10px] opacity-75 font-mono">({pveCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('pvp')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'pvp'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <span>⚔️</span>
              <span>{locale === 'vi' ? 'Đấu Người (PvP)' : 'PvP Arena'}</span>
              <span className="text-[10px] opacity-75 font-mono">({pvpCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('general')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'general'
                  ? 'bg-fuchsia-500 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <span>⚡</span>
              <span>{locale === 'vi' ? 'Kỹ Năng & Đột Biến' : 'Mastery'}</span>
              <span className="text-[10px] opacity-75 font-mono">({generalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterCategory('progression')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                filterCategory === 'progression'
                  ? 'bg-orange-500 text-slate-950 shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/80'
              }`}
            >
              <span>🌟</span>
              <span>{locale === 'vi' ? 'Cấp Độ & Chuỗi Thắng' : 'Progression'}</span>
              <span className="text-[10px] opacity-75 font-mono">({progressionCount})</span>
            </button>
          </div>

          {/* Right Side: Status Filter + Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {locale === 'vi' ? 'Tất cả' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unlocked')}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                  statusFilter === 'unlocked'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🔓</span>
                <span>{locale === 'vi' ? 'Đã đạt' : 'Unlocked'}</span>
                <span className="text-[10px] opacity-80 font-mono">({summary.unlockedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('locked')}
                className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                  statusFilter === 'locked'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🔒</span>
                <span>{locale === 'vi' ? 'Chưa đạt' : 'Locked'}</span>
                <span className="text-[10px] opacity-80 font-mono">({lockedCount})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-52">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder={locale === 'vi' ? 'Tìm danh hiệu...' : 'Search badge...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none pl-8 pr-3 py-1.5 rounded-xl text-xs placeholder-slate-600 text-white"
              />
            </div>
          </div>
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
              const rarityKey: RarityTier = item.rarity || 'common';
              const rarityStyle = RARITY_STYLES[rarityKey] || RARITY_STYLES.common;
              const rarityLabel = locale === 'vi' ? rarityStyle.labelVi : rarityStyle.labelEn;

              return (
                <div
                  key={item.id}
                  className={`relative p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    item.isUnlocked
                      ? rarityStyle.unlockedCardClass
                      : 'bg-slate-900/35 border-slate-800/80 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div>
                    {/* Top Row: Icon & Rarity + Status Badges */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={`text-3xl sm:text-4xl p-2.5 rounded-2xl border shadow-inner ${
                        item.isUnlocked ? rarityStyle.iconBoxClass : 'bg-slate-950/60 border-slate-800/80'
                      }`}>
                        {item.icon}
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${rarityStyle.pillClass}`}>
                          {rarityLabel}
                        </span>

                        {item.isUnlocked ? (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold">
                            <ShieldCheck size={12} />
                            <span>{locale === 'vi' ? 'ĐÃ ĐẠT' : 'UNLOCKED'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-[10px] font-extrabold">
                            <Lock size={11} />
                            <span>{locale === 'vi' ? 'CHƯA ĐẠT' : 'LOCKED'}</span>
                          </div>
                        )}
                      </div>
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
                        {item.progress} / {item.target} ({item.percentage}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.isUnlocked
                            ? rarityStyle.barClass
                            : 'bg-purple-500/60'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>

                    {item.isUnlocked && (
                      <div className="pt-2 flex items-center justify-end">
                        <button
                          type="button"
                          disabled={equippingId !== null}
                          onClick={() =>
                            void handleEquipTitle(
                              equippedTitleId === item.id ? null : item.id,
                            )
                          }
                          className={`w-full py-2 px-3 rounded-xl text-xs font-extrabold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            equippedTitleId === item.id
                              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                              : 'bg-slate-950/80 hover:bg-slate-800 border-slate-700/80 hover:border-emerald-500/40 text-slate-200 hover:text-white'
                          }`}
                        >
                          {equippedTitleId === item.id ? (
                            <>
                              <Check size={14} className="text-emerald-400 shrink-0" />
                              <span>
                                {locale === 'vi'
                                  ? 'Đang trang bị danh hiệu (Bấm để tháo)'
                                  : 'Equipped Title (Click to unequip)'}
                              </span>
                            </>
                          ) : (
                            <>
                              <Award size={14} className="text-amber-400 shrink-0" />
                              <span>
                                {locale === 'vi'
                                  ? 'Trang bị làm Danh hiệu'
                                  : 'Equip as Title'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
