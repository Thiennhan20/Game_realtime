import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { sound, triggerHaptic } from '../../sound';
import type { Locale } from '../../types';

interface StartCountdownOverlayProps {
  isOpen: boolean;
  countdown?: number;
  isMyTurn: boolean;
  opponentName: string;
  locale: Locale;
  onComplete?: () => void;
}

export function StartCountdownOverlay({
  isOpen,
  countdown: externalCountdown,
  isMyTurn,
  opponentName,
  locale,
  onComplete,
}: StartCountdownOverlayProps) {
  const [localCountdown, setLocalCountdown] = useState(3);
  const [lockedIsMyTurn, setLockedIsMyTurn] = useState(isMyTurn);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) return;

    // Snapshot turn at moment countdown opens so no asynchronous event can flip the banner
    setLockedIsMyTurn(isMyTurn);
    setLocalCountdown(3);
    sound.playCountdownTick(3);
    triggerHaptic([30]);

    let count = 3;
    const timer = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(timer);
        setLocalCountdown(0);
        sound.playBattleStart();
        triggerHaptic([60, 40, 100]);
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 600);
        return;
      }
      setLocalCountdown(count);
      sound.playCountdownTick(count);
      triggerHaptic([30]);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isMyTurn]);

  const countdown = externalCountdown !== undefined ? externalCountdown : localCountdown;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[#090a0f]/90"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="text-center space-y-6 max-w-sm w-full px-6 py-8 rounded-2xl bg-[#0d1017] border border-white/[0.08] shadow-2xl"
          >
            <div className="text-xs font-mono font-bold tracking-[0.2em] text-violet-400 uppercase">
              {locale === 'vi' ? '⚔️ ĐẤU TRƯỜNG ĐỐI CHIẾN' : '⚔️ BATTLE ARENA'}
            </div>

            <div className="text-sm font-bold text-slate-300">
              {lockedIsMyTurn ? (
                <span className="text-emerald-400 font-extrabold block text-base mb-1">
                  {locale === 'vi' ? '🎉 Bạn Thắng Oẳn Tù Tì!' : '🎉 You Won RPS!'}
                </span>
              ) : (
                <span className="text-violet-400 font-extrabold block text-base mb-1">
                  {locale === 'vi'
                    ? `🛡️ ${opponentName || 'Đối thủ'} Thắng Oẳn Tù Tì!`
                    : `🛡️ ${opponentName || 'Opponent'} Won RPS!`}
                </span>
              )}
              <span className="text-xs text-slate-400">
                {lockedIsMyTurn
                  ? locale === 'vi'
                    ? 'Bạn được quyền đoán trước! Tấn công ngay!'
                    : 'You get to guess first! Attack now!'
                  : locale === 'vi'
                    ? 'Đối thủ được quyền đoán trước! Hãy phòng thủ!'
                    : 'Opponent gets to guess first! Defend!'}
              </span>
            </div>

            <motion.div
              key={localCountdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-7xl sm:text-8xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-violet-200 to-violet-400 drop-shadow-[0_0_25px_rgba(124,58,237,0.4)] select-none py-2"
            >
              {localCountdown > 0 ? localCountdown : locale === 'vi' ? 'CHIẾN!' : 'BATTLE!'}
            </motion.div>

            <div className="text-xs text-slate-500 font-mono animate-pulse uppercase tracking-wider">
              {locale === 'vi' ? 'Trực chiến chuẩn bị bắt đầu...' : 'Battle starting in...'}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
