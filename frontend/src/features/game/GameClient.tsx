'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { RoomChat } from './components/chat/RoomChat';
import { AuthRequiredScreen } from './components/common/AuthRequiredScreen';
import { LoadingScreen } from './components/common/LoadingScreen';
import { GameHeader } from './components/layout/GameHeader';
import {
  MobileRoomTabs,
  type MobileRoomTab,
} from './components/layout/MobileRoomTabs';
import { NotificationStack } from './components/layout/NotificationStack';
import { LobbyScreen } from './components/lobby/LobbyScreen';
import { AiDifficultyModal } from './components/modals/AiDifficultyModal';
import { AllRoomsModal } from './components/modals/AllRoomsModal';
import { ActiveRoom } from './components/room/ActiveRoom';
import { useGameController } from './hooks/useGameController';
import type { AiDifficulty } from './types';
import { getMainSiteUrl, navigateTopWindow } from './utils';

export default function GameClient() {
  const router = useRouter();
  const game = useGameController();
  const [activeMobileTab, setActiveMobileTab] = useState<MobileRoomTab>('arena');
  const [showAllRoomsModal, setShowAllRoomsModal] = useState(false);
  const [showAiDifficultyModal, setShowAiDifficultyModal] = useState(false);
  const [roomId, setRoomId] = useState('');

  if (!game.mounted) {
    return <LoadingScreen />;
  }

  if (game.loadingUser) {
    return <LoadingScreen label={game.t('loadingProfile')} animated />;
  }

  if (game.authError || !game.user) {
    return (
      <AuthRequiredScreen
        t={game.t}
        onLogin={() => navigateTopWindow(getMainSiteUrl('/login'))}
      />
    );
  }

  const user = game.user;
  const startAiMatch = (difficulty: AiDifficulty) => {
    setShowAiDifficultyModal(false);
    game.handleStartAiMatch(difficulty);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white font-sans flex flex-col max-w-full overflow-y-auto no-scrollbar">
      <GameHeader
        user={user}
        locale={game.locale}
        t={game.t}
        onLocaleChange={game.toggleLocale}
        onBackHome={() => navigateTopWindow(getMainSiteUrl())}
        onOpenProfile={() => navigateTopWindow(getMainSiteUrl('/profile'))}
        onOpenHistory={() => router.push(`/history?locale=${game.locale}`)}
        onOpenLeaderboard={() => router.push(`/leaderboard?locale=${game.locale}`)}
      />

      <NotificationStack
        error={game.errorMsg}
        isReconnecting={game.isReconnecting}
        disconnectedOpponent={game.opponentTempDisconnected}
        locale={game.locale}
        t={game.t}
        onDismissError={() => game.setErrorMsg(null)}
        onDismissOpponent={() => game.setOpponentTempDisconnected(null)}
      />

      {game.room && (
        <MobileRoomTabs
          activeTab={activeMobileTab}
          t={game.t}
          onChange={setActiveMobileTab}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-6 p-3 pt-16 sm:pt-20 sm:p-4 mb-4 min-h-0">
        <div
          className={`flex-1 flex flex-col min-w-0 min-h-0 ${
            game.room && activeMobileTab !== 'arena' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {!game.room ? (
            <LobbyScreen
              rooms={game.lobbyRooms}
              isRefreshing={game.isRefreshingLobby}
              locale={game.locale}
              t={game.t}
              roomId={roomId}
              onCreateRoom={game.handleCreateRoom}
              onCreateAiRoom={() => setShowAiDifficultyModal(true)}
              onJoinRoom={game.handleJoinRoom}
              onRoomIdChange={setRoomId}
              onRefresh={game.handleRefreshLobby}
              onViewAllRooms={() => setShowAllRoomsModal(true)}
              onViewLeaderboard={() =>
                router.push(`/leaderboard?locale=${game.locale}`)
              }
            />
          ) : (
            <ActiveRoom
              room={game.room}
              user={user}
              me={game.me}
              opponent={game.opponent}
              myPlayerIndex={game.myPlayerIndex}
              opponentPlayerIndex={game.opponentPlayerIndex}
              secretInput={game.secretInput}
              guessInput={game.guessInput}
              opponentSecretSet={game.opponentSecretSet}
              opponentRpsSubmitted={game.opponentRpsSubmitted}
              opponentWantsPlayAgain={game.opponentWantsPlayAgain}
              copied={game.copied}
              matchStats={game.matchStats}
              secretReveal={game.secretReveal}
              showMatchModal={game.showMatchModal}
              showGuessHistoryModal={game.showGuessHistoryModal}
              showNumberPad={game.showNumPad}
              showStartCountdown={game.showStartCountdown}
              countdown={game.countdownVal}
              locale={game.locale}
              t={game.t}
              onSecretInputChange={game.setSecretInput}
              onGuessInputChange={game.setGuessInput}
              onSetSecret={game.handleSetSecret}
              onRpsChoice={game.handleRpsChoice}
              onSendGuess={game.handleSendGuess}
              onPlayAgain={game.handlePlayAgain}
              onLeaveRoom={game.handleLeaveRoom}
              onCopyRoomId={game.copyRoomId}
              onShowMatchModalChange={game.setShowMatchModal}
              onShowGuessHistoryModalChange={game.setShowGuessHistoryModal}
              onShowNumberPadChange={game.setShowNumPad}
            />
          )}
        </div>

        {game.room && (
          <RoomChat
            messages={game.chatMessages}
            currentUsername={user.name}
            input={game.chatInput}
            t={game.t}
            isActive={activeMobileTab === 'chat'}
            onInputChange={game.setChatInput}
            onSubmit={game.handleSendChat}
            className={activeMobileTab !== 'chat' ? 'hidden lg:flex' : 'flex'}
          />
        )}
      </main>

      <AllRoomsModal
        isOpen={showAllRoomsModal}
        rooms={game.lobbyRooms}
        isRefreshing={game.isRefreshingLobby}
        locale={game.locale}
        t={game.t}
        onRefresh={game.handleRefreshLobby}
        onJoinRoom={game.handleJoinRoom}
        onClose={() => setShowAllRoomsModal(false)}
      />

      <AiDifficultyModal
        isOpen={showAiDifficultyModal}
        locale={game.locale}
        onSelect={startAiMatch}
        onLockedHard={() =>
          game.setErrorMsg(
            game.locale === 'vi'
              ? '🔒 Cấp độ Cực Khó tạm thời đang bị khóa!'
              : '🔒 Hard difficulty is temporarily locked!',
          )
        }
        onClose={() => setShowAiDifficultyModal(false)}
      />
    </div>
  );
}
