import { Check, Copy, KeyRound, LogOut } from 'lucide-react';

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
  onCopyRoomId,
  onLeaveRoom,
}: ActiveRoomHeaderProps) {
  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900/70 border border-slate-800/80 rounded-xl sm:rounded-2xl shadow-lg shrink-0">
      <div className="flex-1 min-w-0">
        <span className="hidden xs:block text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {t('roomArena')}
        </span>
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
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-6">
        <div className="w-[92px] sm:w-[244px] flex items-center justify-center space-x-1.5 sm:space-x-2.5 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold max-w-[80px] truncate text-slate-200">{me?.username}</p>
            <p className="text-[10px] text-purple-400 font-semibold uppercase">{t('you')}</p>
          </div>
          {me?.avatar ? (
            <img
              src={me.avatar}
              alt={me.username}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-purple-500 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {me?.username.slice(0, 2)}
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
                  {opponent.username.slice(0, 2)}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold max-w-[80px] truncate text-slate-200">
                  {opponent.username}
                </p>
                <p className="text-[10px] text-pink-400 font-semibold uppercase">{t('enemy')}</p>
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
          title={t('backToLobby')}
        >
          <LogOut size={14} className="sm:w-[16px] sm:h-[16px]" />
        </button>
      </div>
    </div>
  );
}
