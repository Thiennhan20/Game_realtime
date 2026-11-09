'use client';

import { memo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Gamepad2 } from 'lucide-react';

import type { Locale } from '../../types';

export const MobileHowToPlay = memo(function MobileHowToPlay({ locale }: { locale: Locale }) {
  const [isOpen, setIsOpen] = useState(false);
  const steps =
    locale === 'vi'
      ? [
          ['Tạo/Vào phòng', 'Tạo phòng lấy ID gửi bạn bè hoặc chọn phòng ở mục Lobby Rooms.'],
          ['Cài mật mã', 'Chọn 4 chữ số khác nhau làm mật mã của bạn (giữ bí mật!).'],
          ['Oẳn tù tì', 'Kéo - Búa - Bao để phân định người được quyền đoán trước.'],
          ['Đoán số & gợi ý', 'Lần lượt đoán số. Gợi ý: 🟢 (đúng số) và 🎯 (đúng số và đúng vị trí).'],
          ['Kết thúc & Lưu', 'Đạt 4 🎯 trước sẽ thắng. Mỗi người cần ít nhất 3 lượt đoán để xét XP; người rời trận nhận +0 XP.'],
        ]
      : [
          ['Create/Join Room', 'Create room, copy ID to share, or join from Lobby Rooms list.'],
          ['Lock Secret', 'Choose 4 unique digits as your secret (keep it hidden!).'],
          ['RPS Duel', 'Play Rock-Paper-Scissors to decide who gets first turn.'],
          ['Guess & Clues', 'Take turns guessing. Hints: 🟢 (correct digit) and 🎯 (correct digit & spot).'],
          ['Finish & Save', 'First to 4 🎯 wins. XP requires at least 3 guesses from each player; the leaver gets +0 XP.'],
        ];

  return (
    <div className="lg:hidden bg-[#0d1017] border border-white/[0.08] p-3.5 rounded-xl shadow-md mb-4">
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between font-mono font-bold text-xs text-slate-200 hover:text-white focus:outline-none cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Gamepad2 size={15} className="text-violet-400" />
          <span>{locale === 'vi' ? 'HƯỚNG DẪN CÁCH CHƠI' : 'HOW TO PLAY'}</span>
        </span>
        {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 space-y-3 text-xs text-slate-300 border-t border-white/[0.06] pt-3 overflow-hidden text-left"
          >
            {steps.map(([title, description], index) => (
              <div key={title} className="flex gap-2.5 items-start">
                <span className="font-mono text-[11px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded shrink-0">
                  0{index + 1}
                </span>
                <div>
                  <span className="font-mono font-bold text-slate-100 block text-xs">
                    {title}
                  </span>
                  <span className="text-slate-400 text-[11px] leading-relaxed">
                    {description}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
