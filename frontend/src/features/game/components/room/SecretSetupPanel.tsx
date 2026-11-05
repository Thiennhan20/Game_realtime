import type { FormEvent } from 'react';
import { KeyRound } from 'lucide-react';

import type { Translator } from '../../i18n';
import { sound, triggerHaptic } from '../../sound';

interface SecretSetupPanelProps {
  isReady: boolean;
  opponentSecretSet: boolean;
  secretInput: string;
  t: Translator;
  onSecretInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function SecretSetupPanel({
  isReady,
  opponentSecretSet,
  secretInput,
  t,
  onSecretInputChange,
  onSubmit,
}: SecretSetupPanelProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 h-full">
      <div className="max-w-md w-full bg-slate-900/70 border border-slate-800/80 p-5 sm:p-8 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <KeyRound size={24} />
          </div>
          <h3 className="text-xl font-extrabold uppercase">{t('setupSecret')}</h3>
          <p className="text-xs text-slate-400">{t('setupSecretDesc')}</p>
        </div>

        <div className="min-h-[168px] flex items-center">
          {isReady ? (
            <div className="w-full text-center space-y-4">
              <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-green-400 font-semibold">{t('secretLocked')}</p>
              <p className="text-xs text-slate-500">
                {opponentSecretSet ? t('bothReadyTransitioning') : t('waitingOpponentSubmitSecret')}
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="w-full space-y-4">
              {opponentSecretSet && (
                <div className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-sm">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="tracking-wide">{t('opponentLockedSecret')}</span>
                </div>
              )}
              <input
                type="text"
                maxLength={4}
                aria-label={t('setupSecret')}
                placeholder={t('secretPlaceholder')}
                value={secretInput}
                onChange={(event) => {
                  const cleaned = event.target.value.replace(/\D/g, '');
                  if (cleaned.length > secretInput.length) {
                    sound.playDigitKey(cleaned.length);
                    triggerHaptic(20);
                  } else if (cleaned.length < secretInput.length) {
                    sound.playDigitDelete();
                    triggerHaptic(15);
                  }
                  onSecretInputChange(cleaned);
                }}
                className="w-full bg-slate-950 border border-slate-800 hover:border-purple-500/50 px-4 py-3.5 sm:py-4 rounded-xl text-center text-xl sm:text-2xl font-mono font-bold tracking-[0.5em] placeholder:tracking-normal placeholder:text-base sm:placeholder:text-lg md:placeholder:text-xl placeholder:font-sans placeholder:font-semibold placeholder-slate-500 transition-all duration-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={secretInput.length !== 4}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg transition-colors duration-200 cursor-pointer"
              >
                {t('lockSecret')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
