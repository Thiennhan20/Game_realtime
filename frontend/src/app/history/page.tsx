'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Trophy, Target, Swords, ChevronDown, ChevronUp, Calendar, Users } from 'lucide-react';
import { getMainSiteUrl, navigateTopWindow } from '@/features/game/utils';

interface Match {
  _id: string;
  roomId: string;
  players: Array<{
    userId: string;
    username: string;
    avatar: string;
  }>;
  winnerId: string;
  winnerIndex: number;
  totalGuesses: number;
  winnerGuessCount: number;
  loserGuessCount: number;
  rpsWinnerIndex: number;
  duration: number;
  finishedAt: string;
}

function HistoryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<'en' | 'vi'>('en');
  const [history, setHistory] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string } | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Load language settings
  useEffect(() => {
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
  }, [searchParams]);

  const toggleLocale = (selectedLocale: 'en' | 'vi') => {
    setLocale(selectedLocale);
    localStorage.setItem('game_locale', selectedLocale);
  };

  // Load user profile and then history
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError(locale === 'vi' ? 'Bạn cần đăng nhập trước.' : 'Authentication required.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1');
        const apiBase = process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3001/api' : 'https://server-nextjs-firm.onrender.com/api');
        
        // 1. Fetch user profile to get current userId
        const profileRes = await fetch(`${apiBase}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!profileRes.ok) throw new Error('Invalid token');
        const profileData = await profileRes.json();
        const userId = profileData.user.id || profileData.user._id;
        setCurrentUser({ id: userId });
        setUserProfile({
          name: profileData.user.name || profileData.user.username || 'User',
          avatar: profileData.user.avatar || ''
        });

        // 2. Fetch game history from game server
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (isLocal ? 'http://localhost:8080' : window.location.origin);
        const historyRes = await fetch(`${socketUrl}/api/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!historyRes.ok) throw new Error('Failed to fetch history');
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
      } catch (err: any) {
        console.error('Error fetching data:', err.message);
        setError(locale === 'vi' ? 'Không thể tải lịch sử đấu.' : 'Failed to load match history.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [locale]);

  const toggleExpand = (matchId: string) => {
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
    } else {
      setExpandedMatchId(matchId);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const t = (key: string) => {
    const translations: any = {
      en: {
        title: "GAME ARENA HISTORY",
        subtitle: "Expand matches to view detailed turn statistics",
        back: "Back to Game",
        win: "WON",
        loss: "LOST",
        loading: "Loading history...",
        noMatches: "No matches found.",
        turns: "guesses",
        duration: "Duration",
        details: "Match Details",
        opponent: "Opponent",
        guessStats: "Guess Statistics",
        firstMove: "First Guess Advantage",
        you: "You",
        totalGuesses: "Total match guesses"
      },
      vi: {
        title: "LỊCH SỬ ĐẤU TRƯỜNG",
        subtitle: "Bấm vào các trận đấu để xem thống kê chi tiết",
        back: "Quay lại game",
        win: "THẮNG",
        loss: "THUA",
        loading: "Đang tải lịch sử...",
        noMatches: "Chưa có trận đấu nào được ghi nhận.",
        turns: "lượt đoán",
        duration: "Thời lượng",
        details: "Chi tiết trận đấu",
        opponent: "Đối thủ",
        guessStats: "Thống kê lượt đoán",
        firstMove: "Quyền đi trước (Oẳn tù tì)",
        you: "Bạn",
        totalGuesses: "Tổng số lượt đoán"
      }
    };
    return translations[locale]?.[key] || translations['en']?.[key] || key;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-4"
        />
        <p className="text-slate-400 font-medium">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-4 shadow-xl">
          <p className="text-red-400 font-bold text-lg">⚠️ Error</p>
          <p className="text-slate-300 text-sm">{error}</p>
          <button
            onClick={() => window.location.href = `/?locale=${locale}`}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition duration-200 cursor-pointer"
          >
            {t('back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white font-sans flex flex-col max-w-full overflow-y-auto no-scrollbar">
      {/* Header Info - Fixed Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl shrink-0">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              onClick={() => router.push(`/?locale=${locale}`)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center shrink-0"
              title={t('back')}
            >
              <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            <div className="hidden xs:block p-2 bg-purple-500/10 text-purple-400 rounded-xl shrink-0 border border-purple-500/20">
              <Clock size={18} className="sm:w-5 sm:h-5" />
            </div>

            <div className="min-w-0">
              <h1 className="font-extrabold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                {t('title')}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-400">{t('subtitle')}</p>
            </div>
          </div>

          {/* User Profile & Language Dropdown */}
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

            {userProfile && (
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
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 pt-16 sm:pt-20 space-y-4">
        {/* Matches list container */}
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/20 border border-slate-800/80 rounded-2xl text-slate-500 font-medium">
              {t('noMatches')}
            </div>
          ) : (
            history.map((match) => {
              const isWinner = currentUser && match.winnerId === currentUser.id;
              const opponent = currentUser && match.players.find(p => p.userId !== currentUser.id);
              const isExpanded = expandedMatchId === match._id;

              return (
                <div 
                  key={match._id}
                  className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-200 hover:border-slate-700/60 shadow-lg"
                >
                  {/* Brief horizontal summary row */}
                  <div 
                    onClick={() => toggleExpand(match._id)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none"
                  >
                    {/* Left: Outcome badge + Match basic info */}
                    <div className="flex items-center space-x-4">
                      {/* Winner / Loser Badge */}
                      <div className={`px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm tracking-wider ${
                        isWinner 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {isWinner ? t('win') : t('loss')}
                      </div>

                      {/* Opponent Info */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400">{t('opponent')}:</span>
                          {opponent?.avatar ? (
                            <img src={opponent.avatar} alt={opponent.username} className="w-5 h-5 rounded-full border border-slate-700 object-cover" />
                          ) : (
                            <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center font-bold text-[10px]">
                              {opponent?.username?.slice(0, 1) || '?'}
                            </div>
                          )}
                          <span className="font-bold text-sm text-slate-100">{opponent?.username || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>{formatDate(match.finishedAt)}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{formatDuration(match.duration)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Expand Toggle Button */}
                    <div className="flex items-center space-x-3">
                      <div className="hidden sm:block text-right text-xs">
                        <span className="font-bold text-purple-400">{isWinner ? match.winnerGuessCount : match.loserGuessCount}</span>
                        <span className="text-slate-500"> {t('turns')}</span>
                      </div>
                      <div className="p-1.5 bg-slate-800/60 rounded-lg text-slate-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detailed Breakdown */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-800/60 bg-slate-950/60 p-4 sm:p-5 space-y-4"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          {/* Stat 1 */}
                          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                            <span className="text-slate-500 block text-[11px] mb-1">{t('firstMove')}</span>
                            <span className="font-bold text-slate-200">
                              {match.players[match.rpsWinnerIndex]?.username === currentUser?.id ? t('you') : match.players[match.rpsWinnerIndex]?.username}
                            </span>
                          </div>

                          {/* Stat 2 */}
                          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                            <span className="text-slate-500 block text-[11px] mb-1">{t('totalGuesses')}</span>
                            <span className="font-bold text-slate-200">{match.totalGuesses} {t('turns')}</span>
                          </div>

                          {/* Stat 3 */}
                          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                            <span className="text-slate-500 block text-[11px] mb-1">Room ID</span>
                            <span className="font-mono font-bold text-purple-400">{match.roomId}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HistoryPageContent />
    </Suspense>
  );
}
