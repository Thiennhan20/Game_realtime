import type { FormEvent } from 'react';
import { KeyRound } from 'lucide-react';

import type { Translator } from '../../i18n';

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
    <div className="flex-1 flex flex-col items-center justify-center py-6">
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
              <input
                type="text"
                maxLength={4}
                placeholder={t('secretPlaceholder')}
                value={secretInput}
                onChange={(event) => onSecretInputChange(event.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none px-4 py-3.5 sm:py-4 rounded-xl text-center text-xl sm:text-2xl font-mono font-bold tracking-[0.5em] placeholder:tracking-normal placeholder:text-xs sm:placeholder:text-sm placeholder:font-sans placeholder:font-medium placeholder-slate-600 transition-colors"
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
