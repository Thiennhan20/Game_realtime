'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Gamepad2 } from 'lucide-react';

import type { Locale } from '../../types';

export function MobileHowToPlay({ locale }: { locale: Locale }) {
  const [isOpen, setIsOpen] = useState(false);
  const steps =
    locale === 'vi'
      ? [
          ['Tạo/Vào phòng', 'Tạo phòng lấy ID gửi bạn bè hoặc chọn phòng ở mục Lobby Rooms.'],
          ['Cài mật mã', 'Chọn 4 chữ số khác nhau làm mật mã của bạn (giữ bí mật!).'],
          ['Oẳn tù tì', 'Kéo - Búa - Bao để phân định người được quyền đoán trước.'],
          ['Đoán số & gợi ý', 'Lần lượt đoán số. Gợi ý: 🟢 (đúng số) và 🎯 (đúng số và đúng vị trí).'],
          ['Kết thúc & Lưu', 'Đạt 4 🎯 trước sẽ thắng.'],
        ]
      : [
          ['Create/Join Room', 'Create room, copy ID to share, or join from Lobby Rooms list.'],
          ['Lock Secret', 'Choose 4 unique digits as your secret (keep it hidden!).'],
          ['RPS Duel', 'Play Rock-Paper-Scissors to decide who gets first turn.'],
          ['Guess & Clues', 'Take turns guessing. Hints: 🟢 (correct digit) and 🎯 (correct digit & spot).'],
          ['Finish & Save', 'First to 4 🎯 wins.'],
        ];

  return (
    <div className="lg:hidden bg-slate-900/50 border border-purple-500/30 p-4 rounded-xl shadow-lg mb-4">
      <button
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between font-bold text-xs sm:text-sm text-purple-400 focus:outline-none"
      >
        <span className="flex items-center gap-2">
          <Gamepad2 size={16} />
          {locale === 'vi' ? '📖 HƯỚNG DẪN CÁCH CHƠI' : '📖 HOW TO PLAY'}
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 space-y-3.5 text-xs text-slate-300 border-t border-slate-850 pt-3 overflow-hidden text-left"
          >
            {steps.map(([title, description], index) => (
              <div key={title}>
                <span className="font-extrabold text-purple-400 block mb-0.5">
                  {index + 1}. {title}
                </span>
                <span className="text-slate-400 text-[11px] leading-relaxed">
                  {description}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
