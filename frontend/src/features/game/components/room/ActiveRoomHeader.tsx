import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Eye,
  KeyRound,
  LogOut,
  Volume2,
  VolumeX,
} from 'lucide-react';

import type { Translator } from '../../i18n';
import { sound } from '../../sound';
import type { FloatingEmote, Locale, Player, Room } from '../../types';
import { EquippedTitleBadge } from '../common/EquippedTitleBadge';
import { FloatingEmoteOverlay } from '../common/FloatingEmoteOverlay';

interface ActiveRoomHeaderProps {
  room: Room;
  me: Player | null;
  opponent: Player | null;
  mySecret: string;
  copied: boolean;
  locale: Locale;
  t: Translator;
  isSpectator?: boolean;
  isReconnecting?: boolean;
  spectatorCount?: number;
  floatingEmotes?: FloatingEmote[];
  isOpponentActiveTurn?: boolean;
  lastOpponentActivityAt?: number;
  opponentIsVisible?: boolean;
  onCopyRoomId: () => void;
  onLeaveRoom: () => void;
  onOpenProfile?: (userId: string | null) => void;
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
  isReconnecting = false,
  spectatorCount = 0,
  floatingEmotes = [],
  isOpponentActiveTurn = false,
  lastOpponentActivityAt = Date.now(),
  opponentIsVisible = true,
  onCopyRoomId,
  onLeaveRoom,
  onOpenProfile,
}: ActiveRoomHeaderProps) {
  const effectiveSpectatorCount = spectatorCount || room.spectatorCount || 0;
  const isAiRoom = Boolean(room.isAiRoom);
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [headerCurrentTime, setHeaderCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!isOpponentActiveTurn) return;
    const timer = setInterval(() => setHeaderCurrentTime(Date.now()), 2000);
    return () => clearInterval(timer);
  }, [isOpponentActiveTurn]);

  const isOpponentActive = headerCurrentTime - lastOpponentActivityAt < 60000;

  const myEmotes = (floatingEmotes || []).filter(
    (e) => me?.userId && String(e.userId) === String(me.userId)
  );
  const opponentEmotes = (floatingEmotes || []).filter(
    (e) => opponent?.userId && String(e.userId) === String(opponent.userId)
  );

  const toggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  const hasLockedSecret =
    room.state === 'PLAYING' ||
    room.state === 'RPS_DECISION' ||
    (room.state === 'SETTING_SECRET' && Boolean(me?.ready));

  const isMatchActive = !isSpectator && hasLockedSecret;

  const handleLeaveClick = () => {
    if (isReconnecting) return;
    if (isMatchActive) {
      sound.playWarning();
      setShowConfirmLeave(true);
    } else {
      onLeaveRoom();
    }
  };

  useEffect(() => {
    if (!showConfirmLeave) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfirmLeave(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmLeave]);

  const leaveTooltip = isSpectator
    ? (locale === 'vi' ? 'Rời khỏi chế độ xem trận' : 'Exit spectator mode')
    : isAiRoom
    ? (locale === 'vi' ? 'Rời trận luyện tập với Máy' : 'Exit Bot match')
    : isMatchActive
    ? (locale === 'vi' ? 'Rời trận lúc này sẽ bị tính là đầu hàng và bị trừ điểm Rank!' : 'Leaving now will count as a forfeit and lose rating!')
    : room.state === 'WAITING_FOR_PLAYERS'
    ? (locale === 'vi' ? 'Hủy phòng chờ và quay lại sảnh' : 'Cancel room and return to lobby')
    : (locale === 'vi' ? 'Quay lại sảnh chính' : 'Return to main lobby');

  return (
    <>
      <div className="flex items-center justify-between p-3 sm:p-4 bg-[#0d1017] border border-white/[0.08] rounded-xl shadow-md shrink-0 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="hidden xs:block text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              {t('roomArena')}
            </span>
            {isSpectator && (
              <span className="px-2 py-0.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 rounded font-mono text-[10px] font-bold flex items-center gap-1">
                <Eye size={10} />
                <span>{t('spectator')}</span>
              </span>
            )}
            {effectiveSpectatorCount > 0 && !isSpectator && (
              <span className="px-1.5 py-0.5 bg-violet-500/15 border border-violet-500/30 text-violet-300 rounded font-mono text-[10px] font-bold flex items-center gap-1">
                <Eye size={10} />
                <span>{effectiveSpectatorCount}</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5">
            <h2 className="font-mono text-base sm:text-lg font-bold text-violet-300">
              {room.roomId}
            </h2>
            <button
              onClick={onCopyRoomId}
              className="p-1 hover:bg-white/[0.06] rounded text-slate-400 hover:text-white transition cursor-pointer"
              title={t('copyRoomId')}
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
          {!isSpectator ? (
            <div
              className={`mt-1 flex items-center space-x-1.5 text-[10px] sm:text-xs text-slate-400 font-mono ${
                room.state === 'PLAYING' ? 'visible' : 'invisible'
              }`}
              aria-hidden={room.state !== 'PLAYING'}
            >
              <KeyRound size={11} className="text-violet-400 shrink-0" />
              <span>{locale === 'vi' ? 'Mã bí mật:' : 'Secret:'}</span>
              <span className="font-mono font-bold text-violet-200 tracking-wider bg-violet-500/15 border border-violet-500/25 px-1.5 py-0.5 rounded">
                {mySecret || '----'}
              </span>
            </div>
          ) : (
            <div className="mt-1 flex items-center space-x-1 text-[10px] sm:text-xs text-cyan-300 font-mono font-semibold">
              <Eye size={11} className="text-cyan-400 shrink-0" />
              <span>{t('spectatorMode')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <p
                onClick={() => onOpenProfile?.(me?.userId ? String(me.userId) : 'me')}
                className="text-xs font-mono font-bold max-w-[90px] sm:max-w-[125px] truncate text-slate-200 cursor-pointer hover:text-violet-300 transition"
                title={locale === 'vi' ? 'Xem hồ sơ của bạn' : 'View your profile'}
              >
                {me?.username}
              </p>
              {me?.equippedTitle ? (
                <EquippedTitleBadge
                  title={me.equippedTitle}
                  locale={locale}
                  size="xs"
                  className="mt-0.5 cursor-pointer hover:opacity-90"
                  onClick={() => onOpenProfile?.(me?.userId ? String(me.userId) : 'me')}
                />
              ) : (
                !isSpectator && (
                  <p className="text-[10px] text-violet-400 font-mono font-bold uppercase">
                    {t('you')}
                  </p>
                )
              )}
            </div>
            <div
              onClick={() => onOpenProfile?.(me?.userId ? String(me.userId) : 'me')}
              className="relative shrink-0 flex items-center justify-center cursor-pointer hover:scale-105 transition-all"
              title={locale === 'vi' ? 'Xem hồ sơ của bạn' : 'View your profile'}
            >
              {me?.avatar ? (
                <img
                  src={me.avatar}
                  alt={me.username}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-violet-500 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-violet-600 rounded-full flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0 text-white">
                  {me?.username.slice(0, 2) || 'P1'}
                </div>
              )}
              <FloatingEmoteOverlay emotes={myEmotes} side="left" />
            </div>

            <span className="text-slate-600 font-mono font-bold text-xs sm:text-sm px-0.5">VS</span>

            {opponent && room.state !== 'WAITING_FOR_PLAYERS' ? (
              <>
                <div
                  onClick={() => !isAiRoom && opponent?.userId && onOpenProfile?.(String(opponent.userId))}
                  className={`relative shrink-0 flex items-center justify-center ${
                    !isAiRoom && opponent?.userId ? 'cursor-pointer hover:scale-105 transition-all' : ''
                  }`}
                  title={!isAiRoom && opponent?.userId ? (locale === 'vi' ? 'Xem hồ sơ đối thủ' : 'View opponent profile') : undefined}
                >
                  {opponent.avatar ? (
                    <img
                      src={opponent.avatar}
                      alt={opponent.username}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 ${
                        opponent.hasLeft
                          ? 'border border-slate-700 grayscale opacity-40'
                          : isOpponentActiveTurn
                          ? 'border border-violet-400 ring-2 ring-violet-500/70 shadow-[0_0_12px_rgba(139,92,246,0.6)]'
                          : 'border border-rose-500'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs uppercase shrink-0 text-white ${
                        opponent.hasLeft
                          ? 'bg-slate-800 text-slate-500 border border-slate-700'
                          : isOpponentActiveTurn
                          ? 'bg-violet-600 border border-violet-400 ring-2 ring-violet-500/70 shadow-[0_0_12px_rgba(139,92,246,0.6)]'
                          : 'bg-rose-600'
                      }`}
                    >
                      {opponent.username.slice(0, 2) || 'P2'}
                    </div>
                  )}
                  {isOpponentActiveTurn && !opponent.hasLeft && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0d1017] z-10 transition-colors ${
                        !isOpponentActive || !opponentIsVisible
                          ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] animate-pulse'
                          : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse'
                      }`}
                      title={
                        !isOpponentActive || !opponentIsVisible
                          ? (locale === 'vi' ? 'Tạm ngưng thao tác > 60s / chuyển tab' : 'Inactive > 60s / switched tab')
                          : (locale === 'vi' ? 'Đang hoạt động & suy nghĩ' : 'Active & thinking')
                      }
                    />
                  )}
                  <FloatingEmoteOverlay emotes={opponentEmotes} side="right" />
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <div className="flex items-center gap-1.5">
                    <p
                      onClick={() => !isAiRoom && opponent?.userId && onOpenProfile?.(String(opponent.userId))}
                      className={`text-xs font-mono font-bold max-w-[90px] sm:max-w-[125px] truncate ${
                        opponent.hasLeft ? 'text-slate-500 line-through' : 'text-slate-200'
                      } ${!isAiRoom && opponent?.userId ? 'cursor-pointer hover:text-rose-300 transition' : ''}`}
                      title={opponent.username}
                    >
                      {opponent.username}
                    </p>
                    {isOpponentActiveTurn && !opponent.hasLeft && (
                      <span
                        className="text-[11px] animate-pulse"
                        title={locale === 'vi' ? 'Đang cân não suy nghĩ...' : 'Thinking...'}
                      >
                        🧠
                      </span>
                    )}
                  </div>
                  {opponent.hasLeft ? (
                    <span className="text-[9px] text-rose-400 font-mono font-bold uppercase tracking-wider bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      {t('opponentHasLeft')}
                    </span>
                  ) : opponent.equippedTitle ? (
                    <EquippedTitleBadge
                      title={opponent.equippedTitle}
                      locale={locale}
                      size="xs"
                      className="mt-0.5"
                    />
                  ) : (
                    !isSpectator && (
                      <p className="text-[10px] text-rose-400 font-mono font-bold uppercase">
                        {t('enemy')}
                      </p>
                    )
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-1.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#121622] border border-dashed border-white/[0.1] rounded-full flex items-center justify-center text-slate-500 font-mono text-xs shrink-0">
                  ?
                </div>
                <p className="hidden sm:block text-xs text-slate-500 font-mono">
                  {locale === 'vi' ? 'Đang chờ...' : 'Waiting...'}
                </p>
              </div>
            )}
          </div>

          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? (locale === 'vi' ? 'Bật âm thanh' : 'Unmute') : (locale === 'vi' ? 'Tắt âm thanh' : 'Mute')}
            title={isMuted ? (locale === 'vi' ? 'Bật âm thanh' : 'Unmute') : (locale === 'vi' ? 'Tắt âm thanh' : 'Mute')}
            className="p-2 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] rounded-lg text-slate-300 hover:text-white transition cursor-pointer shrink-0"
          >
            {isMuted ? (
              <VolumeX size={15} className="text-rose-400" />
            ) : (
              <Volume2 size={15} className="text-emerald-400" />
            )}
          </button>

          {/* Exit Section */}
          <div className="relative flex items-center">
            {/* Unified Top Guidance Callout for Button Rời Phòng across all devices */}
            <div
              aria-hidden="true"
              className="absolute bottom-full right-0 mb-2 z-20 pointer-events-none select-none flex flex-col items-end"
            >
              <div className="bg-[#121622] border border-rose-500/35 text-rose-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-md shadow-lg shadow-black/60 whitespace-nowrap flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                <span>{locale === 'vi' ? 'Thoát phòng đây nhá!' : 'Exit room here!'}</span>
              </div>
              <div className="w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-rose-500/40 mr-3 -mt-[1px]" />
            </div>

            <button
              type="button"
              onClick={handleLeaveClick}
              disabled={isReconnecting}
              aria-label={leaveTooltip}
              className={`p-2 rounded-lg border transition-all shrink-0 flex items-center justify-center ${
                isReconnecting
                  ? 'bg-[#121622] border-white/[0.04] text-slate-600 cursor-not-allowed opacity-50'
                  : isMatchActive
                  ? 'bg-rose-500/15 hover:bg-rose-600 border-rose-500/30 text-rose-300 hover:text-white cursor-pointer'
                  : 'bg-[#121622] hover:bg-rose-600/90 border-white/[0.08] hover:border-rose-500/50 text-slate-300 hover:text-white cursor-pointer'
              }`}
              title={leaveTooltip}
            >
              <LogOut size={15} className={isReconnecting ? 'text-slate-600' : 'text-rose-400 hover:text-white shrink-0'} />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal when Leaving Active Match */}
      <AnimatePresence>
        {showConfirmLeave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#090a0f]/90"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConfirmLeave(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              role="dialog"
              aria-modal="true"
              className={`relative w-full max-w-sm sm:max-w-md bg-[#0d1017] border rounded-2xl p-6 shadow-2xl flex flex-col space-y-4 overflow-hidden ${
                isAiRoom
                  ? 'border-violet-500/30'
                  : 'border-rose-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border shrink-0 ${
                    isAiRoom
                      ? 'bg-violet-500/15 border-violet-500/30 text-violet-400'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {isAiRoom ? <Bot size={22} /> : <AlertTriangle size={22} />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-mono font-bold text-white">
                    {isAiRoom
                      ? locale === 'vi'
                        ? 'Rời phòng luyện tập?'
                        : 'Exit Practice Match?'
                      : locale === 'vi'
                      ? 'Xác nhận rời trận?'
                      : 'Forfeit Match?'}
                  </h3>
                  <p
                    className={`text-xs font-mono font-medium ${
                      isAiRoom ? 'text-violet-300' : 'text-rose-300'
                    }`}
                  >
                    {isAiRoom
                      ? locale === 'vi'
                        ? 'Đang chơi với Máy'
                        : 'Playing with Bot'
                      : locale === 'vi'
                      ? 'Trận đấu đang diễn ra'
                      : 'Match in progress'}
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#121622] p-3.5 rounded-xl border border-white/[0.06] font-sans">
                {isAiRoom
                  ? locale === 'vi'
                    ? 'Bạn đang trong trận đấu luyện tập với Máy. Rời phòng lúc này sẽ kết thúc ván đấu và không bị trừ điểm Rank xếp hạng.'
                    : 'You are currently in a practice match with the Bot. Leaving now will end the match without any rank rating penalty.'
                  : locale === 'vi'
                  ? 'Nếu bạn rời phòng lúc này, hệ thống sẽ tính là BỎ CUỘC (ĐẦU HÀNG), đối thủ sẽ giành chiến thắng và bạn sẽ bị trừ điểm Rank xếp hạng!'
                  : 'If you leave now, it will count as a FORFEIT. Your opponent will win and you will lose rank rating!'}
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmLeave(false)}
                  className="flex-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-xs sm:text-sm font-mono font-bold rounded-lg shadow-sm transition cursor-pointer"
                >
                  {locale === 'vi' ? 'Ở lại thi đấu' : 'Stay & Play'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmLeave(false);
                    onLeaveRoom();
                  }}
                  className={`py-2.5 px-4 text-xs sm:text-sm font-mono font-bold rounded-lg transition cursor-pointer ${
                    isAiRoom
                      ? 'bg-[#121622] hover:bg-[#1a2030] border border-white/[0.1] text-slate-200 hover:text-white'
                      : 'bg-rose-500/15 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white'
                  }`}
                >
                  {isAiRoom
                    ? locale === 'vi'
                      ? 'Rời phòng'
                      : 'Leave Now'
                    : locale === 'vi'
                    ? 'Đầu hàng'
                    : 'Forfeit & Leave'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
