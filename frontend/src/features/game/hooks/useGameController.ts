'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

import { createTranslator, translateBackendError } from '../i18n';
import type {
  AiDifficulty,
  ChatMessage,
  LobbyRoom,
  MatchStats,
  Player,
  Room,
  RpsChoice,
} from '../types';
import { getSocketUrl, isUniqueFourDigitCode, normalizeRoomId } from '../utils';
import { useAuthProfile } from './useAuthProfile';
import { useGameLocale } from './useGameLocale';

export function useGameController() {
  const { locale, mounted, t, toggleLocale } = useGameLocale();
  const { user, loadingUser, authError, setAuthError } = useAuthProfile();

  const [lobbyRooms, setLobbyRooms] = useState<LobbyRoom[]>([]);
  const [isRefreshingLobby, setIsRefreshingLobby] = useState(false);
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
  const [matchResultSent, setMatchResultSent] = useState(false);
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

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

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

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const socket = io(getSocketUrl(), {
      auth: {
        token,
        username: user.name,
        avatar: user.avatar,
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

    socket.on('connect', () => {
      console.log('Connected to socket server');
      setErrorMsg(null);
      setIsReconnecting(false);
      socket.emit('GET_LOBBY_ROOMS');
    });

    socket.on('connect_error', (error) => {
      console.warn('Socket connection error:', error.message);
      if (error.message?.includes('AUTH_ERROR')) {
        setAuthError('INVALID_TOKEN');
        setErrorMsg(translate()('authRequired'));
      } else {
        setIsReconnecting(true);
      }
    });

    socket.io.on('reconnect_failed', () => {
      console.error('Socket reconnection failed permanently');
      setErrorMsg(translate()('cannotConnect'));
      setIsReconnecting(false);
    });

    socket.on('LOBBY_ROOMS', (roomsList: LobbyRoom[]) => {
      setLobbyRooms(roomsList);
    });

    socket.on('ROOM_CREATED', (createdRoom: Room) => {
      setRoom(createdRoom);
      setChatMessages([]);
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
      setMatchResultSent(false);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setOpponentTempDisconnected(null);
    });

    socket.on('SECRET_ACCEPTED', () => {
      setErrorMsg(null);
      setRoom((previousRoom) => {
        if (!previousRoom) return null;
        const players = [...previousRoom.players];
        const playerIndex = players.findIndex((player) => player.userId === user.id);
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
        setMatchStats(data.matchStats);
        setShowMatchModal(true);
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
      setOpponentWantsPlayAgain(false);
      setOpponentTempDisconnected(null);
      setShowMatchModal(false);
      setShowGuessHistoryModal(false);
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on(
      'PLAYER_TEMPORARILY_DISCONNECTED',
      (data: { username: string; roomState: Room }) => {
        setRoom(data.roomState);
        setOpponentTempDisconnected(data.username);
      },
    );

    socket.on('OPPONENT_RECONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setOpponentTempDisconnected(null);
      setErrorMsg(translate()('opponentReconnected').replace('{username}', data.username));
      setTimeout(() => setErrorMsg(null), 3000);
    });

    socket.on('RECONNECTED_TO_ROOM', (roomState: Room) => {
      setRoom(roomState);
      setIsReconnecting(false);
      setErrorMsg(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
        setIsReconnecting(true);
      }
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

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [setAuthError, user]);

  useEffect(() => {
    if (room?.state === 'FINISHED' && showMatchModal && !matchResultSent && socketRef.current) {
      socketRef.current.emit('MATCH_RESULT_VIEWED', room.roomId);
      setMatchResultSent(true);
      console.log('[Game] MATCH_RESULT_VIEWED emitted for room', room.roomId);
    }
  }, [matchResultSent, room?.roomId, room?.state, showMatchModal]);

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
          : 'Invalid Room ID format (e.g. G-123456).',
      );
      return;
    }
    socketRef.current?.emit('JOIN_ROOM', normalizedRoomId);
  };

  const handleRefreshLobby = () => {
    if (!socketRef.current || isRefreshingLobby) return;
    setIsRefreshingLobby(true);
    socketRef.current.emit('GET_LOBBY_ROOMS');
    setTimeout(() => setIsRefreshingLobby(false), 750);
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
    socketRef.current?.emit('LEAVE_ROOM');
    setRoom(null);
    setChatMessages([]);
    setMatchStats(null);
    setMatchResultSent(false);
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
