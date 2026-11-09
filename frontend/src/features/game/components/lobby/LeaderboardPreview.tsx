import { memo, useEffect, useState } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';

import type { LeaderboardEntry, Locale } from '../../types';
import { getGameApiUrl } from '../../utils';
import { EquippedTitleBadge } from '../common/EquippedTitleBadge';

interface LeaderboardPreviewProps {
  locale: Locale;
  onViewAll: () => void;
  onOpenProfile?: (userId: string | null) => void;
}

export const LeaderboardPreview = memo(function LeaderboardPreview({
  locale,
  onViewAll,
  onOpenProfile,
}: LeaderboardPreviewProps) {
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
    // Skip fetching leaderboard preview on mobile screens (<1024px) where this component is hidden
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setLoading(false);
      return;
    }

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
    <div className="flex-1 bg-[#0d1017] border border-white/[0.08] p-4 sm:p-5 lg:p-6 rounded-xl shadow-xl flex flex-col justify-between">
      <div className="space-y-3 sm:space-y-3.5">
        <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
          <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Trophy size={14} className="text-amber-400 shrink-0" />
            <span>{locale === 'vi' ? 'BXH Cao Thủ' : 'Top Ranking'}</span>
          </h3>
          <button
            onClick={onViewAll}
            className="text-[11px] font-mono font-bold text-violet-400 hover:text-violet-300 transition cursor-pointer flex items-center gap-0.5"
          >
            <span>{locale === 'vi' ? 'Xem tất cả' : 'View All'}</span>
            <span>→</span>
          </button>
        </div>

        <div className="space-y-2 sm:space-y-2.5">
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-9 bg-white/[0.04] rounded-lg" />
              <div className="h-9 bg-white/[0.04] rounded-lg" />
              <div className="h-9 bg-white/[0.04] rounded-lg" />
              <div className="h-9 bg-white/[0.04] rounded-lg" />
            </div>
          ) : topLeaders.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 font-mono">
              {locale === 'vi' ? 'Chưa có dữ liệu xếp hạng.' : 'No ranking data yet.'}
            </div>
          ) : (
            topLeaders.map((leader, index) => {
              const rankColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-400';
              const border = index === 0 ? 'border-amber-500/30' : 'border-white/[0.06]';

              return (
                <div
                  key={leader.userId}
                  onClick={() => onOpenProfile?.(leader.userId)}
                  className={`flex items-center justify-between p-2 sm:p-2.5 bg-[#121622] hover:bg-[#181d2c] rounded-lg border ${border} transition cursor-pointer`}
                  title={locale === 'vi' ? 'Bấm để xem hồ sơ người chơi' : 'Click to view player profile'}
                >
                  <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
                    <div className="w-5 flex items-center justify-center shrink-0">
                      {index === 0 ? (
                        <Crown size={15} className="text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                      ) : index === 1 ? (
                        <Medal size={15} className="text-slate-300" />
                      ) : index === 2 ? (
                        <Medal size={15} className="text-amber-600" />
                      ) : (
                        <span className="font-mono text-xs font-bold text-slate-500">#{index + 1}</span>
                      )}
                    </div>
                    {leader.avatar ? (
                      <img
                        src={leader.avatar}
                        className={`w-6.5 h-6.5 rounded-full ${
                          index === 0 ? 'border-amber-400' : 'border-white/[0.1]'
                        } border object-cover shrink-0`}
                        alt={leader.username}
                      />
                    ) : (
                      <div className="w-6.5 h-6.5 rounded-full bg-violet-600 flex items-center justify-center font-mono font-bold text-[10px] text-white shrink-0">
                        {leader.username.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-slate-100 truncate">{leader.username}</span>
                      {leader.equippedTitle && (
                        <EquippedTitleBadge title={leader.equippedTitle} locale={locale} size="xs" />
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-mono font-bold ${rankColor} shrink-0`}
                  >
                    {numberFormatter.format(leader.rating)} Rating
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="border-t border-white/[0.06] pt-3 mt-4 text-[10px] sm:text-[11px] text-slate-400 font-mono font-bold uppercase tracking-wider flex items-center justify-between">
        <span>{locale === 'vi' ? 'Bảng xếp hạng toàn cầu' : 'Global Leaderboard'}</span>
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
          LIVE
        </span>
      </div>
    </div>
  );
});
