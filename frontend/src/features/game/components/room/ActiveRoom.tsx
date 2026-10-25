'use client';

import type { FormEvent } from 'react';
import { Eye } from 'lucide-react';

import type { Translator } from '../../i18n';
import type {
  AuthUser,
  Locale,
  MatchStats,
  Player,
  PlayerXpResult,
  Room,
  RpsChoice,
} from '../../types';
import { GuessHistoryModal } from '../modals/GuessHistoryModal';
import { MatchSummaryModal } from '../modals/MatchSummaryModal';
import { NumberPadModal } from '../modals/NumberPadModal';
import { StartCountdownOverlay } from '../modals/StartCountdownOverlay';
import { ActiveRoomHeader } from './ActiveRoomHeader';
import { FinishedPanel } from './FinishedPanel';
import { GuessTurnBar } from './GuessTurnBar';
import { PlayingArena } from './PlayingArena';
import { RpsDecisionPanel } from './RpsDecisionPanel';
import { SecretSetupPanel } from './SecretSetupPanel';
import { WaitingForOpponentPanel } from './WaitingForOpponentPanel';

interface ActiveRoomProps {
  room: Room;
  user: AuthUser;
  me: Player | null;
  opponent: Player | null;
  myPlayerIndex: number;
  opponentPlayerIndex: number;
  secretInput: string;
  guessInput: string;
  opponentSecretSet: boolean;
  opponentRpsSubmitted: boolean;
  opponentWantsPlayAgain: boolean;
  copied: boolean;
  matchStats: MatchStats | null;
  matchXpResult: PlayerXpResult | null;
  secretReveal: string | null;
  showMatchModal: boolean;
  showGuessHistoryModal: boolean;
  showNumberPad: boolean;
  showStartCountdown: boolean;
  countdown: number;
  locale: Locale;
  t: Translator;
  isSpectator?: boolean;
  spectatorCount?: number;
  onSecretInputChange: (value: string) => void;
  onGuessInputChange: (value: string) => void;
  onSetSecret: (event: FormEvent<HTMLFormElement>) => void;
  onRpsChoice: (choice: RpsChoice) => void;
  onSendGuess: () => void;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
  onCopyRoomId: () => void;
  onShowMatchModalChange: (isOpen: boolean) => void;
  onShowGuessHistoryModalChange: (isOpen: boolean) => void;
  onShowNumberPadChange: (isOpen: boolean) => void;
}

