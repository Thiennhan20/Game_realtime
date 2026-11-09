import { Bot, Check, Copy, Sparkles, Users } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale } from '../../types';

interface WaitingForOpponentPanelProps {
  roomId: string;
  copied: boolean;
  locale: Locale;
  t: Translator;
  isQuickMatch?: boolean;
  onCopyRoomId: () => void;
  onSwitchToAi?: () => void;
}

export function WaitingForOpponentPanel({
  roomId,
  copied,
  locale,
  t,
  isQuickMatch = false,
  onCopyRoomId,
  onSwitchToAi,
}: WaitingForOpponentPanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1017] border border-dashed border-white/[0.1] rounded-2xl p-6 sm:p-10 text-center h-full">
      <div className="relative w-16 h-16 bg-violet-500/15 border border-violet-500/30 text-violet-400 rounded-full flex items-center justify-center mb-5">
        <Users size={30} />
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0d1017] animate-pulse" />
        </span>
      </div>

      <h3 className="text-xl font-mono font-bold text-white mb-2">{t('waitingOpponent')}</h3>
      <p className="text-slate-400 text-xs sm:text-sm max-w-sm mb-6 leading-relaxed font-sans">
        {t('waitingOpponentDesc').replace('{roomId}', roomId)}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-md">
        <button
          type="button"
          onClick={onCopyRoomId}
          className="w-full sm:w-auto min-w-[185px] px-5 py-2.5 bg-[#121622] hover:bg-[#181d2c] border border-white/[0.08] text-white text-xs sm:text-sm font-mono font-bold rounded-lg transition flex items-center justify-center space-x-2 cursor-pointer"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          <span>{copied ? t('copied') : t('copyRoomId')}</span>
        </button>

        {onSwitchToAi && (
          <button
            type="button"
            onClick={onSwitchToAi}
            className="w-full sm:w-auto px-5 py-2.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 hover:text-white text-xs sm:text-sm font-mono font-bold rounded-lg transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Bot size={16} className="text-cyan-400 shrink-0" />
            <span>
              {locale === 'vi' ? 'Đấu với Máy ngay' : 'Play vs Bot Instead'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
