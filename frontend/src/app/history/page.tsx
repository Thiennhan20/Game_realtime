'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Trophy, Target, Swords, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<'en' | 'vi'>('en');
  const [history, setHistory] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white font-sans p-4 overflow-x-hidden">
      <div className="max-w-4xl w-full mx-auto py-6">
        
        {/* Header navigation */}
        <header className="flex items-center justify-between pb-6 border-b border-slate-800 mb-8">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.location.href = `/?locale=${locale}`}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center"
              title={t('back')}
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                {t('title')}
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">{t('subtitle')}</p>
            </div>
          </div>
        </header>

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
                    {/* Winner/Loser Badge and Opponent info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {/* Win/Loss indicators */}
                      <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[10px] font-black tracking-wider ${
                        isWinner 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {isWinner ? <Trophy size={12} /> : null}
                        <span>{isWinner ? t('win') : t('loss')}</span>
                      </div>

                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest shrink-0 px-1">vs</span>

                      {/* Opponent Identity */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {opponent?.avatar ? (
                          <img src={opponent.avatar} alt={opponent.username} className="w-8 h-8 rounded-full border border-slate-700 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center font-bold text-xs uppercase text-slate-400 shrink-0">
                            {(opponent?.username || '??').slice(0, 2)}
                          </div>
                        )}
                        <span className="font-extrabold text-sm text-slate-200 truncate max-w-[120px] sm:max-w-[200px]">
                          {opponent?.username || (locale === 'vi' ? 'Đối thủ ẩn danh' : 'Unknown Opponent')}
                        </span>
                      </div>
                    </div>

                    {/* Duration, Date & Expand button */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                      {/* Duration */}
                      <div className="hidden xs:flex items-center space-x-1.5 text-slate-400 text-xs font-semibold">
                        <Clock size={14} className="text-blue-400" />
                        <span className="font-mono">{formatDuration(match.duration)}</span>
                      </div>

                      {/* Date */}
                      <div className="hidden sm:flex items-center space-x-1.5 text-slate-500 text-xs">
                        <Calendar size={13} />
                        <span>{formatDate(match.finishedAt)}</span>
                      </div>

                      {/* Toggle indicator icon */}
                      <div className="p-1.5 bg-slate-800/60 border border-slate-800/80 rounded-lg text-slate-400">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-800/60 overflow-hidden"
                      >
                        <div className="p-5 bg-slate-950/20 space-y-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                            <Target size={14} className="text-purple-400" />
                            <span>{t('details')}</span>
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            
                            {/* Duration & Date Info */}
                            <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl flex flex-col justify-center">
                              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">{t('duration')}</span>
                              <div className="flex items-baseline space-x-2">
                                <span className="font-mono text-xl font-extrabold text-white">{formatDuration(match.duration)}</span>
                                <span className="text-[10px] text-slate-500">{formatDate(match.finishedAt)}</span>
                              </div>
                            </div>

                            {/* Guess Counts Comparison */}
                            <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl space-y-2">
                              <span className="text-[10px] text-slate-500 font-bold uppercase block">{t('guessStats')}</span>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">{t('you')}:</span>
                                <span className="font-mono font-extrabold text-white">
                                  {isWinner ? match.winnerGuessCount : match.loserGuessCount} {t('turns')}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">{t('opponent')}:</span>
                                <span className="font-mono font-extrabold text-slate-300">
                                  {isWinner ? match.loserGuessCount : match.winnerGuessCount} {t('turns')}
                                </span>
                              </div>
                            </div>

                            {/* Advantage details */}
                            <div className="bg-slate-950/60 p-4 border border-slate-850 rounded-2xl flex flex-col justify-center">
                              <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">{t('firstMove')}</span>
                              <div className="flex items-center gap-1.5 text-xs text-slate-200">
                                <Swords size={14} className="text-amber-400" />
                                <span className="font-bold">
                                  {currentUser && match.rpsWinnerIndex === (isWinner ? match.winnerIndex : (match.winnerIndex === 0 ? 1 : 0))
                                    ? t('you')
                                    : opponent?.username}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-500 mt-1 block">{t('totalGuesses')}: {match.totalGuesses}</span>
                            </div>

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

      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HistoryPageContent />
    </Suspense>
  );
}