export function ActiveRoom({
  room,
  user,
  me,
  opponent,
  myPlayerIndex,
  opponentPlayerIndex,
  secretInput,
  guessInput,
  opponentSecretSet,
  opponentRpsSubmitted,
  opponentWantsPlayAgain,
  copied,
  matchStats,
  matchXpResult,
  secretReveal,
  showMatchModal,
  showGuessHistoryModal,
  showNumberPad,
  showStartCountdown,
  countdown,
  locale,
  t,
  isSpectator = false,
  spectatorCount = 0,
  onSecretInputChange,
  onGuessInputChange,
  onSetSecret,
  onRpsChoice,
  onSendGuess,
  onPlayAgain,
  onLeaveRoom,
  onCopyRoomId,
  onShowMatchModalChange,
  onShowGuessHistoryModalChange,
  onShowNumberPadChange,
}: ActiveRoomProps) {
  const effectiveMe = me || room.players[0] || null;
  const effectiveOpponent = opponent || room.players[1] || null;
  const isMyTurn = !isSpectator && room.activeTurnIndex === myPlayerIndex;
  const isWinner = !isSpectator && room.winnerIndex === myPlayerIndex;
  const normalizedEndReason = matchStats?.endReason?.toLowerCase() || '';
  const canPlayAgain =
    !isSpectator &&
    room.players.length === 2 &&
    !opponent?.hasLeft &&
    !['forfeit', 'leave', 'disconnect'].some((reason) =>
      normalizedEndReason.includes(reason),
    );
  const storedSecret =
    typeof window === 'undefined'
      ? secretInput
      : localStorage.getItem(`secret:${room.roomId}`) || secretInput;

  const myPastGuesses = (room.guesses || [])
    .filter((g) => g.playerIndex === myPlayerIndex)
    .map((g) => g.guess);

  return (
    <div className="flex-1 flex flex-col gap-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-0 min-h-0 [overflow-anchor:none]">
      <ActiveRoomHeader
        room={room}
        me={effectiveMe}
        opponent={effectiveOpponent}
        mySecret={storedSecret}
        copied={copied}
        locale={locale}
        t={t}
        isSpectator={isSpectator}
        spectatorCount={spectatorCount}
        onCopyRoomId={onCopyRoomId}
        onLeaveRoom={onLeaveRoom}
      />

      <section className="flex-1 flex flex-col min-h-[440px] sm:min-h-[470px]">
        {room.state === 'WAITING_FOR_PLAYERS' && (
          <WaitingForOpponentPanel
            roomId={room.roomId}
            copied={copied}
            t={t}
            onCopyRoomId={onCopyRoomId}
          />
        )}

        {room.state === 'SETTING_SECRET' && (
          isSpectator ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto animate-pulse">
                <Eye size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-200">
                {locale === 'vi'
                  ? 'Hai đấu thủ đang bí mật thiết lập mã số...'
                  : 'Both players are setting their secret codes...'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                {locale === 'vi'
                  ? 'Trận đấu sẽ bắt đầu ngay sau khi cả hai người chơi khóa mã thành công.'
                  : 'The battle will start once both players lock their codes.'}
              </p>
            </div>
          ) : (
            <SecretSetupPanel
              isReady={Boolean(me?.ready)}
              opponentSecretSet={opponentSecretSet}
              secretInput={secretInput}
              t={t}
              onSecretInputChange={onSecretInputChange}
              onSubmit={onSetSecret}
            />
          )
        )}

        {room.state === 'RPS_DECISION' && (
          isSpectator ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
              <div className="text-4xl animate-bounce">✊ ✋ ✌️</div>
              <h3 className="text-base sm:text-lg font-bold text-slate-200">
                {locale === 'vi'
                  ? 'Đang oẳn tù tì giành quyền đi trước...'
                  : 'Deciding initiative via Rock-Paper-Scissors...'}
              </h3>
              <p className="text-xs text-slate-400">
                {locale === 'vi'
                  ? 'Người thắng cuộc sẽ có quyền bắn dự đoán đầu tiên.'
                  : 'The winner will guess first in the match.'}
              </p>
            </div>
          ) : (
            <RpsDecisionPanel
              selectedChoice={me?.rpsChoice || null}
              opponentSubmitted={opponentRpsSubmitted}
              t={t}
              onChoose={onRpsChoice}
            />
          )
        )}

        {room.state === 'PLAYING' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {effectiveOpponent && (
              <PlayingArena
                room={room}
                opponent={effectiveOpponent}
                myPlayerIndex={isSpectator ? 0 : myPlayerIndex}
                opponentPlayerIndex={isSpectator ? 1 : opponentPlayerIndex}
                isSpectator={isSpectator}
                locale={locale}
                t={t}
              />
            )}
            <GuessTurnBar
              isMyTurn={isMyTurn}
              isNumberPadOpen={showNumberPad}
              opponentName={
                isSpectator
                  ? (room.players[room.activeTurnIndex]?.username || 'Player')
                  : (opponent?.username || '')
              }
              locale={locale}
              t={t}
              onOpenNumberPad={() => onShowNumberPadChange(true)}
              onCloseNumberPad={() => onShowNumberPadChange(false)}
            />
          </div>
        )}

        {room.state === 'FINISHED' && (
          <FinishedPanel
            isWinner={isWinner}
            opponentName={
              isSpectator
                ? (room.players[room.winnerIndex]?.username || t('enemy'))
                : (opponent?.username || t('enemy'))
            }
            opponentWantsPlayAgain={opponentWantsPlayAgain}
            locale={locale}
            t={t}
            canPlayAgain={canPlayAgain}
            isSpectator={isSpectator}
            winnerName={room.players[room.winnerIndex]?.username || ''}
            onOpenSummary={() => onShowMatchModalChange(true)}
            onOpenGuessHistory={() => onShowGuessHistoryModalChange(true)}
            onPlayAgain={onPlayAgain}
            onLeaveRoom={onLeaveRoom}
          />
        )}
      </section>

      <MatchSummaryModal
        isOpen={showMatchModal && !isSpectator}
        room={room}
        stats={matchStats}
        xpResult={matchXpResult}
        user={user}
        me={me}
        opponent={opponent}
        myPlayerIndex={myPlayerIndex}
        secretReveal={secretReveal}
        locale={locale}
        t={t}
        onClose={() => onShowMatchModalChange(false)}
        onOpenGuessHistory={() => {
          onShowMatchModalChange(false);
          onShowGuessHistoryModalChange(true);
        }}
      />

      <GuessHistoryModal
        isOpen={showGuessHistoryModal}
        room={room}
        me={effectiveMe}
        opponent={effectiveOpponent}
        myPlayerIndex={isSpectator ? 0 : myPlayerIndex}
        opponentPlayerIndex={isSpectator ? 1 : opponentPlayerIndex}
        hasSummary={Boolean(matchStats)}
        locale={locale}
        t={t}
        onClose={() => onShowGuessHistoryModalChange(false)}
        onOpenSummary={() => {
          onShowGuessHistoryModalChange(false);
          onShowMatchModalChange(true);
        }}
      />

      <StartCountdownOverlay
        isOpen={showStartCountdown && !isSpectator}
        countdown={countdown}
        isMyTurn={isMyTurn}
        opponentName={opponent?.username || ''}
        locale={locale}
      />

      <NumberPadModal
        isOpen={showNumberPad && room.state === 'PLAYING' && isMyTurn && !isSpectator}
        value={guessInput}
        locale={locale}
        pastGuesses={myPastGuesses}
        onChange={onGuessInputChange}
        onSubmit={onSendGuess}
        onClose={() => onShowNumberPadChange(false)}
      />
    </div>
  );
}
