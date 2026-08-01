import type { Locale } from '../../types';

export function BattleGuide({ locale }: { locale: Locale }) {
  const steps =
    locale === 'vi'
      ? [
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
    <div className="hidden lg:flex flex-col flex-1 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl shadow-xl justify-between">
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text pb-2 border-b border-slate-850">
          {locale === 'vi' ? '📖 Hướng Dẫn: Đối Chiến' : '📖 Guide: Battle'}
        </h3>
        {steps.map(([title, description], index) => (
          <div key={title} className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0">
                {index + 3}
              </div>
              <h4 className="font-bold text-xs text-slate-200">{title}</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pl-7">{description}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-805 pt-3 mt-4 text-[9px] text-slate-500 font-semibold uppercase tracking-wider text-right">
        {locale === 'vi' ? 'Chế độ chơi thời gian thực' : 'Realtime Game Arena'}
      </div>
    </div>
  );
}
