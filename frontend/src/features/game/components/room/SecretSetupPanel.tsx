import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { KeyRound, AlertTriangle, ShieldCheck } from 'lucide-react';

import type { Translator } from '../../i18n';
import { sound, triggerHaptic } from '../../sound';
import { isUniqueFourDigitCode } from '../../utils';

interface SecretSetupPanelProps {
  isReady: boolean;
  opponentSecretSet: boolean;
  secretInput?: string;
  t: Translator;
  onSecretInputChange?: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, secretCode?: string) => void;
}

export function SecretSetupPanel({
  isReady,
  opponentSecretSet,
  secretInput: initialSecret = '',
  t,
  onSecretInputChange,
  onSubmit,
}: SecretSetupPanelProps) {
  const [localSecret, setLocalSecret] = useState(initialSecret);
  const [isFocused, setIsFocused] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isReady) {
      inputRef.current?.focus();
    }
  }, [isReady]);

  const isValidCode = isUniqueFourDigitCode(localSecret);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);

    if (raw.length > localSecret.length) {
      const addedChar = raw[raw.length - 1];
      if (localSecret.includes(addedChar)) {
        sound.playWarning();
        triggerHaptic([60, 40, 60]);
        setDuplicateWarning(true);
        setTimeout(() => setDuplicateWarning(false), 2200);
        return;
      }
      sound.playDigitKey(raw.length);
      triggerHaptic(20);
      setDuplicateWarning(false);
    } else if (raw.length < localSecret.length) {
      sound.playDigitDelete();
      triggerHaptic(15);
      setDuplicateWarning(false);
    }

    setLocalSecret(raw);
    onSecretInputChange?.(raw);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 h-full">
      <div className="max-w-md w-full bg-[#0d1017] border border-white/[0.08] p-5 sm:p-8 rounded-2xl shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <KeyRound size={24} />
          </div>
          <h3 className="text-xl font-mono font-bold uppercase tracking-tight text-white">{t('setupSecret')}</h3>
          <p className="text-xs text-slate-400 font-sans">{t('setupSecretDesc')}</p>
        </div>

        <div className="min-h-[168px] flex items-center">
          {isReady ? (
            <div className="w-full text-center space-y-4">
              <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-mono font-bold text-emerald-400">{t('secretLocked')}</p>
              <p className="text-xs text-slate-400 font-sans">
                {opponentSecretSet ? t('bothReadyTransitioning') : t('waitingOpponentSubmitSecret')}
              </p>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (isValidCode) {
                  onSubmit(event, localSecret);
                }
              }}
              className="w-full space-y-5"
            >
              {opponentSecretSet && (
                <div className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-mono font-bold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="tracking-wide">{t('opponentLockedSecret')}</span>
                </div>
              )}

              {/* 4 Code Slots */}
              <div className="relative flex flex-col items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  aria-label={t('setupSecret')}
                  value={localSecret}
                  onChange={handleInputChange}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  autoComplete="off"
                />

                <div className="flex justify-center items-center gap-2.5 sm:gap-3.5 w-full py-1">
                  {[0, 1, 2, 3].map((index) => {
                    const digit = localSecret[index];
                    const isActive = isFocused && localSecret.length === index;
                    return (
                      <div
                        key={index}
                        onClick={() => inputRef.current?.focus()}
                        className={`w-14 h-16 sm:w-16 sm:h-20 rounded-xl border flex flex-col items-center justify-center font-mono text-2xl sm:text-3xl font-bold transition-all select-none cursor-pointer ${
                          digit
                            ? 'bg-violet-950/40 border-violet-500/70 text-violet-200'
                            : isActive
                            ? 'bg-[#121622] border-violet-400 text-violet-300 ring-2 ring-violet-500/25 animate-pulse'
                            : 'bg-[#121622] border-white/[0.08] text-slate-600'
                        }`}
                      >
                        <span>{digit || (isActive ? '|' : '·')}</span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                          {`0${index + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {duplicateWarning && (
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 bg-amber-500/15 border border-amber-500/40 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-top-1 duration-150 text-center">
                    <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                    <span>Các chữ số phải khác nhau, không được trùng lặp!</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!isValidCode}
                className={`w-full py-3 sm:py-3.5 rounded-lg font-mono font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-md ${
                  isValidCode
                    ? 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white border border-violet-400/30 shadow-violet-600/20 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                    : 'bg-white/[0.03] border border-white/[0.06] text-slate-600 opacity-50 cursor-not-allowed'
                }`}
              >
                {isValidCode ? (
                  <ShieldCheck size={18} className="text-white" />
                ) : (
                  <KeyRound size={18} />
                )}
                <span>{t('lockSecret')}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
