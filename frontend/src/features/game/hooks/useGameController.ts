'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

import { createTranslator, translateBackendError } from '../i18n';
import type {
  AiDifficulty,
  ChatMessage,
  DeductionMap,
  DigitDeductionState,
  EquippedTitle,
  FloatingEmote,
  GameProfile,
  LobbyRoom,
  MatchStats,
  Player,
  PlayerXpResult,
  QuickEmote,
  Room,
  RpsChoice,
  RpsClashInfo,
  UnlockedAchievementNotice,
} from '../types';
import {
  calculateLevelProgress,
  getGameApiUrl,
  getSocketUrl,
  isUniqueFourDigitCode,
  normalizeRoomId,
} from '../utils';
import { sound, triggerHaptic } from '../sound';
import { useAuthProfile } from './useAuthProfile';
import { useGameLocale } from './useGameLocale';

function toNonNegativeInteger(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

function normalizeGameProfile(value: unknown): GameProfile {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid game profile payload');
  }

  const candidate = value as Partial<GameProfile>;
  const levelProgress = calculateLevelProgress(toNonNegativeInteger(candidate.totalXp));
  const rating = toNonNegativeInteger(candidate.rating, 1000);
  const highestRating = Math.max(rating, toNonNegativeInteger(candidate.highestRating, 1000));

  return {
    totalXp: levelProgress.totalXp,
    level: toNonNegativeInteger(candidate.level, levelProgress.level),
    currentXp: toNonNegativeInteger(candidate.currentXp, levelProgress.currentXp),
    xpForNextLevel: Math.max(
      1,
      toNonNegativeInteger(candidate.xpForNextLevel, levelProgress.xpForNextLevel),
    ),
    wins: toNonNegativeInteger(candidate.wins),
    losses: toNonNegativeInteger(candidate.losses),
    currentWinStreak: toNonNegativeInteger(candidate.currentWinStreak),
    bestWinStreak: toNonNegativeInteger(candidate.bestWinStreak),
    rating,
    highestRating,
    rank: candidate.rank || 'Đồng',
    rankEn: candidate.rankEn || 'Bronze',
    rankKey: candidate.rankKey || 'bronze',
    ratingToNextRank: candidate.ratingToNextRank !== undefined ? candidate.ratingToNextRank : null,
    equippedTitleId: candidate.equippedTitleId ?? (candidate.equippedTitle?.id || null),
    equippedTitle: candidate.equippedTitle || null,
  };
}

function isSameLobbyRooms(a: LobbyRoom[], b: LobbyRoom[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]?.roomId !== b[i]?.roomId ||
      a[i]?.playerCount !== b[i]?.playerCount ||
      a[i]?.spectatorCount !== b[i]?.spectatorCount ||
      a[i]?.state !== b[i]?.state ||
      a[i]?.hostName !== b[i]?.hostName ||
      a[i]?.hostAvatar !== b[i]?.hostAvatar ||
      a[i]?.hostEquippedTitle?.id !== b[i]?.hostEquippedTitle?.id
    ) {
      return false;
    }
  }
  return true;
}

const INITIAL_DEDUCTION_MAP: DeductionMap = {
  0: 'neutral',
  1: 'neutral',
  2: 'neutral',
  3: 'neutral',
  4: 'neutral',
  5: 'neutral',
  6: 'neutral',
  7: 'neutral',
  8: 'neutral',
  9: 'neutral',
};

