const { getNextAiGuess } = require('../aiSolver');
const { decryptSecret } = require('../utils/crypto');
const { checkGuess } = require('../utils/gameLogic');
const { settleAiMatch } = require('./aiMatchSettlement');
const { syncAndDetectNewAchievements } = require('./achievements');
const { invalidateUserAndLeaderboardCache } = require('../config/redis');
const { syncRoomToRedis } = require('./roomManager');

function handleAiTurn(room, io) {
  if (!room || room.state !== 'PLAYING' || room.activeTurnIndex !== 1) return;

  setTimeout(async () => {
    try {
      if (!room || room.state !== 'PLAYING' || room.activeTurnIndex !== 1) return;

      // Collect past AI guesses in this match
      const pastAiGuesses = (room.guesses || [])
        .filter(g => g.playerIndex === 1)
        .map(g => ({
          guess: g.guess,
          correctNumbers: g.correctNumbers,
          correctPosition: g.correctPosition
        }));

      console.log(`[AI] Turn ${pastAiGuesses.length + 1}, difficulty=${room.aiDifficulty || 'medium'}, pastGuesses:`, JSON.stringify(pastAiGuesses));

      // Generate smart guess using AI Solver according to room's difficulty
      const aiGuess = getNextAiGuess(pastAiGuesses, room.aiDifficulty || 'medium');

      let safeGuess;
      if (!aiGuess || typeof aiGuess !== 'string' || aiGuess.length !== 4) {
        console.error(`[AI] Invalid guess returned: "${aiGuess}". Using fallback.`);
        const guessedSet = new Set(pastAiGuesses.map(p => p.guess));
        const pool = ['1234', '5678', '9012', '3456', '7890'].filter(c => !guessedSet.has(c));
        safeGuess = pool[0] || '1234';
      } else {
        safeGuess = aiGuess;
      }

      const decryptedUserSecret = decryptSecret(room.players[0]?.secretNumber);
      if (!decryptedUserSecret) return;

      const { correctNumbers, correctPosition } = checkGuess(decryptedUserSecret, safeGuess);
      const guessRecord = {
        playerIndex: 1,
        guess: safeGuess,
        correctNumbers,
        correctPosition,
        timestamp: new Date().toISOString()
      };
      room.guesses = room.guesses || [];
      room.guesses.push(guessRecord);

      if (correctPosition === 4) {
        room.state = 'FINISHED';
        room.winnerIndex = 1;
        room.finishedAt = new Date().toISOString();

        syncRoomToRedis(room.roomId, room);

        const winnerGuesses = room.guesses.filter(g => g.playerIndex === 1);
        const loserGuesses = room.guesses.filter(g => g.playerIndex === 0);
        const durationMs = room.startedAt ? (new Date(room.finishedAt) - new Date(room.startedAt)) : 0;
        const durationSec = Math.floor(durationMs / 1000);

        const winnerSecretDecrypted = decryptSecret(room.players[1]?.secretNumber);
        const loserSecretDecrypted = decryptSecret(room.players[0]?.secretNumber);

        const initialMatchStats = {
          duration: durationSec,
          totalGuesses: room.guesses.length,
          winnerGuessCount: winnerGuesses.length,
          loserGuessCount: loserGuesses.length,
          rpsWinnerIndex: room.rpsWinnerIndex,
          winnerSecret: winnerSecretDecrypted,
          loserSecret: loserSecretDecrypted,
          startedAt: room.startedAt,
          finishedAt: room.finishedAt,
          xpResults: null,
          newlyUnlockedByUser: {}
        };

        // 1. Instantly notify player of AI win without waiting for DB writes (< 30ms)
        io.to(room.roomId).emit('GAME_OVER', {
          winnerIndex: 1,
          roomState: room,
          opponentSecret: winnerSecretDecrypted,
          matchStats: initialMatchStats
        });
        console.log(`[Game] AI won room ${room.roomId}. Emitted instant GAME_OVER.`);

        // 2. Settle AI match for human player (loss) asynchronously in background
        const currentMatchId = room.matchId;
        const humanPlayer = room.players[0];
        if (humanPlayer && humanPlayer.userId) {
          (async () => {
            try {
              const settlementResult = await settleAiMatch({
                userId: humanPlayer.userId,
                aiDifficulty: room.aiDifficulty || 'medium',
                isUserWinner: false,
                room
              });
              const unlocked = await syncAndDetectNewAchievements(humanPlayer.userId);
              const newlyUnlockedByUser = {};
              if (Array.isArray(unlocked) && unlocked.length > 0) {
                newlyUnlockedByUser[String(humanPlayer.userId)] = unlocked;
              }
              settlementResult.newlyUnlockedAchievements = unlocked || [];
              const aiSettlement = { xpResults: [settlementResult], newlyUnlockedByUser };
              room.xpSettlement = aiSettlement;
              syncRoomToRedis(room.roomId, room);
              void invalidateUserAndLeaderboardCache(humanPlayer.userId);

              io.to(room.roomId).emit('MATCH_SETTLED', {
                roomId: room.roomId,
                matchId: currentMatchId,
                xpResults: aiSettlement.xpResults,
                newlyUnlockedByUser
              });
            } catch (err) {
              console.error(`[AI Settlement] Failed to settle AI loss for room ${room.roomId}:`, err.message);
            }
          })();
        }
      } else {
        room.activeTurnIndex = 0; // Turn back to human!
        syncRoomToRedis(room.roomId, room);
        io.to(room.roomId).emit('GUESS_RESULT', {
          lastGuess: guessRecord,
          roomState: room
        });
        console.log(`[Game] AI guessed ${safeGuess} in ${room.roomId}. Next turn: Human.`);
      }
    } catch (err) {
      console.error(`[AI ERROR] handleAiTurn crashed:`, err);
      // Emergency fallback: make a random guess so the game doesn't freeze
      try {
        const pastGuessed = new Set((room.guesses || []).filter(g => g.playerIndex === 1).map(g => g.guess));
        const fallbacks = ['1234', '5678', '9012', '3456', '7890', '2468', '1357', '0246', '3579', '4680'];
        const fallbackGuess = fallbacks.find(g => !pastGuessed.has(g)) || '1234';

        const decryptedUserSecret = decryptSecret(room.players[0]?.secretNumber);
        if (!decryptedUserSecret) return;

        const { correctNumbers, correctPosition } = checkGuess(decryptedUserSecret, fallbackGuess);
        const guessRecord = {
          playerIndex: 1,
          guess: fallbackGuess,
          correctNumbers,
          correctPosition,
          timestamp: new Date().toISOString()
        };
        room.guesses = room.guesses || [];
        room.guesses.push(guessRecord);

        if (correctPosition === 4) {
          room.state = 'FINISHED';
          room.winnerIndex = 1;
          room.finishedAt = new Date().toISOString();
          syncRoomToRedis(room.roomId, room);
          const aiSecret = decryptSecret(room.players[1]?.secretNumber);
          io.to(room.roomId).emit('GAME_OVER', { winnerIndex: 1, roomState: room, opponentSecret: aiSecret, matchStats: {} });
        } else {
          room.activeTurnIndex = 0;
          syncRoomToRedis(room.roomId, room);
          io.to(room.roomId).emit('GUESS_RESULT', { lastGuess: guessRecord, roomState: room });
        }
        console.log(`[AI] Emergency fallback guess: ${fallbackGuess}`);
      } catch (e2) {
        console.error(`[AI CRITICAL] Even fallback failed:`, e2);
      }
    }
  }, 1200);
}

module.exports = {
  handleAiTurn
};
