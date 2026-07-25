import { Clock, Users } from 'lucide-react';

import type { LobbyRoom, Locale } from '../../types';
import { formatElapsedTime } from '../../utils';

interface LobbyRoomCardProps {
  room: LobbyRoom;
  locale: Locale;
  onJoin: (roomId: string) => void;
}

export function LobbyRoomCard({ room, locale, onJoin }: LobbyRoomCardProps) {
  const isFull =
    room.playerCount >= 2 || (Boolean(room.state) && room.state !== 'WAITING_FOR_PLAYERS');

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
        isFull
          ? 'bg-slate-950/40 border-slate-850 opacity-75'
          : 'bg-slate-950/70 hover:bg-slate-950 border-slate-800/80 hover:border-purple-500/50 shadow-md'
      }`}
    >
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
        {room.hostAvatar ? (
          <img
            src={room.hostAvatar}
            alt={room.hostName}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-700 object-cover shrink-0"
          />
        ) : (
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-extrabold text-xs uppercase text-white shrink-0 border border-slate-700">
            {room.hostName ? room.hostName.slice(0, 2) : 'P'}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-400">
              #{room.roomId}
            </span>
            {isFull ? (
              <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-md text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                {locale === 'vi' ? 'Đã đầy' : 'Full'}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-md text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {locale === 'vi' ? 'Đang đợi' : 'Waiting'}
              </span>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-slate-300 font-medium truncate">
              {locale === 'vi' ? 'Chủ phòng:' : 'Host:'}{' '}
              <strong className="text-white font-bold">{room.hostName}</strong>
            </p>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <span className="flex items-center space-x-1 shrink-0">
                <Users size={11} className="text-slate-500" />
                <span>{room.playerCount}/2</span>
              </span>
              <span className="flex items-center space-x-1 shrink-0">
                <Clock size={11} className="text-slate-500" />
                <span>{formatElapsedTime(room.createdAt, locale)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0">
        {!isFull ? (
          <button
            onClick={() => onJoin(room.roomId)}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition duration-200 cursor-pointer"
          >
            {locale === 'vi' ? 'Tham gia' : 'Join'}
          </button>
        ) : (
          <button
            disabled
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-900 border border-slate-800 text-slate-500 font-bold text-xs sm:text-sm rounded-xl cursor-not-allowed opacity-60"
          >
            {locale === 'vi' ? 'Đã đầy' : 'Full'}
          </button>
        )}
      </div>
    </div>
  );
}
