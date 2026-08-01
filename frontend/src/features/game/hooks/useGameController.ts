'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

import { createTranslator, translateBackendError } from '../i18n';
import type {
  AiDifficulty,
  ChatMessage,
  GameProfile,
  LobbyRoom,
  MatchStats,
  Player,
  PlayerXpResult,
  Room,
  RpsChoice,
} from '../types';
import {
  calculateLevelProgress,
  getGameApiUrl,
  getSocketUrl,
  isUniqueFourDigitCode,
  normalizeRoomId,
} from '../utils';
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
  };
}

function isSameLobbyRooms(a: LobbyRoom[], b: LobbyRoom[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]?.roomId !== b[i]?.roomId ||
      a[i]?.playerCount !== b[i]?.playerCount ||
      a[i]?.state !== b[i]?.state ||
      a[i]?.hostName !== b[i]?.hostName
    ) {
      return false;
    }
  }
  return true;
}

export function useGameController() {
  const { locale, mounted, t, toggleLocale } = useGameLocale();
  const { user, loadingUser, authError, setAuthError } = useAuthProfile();

  const [lobbyRooms, setLobbyRooms] = useState<LobbyRoom[]>([]);
  const [isRefreshingLobby, setIsRefreshingLobby] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secretInput, setSecretInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [opponentRpsSubmitted, setOpponentRpsSubmitted] = useState(false);
  const [opponentSecretSet, setOpponentSecretSet] = useState(false);
  const [opponentWantsPlayAgain, setOpponentWantsPlayAgain] = useState(false);
  const [secretReveal, setSecretReveal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [matchXpResult, setMatchXpResult] = useState<PlayerXpResult | null>(null);
  const [gameProfile, setGameProfile] = useState<GameProfile | null>(null);
  const [isLoadingGameProfile, setIsLoadingGameProfile] = useState(true);
  const [gameProfileError, setGameProfileError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [opponentTempDisconnected, setOpponentTempDisconnected] = useState<string | null>(
    null,
  );
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showGuessHistoryModal, setShowGuessHistoryModal] = useState(false);
  const [showStartCountdown, setShowStartCountdown] = useState(false);
  const [countdownVal, setCountdownVal] = useState(3);
  const [showNumPad, setShowNumPad] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localeRef = useRef(locale);
  const userRef = useRef(user);
  const previousRoomStateRef = useRef<string | null>(null);
  const gameProfileRequestIdRef = useRef(0);
  const gameProfileRef = useRef<GameProfile | null>(null);
  const lastRestFetchTimeRef = useRef<number>(0);

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

    let countdownInterval: ReturnType<typeof setInterval> | undefined;
    if (roomState === 'PLAYING' && previousRoomStateRef.current === 'RPS_DECISION') {
      setShowStartCountdown(true);
      setCountdownVal(3);
      countdownInterval = setInterval(() => {
        setCountdownVal((previousValue) => {
          if (previousValue <= 1) {
            if (countdownInterval) clearInterval(countdownInterval);
            setShowStartCountdown(false);
            return 0;


          }
          return previousValue - 1;
        });
      }, 1000);
    }
    previousRoomStateRef.current = roomState;

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        setShowStartCountdown(false);
      }
    };
  }, [roomState]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (room?.state === 'PLAYING' && user) {
        const playerIndex = room.players.findIndex((player) => player.userId === user.id);
        setShowNumPad(playerIndex !== -1 && room.activeTurnIndex === playerIndex);
        return;
      }
      setShowNumPad(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [room, user]);

  // --- Fast REST Pre-fetch for Instant Room List Display ---
  useEffect(() => {
    let active = true;

    // 1. Check URL query params for ?preRooms=... (0ms instant display from Web Phim)
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const preRoomsRaw = urlParams.get('preRooms');
        if (preRoomsRaw) {
          const parsed = JSON.parse(decodeURIComponent(preRoomsRaw));
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLobbyRooms(parsed);
            setIsRefreshingLobby(false);
          }
        }
      } catch {
        // Ignore URL parse error
      }
    }

    // 2. Fetch fresh rooms from /api/rooms (no-store to bypass browser HTTP cache)
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

  const userId = user?.id;

  useEffect(() => {
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        token = urlParams.get('token');
      } catch {
        // Ignore URL parse error
      }
    }
    if (!token) {
      try {
        token = localStorage.getItem('token');
      } catch {
        // Ignore storage error
      }
    }

    if (!token && !userId) return;

    if (token) {
      try {
        localStorage.setItem('token', token);
      } catch {
        // Ignore storage quota error
      }
    }

    const socket = io(getSocketUrl(), {
      auth: {
        token: token || '',
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

    setIsRefreshingLobby(true);
    const connectionTimer = setTimeout(() => {
      if (socketRef.current && !socketRef.current.connected) {
        setIsReconnecting(true);
      }
    }, 1000);

    // 1. Bind event listeners FIRST so no server events are missed
    socket.on('LOBBY_ROOMS', (roomsList: LobbyRoom[]) => {
      if (Array.isArray(roomsList)) {
        setLobbyRooms((prev) => {
          // If socket sends empty list right after REST API fetched valid rooms, protect the valid rooms
          if (roomsList.length === 0 && prev.length > 0 && Date.now() - lastRestFetchTimeRef.current < 4000) {
            return prev;
          }
          if (isSameLobbyRooms(prev, roomsList)) {
            return prev;
          }
          return roomsList;
        });
      }
      setIsRefreshingLobby(false);
    });

    socket.on('RECONNECTED_TO_ROOM', (reconnectedRoom: Room) => {
      console.log('Successfully reconnected to active room:', reconnectedRoom.roomId);
      if (reconnectedRoom && reconnectedRoom.state !== 'FINISHED') {
        setRoom(reconnectedRoom);
        setErrorMsg(null);
      } else {
        setRoom(null);
      }
      setIsReconnecting(false);
    });

    socket.on('connect', () => {
      console.log('Connected to socket server');
      clearTimeout(connectionTimer);
      setErrorMsg(null);
      setIsReconnecting(false);
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
        setErrorMsg(translate()('authRequired'));
      } else {
        setIsReconnecting(true);
      }
    });

    socket.io.on('reconnect_failed', () => {
      console.error('Socket reconnection failed permanently');
      clearTimeout(connectionTimer);
      setErrorMsg(translate()('cannotConnect'));
      setIsReconnecting(false);
    });

    socket.on('ROOM_CREATED', (createdRoom: Room) => {
      setRoom(createdRoom);
      setChatMessages([]);
      setMatchStats(null);
      setMatchXpResult(null);
      setErrorMsg(null);
    });

    socket.on('GAME_START', (startRoom: Room) => {
      setRoom(startRoom);
      setErrorMsg(null);
      setOpponentSecretSet(false);
      setOpponentRpsSubmitted(false);
      setOpponentWantsPlayAgain(false);
      setSecretInput('');
      setGuessInput('');
      setSecretReveal(null);
      setMatchStats(null);
      setMatchXpResult(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setOpponentTempDisconnected(null);
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
    });

    socket.on('RPS_PHASE', (rpsRoom: Room) => {
      setRoom(rpsRoom);
      setOpponentRpsSubmitted(false);
    });

    socket.on('OPPONENT_RPS_SUBMITTED', () => {
      setOpponentRpsSubmitted(true);
    });

    socket.on('RPS_TIE', (data: { players: Player[] }) => {
      setOpponentRpsSubmitted(false);
      setRoom((previousRoom) =>
        previousRoom ? { ...previousRoom, players: data.players } : null,
      );
      setErrorMsg(translate()('drawChooseAgain'));
      setTimeout(() => setErrorMsg(null), 3000);
    });

    socket.on('RPS_RESULT', (data: { roomState: Room }) => {
      setRoom(data.roomState);
      setErrorMsg(null);
    });

    socket.on('GUESS_RESULT', (data: { roomState: Room }) => {
      setRoom(data.roomState);
      setGuessInput('');
      setErrorMsg(null);
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
        if (rawXpResult) {
          const totalXpSnapshot = rawXpResult.totalXp;
          const hasProfileSnapshot =
            typeof totalXpSnapshot === 'number' && totalXpSnapshot >= 0;
          const updatedProfile =
            hasProfileSnapshot
              ? normalizeGameProfile(rawXpResult)
              : gameProfileRef.current || normalizeGameProfile(rawXpResult);
          setMatchXpResult({
            ...updatedProfile,
            userId: rawXpResult.userId,
            xpEarned: toNonNegativeInteger(rawXpResult.xpEarned),
            ratingBefore: rawXpResult.ratingBefore,
            ratingDelta: rawXpResult.ratingDelta,
            ratingAfter: rawXpResult.ratingAfter,
            rankBefore: rawXpResult.rankBefore,
            rankAfter: rawXpResult.rankAfter,
          });
          if (hasProfileSnapshot) {
            gameProfileRequestIdRef.current += 1;
            gameProfileRef.current = updatedProfile;
            setGameProfile(updatedProfile);
            setGameProfileError(null);
            setIsLoadingGameProfile(false);
          } else {
            void loadGameProfile();
          }
        } else {
          setMatchXpResult(null);
          void loadGameProfile();
        }

        setShowMatchModal(true);
        setOpponentTempDisconnected(null);
        setErrorMsg(null);
      },
    );

    socket.on('OPPONENT_WANTS_PLAY_AGAIN', () => {
      setOpponentWantsPlayAgain(true);
    });

    socket.on('PLAYER_DISCONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setErrorMsg(translate()('opponentLeft').replace('{username}', data.username));
      setSecretReveal(null);
      setOpponentWantsPlayAgain(false);
      setOpponentTempDisconnected(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on('PLAYER_LEFT', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setErrorMsg(translate()('playerLeft').replace('{username}', data.username));
      setSecretReveal(null);
      setOpponentWantsPlayAgain(true);
    });

    socket.on('PLAYER_DISCONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setErrorMsg(translate()('opponentLeft').replace('{username}', data.username));
      setSecretReveal(null);
      setOpponentWantsPlayAgain(false);
      setOpponentTempDisconnected(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on('PLAYER_LEFT', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setErrorMsg(translate()('playerLeft').replace('{username}', data.username));
      setSecretReveal(null);
      setOpponentWantsPlayAgain(false);
      setOpponentTempDisconnected(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on('PLAYER_TEMPORARILY_DISCONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setOpponentTempDisconnected(data.username);
    });

    socket.on('OPPONENT_RECONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setOpponentTempDisconnected(null);
      setErrorMsg(translate()('opponentReconnected').replace('{username}', data.username));
      setTimeout(() => setErrorMsg(null), 3000);
    });

    socket.on('CHAT_MESSAGE', (message: ChatMessage) => {
      setChatMessages((messages) => [...messages, message]);
      if (userRef.current && message.username !== userRef.current.name) {
        setUnreadChatCount((count) => count + 1);
      }
    });

    socket.on('GAME_ERROR', (message: string) => {
      setErrorMsg(translateBackendError(message, localeRef.current));
      setTimeout(() => setErrorMsg(null), 4000);
    });

    // Refresh lobby when browser tab regains focus (handles mobile tab switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket.connected) {
        socket.emit('GET_LOBBY_ROOMS');
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
  }, [loadGameProfile, setAuthError, userId]);

  // Instant REST fetch of /api/rooms on mount & dual-sync with 1-second auto-check
  useEffect(() => {
    if (room) return;
    let isMounted = true;
    const fetchRooms = () => {
      fetch(getGameApiUrl(`/api/rooms?t=${Date.now()}`), { cache: 'no-store' })
        .then((res) => res.json())
        .then((data: unknown) => {
          if (!isMounted) return;
          if (data && typeof data === 'object' && 'rooms' in data && Array.isArray((data as { rooms: unknown }).rooms)) {
            const newRooms = (data as { rooms: LobbyRoom[] }).rooms;
            if (newRooms.length > 0) {
              lastRestFetchTimeRef.current = Date.now();
            }
            setLobbyRooms((prev) => (isSameLobbyRooms(prev, newRooms) ? prev : newRooms));
            setIsRefreshingLobby(false);
          }
        })
        .catch(() => {});
    };

    fetchRooms(); // Instant fetch on mount

    const interval = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('GET_LOBBY_ROOMS');
      } else {
        fetchRooms();
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [room]);

  const myPlayerIndex = useMemo(
    () => (room && user ? room.players.findIndex((player) => player.userId === user.id) : -1),
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

  const handleCreateRoom = () => {
    socketRef.current?.emit('CREATE_ROOM');
  };

  const handleStartAiMatch = (difficulty: AiDifficulty) => {
    socketRef.current?.emit('CREATE_AI_ROOM', { difficulty });
  };

  const handleJoinRoom = (roomId: string) => {
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
    if (socketRef.current) {
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
      setTimeout(() => setIsRefreshingLobby(false), 500);
    }
  };

  const handleSetSecret = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!room) return;
    if (!isUniqueFourDigitCode(secretInput)) {
      setErrorMsg(t('invalidCode'));
      return;
    }
    localStorage.setItem(`secret:${room.roomId}`, secretInput);
    socketRef.current?.emit('SET_SECRET', { roomId: room.roomId, secret: secretInput });
  };

  const handleRpsChoice = (choice: RpsChoice) => {
    if (!room || !user) return;
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

  const handleSendGuess = () => {
    if (!room) return;
    if (!isUniqueFourDigitCode(guessInput)) {
      setErrorMsg(t('invalidGuess'));
      return;
    }
    socketRef.current?.emit('SUBMIT_GUESS', {
      roomId: room.roomId,
      guess: guessInput,
    });
  };

  const handlePlayAgain = () => {
    if (!room) return;
    socketRef.current?.emit('PLAY_AGAIN', room.roomId);
  };

  const handleLeaveRoom = () => {
    socketRef.current?.emit('LEAVE_ROOM', () => {
      void loadGameProfile();
    });
    setRoom(null);
    setChatMessages([]);
    setMatchStats(null);
    setMatchXpResult(null);
    setShowMatchModal(false);
    setShowGuessHistoryModal(false);
    setOpponentTempDisconnected(null);
  };

  const handleSendChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!room || !chatInput.trim()) return;
    socketRef.current?.emit('SEND_MESSAGE', {
      roomId: room.roomId,
      message: chatInput,
    });
    setChatInput('');
  };

  const copyRoomId = () => {
    if (!room) return;
    void navigator.clipboard.writeText(room.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return {
    mounted,
    locale,
    t,
    toggleLocale,
    user,
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
    opponentSecretSet,
    opponentWantsPlayAgain,
    secretReveal,
    copied,
    matchStats,
    matchXpResult,
    gameProfile,
    isLoadingGameProfile,
    gameProfileError,
    isReconnecting,
    opponentTempDisconnected,
    setOpponentTempDisconnected,
    showMatchModal,
    setShowMatchModal,
    showGuessHistoryModal,
    setShowGuessHistoryModal,
    showStartCountdown,
    countdownVal,
    showNumPad,
    setShowNumPad,
    myPlayerIndex,
    opponentPlayerIndex,
    me,
    opponent,
    handleCreateRoom,
    handleStartAiMatch,
    handleJoinRoom,
    handleRefreshLobby,
    loadGameProfile,
    handleSetSecret,
    handleRpsChoice,
    handleSendGuess,
    handlePlayAgain,
    handleLeaveRoom,
    handleSendChat,
    copyRoomId,
  };
}

export type GameController = ReturnType<typeof useGameController>;
