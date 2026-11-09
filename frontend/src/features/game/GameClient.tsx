'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

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
import { ActiveRoom } from './components/room/ActiveRoom';
import { useGameController } from './hooks/useGameController';
import type { AiDifficulty } from './types';
import { getMainSiteUrl, navigateTopWindow } from './utils';

const AllRoomsModal = dynamic(
  () => import('./components/modals/AllRoomsModal').then((mod) => mod.AllRoomsModal),
  { ssr: false }
);

const AiDifficultyModal = dynamic(
  () => import('./components/modals/AiDifficultyModal').then((mod) => mod.AiDifficultyModal),
  { ssr: false }
);

const PlayerProfileModal = dynamic(
  () => import('./components/modals/PlayerProfileModal').then((mod) => mod.PlayerProfileModal),
  { ssr: false }
);

const QuickLoginModal = dynamic(
  () => import('./components/modals/QuickLoginModal').then((mod) => mod.QuickLoginModal),
  { ssr: false }
);

const DualAccountNoticeModal = dynamic(
  () => import('./components/modals/DualAccountNoticeModal').then((mod) => mod.DualAccountNoticeModal),
  { ssr: false }
);

const LogoutConfirmModal = dynamic(
  () => import('./components/modals/LogoutConfirmModal').then((mod) => mod.LogoutConfirmModal),
  { ssr: false }
);

