import { Dices } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { Locale, RpsChoice, RpsClashInfo } from '../../types';

interface RpsDecisionPanelProps {
  selectedChoice: RpsChoice | null | string;
  opponentSubmitted: boolean;
  clashResult?: RpsClashInfo | null;
  myPlayerIndex?: number;
  opponentName?: string;
  locale?: Locale;
  t: Translator;
  onChoose: (choice: RpsChoice) => void;
}

const RPS_ICONS: Record<string, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

export function RpsDecisionPanel({
  selectedChoice,
  opponentSubmitted,
  clashResult,
  myPlayerIndex = 0,
  opponentName = '',
  locale = 'vi',
  t,
  onChoose,
}: RpsDecisionPanelProps) {
  const myChoice = clashResult
    ? (myPlayerIndex === 1 ? clashResult.p2Choice : clashResult.p1Choice)
    : selectedChoice;
  const opponentChoice = clashResult
    ? (myPlayerIndex === 1 ? clashResult.p1Choice : clashResult.p2Choice)
    : null;
  const isTie = clashResult?.winnerIndex === -1;
  const isWinner = clashResult ? clashResult.winnerIndex === myPlayerIndex : false;

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 h-full">
      <div className="max-w-md w-full bg-[#0d1017] border border-white/[0.08] p-5 sm:p-8 rounded-2xl shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <Dices size={24} />
          </div>
          <h3 className="text-lg sm:text-xl font-mono font-bold uppercase tracking-tight text-white">
            {t('rpsInitiative')}
          </h3>
          <p className="text-xs text-slate-400">{t('rpsDesc')}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(['rock', 'paper', 'scissors'] as const).map((choice) => {
            const icon = RPS_ICONS[choice];
            const isSelected = selectedChoice === choice;
            const hasChosen = Boolean(selectedChoice);

            return (
              <button
                key={choice}
                onClick={() => !hasChosen && onChoose(choice)}
                disabled={Boolean(hasChosen && !isSelected) || Boolean(clashResult)}
                className={`aspect-square rounded-xl text-4xl flex flex-col items-center justify-center gap-2 transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? 'bg-violet-600/30 border-violet-400 ring-2 ring-violet-500/25 text-white'
                    : hasChosen
                      ? 'bg-white/[0.02] border-white/[0.04] opacity-30 cursor-not-allowed'
                      : 'bg-[#121622] hover:bg-[#181d2c] border-white/[0.08] hover:border-violet-500/40 text-slate-300 hover:text-white'
                }`}
              >
                <span>{icon}</span>
                <span
                  className={`text-[10px] uppercase font-mono font-bold tracking-wider ${
                    isSelected ? 'text-violet-300' : 'text-slate-500'
                  }`}
                >
                  {t(choice)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-h-[72px] flex items-center justify-center">
          {clashResult ? (
            <div className="w-full text-center pt-3 border-t border-white/[0.06] space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl">{RPS_ICONS[myChoice || ''] || '✊'}</span>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {locale === 'vi' ? 'Bạn' : 'You'}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-black text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                  VS
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl">
                    {RPS_ICONS[opponentChoice || ''] || '✊'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-300 truncate max-w-[90px]">
                    {opponentName || (locale === 'vi' ? 'Đối thủ' : 'Opponent')}
                  </span>
                </div>
              </div>

              <div>
                {isTie ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                    <span>
                      🤝 {locale === 'vi' ? 'Hòa nhau! Đang làm lại...' : 'Draw! Resetting...'}
                    </span>
                  </div>
                ) : isWinner ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                    <span>
                      🎉 {locale === 'vi' ? 'Bạn thắng tù xì! Chuẩn bị...' : 'You won RPS! Preparing...'}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-mono font-bold">
                    <span>
                      🛡️ {opponentName || (locale === 'vi' ? 'Đối thủ' : 'Opponent')}{' '}
                      {locale === 'vi' ? 'thắng tù xì! Chuẩn bị...' : 'won RPS! Preparing...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : selectedChoice ? (
            <div className="w-full text-center pt-3 border-t border-white/[0.06] space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-violet-300 font-mono font-bold">
                  {opponentSubmitted ? t('resolvingClash') : t('waitingOpponentRps')}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {t('submittedChoice').replace('{choice}', t(selectedChoice as RpsChoice))}
              </p>
            </div>
          ) : opponentSubmitted ? (
            <div className="w-full text-center pt-2.5 border-t border-white/[0.06]">
              <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="tracking-wide">{t('opponentChoseRps')}</span>
              </div>
            </div>
          ) : (
            <div className="w-full text-center pt-3 border-t border-white/[0.06]">
              <p className="text-[11px] text-slate-400 font-sans">{t('rpsTip')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
