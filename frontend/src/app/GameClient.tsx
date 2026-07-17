'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, Users, Send, KeyRound, Dices, RefreshCw, LogOut, Copy, Check, MessageSquare, ArrowLeft, ChevronDown, ChevronUp, Search,
  Trophy, Clock, Target, Swords, Wifi, WifiOff, X
} from 'lucide-react';

interface Player {
  userId: string;
  username: string;
  avatar: string;
  socketId: string;
  secretNumber: string | null;
  rpsChoice: string | null;
  ready: boolean;
  disconnectedAt?: number | null;
}

interface Guess {
  playerIndex: number;
  guess: string;
  correctNumbers: number;
  correctPosition: number;
  timestamp: string;
}

interface MatchStats {
  duration: number;
  totalGuesses: number;
  winnerGuessCount: number;
  loserGuessCount: number;
  rpsWinnerIndex: number;
  winnerSecret: string;
  loserSecret: string;
  startedAt: string;
  finishedAt: string;
}

interface Room {
  roomId: string;
  players: Player[];
  state: 'WAITING_FOR_PLAYERS' | 'SETTING_SECRET' | 'RPS_DECISION' | 'PLAYING' | 'FINISHED';
  guesses: Guess[];
  rpsWinnerIndex: number;
  activeTurnIndex: number;
  winnerIndex: number;
}

interface LobbyRoom {
  roomId: string;
  hostName: string;
  playerCount: number;
}

const translations = {
  en: {
    title: "REALTIME GUESSING ARENA",
    subtitle: "4-Digit Numbers Duel",
    loadingProfile: "Loading user profile...",
    authRequired: "Authentication Required",
    authDesc: "Please log in on the movie stream website first to play the guessing game.",
    goToLogin: "Go to Login",
    chooseMode: "Choose Your Mode",
    chooseModeDesc: "Create a private arena or join a lobby room.",
    createRoom: "Create Private Room",
    orJoin: "Or Join Room ID",
    enterRoomId: "e.g. G-123456",
    join: "Join",
    lobbyRooms: "Lobby Rooms",
    noRooms: "No rooms currently waiting.",
    joinArena: "Join Arena",
    roomArena: "Room Arena",
    you: "You",
    enemy: "Enemy",
    waitingOpponent: "Waiting for Opponent",
    waitingOpponentDesc: "Share your Room ID {roomId} with a friend to start the match!",
    copyRoomId: "Copy Room ID",
    copied: "Copied Room ID",
    setupSecret: "Setup Secret Code",
    setupSecretDesc: "Choose 4 unique digits (e.g. 1984). Opponents must guess these in exact positions.",
    secretPlaceholder: "e.g. 1234",
    lockSecret: "Lock Secret",
    secretLocked: "Your secret is locked in!",
    waitingOpponentSubmitSecret: "Waiting for opponent to submit...",
    bothReadyTransitioning: "Both ready! Transitioning...",
    rpsInitiative: "RPS Initiative Duel",
    rpsDesc: "Choose Rock, Paper, or Scissors. Winner guesses first in the match!",
    submittedChoice: "Submitted: {choice}",
    resolvingClash: "Resolving clash...",
    waitingOpponentRps: "Waiting for opponent to choose...",
    drawChooseAgain: "Draw! Choose again.",
    yourOffense: "Your Offense (Guesses at Enemy)",
    guessesCount: "{count} Guesses",
    correctDigits: "{count} Correct",
    correctPosition: "{count} Position",
    noGuessesYet: "No guesses made yet.",
    opponentOffense: "{username}'s Offense (Guesses at You)",
    enemyNotGuessedYet: "Enemy hasn't guessed yet.",
    yourTurn: "🔥 YOUR TURN - GUESS OPPONENT'S CODE",
    enter4digits: "Enter 4 unique digits",
    fireGuess: "Fire Guess",
    waitingOpponentGuess: "Waiting for {username} to submit their guess...",
    victory: "VICTORY",
    defeat: "DEFEAT",
    victoryDesc: "You deciphered the code first!",
    defeatDesc: "{username} guessed your code first.",
    enemySecret: "Enemy's Secret",
    opponentGuesses: "Opponent Guesses",
    turnsCount: "{count} Turns",
    playAgain: "Play Again",
    backToLobby: "Back to Lobby",
    rematchRequest: "💡 {username} wants a rematch! Click Play Again to start.",
    roomChat: "Room Chat",
    sayHi: "Say hi to your opponent!",
    chatPlaceholder: "Send message...",
    invalidCode: "Code must be exactly 4 unique digits.",
    invalidGuess: "Guess must be exactly 4 unique digits.",
    cannotConnect: "Cannot connect to game server. Please ensure the backend is running.",
    opponentLeft: "Opponent {username} left. Resetting game room to lobby.",
    activeTabGame: "Arena",
    activeTabChat: "Chat Room",
    rock: "Rock",
    paper: "Paper",
    scissors: "Scissors",
    matchSummary: "Match Summary",
    matchDuration: "Duration",
    yourGuesses: "Your Guesses",
    opponentGuessesCount: "Opponent's Guesses",
    firstMove: "First Move",
    yourSecret: "Your Secret",
    matchSaved: "Match result saved!",
    reconnecting: "Reconnecting...",
    opponentReconnecting: "{username} lost connection. Waiting 60s...",
    opponentReconnected: "{username} reconnected!",
    playerLeft: "{username} left the room."
  },
  vi: {
    title: "ĐẤU TRƯỜNG ĐOÁN SỐ",
    subtitle: "Trực chiến đoán 4 chữ số",
    loadingProfile: "Đang tải thông tin cá nhân...",
    authRequired: "Yêu cầu đăng nhập",
    authDesc: "Vui lòng đăng nhập trên trang web xem phim trước khi vào chơi game.",
    goToLogin: "Đăng nhập ngay",
    chooseMode: "Chọn chế độ chơi",
    chooseModeDesc: "Tạo phòng đấu riêng hoặc tham gia phòng có sẵn.",
    createRoom: "Tạo phòng riêng",
    orJoin: "Hoặc nhập ID phòng",
    enterRoomId: "Ví dụ: G-123456",
    join: "Vào phòng",
    lobbyRooms: "Phòng đang chờ",
    noRooms: "Hiện tại không có phòng nào đang chờ.",
    joinArena: "Vào đấu trường",
    roomArena: "Phòng thi đấu",
    you: "Bạn",
    enemy: "Đối thủ",
    waitingOpponent: "Đang chờ đối thủ",
    waitingOpponentDesc: "Chia sẻ ID phòng {roomId} để bạn bè cùng tham gia!",
    copyRoomId: "Sao chép ID phòng",
    copied: "Đã sao chép ID",
    setupSecret: "Thiết lập mật mã",
    setupSecretDesc: "Chọn 4 chữ số khác nhau (ví dụ: 1984). Đối thủ phải đoán đúng các chữ số ở đúng vị trí.",
    secretPlaceholder: "Ví dụ: 1234",
    lockSecret: "Khóa mật mã",
    secretLocked: "Mật mã của bạn đã được khóa!",
    waitingOpponentSubmitSecret: "Đang chờ đối thủ thiết lập mật mã...",
    bothReadyTransitioning: "Cả hai đã sẵn sàng! Đang chuyển tiếp...",
    rpsInitiative: "Oẳn tù tì giành quyền đi trước",
    rpsDesc: "Chọn Kéo, Búa, hoặc Bao. Người thắng sẽ được đoán trước!",
    submittedChoice: "Đã chọn: {choice}",
    resolvingClash: "Đang phân định thắng thua...",
    waitingOpponentRps: "Đang chờ đối thủ ra chiêu...",
    drawChooseAgain: "Hòa rồi! Hãy chọn lại.",
    yourOffense: "Lượt bạn đoán (Tìm mật mã đối thủ)",
    guessesCount: "{count} lượt đoán",
    correctDigits: "{count} số đúng",
    correctPosition: "{count} vị trí đúng",
    noGuessesYet: "Chưa có lượt đoán nào.",
    opponentOffense: "Lượt đối thủ đoán (Tìm mật mã của bạn)",
    enemyNotGuessedYet: "Đối thủ chưa thực hiện lượt đoán nào.",
    yourTurn: "🔥 LƯỢT CỦA BẠN - ĐOÁN MẬT MÃ ĐỐI THỦ",
    enter4digits: "Nhập 4 chữ số khác nhau",
    fireGuess: "Đoán",
    waitingOpponentGuess: "Đang chờ đối thủ {username} thực hiện lượt đoán...",
    victory: "CHIẾN THẮNG",
    defeat: "THẤT BẠI",
    victoryDesc: "Bạn đã giải mã thành công trước!",
    defeatDesc: "{username} đã giải mã thành công mật mã của bạn trước.",
    enemySecret: "Mật mã của đối thủ",
    opponentGuesses: "Số lượt đoán của đối thủ",
    turnsCount: "{count} lượt",
    playAgain: "Đấu lại",
    backToLobby: "Rời phòng chờ",
    rematchRequest: "💡 {username} muốn đấu lại! Hãy nhấn Đấu lại để bắt đầu.",
    roomChat: "Trò chuyện",
    sayHi: "Gửi lời chào tới đối thủ nào!",
    chatPlaceholder: "Nhập tin nhắn...",
    invalidCode: "Mật mã phải gồm đúng 4 chữ số khác nhau.",
    invalidGuess: "Số đoán phải gồm đúng 4 chữ số khác nhau.",
    cannotConnect: "Không thể kết nối đến máy chủ game. Vui lòng kiểm tra lại backend.",
    opponentLeft: "Đối thủ {username} đã rời phòng. Đang quay lại phòng chờ.",
    activeTabGame: "Trận đấu",
    activeTabChat: "Trò chuyện",
    rock: "Búa",
    paper: "Bao",
    scissors: "Kéo",
    matchSummary: "Kết quả trận đấu",
    matchDuration: "Thời gian",
    yourGuesses: "Số lượt đoán của bạn",
    opponentGuessesCount: "Số lượt đoán của đối thủ",
    firstMove: "Đi trước",
    yourSecret: "Mật mã của bạn",
    matchSaved: "Đã lưu kết quả trận đấu!",
    reconnecting: "Đang kết nối lại...",
    opponentReconnecting: "{username} mất kết nối. Chờ 60 giây...",
    opponentReconnected: "{username} đã kết nối lại!",
    playerLeft: "{username} đã rời khỏi phòng."
  }
};

