import type { Locale } from '../../types';

export function SetupGuide({ locale }: { locale: Locale }) {
  const steps =
    locale === 'vi'
      ? [
          ['Tạo hoặc Vào phòng', 'Nhấp chọn chế độ đấu với Bạn bè hoặc đấu với Máy để tạo phòng chơi.'],
          ['Thiết lập mật mã', 'Mỗi người chọn 4 chữ số khác nhau (ví dụ: 1357). Bảo mật AES-256 E2E.'],
        ]
      : [
          ['Create or Join Room', 'Click to select Play with Friends or Play vs Bot to start playing.'],
          ['Lock Secret Code', 'Choose 4 unique digits (e.g. 1357). Protected with AES-256 E2E.'],
        ];

  return (
    <div className="flex-1 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text pb-2 border-b border-slate-850">
          {locale === 'vi' ? '📖 Hướng Dẫn: Khởi Động' : '📖 Guide: Setup'}
        </h3>
        {steps.map(([title, description], index) => (
          <div key={title} className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0">
                {index + 1}
              </div>
              <h4 className="font-bold text-xs text-slate-200">{title}</h4>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pl-7">{description}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-850 pt-3 mt-3 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
        {locale === 'vi' ? 'Đấu trường đoán số 4 chữ số' : '4-Digit Numbers Duel'}
      </div>
    </div>
  );
}
