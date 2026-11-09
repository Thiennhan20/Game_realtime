import { memo } from 'react';
import { Grid, RefreshCw, Users } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { LobbyRoom, Locale } from '../../types';
import { LobbyRoomCard } from './LobbyRoomCard';

interface LobbyRoomListProps {
  rooms: LobbyRoom[];
  isRefreshing: boolean;
  locale: Locale;
  t: Translator;
  onRefresh: () => void;
  onJoin: (roomId: string) => void;
  onSpectate?: (roomId: string) => void;
  onViewAll: () => void;
  onOpenProfile?: (userId: string | null) => void;
}

export const LobbyRoomList = memo(function LobbyRoomList({
  rooms,
  isRefreshing,
  locale,
  t,
  onRefresh,
  onJoin,
  onSpectate,
  onViewAll,
  onOpenProfile,
}: LobbyRoomListProps) {
  return (
    <div className="space-y-2.5 pt-1 sm:pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
          <Users size={12} className="sm:w-3.5 sm:h-3.5 text-violet-400" />
          <span>{t('lobbyRooms')}</span>
          <span className="px-1.5 py-0.2 bg-violet-500/15 border border-violet-500/25 text-violet-300 rounded text-[10px] font-mono font-bold">
            {rooms.length}
          </span>
        </h3>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`flex items-center space-x-1.5 px-3 py-1 text-[10px] sm:text-xs font-mono font-bold rounded-lg transition-all border ${
            isRefreshing
              ? 'bg-violet-950/40 border-violet-500/50 text-violet-300 cursor-wait opacity-80'
              : 'bg-[#121622] hover:bg-[#181d2c] border-white/[0.08] hover:border-violet-500/40 text-slate-300 hover:text-white cursor-pointer active:scale-95'
          }`}
          title={locale === 'vi' ? 'Làm mới danh sách phòng' : 'Refresh room list'}
        >
          <RefreshCw
            size={12}
            className={`shrink-0 transition-transform ${isRefreshing ? 'animate-spin text-violet-400' : ''}`}
          />
          <span>
            {isRefreshing
              ? locale === 'vi'
                ? 'Đang làm mới...'
                : 'Refreshing...'
              : locale === 'vi'
                ? 'Làm mới'
                : 'Refresh'}
          </span>
        </button>
      </div>

      <div className={`transition-opacity duration-300 ${isRefreshing ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        {rooms.length === 0 ? (
          <div className="text-center py-4 border border-dashed border-slate-800/60 rounded-xl text-slate-600 text-xs sm:text-sm">
            {t('noRooms')}
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.slice(0, 2).map((room) => (
              <LobbyRoomCard
                key={room.roomId}
                room={room}
                locale={locale}
                onJoin={onJoin}
                onSpectate={onSpectate}
                onOpenProfile={onOpenProfile}
              />
            ))}
            <button
              onClick={onViewAll}
              className="w-full py-2 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-violet-500/40 text-violet-300 hover:text-white text-xs font-mono font-bold rounded-lg transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm mt-2"
            >
              <Grid size={14} />
              <span>
                {locale === 'vi'
                  ? `Xem tất cả phòng (${rooms.length})`
                  : `View All Rooms (${rooms.length})`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
