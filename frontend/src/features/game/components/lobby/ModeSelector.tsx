'use client';

import { memo } from 'react';
import type { ClipboardEvent } from 'react';

import { Bot, CheckCircle2, Loader2, Users, X, Zap } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';
import { normalizeRoomId } from '../../utils';

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
  onOpenDailyChallenge?: () => void;
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
  onOpenDailyChallenge,
  onJoinRoom,
  onRoomIdChange,
}: ModeSelectorProps) {
  const normalizedRoomId = normalizeRoomId(roomId);
  const isValidRoomId = Boolean(normalizedRoomId);

  const handleRoomInputChange = (inputValue: string) => {
    const upper = inputValue.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (!upper) {
      onRoomIdChange('');
      return;
    }

    // Allow backspacing cleanly when at 'G' or 'G-'
    if (roomId.startsWith('G') && (upper === 'G' || (roomId === 'G-' && upper === 'G-'))) {
      if (upper === 'G') {
        onRoomIdChange('');
        return;
      }
    }

    // Check if input has 'G' (whether typed G, G-, or pasted with duplicate G-)
    const hasG = upper.includes('G');
    const digits = upper.replace(/\D/g, '').slice(0, 6);

    if (hasG) {
      onRoomIdChange(digits.length > 0 ? `G-${digits}` : 'G-');
      return;
    }

    // If typing numbers only: strictly limit to 6 digits!
    onRoomIdChange(digits);
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    if (!pastedText) return;

    const upper = pastedText.toUpperCase().trim();
    const digits = upper.replace(/\D/g, '').slice(0, 6);
    const hasG = roomId.startsWith('G') || upper.includes('G');

    if (hasG) {
      onRoomIdChange(digits.length > 0 ? `G-${digits}` : 'G-');
    } else {
      onRoomIdChange(digits);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-white">{t('chooseMode')}</h2>
        <p className="text-xs sm:text-sm text-slate-400 font-sans">{t('chooseModeDesc')}</p>
      </div>

      {/* Primary Quick Matchmaking Area */}
      {quickMatchFoundRoom ? (
        <div className="w-full py-2.5 sm:py-3 px-4 bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-mono font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm animate-pulse">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          <span>
            {locale === 'vi'
              ? `Đã tìm thấy phòng (#${quickMatchFoundRoom.roomId}) — Đang kết nối...`
              : `Room match (#${quickMatchFoundRoom.roomId}) — Connecting...`}
          </span>
        </div>
      ) : isQuickMatching ? (
        <div className="space-y-2">
          <div className="w-full py-2.5 sm:py-3 px-3.5 bg-[#0d1017] border border-amber-400/40 rounded-lg shadow-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Loader2 size={16} className="shrink-0 text-amber-400 animate-spin" />
              <span className="text-xs sm:text-sm font-mono font-bold text-amber-200 truncate">
                {locale === 'vi' ? 'ĐANG TÌM ĐỐI THỦ...' : 'SCANNING OPPONENTS...'}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 font-mono text-xs font-bold text-amber-300 shrink-0">
                {quickMatchElapsedSeconds}s
              </span>
            </div>

            <button
              type="button"
              onClick={onCancelQuickMatch}
              className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              <X size={13} />
              <span>{locale === 'vi' ? 'HỦY' : 'CANCEL'}</span>
            </button>
          </div>

          {quickMatchElapsedSeconds >= 30 && (
            <div className="p-2.5 rounded-lg bg-[#10141e] border border-white/[0.08] space-y-2 text-center">
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-sans">
                {locale === 'vi'
                  ? 'Đang ít người chơi trực tuyến, bạn có muốn luyện tập với Bot?'
                  : 'Low activity, would you like to duel against AI Bot?'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onCancelQuickMatch?.();
                  onCreateAiRoom();
                }}
                className="w-full py-2 px-3.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs font-mono font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Bot size={15} className="shrink-0" />
                <span>
                  {locale === 'vi' ? 'Đấu với Bot' : 'Play vs Bot'}
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={onQuickMatch}
          className="group relative w-full py-3 sm:py-3.5 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-mono font-bold rounded-lg border border-violet-400/30 shadow-md shadow-violet-600/20 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider cursor-pointer active:scale-[0.99]"
        >
          <Zap size={16} className="shrink-0 text-amber-300 fill-amber-300" />
          <span>
            {locale === 'vi' ? 'Ghép Trận Nhanh' : 'Quick Matchmaking'}
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCreateRoom}
          className="w-full py-2.5 px-3 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-violet-500/40 text-slate-200 hover:text-white font-mono font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-[0.99]"
        >
          <Users size={15} className="shrink-0 text-violet-400" />
          <span className="truncate">{t('playVsFriends')}</span>
        </button>
        <button
          type="button"
          onClick={onCreateAiRoom}
          className="w-full py-2.5 px-3 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] hover:border-cyan-500/40 text-slate-200 hover:text-white font-mono font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer active:scale-[0.99]"
        >
          <Bot size={15} className="shrink-0 text-cyan-400" />
          <span className="truncate">{t('playVsBot')}</span>
        </button>
      </div>

      <div className="relative flex items-center justify-center pt-0.5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
        <span className="relative px-3 bg-[#0d1017] text-slate-500 text-[10px] font-mono font-bold uppercase tracking-wider rounded">
          {t('orJoin')}
        </span>
      </div>

      <div className="flex flex-row gap-2">
        <input
          type="text"
          placeholder={t('enterRoomId')}
          aria-label={t('enterRoomId')}
          value={roomId}
          maxLength={roomId.length > 0 && !roomId.startsWith('G') ? 6 : 8}
          onChange={(event) => handleRoomInputChange(event.target.value)}
          onPaste={handlePaste}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && isValidRoomId) {
              event.preventDefault();
              onJoinRoom(normalizedRoomId || roomId.trim());
            }
          }}
          className={`flex-1 w-full bg-[#0d1017] border px-3.5 py-2.5 rounded-lg text-center text-base font-mono font-bold placeholder:font-sans placeholder:text-xs placeholder-slate-500 uppercase min-w-0 transition-all focus:outline-none ${
            isValidRoomId
              ? 'border-violet-400 ring-2 ring-violet-500/25 text-violet-100 shadow-sm shadow-violet-500/20'
              : 'border-white/[0.08] hover:border-white/[0.15] text-slate-100 focus:border-violet-500/60'
          }`}
        />
        <button
          type="button"
          disabled={!isValidRoomId}
          onClick={() => {
            if (isValidRoomId) {
              onJoinRoom(normalizedRoomId || roomId.trim());
            }
          }}
          className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-mono font-bold rounded-lg transition-all shrink-0 ${
            isValidRoomId
              ? 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-sm shadow-violet-500/25 border border-violet-400/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
              : 'bg-white/[0.03] border border-white/[0.06] text-slate-600 cursor-not-allowed opacity-50'
          }`}
        >
          {t('join')}
        </button>
      </div>
    </div>
  );
});
