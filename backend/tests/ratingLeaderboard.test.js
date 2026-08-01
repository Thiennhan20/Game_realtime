const test = require('node:test');
const assert = require('node:assert/strict');
const { getRank } = require('../services/rating.js');

test('Leaderboard rank tier utility converts rating to tier correctly', () => {
  assert.equal(getRank(0).key, 'bronze');
  assert.equal(getRank(1150).key, 'silver');
  assert.equal(getRank(1400).key, 'gold');
  assert.equal(getRank(1600).key, 'platinum');
  assert.equal(getRank(1800).key, 'diamond');
  assert.equal(getRank(2100).key, 'master');
});

test('Leaderboard sorting sorts primarily by rating desc, then wins desc, then losses asc', () => {
  const rawProfiles = [
    { userId: 'u1', username: 'P1', rating: 1200, wins: 5, losses: 5 },
    { userId: 'u2', username: 'P2', rating: 1500, wins: 10, losses: 2 },
    { userId: 'u3', username: 'P3', rating: 1200, wins: 8, losses: 1 },
    { userId: 'u4', username: 'P4', rating: 1200, wins: 8, losses: 3 },
  ];

  const sorted = [...rawProfiles].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

  assert.equal(sorted[0].userId, 'u2'); // 1500 rating
  assert.equal(sorted[1].userId, 'u3'); // 1200 rating, 8 wins, 1 loss
  assert.equal(sorted[2].userId, 'u4'); // 1200 rating, 8 wins, 3 losses
  assert.equal(sorted[3].userId, 'u1'); // 1200 rating, 5 wins, 5 losses
});
