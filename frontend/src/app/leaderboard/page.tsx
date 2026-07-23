'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Trophy, Medal, Crown, Target, Users, Flame, ChevronDown, Clock, Search, LogOut } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  title: string;
  titleEn: string;
  wins: number;
  totalMatches: number;
  winRate: number;
  avgGuesses: number;
  rating: number; // LP
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: "usr_101",
    username: "Nhân Nguyễn",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
    title: "Bậc Thầy Đoán Số",
    titleEn: "Master Mind",
    wins: 48,
    totalMatches: 55,
    winRate: 87.2,
    avgGuesses: 3.1,
    rating: 2450
  },
  {
    rank: 2,
    userId: "usr_102",
    username: "Superman",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80",
    title: "Thần Đoán Mật Mã",
    titleEn: "Code Breaker",
    wins: 41,
    totalMatches: 50,
    winRate: 82.0,
    avgGuesses: 3.4,
    rating: 2310
  },
  {
    rank: 3,
    userId: "usr_103",
    username: "Thị Tư Hổ",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80",
    title: "Thợ Săn Mật Mã",
    titleEn: "Cipher Hunter",
    wins: 36,
    totalMatches: 46,
    winRate: 78.3,
    avgGuesses: 3.6,
    rating: 2180
  },
  {
    rank: 4,
    userId: "usr_104",
    username: "hotdog",
    avatar: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=150&q=80",
    title: "Cao Thủ Đoán Tốc Độ",
    titleEn: "Speed Guesser",
    wins: 31,
    totalMatches: 42,
    winRate: 73.8,
    avgGuesses: 3.8,
    rating: 2040
  },
  {
    rank: 5,
    userId: "usr_105",
    username: "CyberKing",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=150&q=80",
    title: "Vua Mật Mã",
    titleEn: "Cryptic King",
    wins: 28,
    totalMatches: 40,
    winRate: 70.0,
    avgGuesses: 3.9,
    rating: 1920
  },
  {
    rank: 6,
    userId: "usr_106",
    username: "Phantom99",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80",
    title: "Bóng Ma Đoán Số",
    titleEn: "Shadow Guesser",
    wins: 25,
    totalMatches: 38,
    winRate: 65.8,
    avgGuesses: 4.1,
    rating: 1850
  },
  {
    rank: 7,
    userId: "usr_107",
    username: "Luna_Star",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    title: "Ngôi Sao Đoán Số",
    titleEn: "Star Oracle",
    wins: 22,
    totalMatches: 35,
    winRate: 62.9,
    avgGuesses: 4.2,
    rating: 1760
  },
  {
    rank: 8,
    userId: "usr_108",
    username: "DarkKnight",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    title: "Hiệp Sĩ Mật Mã",
    titleEn: "Code Knight",
    wins: 20,
    totalMatches: 34,
    winRate: 58.8,
    avgGuesses: 4.4,
    rating: 1680
  },
  {
    rank: 9,
    userId: "usr_109",
    username: "Phoenix",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
    title: "Phượng Hoàng",
    titleEn: "Phoenix Master",
    wins: 18,
    totalMatches: 32,
    winRate: 56.3,
    avgGuesses: 4.5,
    rating: 1590
  },
  {
    rank: 10,
    userId: "usr_110",
    username: "Viper_X",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
    title: "Chiến Binh Mật Mã",
    titleEn: "Cipher Warrior",
    wins: 16,
    totalMatches: 30,
    winRate: 53.3,
    avgGuesses: 4.6,
    rating: 1510
  }
];

function LeaderboardPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<'en' | 'vi'>('en');
  const [filterTime, setFilterTime] = useState<'all' | 'monthly' | 'weekly'>('all');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState<{ name: string; avatar: string } | null>(null);

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

  const toggleLocale = (selectedLocale: 'en' | 'vi') => {
    setLocale(selectedLocale);
    localStorage.setItem('game_locale', selectedLocale);
  };

  const filteredLeaderboard = MOCK_LEADERBOARD.filter(item => 
    item.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (locale === 'vi' ? item.title : item.titleEn).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top1 = MOCK_LEADERBOARD[0];
  const top2 = MOCK_LEADERBOARD[1];
  const top3 = MOCK_LEADERBOARD[2];
  const restList = filteredLeaderboard.filter(item => item.rank > 3);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white font-sans flex flex-col max-w-full overflow-y-auto no-scrollbar">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-3 py-2 sm:px-4 sm:py-2.5 shadow-xl shrink-0">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-2">
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
                {locale === 'vi' ? 'BẢNG XẾP HẠNG CAO THỦ' : 'HALL OF FAME LEADERBOARD'}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-400">
                {locale === 'vi' ? 'Vinh danh những thần đoán số xuất sắc nhất' : 'Honoring the top master number guessers'}
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
                        const isLocal = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1');
                        window.location.href = isLocal ? 'http://localhost:3000/profile' : 'https://moviesaw.vercel.app/profile';
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
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 space-y-6">
        
        {/* Top Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-3 sm:p-4 rounded-2xl">
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850 w-full sm:w-auto">
            <button
              onClick={() => setFilterTime('all')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                filterTime === 'all' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {locale === 'vi' ? 'Tất cả thời gian' : 'All Time'}
            </button>
            <button
              onClick={() => setFilterTime('monthly')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                filterTime === 'monthly' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              {locale === 'vi' ? 'Tháng này' : 'Monthly'}
            </button>
            <button
              onClick={() => setFilterTime('weekly')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                filterTime === 'weekly' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
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
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:outline-none pl-9 pr-3 py-1.5 rounded-xl text-xs placeholder-slate-600 text-white"
            />
          </div>
        </div>

        {/* TOP 3 PODIUM HALL OF FAME */}
        {!searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 pb-4 items-end">
            
            {/* RANK 2 - SILVER PODIUM */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="order-2 md:order-1 bg-slate-900/50 backdrop-blur-md border border-slate-700/60 p-5 rounded-2xl shadow-xl text-center flex flex-col items-center relative overflow-hidden group hover:border-slate-400 transition duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-400/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative mb-3">
                <img src={top2.avatar} alt={top2.username} className="w-16 h-16 rounded-full border-2 border-slate-300 object-cover shadow-lg" />
                <span className="absolute -bottom-2 -right-1 bg-slate-300 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full border border-white shadow">
                  #2
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-white mb-0.5">{top2.username}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{locale === 'vi' ? top2.title : top2.titleEn}</p>
              <div className="w-full bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>{locale === 'vi' ? 'Số trận thắng:' : 'Wins:'}</span>
                  <strong className="text-white font-mono">{top2.wins}/{top2.totalMatches}</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>{locale === 'vi' ? 'Tỷ lệ thắng:' : 'Win Rate:'}</span>
                  <strong className="text-slate-300 font-mono">{top2.winRate}%</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>{locale === 'vi' ? 'Điểm xếp hạng:' : 'Rating:'}</span>
                  <strong className="text-amber-400 font-mono">{top2.rating} LP</strong>
                </div>
              </div>
            </motion.div>

            {/* RANK 1 - GOLD PODIUM (TALLEST) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="order-1 md:order-2 bg-gradient-to-b from-amber-500/15 via-slate-900/80 to-slate-900/60 backdrop-blur-md border-2 border-amber-400/80 p-6 rounded-2xl shadow-2xl text-center flex flex-col items-center relative overflow-hidden group hover:border-amber-400 transition duration-300 md:-translate-y-3"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative mb-3">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-400 animate-bounce">
                  <Crown size={22} className="fill-amber-400" />
                </div>
                <img src={top1.avatar} alt={top1.username} className="w-20 h-20 rounded-full border-2 border-amber-400 object-cover shadow-xl ring-4 ring-amber-400/20" />
                <span className="absolute -bottom-2 -right-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full border border-white shadow-lg">
                  👑 #1
                </span>
              </div>
              <h3 className="font-extrabold text-base text-white mb-0.5">{top1.username}</h3>
              <p className="text-xs font-extrabold text-amber-400 uppercase tracking-wider mb-3">{locale === 'vi' ? top1.title : top1.titleEn}</p>
              
              <div className="w-full bg-slate-950/90 p-3 rounded-xl border border-amber-500/30 space-y-1.5 text-xs shadow-inner">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>{locale === 'vi' ? 'Số trận thắng:' : 'Wins:'}</span>
                  <strong className="text-white font-mono">{top1.wins}/{top1.totalMatches}</strong>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>{locale === 'vi' ? 'Tỷ lệ thắng:' : 'Win Rate:'}</span>
                  <strong className="text-amber-400 font-mono font-bold">{top1.winRate}%</strong>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>{locale === 'vi' ? 'Điểm xếp hạng:' : 'Rating:'}</span>
                  <strong className="text-yellow-400 font-mono font-extrabold text-sm">{top1.rating} LP</strong>
                </div>
              </div>
            </motion.div>

            {/* RANK 3 - BRONZE PODIUM */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="order-3 bg-slate-900/50 backdrop-blur-md border border-amber-700/50 p-5 rounded-2xl shadow-xl text-center flex flex-col items-center relative overflow-hidden group hover:border-amber-600 transition duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-700/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative mb-3">
                <img src={top3.avatar} alt={top3.username} className="w-16 h-16 rounded-full border-2 border-amber-700 object-cover shadow-lg" />
                <span className="absolute -bottom-2 -right-1 bg-amber-700 text-white font-black text-xs px-2 py-0.5 rounded-full border border-white shadow">
                  #3
                </span>
              </div>
              <h3 className="font-extrabold text-sm text-white mb-0.5">{top3.username}</h3>
              <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider mb-2">{locale === 'vi' ? top3.title : top3.titleEn}</p>
              <div className="w-full bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>{locale === 'vi' ? 'Số trận thắng:' : 'Wins:'}</span>
                  <strong className="text-white font-mono">{top3.wins}/{top3.totalMatches}</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>{locale === 'vi' ? 'Tỷ lệ thắng:' : 'Win Rate:'}</span>
                  <strong className="text-slate-300 font-mono">{top3.winRate}%</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>{locale === 'vi' ? 'Điểm xếp hạng:' : 'Rating:'}</span>
                  <strong className="text-amber-400 font-mono">{top3.rating} LP</strong>
                </div>
              </div>
            </motion.div>

          </div>
        )}

        {/* RANK 4 TO 10 TABLE */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <h2 className="text-xs sm:text-sm font-bold text-slate-300 flex items-center space-x-2">
              <Medal size={16} className="text-amber-400" />
              <span>{locale === 'vi' ? 'DANH SÁCH BẢNG XẾP HẠNG' : 'RANKING LIST'}</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              {filteredLeaderboard.length} {locale === 'vi' ? 'người chơi' : 'players'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 text-center">{locale === 'vi' ? 'HẠNG' : 'RANK'}</th>
                  <th className="py-3 px-4">{locale === 'vi' ? 'NGƯỜI CHƠI' : 'PLAYER'}</th>
                  <th className="py-3 px-4 text-center">{locale === 'vi' ? 'SỐ TRẬN THẮNG' : 'WINS'}</th>
                  <th className="py-3 px-4 text-center">{locale === 'vi' ? 'TỶ LỆ THẮNG' : 'WIN RATE'}</th>
                  <th className="py-3 px-4 text-center hidden md:table-cell">{locale === 'vi' ? 'SỐ LẦN ĐOÁN TB' : 'AVG GUESSES'}</th>
                  <th className="py-3 px-4 text-right">{locale === 'vi' ? 'ĐIỂM (LP)' : 'RATING (LP)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-805">
                {(searchQuery ? filteredLeaderboard : restList).map((item) => (
                  <tr key={item.userId} className="hover:bg-slate-800/40 transition duration-150">
                    <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sm">
                      {item.rank === 1 ? <span className="text-amber-400">#1</span> : 
                       item.rank === 2 ? <span className="text-slate-300">#2</span> : 
                       item.rank === 3 ? <span className="text-amber-600">#3</span> : 
                       <span className="text-slate-500">#{item.rank}</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <img src={item.avatar} alt={item.username} className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate">{item.username}</p>
                          <p className="text-[10px] text-slate-500 font-semibold truncate">{locale === 'vi' ? item.title : item.titleEn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                      {item.wins} <span className="text-[10px] text-slate-500 font-normal">/ {item.totalMatches}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-16 bg-slate-950 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div className="bg-gradient-to-r from-purple-500 to-amber-400 h-full rounded-full" style={{ width: `${item.winRate}%` }} />
                        </div>
                        <span className="font-mono font-bold text-amber-300">{item.winRate}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400 hidden md:table-cell">
                      {item.avgGuesses} {locale === 'vi' ? 'lần' : 'tries'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-amber-400 text-sm">
                      {item.rating} LP
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
