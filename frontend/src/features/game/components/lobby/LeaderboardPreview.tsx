import { Trophy } from 'lucide-react';

import type { Locale } from '../../types';

const leaders = [
  {
    rank: '👑',
    name: 'Nhân Nguyễn',
    points: '2,450 LP',
    image:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    border: 'border-amber-500/30',
    rankColor: 'text-amber-400',
    pointsColor: 'text-amber-400',
  },
  {
    rank: '🥈',
    name: 'Superman',
    points: '2,310 LP',
    image:
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    border: 'border-slate-800',
    rankColor: 'text-slate-300',
    pointsColor: 'text-slate-300',
  },
  {
    rank: '🥉',
    name: 'Thị Tư Hổ',
    points: '2,180 LP',
    image:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
    border: 'border-slate-800',
    rankColor: 'text-amber-600',
    pointsColor: 'text-amber-500/80',
  },
];

interface LeaderboardPreviewProps {
  locale: Locale;
  onViewAll: () => void;
}

export function LeaderboardPreview({ locale, onViewAll }: LeaderboardPreviewProps) {
  return (
    <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-850">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Trophy size={14} className="text-amber-400" />
            <span>{locale === 'vi' ? 'BXH Cao Thủ' : 'Top Ranking'}</span>
          </h3>
          <button
            onClick={onViewAll}
            className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition cursor-pointer flex items-center gap-0.5"
          >
            <span>{locale === 'vi' ? 'Xem tất cả' : 'View All'}</span>
            <span>→</span>
          </button>
        </div>

        <div className="space-y-2">
          {leaders.map((leader, index) => (
            <div
              key={leader.name}
              className={`flex items-center justify-between p-2 bg-slate-950/60 rounded-xl border ${leader.border}`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <span className={`text-xs font-extrabold ${leader.rankColor} w-4 text-center`}>
                  {leader.rank}
                </span>
                <img
                  src={leader.image}
                  className={`w-6 h-6 rounded-full ${
                    index === 0 ? 'border-amber-400' : 'border-slate-700'
                  } border object-cover shrink-0`}
                  alt={`Top ${index + 1}`}
                />
                <span className="text-xs font-bold text-slate-100 truncate">{leader.name}</span>
              </div>
              <span
                className={`text-[11px] font-mono font-extrabold ${leader.pointsColor} shrink-0`}
              >
                {leader.points}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-850 pt-3 mt-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center justify-between">
        <span>{locale === 'vi' ? 'Bảng xếp hạng toàn cầu' : 'Global Leaderboard'}</span>
        <span className="text-purple-400 font-mono">Live</span>
      </div>
    </div>
  );
}
