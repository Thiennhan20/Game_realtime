'use client';

import { memo } from 'react';

import { Bot, CheckCircle2, Loader2, Users, X, Zap } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';

interface ModeSelectorProps {
  locale: Locale;
  t: Translator;
  roomId: string;
  isQuickMatching?: boolean;
  quickMatchElapsedSeconds?: number;
  quickMatchFoundRoom?: { roomId: string; hostName: string } | null;
  onQuickMatch: () => void;
  onCancelQuickMatch?: () => void;
  onCreateRoom: () => void;
  onCreateAiRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onRoomIdChange: (roomId: string) => void;
}

export const ModeSelector = memo(function ModeSelector({
  locale,
  t,
  roomId,
  isQuickMatching = false,
  quickMatchElapsedSeconds = 0,
  quickMatchFoundRoom = null,
  onQuickMatch,
  onCancelQuickMatch,
  onCreateRoom,
  onCreateAiRoom,
  onJoinRoom,
  onRoomIdChange,
}: ModeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-black">{t('chooseMode')}</h2>
        <p className="text-xs sm:text-sm text-slate-400">{t('chooseModeDesc')}</p>
      </div>

      {/* Primary Quick Matchmaking Area */}
      {quickMatchFoundRoom ? (
        <div className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-emerald-500/25 via-teal-500/25 to-emerald-500/25 border border-emerald-400/60 text-emerald-200 font-black rounded-xl shadow-[0_6px_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 text-xs sm:text-sm animate-pulse">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          <span>
            {locale === 'vi'
              ? `Đã tìm được phòng (#${quickMatchFoundRoom.roomId}) — Đang vào...`
              : `Room found (#${quickMatchFoundRoom.roomId}) — Joining now...`}
          </span>
        </div>
      ) : isQuickMatching ? (
        <div className="space-y-2">
          <div className="w-full py-2.5 sm:py-3 px-3.5 bg-slate-950/90 border border-amber-400/50 rounded-xl shadow-[0_6px_20px_rgba(245,158,11,0.16)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Loader2 size={16} className="shrink-0 text-amber-400 animate-spin" />
              <span className="text-xs sm:text-sm font-extrabold text-amber-200 truncate">
                {locale === 'vi' ? 'Đang tìm phòng...' : 'Searching for room...'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 font-mono text-xs font-black text-amber-300 shrink-0">
                {quickMatchElapsedSeconds}s
              </span>
            </div>

            <button
              type="button"
              onClick={onCancelQuickMatch}
              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] sm:text-xs font-extrabold flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <X size={13} />
              <span>{locale === 'vi' ? 'Hủy tìm' : 'Cancel'}</span>
            </button>
          </div>

          {quickMatchElapsedSeconds >= 30 && (
            <div className="p-2.5 rounded-xl bg-cyan-950/35 border border-cyan-500/35 space-y-2 text-center animate-fadeIn">
              <p className="text-[11px] sm:text-xs font-semibold text-cyan-200/90 leading-relaxed">
                {locale === 'vi'
                  ? 'Bạn có muốn chuyển qua chơi với máy để chờ?'
                  : 'Would you like to switch to playing vs Bot while waiting?'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onCancelQuickMatch?.();
                  onCreateAiRoom();
                }}
                className="w-full py-2 px-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold rounded-lg shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bot size={15} className="shrink-0" />
                <span>
                  {locale === 'vi' ? 'Chuyển qua chơi với máy' : 'Switch to Play vs Bot'}
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onQuickMatch}
          className="group relative w-full py-3 sm:py-3.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:from-amber-400 hover:via-orange-500 hover:to-pink-500 text-white font-black rounded-xl shadow-[0_6px_20px_rgba(245,158,11,0.25)] hover:shadow-[0_8px_24px_rgba(245,158,11,0.38)] transition-all duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider cursor-pointer active:scale-[0.99] border border-amber-300/35"
        >
          <Zap size={16} className="shrink-0 fill-current" />
          <span>
            {locale === 'vi' ? 'Ghép Trận Nhanh' : 'Quick Match'}
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCreateRoom}
          className="w-full py-2.5 px-3 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 hover:border-purple-400/60 text-purple-200 hover:text-white font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm cursor-pointer active:scale-[0.99]"
        >
          <Users size={16} className="shrink-0 text-purple-400" />
          <span className="truncate">{t('playVsFriends')}</span>
        </button>
        <button
          type="button"
          onClick={onCreateAiRoom}
          className="w-full py-2.5 px-3 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 hover:border-cyan-400/60 text-cyan-200 hover:text-white font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm cursor-pointer active:scale-[0.99]"
        >
          <Bot size={16} className="shrink-0 text-cyan-400" />
          <span className="truncate">{t('playVsBot')}</span>
        </button>
      </div>

      <div className="relative flex items-center justify-center pt-0.5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800/90" />
        </div>
        <span className="relative px-3 bg-slate-950/90 text-slate-500 text-[10px] font-bold uppercase tracking-wider rounded">
          {t('orJoin')}
        </span>
      </div>

      <div className="flex flex-row gap-2">
        <input
          type="text"
          placeholder={t('enterRoomId')}
          aria-label={t('enterRoomId')}
          value={roomId}
          onChange={(event) => onRoomIdChange(event.target.value)}
          className="flex-1 w-full bg-slate-950/90 border border-slate-800 hover:border-purple-500/50 px-3.5 py-2 rounded-xl text-center text-sm sm:text-base font-mono font-bold placeholder:font-sans placeholder:text-xs placeholder-slate-500 uppercase min-w-0 transition-all duration-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onJoinRoom(roomId)}
          className="px-4 sm:px-5 py-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/70 text-slate-100 hover:text-white text-xs sm:text-sm font-bold rounded-xl transition duration-200 cursor-pointer shrink-0"
        >
          {t('join')}
        </button>
      </div>
    </div>
  );
});