export function useGameController() {
  const { locale, mounted, t, toggleLocale } = useGameLocale();
  const {
    user,
    token,
    loadingUser,
    authError,
    setAuthError,
    parentMovieUser,
    parentMovieToken,
    isDifferentAccount,
    loginWithCredentials,
    useParentMovieAccount,
    logout,
  } = useAuthProfile();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [dualAccountNotice, setDualAccountNotice] = useState<{
    isOpen: boolean;
    movieUser: string;
    gameUser: string;
  }>({
    isOpen: false,
    movieUser: '',
    gameUser: '',
  });

  useEffect(() => {
    if (isDifferentAccount && parentMovieUser && user && String(parentMovieUser.id) !== String(user.id)) {
      setDualAccountNotice({
        isOpen: true,
        movieUser: parentMovieUser.name,
        gameUser: user.name,
      });
    }
  }, [isDifferentAccount, parentMovieUser, user]);

  const [lobbyRooms, setLobbyRooms] = useState<LobbyRoom[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const preRoomsRaw = urlParams.get('preRooms');
        if (preRoomsRaw) {
          const parsed = JSON.parse(decodeURIComponent(preRoomsRaw));
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Ignore URL parse error
      }
    }
    return [];
  });
  const [isRefreshingLobby, setIsRefreshingLobby] = useState(false);
  const refreshUntilRef = useRef<number>(0);
  const [room, setRoom] = useState<Room | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secretInput, setSecretInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [opponentRpsSubmitted, setOpponentRpsSubmitted] = useState(false);
  const [rpsClash, setRpsClash] = useState<RpsClashInfo | null>(null);
  const [opponentSecretSet, setOpponentSecretSet] = useState(false);
  const [opponentWantsPlayAgain, setOpponentWantsPlayAgain] = useState(false);
  const [isRequestingPlayAgain, setIsRequestingPlayAgain] = useState(false);
  const [secretReveal, setSecretReveal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [matchXpResult, setMatchXpResult] = useState<PlayerXpResult | null>(null);
  const [gameProfile, setGameProfile] = useState<GameProfile | null>(null);
  const [isLoadingGameProfile, setIsLoadingGameProfile] = useState(true);
  const [gameProfileError, setGameProfileError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState(120);
  const [opponentTempDisconnected, setOpponentTempDisconnected] = useState<string | null>(
    null,
  );
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showGuessHistoryModal, setShowGuessHistoryModal] = useState(false);
  const [showStartCountdown, setShowStartCountdown] = useState(false);
  const [countdownVal, setCountdownVal] = useState(3);
  const [showNumPad, setShowNumPad] = useState(false);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [floatingEmotes, setFloatingEmotes] = useState<FloatingEmote[]>([]);
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<
    UnlockedAchievementNotice[]
  >([]);
  const [toastAchievements, setToastAchievements] = useState<UnlockedAchievementNotice[]>([]);
  const [isEquippingTitleId, setIsEquippingTitleId] = useState<string | null>(null);
  const [isQuickMatching, setIsQuickMatching] = useState(false);
  const [quickMatchElapsedSeconds, setQuickMatchElapsedSeconds] = useState(0);
  const [quickMatchFoundRoom, setQuickMatchFoundRoom] = useState<{
    roomId: string;
    hostName: string;
  } | null>(null);

  const [opponentTypingCount, setOpponentTypingCount] = useState(0);
  const [lastOpponentActivityAt, setLastOpponentActivityAt] = useState(() => Date.now());
  const [opponentIsVisible, setOpponentIsVisible] = useState(true);
  const [turnStartTime, setTurnStartTime] = useState(() => Date.now());

  const [deductionMap, setDeductionMap] = useState<DeductionMap>(INITIAL_DEDUCTION_MAP);
  const [isAutoEliminate, setIsAutoEliminate] = useState(true);

  const handleToggleDeductionDigit = useCallback((digit: number) => {
    setDeductionMap((prev) => {
      const current = prev[digit] || 'neutral';
      let next: DigitDeductionState = 'neutral';
      if (current === 'neutral') next = 'eliminated';
      else if (current === 'eliminated') next = 'confirmed';
      else next = 'neutral';
      return { ...prev, [digit]: next };
    });
  }, []);

  const handleResetDeductions = useCallback(() => {
    setDeductionMap(INITIAL_DEDUCTION_MAP);
  }, []);

  const handleToggleAutoEliminate = useCallback(() => {
    setIsAutoEliminate((prev) => !prev);
  }, []);

  const socketRef = useRef<Socket | null>(null);
  const lastGuessSubmitTimeRef = useRef(0);
  const localeRef = useRef(locale);
  const userRef = useRef(user);
  const previousRoomStateRef = useRef<string | null>(null);
  const gameProfileRequestIdRef = useRef(0);
  const gameProfileRef = useRef<GameProfile | null>(null);
  const quickMatchEnteringRef = useRef(false);

  const originalDocumentTitleRef = useRef<string>('');
  const titleFlashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeAlertTitleRef = useRef<string | null>(null);

  const stopTitleFlash = useCallback(() => {
    if (titleFlashIntervalRef.current) {
      clearInterval(titleFlashIntervalRef.current);
      titleFlashIntervalRef.current = null;
    }
    activeAlertTitleRef.current = null;
    if (typeof document !== 'undefined' && originalDocumentTitleRef.current) {
      document.title = originalDocumentTitleRef.current;
    }
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'GAME_TAB_FLASH', isAlert: false }, '*');
      } catch {}
    }
  }, []);

  const startTitleFlash = useCallback((alertTitle: string) => {
    if (typeof document === 'undefined') return;

    if (!originalDocumentTitleRef.current) {
      originalDocumentTitleRef.current =
        document.title || 'Đoán Mật Mã Số 1v1 - Đấu Trường Trực Tuyến Realtime';
    }

    if (activeAlertTitleRef.current === alertTitle && titleFlashIntervalRef.current) {
      return;
    }

    if (titleFlashIntervalRef.current) {
      clearInterval(titleFlashIntervalRef.current);
      titleFlashIntervalRef.current = null;
    }

    activeAlertTitleRef.current = alertTitle;

    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'GAME_TAB_FLASH', isAlert: true, alertTitle }, '*');
      } catch {}
    }

    let showFlash = true;
    document.title = alertTitle;

    titleFlashIntervalRef.current = setInterval(() => {
      showFlash = !showFlash;
      document.title = showFlash
        ? alertTitle
        : (originalDocumentTitleRef.current || 'Đoán Mật Mã Số 1v1 - Đấu Trường Trực Tuyến Realtime');
    }, 1000);
  }, []);

  const startTitleFlashRef = useRef(startTitleFlash);
  startTitleFlashRef.current = startTitleFlash;

  const stopTitleFlashRef = useRef(stopTitleFlash);
  stopTitleFlashRef.current = stopTitleFlash;

  const loadGameProfile = useCallback(async () => {
    const requestId = ++gameProfileRequestIdRef.current;

    // Stale-While-Revalidate: Instant 0ms cache preload from localStorage
    try {
      const cached = localStorage.getItem('game_profile_cache');
      if (cached && !gameProfileRef.current) {
        const parsed: unknown = JSON.parse(cached);
        const cachedProfile = normalizeGameProfile(parsed);
        gameProfileRef.current = cachedProfile;
        setGameProfile(cachedProfile);
        setIsLoadingGameProfile(false);
      } else if (!gameProfileRef.current) {
        setIsLoadingGameProfile(true);
      }
    } catch {
      if (!gameProfileRef.current) {
        setIsLoadingGameProfile(true);
      }
    }

    setGameProfileError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Missing authentication token');

      const response = await fetch(getGameApiUrl('/api/game-profile'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Game profile request failed with status ${response.status}`);
      }

      const data: unknown = await response.json();
      const profilePayload =
        data && typeof data === 'object' && 'profile' in data
          ? (data as { profile: unknown }).profile
          : null;
      const nextProfile = normalizeGameProfile(profilePayload);

      if (gameProfileRequestIdRef.current === requestId) {
        gameProfileRef.current = nextProfile;
        setGameProfile(nextProfile);
        setGameProfileError(null);
        try {
          localStorage.setItem('game_profile_cache', JSON.stringify(nextProfile));
        } catch {
          // Ignore storage quota error
        }
      }
    } catch (error) {
      console.error('Failed to load game profile:', error);
      if (gameProfileRequestIdRef.current === requestId && !gameProfileRef.current) {
        setGameProfileError('LOAD_FAILED');
      }
    } finally {
      if (gameProfileRequestIdRef.current === requestId) {
        setIsLoadingGameProfile(false);
      }
    }
  }, []);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const timeoutId = window.setTimeout(() => {
      void loadGameProfile();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadGameProfile, user]);

  const roomState = room?.state;

  useEffect(() => {
    if (!roomState) {
      previousRoomStateRef.current = null;
      return;
    }

    if (roomState === 'PLAYING' && previousRoomStateRef.current === 'RPS_DECISION') {
      setShowStartCountdown(true);
    }
    previousRoomStateRef.current = roomState;
  }, [roomState]);

  const wasMyTurnRef = useRef(false);

  useEffect(() => {
    if (!room || !user) {
      wasMyTurnRef.current = false;
      setShowNumPad(false);
      return;
    }
    if (room.state === 'PLAYING') {
      const myPlayerIndex = room.players.findIndex(
        (player) => String(player.userId) === String(user.id),
      );
      const isMyTurnNow =
        !isSpectator && myPlayerIndex !== -1 && room.activeTurnIndex === myPlayerIndex;

      if (!isMyTurnNow) {
        setShowNumPad(false);
      }

      // Do not trigger turn alert while the start countdown modal is active
      if (showStartCountdown) {
        return;
      }

      if (!wasMyTurnRef.current && isMyTurnNow) {
        sound.playAlertTing();
        triggerHaptic(25); // Gentle haptic tap
        if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) {
          startTitleFlash(createTranslator(localeRef.current)('tabYourTurn'));
        }
      } else if (wasMyTurnRef.current && !isMyTurnNow) {
        sound.playOpponentTurn();
        if (activeAlertTitleRef.current === createTranslator(localeRef.current)('tabYourTurn')) {
          stopTitleFlash();
        }
      }
      wasMyTurnRef.current = isMyTurnNow;
    } else {
      wasMyTurnRef.current = false;
      setShowNumPad(false);
      if (activeAlertTitleRef.current === createTranslator(localeRef.current)('tabYourTurn')) {
        stopTitleFlash();
      }
    }
  }, [
    room?.state,
    room?.activeTurnIndex,
    room?.players,
    user,
    isSpectator,
    showStartCountdown,
    startTitleFlash,
    stopTitleFlash,
  ]);

  // Auto-eliminate digits that produced 0 Bulls & 0 Cows in player's guesses
  useEffect(() => {
    if (!room || room.state !== 'PLAYING' || !isAutoEliminate) return;
    const myPlayerIndex = room.players.findIndex(
      (p) => String(p.userId) === String(user?.id)
    );
    if (myPlayerIndex === -1) return;

    const zeroZeroGuesses = room.guesses.filter(
      (g) => g.playerIndex === myPlayerIndex && g.correctNumbers === 0 && g.correctPosition === 0
    );
    if (zeroZeroGuesses.length === 0) return;

    setDeductionMap((prev) => {
      let hasChange = false;
      const next = { ...prev };
      zeroZeroGuesses.forEach((g) => {
        for (const ch of g.guess) {
          const d = Number(ch);
          if (!Number.isNaN(d) && next[d] !== 'eliminated') {
            next[d] = 'eliminated';
            hasChange = true;
          }
        }
      });
      return hasChange ? next : prev;
    });
  }, [room?.guesses, room?.state, room?.players, user?.id, isAutoEliminate]);

  // --- Fast REST Pre-fetch for Instant Room List Display ---
  useEffect(() => {
    let active = true;

    // Fetch fresh rooms from /api/rooms (no-store to bypass browser HTTP cache)
    const prefetchRooms = async () => {
      try {
        const response = await fetch(getGameApiUrl('/api/rooms'), { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (active && Array.isArray(data?.rooms)) {
            setLobbyRooms(data.rooms);
            setIsRefreshingLobby(false);
          }
        }
      } catch {
        // Ignore prefetch error
      }
    };
    void prefetchRooms();
    return () => {
      active = false;
    };
  }, []);

  // 120-second reconnect grace period countdown
  useEffect(() => {
    if (!isReconnecting) {
      setReconnectCountdown(120);
      return;
    }

    const timer = window.setInterval(() => {
      setReconnectCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setIsReconnecting(false);
          setRoom(null);
          setErrorMsg(
            localeRef.current === 'vi'
              ? 'Mất kết nối quá 120 giây, đã trở về sảnh chính.'
              : 'Connection lost for more than 120s, returned to lobby.'
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isReconnecting]);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(getSocketUrl(), {
      auth: {
        token,
        username: userRef.current?.name || '',
        avatar: userRef.current?.avatar || '',
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 100,
      reconnectionDelayMax: 500,
      randomizationFactor: 0.1,
      timeout: 5000,
    });
    socketRef.current = socket;

    const translate = () => createTranslator(localeRef.current);

    const connectionTimer = setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
        setIsReconnecting(true);
      }
    }, 1000);

    // 1. Bind event listeners FIRST so no server events are missed
    socket.on('LOBBY_ROOMS', (roomsList: LobbyRoom[]) => {
      if (Array.isArray(roomsList)) {
        setLobbyRooms((prev) => (isSameLobbyRooms(prev, roomsList) ? prev : roomsList));
      }
      if (Date.now() >= refreshUntilRef.current) {
        setIsRefreshingLobby(false);
      }
    });

    socket.on('RECONNECTED_TO_ROOM', (reconnectedRoom: Room) => {
      if (quickMatchEnteringRef.current) return;
      console.log('Successfully reconnected to active room:', reconnectedRoom.roomId);
      if (reconnectedRoom && reconnectedRoom.state !== 'FINISHED') {
        setRoom(reconnectedRoom);
        setIsSpectator(false);
        setSpectatorCount(reconnectedRoom.spectators?.length || 0);
        setErrorMsg(null);

        const myIdStr = String(userRef.current?.id || '');
        const opp = reconnectedRoom.players?.find((p) => String(p.userId) !== myIdStr);
        if (reconnectedRoom.state === 'SETTING_SECRET') {
          setOpponentSecretSet(Boolean(opp?.ready));
        } else if (reconnectedRoom.state === 'RPS_DECISION') {
          setOpponentRpsSubmitted(Boolean(opp?.ready || opp?.rpsChoice));
        }
        setOpponentTempDisconnected(opp?.disconnectedAt ? opp.username : null);
      } else {
        setRoom(null);
      }
      setIsReconnecting(false);
      setReconnectCountdown(120);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsReconnecting(true);
      setReconnectCountdown(120);
    });

    socket.io.on('reconnect_attempt', () => {
      setIsReconnecting(true);
    });

    socket.on('connect', () => {
      console.log('Connected to socket server');
      clearTimeout(connectionTimer);
      setErrorMsg(null);
      setIsReconnecting(false);
      setReconnectCountdown(120);
      socket.emit('GET_LOBBY_ROOMS');
      socket.emit('CHECK_ACTIVE_ROOM');
    });

    // If socket was already connected on mount, request rooms immediately
    if (socket.connected) {
      socket.emit('GET_LOBBY_ROOMS');
      socket.emit('CHECK_ACTIVE_ROOM');
    }

    socket.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
      clearTimeout(connectionTimer);
      if (error.message?.includes('AUTH_ERROR')) {
        setAuthError('INVALID_TOKEN');
      } else {
        setIsReconnecting(true);
      }
    });

    socket.io.on('reconnect_failed', () => {
      console.error('Socket reconnection failed permanently');
      clearTimeout(connectionTimer);
      setErrorMsg(translate()('cannotConnect'));
      setIsReconnecting(false);
      setReconnectCountdown(120);
    });

    socket.on('ROOM_CREATED', (createdRoom: Room) => {
      setIsQuickMatching(false);
      setQuickMatchElapsedSeconds(0);
      setQuickMatchFoundRoom(null);
      setRoom(createdRoom);
      setIsSpectator(false);
      setSpectatorCount(0);
      setChatMessages([]);
      setMatchStats(null);
      setMatchXpResult(null);
      setErrorMsg(null);
    });

    socket.on(
      'QUICK_MATCH_FOUND',
      (data: { roomId: string; hostName: string; room: Room }) => {
        if (quickMatchEnteringRef.current) return;
        quickMatchEnteringRef.current = true;
        setQuickMatchFoundRoom({
          roomId: data.roomId,
          hostName: data.hostName || 'Player',
        });
        setErrorMsg(null);
        setOpponentSecretSet(false);
        setOpponentRpsSubmitted(false);
        setOpponentWantsPlayAgain(false);
        setIsRequestingPlayAgain(false);
        setSecretInput('');
        setGuessInput('');
        setSecretReveal(null);
        setMatchStats(null);
        setMatchXpResult(null);
        setShowMatchModal(false);
        setShowGuessHistoryModal(false);
        setOpponentTempDisconnected(null);
        sound.playOpponentJoined();
        triggerHaptic([50, 30, 60]);
        window.setTimeout(() => {
          quickMatchEnteringRef.current = false;
          setIsQuickMatching(false);
          setQuickMatchElapsedSeconds(0);
          setQuickMatchFoundRoom(null);
          setRoom((prev) => prev || data.room);
          setIsSpectator(false);
          setSpectatorCount(data.room.spectators?.length || 0);
        }, 2200);
      },
    );

    socket.on('GAME_START', (startRoom: Room) => {
      setIsQuickMatching(false);
      setQuickMatchElapsedSeconds(0);
      setQuickMatchFoundRoom(null);
      setRoom(startRoom);
      setIsSpectator(false);
      setSpectatorCount(0);
      setOpponentSecretSet(false);
      setOpponentRpsSubmitted(false);
      setOpponentWantsPlayAgain(false);
      setIsRequestingPlayAgain(false);
      setSecretInput('');
      setGuessInput('');
      setSecretReveal(null);
      setMatchStats(null);
      setMatchXpResult(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setOpponentTempDisconnected(null);
      setDeductionMap(INITIAL_DEDUCTION_MAP);
      sound.playOpponentJoined();
      triggerHaptic([50]);
      if (typeof document !== 'undefined' && (document.hidden || !document.hasFocus())) {
        startTitleFlashRef.current(createTranslator(localeRef.current)('tabOpponentJoined'));
      }

      if (startRoom.isAiRoom) {
        const diff = startRoom.aiDifficulty || 'Medium';
        const notice = translate()('aiRoomWelcome').replace('{difficulty}', diff);
        setErrorMsg(notice);
        setTimeout(() => {
          setErrorMsg((prev) => (prev === notice ? null : prev));
        }, 5000);
      }
    });

    socket.on('PLAYER_JOINED', (data: { username: string; hostUsername: string; roomState: Room }) => {
      setRoom(data.roomState);
      const isMe = userRef.current?.name === data.username;
      const hostName = data.hostUsername || 'Host';
      const notice = isMe
        ? translate()('youJoinedRoom').replace('{username}', hostName)
        : translate()('playerJoinedRoom').replace('{username}', data.username);

      setErrorMsg(notice);
      sound.playOpponentJoined();
      triggerHaptic([50, 30]);
      setTimeout(() => {
        setErrorMsg((prev) => (prev === notice ? null : prev));
      }, 5000);
    });

    socket.on('SPECTATOR_JOINED', (data: { room: Room; spectatorCount: number }) => {
      setRoom(data.room);
      setIsSpectator(true);
      setSpectatorCount(data.spectatorCount || 0);
      setChatMessages([]);
      setMatchStats(null);
      setMatchXpResult(null);
      const p1 = data.room.players[0]?.username || 'Player 1';
      const p2 = data.room.players[1]?.username || 'Player 2';
      const notice = translate()('spectatingMatchNotice')
        .replace('{p1}', p1)
        .replace('{p2}', p2);
      setErrorMsg(notice);
      setTimeout(() => {
        setErrorMsg((prev) => (prev === notice ? null : prev));
      }, 5000);
    });

    socket.on('SPECTATOR_JOINED_NOTICE', (data: { username: string; spectatorCount: number }) => {
      setSpectatorCount(data.spectatorCount || 0);
      const notice = translate()('spectatorJoinedNotice').replace('{username}', data.username);
      setErrorMsg(notice);
      setTimeout(() => {
        setErrorMsg((prev) => (prev === notice ? null : prev));
      }, 4000);
    });

    socket.on('SPECTATOR_COUNT_CHANGED', (data: { count: number }) => {
      setSpectatorCount(data.count || 0);
    });

    socket.on('SPECTATOR_LEFT', () => {
      setIsSpectator(false);
      setRoom(null);
      setSpectatorCount(0);
      setChatMessages([]);
    });

    socket.on('SECRET_ACCEPTED', () => {
      setErrorMsg(null);
      setRoom((previousRoom) => {
        if (!previousRoom) return null;
        const players = [...previousRoom.players];
        const playerIndex = players.findIndex((player) => player.userId === userRef.current?.id);
        if (playerIndex !== -1 && players[playerIndex]) {
          players[playerIndex] = { ...players[playerIndex], ready: true };
        }
        return { ...previousRoom, players };
      });
    });

    socket.on('OPPONENT_SECRET_SET', () => {
      setOpponentSecretSet(true);
      sound.playOpponentSecretReady();
      triggerHaptic([35, 45]);
    });

    socket.on('PLAYER_READY', (data: { userId: string; username: string }) => {
      if (data.userId === userRef.current?.id) {
        setErrorMsg(null);
        setRoom((previousRoom) => {
          if (!previousRoom) return null;
          const players = [...previousRoom.players];
          const playerIndex = players.findIndex((player) => player.userId === userRef.current?.id);
          if (playerIndex !== -1 && players[playerIndex]) {
            players[playerIndex] = { ...players[playerIndex], ready: true };
          }
          return { ...previousRoom, players };
        });
      } else {
        setOpponentSecretSet(true);
        sound.playOpponentSecretReady();
        triggerHaptic([35, 45]);
      }
    });

    const handleRpsPhase = (rpsRoom: Room) => {
      setRoom(rpsRoom);
      setOpponentRpsSubmitted(false);
    };
    socket.on('RPS_PHASE', handleRpsPhase);
    socket.on('START_RPS', handleRpsPhase);

    const handleOpponentRpsSubmitted = () => {
      setOpponentRpsSubmitted(true);
      sound.playOpponentSecretReady();
      triggerHaptic([30]);
    };
    socket.on('OPPONENT_RPS_SUBMITTED', handleOpponentRpsSubmitted);
    socket.on('OPPONENT_RPS_READY', handleOpponentRpsSubmitted);

    socket.on(
      'RPS_TIE',
      (data: { players: Player[]; p1Choice?: string; p2Choice?: string }) => {
        setOpponentRpsSubmitted(false);
        sound.playRpsTie();
        triggerHaptic([50, 50]);

        if (data.p1Choice && data.p2Choice) {
          setRpsClash({
            winnerIndex: -1,
            p1Choice: data.p1Choice,
            p2Choice: data.p2Choice,
          });
          setTimeout(() => {
            setRpsClash(null);
            setRoom((previousRoom) =>
              previousRoom ? { ...previousRoom, players: data.players } : null,
            );
            setErrorMsg(translate()('drawChooseAgain'));
            setTimeout(() => setErrorMsg(null), 3000);
          }, 1200);
        } else {
          setRoom((previousRoom) =>
            previousRoom ? { ...previousRoom, players: data.players } : null,
          );
          setErrorMsg(translate()('drawChooseAgain'));
          setTimeout(() => setErrorMsg(null), 3000);
        }
      },
    );

    socket.on(
      'RPS_RESULT',
      (data: { winnerIndex: number; p1Choice: string; p2Choice: string; roomState: Room }) => {
        setErrorMsg(null);
        const myIndex = data.roomState.players.findIndex(
          (player) => String(player.userId) === String(userRef.current?.id),
        );
        const isWinner = data.winnerIndex === myIndex;
        if (isWinner) {
          sound.playRpsWin();
          triggerHaptic([60, 40, 100]);
        } else {
          sound.playRpsLose();
          triggerHaptic([40]);
        }

        setRpsClash({
          winnerIndex: data.winnerIndex,
          p1Choice: data.p1Choice,
          p2Choice: data.p2Choice,
        });

        setTimeout(() => {
          setRpsClash(null);
          setRoom((curr) => {
            if (!curr) return null;
            const hasNewerGuesses =
              (curr.guesses?.length || 0) > (data.roomState.guesses?.length || 0);
            return {
              ...curr,
              ...data.roomState,
              guesses: hasNewerGuesses ? curr.guesses : (data.roomState.guesses || []),
              activeTurnIndex: hasNewerGuesses
                ? curr.activeTurnIndex
                : data.roomState.activeTurnIndex,
            };
          });
          setShowStartCountdown(true);
        }, 1500);
      },
    );

    socket.on('GUESS_RESULT', (data: { roomState: Room }) => {
      setRoom(data.roomState);
      setGuessInput('');
      setOpponentTypingCount(0);
      setLastOpponentActivityAt(Date.now());
      setErrorMsg(null);
      const latestGuess = data.roomState.guesses?.[data.roomState.guesses.length - 1];
      if (latestGuess) {
        const myIndex = data.roomState.players.findIndex(
          (player) => String(player.userId) === String(userRef.current?.id),
        );
        if (latestGuess.playerIndex === myIndex) {
          sound.playMyGuessResult(latestGuess.correctNumbers, latestGuess.correctPosition);
          triggerHaptic(latestGuess.correctNumbers > 0 ? [35] : [60]);
        } else {
          sound.playOpponentGuessResult(latestGuess.correctNumbers, latestGuess.correctPosition);
          triggerHaptic(
            latestGuess.correctNumbers >= 3 || latestGuess.correctPosition >= 2
              ? [80, 40, 80]
              : [30]
          );
        }
      }
    });

    socket.on(
      'GAME_OVER',
      (data: { roomState: Room; opponentSecret: string; matchStats: MatchStats }) => {
        setRoom(data.roomState);
        setSecretReveal(data.opponentSecret);
        setMatchStats(data.matchStats ?? null);

        const rawXpResult = data.matchStats?.xpResults?.find(
          (result) => String(result.userId) === String(userRef.current?.id),
        );
        const myUserIdStr = String(userRef.current?.id || '');
        const unlockedList: UnlockedAchievementNotice[] =
          rawXpResult?.newlyUnlockedAchievements ||
          data.matchStats?.newlyUnlockedByUser?.[myUserIdStr] ||
          [];

        if (Array.isArray(unlockedList) && unlockedList.length > 0) {
          setNewlyUnlockedAchievements(unlockedList);
          setToastAchievements(unlockedList);
        } else {
          setNewlyUnlockedAchievements([]);
          setToastAchievements([]);
        }

        if (rawXpResult) {
          const totalXpSnapshot = rawXpResult.totalXp;
          const hasProfileSnapshot =
            typeof totalXpSnapshot === 'number' && totalXpSnapshot >= 0;
          const baseNormalized = hasProfileSnapshot
            ? normalizeGameProfile({
                ...rawXpResult,
                equippedTitleId:
                  rawXpResult.equippedTitleId ?? gameProfileRef.current?.equippedTitleId ?? null,
                equippedTitle:
                  rawXpResult.equippedTitle ?? gameProfileRef.current?.equippedTitle ?? null,
              })
            : gameProfileRef.current || normalizeGameProfile(rawXpResult);
          setMatchXpResult({
            ...baseNormalized,
            userId: rawXpResult.userId,
            xpEarned: toNonNegativeInteger(rawXpResult.xpEarned),
            ratingBefore: rawXpResult.ratingBefore,
            ratingDelta: rawXpResult.ratingDelta,
            ratingAfter: rawXpResult.ratingAfter,
            rankBefore: rawXpResult.rankBefore,
            rankAfter: rawXpResult.rankAfter,
            newlyUnlockedAchievements: unlockedList,
          });
          if (hasProfileSnapshot) {
            gameProfileRequestIdRef.current += 1;
            gameProfileRef.current = baseNormalized;
            setGameProfile(baseNormalized);
            setGameProfileError(null);
            setIsLoadingGameProfile(false);
            try {
              localStorage.setItem('game_profile_cache', JSON.stringify(baseNormalized));
            } catch {
              // Ignore storage error
            }
          } else {
            void loadGameProfile();
          }
        } else {
          setMatchXpResult(null);
        }

        setShowMatchModal(true);
        setOpponentTempDisconnected(null);
        setErrorMsg(null);

        const myIndex = data.roomState.players.findIndex(
          (player) => String(player.userId) === String(userRef.current?.id),
        );
        if (data.roomState.winnerIndex === myIndex) {
          if (
            (rawXpResult?.rankAfter &&
              rawXpResult?.rankBefore &&
              rawXpResult.rankAfter !== rawXpResult.rankBefore) ||
            unlockedList.length > 0
          ) {
            sound.playLevelUp();
          } else {
            sound.playVictory();
          }
          triggerHaptic([100, 50, 100, 50, 200]);
        } else {
          if (unlockedList.length > 0) {
            sound.playLevelUp();
          } else {
            sound.playDefeat();
          }
          triggerHaptic([180]);
        }
      },
    );

    socket.on(
      'MATCH_SETTLED',
      (data: {
        roomId: string;
        matchId: string;
        xpResults?: PlayerXpResult[];
        newlyUnlockedByUser?: Record<string, UnlockedAchievementNotice[]>;
      }) => {
        const rawXpResult = data.xpResults?.find(
          (result) => String(result.userId) === String(userRef.current?.id),
        );
        const myUserIdStr = String(userRef.current?.id || '');
        const unlockedList: UnlockedAchievementNotice[] =
          rawXpResult?.newlyUnlockedAchievements ||
          data.newlyUnlockedByUser?.[myUserIdStr] ||
          [];

        if (Array.isArray(unlockedList) && unlockedList.length > 0) {
          setNewlyUnlockedAchievements(unlockedList);
          setToastAchievements(unlockedList);
        }

        if (rawXpResult) {
          const totalXpSnapshot = rawXpResult.totalXp;
          const hasProfileSnapshot =
            typeof totalXpSnapshot === 'number' && totalXpSnapshot >= 0;
          const baseNormalized = hasProfileSnapshot
            ? normalizeGameProfile({
                ...rawXpResult,
                equippedTitleId:
                  rawXpResult.equippedTitleId ?? gameProfileRef.current?.equippedTitleId ?? null,
                equippedTitle:
                  rawXpResult.equippedTitle ?? gameProfileRef.current?.equippedTitle ?? null,
              })
            : gameProfileRef.current || normalizeGameProfile(rawXpResult);

          setMatchXpResult({
            ...baseNormalized,
            userId: rawXpResult.userId,
            xpEarned: toNonNegativeInteger(rawXpResult.xpEarned),
            ratingBefore: rawXpResult.ratingBefore,
            ratingDelta: rawXpResult.ratingDelta,
            ratingAfter: rawXpResult.ratingAfter,
            rankBefore: rawXpResult.rankBefore,
            rankAfter: rawXpResult.rankAfter,
            newlyUnlockedAchievements: unlockedList,
          });

          if (hasProfileSnapshot) {
            gameProfileRequestIdRef.current += 1;
            gameProfileRef.current = baseNormalized;
            setGameProfile(baseNormalized);
            setGameProfileError(null);
            setIsLoadingGameProfile(false);
            try {
              localStorage.setItem('game_profile_cache', JSON.stringify(baseNormalized));
            } catch {
              // Ignore storage error
            }
          } else {
            void loadGameProfile();
          }

          if (
            (rawXpResult.rankAfter &&
              rawXpResult.rankBefore &&
              rawXpResult.rankAfter !== rawXpResult.rankBefore) ||
            unlockedList.length > 0
          ) {
            sound.playLevelUp();
          }
        }

        setMatchStats((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            xpResults: data.xpResults || prev.xpResults,
            newlyUnlockedByUser: data.newlyUnlockedByUser || prev.newlyUnlockedByUser,
          };
        });
      },
    );

    socket.on('OPPONENT_WANTS_PLAY_AGAIN', () => {
      setOpponentWantsPlayAgain(true);
      sound.playRematchRequest();
      triggerHaptic([40, 40]);
    });

    socket.on('EMOTE_REACTION', (data: FloatingEmote) => {
      sound.playEmoteSound(data.emoji);
      triggerHaptic(25);
      setFloatingEmotes((prev) => [...prev.slice(-8), data]);
      setTimeout(() => {
        setFloatingEmotes((prev) => prev.filter((e) => e.id !== data.id));
      }, 2200);

      const reactionMessage: ChatMessage = {
        username: data.username,
        content: String(data.emoji),
        timestamp: new Date(data.timestamp || Date.now()).toISOString(),
        isSpectator: data.isSpectator,
        type: 'reaction',
        emoji: String(data.emoji),
      };

      setChatMessages((messages) => [...messages, reactionMessage]);
      if (userRef.current && data.username !== userRef.current.name) {
        setUnreadChatCount((count) => count + 1);
      }
    });

    socket.on('OPPONENT_GUESS_TYPING', (data: { digitsCount: number }) => {
      setOpponentTypingCount(data?.digitsCount || 0);
      setLastOpponentActivityAt(Date.now());
    });

    socket.on('OPPONENT_ACTIVITY', () => {
      setLastOpponentActivityAt(Date.now());
    });

    socket.on('OPPONENT_VISIBILITY', (data: { isVisible: boolean }) => {
      setOpponentIsVisible(Boolean(data?.isVisible));
    });

    socket.on('GAME_RESET', (resetRoom: Room) => {
      setRoom(resetRoom);
      setOpponentSecretSet(false);
      setOpponentRpsSubmitted(false);
      setOpponentWantsPlayAgain(false);
      setIsRequestingPlayAgain(false);
      setSecretInput('');
      setGuessInput('');
      setSecretReveal(null);
      setMatchStats(null);
      setMatchXpResult(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setOpponentTempDisconnected(null);
      setErrorMsg(null);
      sound.playBattleStart();
      triggerHaptic([50]);
    });

    socket.on('ROOM_RESET_TO_WAITING', (resetRoom: Room) => {
      setRoom(resetRoom);
      setOpponentSecretSet(false);
      setOpponentRpsSubmitted(false);
      setOpponentWantsPlayAgain(false);
      setIsRequestingPlayAgain(false);
      setSecretInput('');
      setGuessInput('');
      setSecretReveal(null);
      setMatchStats(null);
      setMatchXpResult(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setOpponentTempDisconnected(null);
      setErrorMsg(null);
      sound.playClick();
    });

    socket.on('OPPONENT_FORFEITED', (data: { username: string; roomState: Room }) => {
      if (data?.roomState) {
        setRoom(data.roomState);
      }
      setOpponentSecretSet(false);
      setOpponentRpsSubmitted(false);
      setOpponentWantsPlayAgain(false);
      setIsRequestingPlayAgain(false);
      setSecretInput('');
      setGuessInput('');
      setSecretReveal(null);
      setMatchStats(null);
      setMatchXpResult(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setOpponentTempDisconnected(null);
      sound.playVictory();
      triggerHaptic([100, 50, 100]);
      const opponentName = data?.username || translate()('enemy');
      setErrorMsg(translate()('opponentForfeitedNotice').replace('{username}', opponentName));
      setTimeout(() => setErrorMsg(null), 6000);
    });

    socket.on('PLAYER_DISCONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setErrorMsg(translate()('opponentLeft').replace('{username}', data.username));
      setSecretReveal(null);
      setOpponentWantsPlayAgain(false);
      setIsRequestingPlayAgain(false);
      setOpponentTempDisconnected(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on('ROOM_LEFT', () => {
      stopTitleFlashRef.current();
      setRoom(null);
      setChatMessages([]);
      setMatchStats(null);
      setMatchXpResult(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setOpponentTempDisconnected(null);
      setIsRequestingPlayAgain(false);
      socket.emit('GET_LOBBY_ROOMS');
    });

    socket.on('ROOM_CLOSED_INACTIVITY', (data: { roomId?: string; reason?: string; message?: string }) => {
      stopTitleFlashRef.current();
      setRoom(null);
      setChatMessages([]);
      setMatchStats(null);
      setMatchXpResult(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setOpponentTempDisconnected(null);
      setIsRequestingPlayAgain(false);
      setFloatingEmotes([]);
      sound.playLeaveRoom();
      triggerHaptic([30, 40, 30]);
      const rawMsg = data?.message || 'Room closed due to 5 minutes of inactivity.';
      const localizedMsg = translateBackendError(rawMsg, localeRef.current);
      setErrorMsg(localizedMsg);
      setTimeout(() => setErrorMsg(null), 6000);
      socket.emit('GET_LOBBY_ROOMS');
    });

    socket.on('OPPONENT_AFK_KICKED', (data: { username?: string; message?: string }) => {
      sound.playClick();
      const rawMsg = data?.message || 'Opponent did not set their secret within 120s and was returned to the lobby.';
      const localizedMsg = translateBackendError(rawMsg, localeRef.current);
      setErrorMsg(localizedMsg);
      setTimeout(() => setErrorMsg(null), 6000);
      socket.emit('GET_LOBBY_ROOMS');
    });

    socket.on('PLAYER_LEFT', (data: { username: string; roomState: Room }) => {
      if (userRef.current?.name && data.username === userRef.current.name) {
        return;
      }
      setRoom(data.roomState);
      setErrorMsg(translate()('playerLeft').replace('{username}', data.username));
      setOpponentWantsPlayAgain(false);
      setIsRequestingPlayAgain(false);
      setOpponentTempDisconnected(null);
      if (data?.roomState && data.roomState.state !== 'FINISHED') {
        setSecretReveal(null);
        setShowMatchModal(false);
        setShowGuessHistoryModal(false);
      }
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on('OPPONENT_LEFT', (data?: { username?: string; roomState?: Room }) => {
      if (data?.roomState) {
        setRoom(data.roomState);
      } else {
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            players: prev.players.map((p) =>
              String(p.userId) !== String(userRef.current?.id)
                ? { ...p, hasLeft: true }
                : p,
            ),
          };
        });
      }
      setOpponentWantsPlayAgain(false);
      setIsRequestingPlayAgain(false);
      setOpponentTempDisconnected(null);
      if (data?.roomState && data.roomState.state !== 'FINISHED') {
        setSecretReveal(null);
        setShowMatchModal(false);
        setShowGuessHistoryModal(false);
      }
      const opponentName = data?.username || translate()('enemy');
      setErrorMsg(translate()('playerLeft').replace('{username}', opponentName));
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on('PLAYER_TEMPORARILY_DISCONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setOpponentTempDisconnected(data.username);
      sound.playOpponentDisconnected();
      triggerHaptic([70]);
    });

    socket.on('OPPONENT_RECONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setOpponentTempDisconnected(null);
      setErrorMsg(translate()('opponentReconnected').replace('{username}', data.username));
      sound.playOpponentReconnected();
      triggerHaptic([35]);
      setTimeout(() => setErrorMsg(null), 3000);
    });

    socket.on('CHAT_MESSAGE', (message: ChatMessage) => {
      setChatMessages((messages) => [...messages, message]);
      if (userRef.current && message.username !== userRef.current.name) {
        setUnreadChatCount((count) => count + 1);
        sound.playChatPop();
        triggerHaptic(25);
      }
    });

    socket.on('GAME_ERROR', (message: string) => {
      sound.playError();
      triggerHaptic([60, 40]);
      setErrorMsg(translateBackendError(message, localeRef.current));
      setTimeout(() => setErrorMsg(null), 4000);
    });

    // Refresh lobby and active room state when browser tab regains focus (handles mobile tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket.connected) {
        socket.emit('GET_LOBBY_ROOMS');
        socket.emit('CHECK_ACTIVE_ROOM');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(connectionTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [loadGameProfile, setAuthError, token]);

  // Unified single-source lobby sync (Socket primary with 3s silent polling, REST fallback)
  useEffect(() => {
    if (room) return;
    let isMounted = true;

    // Immediately request fresh lobby rooms upon entering lobby
    if (socketRef.current?.connected) {
      socketRef.current.emit('GET_LOBBY_ROOMS');
    }

    // Fallback REST fetch ONLY when socket is not connected
    const fetchRestRooms = () => {
      if (socketRef.current?.connected) return;
      fetch(getGameApiUrl(`/api/rooms?t=${Date.now()}`), { cache: 'no-store' })
        .then((res) => res.json())
        .then((data: unknown) => {
          if (!isMounted) return;
          if (data && typeof data === 'object' && 'rooms' in data && Array.isArray((data as { rooms: unknown }).rooms)) {
            const newRooms = (data as { rooms: LobbyRoom[] }).rooms;
            setLobbyRooms((prev) => (isSameLobbyRooms(prev, newRooms) ? prev : newRooms));
            setIsRefreshingLobby(false);
          }
        })
        .catch(() => {});
    };

    // If socket is not connected after 300ms on mount, do backup REST fetch
    const restTimer = setTimeout(() => {
      if (isMounted && (!socketRef.current || !socketRef.current.connected)) {
        fetchRestRooms();
      }
    }, 300);

    // Polling while in lobby:
    // - If socket is connected: emit GET_LOBBY_ROOMS every 15s (every 5 ticks of 3000ms) to conserve CPU/battery
    // - If socket is disconnected: fallback to REST fetch every 3s
    let tickCount = 0;
    const pollInterval = setInterval(() => {
      if (!isMounted) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return; // Pause polling when tab is hidden to conserve mobile battery
      }
      tickCount++;
      if (socketRef.current?.connected) {
        if (tickCount % 5 === 0) {
          socketRef.current.emit('GET_LOBBY_ROOMS');
        }
      } else {
        fetchRestRooms();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(restTimer);
      clearInterval(pollInterval);
    };
  }, [room]);

  const myPlayerIndex = useMemo(
    () =>
      room && user
        ? room.players.findIndex((player) => String(player.userId) === String(user.id))
        : -1,
    [room, user],
  );
  const opponentPlayerIndex =
    myPlayerIndex === -1 ? -1 : myPlayerIndex === 0 ? 1 : 0;
  const me =
    room && myPlayerIndex !== -1 ? (room.players[myPlayerIndex] ?? null) : null;
  const opponent =
    room && opponentPlayerIndex !== -1
      ? (room.players[opponentPlayerIndex] ?? null)
      : null;

  const isMyTurn = useMemo(
    () =>
      Boolean(
        room?.state === 'PLAYING' &&
          !isSpectator &&
          myPlayerIndex !== -1 &&
          room.activeTurnIndex === myPlayerIndex,
      ),
    [room?.state, room?.activeTurnIndex, isSpectator, myPlayerIndex],
  );

  // --- REAL-TIME TURN INDICATORS & ACTIVITY (Features 1, 2, 4) ---
  const prevTurnForIndicatorRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (room?.state === 'PLAYING') {
      if (prevTurnForIndicatorRef.current !== room.activeTurnIndex) {
        prevTurnForIndicatorRef.current = room.activeTurnIndex;
        setOpponentTypingCount(0);
        setLastOpponentActivityAt(Date.now());
        setTurnStartTime(Date.now());
        setOpponentIsVisible(true);
      }
    } else {
      prevTurnForIndicatorRef.current = undefined;
      setOpponentTypingCount(0);
    }
  }, [room?.state, room?.activeTurnIndex]);

  // Broadcast digits count when I type on my turn (Feature 1)
  useEffect(() => {
    if (room?.state === 'PLAYING' && isMyTurn && room?.roomId) {
      socketRef.current?.emit('GUESS_TYPING', {
        roomId: room.roomId,
        digitsCount: guessInput.length,
      });
    }
  }, [guessInput, isMyTurn, room?.state, room?.roomId]);

  // Throttled user activity heartbeat (mouse/pointer/keyboard) during my turn (Feature 4 - 60s detector)
  const lastActivityEmitRef = useRef(0);
  useEffect(() => {
    if (!isMyTurn || room?.state !== 'PLAYING' || !room?.roomId) return;

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityEmitRef.current > 10000) {
        lastActivityEmitRef.current = now;
        socketRef.current?.emit('PLAYER_ACTIVITY', { roomId: room.roomId });
      }
    };

    window.addEventListener('pointermove', handleUserActivity, { passive: true });
    window.addEventListener('pointerdown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handleUserActivity);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [isMyTurn, room?.state, room?.roomId]);

  // Broadcast visibility change when tab is switched/minimized (Feature 4)
  useEffect(() => {
    if (room?.state !== 'PLAYING' || !room?.roomId) return;

    const handleVisibility = () => {
      const isVisible = document.visibilityState === 'visible';
      socketRef.current?.emit('PLAYER_VISIBILITY', {
        roomId: room.roomId,
        isVisible,
      });
      if (!isVisible && isMyTurn) {
        startTitleFlash(createTranslator(localeRef.current)('tabYourTurn'));
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isMyTurn, room?.state, room?.roomId, startTitleFlash]);

  // Tab Title Flashing: automatically restore title when user returns to tab / focuses window
  useEffect(() => {
    const handleReturnToTab = () => {
      if (document.visibilityState === 'visible') {
        stopTitleFlash();
      }
    };
    const handleWindowFocus = () => {
      stopTitleFlash();
    };

    document.addEventListener('visibilitychange', handleReturnToTab);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleReturnToTab);
      window.removeEventListener('focus', handleWindowFocus);
      stopTitleFlash();
    };
  }, [stopTitleFlash]);

  const handleCreateRoom = () => {
    if (isReconnecting || !socketRef.current?.connected) {
      setErrorMsg(
        localeRef.current === 'vi'
          ? 'Đang kết nối lại, vui lòng chờ trong giây lát...'
          : 'Reconnecting, please wait a moment...'
      );
      return;
    }
    setIsQuickMatching(false);
    setQuickMatchElapsedSeconds(0);
    setQuickMatchFoundRoom(null);
    socketRef.current?.emit('CREATE_ROOM');
  };

  const handleQuickMatch = () => {
    if (isReconnecting || !socketRef.current?.connected) {
      setErrorMsg(
        localeRef.current === 'vi'
          ? 'Đang kết nối lại, vui lòng chờ trong giây lát...'
          : 'Reconnecting, please wait a moment...'
      );
      return;
    }
    if (isQuickMatching || quickMatchFoundRoom) return;
    sound.playClick();
    triggerHaptic(25);
    setErrorMsg(null);
    setIsQuickMatching(true);
    setQuickMatchElapsedSeconds(0);
    setQuickMatchFoundRoom(null);
    socketRef.current?.emit('QUICK_MATCH');
  };

  const handleCancelQuickMatch = () => {
    sound.playClick();
    triggerHaptic(15);
    setIsQuickMatching(false);
    setQuickMatchElapsedSeconds(0);
    setQuickMatchFoundRoom(null);
  };

  const handleStartAiMatch = (difficulty: AiDifficulty) => {
    if (isReconnecting || !socketRef.current?.connected) {
      setErrorMsg(
        localeRef.current === 'vi'
          ? 'Đang kết nối lại, vui lòng chờ trong giây lát...'
          : 'Reconnecting, please wait a moment...'
      );
      return;
    }
    setIsQuickMatching(false);
    setQuickMatchElapsedSeconds(0);
    setQuickMatchFoundRoom(null);
    socketRef.current?.emit('CREATE_AI_ROOM', { difficulty });
  };

  // Continuous 0s -> infinity timer and auto-room scanner while Quick Match is active
  useEffect(() => {
    if (!isQuickMatching || quickMatchFoundRoom || room) return;

    const timer = window.setInterval(() => {
      setQuickMatchElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next % 2 === 0 && !quickMatchEnteringRef.current && socketRef.current?.connected) {
          socketRef.current.emit('QUICK_MATCH');
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isQuickMatching, quickMatchFoundRoom, room]);

  // Instant match trigger whenever LOBBY_ROOMS updates with an open waiting room while searching
  useEffect(() => {
    if (!isQuickMatching || quickMatchFoundRoom || room || quickMatchEnteringRef.current) return;
    const hasOpenWaitingRoom = lobbyRooms.some(
      (r) => r.state === 'WAITING_FOR_PLAYERS' && r.playerCount === 1,
    );
    if (hasOpenWaitingRoom && socketRef.current?.connected) {
      socketRef.current.emit('QUICK_MATCH');
    }
  }, [isQuickMatching, quickMatchFoundRoom, room, lobbyRooms]);

  const handleEquipTitle = useCallback(
    async (achievementId: string | null) => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        setIsEquippingTitleId(achievementId || 'unequip');
        const response = await fetch(getGameApiUrl('/api/achievements/equip'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ achievementId }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          equippedTitleId: string | null;
          equippedTitle: EquippedTitle | null;
        };
        sound.playCopySuccess();
        triggerHaptic(25);
        setGameProfile((prev) => {
          if (!prev) return prev;
          const updated: GameProfile = {
            ...prev,
            equippedTitleId: data.equippedTitleId,
            equippedTitle: data.equippedTitle,
          };
          gameProfileRef.current = updated;
          try {
            localStorage.setItem('game_profile_cache', JSON.stringify(updated));
          } catch {
            // Ignore storage error
          }
          return updated;
        });
        setRoom((prevRoom) => {
          if (!prevRoom || !userRef.current) return prevRoom;
          const players = prevRoom.players.map((p) =>
            p.userId === userRef.current?.id
              ? { ...p, equippedTitle: data.equippedTitle }
              : p,
          );
          return { ...prevRoom, players };
        });
      } catch (err) {
        console.error('Failed to equip title:', err);
      } finally {
        setIsEquippingTitleId(null);
      }
    },
    [],
  );

  useEffect(() => {
    if (toastAchievements.length === 0) return;
    const timer = window.setTimeout(() => {
      setToastAchievements([]);
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [toastAchievements]);

  const handleJoinRoom = (roomId: string) => {
    if (isReconnecting || !socketRef.current?.connected) {
      setErrorMsg(
        localeRef.current === 'vi'
          ? 'Đang kết nối lại, vui lòng chờ trong giây lát...'
          : 'Reconnecting, please wait a moment...'
      );
      return;
    }
    if (!roomId.trim()) {
      setErrorMsg(locale === 'vi' ? 'Vui lòng nhập ID phòng.' : 'Please enter a Room ID.');
      return;
    }
    const normalizedRoomId = normalizeRoomId(roomId);
    if (!normalizedRoomId) {
      setErrorMsg(
        locale === 'vi'
          ? 'ID phòng không đúng định dạng (Ví dụ: G-123456).'
          : 'Invalid Room ID format (example: G-123456).',
      );
      return;
    }
    socketRef.current?.emit('JOIN_ROOM', normalizedRoomId);
  };

  const handleRefreshLobby = async () => {
    if (isRefreshingLobby) return;
    setIsRefreshingLobby(true);
    refreshUntilRef.current = Date.now() + 3000;
    sound.playClick();
    triggerHaptic(20);

    if (socketRef.current?.connected) {
      socketRef.current.emit('GET_LOBBY_ROOMS');
    }
    try {
      const response = await fetch(getGameApiUrl('/api/rooms'), { cache: 'no-store' });
      if (response.ok) {
        const data: unknown = await response.json();
        if (data && typeof data === 'object' && 'rooms' in data && Array.isArray((data as { rooms: unknown }).rooms)) {
          setLobbyRooms((data as { rooms: LobbyRoom[] }).rooms);
        }
      }
    } catch {
      // Ignore manual refresh REST error
    } finally {
      setTimeout(() => {
        setIsRefreshingLobby(false);
      }, 3000);
    }
  };

  const handleSetSecret = (event?: FormEvent<HTMLFormElement>, overrideSecret?: string) => {
    if (event?.preventDefault) event.preventDefault();
    if (!room || isSpectator) return;
    const targetSecret = overrideSecret || secretInput;
    if (!isUniqueFourDigitCode(targetSecret)) {
      setErrorMsg(t('invalidCode'));
      return;
    }
    sound.playSecretLocked();
    triggerHaptic([60, 30, 80]);
    localStorage.setItem(`secret:${room.roomId}`, targetSecret);
    socketRef.current?.emit('SET_SECRET', { roomId: room.roomId, secret: targetSecret });
  };

  const handleRpsChoice = (choice: RpsChoice) => {
    if (!room || !user || isSpectator) return;
    sound.playRpsSelect();
    triggerHaptic(25);
    socketRef.current?.emit('SUBMIT_RPS', { roomId: room.roomId, choice });
    setRoom((previousRoom) => {
      if (!previousRoom) return null;
      const players = [...previousRoom.players];
      const playerIndex = players.findIndex((player) => player.userId === user.id);
      if (playerIndex !== -1 && players[playerIndex]) {
        players[playerIndex] = {
          ...players[playerIndex],
          rpsChoice: choice,
          ready: true,
        };
      }
      return { ...previousRoom, players };
    });
  };

  const handleSendGuess = (overrideGuess?: string) => {
    if (!room || !user || isSpectator) return;
    const targetGuess = overrideGuess || guessInput;
    const now = Date.now();
    if (isSubmittingGuess || now - lastGuessSubmitTimeRef.current < 500) return;

    if (!isUniqueFourDigitCode(targetGuess)) {
      setErrorMsg(t('invalidGuess'));
      return;
    }
    const myPlayerIndex = room.players.findIndex((p) => p.userId === user.id);
    const isDuplicate = room.guesses?.some(
      (g) => g.playerIndex === myPlayerIndex && g.guess === targetGuess
    );
    if (isDuplicate) {
      sound.playWarning();
      triggerHaptic([60, 40, 60]);
      setErrorMsg(t('duplicateGuess'));
      return;
    }

    lastGuessSubmitTimeRef.current = now;
    setIsSubmittingGuess(true);
    setTimeout(() => {
      setIsSubmittingGuess(false);
    }, 500);

    socketRef.current?.emit('SUBMIT_GUESS', {
      roomId: room.roomId,
      guess: targetGuess,
    });
  };

  const handlePlayAgain = () => {
    if (!room || isSpectator || isRequestingPlayAgain) return;
    if (isReconnecting || !socketRef.current?.connected) {
      setErrorMsg(
        localeRef.current === 'vi'
          ? 'Đang kết nối lại, vui lòng chờ trong giây lát...'
          : 'Reconnecting, please wait a moment...'
      );
      return;
    }
    sound.playClick();
    triggerHaptic(25);
    setIsRequestingPlayAgain(true);
    socketRef.current?.emit('PLAY_AGAIN', room.roomId);
  };

  const handleJoinSpectator = (targetRoomId: string) => {
    if (!targetRoomId.trim()) return;
    if (isReconnecting || !socketRef.current?.connected) {
      setErrorMsg(
        localeRef.current === 'vi'
          ? 'Đang kết nối lại, vui lòng chờ trong giây lát...'
          : 'Reconnecting, please wait a moment...'
      );
      return;
    }
    const normalized = normalizeRoomId(targetRoomId);
    if (!normalized) return;
    socketRef.current?.emit('JOIN_SPECTATOR', normalized);
  };

  const handleLeaveSpectator = () => {
    stopTitleFlash();
    setDeductionMap(INITIAL_DEDUCTION_MAP);
    if (room) {
      socketRef.current?.emit('LEAVE_SPECTATOR', room.roomId);
    }
    setIsSpectator(false);
    setRoom(null);
    setSpectatorCount(0);
    setChatMessages([]);
  };

  const handleLeaveRoom = () => {
    stopTitleFlash();
    setDeductionMap(INITIAL_DEDUCTION_MAP);
    if (isSpectator) {
      handleLeaveSpectator();
      return;
    }
    if (isReconnecting || !socketRef.current?.connected) {
      setErrorMsg(
        localeRef.current === 'vi'
          ? 'Đang kết nối lại, vui lòng chờ trong giây lát...'
          : 'Reconnecting, please wait a moment...'
      );
      return;
    }
    sound.playLeaveRoom();
    triggerHaptic(20);
    socketRef.current?.emit('LEAVE_ROOM', () => {
      void loadGameProfile();
      socketRef.current?.emit('GET_LOBBY_ROOMS');
    });
    setRoom(null);
    setChatMessages([]);
    setMatchStats(null);
    setMatchXpResult(null);
    setShowMatchModal(false);
    setShowGuessHistoryModal(false);
    setOpponentTempDisconnected(null);
    setIsRequestingPlayAgain(false);
    setFloatingEmotes([]);
  };

  const handleSendChat = (eventOrMessage?: FormEvent<HTMLFormElement> | string) => {
    if (typeof eventOrMessage === 'object' && eventOrMessage !== null && 'preventDefault' in eventOrMessage) {
      eventOrMessage.preventDefault();
    }
    const message = typeof eventOrMessage === 'string' ? eventOrMessage : chatInput;
    if (!room || !message || !message.trim()) return;
    socketRef.current?.emit('SEND_MESSAGE', {
      roomId: room.roomId,
      message: message.trim(),
    });
    setChatInput('');
  };

  const handleSendReaction = (emoji: QuickEmote | string) => {
    if (!room) return;
    socketRef.current?.emit('SEND_REACTION', {
      roomId: room.roomId,
      emoji,
    });
  };

  const copyRoomId = () => {
    if (!room) return;
    void navigator.clipboard.writeText(room.roomId);
    sound.playCopySuccess();
    triggerHaptic(20);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return {
    mounted,
    locale,
    t,
    toggleLocale,
    user,
    token,
    loadingUser,
    authError,
    lobbyRooms,
    isRefreshingLobby,
    room,
    errorMsg,
    setErrorMsg,
    secretInput,
    setSecretInput,
    guessInput,
    setGuessInput,
    chatInput,
    setChatInput,
    chatMessages,
    unreadChatCount,
    setUnreadChatCount,
    opponentRpsSubmitted,
    rpsClash,
    opponentSecretSet,
    opponentWantsPlayAgain,
    isRequestingPlayAgain,
    secretReveal,
    copied,
    matchStats,
    matchXpResult,
    gameProfile,
    isLoadingGameProfile,
    gameProfileError,
    isReconnecting,
    reconnectCountdown,
    opponentTempDisconnected,
    setOpponentTempDisconnected,
    showMatchModal,
    setShowMatchModal,
    showGuessHistoryModal,
    setShowGuessHistoryModal,
    showStartCountdown,
    setShowStartCountdown,
    countdownVal,
    showNumPad,
    setShowNumPad,
    isSubmittingGuess,
    isSpectator,
    spectatorCount,
    myPlayerIndex,
    opponentPlayerIndex,
    isMyTurn,
    me,
    opponent,
    opponentTypingCount,
    lastOpponentActivityAt,
    opponentIsVisible,
    turnStartTime,
    deductionMap,
    isAutoEliminate,
    handleToggleDeductionDigit,
    handleResetDeductions,
    handleToggleAutoEliminate,
    newlyUnlockedAchievements,
    toastAchievements,
    setToastAchievements,
    isEquippingTitleId,
    isQuickMatching,
    quickMatchElapsedSeconds,
    quickMatchFoundRoom,
    handleCreateRoom,
    handleQuickMatch,
    handleCancelQuickMatch,
    handleStartAiMatch,
    handleEquipTitle,
    handleJoinRoom,
    handleJoinSpectator,
    handleLeaveSpectator,
    handleRefreshLobby,
    loadGameProfile,
    handleSetSecret,
    handleRpsChoice,
    handleSendGuess,
    handlePlayAgain,
    handleLeaveRoom,
    handleSendChat,
    handleSendReaction,
    floatingEmotes,
    copyRoomId,
    parentMovieUser,
    parentMovieToken,
    loginWithCredentials,
    useParentMovieAccount,
    logout,
    isLoginModalOpen,
    setIsLoginModalOpen,
    isLogoutModalOpen,
    setIsLogoutModalOpen,
    dualAccountNotice,
    setDualAccountNotice,
  };
}

export type GameController = ReturnType<typeof useGameController>;