export default function GameClient() {
  const router = useRouter();
  const game = useGameController();
  const [activeMobileTab, setActiveMobileTab] = useState<MobileRoomTab>('arena');
  const [showAllRoomsModal, setShowAllRoomsModal] = useState(false);
  const [showAiDifficultyModal, setShowAiDifficultyModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState('');

  const handleOpenProfile = (targetUserId: string | null = null) => {
    setProfileModalUserId(targetUserId || game.user?.id || game.user?.userId || 'me');
    setShowProfileModal(true);
  };

  const isAiMatch = Boolean(game.room?.isAiRoom);
  const effectiveMobileTab: MobileRoomTab = isAiMatch ? 'arena' : activeMobileTab;

  const searchParams = useSearchParams();
  const [isIframeClient, setIsIframeClient] = useState(false);

  useEffect(() => {
    setIsIframeClient(typeof window !== 'undefined' && window.parent !== window);
  }, []);

  const isInIframe = searchParams.get('embedded') === '1' || isIframeClient;

  useEffect(() => {
    if (game.mounted && !game.loadingUser) {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'GAME_READY' }, '*');
      }
    }
  }, [game.mounted, game.loadingUser]);

  if (!game.mounted) {
    return isInIframe ? <div className="min-h-screen bg-[#090a0f]" /> : <LoadingScreen />;
  }

  if (game.loadingUser) {
    return isInIframe ? (
      <div className="min-h-screen bg-[#090a0f]" />
    ) : (
      <LoadingScreen label={game.t('loadingProfile')} animated />
    );
  }

  if (game.authError || !game.user) {
    return (
      <>
        <AuthRequiredScreen
          t={game.t}
          locale={game.locale}
          onLogin={() => game.setIsLoginModalOpen(true)}
          onRegister={() => navigateTopWindow(getMainSiteUrl('/login?mode=register', game.locale))}
        />

        <QuickLoginModal
          isOpen={game.isLoginModalOpen}
          onClose={() => game.setIsLoginModalOpen(false)}
          onSubmitLogin={async (email, pass) => {
            const res = await game.loginWithCredentials(email, pass);
            if (res.success && res.isDifferentFromMovie && game.parentMovieUser) {
              game.setDualAccountNotice({
                isOpen: true,
                movieUser: game.parentMovieUser.name,
                gameUser: res.user?.name || email,
              });
            }
            return res;
          }}
          locale={game.locale}
          t={game.t}
        />

        <DualAccountNoticeModal
          isOpen={game.dualAccountNotice.isOpen}
          onClose={() => game.setDualAccountNotice({ isOpen: false, movieUser: '', gameUser: '' })}
          movieUser={game.dualAccountNotice.movieUser}
          gameUser={game.dualAccountNotice.gameUser}
          locale={game.locale}
          t={game.t}
        />
      </>
    );
  }

  const user = game.user;
  const startAiMatch = (difficulty: AiDifficulty) => {
    setShowAiDifficultyModal(false);
    game.handleStartAiMatch(difficulty);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white font-sans flex flex-col max-w-full overflow-y-auto no-scrollbar">
      {!game.room && (
        <GameHeader
          user={user}
          locale={game.locale}
          t={game.t}
          onLocaleChange={game.toggleLocale}
          onBackHome={() => navigateTopWindow(getMainSiteUrl('', game.locale))}
          onOpenProfile={() => handleOpenProfile(user?.id || user?.userId || 'me')}
          onOpenHistory={() => router.push(`/history?locale=${game.locale}`)}
          onOpenLeaderboard={() => router.push(`/leaderboard?locale=${game.locale}`)}
          onOpenAchievements={() => router.push(`/achievements?locale=${game.locale}`)}
          onSwitchAccount={() => game.setIsLoginModalOpen(true)}
          onLogout={() => game.setIsLogoutModalOpen(true)}
        />
      )}

      <NotificationStack
        error={game.errorMsg}
        isReconnecting={game.isReconnecting}
        reconnectCountdown={game.reconnectCountdown}
        disconnectedOpponent={game.opponentTempDisconnected}
        unlockedAchievements={game.toastAchievements}
        locale={game.locale}
        t={game.t}
        onDismissError={() => game.setErrorMsg(null)}
        onDismissOpponent={() => game.setOpponentTempDisconnected(null)}
        onDismissAchievements={() => game.setToastAchievements([])}
      />

      <main
        className={`flex-1 w-full mx-auto flex flex-col lg:flex-row gap-6 p-3 ${
          game.room ? 'pt-3 sm:pt-4' : 'pt-16 sm:pt-20'
        } sm:p-4 mb-4 min-h-0 ${
          isAiMatch ? 'max-w-5xl justify-center' : 'max-w-[1700px]'
        }`}
      >
        {game.room && !isAiMatch && (
          <MobileRoomTabs
            activeTab={effectiveMobileTab}
            unreadCount={effectiveMobileTab === 'arena' ? game.unreadChatCount : 0}
            t={game.t}
            onChange={(tab) => {
              setActiveMobileTab(tab);
              if (tab === 'chat') {
                game.setUnreadChatCount(0);
              }
            }}
          />
        )}
        <div
          className={`flex-1 flex flex-col min-w-0 min-h-0 h-full ${
            game.room && !isAiMatch && effectiveMobileTab !== 'arena' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {!game.room ? (
            <LobbyScreen
              rooms={game.lobbyRooms}
              isRefreshing={game.isRefreshingLobby}
              locale={game.locale}
              t={game.t}
              roomId={roomId}
              gameProfile={game.gameProfile}
              isLoadingGameProfile={game.isLoadingGameProfile}
              gameProfileError={game.gameProfileError}
              isQuickMatching={game.isQuickMatching}
              quickMatchElapsedSeconds={game.quickMatchElapsedSeconds}
              quickMatchFoundRoom={game.quickMatchFoundRoom}
              onQuickMatch={game.handleQuickMatch}
              onCancelQuickMatch={game.handleCancelQuickMatch}
              onCreateRoom={game.handleCreateRoom}
              onCreateAiRoom={() => setShowAiDifficultyModal(true)}
              onJoinRoom={game.handleJoinRoom}
              onSpectateRoom={game.handleJoinSpectator}
              onRoomIdChange={setRoomId}
              onRefresh={game.handleRefreshLobby}
              onRefreshGameProfile={game.loadGameProfile}
              onViewAllRooms={() => setShowAllRoomsModal(true)}
              onViewLeaderboard={() =>
                router.push(`/leaderboard?locale=${game.locale}`)
              }
              onOpenProfile={handleOpenProfile}
            />
          ) : (
            <ActiveRoom
              room={game.room}
              user={user}
              me={game.me}
              opponent={game.opponent}
              myPlayerIndex={game.myPlayerIndex}
              opponentPlayerIndex={game.opponentPlayerIndex}
              isSpectator={game.isSpectator}
              isReconnecting={game.isReconnecting}
              spectatorCount={game.spectatorCount}
              floatingEmotes={game.floatingEmotes}
              secretInput={game.secretInput}
              guessInput={game.guessInput}
              opponentSecretSet={game.opponentSecretSet}
              opponentRpsSubmitted={game.opponentRpsSubmitted}
              rpsClash={game.rpsClash}
              opponentWantsPlayAgain={game.opponentWantsPlayAgain}
              isRequestingPlayAgain={game.isRequestingPlayAgain}
              copied={game.copied}
              matchStats={game.matchStats}
              matchXpResult={game.matchXpResult}
              newlyUnlockedAchievements={game.newlyUnlockedAchievements}
              equippedTitleId={game.gameProfile?.equippedTitleId || null}
              isEquippingTitleId={game.isEquippingTitleId}
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
              onSwitchToAi={() => setShowAiDifficultyModal(true)}
              onEquipTitle={game.handleEquipTitle}
              onShowMatchModalChange={game.setShowMatchModal}
              onShowGuessHistoryModalChange={game.setShowGuessHistoryModal}
              onShowNumberPadChange={game.setShowNumPad}
              onShowStartCountdownChange={game.setShowStartCountdown}
              onOpenProfile={handleOpenProfile}
            />
          )}
        </div>

        {game.room && !isAiMatch && (
          <RoomChat
            messages={game.chatMessages}
            currentUsername={user.name}
            input={game.chatInput}
            locale={game.locale}
            t={game.t}
            isActive={effectiveMobileTab === 'chat'}
            floatingEmotes={game.floatingEmotes}
            onInputChange={game.setChatInput}
            onSubmit={game.handleSendChat}
            onSendReaction={game.handleSendReaction}
            className={effectiveMobileTab !== 'chat' ? 'hidden lg:flex' : 'flex'}
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
        onSpectateRoom={game.handleJoinSpectator}
        onClose={() => setShowAllRoomsModal(false)}
        onOpenProfile={handleOpenProfile}
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

      <PlayerProfileModal
        isOpen={showProfileModal}
        userId={profileModalUserId}
        currentUserId={user?.id || user?.userId || null}
        locale={game.locale}
        onClose={() => setShowProfileModal(false)}
        onOpenAchievements={() => router.push(`/achievements?locale=${game.locale}`)}
        onOpenHistory={() => router.push(`/history?locale=${game.locale}`)}
        onSwitchAccount={() => {
          setShowProfileModal(false);
          game.setIsLoginModalOpen(true);
        }}
      />

      <QuickLoginModal
        isOpen={game.isLoginModalOpen}
        onClose={() => game.setIsLoginModalOpen(false)}
        onSubmitLogin={async (email, pass) => {
          const res = await game.loginWithCredentials(email, pass);
          if (res.success && res.isDifferentFromMovie && game.parentMovieUser) {
            game.setDualAccountNotice({
              isOpen: true,
              movieUser: game.parentMovieUser.name,
              gameUser: res.user?.name || email,
            });
          }
          return res;
        }}
        locale={game.locale}
        t={game.t}
      />

      <DualAccountNoticeModal
        isOpen={game.dualAccountNotice.isOpen}
        onClose={() => game.setDualAccountNotice({ isOpen: false, movieUser: '', gameUser: '' })}
        movieUser={game.dualAccountNotice.movieUser}
        gameUser={game.dualAccountNotice.gameUser}
        locale={game.locale}
        t={game.t}
      />

      <LogoutConfirmModal
        isOpen={game.isLogoutModalOpen}
        onClose={() => game.setIsLogoutModalOpen(false)}
        onConfirm={() => {
          if (game.room) {
            game.handleLeaveRoom();
          }
          game.logout();
        }}
        locale={game.locale}
        t={game.t}
      />
    </div>
  );
}
