'use client'

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gamepad2, Users, Send, KeyRound, Dices, RefreshCw, LogOut, Copy, Check, MessageSquare
} from 'lucide-react';

interface Player {
  userId: string;
  username: string;
  avatar: string;
  socketId: string;
  secretNumber: string | null;
  rpsChoice: string | null;
  ready: boolean;
}

interface Guess {
  playerIndex: number;
  guess: string;
  correctNumbers: number;
  correctPosition: number;
  timestamp: string;
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
    scissors: "Scissors"
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
    scissors: "Kéo"
  }
};

export default function GameClient() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [locale, setLocale] = useState<'en' | 'vi'>('en');
  const [activeMobileTab, setActiveMobileTab] = useState<'arena' | 'chat'>('arena');

  // Detect locale on mount
  useEffect(() => {
    const queryLocale = searchParams.get('locale');
    if (queryLocale === 'vi' || queryLocale === 'en') {
      setLocale(queryLocale);
      localStorage.setItem('game_locale', queryLocale);
      return;
    }

    const storedLocale = localStorage.getItem('game_locale');
    if (storedLocale === 'vi' || storedLocale === 'en') {
      setLocale(storedLocale);
      return;
    }

    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'vi') {
        setLocale('vi');
        return;
      }
    }
    setLocale('en');
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

  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

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
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
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
    });

    socket.on('SECRET_ACCEPTED', () => {
      setErrorMsg(null);
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

    socket.on('GAME_OVER', (data: { roomState: Room; opponentSecret: string }) => {
      setRoom(data.roomState);
      setSecretReveal(data.opponentSecret);
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
      setTimeout(() => setErrorMsg(null), 5000);
    });

    socket.on('CHAT_MESSAGE', (msg: { username: string; content: string; timestamp: string }) => {
      setChatMessages(prev => [...prev, msg]);
    });

    socket.on('GAME_ERROR', (msg: string) => {
      setErrorMsg(msg);
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
              window.location.href = isLocal ? 'http://localhost:3000/login' : 'https://moviesaw.vercel.app/login';
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
    socketRef.current?.emit('SET_SECRET', { roomId: room.roomId, secret: secretInput });
  };

  const handleRpsChoice = (choice: 'rock' | 'paper' | 'scissors') => {
    if (!room) return;
    socketRef.current?.emit('SUBMIT_RPS', { roomId: room.roomId, choice });
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white font-sans flex flex-col p-4 overflow-x-hidden max-w-full">
      {/* Header Info */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-800 mb-6 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
            <Gamepad2 size={24} />
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
              {t('title')}
            </h1>
            <p className="text-xs text-slate-400">{t('subtitle')}</p>
          </div>
        </div>

        {/* User Card & Language Selector */}
        <div className="flex items-center space-x-3">
          {/* Language Toggle */}
          <div className="flex items-center bg-slate-900/60 border border-slate-800/80 p-0.5 rounded-xl text-[10px] font-bold">
            <button
              onClick={() => toggleLocale('en')}
              className={`px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                locale === 'en'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => toggleLocale('vi')}
              className={`px-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                locale === 'vi'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              VI
            </button>
          </div>

          {/* User Display */}
          <div className="flex items-center space-x-3 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-xl">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-slate-700" />
            ) : (
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                {user.name.slice(0, 2)}
              </div>
            )}
            <span className="hidden sm:inline font-medium text-sm text-slate-200">{user.name}</span>
          </div>
        </div>
      </header>

      {/* Global Error Banner */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-7xl w-full mx-auto mb-4 bg-red-950/40 border border-red-500/50 p-3.5 rounded-xl text-center text-sm font-semibold text-red-200 shadow-lg"
          >
            ⚠️ {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

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

      <main className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-6 mb-4">
        {/* LEFT COLUMN: MAIN GAME BOARD */}
        <div className={`flex-1 flex flex-col min-w-0 ${room && activeMobileTab !== 'arena' ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* LOBBY STATE */}
          {!room && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center py-12"
            >
              <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 sm:p-8 rounded-2xl shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black">{t('chooseMode')}</h2>
                  <p className="text-sm text-slate-400">{t('chooseModeDesc')}</p>
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-extrabold rounded-xl shadow-lg transition duration-200 flex items-center justify-center space-x-2 text-base cursor-pointer"
                >
                  <Gamepad2 size={20} />
                  <span>{t('createRoom')}</span>
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                  <span className="relative px-3 bg-slate-950 text-slate-500 text-xs font-bold uppercase">{t('orJoin')}</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder={t('enterRoomId')}
                    value={joinedRoomId}
                    onChange={(e) => setJoinedRoomId(e.target.value)}
                    className="flex-1 w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none px-4 py-3 rounded-xl text-center text-lg font-mono font-bold placeholder-slate-700 uppercase min-w-0"
                  />
                  <button
                    onClick={() => handleJoinRoom(joinedRoomId)}
                    className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition duration-200 cursor-pointer shrink-0"
                  >
                    {t('join')}
                  </button>
                </div>

                {/* Available Lobby Rooms */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                    <Users size={14} />
                    <span>{t('lobbyRooms')}</span>
                  </h3>
                  
                  {lobbyRooms.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-800/60 rounded-xl text-slate-600 text-sm">
                      {t('noRooms')}
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {lobbyRooms.map((r) => (
                        <div 
                          key={r.roomId}
                          className="flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/60 rounded-xl"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-bold text-purple-400">{r.roomId}</p>
                            <p className="text-xs text-slate-400 truncate">Host: {r.hostName}</p>
                          </div>
                          <button
                            onClick={() => handleJoinRoom(r.roomId)}
                            className="px-3.5 py-1.5 bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white text-xs font-bold rounded-lg transition duration-200 cursor-pointer"
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
          )}

          {/* ROOM ACTIVE STATES */}
          {room && (
            <div className="flex-1 flex flex-col space-y-4">
              
              {/* Active Room Header bar */}
              <div className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg shrink-0">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('roomArena')}</span>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-mono text-lg font-extrabold text-purple-400">{room.roomId}</h2>
                    <button 
                      onClick={copyRoomId}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer"
                      title={t('copyRoomId')}
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  {/* Player Avatars display */}
                  <div className="flex items-center space-x-2.5">
                    {/* Me */}
                    <div className="text-right">
                      <p className="text-xs font-bold max-w-[80px] truncate text-slate-200">{me?.username}</p>
                      <p className="text-[10px] text-purple-400 font-semibold uppercase">{t('you')}</p>
                    </div>
                    {me?.avatar ? (
                      <img src={me.avatar} className="w-8 h-8 rounded-full border border-purple-500" />
                    ) : (
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                        {me?.username.slice(0, 2)}
                      </div>
                    )}

                    <span className="text-slate-700 font-bold">VS</span>

                    {/* Opponent */}
                    {opponent ? (
                      <>
                        {opponent.avatar ? (
                          <img src={opponent.avatar} className="w-8 h-8 rounded-full border border-pink-500" />
                        ) : (
                          <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                            {opponent.username.slice(0, 2)}
                          </div>
                        )}
                        <div className="text-left">
                          <p className="text-xs font-bold max-w-[80px] truncate text-slate-200">{opponent.username}</p>
                          <p className="text-[10px] text-pink-400 font-semibold uppercase">{t('enemy')}</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-slate-800 border border-slate-700 border-dashed rounded-full flex items-center justify-center text-slate-500 animate-pulse">
                          ?
                        </div>
                        <p className="text-xs text-slate-500 font-medium animate-pulse">{t('you') === 'Bạn' ? 'Đang chờ...' : 'Waiting...'}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleLeaveRoom}
                    className="p-2 bg-slate-800/80 hover:bg-red-950/60 border border-slate-700/60 hover:border-red-800/80 rounded-xl text-slate-400 hover:text-red-300 transition cursor-pointer"
                    title={t('backToLobby')}
                  >
                    <LogOut size={16} />
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

                    {me?.rpsChoice ? (
                      <div className="text-center py-8 space-y-4">
                        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-purple-400 font-semibold">
                          {t('submittedChoice').replace('{choice}', t(me.rpsChoice as 'rock' | 'paper' | 'scissors'))}
                        </p>
                        <p className="text-xs text-slate-500">
                          {opponentRpsSubmitted ? t('resolvingClash') : t('waitingOpponentRps')}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {(['rock', 'paper', 'scissors'] as const).map((choice) => {
                          const icon = choice === 'rock' ? '✊' : choice === 'paper' ? '✋' : '✌️';
                          return (
                            <button
                              key={choice}
                              onClick={() => handleRpsChoice(choice)}
                              className="aspect-square bg-slate-950/60 hover:bg-purple-950/20 border border-slate-800 hover:border-purple-500/50 rounded-2xl text-4xl flex flex-col items-center justify-center gap-2 transition duration-200 cursor-pointer"
                            >
                              <span>{icon}</span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{t(choice)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STATE: PLAYING (The Game Arena) */}
              {room.state === 'PLAYING' && me && opponent && (
                <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
                  {/* Left sub-panel: Your guesses against opponent */}
                  <div className="flex-1 flex flex-col bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden min-h-[300px]">
                    <div className="p-3 bg-purple-950/10 border-b border-slate-800 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-400">●</span>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider">{t('yourOffense')}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                        {t('guessesCount').replace('{count}', String(room.guesses.filter(g => g.playerIndex === myPlayerIndex).length))}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
                      {room.guesses.filter(g => g.playerIndex === myPlayerIndex).map((g, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-2.5 bg-slate-950/50 border border-slate-900 rounded-xl text-sm"
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="text-slate-500 text-xs font-mono font-bold">#{i+1}</span>
                            <span className="font-mono font-extrabold text-base tracking-wider text-purple-300">{g.guess}</span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs">
                            <div className="flex items-center space-x-1" title="Correct digits total">
                              <span className="text-yellow-500">🟢</span>
                              <span className="font-extrabold">{t('correctDigits').replace('{count}', String(g.correctNumbers))}</span>
                            </div>
                            <div className="flex items-center space-x-1" title="Correct position">
                              <span className="text-green-500">🎯</span>
                              <span className="font-extrabold">{t('correctPosition').replace('{count}', String(g.correctPosition))}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {room.guesses.filter(g => g.playerIndex === myPlayerIndex).length === 0 && (
                        <div className="h-full flex items-center justify-center text-slate-600 text-sm py-12">
                          {t('noGuessesYet')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right sub-panel: Opponent's guesses against you */}
                  <div className="flex-1 flex flex-col bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden min-h-[300px]">
                    <div className="p-3 bg-pink-950/10 border-b border-slate-800 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-pink-400">●</span>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider">{t('opponentOffense').replace('{username}', opponent.username)}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full">
                        {t('guessesCount').replace('{count}', String(room.guesses.filter(g => g.playerIndex === opponentPlayerIndex).length))}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-0">
                      {room.guesses.filter(g => g.playerIndex === opponentPlayerIndex).map((g, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-2.5 bg-slate-950/50 border border-slate-900 rounded-xl text-sm"
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="text-slate-500 text-xs font-mono font-bold">#{i+1}</span>
                            <span className="font-mono font-extrabold text-base tracking-wider text-pink-300">{g.guess}</span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs">
                            <div className="flex items-center space-x-1">
                              <span className="text-yellow-500">🟢</span>
                              <span className="font-extrabold">{t('correctDigits').replace('{count}', String(g.correctNumbers))}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-green-500">🎯</span>
                              <span className="font-extrabold">{t('correctPosition').replace('{count}', String(g.correctPosition))}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {room.guesses.filter(g => g.playerIndex === opponentPlayerIndex).length === 0 && (
                        <div className="h-full flex items-center justify-center text-slate-600 text-sm py-12">
                          {t('enemyNotGuessedYet')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* INPUT GUESS SECTION (Tied to PLAYING state footer) */}
              {room.state === 'PLAYING' && me && (
                <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-lg shrink-0">
                  {room.activeTurnIndex === myPlayerIndex ? (
                    <form onSubmit={handleSendGuess} className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1.5">
                          {t('yourTurn')}
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder={t('enter4digits')}
                          value={guessInput}
                          onChange={(e) => setGuessInput(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none px-4 py-3 rounded-xl font-mono text-lg font-bold tracking-[0.4em] placeholder-slate-700"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={guessInput.length !== 4}
                        className="sm:w-36 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg transition duration-200 self-end cursor-pointer"
                      >
                        {t('fireGuess')}
                      </button>
                    </form>
                  ) : (
                    <div className="py-4 text-center text-sm font-semibold text-slate-400 flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                      <span>{t('waitingOpponentGuess').replace('{username}', opponent?.username || '')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* STATE: FINISHED (Victory / Defeat screen) */}
              {room.state === 'FINISHED' && (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                  {room.winnerIndex === myPlayerIndex && <ConfettiCanvas />}
                  
                  <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 sm:p-8 rounded-2xl shadow-2xl space-y-6">
                    <div className="space-y-2">
                      {room.winnerIndex === myPlayerIndex ? (
                        <>
                          <div className="text-6xl mb-2">🏆</div>
                          <h3 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-amber-500 text-transparent bg-clip-text">{t('victory')}</h3>
                          <p className="text-xs text-slate-400">{t('victoryDesc')}</p>
                        </>
                      ) : (
                        <>
                          <div className="text-6xl mb-2">💀</div>
                          <h3 className="text-3xl font-black bg-gradient-to-r from-red-500 to-pink-500 text-transparent bg-clip-text">{t('defeat')}</h3>
                          <p className="text-xs text-slate-400">{t('defeatDesc').replace('{username}', opponent?.username || '')}</p>
                        </>
                      )}
                    </div>

                    {/* Code Reveal */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-left">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">{t('enemySecret')}</span>
                        <span className="font-mono text-xl font-extrabold tracking-widest text-purple-400">{secretReveal || '????'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">{t('opponentGuesses')}</span>
                        <span className="font-bold text-slate-300">{t('turnsCount').replace('{count}', String(room.guesses.length))}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row gap-2.5">
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

            </div>
          )}

        </div>

        {/* RIGHT COLUMN: REALTIME CHAT (Inside active room only) */}
        {room && (
          <div className={`w-full lg:w-80 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl flex flex-col h-[400px] lg:h-auto overflow-hidden ${activeMobileTab !== 'chat' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-800 flex items-center space-x-2 shrink-0 bg-slate-950/20">
              <MessageSquare size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">{t('roomChat')}</h3>
            </div>

            {/* Chat message logs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-slate-950/10">
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
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-purple-500 focus:outline-none px-3.5 py-2 rounded-xl text-sm placeholder-slate-600"
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
