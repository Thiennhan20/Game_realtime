import { Check, Copy, Users } from 'lucide-react';

import type { Translator } from '../../i18n';

interface WaitingForOpponentPanelProps {
  roomId: string;
  copied: boolean;
  t: Translator;
  onCopyRoomId: () => void;
}

export function WaitingForOpponentPanel({
  roomId,
  copied,
  t,
  onCopyRoomId,
}: WaitingForOpponentPanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/20 border border-slate-800/60 border-dashed rounded-2xl p-6 sm:p-12 text-center">
      <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mb-6">
        <Users size={32} />
      </div>
      <h3 className="text-xl font-bold mb-2">{t('waitingOpponent')}</h3>
      <p className="text-slate-400 text-sm max-w-sm mb-6">
        {t('waitingOpponentDesc').replace('{roomId}', roomId)}
      </p>
      <button
        onClick={onCopyRoomId}
        className="min-w-[190px] px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 cursor-pointer"
      >
        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
        <span>{copied ? t('copied') : t('copyRoomId')}</span>
      </button>
    </div>
  );
}