const translateBackendError = (msg: string, locale: 'en' | 'vi') => {
  if (locale !== 'vi') return msg;
  const errors: Record<string, string> = {
    'Room not found.': 'Không tìm thấy phòng.',
    'Room is already full or in play.': 'Phòng đã đầy hoặc trận đấu đang diễn ra.',
    'You have already joined this room.': 'Bạn đã tham gia phòng này rồi.',
    'Invalid action or room state.': 'Thao tác hoặc trạng thái phòng không hợp lệ.',
    'Secret must be 4 unique digits.': 'Mật mã phải gồm đúng 4 chữ số khác nhau.',
    'Invalid Rock-Paper-Scissors choice.': 'Lựa chọn Oẳn tù tì không hợp lệ.',
    'It is not your turn.': 'Chưa tới lượt đoán của bạn.',
    'Guess must be 4 unique digits.': 'Số đoán phải gồm đúng 4 chữ số khác nhau.',
    'Security validation error. Failed to retrieve code.': 'Lỗi bảo mật xác thực. Không thể truy xuất mã.',
    'Invalid action.': 'Thao tác không hợp lệ.'
  };
  return errors[msg] || msg;
};

export default function GameClient() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  const [locale, setLocale] = useState<'en' | 'vi'>('en');
  const [activeMobileTab, setActiveMobileTab] = useState<'arena' | 'chat'>('arena');

  // Detect locale on mount and mark client as mounted
  useEffect(() => {
    const queryLocale = searchParams.get('locale');
    if (queryLocale === 'vi' || queryLocale === 'en') {
      setLocale(queryLocale);
      localStorage.setItem('game_locale', queryLocale);
    } else {
      const storedLocale = localStorage.getItem('game_locale');
      if (storedLocale === 'vi' || storedLocale === 'en') {
        setLocale(storedLocale);
      } else if (navigator.language.toLowerCase().includes('vi')) {
        setLocale('vi');
      }
    }
    setMounted(true);
  }, [searchParams]);

  const toggleLocale = (selectedLocale: 'en' | 'vi') => {
    setLocale(selectedLocale);
    localStorage.setItem('game_locale', selectedLocale);
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[locale][key] || translations['en'][key] || key;
  };
  
  const [lobbyRooms, setLobbyRooms] = useState<LobbyRoom[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [joinedRoomId, setJoinedRoomId] = useState('');
  
  const [secretInput, setSecretInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ username: string; content: string; timestamp: string }>>([]);
  const [opponentRpsSubmitted, setOpponentRpsSubmitted] = useState(false);
  const [opponentSecretSet, setOpponentSecretSet] = useState(false);
  const [opponentWantsPlayAgain, setOpponentWantsPlayAgain] = useState(false);
  const [secretReveal, setSecretReveal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [matchResultSent, setMatchResultSent] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [opponentTempDisconnected, setOpponentTempDisconnected] = useState<string | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showMobileInstructions, setShowMobileInstructions] = useState(false);
  const [showStartCountdown, setShowStartCountdown] = useState(false);
  const [countdownVal, setCountdownVal] = useState(3);
  const [showNumPad, setShowNumPad] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'mine' | 'opponent'>('mine');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const myGuessesScrollRef = useRef<HTMLDivElement | null>(null);
  const opponentGuessesScrollRef = useRef<HTMLDivElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Click outside to close user dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- Countdown Transition effect ---
  const prevRoomStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (room) {
      if (room.state === 'PLAYING' && prevRoomStateRef.current === 'RPS_DECISION') {
        setShowStartCountdown(true);
        setCountdownVal(3);
        const interval = setInterval(() => {
          setCountdownVal(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setShowStartCountdown(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
      prevRoomStateRef.current = room.state;
    } else {
      prevRoomStateRef.current = null;
    }
  }, [room?.state]);

  // --- Auto-scroll guesses to bottom ---
  useEffect(() => {
    if (myGuessesScrollRef.current) {
      myGuessesScrollRef.current.scrollTop = myGuessesScrollRef.current.scrollHeight;
    }
    if (opponentGuessesScrollRef.current) {
      opponentGuessesScrollRef.current.scrollTop = opponentGuessesScrollRef.current.scrollHeight;
    }
  }, [room?.guesses?.length]);

  // --- Auto-open Number Pad on Turn ---
  useEffect(() => {
    if (room && room.state === 'PLAYING' && user) {
      const pIdx = room.players.findIndex(p => p.userId === user.id);
      if (pIdx !== -1 && room.activeTurnIndex === pIdx) {
        setShowNumPad(true);
      } else {
        setShowNumPad(false);
      }
    } else {
      setShowNumPad(false);
    }
  }, [room?.activeTurnIndex, room?.state, room?.players, user?.id]);

  // --- Step 1: SSO Token Authentication ---
  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get('token') || localStorage.getItem('token');
      if (!token) {
        setAuthError('NO_TOKEN');
        setLoadingUser(false);
        return;
      }
      try {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1');
        const apiBase = process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3001/api' : 'https://server-nextjs-firm.onrender.com/api');
        const response = await fetch(`${apiBase}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Invalid token');
        }
        const data = await response.json();
        setUser({
          id: data.user.id || data.user._id,
          name: data.user.name,
          avatar: data.user.avatar || ''
        });
        localStorage.setItem('token', token);
      } catch (err) {
        console.error('Token validation failed:', err);
        setAuthError('INVALID_TOKEN');
      } finally {
        setLoadingUser(false);
      }
    };
    validateToken();
  }, [searchParams]);

  // --- Step 2: Initialize WebSockets ---
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (typeof window !== 'undefined' 
        ? (window.location.port === '3002' ? 'http://localhost:8080' : window.location.origin) 
        : 'http://localhost:8080');
        
    const socket = io(socketUrl, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket server');
      setErrorMsg(null);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setErrorMsg(t('cannotConnect'));
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
      setOpponentTempDisconnected(null);
    });

    socket.on('SECRET_ACCEPTED', () => {
      setErrorMsg(null);
      setRoom(prev => {
        if (!prev) return null;
        const nextPlayers = [...prev.players];
        const idx = nextPlayers.findIndex(p => p.userId === user?.id);
        if (idx !== -1 && nextPlayers[idx]) {
          nextPlayers[idx] = { ...nextPlayers[idx], ready: true };
        }
        return { ...prev, players: nextPlayers };
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
      setRoom(prev => prev ? { ...prev, players: data.players } : null);
      setErrorMsg(t('drawChooseAgain'));
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

    socket.on('GAME_OVER', (data: { roomState: Room; opponentSecret: string; matchStats: MatchStats }) => {
      setRoom(data.roomState);
      setSecretReveal(data.opponentSecret);
      setMatchStats(data.matchStats);
      setShowMatchModal(true);
      setErrorMsg(null);
    });

    socket.on('OPPONENT_WANTS_PLAY_AGAIN', () => {
      setOpponentWantsPlayAgain(true);
    });

    socket.on('PLAYER_DISCONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setErrorMsg(t('opponentLeft').replace('{username}', data.username));
      setSecretReveal(null);
      setOpponentWantsPlayAgain(false);
      setOpponentTempDisconnected(null);
      setShowMatchModal(false);
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on('PLAYER_LEFT', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setErrorMsg(t('playerLeft').replace('{username}', data.username));
      setSecretReveal(null);
      setOpponentWantsPlayAgain(false);
      setOpponentTempDisconnected(null);
      setShowMatchModal(false);
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on('PLAYER_TEMPORARILY_DISCONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setOpponentTempDisconnected(data.username);
    });

    socket.on('OPPONENT_RECONNECTED', (data: { username: string; roomState: Room }) => {
      setRoom(data.roomState);
      setOpponentTempDisconnected(null);
      setErrorMsg(t('opponentReconnected').replace('{username}', data.username));
      setTimeout(() => setErrorMsg(null), 3000);
    });

    socket.on('RECONNECTED_TO_ROOM', (roomState: Room) => {
      setRoom(roomState);
      setIsReconnecting(false);
      setErrorMsg(null);
    });

    // Socket.IO built-in reconnection events
    socket.on('disconnect', () => {
      setIsReconnecting(true);
    });

    socket.on('connect', () => {
      setIsReconnecting(false);
    });

    socket.on('CHAT_MESSAGE', (msg: { username: string; content: string; timestamp: string }) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('GAME_ERROR', (msg: string) => {
      const translatedMsg = translateBackendError(msg, locale);
      setErrorMsg(translatedMsg);
      setTimeout(() => setErrorMsg(null), 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, room, activeMobileTab]);

  // --- Auto-emit MATCH_RESULT_VIEWED when game finishes ---
  useEffect(() => {
    if (room?.state === 'FINISHED' && showMatchModal && !matchResultSent && socketRef.current) {
      socketRef.current.emit('MATCH_RESULT_VIEWED', room.roomId);
      setMatchResultSent(true);
      console.log('[Game] MATCH_RESULT_VIEWED emitted for room', room.roomId);
    }
  }, [room?.state, showMatchModal, matchResultSent]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-4"
        />
        <p className="text-slate-400 font-medium">{t('loadingProfile')}</p>
      </div>
    );
  }

  if (authError || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-2xl shadow-2xl text-center"
        >
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogOut size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-3">{t('authRequired')}</h2>
          <p className="text-slate-400 mb-6">
            {t('authDesc')}
          </p>
          <button
            onClick={() => {
              const isLocal = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1');
              const targetUrl = isLocal ? 'http://localhost:3000/login' : 'https://moviesaw.vercel.app/login';
              if (typeof window !== 'undefined' && window.top) {
                window.top.location.href = targetUrl;
              } else {
                window.location.href = targetUrl;
              }
            }}
            className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg transition duration-200 cursor-pointer"
          >
            {t('goToLogin')}
          </button>
        </motion.div>
      </div>
    );
  }

  // --- Handlers ---
  const handleCreateRoom = () => {
    socketRef.current?.emit('CREATE_ROOM');
  };

  const handleJoinRoom = (rid: string) => {
    const formatted = rid.trim().toUpperCase();
    if (!formatted) return;
    socketRef.current?.emit('JOIN_ROOM', formatted);
  };

  const handleSetSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    if (secretInput.length !== 4 || new Set(secretInput).size !== 4) {
      setErrorMsg(t('invalidCode'));
      return;
    }
    localStorage.setItem(`secret:${room.roomId}`, secretInput);
    socketRef.current?.emit('SET_SECRET', { roomId: room.roomId, secret: secretInput });
  };

  const handleRpsChoice = (choice: 'rock' | 'paper' | 'scissors') => {
    if (!room) return;
    socketRef.current?.emit('SUBMIT_RPS', { roomId: room.roomId, choice });
    setRoom(prev => {
      if (!prev) return null;
      const nextPlayers = [...prev.players];
      const idx = nextPlayers.findIndex(p => p.userId === user?.id);
      if (idx !== -1 && nextPlayers[idx]) {
        nextPlayers[idx] = { ...nextPlayers[idx], rpsChoice: choice, ready: true };
      }
      return { ...prev, players: nextPlayers };
    });
  };

  const handleSendGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    if (guessInput.length !== 4 || new Set(guessInput).size !== 4) {
      setErrorMsg(t('invalidGuess'));
      return;
    }
    socketRef.current?.emit('SUBMIT_GUESS', { roomId: room.roomId, guess: guessInput });
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
    setOpponentTempDisconnected(null);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !chatInput.trim()) return;
    socketRef.current?.emit('SEND_MESSAGE', { roomId: room.roomId, message: chatInput });
    setChatInput('');
  };

  const copyRoomId = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- Game Helper Metrics ---
  const myPlayerIndex = room ? room.players.findIndex(p => p.userId === user.id) : -1;
  const opponentPlayerIndex = myPlayerIndex !== -1 ? (myPlayerIndex === 0 ? 1 : 0) : -1;
  const me = room && myPlayerIndex !== -1 ? room.players[myPlayerIndex] : null;
  const opponent = room && opponentPlayerIndex !== -1 && room.players[opponentPlayerIndex] ? room.players[opponentPlayerIndex] : null;

  // --- Fetch match history from backend ---
  const fetchGameHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const token = localStorage.getItem('token');
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
        (typeof window !== 'undefined' 
          ? (window.location.port === '3002' ? 'http://localhost:8080' : window.location.origin) 
          : 'http://localhost:8080');
          
      const response = await fetch(`${socketUrl}/api/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      setGameHistory(data.history || []);
    } catch (err: any) {
      console.error('Failed to load match history:', err.message);
      setHistoryError(locale === 'vi' ? 'Không thể tải lịch sử đấu.' : 'Failed to load match history.');
    } finally {
      setLoadingHistory(false);
    }
  };



  // --- Helper: format duration ---
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Custom Confetti Particle Canvas ---
  const ConfettiCanvas = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animationFrameId: number;
      let width = (canvas.width = window.innerWidth);
      let height = (canvas.height = window.innerHeight);

      const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];
      const particles = Array.from({ length: 150 }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height - height,
        r: Math.random() * 6 + 4,
        d: Math.random() * height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
      }));

      const draw = () => {
        ctx.clearRect(0, 0, width, height);
        particles.forEach((p, idx) => {
          p.tiltAngle += p.tiltAngleIncremental;
          p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
          p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

          ctx.beginPath();
          ctx.lineWidth = p.r;
          ctx.strokeStyle = p.color;
          ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
          ctx.stroke();

          if (p.y > height) {
            particles[idx] = {
              x: Math.random() * width,
              y: -20,
              r: p.r,
              d: p.d,
              color: p.color,
              tilt: Math.random() * 10 - 5,
              tiltAngleIncremental: p.tiltAngleIncremental,
              tiltAngle: 0,
            };
          }
        });

        animationFrameId = requestAnimationFrame(draw);
      };

      draw();

      const handleResize = () => {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
      };
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50 w-full h-full" />;
  };

  return (
    <div className="h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white font-sans flex flex-col p-3 sm:p-4 overflow-hidden max-w-full">
      {/* Header Info */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between py-3 sm:py-4 border-b border-slate-800 mb-3 sm:mb-6 shrink-0 gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <button
            onClick={() => {
              const isLocal = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1');
              const targetUrl = isLocal ? 'http://localhost:3000' : 'https://moviesaw.vercel.app';
              if (typeof window !== 'undefined' && window.top) {
                window.top.location.href = targetUrl;
              } else {
                window.location.href = targetUrl;
              }
            }}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center shrink-0"
            title={locale === 'vi' ? "Quay lại trang chủ" : "Back to main site"}
          >
            <ArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
          <div className="hidden xs:block p-2 sm:p-2.5 bg-purple-500/10 text-purple-400 rounded-xl shrink-0">
            <Gamepad2 size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-xl tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text flex items-center">
              <span>
                {locale === 'vi' ? 'Đoán Số' : 'Guess Number'}
              </span>
            </h1>
            <p className="hidden sm:block text-xs text-slate-400">{t('subtitle')}</p>
          </div>
        </div>

        {/* User Card & Language Selector */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Language Toggle */}
          <div className="flex items-center bg-slate-900/60 border border-slate-800/80 p-0.5 rounded-xl text-[10px] font-bold">
            <button
              onClick={() => toggleLocale('en')}
              className={`px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                locale === 'en'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => toggleLocale('vi')}
              className={`px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg transition-all cursor-pointer ${
                locale === 'vi'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              VI
            </button>
          </div>

          {/* User Display Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-1.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 p-1 rounded-full sm:px-3 sm:py-1.5 sm:rounded-xl transition duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-slate-700 shrink-0" />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs uppercase text-white shrink-0">
                  {user.name.slice(0, 2)}
                </div>
              )}
              <span className="hidden sm:inline font-medium text-sm text-slate-200">{user.name}</span>
              <ChevronDown size={14} className="hidden sm:inline text-slate-500" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900/95 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    const isLocal = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1');
                    const targetUrl = isLocal ? 'http://localhost:3000/profile' : 'https://moviesaw.vercel.app/profile';
                    if (typeof window !== 'undefined' && window.top) {
                      window.top.location.href = targetUrl;
                    } else {
                      window.location.href = targetUrl;
                    }
                  }}
                  className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-sm font-semibold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                >
                  <Users size={16} className="text-purple-400" />
                  <span>{locale === 'vi' ? 'Hồ sơ cá nhân' : 'User Profile'}</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    window.location.href = `/history?locale=${locale}`;
                  }}
                  className="w-full text-left py-2.5 px-4 hover:bg-slate-800/60 text-slate-200 hover:text-white text-sm font-semibold flex items-center space-x-2.5 transition duration-150 cursor-pointer"
                >
                  <Clock size={16} className="text-purple-400" />
                  <span>{locale === 'vi' ? 'Lịch sử đấu' : 'Match History'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* FLOATING TOAST NOTIFICATIONS - Top Right */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[200] flex flex-col gap-2.5 max-w-xs sm:max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-red-950/90 backdrop-blur-md border border-red-500/50 p-3 rounded-xl text-xs sm:text-sm font-semibold text-red-200 shadow-2xl flex items-center gap-3 pointer-events-auto"
            >
              <span className="shrink-0">⚠️</span>
              <span className="flex-1 leading-snug">{errorMsg}</span>
              <button 
                onClick={() => setErrorMsg(null)}
                className="p-1 text-white bg-slate-950/25 hover:bg-white hover:text-slate-950 border border-white/70 rounded-full transition duration-200 cursor-pointer shrink-0 flex items-center justify-center"
                title={locale === 'vi' ? 'Đóng' : 'Close'}
              >
                <X size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isReconnecting && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-yellow-950/90 backdrop-blur-md border border-yellow-500/50 p-3 rounded-xl text-xs sm:text-sm font-semibold text-yellow-200 shadow-2xl flex items-center gap-2.5 pointer-events-auto"
            >
              <WifiOff size={15} className="animate-pulse shrink-0" />
              <span className="flex-1 leading-snug">{t('reconnecting')}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {opponentTempDisconnected && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="bg-orange-950/90 backdrop-blur-md border border-orange-500/50 p-3 rounded-xl text-xs sm:text-sm font-semibold text-orange-200 shadow-2xl flex items-center gap-3 pointer-events-auto"
            >
              <WifiOff size={15} className="animate-pulse shrink-0" />
              <span className="flex-1 leading-snug">{t('opponentReconnecting').replace('{username}', opponentTempDisconnected)}</span>
              <button 
                onClick={() => setOpponentTempDisconnected(null)}
                className="p-1 text-white bg-slate-950/25 hover:bg-white hover:text-slate-950 border border-white/70 rounded-full transition duration-200 cursor-pointer shrink-0 flex items-center justify-center"
                title={locale === 'vi' ? 'Đóng' : 'Close'}
              >
                <X size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Tab Selector - visible only on lg:hidden when inside a room */}
      {room && (
        <div className="max-w-7xl w-full mx-auto lg:hidden flex border border-slate-800 bg-slate-900/60 backdrop-blur-md rounded-xl p-1 mb-4 shrink-0">
          <button
            onClick={() => setActiveMobileTab('arena')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
              activeMobileTab === 'arena'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('activeTabGame')}
          </button>
          <button
            onClick={() => setActiveMobileTab('chat')}
            className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
              activeMobileTab === 'chat'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('activeTabChat')}
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-6 mb-4 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: MAIN GAME BOARD */}
        <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${room && activeMobileTab !== 'arena' ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* LOBBY STATE */}
          {!room && (
            <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 py-6 sm:py-12 max-w-6xl mx-auto w-full">
              
              {/* DESKTOP LEFT SIDEBAR: GUIDE PART 1 */}
              <div className="hidden lg:flex flex-col flex-1 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl shadow-xl justify-between">
                <div className="space-y-5">
                  <h3 className="text-sm font-black uppercase tracking-wider bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text pb-2 border-b border-slate-850">
                    {locale === 'vi' ? '📖 Hướng Dẫn: Khởi Động' : '📖 Guide: Setup'}
                  </h3>
                  
                  {/* Step 1 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs text-white">1</div>
                      <h4 className="font-bold text-sm text-slate-200">
                        {locale === 'vi' ? 'Tạo hoặc Vào phòng' : 'Create or Join Room'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pl-8">
                      {locale === 'vi' 
                        ? 'Nhấp "Tạo phòng riêng" để nhận mã phòng và mời bạn bè, hoặc chọn phòng đang chờ ở danh sách "Lobby Rooms" bên dưới.'
                        : 'Click "Create Private Room" to get a Room ID and invite friends, or select a waiting room in the "Lobby Rooms" list below.'}
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs text-white">2</div>
                      <h4 className="font-bold text-sm text-slate-200">
                        {locale === 'vi' ? 'Thiết lập mật mã' : 'Lock Secret Code'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pl-8">
                      {locale === 'vi' 
                        ? 'Mỗi người chọn mật mã 4 số khác nhau (ví dụ: 1357). Hệ thống mã hoá AES-256 đầu cuối để bảo vệ mật mã của bạn khỏi đối thủ.'
                        : 'Choose a unique 4-digit secret code (e.g. 1357). The server uses AES-256 E2E encryption to protect your code.'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-805 pt-4 mt-6 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  {locale === 'vi' ? 'Đấu trường đoán số 4 chữ số' : '4-Digit Numbers Duel'}
                </div>
              </div>

              {/* MAIN CHOOSE MODE CARD */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full flex flex-col justify-center"
              >
                
                {/* MOBILE/TABLET HIGHLIGHTED INSTRUCTIONS BANNER */}
                <div className="lg:hidden bg-slate-900/50 border border-purple-500/30 p-4 rounded-xl shadow-lg mb-4">
                  <button 
                    onClick={() => setShowMobileInstructions(!showMobileInstructions)}
                    className="w-full flex items-center justify-between font-bold text-xs sm:text-sm text-purple-400 focus:outline-none"
                  >
                    <span className="flex items-center gap-2">
                      <Gamepad2 size={16} />
                      {locale === 'vi' ? '📖 HƯỚNG DẪN CÁCH CHƠI' : '📖 HOW TO PLAY'}
                    </span>
                    {showMobileInstructions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  <AnimatePresence>
                    {showMobileInstructions && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 space-y-3.5 text-xs text-slate-300 border-t border-slate-850 pt-3 overflow-hidden text-left"
                      >
                        <div>
                          <span className="font-extrabold text-purple-400 block mb-0.5">1. {locale === 'vi' ? 'Tạo/Vào phòng' : 'Create/Join Room'}</span>
                          <span className="text-slate-400 text-[11px] leading-relaxed">{locale === 'vi' ? 'Tạo phòng lấy ID gửi bạn bè hoặc chọn phòng ở mục Lobby Rooms.' : 'Create room, copy ID to share, or join from Lobby Rooms list.'}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-purple-400 block mb-0.5">2. {locale === 'vi' ? 'Cài mật mã' : 'Lock Secret'}</span>
                          <span className="text-slate-400 text-[11px] leading-relaxed">{locale === 'vi' ? 'Chọn 4 chữ số khác nhau làm mật mã của bạn (giữ bí mật!).' : 'Choose 4 unique digits as your secret (keep it hidden!).'}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-purple-400 block mb-0.5">3. {locale === 'vi' ? 'Oẳn tù tì' : 'RPS Duel'}</span>
                          <span className="text-slate-400 text-[11px] leading-relaxed">{locale === 'vi' ? 'Kéo - Búa - Bao để phân định người được quyền đoán trước.' : 'Play Rock-Paper-Scissors to decide who gets first turn.'}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-purple-400 block mb-0.5">4. {locale === 'vi' ? 'Đoán số & gợi ý' : 'Guess & Clues'}</span>
                          <span className="text-slate-400 text-[11px] leading-relaxed">{locale === 'vi' ? 'Lần lượt đoán số. Gợi ý: 🟢 (đúng số) và 🎯 (đúng số và đúng vị trí).' : 'Take turns guessing. Hints: 🟢 (correct digit) and 🎯 (correct digit & spot).'}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-purple-400 block mb-0.5">5. {locale === 'vi' ? 'Kết thúc & Lưu' : 'Finish & Save'}</span>
                          <span className="text-slate-400 text-[11px] leading-relaxed">{locale === 'vi' ? 'Đạt 4 🎯 trước sẽ thắng.' : 'First to 4 🎯 wins.'}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-4 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl space-y-4 sm:space-y-6">
                  <div className="text-center space-y-1 sm:space-y-2">
                    <h2 className="text-xl sm:text-2xl font-black">{t('chooseMode')}</h2>
                    <p className="text-xs sm:text-sm text-slate-400">{t('chooseModeDesc')}</p>
                  </div>

                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold rounded-xl shadow-lg transition duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base cursor-pointer"
                  >
                    <Gamepad2 size={18} className="sm:w-5 sm:h-5" />
                    <span>{t('createRoom')}</span>
                  </button>

                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                    <span className="relative px-3 bg-slate-950 text-slate-500 text-[10px] font-bold uppercase">{t('orJoin')}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder={t('enterRoomId')}
                      value={joinedRoomId}
                      onChange={(e) => setJoinedRoomId(e.target.value)}
                      className="flex-1 w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none px-4 py-2.5 rounded-xl text-center text-base sm:text-lg font-mono font-bold placeholder-slate-700 uppercase min-w-0"
                    />
                    <button
                      onClick={() => handleJoinRoom(joinedRoomId)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition duration-200 cursor-pointer shrink-0"
                    >
                      {t('join')}
                    </button>
                  </div>

                  {/* Available Lobby Rooms */}
                  <div className="space-y-2.5 pt-1 sm:pt-2">
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                      <Users size={12} className="sm:w-3.5 sm:h-3.5" />
                      <span>{t('lobbyRooms')}</span>
                    </h3>
                    
                    {lobbyRooms.length === 0 ? (
                      <div className="text-center py-5 sm:py-6 border border-dashed border-slate-800/60 rounded-xl text-slate-600 text-xs sm:text-sm">
                        {t('noRooms')}
                      </div>
                    ) : (
                      <div className="max-h-40 sm:max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {lobbyRooms.map((r) => (
                          <div 
                            key={r.roomId}
                            className="flex items-center justify-between p-2.5 sm:p-3.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/60 rounded-xl"
                          >
                            <div className="min-w-0">
                              <p className="font-mono text-xs sm:text-sm font-bold text-purple-400">{r.roomId}</p>
                              <p className="text-[10px] sm:text-xs text-slate-400 truncate">Host: {r.hostName}</p>
                            </div>
                            <button
                              onClick={() => handleJoinRoom(r.roomId)}
                              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white text-[10px] sm:text-xs font-bold rounded-lg transition duration-200 cursor-pointer"
                            >
                              {t('joinArena')}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* DESKTOP RIGHT SIDEBAR: GUIDE PART 2 */}
              <div className="hidden lg:flex flex-col flex-1 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-6 rounded-2xl shadow-xl justify-between">
                <div className="space-y-5">
                  <h3 className="text-sm font-black uppercase tracking-wider bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text pb-2 border-b border-slate-850">
                    {locale === 'vi' ? '📖 Hướng Dẫn: Đối Chiến' : '📖 Guide: Battle'}
                  </h3>
                  
                  {/* Step 3 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs text-white">3</div>
                      <h4 className="font-bold text-sm text-slate-200">
                        {locale === 'vi' ? 'Oẳn tù tì giành quyền đi trước' : 'RPS Initiative Duel'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pl-8">
                      {locale === 'vi' 
                        ? 'Oẳn tù tì (Kéo - Búa - Bao) để chọn người đi trước. Người đoán trước có lợi thế đi trước cực kỳ lớn!'
                        : 'Play Rock-Paper-Scissors to decide who goes first. The first turn provides a massive initiative advantage!'}
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs text-white">4</div>
                      <h4 className="font-bold text-sm text-slate-200">
                        {locale === 'vi' ? 'Đoán số & Đọc gợi ý' : 'Guess & Read Hints'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pl-8">
                      {locale === 'vi' 
                        ? 'Đoán 4 chữ số. Nhận manh mối: 🟢 (Chữ số đúng nhưng sai vị trí) và 🎯 (Chữ số đúng và đúng vị trí).'
                        : 'Guess 4 digits. Get hints: 🟢 (Correct digits, wrong spot) and 🎯 (Correct digits in the right spot).'}
                    </p>
                  </div>

                  {/* Step 5 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs text-white">5</div>
                      <h4 className="font-bold text-sm text-slate-200">
                        {locale === 'vi' ? 'Kết thúc & Lưu lịch sử' : 'Finish & Save History'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pl-8">
                      {locale === 'vi' 
                        ? 'Ai đạt 4 🎯 trước sẽ thắng. Bấm "Rời phòng" hoặc offline quá 60s sẽ hủy ván.'
                        : 'First to 4 🎯 wins. Leaving or offline >60s cancels save.'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-805 pt-4 mt-6 text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-right">
                  {locale === 'vi' ? 'Chế độ chơi thời gian thực' : 'Realtime Game Arena'}
                </div>
              </div>

            </div>
          )}

          {/* ROOM ACTIVE STATES */}
          {room && (
            <div className="flex-1 flex flex-col space-y-4 pb-24 sm:pb-0 min-h-0">
              
              {/* Active Room Header bar */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl sm:rounded-2xl shadow-lg shrink-0">
                <div>
                  <span className="hidden xs:block text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('roomArena')}</span>
                  <div className="flex items-center space-x-1.5">
                    <h2 className="font-mono text-base sm:text-lg font-extrabold text-purple-400">{room.roomId}</h2>
                    <button 
                      onClick={copyRoomId}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                      title={t('copyRoomId')}
                    >
                      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                    </button>
                  </div>
                  {/* User's own locked secret code display */}
                  {room.state === 'PLAYING' && (
                    <div className="mt-1 flex items-center space-x-1 text-[10px] sm:text-xs text-slate-400">
                      <KeyRound size={11} className="text-purple-400 shrink-0" />
                      <span>{locale === 'vi' ? 'Mã của bạn:' : 'Your Secret:'}</span>
                      <span className="font-mono font-black text-purple-300 tracking-wider bg-purple-500/10 px-1.5 py-0.5 rounded">
                        {localStorage.getItem(`secret:${room.roomId}`) || secretInput || '----'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2.5 sm:space-x-6">
                  {/* Player Avatars display */}
                  <div className="flex items-center space-x-1.5 sm:space-x-2.5">
                    {/* Me */}
                    <div className="hidden sm:block text-right">
                      <p className="text-xs font-bold max-w-[80px] truncate text-slate-200">{me?.username}</p>
                      <p className="text-[10px] text-purple-400 font-semibold uppercase">{t('you')}</p>
                    </div>
                    {me?.avatar ? (
                      <img src={me.avatar} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-purple-500 shrink-0" />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                        {me?.username.slice(0, 2)}
                      </div>
                    )}

                    <span className="text-slate-700 font-bold text-xs sm:text-sm">VS</span>

                    {/* Opponent */}
                    {opponent ? (
                      <>
                        {opponent.avatar ? (
                          <img src={opponent.avatar} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-pink-500 shrink-0" />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-pink-600 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {opponent.username.slice(0, 2)}
                          </div>
                        )}
                        <div className="hidden sm:block text-left">
                          <p className="text-xs font-bold max-w-[80px] truncate text-slate-200">{opponent.username}</p>
                          <p className="text-[10px] text-pink-400 font-semibold uppercase">{t('enemy')}</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center space-x-1.5">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-800 border border-slate-700 border-dashed rounded-full flex items-center justify-center text-slate-500 animate-pulse shrink-0">
                          ?
                        </div>
                        <p className="hidden sm:block text-xs text-slate-500 font-medium animate-pulse">{t('you') === 'Bạn' ? 'Đang chờ...' : 'Waiting...'}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleLeaveRoom}
                    className="p-1.5 sm:p-2 bg-slate-800/80 hover:bg-red-950/60 border border-slate-700/60 hover:border-red-800/80 rounded-lg sm:rounded-xl text-slate-400 hover:text-red-300 transition cursor-pointer"
                    title={t('backToLobby')}
                  >
                    <LogOut size={14} className="sm:w-[16px] sm:h-[16px]" />
                  </button>
                </div>
              </div>

              {/* STATE: WAITING FOR PLAYERS */}
              {room.state === 'WAITING_FOR_PLAYERS' && (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/20 border border-slate-800/60 border-dashed rounded-2xl p-6 sm:p-12 text-center">
                  <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center animate-pulse mb-6">
                    <Users size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{t('waitingOpponent')}</h3>
                  <p className="text-slate-400 text-sm max-w-sm mb-6">
                    {t('waitingOpponentDesc').replace('{roomId}', room.roomId)}
                  </p>
                  <button 
                    onClick={copyRoomId}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition duration-200 flex items-center space-x-2 cursor-pointer"
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    <span>{copied ? t('copied') : t('copyRoomId')}</span>
                  </button>
                </div>
              )}

              {/* STATE: SETTING_SECRET (Secret Choice) */}
              {room.state === 'SETTING_SECRET' && (
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 sm:p-8 rounded-2xl shadow-2xl space-y-6">
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <KeyRound size={24} />
                      </div>
                      <h3 className="text-xl font-extrabold uppercase">{t('setupSecret')}</h3>
                      <p className="text-xs text-slate-400">
                        {t('setupSecretDesc')}
                      </p>
                    </div>

                    {me?.ready ? (
                      <div className="text-center py-8 space-y-4">
                        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-green-400 font-semibold">{t('secretLocked')}</p>
                        <p className="text-xs text-slate-500">
                          {opponentSecretSet ? t('bothReadyTransitioning') : t('waitingOpponentSubmitSecret')}
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSetSecret} className="space-y-4">
                        <input
                           type="text"
                           maxLength={4}
                           placeholder={t('secretPlaceholder')}
                           value={secretInput}
                           onChange={(e) => setSecretInput(e.target.value.replace(/\D/g, ''))}
                           className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none px-6 py-4 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.6em] placeholder-slate-700"
                        />
                        <button
                          type="submit"
                          disabled={secretInput.length !== 4}
                          className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg transition duration-200 cursor-pointer"
                        >
                          {t('lockSecret')}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {/* STATE: RPS_DECISION (Rock-Paper-Scissors battle) */}
              {room.state === 'RPS_DECISION' && (
                <div className="flex-1 flex flex-col items-center justify-center py-6">
                  <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 sm:p-8 rounded-2xl shadow-2xl space-y-6">
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Dices size={24} />
                      </div>
                      <h3 className="text-xl font-extrabold uppercase">{t('rpsInitiative')}</h3>
                      <p className="text-xs text-slate-400">
                        {t('rpsDesc')}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {(['rock', 'paper', 'scissors'] as const).map((choice) => {
                        const icon = choice === 'rock' ? '✊' : choice === 'paper' ? '✋' : '✌️';
                        const isSelected = me?.rpsChoice === choice;
                        const hasChosen = !!me?.rpsChoice;
                        
                        return (
                          <button
                            key={choice}
                            onClick={() => !hasChosen && handleRpsChoice(choice)}
                            disabled={hasChosen && !isSelected}
                            className={`aspect-square rounded-2xl text-4xl flex flex-col items-center justify-center gap-2 transition duration-200 cursor-pointer border ${
                              isSelected 
                                ? 'bg-purple-600/35 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105 text-white animate-pulse' 
                                : hasChosen
                                  ? 'bg-slate-950/20 border-slate-900/60 opacity-30 cursor-not-allowed'
                                  : 'bg-slate-950/60 hover:bg-purple-950/20 border-slate-800 hover:border-purple-500/50 text-slate-300 hover:text-white'
                            }`}
                          >
                            <span className={`${isSelected ? 'scale-110' : ''}`}>{icon}</span>
                            <span className={`text-[10px] uppercase font-black tracking-wider ${isSelected ? 'text-purple-300' : 'text-slate-500'}`}>{t(choice)}</span>
                          </button>
                        );
                      })}
                    </div>

                    {me?.rpsChoice && (
                      <div className="text-center pt-3 border-t border-slate-800/60 space-y-2">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs text-purple-400 font-bold">
                            {opponentRpsSubmitted ? t('resolvingClash') : t('waitingOpponentRps')}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-500 italic">
                          {t('submittedChoice').replace('{choice}', t(me.rpsChoice as 'rock' | 'paper' | 'scissors'))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STATE: PLAYING (The Game Arena) */}
              {room.state === 'PLAYING' && me && opponent && (
                <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0">
                  {/* Guess History Tab Switcher - Mobile Only */}
                  <div className="flex md:hidden border border-slate-800/80 bg-slate-950/40 p-1 rounded-xl shrink-0 gap-1">
                    <button
                      onClick={() => setActiveHistoryTab('mine')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                        activeHistoryTab === 'mine'
                          ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                          : 'text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      {t('yourGuesses')} ({room.guesses.filter(g => g.playerIndex === myPlayerIndex).length})
                    </button>
                    <button
                      onClick={() => setActiveHistoryTab('opponent')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition duration-200 ${
                        activeHistoryTab === 'opponent'
                          ? 'bg-pink-500/15 border border-pink-500/30 text-pink-300'
                          : 'text-slate-500 hover:text-slate-400'
                      }`}
                    >
                      {locale === 'vi' ? 'Đối thủ đoán' : 'Opponent Guesses'} ({room.guesses.filter(g => g.playerIndex === opponentPlayerIndex).length})
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 min-h-0">
                    {/* Left sub-panel: Your guesses against opponent */}
                    <div className={`flex-1 flex-col bg-slate-900/20 border border-slate-800/80 rounded-xl sm:rounded-2xl overflow-hidden h-[218px] md:h-[366px] ${activeHistoryTab === 'mine' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-2.5 sm:p-3 bg-purple-950/10 border-b border-slate-800 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-purple-400 shrink-0">●</span>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider truncate">{t('yourOffense')}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full shrink-0">
                        {t('guessesCount').replace('{count}', String(room.guesses.filter(g => g.playerIndex === myPlayerIndex).length))}
                      </span>
                    </div>

                    <div ref={myGuessesScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-2.5 sm:p-3 space-y-1.5 min-h-0 h-[182px] md:h-[318px]">
                      {room.guesses.filter(g => g.playerIndex === myPlayerIndex).map((g, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-950/50 border border-slate-900 rounded-lg sm:rounded-xl text-sm"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="text-slate-500 text-xs font-mono font-bold shrink-0">#{i+1}</span>
                            <span className="font-mono font-extrabold text-sm sm:text-base tracking-wider text-purple-300">{g.guess}</span>
                          </div>
                          <div className="flex items-center space-x-2 sm:space-x-3 text-xs shrink-0">
                            <div className="flex items-center space-x-0.5 sm:space-x-1" title="Correct digits total">
                              <span className="text-yellow-500">🟢</span>
                              <span className="font-extrabold text-[10px] sm:text-xs">
                                <span className="hidden xs:inline">{t('correctDigits').replace('{count}', String(g.correctNumbers))}</span>
                                <span className="xs:hidden">{g.correctNumbers}</span>
                              </span>
                            </div>
                            <div className="flex items-center space-x-0.5 sm:space-x-1" title="Correct position">
                              <span className="text-green-500">🎯</span>
                              <span className="font-extrabold text-[10px] sm:text-xs">
                                <span className="hidden xs:inline">{t('correctPosition').replace('{count}', String(g.correctPosition))}</span>
                                <span className="xs:hidden">{g.correctPosition}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {room.guesses.filter(g => g.playerIndex === myPlayerIndex).length === 0 && (
                        <div className="h-full flex items-center justify-center text-slate-600 text-xs sm:text-sm py-8">
                          {t('noGuessesYet')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right sub-panel: Opponent's guesses against you */}
                  <div className={`flex-1 flex-col bg-slate-900/20 border border-slate-800/80 rounded-xl sm:rounded-2xl overflow-hidden h-[218px] md:h-[366px] ${activeHistoryTab === 'opponent' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-2.5 sm:p-3 bg-pink-950/10 border-b border-slate-800 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-pink-400 shrink-0">●</span>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider truncate">{t('opponentOffense').replace('{username}', opponent.username)}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full shrink-0">
                        {t('guessesCount').replace('{count}', String(room.guesses.filter(g => g.playerIndex === opponentPlayerIndex).length))}
                      </span>
                    </div>

                    <div ref={opponentGuessesScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-2.5 sm:p-3 space-y-1.5 min-h-0 h-[182px] md:h-[318px]">
                      {room.guesses.filter(g => g.playerIndex === opponentPlayerIndex).map((g, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-950/50 border border-slate-900 rounded-lg sm:rounded-xl text-sm"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="text-slate-500 text-xs font-mono font-bold shrink-0">#{i+1}</span>
                            <span className="font-mono font-extrabold text-sm sm:text-base tracking-wider text-pink-300">{g.guess}</span>
                          </div>
                          <div className="flex items-center space-x-2 sm:space-x-3 text-xs shrink-0">
                            <div className="flex items-center space-x-0.5 sm:space-x-1" title="Correct digits total">
                              <span className="text-yellow-500">🟢</span>
                              <span className="font-extrabold text-[10px] sm:text-xs">
                                <span className="hidden xs:inline">{t('correctDigits').replace('{count}', String(g.correctNumbers))}</span>
                                <span className="xs:hidden">{g.correctNumbers}</span>
                              </span>
                            </div>
                            <div className="flex items-center space-x-0.5 sm:space-x-1" title="Correct position">
                              <span className="text-green-500">🎯</span>
                              <span className="font-extrabold text-[10px] sm:text-xs">
                                <span className="hidden xs:inline">{t('correctPosition').replace('{count}', String(g.correctPosition))}</span>
                                <span className="xs:hidden">{g.correctPosition}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {room.guesses.filter(g => g.playerIndex === opponentPlayerIndex).length === 0 && (
                        <div className="h-full flex items-center justify-center text-slate-600 text-xs sm:text-sm py-8">
                          {t('enemyNotGuessedYet')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* INPUT GUESS SECTION (Tied to PLAYING state footer) */}
              {room.state === 'PLAYING' && me && (
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg shrink-0">
                  {room.activeTurnIndex === myPlayerIndex ? (
                    <div className="flex items-center justify-between gap-3 py-1">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 uppercase tracking-wider animate-pulse min-w-0">
                        <span className="shrink-0">🔥</span>
                        <span className="truncate">{locale === 'vi' ? 'Lượt đoán của bạn!' : 'Your turn to guess!'}</span>
                      </div>
                      
                      {!showNumPad ? (
                        <div className="relative">
                          {/* Animated helper tooltip pointing to the button */}
                          <div className="absolute bottom-full right-0 mb-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] sm:text-[10px] font-black px-2.5 py-1 rounded-lg whitespace-nowrap shadow-md pointer-events-none animate-bounce z-20">
                            {locale === 'vi' ? 'Bấm vào để chọn số đoán' : 'Click to select guess'}
                            <div className="absolute top-full right-8 border-4 border-transparent border-t-pink-500" />
                          </div>

                          <button
                            onClick={() => setShowNumPad(true)}
                            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs sm:text-sm font-extrabold rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25 transition duration-200 cursor-pointer shrink-0"
                          >
                            {locale === 'vi' ? 'Đoán số' : 'Guess'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-purple-400 font-semibold shrink-0">
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping" />
                          <span>{locale === 'vi' ? 'Đang mở' : 'Active'}</span>
                          <button 
                            onClick={() => setShowNumPad(false)}
                            className="underline text-slate-400 hover:text-white transition ml-1"
                          >
                            {locale === 'vi' ? 'Đóng' : 'Close'}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-xs sm:text-sm font-semibold text-slate-400 flex items-center justify-center space-x-2">
                      <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                      <span className="truncate max-w-[240px]">{t('waitingOpponentGuess').replace('{username}', opponent?.username || '')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* STATE: FINISHED (Victory / Defeat screen - simplified) */}
              {room.state === 'FINISHED' && (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                  {room.winnerIndex === myPlayerIndex && <ConfettiCanvas />}
                  <div className="space-y-4">
                    <div className="text-6xl">{room.winnerIndex === myPlayerIndex ? '🏆' : '💀'}</div>
                    <h3 className={`text-3xl font-black bg-gradient-to-r ${room.winnerIndex === myPlayerIndex ? 'from-yellow-400 to-amber-500' : 'from-red-500 to-pink-500'} text-transparent bg-clip-text`}>
                      {room.winnerIndex === myPlayerIndex ? t('victory') : t('defeat')}
                    </h3>
                    <button
                      onClick={() => setShowMatchModal(true)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold rounded-xl shadow-lg transition duration-200 cursor-pointer"
                    >
                      {t('matchSummary')}
                    </button>
                    <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
                      <button
                        onClick={handlePlayAgain}
                        className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold rounded-xl transition duration-200 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <RefreshCw size={18} />
                        <span>{t('playAgain')}</span>
                      </button>
                      <button
                        onClick={handleLeaveRoom}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition duration-200 cursor-pointer"
                      >
                        {t('backToLobby')}
                      </button>
                    </div>
                    {opponentWantsPlayAgain && (
                      <p className="text-xs text-green-400 font-semibold animate-pulse">
                        {t('rematchRequest').replace('{username}', opponent?.username || t('enemy'))}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* MATCH SUMMARY MODAL OVERLAY */}
              <AnimatePresence>
                {showMatchModal && room?.state === 'FINISHED' && matchStats && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowMatchModal(false); }}
                  >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    
                     {/* Modal */}
                     <motion.div
                       initial={{ opacity: 0, scale: 0.9, y: 30 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.9, y: 30 }}
                       transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                       className="relative w-full max-w-lg max-h-[90dvh] bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                     >
                       {/* Close button */}
                       <button
                         onClick={() => setShowMatchModal(false)}
                         className="absolute top-4 right-4 p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition z-10 cursor-pointer"
                       >
                         <X size={16} />
                       </button>
 
                       {/* Header (Fixed) */}
                       <div className={`p-6 pb-4 text-center shrink-0 ${room.winnerIndex === myPlayerIndex ? 'bg-gradient-to-b from-yellow-500/10 to-transparent' : 'bg-gradient-to-b from-red-500/10 to-transparent'}`}>
                         <div className="text-5xl mb-3">{room.winnerIndex === myPlayerIndex ? '🏆' : '💀'}</div>
                         <h3 className={`text-2xl font-black bg-gradient-to-r ${room.winnerIndex === myPlayerIndex ? 'from-yellow-400 to-amber-500' : 'from-red-500 to-pink-500'} text-transparent bg-clip-text`}>
                           {room.winnerIndex === myPlayerIndex ? t('victory') : t('defeat')}
                         </h3>
                         <p className="text-xs text-slate-400 mt-1">
                           {room.winnerIndex === myPlayerIndex 
                             ? t('victoryDesc') 
                             : t('defeatDesc').replace('{username}', opponent?.username || '')}
                         </p>
                       </div>
 
                       {/* Scrollable Stats Area */}
                       <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-2 space-y-3.5 min-h-0">
                         {/* Duration */}
                         <div className="grid grid-cols-2 gap-3">
                           <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 flex items-center gap-3">
                             <div className="p-2 bg-blue-500/10 rounded-lg">
                               <Clock size={18} className="text-blue-400" />
                             </div>
                             <div>
                               <span className="text-[10px] text-slate-500 font-bold uppercase block">{t('matchDuration')}</span>
                               <span className="font-mono text-lg font-extrabold text-white">{formatDuration(matchStats.duration)}</span>
                             </div>
                           </div>
                           <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 flex items-center gap-3">
                             <div className="p-2 bg-purple-500/10 rounded-lg">
                               <Target size={18} className="text-purple-400" />
                             </div>
                             <div>
                               <span className="text-[10px] text-slate-500 font-bold uppercase block">{t('opponentGuesses')}</span>
                               <span className="font-mono text-lg font-extrabold text-white">{matchStats.totalGuesses} {locale === 'vi' ? 'lượt' : 'total'}</span>
                             </div>
                           </div>
                         </div>
 
                         {/* Player Stats Comparison */}
                         <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
                           <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-2">
                               {me?.avatar ? (
                                 <img src={me.avatar} alt={me.username} className="w-8 h-8 rounded-full border border-slate-600" />
                               ) : (
                                 <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold uppercase">{user.name.slice(0, 2)}</div>
                               )}
                               <div className="text-sm">
                                 <span className="font-bold text-slate-200">{t('you')}</span>
                                 {room.winnerIndex === myPlayerIndex && <span className="ml-1.5 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">👑 Winner</span>}
                               </div>
                             </div>
                             <div className="text-right">
                               <span className="text-[10px] text-slate-500 font-bold uppercase block">{t('yourGuesses')}</span>
                               <span className="font-mono text-lg font-extrabold text-white">
                                 {room.winnerIndex === myPlayerIndex ? matchStats.winnerGuessCount : matchStats.loserGuessCount}
                               </span>
                             </div>
                           </div>
                           
                           <div className="border-t border-slate-700/40 my-2" />
                           
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               {opponent?.avatar ? (
                                 <img src={opponent.avatar} alt={opponent.username} className="w-8 h-8 rounded-full border border-slate-600" />
                               ) : (
                                 <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-xs font-bold uppercase">{(opponent?.username || '??').slice(0, 2)}</div>
                               )}
                               <div className="text-sm">
                                 <span className="font-bold text-slate-200">{opponent?.username || t('enemy')}</span>
                                 {room.winnerIndex !== myPlayerIndex && <span className="ml-1.5 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">👑 Winner</span>}
                               </div>
                             </div>
                             <div className="text-right">
                               <span className="text-[10px] text-slate-500 font-bold uppercase block">{t('opponentGuessesCount')}</span>
                               <span className="font-mono text-lg font-extrabold text-white">
                                 {room.winnerIndex === myPlayerIndex ? matchStats.loserGuessCount : matchStats.winnerGuessCount}
                               </span>
                             </div>
                           </div>
                         </div>
 
                         {/* Secret Codes Reveal */}
                         <div className="grid grid-cols-2 gap-3">
                           <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
                             <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">{t('yourSecret')}</span>
                             <span className="font-mono text-xl font-extrabold tracking-widest text-emerald-400">
                               {room.winnerIndex === myPlayerIndex ? matchStats.winnerSecret : matchStats.loserSecret}
                             </span>
                           </div>
                           <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
                             <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">{t('enemySecret')}</span>
                             <span className="font-mono text-xl font-extrabold tracking-widest text-purple-400">
                               {secretReveal || '????'}
                             </span>
                           </div>
                         </div>
 
                         {/* First Move Info */}
                         <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 flex items-center gap-3">
                           <div className="p-2 bg-amber-500/10 rounded-lg">
                             <Swords size={18} className="text-amber-400" />
                           </div>
                           <div>
                             <span className="text-[10px] text-slate-500 font-bold uppercase block">{t('firstMove')}</span>
                             <span className="text-sm font-bold text-slate-200">
                               {matchStats.rpsWinnerIndex === myPlayerIndex 
                                 ? `${t('you')} (${locale === 'vi' ? 'thắng oẳn tù tì' : 'won RPS'})` 
                                 : `${opponent?.username || t('enemy')} (${locale === 'vi' ? 'thắng oẳn tù tì' : 'won RPS'})`}
                             </span>
                           </div>
                         </div>
                       </div>
 
                       {/* Action buttons (Fixed Footer) */}
                       <div className="px-6 py-4 bg-slate-950/30 border-t border-slate-850 shrink-0 flex flex-col gap-2.5">
                         <div className="flex flex-col sm:flex-row gap-2.5">
                           <button
                             onClick={() => { setShowMatchModal(false); handlePlayAgain(); }}
                             className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold rounded-xl transition duration-200 flex items-center justify-center space-x-2 cursor-pointer"
                           >
                             <RefreshCw size={16} />
                             <span>{t('playAgain')}</span>
                           </button>
                           <button
                             onClick={() => { setShowMatchModal(false); handleLeaveRoom(); }}
                             className="flex-1 py-2.5 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-xl transition duration-200 cursor-pointer"
                           >
                             {t('backToLobby')}
                           </button>
                         </div>
 
                         {opponentWantsPlayAgain && (
                           <p className="text-[11px] text-green-400 font-bold animate-pulse text-center mt-1">
                             💡 {t('rematchRequest').replace('{username}', opponent?.username || t('enemy'))}
                           </p>
                         )}
                       </div>
                     </motion.div>
                   </motion.div>
                )}
              </AnimatePresence>

              {/* COUNTDOWN OVERLAY AT GAME START */}
              <AnimatePresence>
                {showStartCountdown && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="text-center space-y-6 max-w-sm w-full px-6"
                    >
                      <div className="text-xs font-black tracking-[0.2em] text-purple-400 uppercase">
                        {locale === 'vi' ? '⚔️ ĐẤU TRƯỜNG ĐỐI CHIẾN' : '⚔️ BATTLE ARENA'}
                      </div>
                      
                      <div className="text-sm font-bold text-slate-300">
                        {room && room.activeTurnIndex === myPlayerIndex ? (
                          <span className="text-emerald-400 font-extrabold block text-base mb-1">
                            {locale === 'vi' ? '🎉 Bạn Thắng Oẳn Tù Tì!' : '🎉 You Won RPS!'}
                          </span>
                        ) : (
                          <span className="text-pink-400 font-extrabold block text-base mb-1">
                            {locale === 'vi' ? `😢 ${opponent?.username || 'Đối thủ'} Thắng Oẳn Tù Tì!` : `😢 ${opponent?.username || 'Opponent'} Won RPS!`}
                          </span>
                        )}
                        <span>
                          {room && room.activeTurnIndex === myPlayerIndex 
                            ? (locale === 'vi' ? 'Bạn được quyền đoán trước!' : 'You get to guess first!')
                            : (locale === 'vi' ? 'Đối thủ được quyền đoán trước!' : 'Opponent gets to guess first!')}
                        </span>
                      </div>

                      {/* Giant Number Countdown */}
                      <motion.div 
                        key={countdownVal}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-yellow-500 select-none py-4"
                      >
                        {countdownVal > 0 ? countdownVal : (locale === 'vi' ? 'CHIẾN!' : 'BATTLE!')}
                      </motion.div>

                      <div className="text-xs text-slate-500 animate-pulse uppercase tracking-wider">
                        {locale === 'vi' ? 'Trực chiến chuẩn bị bắt đầu...' : 'Battle starting in...'}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* VIRTUAL NUMBER PAD OVERLAY */}
              <AnimatePresence>
                {showNumPad && room && room.state === 'PLAYING' && room.activeTurnIndex === myPlayerIndex && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowNumPad(false); }}
                  >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
                    
                    {/* Keyboard Panel */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 30 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                      className="relative w-full max-w-sm sm:max-w-md bg-slate-900/95 border border-purple-500/35 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 flex flex-col space-y-6 overflow-hidden z-10"
                    >
                      {/* Ambient background glow */}
                      <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 z-10">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🔥</span>
                          <div>
                            <h3 className="text-sm font-black uppercase text-purple-400 tracking-wider">
                              {locale === 'vi' ? 'LƯỢT ĐOÁN CỦA BẠN' : 'YOUR GUESS TURN'}
                            </h3>
                            <p className="text-[10px] text-slate-500">
                              {locale === 'vi' ? 'Chọn 4 chữ số khác nhau' : 'Select 4 unique digits'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowNumPad(false)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-800 hover:border-slate-700 text-slate-400 rounded-full transition cursor-pointer flex items-center justify-center shadow-lg"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      {/* Code Display (4 Digit Slots) */}
                      <div className="flex justify-center items-center gap-3 py-2 z-10">
                        {[0, 1, 2, 3].map((index) => {
                          const digit = guessInput[index];
                          const isActive = guessInput.length === index;
                          return (
                            <div
                              key={index}
                              className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border flex items-center justify-center font-mono text-2xl sm:text-3xl font-black shadow-inner transition-all duration-150 ${
                                digit
                                  ? 'bg-purple-500/10 border-purple-500/60 text-purple-300'
                                  : isActive
                                  ? 'bg-slate-950 border-pink-500/60 text-white animate-pulse shadow-pink-500/10'
                                  : 'bg-slate-950 border-slate-800 text-slate-800'
                              }`}
                            >
                              {digit || (isActive ? '|' : '·')}
                            </div>
                          );
                        })}
                      </div>

                      {/* Virtual Numpad Grid */}
                      <div className="grid grid-cols-3 gap-3 z-10">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                          const strNum = String(num);
                          const isUsed = guessInput.includes(strNum);
                          return (
                            <button
                              key={num}
                              disabled={isUsed || guessInput.length >= 4}
                              onClick={() => setGuessInput(prev => prev + strNum)}
                              className={`py-3.5 rounded-2xl font-mono text-xl sm:text-2xl font-extrabold flex items-center justify-center border shadow-sm transition-all duration-150 active:scale-95 cursor-pointer ${
                                isUsed
                                  ? 'bg-slate-950/20 border-slate-900 text-slate-800 opacity-20 pointer-events-none'
                                  : 'bg-slate-800/50 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200'
                              }`}
                            >
                              {num}
                            </button>
                          );
                        })}

                        {/* Special Actions Row */}
                        <button
                          onClick={() => setGuessInput('')}
                          disabled={guessInput.length === 0}
                          className="py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center bg-slate-950/40 border border-slate-900 hover:bg-red-500/15 hover:border-red-500/35 hover:text-red-400 text-slate-500 transition duration-150 active:scale-95 cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                        >
                          {locale === 'vi' ? 'XÓA HẾT' : 'CLEAR'}
                        </button>

                        <button
                          disabled={guessInput.includes('0') || guessInput.length >= 4}
                          onClick={() => setGuessInput(prev => prev + '0')}
                          className={`py-3.5 rounded-2xl font-mono text-xl sm:text-2xl font-extrabold flex items-center justify-center border shadow-sm transition-all duration-150 active:scale-95 cursor-pointer ${
                            guessInput.includes('0')
                              ? 'bg-slate-950/20 border-slate-900 text-slate-800 opacity-20 pointer-events-none'
                              : 'bg-slate-800/50 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200'
                          }`}
                        >
                          0
                        </button>

                        <button
                          onClick={() => setGuessInput(prev => prev.slice(0, -1))}
                          disabled={guessInput.length === 0}
                          className="py-3.5 rounded-2xl text-base sm:text-lg font-bold flex items-center justify-center bg-slate-950/40 border border-slate-900 hover:bg-amber-500/15 hover:border-amber-500/35 hover:text-amber-400 text-slate-500 transition duration-150 active:scale-95 cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                          title="Backspace"
                        >
                          ⌫
                        </button>
                      </div>

                      {/* Submit button */}
                      <button
                        onClick={(e) => {
                          handleSendGuess(e);
                          setShowNumPad(false);
                        }}
                        disabled={guessInput.length !== 4}
                        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-40 disabled:pointer-events-none text-white text-base font-black rounded-2xl shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.01] active:scale-[0.99] transition duration-200 cursor-pointer flex items-center justify-center gap-2 z-10"
                      >
                        <span>🚀</span>
                        <span>{locale === 'vi' ? 'GỬI ĐOÁN MẬT MÃ' : 'SUBMIT GUESS'}</span>
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* GAME HISTORY MODAL OVERLAY */}
              <AnimatePresence>
                {showHistoryModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowHistoryModal(false); }}
                  >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
                    
                    {/* Modal Container */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="relative w-full max-w-lg bg-slate-900 border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                    >
                      {/* Close button */}
                      <button
                        onClick={() => setShowHistoryModal(false)}
                        className="absolute top-4 right-4 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition z-10 cursor-pointer"
                      >
                        <X size={16} />
                      </button>

                      {/* Header */}
                      <div className="p-6 border-b border-slate-800 flex items-center space-x-3 shrink-0">
                        <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                          <Trophy size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white">
                            {locale === 'vi' ? 'Lịch sử đấu' : 'Match History'}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {locale === 'vi' ? '15 trận đấu gần nhất của bạn' : 'Your 15 most recent matches'}
                          </p>
                        </div>
                      </div>

                      {/* Content (Scrollable list) */}
                      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-0 bg-slate-950/20">
                        {loadingHistory ? (
                          <div className="flex flex-col items-center justify-center py-16 space-y-3">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                              className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full"
                            />
                            <p className="text-xs text-slate-400">
                              {locale === 'vi' ? 'Đang tải lịch sử đấu...' : 'Loading match history...'}
                            </p>
                          </div>
                        ) : historyError ? (
                          <div className="text-center py-16 text-xs text-red-400 font-semibold">
                            ⚠️ {historyError}
                          </div>
                        ) : gameHistory.length === 0 ? (
                          <div className="text-center py-16 text-slate-500 text-xs sm:text-sm">
                            {locale === 'vi' ? 'Bạn chưa chơi trận đấu nào.' : 'No matches played yet.'}
                          </div>
                        ) : (
                          gameHistory.map((match: any, index: number) => {
                            const isWinner = match.winnerId === user.id;
                            const matchOpponent = match.players.find((p: any) => p.userId !== user.id);
                            const matchDate = new Date(match.finishedAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });

                            return (
                              <div 
                                key={match._id || index}
                                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between transition hover:border-slate-700/60 hover:bg-slate-900"
                              >
                                {/* Left part: Opponent info and date */}
                                <div className="flex items-center gap-3 min-w-0">
                                  {matchOpponent?.avatar ? (
                                    <img src={matchOpponent.avatar} alt={matchOpponent.username} className="w-10 h-10 rounded-full border border-slate-700 shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center font-bold text-xs uppercase text-slate-300 shrink-0">
                                      {(matchOpponent?.username || '??').slice(0, 2)}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-slate-200 truncate pr-2">
                                      {matchOpponent?.username || (locale === 'vi' ? 'Đối thủ ẩn danh' : 'Unknown Opponent')}
                                    </h4>
                                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                                      {matchDate}
                                    </span>
                                  </div>
                                </div>

                                {/* Right part: Result & stats */}
                                <div className="flex items-center gap-4 shrink-0">
                                  <div className="text-right">
                                    <span className={`text-xs font-black uppercase tracking-wider block ${isWinner ? 'text-emerald-400' : 'text-rose-500'}`}>
                                      {isWinner ? (locale === 'vi' ? 'Thắng' : 'Win') : (locale === 'vi' ? 'Thua' : 'Loss')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                      {match.totalGuesses} {locale === 'vi' ? 'lượt đoán' : 'guesses'}
                                    </span>
                                  </div>
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${isWinner ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {isWinner ? 'W' : 'L'}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <div className="p-4 border-t border-slate-800 text-center shrink-0">
                        <button
                          onClick={() => setShowHistoryModal(false)}
                          className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          {locale === 'vi' ? 'Đóng' : 'Close'}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: REALTIME CHAT (Inside active room only) */}
        {room && (
          <div className={`w-full lg:w-80 lg:flex-none bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl flex flex-col flex-1 min-h-[450px] lg:h-auto overflow-hidden ${activeMobileTab !== 'chat' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-800 flex items-center space-x-2 shrink-0 bg-slate-950/20">
              <MessageSquare size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">{t('roomChat')}</h3>
            </div>

            {/* Chat message logs */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-0 bg-slate-950/10">
              {chatMessages.map((m, i) => {
                const isMe = m.username === user.name;
                return (
                  <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center space-x-1.5 mb-0.5">
                      <span className="text-[10px] font-bold text-slate-500">{m.username}</span>
                      <span className="text-[9px] text-slate-600">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] break-words ${
                      isMe 
                        ? 'bg-purple-600 text-white rounded-tr-none' 
                        : 'bg-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              {chatMessages.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-700 text-xs py-12">
                  {t('sayHi')}
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat submit bar */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 flex gap-2 shrink-0 bg-slate-950/20">
              <input
                type="text"
                placeholder={t('chatPlaceholder')}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none px-3.5 py-2 rounded-xl text-base md:text-sm placeholder-slate-600"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl disabled:opacity-40 transition duration-150 flex items-center justify-center cursor-pointer"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
