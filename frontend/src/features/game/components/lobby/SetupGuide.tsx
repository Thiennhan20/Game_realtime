import type { Locale } from '../../types';

export function SetupGuide({ locale }: { locale: Locale }) {
  const steps =
    locale === 'vi'
      ? [
          ['Tạo hoặc Vào phòng', 'Nhấp chọn chế độ đấu với Bạn bè hoặc đấu với Máy để tạo phòng chơi.'],
          ['Thiết lập mật mã', 'Mỗi người chọn 4 chữ số khác nhau (ví dụ: 1357). Bảo mật AES-256 E2E.'],
          [
            'Oẳn tù tì giành quyền đi trước',
            'Oẳn tù tì (Kéo - Búa - Bao) để chọn người đi trước. Người đoán trước có lợi thế đi trước cực kỳ lớn!',
          ],
          [
            'Đoán số & Đọc gợi ý',
            'Đoán 4 chữ số. Nhận manh mối: 🟢 (Chữ số đúng nhưng sai vị trí) và 🎯 (Chữ số đúng và đúng vị trí).',
          ],
          [
            'Kết thúc & Lưu lịch sử',
            'Ai đạt 4 🎯 trước sẽ thắng. Rời phòng hoặc offline quá 60s sẽ kết thúc ván; người rời nhận +0 XP. XP chỉ được xét khi mỗi người có ít nhất 3 lượt đoán.',
          ],
        ]
      : [
          ['Create or Join Room', 'Click to select Play with Friends or Play vs Bot to start playing.'],
          ['Lock Secret Code', 'Choose 4 unique digits (example: 1357). Protected with AES-256 E2E.'],
          [
            'RPS Initiative Duel',
            'Play Rock-Paper-Scissors to decide who goes first. The first turn provides a massive initiative advantage!',
          ],
          [
            'Guess & Read Hints',
            'Guess 4 digits. Get hints: 🟢 (Correct digits, wrong spot) and 🎯 (Correct digits in the right spot).',
          ],
          [
            'Finish & Save History',
            'First to 4 🎯 wins. Leaving or staying offline for over 60s ends the match; the leaver gets +0 XP. XP requires at least 3 guesses from each player.',
          ],
        ];

  return (
    <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 sm:p-5 lg:p-6 rounded-2xl shadow-xl flex flex-col justify-between">
      <div className="space-y-4">
        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text pb-2.5 border-b border-slate-700/80 flex items-center gap-1.5">
          <span className="text-sm">📖</span>
          <span>{locale === 'vi' ? 'Hướng Dẫn Luật Chơi' : 'How To Play Guide'}</span>
        </h3>
        <div className="space-y-3 sm:space-y-3.5">
          {steps.map(([title, description], index) => (
            <div key={title} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-black text-[11px] text-white shrink-0 shadow-sm">
                  {index + 1}
                </div>
                <h4 className="font-extrabold text-xs text-slate-200">{title}</h4>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed pl-7">{description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-slate-850 pt-3 mt-4 text-[10px] sm:text-[11px] text-slate-400 font-extrabold uppercase tracking-wider flex justify-between items-center">
        <span>{locale === 'vi' ? 'Đấu trường đoán số 4 chữ số' : '4-Digit Numbers Duel'}</span>
        <span className="text-purple-400 font-mono">LIVE</span>
      </div>
    </div>
  );
}
