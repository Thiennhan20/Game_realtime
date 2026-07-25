import { Dices } from 'lucide-react';

import type { Translator } from '../../i18n';
import type { RpsChoice } from '../../types';

interface RpsDecisionPanelProps {
  selectedChoice: RpsChoice | null | string;
  opponentSubmitted: boolean;
  t: Translator;
  onChoose: (choice: RpsChoice) => void;
}

export function RpsDecisionPanel({
  selectedChoice,
  opponentSubmitted,
  t,
  onChoose,
}: RpsDecisionPanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6">
      <div className="max-w-md w-full bg-slate-900/70 border border-slate-800/80 p-5 sm:p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <Dices size={24} />
          </div>
          <h3 className="text-xl font-extrabold uppercase">{t('rpsInitiative')}</h3>
          <p className="text-xs text-slate-400">{t('rpsDesc')}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(['rock', 'paper', 'scissors'] as const).map((choice) => {
            const icon = choice === 'rock' ? '✊' : choice === 'paper' ? '✋' : '✌️';
            const isSelected = selectedChoice === choice;
            const hasChosen = Boolean(selectedChoice);

            return (
              <button
                key={choice}
                onClick={() => !hasChosen && onChoose(choice)}
                disabled={hasChosen && !isSelected}
                className={`aspect-square rounded-2xl text-4xl flex flex-col items-center justify-center gap-2 transition-colors duration-200 cursor-pointer border ${
                  isSelected
                    ? 'bg-purple-600/35 border-purple-400 ring-2 ring-purple-500/25 shadow-[0_0_15px_rgba(168,85,247,0.28)] text-white'
                    : hasChosen
                      ? 'bg-slate-950/20 border-slate-900/60 opacity-30 cursor-not-allowed'
                      : 'bg-slate-950/60 hover:bg-purple-950/20 border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-white'
                }`}
              >
                <span>{icon}</span>
                <span
                  className={`text-[10px] uppercase font-black tracking-wider ${
                    isSelected ? 'text-purple-300' : 'text-slate-500'
                  }`}
                >
                  {t(choice)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-h-[64px] flex items-start">
          {selectedChoice && (
            <div className="w-full text-center pt-3 border-t border-slate-800/60 space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-purple-400 font-bold">
                  {opponentSubmitted ? t('resolvingClash') : t('waitingOpponentRps')}
                </p>
              </div>
              <p className="text-[10px] text-slate-500 italic">
                {t('submittedChoice').replace('{choice}', t(selectedChoice as RpsChoice))}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
