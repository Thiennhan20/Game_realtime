'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  LoaderCircle,
  Shield,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { getMainSiteUrl, navigateTopWindow } from '@/features/game/utils';

const HISTORY_PAGE_SIZE = 15;

interface MatchPlayer {
  playerIndex?: number;
  userId: string;
  username: string;
  avatar: string;
  guessCount?: number;
  xpEarned?: number;
  totalXpBefore?: number;
  totalXpAfter?: number;
  ratingBefore?: number;
  ratingDelta?: number;
  ratingAfter?: number;
  highestRatingAfter?: number;
  rankBefore?: string;
  rankAfter?: string;
  rankBeforeEn?: string;
  rankAfterEn?: string;
  rankKeyBefore?: string;
  rankKeyAfter?: string;
}

interface Match {
  _id: string;
  matchId?: string;
  roomId: string;
  isAiRoom?: boolean;
  aiDifficulty?: string;
  players: MatchPlayer[];
  winnerId: string | null;
  winnerIndex: number | null;
  status?: 'completed' | 'forfeited' | 'abandoned' | 'cancelled';
  totalGuesses: number;
  winnerGuessCount: number;
  loserGuessCount: number;
  rpsWinnerIndex: number;
  duration: number;
  finishedAt: string;
  endReason?: string;
  xpEligible?: boolean;
  xpEligibilityReason?: string;
  ratingVersion?: string;
  ratingApplied?: boolean;
  ratingReason?: string;
}

interface HistoryResponse {
  history?: Match[];
  hasMore?: boolean;
  nextPage?: number | null;
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasMore?: boolean;
    nextPage?: number | null;
  };
}

function getHistoryPageState(
  response: HistoryResponse,
  requestedPage: number,
  receivedCount: number,
) {
  const pagination = response.pagination;
  const page =
    typeof pagination?.page === 'number' && pagination.page > 0
      ? pagination.page
      : requestedPage;

  if (typeof pagination?.hasMore === 'boolean') {
    return { page, hasMore: pagination.hasMore };
  }
  if (typeof response.hasMore === 'boolean') {
    return { page, hasMore: response.hasMore };
  }
  if (pagination && 'nextPage' in pagination) {
    return { page, hasMore: pagination.nextPage !== null };
  }
  if ('nextPage' in response) {
    return { page, hasMore: response.nextPage !== null };
  }
  if (typeof pagination?.totalPages === 'number') {
    return { page, hasMore: page < pagination.totalPages };
  }
  if (typeof pagination?.total === 'number') {
    const limit = pagination.limit || HISTORY_PAGE_SIZE;
    return { page, hasMore: page * limit < pagination.total };
  }

  return { page, hasMore: receivedCount === HISTORY_PAGE_SIZE };
}

function HistoryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<'en' | 'vi'>('en');
  const [history, setHistory] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [historyMode, setHistoryMode] = useState<'all' | 'pvp' | 'ai'>('all');
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
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
      setHistory([]);
      setHistoryPage(1);
      setHasMoreHistory(false);
      setLoadMoreError(false);

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
        if (!profileRes.ok) throw new Error('Invalid token');
        const profileData = await profileRes.json();
        const userId = profileData.user.id || profileData.user._id;
        setCurrentUser({ id: userId });
        setUserProfile({
          name: profileData.user.name || profileData.user.username || 'User',
          avatar: profileData.user.avatar || ''
        });

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (isLocal ? 'http://localhost:8080' : window.location.origin);
        const historyRes = await fetch(
          `${socketUrl}/api/history?page=1&limit=${HISTORY_PAGE_SIZE}&mode=${historyMode}`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          },
        );
        if (!historyRes.ok) throw new Error('Failed to fetch history');
        const historyData = (await historyRes.json()) as HistoryResponse;
        const firstPage = Array.isArray(historyData.history) ? historyData.history : [];
        const pageState = getHistoryPageState(historyData, 1, firstPage.length);
        setHistory(firstPage);
        setHistoryPage(pageState.page);
        setHasMoreHistory(pageState.hasMore);
        setLoadMoreError(false);
      } catch (err: unknown) {
        console.error(
          'Error fetching data:',
          err instanceof Error ? err.message : err,
        );
        setError(locale === 'vi' ? 'Không thể tải lịch sử đấu.' : 'Failed to load match history.');
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [locale, historyMode]);

  const loadMoreHistory = async () => {
    if (loadingMore || !hasMoreHistory) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setLoadMoreError(true);
      return;
    }

    const requestedPage = historyPage + 1;
    setLoadingMore(true);
    setLoadMoreError(false);

    try {
      const isLocal =
        window.location.hostname.includes('localhost') ||
        window.location.hostname === '127.0.0.1';
      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL ||
        (isLocal ? 'http://localhost:8080' : window.location.origin);
      const response = await fetch(
        `${socketUrl}/api/history?page=${requestedPage}&limit=${HISTORY_PAGE_SIZE}&mode=${historyMode}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error('Failed to load more history');

      const data = (await response.json()) as HistoryResponse;
      const nextMatches = Array.isArray(data.history) ? data.history : [];
      const existingIds = new Set(
        history.map((match) => match.matchId || match._id),
      );
      const uniqueMatches = nextMatches.filter(
        (match) => !existingIds.has(match.matchId || match._id),
      );
      const pageState = getHistoryPageState(
        data,
        requestedPage,
        nextMatches.length,
      );

      setHistory((currentHistory) => [...currentHistory, ...uniqueMatches]);
      setHistoryPage(pageState.page);
      setHasMoreHistory(pageState.hasMore && uniqueMatches.length > 0);
    } catch (loadError) {
      console.error(
        'Error loading more match history:',
        loadError instanceof Error ? loadError.message : loadError,
      );
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

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
    const translations: Record<'en' | 'vi', Record<string, string>> = {
      en: {
        cancelled: "MATCH CANCELLED",
        loadMore: "Load more matches",
        loadingMore: "Loading more...",
        loadMoreError: "Could not load more matches. Please try again.",
        retry: "Try again",
        title: "GAME ARENA HISTORY",
        subtitle: "Expand matches to view detailed turn & rating statistics",
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
        totalGuesses: "Total match guesses",
        ratingChange: "Rating Change",
        rankBeforeAfter: "Rank",
        earlyForfeitRatingDesc: "Early forfeit: stayer gains no rating, quitter is penalized.",
      },
      vi: {
        cancelled: "TRẬN HỦY",
        loadMore: "Tải thêm trận đấu",
        loadingMore: "Đang tải thêm...",
        loadMoreError: "Chưa thể tải thêm trận đấu. Vui lòng thử lại.",
        retry: "Thử lại",
        title: "LỊCH SỬ ĐẤU TRƯỜNG",
        subtitle: "Bấm vào các trận đấu để xem thống kê chi tiết & Rating",
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
        totalGuesses: "Tổng số lượt đoán",
        ratingChange: "Biến động Rating",
        rankBeforeAfter: "Bậc hạng",
        earlyForfeitRatingDesc: "Thoát quá sớm: người ở lại không được cộng điểm, người thoát bị phạt.",
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
        <div className="max-w-[1700px] w-full mx-auto flex items-center justify-between gap-2">
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 pt-16 sm:pt-20 space-y-4">
        {/* Mode Filter Tabs: All, PvP, AI */}
        <div className="flex items-center gap-2 p-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setHistoryMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              historyMode === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🎮</span>
            <span>{locale === 'vi' ? 'Tất cả' : 'All Matches'}</span>
          </button>

          <button
            type="button"
            onClick={() => setHistoryMode('pvp')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              historyMode === 'pvp'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚔️</span>
            <span>{locale === 'vi' ? 'Đấu Người (PvP)' : 'PvP Matches'}</span>
          </button>

          <button
            type="button"
            onClick={() => setHistoryMode('ai')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
              historyMode === 'ai'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🤖</span>
            <span>{locale === 'vi' ? 'Chơi Với Máy (PvE)' : 'Bot Matches'}</span>
          </button>
        </div>

        {/* Matches list container */}
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/20 border border-slate-800/80 rounded-2xl text-slate-500 font-medium">
              {t('noMatches')}
            </div>
          ) : (
            history.map((match) => {
              const isAbandoned =
                match.status === 'abandoned' || match.status === 'cancelled';
              const currentPlayer = currentUser
                ? match.players.find((player) => player.userId === currentUser.id)
                : undefined;
              const isWinner =
                !isAbandoned && (match.isAiRoom ? match.winnerIndex === (currentPlayer?.playerIndex ?? 0) : Boolean(currentUser && match.winnerId === currentUser.id));
              const aiDiffLabel = match.aiDifficulty === 'easy' ? 'Dễ' : match.aiDifficulty === 'medium' ? 'Trung Bình' : 'Cực Khó';
              const opponent = match.isAiRoom
                ? {
                    username: `AI Bot (${aiDiffLabel})`,
                    avatar: '',
                    guessCount: isWinner ? match.loserGuessCount : match.winnerGuessCount
                  }
                : (currentUser && match.players.find(p => p.userId !== currentUser.id));
              const isExpanded = expandedMatchId === match._id;
              const xpEarned = isAbandoned ? 0 : currentPlayer?.xpEarned;
              const ratingDelta = isAbandoned ? 0 : currentPlayer?.ratingDelta;
              const ratingBefore = currentPlayer?.ratingBefore;
              const ratingAfter = currentPlayer?.ratingAfter;
              const isEarlyForfeitNote =
                match.ratingReason === 'early_forfeit_penalty' ||
                match.endReason === 'early_forfeit' ||
                (match.status === 'forfeited' && (currentPlayer?.guessCount || 0) < 3 && (opponent?.guessCount || 0) < 3);

              let statusBadgeText = '';
              let statusBadgeStyle = '';

              if (match.status === 'abandoned') {
                statusBadgeText = locale === 'vi' ? 'Bỏ dở' : 'Abandoned';
                statusBadgeStyle = 'bg-amber-500/15 text-amber-300 border border-amber-500/25';
              } else if (match.status === 'cancelled') {
                statusBadgeText = locale === 'vi' ? 'Đã hủy' : 'Cancelled';
                statusBadgeStyle = 'bg-slate-800 text-slate-400 border border-slate-700';
              } else if (match.status === 'forfeited') {
                if (isWinner) {
                  statusBadgeText = locale === 'vi' ? 'Thắng (Đối thủ thoát)' : 'Win (Forfeit)';
                  statusBadgeStyle = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                } else {
                  statusBadgeText = locale === 'vi' ? 'Bỏ cuộc' : 'Forfeited';
                  statusBadgeStyle = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
                }
              } else {
                if (isWinner) {
                  statusBadgeText = locale === 'vi' ? 'Chiến thắng' : 'Victory';
                  statusBadgeStyle = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
                } else {
                  statusBadgeText = locale === 'vi' ? 'Thất bại' : 'Defeat';
                  statusBadgeStyle = 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
                }
              }

              const currentGuessCount = currentPlayer?.guessCount ?? 0;
              const opponentGuessCount = opponent?.guessCount ?? 0;

              return (
                <div 
                  key={match._id}
                  className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-200 hover:border-slate-700/60 shadow-lg"
                >
                  {/* Brief horizontal summary row */}
                  <div 
                    onClick={() => toggleExpand(match._id)}
                    className="flex cursor-pointer select-none items-center justify-between gap-2 p-3 sm:p-5"
                  >
                    {/* Left: Outcome badge + Match basic info */}
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
                      {/* Winner / Loser Badge */}
                      <div className={`shrink-0 px-2 py-1.5 sm:px-3 rounded-xl font-black text-[10px] sm:text-xs tracking-wider ${statusBadgeStyle}`}>
                        {statusBadgeText}
                      </div>

                      {/* Opponent Info */}
                      <div className="min-w-0 overflow-hidden">
                        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                          <span className="hidden text-xs text-slate-400 sm:inline">{t('opponent')}:</span>
                          {opponent?.avatar ? (
                            <img src={opponent.avatar} alt={opponent.username} className="w-5 h-5 rounded-full border border-slate-700 object-cover" />
                          ) : (
                            <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center font-bold text-[10px]">
                              {opponent?.username?.slice(0, 1) || '?'}
                            </div>
                          )}
                          <span className="max-w-[64px] truncate text-xs font-bold text-slate-100 sm:max-w-none sm:text-sm">{opponent?.username || 'Unknown'}</span>
                        </div>
                        <div className="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-slate-500 sm:gap-3 sm:text-xs">
                          <span className="flex min-w-0 items-center gap-1 truncate">
                            <Calendar size={12} />
                            <span className="truncate">{formatDate(match.finishedAt)}</span>
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden items-center space-x-1 sm:flex">
                            <Clock size={12} />
                            <span>{formatDuration(match.duration)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: XP & Rating Badges + Expand Toggle Button */}
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                      <div
                        className={`rounded-lg border px-1.5 py-1 font-mono text-[10px] font-black sm:px-2 sm:text-xs ${
                          typeof xpEarned === 'number' && xpEarned > 0
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-slate-700 bg-slate-800/70 text-slate-400'
                        }`}
                      >
                        {typeof xpEarned === 'number' ? `+${xpEarned} XP` : '-- XP'}
                      </div>

                      <div
                        className={`rounded-lg border px-1.5 py-1 font-mono text-[10px] font-black sm:px-2 sm:text-xs ${
                          typeof ratingDelta === 'number'
                            ? ratingDelta > 0
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : ratingDelta < 0
                              ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                              : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                            : 'border-slate-700 bg-slate-800/70 text-slate-400'
                        }`}
                      >
                        {typeof ratingDelta === 'number'
                          ? (ratingDelta > 0 ? `+${ratingDelta} Rating` : `${ratingDelta} Rating`)
                          : '-- Rating'}
                      </div>

                      <div className="hidden sm:block text-right text-xs">
                        <span className="font-bold text-purple-400">{currentGuessCount}</span>
                        <span className="text-slate-500"> {t('turns')}</span>
                      </div>
                      <div className="rounded-lg bg-slate-800/60 p-1 text-slate-400 sm:p-1.5">
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
                        {isEarlyForfeitNote && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
                            ⚡ {t('earlyForfeitRatingDesc')}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          {/* Rating details */}
                          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                            <span className="text-slate-500 block text-[11px] mb-1">{t('ratingChange')}</span>
                            <div className="flex items-center gap-1.5 font-bold">
                              <Zap size={13} className="text-cyan-400" />
                              <span className="text-slate-400">{ratingBefore ?? '--'}</span>
                              <span className="text-slate-600">→</span>
                              <span className="text-white">{ratingAfter ?? '--'}</span>
                              {typeof ratingDelta === 'number' && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                  ratingDelta > 0 ? 'bg-emerald-500/20 text-emerald-300' : ratingDelta < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {ratingDelta > 0 ? `+${ratingDelta}` : `${ratingDelta}`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Rank details */}
                          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                            <span className="text-slate-500 block text-[11px] mb-1">{t('rankBeforeAfter')}</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-200">
                              <Shield size={13} className="text-amber-400" />
                              <span>
                                {locale === 'vi'
                                  ? (currentPlayer?.rankBefore || 'Đồng')
                                  : (currentPlayer?.rankBeforeEn || 'Bronze')}
                              </span>
                              {((currentPlayer?.rankBefore && currentPlayer?.rankAfter && currentPlayer.rankBefore !== currentPlayer.rankAfter) ||
                                (currentPlayer?.rankBeforeEn && currentPlayer?.rankAfterEn && currentPlayer.rankBeforeEn !== currentPlayer.rankAfterEn)) && (
                                <>
                                  <span className="text-slate-600">→</span>
                                  <span className="text-amber-300">
                                    {locale === 'vi'
                                      ? (currentPlayer?.rankAfter || 'Đồng')
                                      : (currentPlayer?.rankAfterEn || 'Bronze')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Stat 1: Guess Breakdown */}
                          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                            <span className="text-slate-500 block text-[11px] mb-1">{locale === 'vi' ? 'Số lượt đoán chi tiết' : 'Guess Count Breakdown'}</span>
                            <div className="font-bold text-slate-200 text-xs">
                              {locale === 'vi' ? 'Bạn' : 'You'}: <strong className="text-purple-300 font-mono">{currentGuessCount}</strong>
                              <span className="mx-1 text-slate-600">·</span>
                              {locale === 'vi' ? 'Đối thủ' : 'Opponent'}: <strong className="text-slate-400 font-mono">{opponentGuessCount}</strong>
                            </div>
                          </div>

                          {/* Stat 2: First move */}
                          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                            <span className="text-slate-500 block text-[11px] mb-1">{t('firstMove')}</span>
                            <span className="font-bold text-slate-200">
                              {match.rpsWinnerIndex === (currentPlayer?.playerIndex ?? 0)
                                ? (locale === 'vi' ? 'Bạn (thắng oẳn tù tì)' : 'You (won RPS)')
                                : match.rpsWinnerIndex !== null && match.rpsWinnerIndex !== -1
                                ? (match.isAiRoom
                                    ? `AI Bot (${match.aiDifficulty === 'easy' ? 'Dễ' : match.aiDifficulty === 'medium' ? 'Trung Bình' : 'Cực Khó'})`
                                    : opponent?.username || 'Đối thủ')
                                : (locale === 'vi' ? 'Không xác định' : 'Unknown')}
                            </span>
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

        {(hasMoreHistory || loadMoreError) && history.length > 0 && (
          <div className="flex flex-col items-center gap-2 py-2">
            {loadMoreError && (
              <p role="status" className="text-center text-xs font-medium text-rose-400">
                {t('loadMoreError')}
              </p>
            )}
            <button
              type="button"
              onClick={() => void loadMoreHistory()}
              disabled={loadingMore}
              className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-bold text-purple-200 transition hover:border-purple-400/50 hover:bg-purple-500/20 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
            >
              {loadingMore ? (
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <ChevronDown size={16} aria-hidden="true" />
              )}
              <span>
                {loadingMore
                  ? t('loadingMore')
                  : loadMoreError
                    ? t('retry')
                    : t('loadMore')}
              </span>
            </button>
          </div>
        )}
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
