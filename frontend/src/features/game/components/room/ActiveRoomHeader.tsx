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
  const isAiRoom = Boolean(room.isAiRoom);
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  const toggleSound = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  const isMatchActive =
    !isSpectator &&
    (room.state === 'PLAYING' ||
      room.state === 'SETTING_SECRET' ||
      room.state === 'RPS_DECISION');

  const handleLeaveClick = () => {
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
      <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900/70 border border-slate-800/80 rounded-xl sm:rounded-2xl shadow-lg shrink-0 gap-2">
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

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold max-w-[75px] sm:max-w-[100px] truncate text-slate-200" title={me?.username}>
                {me?.username}
              </p>
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

            <span className="text-slate-700 font-bold text-xs sm:text-sm px-0.5">VS</span>

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
                  <p className="text-xs font-bold max-w-[75px] sm:max-w-[100px] truncate text-slate-200" title={opponent.username}>
                    {opponent.username}
                  </p>
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

          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? (locale === 'vi' ? 'Bật âm thanh' : 'Unmute') : (locale === 'vi' ? 'Tắt âm thanh' : 'Mute')}
            title={isMuted ? (locale === 'vi' ? 'Bật âm thanh' : 'Unmute') : (locale === 'vi' ? 'Tắt âm thanh' : 'Mute')}
            className="p-1.5 sm:p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-slate-300 hover:text-white transition cursor-pointer shrink-0"
          >
            {isMuted ? (
              <VolumeX size={15} className="text-rose-400" />
            ) : (
              <Volume2 size={15} className="text-emerald-400" />
            )}
          </button>

          {/* Exit Section with Floating Callout Tag */}
          <div className="relative flex items-center">
            {/* Exit Icon Button */}
            <button
              type="button"
              onClick={handleLeaveClick}
              aria-label={leaveTooltip}
              className={`p-2 sm:p-2.5 rounded-xl border transition-all duration-200 cursor-pointer shrink-0 shadow-md flex items-center justify-center ${
                isMatchActive
                  ? 'bg-rose-500/15 hover:bg-rose-600 border-rose-500/40 hover:border-rose-500 text-rose-300 hover:text-white shadow-rose-950/30 hover:scale-105 active:scale-95'
                  : 'bg-slate-800/80 hover:bg-rose-600/90 border-slate-700/60 hover:border-rose-500/50 text-slate-300 hover:text-white hover:scale-105 active:scale-95'
              }`}
              title={leaveTooltip}
            >
              <LogOut size={16} className="text-rose-400 group-hover:text-white shrink-0" />
            </button>

            {/* Desktop Floating Callout: Floating to the RIGHT, OUTSIDE the container, arrow on the outside pointing left */}
            <motion.div
              animate={{ x: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              onClick={handleLeaveClick}
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-30 hidden sm:flex items-center cursor-pointer select-none filter drop-shadow-[0_2px_8px_rgba(244,63,94,0.25)]"
            >
              {/* Triangular arrow on the OUTSIDE pointing left directly into the exit icon */}
              <div className="w-0 h-0 border-y-[4px] border-y-transparent border-r-[5px] border-r-rose-500/60 -mr-[1px] shrink-0" />

              {/* The Floating Frame - Dark Glassmorphism */}
              <div className="bg-rose-950/80 backdrop-blur-md text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-rose-500/40 whitespace-nowrap shadow-lg shadow-rose-950/50 flex items-center gap-1 hover:border-rose-400/60 hover:text-white hover:bg-rose-900/80 transition duration-200">
                <span>{locale === 'vi' ? 'Thoát phòng đây nhá!' : 'Exit room here!'}</span>
              </div>
            </motion.div>

            {/* Mobile Floating Callout: Floating just below the exit icon on narrow screens */}
            <motion.div
              animate={{ y: [0, 2, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              onClick={handleLeaveClick}
              className="absolute top-full right-0 mt-1.5 z-30 sm:hidden flex flex-col items-end cursor-pointer select-none filter drop-shadow-[0_2px_8px_rgba(244,63,94,0.25)]"
            >
              {/* Triangular arrow on the OUTSIDE pointing up directly into the exit icon */}
              <div className="w-0 h-0 border-x-[4px] border-x-transparent border-b-[5px] border-b-rose-500/60 mr-3 -mb-[1px] shrink-0" />

              {/* The Floating Frame on mobile - Dark Glassmorphism */}
              <div className="bg-rose-950/80 backdrop-blur-md text-rose-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-rose-500/40 whitespace-nowrap shadow-lg shadow-rose-950/50 flex items-center gap-1 hover:border-rose-400/60 hover:text-white hover:bg-rose-900/80 transition duration-200">
                <span>{locale === 'vi' ? 'Thoát phòng đây nhá!' : 'Exit room here!'}</span>
              </div>
            </motion.div>
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
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConfirmLeave(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              role="dialog"
              aria-modal="true"
              className={`relative w-full max-w-sm sm:max-w-md bg-slate-900 border rounded-3xl p-6 shadow-2xl flex flex-col space-y-4 overflow-hidden ${
                isAiRoom
                  ? 'border-purple-500/40 shadow-purple-950/50'
                  : 'border-rose-500/40 shadow-rose-950/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl border shrink-0 ${
                    isAiRoom
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {isAiRoom ? <Bot size={24} /> : <AlertTriangle size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {isAiRoom
                      ? locale === 'vi'
                        ? 'Rời phòng luyện tập?'
                        : 'Exit Practice Match?'
                      : locale === 'vi'
                      ? 'Xác nhận rời trận?'
                      : 'Forfeit Match?'}
                  </h3>
                  <p
                    className={`text-xs font-semibold ${
                      isAiRoom ? 'text-purple-300' : 'text-rose-300'
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

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                {isAiRoom
                  ? locale === 'vi'
                    ? 'Bạn đang trong trận đấu luyện tập với Máy. Rời phòng lúc này sẽ kết thúc ván đấu và không bị trừ điểm Rank xếp hạng.'
                    : 'You are currently in a practice match with the Bot. Leaving now will end the match without any rank rating penalty.'
                  : locale === 'vi'
                  ? 'Nếu bạn rời phòng lúc này, hệ thống sẽ tính là BỎ CUỘC (ĐẦU HÀNG), đối thủ sẽ giành chiến thắng và bạn sẽ bị trừ điểm Rank xếp hạng!'
                  : 'If you leave now, it will count as a FORFEIT. Your opponent will win and you will lose rank rating!'}
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmLeave(false)}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-lg shadow-purple-950/40 transition cursor-pointer"
                >
                  {locale === 'vi' ? 'Ở lại thi đấu' : 'Stay & Play'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmLeave(false);
                    onLeaveRoom();
                  }}
                  className={`py-3 px-4 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer ${
                    isAiRoom
                      ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white'
                      : 'bg-rose-500/20 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-500 text-rose-300 hover:text-white'
                  }`}
                >
                  {isAiRoom
                    ? locale === 'vi'
                      ? 'Rời phòng ngay'
                      : 'Leave Now'
                    : locale === 'vi'
                    ? 'Chấp nhận đầu hàng'
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
