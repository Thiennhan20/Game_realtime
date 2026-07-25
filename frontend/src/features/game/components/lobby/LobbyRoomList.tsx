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
  onViewAll: () => void;
}

export function LobbyRoomList({
  rooms,
  isRefreshing,
  locale,
  t,
  onRefresh,
  onJoin,
  onViewAll,
}: LobbyRoomListProps) {
  return (
    <div className="space-y-2.5 pt-1 sm:pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
          <Users size={12} className="sm:w-3.5 sm:h-3.5 text-purple-400" />
          <span>{t('lobbyRooms')}</span>
          <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded-md text-[10px] font-mono font-bold">
            {rooms.length}
          </span>
        </h3>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`flex items-center space-x-1.5 px-3 py-1 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer active:scale-95 border ${
            isRefreshing
              ? 'bg-purple-950/60 border-purple-500/60 text-purple-300 shadow-md shadow-purple-900/20'
              : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800/80 hover:border-purple-500/40 text-slate-300 hover:text-white'
          }`}
          title={locale === 'vi' ? 'Làm mới danh sách phòng' : 'Refresh room list'}
        >
          <RefreshCw
            size={13}
            className={`shrink-0 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`}
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

      {rooms.length === 0 ? (
        <div className="text-center py-4 border border-dashed border-slate-800/60 rounded-xl text-slate-600 text-xs sm:text-sm">
          {t('noRooms')}
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.slice(0, 2).map((room) => (
            <LobbyRoomCard key={room.roomId} room={room} locale={locale} onJoin={onJoin} />
          ))}
          <button
            onClick={onViewAll}
            className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-purple-200 text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm mt-2"
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
  );
}
