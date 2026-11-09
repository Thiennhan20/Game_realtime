import { memo } from 'react';
import { Clock, Eye, Users } from 'lucide-react';

import type { LobbyRoom, Locale } from '../../types';
import { formatElapsedTime } from '../../utils';
import { EquippedTitleBadge } from '../common/EquippedTitleBadge';

interface LobbyRoomCardProps {
  room: LobbyRoom;
  locale: Locale;
  onJoin: (roomId: string) => void;
  onSpectate?: (roomId: string) => void;
  onOpenProfile?: (userId: string | null) => void;
}

export const LobbyRoomCard = memo(function LobbyRoomCard({
  room,
  locale,
  onJoin,
  onSpectate,
  onOpenProfile,
}: LobbyRoomCardProps) {
  const isFull =
    room.playerCount >= 2 || (Boolean(room.state) && room.state !== 'WAITING_FOR_PLAYERS');

  const handleHostClick = () => {
    if (room.hostId && onOpenProfile) {
      onOpenProfile(room.hostId);
    }
  };

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
        isFull
          ? 'bg-[#0d1017]/60 border-white/[0.04] opacity-80'
          : 'bg-[#121622] hover:bg-[#181d2c] border-white/[0.08] hover:border-violet-500/40 shadow-sm'
      }`}
    >
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
        {room.hostAvatar ? (
          <img
            src={room.hostAvatar}
            alt={room.hostName}
            onClick={handleHostClick}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/[0.1] object-cover shrink-0 ${
              room.hostId ? 'cursor-pointer hover:border-violet-400 hover:scale-105 transition-all' : ''
            }`}
            title={room.hostId ? (locale === 'vi' ? 'Bấm để xem hồ sơ chủ phòng' : 'View host profile') : undefined}
          />
        ) : (
          <div
            onClick={handleHostClick}
            className={`w-9 h-9 sm:w-10 sm:h-10 bg-violet-600 rounded-full flex items-center justify-center font-mono font-bold text-xs uppercase text-white shrink-0 border border-white/[0.1] ${
              room.hostId ? 'cursor-pointer hover:border-violet-400 hover:scale-105 transition-all' : ''
            }`}
            title={room.hostId ? (locale === 'vi' ? 'Bấm để xem hồ sơ chủ phòng' : 'View host profile') : undefined}
          >
            {room.hostName ? room.hostName.slice(0, 2) : 'P'}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs sm:text-sm font-bold text-amber-300">
              #{room.roomId}
            </span>
            {isFull ? (
              <span className="px-2 py-0.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-md font-mono text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                {room.state === 'PLAYING'
                  ? locale === 'vi'
                    ? 'Đang đấu'
                    : 'Playing'
                  : locale === 'vi'
                    ? 'Đã đầy'
                    : 'Full'}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 rounded-md font-mono text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {locale === 'vi' ? 'Đang đợi' : 'Waiting'}
              </span>
            )}
            {typeof room.spectatorCount === 'number' && room.spectatorCount > 0 && (
              <span
                className={`px-1.5 py-0.5 border rounded-md font-mono text-[10px] font-bold flex items-center gap-1 ${
                  room.spectatorCount >= 10
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                }`}
              >
                <Eye size={10} />
                <span>{room.spectatorCount}/10</span>
              </span>
            )}
          </div>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 font-medium">
              <span className="truncate">
                {locale === 'vi' ? 'Chủ phòng:' : 'Host:'}{' '}
                <strong
                  onClick={handleHostClick}
                  className={`text-white font-bold ${room.hostId ? 'cursor-pointer hover:text-violet-300 transition' : ''}`}
                >
                  {room.hostName}
                </strong>
              </span>
              {room.hostEquippedTitle && (
                <EquippedTitleBadge title={room.hostEquippedTitle} locale={locale} size="xs" />
              )}
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center space-x-1 shrink-0">
                <Users size={11} className="text-violet-400" />
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
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-mono font-bold text-xs sm:text-sm rounded-lg border border-violet-400/30 shadow-sm transition duration-200 cursor-pointer"
          >
            {locale === 'vi' ? 'Tham gia' : 'Join'}
          </button>
        ) : onSpectate ? (
          (room.spectatorCount || 0) >= 10 ? (
            <button
              disabled
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#0d1017] border border-white/[0.06] text-slate-500 font-mono font-bold text-xs sm:text-sm rounded-lg cursor-not-allowed opacity-50 flex items-center gap-1.5"
            >
              <Eye size={13} />
              <span>{locale === 'vi' ? 'Đầy người xem' : 'Full (10/10)'}</span>
            </button>
          ) : (
            <button
              onClick={() => onSpectate(room.roomId)}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-xs sm:text-sm rounded-lg transition duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <Eye size={13} />
              <span>{locale === 'vi' ? 'Xem trận' : 'Spectate'}</span>
            </button>
          )
        ) : (
          <button
            disabled
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#0d1017] border border-white/[0.06] text-slate-500 font-mono font-bold text-xs sm:text-sm rounded-lg cursor-not-allowed opacity-50"
          >
            {locale === 'vi' ? 'Đã đầy' : 'Full'}
          </button>
        )}
      </div>
    </div>
  );
});
