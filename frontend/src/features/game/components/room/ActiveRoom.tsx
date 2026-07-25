'use client';

import type { FormEvent } from 'react';

import type { Translator } from '../../i18n';
import type {
  AuthUser,
  Locale,
  MatchStats,
  Player,
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
  secretReveal: string | null;
  showMatchModal: boolean;
  showGuessHistoryModal: boolean;
  showNumberPad: boolean;
  showStartCountdown: boolean;
  countdown: number;
  locale: Locale;
  t: Translator;
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
  secretReveal,
  showMatchModal,
  showGuessHistoryModal,
  showNumberPad,
  showStartCountdown,
  countdown,
  locale,
  t,
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
  const isMyTurn = room.activeTurnIndex === myPlayerIndex;
  const isWinner = room.winnerIndex === myPlayerIndex;
  const storedSecret =
    typeof window === 'undefined'
      ? secretInput
      : localStorage.getItem(`secret:${room.roomId}`) || secretInput;

  return (
    <div className="flex-1 flex flex-col gap-4 pb-24 sm:pb-0 min-h-0 [overflow-anchor:none]">
      <ActiveRoomHeader
        room={room}
        me={me}
        opponent={opponent}
        mySecret={storedSecret}
        copied={copied}
        locale={locale}
        t={t}
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
          <SecretSetupPanel
            isReady={Boolean(me?.ready)}
            opponentSecretSet={opponentSecretSet}
            secretInput={secretInput}
            t={t}
            onSecretInputChange={onSecretInputChange}
            onSubmit={onSetSecret}
          />
        )}

        {room.state === 'RPS_DECISION' && (
          <RpsDecisionPanel
            selectedChoice={me?.rpsChoice || null}
            opponentSubmitted={opponentRpsSubmitted}
            t={t}
            onChoose={onRpsChoice}
          />
        )}

        {room.state === 'PLAYING' && me && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {opponent && (
              <PlayingArena
                room={room}
                opponent={opponent}
                myPlayerIndex={myPlayerIndex}
                opponentPlayerIndex={opponentPlayerIndex}
                locale={locale}
                t={t}
              />
            )}
            <GuessTurnBar
              isMyTurn={isMyTurn}
              isNumberPadOpen={showNumberPad}
              opponentName={opponent?.username || ''}
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
            opponentName={opponent?.username || t('enemy')}
            opponentWantsPlayAgain={opponentWantsPlayAgain}
            locale={locale}
            t={t}
            onOpenSummary={() => onShowMatchModalChange(true)}
            onOpenGuessHistory={() => onShowGuessHistoryModalChange(true)}
            onPlayAgain={onPlayAgain}
            onLeaveRoom={onLeaveRoom}
          />
        )}
      </section>

      <MatchSummaryModal
        isOpen={showMatchModal}
        room={room}
        stats={matchStats}
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
        me={me}
        opponent={opponent}
        myPlayerIndex={myPlayerIndex}
        opponentPlayerIndex={opponentPlayerIndex}
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
        isOpen={showStartCountdown}
        countdown={countdown}
        isMyTurn={isMyTurn}
        opponentName={opponent?.username || ''}
        locale={locale}
      />

      <NumberPadModal
        isOpen={showNumberPad && room.state === 'PLAYING' && isMyTurn}
        value={guessInput}
        locale={locale}
        onChange={onGuessInputChange}
        onSubmit={onSendGuess}
        onClose={() => onShowNumberPadChange(false)}
      />
    </div>
  );
}
