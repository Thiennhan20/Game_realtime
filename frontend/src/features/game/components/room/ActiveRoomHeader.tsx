import { Check, Copy, Eye, KeyRound, LogOut } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale, Player, Room } from '../../types';

interface ActiveRoomHeaderProps {
  room: Room;
  me: Player | null;
  opponent: Player | null;
  mySecret: string;
  copied: boolean;
  locale: Locale;
  t: Translator;
  isSpectator?: boolean;
  spectatorCount?: number;
  onCopyRoomId: () => void;
  onLeaveRoom: () => void;
}

export function ActiveRoomHeader({
  room,
  me,
  opponent,
  mySecret,
  copied,
  locale,
  t,
  isSpectator = false,
  spectatorCount = 0,
  onCopyRoomId,
  onLeaveRoom,
}: ActiveRoomHeaderProps) {
  const effectiveSpectatorCount = spectatorCount || room.spectatorCount || 0;

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900/70 border border-slate-800/80 rounded-xl sm:rounded-2xl shadow-lg shrink-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="hidden xs:block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('roomArena')}
          </span>
          {isSpectator && (
            <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-full text-[10px] font-bold flex items-center gap-1">
              <Eye size={10} />
              <span>{t('spectator')}</span>
            </span>
          )}
          {effectiveSpectatorCount > 0 && !isSpectator && (
            <span className="px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/30 text-purple-300 rounded-full text-[10px] font-bold flex items-center gap-1">
              <Eye size={10} />
              <span>{effectiveSpectatorCount}</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          <h2 className="font-mono text-base sm:text-lg font-extrabold text-purple-400">
            {room.roomId}
          </h2>
          <button
            onClick={onCopyRoomId}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
            title={t('copyRoomId')}
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </button>
        </div>
        {!isSpectator ? (
          <div
            className={`mt-1 flex items-center space-x-1 text-[10px] sm:text-xs text-slate-400 ${
              room.state === 'PLAYING' ? 'visible' : 'invisible'
            }`}
            aria-hidden={room.state !== 'PLAYING'}
          >
            <KeyRound size={11} className="text-purple-400 shrink-0" />
            <span>{locale === 'vi' ? 'Mã của bạn:' : 'Your Secret:'}</span>
            <span className="font-mono font-black text-purple-300 tracking-wider bg-purple-500/10 px-1.5 py-0.5 rounded">
              {mySecret || '----'}
            </span>
          </div>
        ) : (
          <div className="mt-1 flex items-center space-x-1 text-[10px] sm:text-xs text-blue-300 font-semibold">
            <Eye size={11} className="text-blue-400 shrink-0" />
            <span>{t('spectatorMode')}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-6">
        <div className="w-[110px] sm:w-[270px] flex items-center justify-center space-x-1.5 sm:space-x-2.5 shrink-0">
          <div className="hidden sm:block text-right">
            <div className="flex items-center justify-end gap-1">
              <p className="text-xs font-bold max-w-[80px] sm:max-w-[120px] truncate text-slate-200">{me?.username}</p>
              {typeof me?.currentWinStreak === 'number' && me.currentWinStreak >= 2 && (
                <span
                  className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black animate-pulse"
                  title={`${t('winStreak')}: ${me.currentWinStreak}`}
                >
                  🔥{me.currentWinStreak}
                </span>
              )}
            </div>
            {!isSpectator && (
              <p className="text-[10px] text-purple-400 font-semibold uppercase">
                {t('you')}
              </p>
            )}
          </div>
          {me?.avatar ? (
            <img
              src={me.avatar}
              alt={me.username}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-purple-500 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {me?.username.slice(0, 2) || 'P1'}
            </div>
          )}

          <span className="text-slate-700 font-bold text-xs sm:text-sm">VS</span>

          {opponent ? (
            <>
              {opponent.avatar ? (
                <img
                  src={opponent.avatar}
                  alt={opponent.username}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-pink-500 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-pink-600 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {opponent.username.slice(0, 2) || 'P2'}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold max-w-[80px] sm:max-w-[120px] truncate text-slate-200">
                    {opponent.username}
                  </p>
                  {typeof opponent?.currentWinStreak === 'number' && opponent.currentWinStreak >= 2 && (
                    <span
                      className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black animate-pulse"
                      title={`${t('winStreak')}: ${opponent.currentWinStreak}`}
                    >
                      🔥{opponent.currentWinStreak}
                    </span>
                  )}
                </div>
                {!isSpectator && (
                  <p className="text-[10px] text-pink-400 font-semibold uppercase">
                    {t('enemy')}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-1.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-800 border border-slate-700 border-dashed rounded-full flex items-center justify-center text-slate-500 shrink-0">
                ?
              </div>
              <p className="hidden sm:block text-xs text-slate-500 font-medium">
                {locale === 'vi' ? 'Đang chờ...' : 'Waiting...'}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onLeaveRoom}
          className="p-1.5 sm:p-2 bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 rounded-lg sm:rounded-xl text-rose-400 hover:text-white shadow-md shadow-rose-950/20 transition-colors duration-200 cursor-pointer"
          title={isSpectator ? (locale === 'vi' ? 'Thoát chế độ xem' : 'Exit Spectate') : t('backToLobby')}
        >
          <LogOut size={14} className="sm:w-[16px] sm:h-[16px]" />
        </button>
      </div>
    </div>
  );
}
