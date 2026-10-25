// --- Cows & Bulls (Guess checking logic) ---
function checkGuess(secret, guess) {
  let correctPosition = 0;
  let correctNumbers = 0;

  const secretStr = String(secret || '');
  const guessStr = String(guess || '');

  // Calculate correct positions (Bulls / 🎯)
  for (let i = 0; i < 4; i++) {
    if (secretStr[i] === guessStr[i]) {
      correctPosition++;
    }
  }

  // Calculate correct numbers in total (Cows + Bulls / 🟢)
  const secretSet = new Set(secretStr);
  for (const char of guessStr) {
    if (secretSet.has(char)) {
      correctNumbers++;
    }
  }

  return { correctNumbers, correctPosition };
}

// Helper to validate unique 4 digit numbers
function isValidSecret(num) {
  if (typeof num !== 'string' && typeof num !== 'number') return false;
  const str = String(num);
  if (!/^\d{4}$/.test(str)) return false;
  const set = new Set(str);
  return set.size === 4;
}

// Generate random 6-digit room ID: G-XXXXXX
function generateRoomId(roomsMap) {
  let rid;
  do {
    rid = 'G-' + Math.floor(100000 + Math.random() * 900000);
  } while (roomsMap && roomsMap.has(rid));
  return rid;
}

// Generate 4 random unique digits (e.g. for AI secret code)
function generate4DigitCode() {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, 4).join('');
}

// Sanitize room data for spectators: scrubs secret numbers to null to prevent cheating
function sanitizeRoomForSpectator(room) {
  if (!room) return null;
  return {
    ...room,
    players: (room.players || []).map(p => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      currentWinStreak: p.currentWinStreak || 0,
      socketId: p.socketId,
      secretNumber: null, // NEVER disclose secret numbers to spectators
      rpsChoice: room.state === 'RPS_DECISION' ? (p.rpsChoice ? 'chosen' : null) : p.rpsChoice,
      ready: p.ready,
      disconnectedAt: p.disconnectedAt,
      hasLeft: p.hasLeft
    })),
    spectatorCount: (room.spectators || []).length
  };
}

module.exports = {
  checkGuess,
  isValidSecret,
  generateRoomId,
  generate4DigitCode,
  sanitizeRoomForSpectator
};
