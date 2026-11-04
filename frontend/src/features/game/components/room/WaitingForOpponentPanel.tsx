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
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/30 border border-slate-800/70 border-dashed rounded-2xl p-6 sm:p-10 text-center h-full">
      <div className="relative w-16 h-16 bg-purple-500/15 text-purple-400 rounded-full flex items-center justify-center mb-5 shadow-[0_0_24px_rgba(168,85,247,0.2)]">
        <Users size={30} />
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-950" />
        </span>
      </div>

      <h3 className="text-xl font-black text-white mb-2">{t('waitingOpponent')}</h3>
      <p className="text-slate-400 text-xs sm:text-sm max-w-sm mb-6 leading-relaxed">
        {t('waitingOpponentDesc').replace('{roomId}', roomId)}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-md">
        <button
          type="button"
          onClick={onCopyRoomId}
          className="w-full sm:w-auto min-w-[185px] px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 cursor-pointer"
        >
          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
          <span>{copied ? t('copied') : t('copyRoomId')}</span>
        </button>

        {onSwitchToAi && (
          <button
            type="button"
            onClick={onSwitchToAi}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 border border-cyan-400/40 text-cyan-200 hover:text-white text-xs sm:text-sm font-extrabold rounded-xl transition duration-200 flex items-center justify-center space-x-2 cursor-pointer"
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
