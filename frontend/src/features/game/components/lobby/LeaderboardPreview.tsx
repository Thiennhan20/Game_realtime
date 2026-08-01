import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

import type { LeaderboardEntry, Locale } from '../../types';
import { getGameApiUrl } from '../../utils';

interface LeaderboardPreviewProps {
  locale: Locale;
  onViewAll: () => void;
}

export function LeaderboardPreview({ locale, onViewAll }: LeaderboardPreviewProps) {
  const [topLeaders, setTopLeaders] = useState<LeaderboardEntry[]>(() => {
    try {
      const cached = localStorage.getItem('leaderboard_preview_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore cache parse error
    }
    return [];
  });
  const [loading, setLoading] = useState(() => topLeaders.length === 0);

  useEffect(() => {
    let active = true;
    const fetchTopLeaders = async () => {
      try {
        const response = await fetch(getGameApiUrl('/api/leaderboard?limit=4'));
        if (response.ok) {
          const data = await response.json();
          if (active && Array.isArray(data.leaderboard)) {
            setTopLeaders(data.leaderboard);
            try {
              localStorage.setItem('leaderboard_preview_cache', JSON.stringify(data.leaderboard));
            } catch {
              // Ignore localStorage quota error
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch preview leaderboard:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchTopLeaders();
    return () => {
      active = false;
    };
  }, []);

  const numberFormatter = new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US');

  return (
    <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 sm:p-5 lg:p-6 rounded-2xl shadow-xl flex flex-col justify-between">
      <div className="space-y-3 sm:space-y-3.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/80">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Trophy size={15} className="text-amber-400 shrink-0" />
            <span>{locale === 'vi' ? 'BXH Cao Thủ' : 'Top Ranking'}</span>
          </h3>
          <button
            onClick={onViewAll}
            className="text-[11px] font-extrabold text-purple-400 hover:text-purple-300 transition cursor-pointer flex items-center gap-0.5"
          >
            <span>{locale === 'vi' ? 'Xem tất cả' : 'View All'}</span>
            <span>→</span>
          </button>
        </div>

        <div className="space-y-2 sm:space-y-2.5">
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-9 bg-slate-800/60 rounded-xl" />
              <div className="h-9 bg-slate-800/60 rounded-xl" />
              <div className="h-9 bg-slate-800/60 rounded-xl" />
              <div className="h-9 bg-slate-800/60 rounded-xl" />
            </div>
          ) : topLeaders.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 font-medium">
              {locale === 'vi' ? 'Chưa có dữ liệu xếp hạng.' : 'No ranking data yet.'}
            </div>
          ) : (
            topLeaders.map((leader, index) => {
              const rankIcon = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🎖️';
              const rankColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-purple-400';
              const border = index === 0 ? 'border-amber-500/30' : index === 1 ? 'border-slate-700/40' : index === 2 ? 'border-amber-800/30' : 'border-purple-900/30';

              return (
                <div
                  key={leader.userId}
                  className={`flex items-center justify-between p-2 sm:p-2.5 bg-slate-950/60 rounded-xl border ${border}`}
                >
                  <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
                    <span className={`text-xs font-extrabold ${rankColor} w-4 text-center shrink-0`}>
                      {rankIcon}
                    </span>
                    {leader.avatar ? (
                      <img
                        src={leader.avatar}
                        className={`w-6.5 h-6.5 rounded-full ${
                          index === 0 ? 'border-amber-400' : 'border-slate-700'
                        } border object-cover shrink-0`}
                        alt={leader.username}
                      />
                    ) : (
                      <div className="w-6.5 h-6.5 rounded-full bg-purple-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                        {leader.username.slice(0, 1)}
                      </div>
                    )}
                    <span className="text-xs font-extrabold text-slate-100 truncate">{leader.username}</span>
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-mono font-black ${rankColor} shrink-0`}
                  >
                    {numberFormatter.format(leader.rating)} Rating
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="border-t border-slate-850 pt-3 mt-4 text-[10px] sm:text-[11px] text-slate-400 font-extrabold uppercase tracking-wider flex items-center justify-between">
        <span>{locale === 'vi' ? 'Bảng xếp hạng toàn cầu' : 'Global Leaderboard'}</span>
        <span className="text-purple-400 font-mono">LIVE</span>
      </div>
    </div>
  );
}
