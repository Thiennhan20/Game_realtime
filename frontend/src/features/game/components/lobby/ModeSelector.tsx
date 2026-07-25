'use client';

import { Bot, Users } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';

interface ModeSelectorProps {
  locale: Locale;
  t: Translator;
  roomId: string;
  onCreateRoom: () => void;
  onCreateAiRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onRoomIdChange: (roomId: string) => void;
}

export function ModeSelector({
  locale,
  t,
  roomId,
  onCreateRoom,
  onCreateAiRoom,
  onJoinRoom,
  onRoomIdChange,
}: ModeSelectorProps) {
  return (
    <>
      <div className="text-center space-y-1 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-black">{t('chooseMode')}</h2>
        <p className="text-xs sm:text-sm text-slate-400">{t('chooseModeDesc')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          onClick={onCreateRoom}
          className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold rounded-xl shadow-lg transition duration-200 flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer"
        >
          <Users size={18} className="shrink-0" />
          <span>{locale === 'vi' ? 'Chơi với bạn' : 'Play vs Friends'}</span>
        </button>
        <button
          onClick={onCreateAiRoom}
          className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-extrabold rounded-xl shadow-lg transition duration-200 flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer border border-cyan-400/30"
        >
          <Bot size={18} className="shrink-0" />
          <span>{locale === 'vi' ? 'Chơi với máy' : 'Play vs Bot'}</span>
        </button>
      </div>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <span className="relative px-3 bg-slate-950 text-slate-500 text-[10px] font-bold uppercase">
          {t('orJoin')}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder={t('enterRoomId')}
          value={roomId}
          onChange={(event) => onRoomIdChange(event.target.value)}
          className="flex-1 w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none px-4 py-2.5 rounded-xl text-center text-sm sm:text-base font-mono font-bold placeholder:font-sans placeholder:text-xs sm:placeholder:text-sm placeholder-slate-600 uppercase min-w-0"
        />
        <button
          onClick={() => onJoinRoom(roomId)}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition duration-200 cursor-pointer shrink-0"
        >
          {t('join')}
        </button>
      </div>
    </>
  );
}
