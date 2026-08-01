const test = require('node:test');
const assert = require('node:assert/strict');
const GameHistory = require('../models/GameHistory');
const {
  buildAbandonedMatchSnapshot
} = require('../services/abandonedMatchSettlement');

const PLAYER_ONE_ID = '64b000000000000000000001';
const PLAYER_TWO_ID = '64b000000000000000000002';

function createStartedRoom(overrides = {}) {
  return {
    roomId: 'G-123456',
    matchId: 'match-abandoned-test',
    roundNumber: 2,
    state: 'PLAYING',
    startedAt: '2026-07-31T10:00:00.000Z',
    finishedAt: '2026-07-31T10:02:00.000Z',
    rpsWinnerIndex: 1,
    players: [
      {
        userId: PLAYER_ONE_ID,
        username: 'Player One',
        avatar: 'one.png'
      },
      {
        userId: PLAYER_TWO_ID,
        username: 'Player Two',
        avatar: 'two.png'
      }
    ],
    guesses: [
      { playerIndex: 0, guess: '1234' },
      { playerIndex: 1, guess: '5678' },
      { playerIndex: 0, guess: '9012' }
    ],
    ...overrides
  };
}

test('abandoned snapshot has no winner, no XP, and preserves guess counts', () => {
  const snapshot = buildAbandonedMatchSnapshot(createStartedRoom(), {
    status: 'abandoned',
    endReason: 'both_players_disconnect_timeout'
  });

  assert.equal(snapshot.status, 'abandoned');
  assert.equal(snapshot.endReason, 'both_players_disconnect_timeout');
  assert.equal(snapshot.winnerId, null);
  assert.equal(snapshot.winnerIndex, null);
  assert.equal(snapshot.forfeitedPlayerId, null);
  assert.equal(snapshot.forfeitedPlayerIndex, null);
  assert.equal(snapshot.xpEligible, false);
  assert.equal(snapshot.xpEligibilityReason, 'match_abandoned');
  assert.equal(snapshot.totalGuesses, 3);
  assert.equal(snapshot.duration, 120);
  assert.deepEqual(snapshot.players.map(player => player.guessCount), [2, 1]);
  assert.deepEqual(snapshot.players.map(player => player.xpEarned), [0, 0]);
});

test('cancelled snapshot uses a distinct history reason and still awards no XP', () => {
  const snapshot = buildAbandonedMatchSnapshot(createStartedRoom(), {
    status: 'cancelled',
    endReason: 'restored_room_expired'
  });

  assert.equal(snapshot.status, 'cancelled');
  assert.equal(snapshot.endReason, 'restored_room_expired');
  assert.equal(snapshot.xpEligibilityReason, 'match_cancelled');
  assert.equal(snapshot.winnerId, null);
  assert.equal(snapshot.winnerIndex, null);
  assert.deepEqual(snapshot.players.map(player => player.xpEarned), [0, 0]);
});

test('GameHistory accepts no winner only for abandoned/cancelled matches', async () => {
  const abandonedSnapshot = buildAbandonedMatchSnapshot(createStartedRoom());
  await new GameHistory(abandonedSnapshot).validate();

  const completedWithoutWinner = new GameHistory({
    ...abandonedSnapshot,
    status: 'completed',
    xpEligibilityReason: 'minimum_guesses_not_met'
  });
  await assert.rejects(
    completedWithoutWinner.validate(),
    error => {
      assert.ok(error?.errors?.winnerId);
      assert.ok(error?.errors?.winnerIndex);
      return true;
    }
  );
});

test('abandoned settlement snapshot requires a stable started PvP identity', () => {
  assert.throws(
    () => buildAbandonedMatchSnapshot(createStartedRoom({ matchId: null })),
    /matchId/
  );
  assert.throws(
    () => buildAbandonedMatchSnapshot(createStartedRoom({ startedAt: null })),
    /startedAt/
  );
  assert.throws(
    () => buildAbandonedMatchSnapshot(createStartedRoom({ isAiRoom: true })),
    /human-vs-human/
  );
  assert.throws(
    () => buildAbandonedMatchSnapshot(createStartedRoom({
      players: [
        { userId: PLAYER_ONE_ID, username: 'One' },
        { userId: PLAYER_ONE_ID, username: 'Duplicate' }
      ]
    })),
    /distinct users/
  );
});

test('abandoned settlement snapshot only accepts history-only statuses', () => {
  assert.throws(
    () => buildAbandonedMatchSnapshot(createStartedRoom(), { status: 'completed' }),
    /abandoned or cancelled/
  );
  assert.throws(
    () => buildAbandonedMatchSnapshot(createStartedRoom(), {
      status: 'abandoned',
      endReason: '   '
    }),
    /endReason/
  );
});

test('matchId remains the unique idempotency key for abandoned histories', () => {
  const matchIdIndex = GameHistory.schema.indexes().find(([fields]) => fields.matchId === 1);

  assert.ok(matchIdIndex);
  assert.equal(matchIdIndex[1].unique, true);
  assert.equal(matchIdIndex[1].sparse, true);
});
