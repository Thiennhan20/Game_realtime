/**
 * AI Solver for 4-Digit Number Guessing Game (Bulls and Cows)
 * Supports 3 Difficulty Levels:
 * 1. 'easy': Random guesser without deduction.
 * 2. 'medium': Deductive elimination + digit-frequency heuristic.
 * 3. 'hard': Deductive elimination + minimax optimal solver.
 *
 * correctNumbers = total digits in guess that exist anywhere in target (bulls + cows)
 * correctPosition = digits in exact position (bulls only)
 * This MUST match checkGuess() in server.js exactly.
 */

// Pre-generate all 5,040 valid 4-digit codes with unique digits (cached)
const ALL_CANDIDATES = (() => {
  const candidates = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      if (j === i) continue;
      for (let k = 0; k <= 9; k++) {
        if (k === i || k === j) continue;
        for (let l = 0; l <= 9; l++) {
          if (l === i || l === j || l === k) continue;
          candidates.push(`${i}${j}${k}${l}`);
        }
      }
    }
  }
  return candidates;
})();

/**
 * Evaluate feedback between a guess and a target.
 * MUST produce identical results to checkGuess() in server.js.
 */
function evaluateFeedback(guess, target) {
  let correctPosition = 0;
  let correctNumbers = 0;

  // Bulls: exact position match
  for (let i = 0; i < 4; i++) {
    if (guess[i] === target[i]) {
      correctPosition++;
    }
  }

  // correctNumbers: total matching digits (bulls + cows)
  const targetSet = new Set(target);
  for (let i = 0; i < 4; i++) {
    if (targetSet.has(guess[i])) {
      correctNumbers++;
    }
  }

  return { correctNumbers, correctPosition };
}

/**
 * Filter candidates that are consistent with ALL past feedback.
 */
function filterCandidates(pastAiGuesses) {
  return ALL_CANDIDATES.filter(candidate => {
    for (let i = 0; i < pastAiGuesses.length; i++) {
      const past = pastAiGuesses[i];
      const fb = evaluateFeedback(past.guess, candidate);
      if (fb.correctPosition !== past.correctPosition ||
          fb.correctNumbers !== past.correctNumbers) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Gets the next guess for AI based on chosen difficulty
 * @param {Array<{guess: string, correctNumbers: number, correctPosition: number}>} pastAiGuesses
 * @param {'easy' | 'medium' | 'hard'} difficulty
 * @returns {string} Next 4-digit guess string
 */
function getNextAiGuess(pastAiGuesses = [], difficulty = 'medium') {
  // --- EASY: pure random, no elimination ---
  if (difficulty === 'easy') {
    const guessedSet = new Set((pastAiGuesses || []).map(p => p.guess));
    const pool = ALL_CANDIDATES.filter(c => !guessedSet.has(c));
    return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : '1234';
  }

  // --- MEDIUM & HARD: first guess ---
  if (!pastAiGuesses || pastAiGuesses.length === 0) {
    // Good strategic opening guesses
    const openers = ['1234', '0123', '2468', '1357', '3456', '5678'];
    return openers[Math.floor(Math.random() * openers.length)];
  }

  // --- Deductive elimination ---
  const candidates = filterCandidates(pastAiGuesses);

  console.log(`[AI Solver] difficulty=${difficulty}, pastGuesses=${pastAiGuesses.length}, candidates=${candidates.length}`);

  if (candidates.length === 0) {
    // Should not happen, but fallback
    console.warn('[AI Solver] No valid candidates! Falling back to random.');
    const guessedSet = new Set(pastAiGuesses.map(p => p.guess));
    const pool = ALL_CANDIDATES.filter(c => !guessedSet.has(c));
    return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : '1234';
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  // --- MEDIUM: pick the candidate with highest digit-frequency score ---
  // Count how often each digit appears at each position across all candidates
  if (difficulty === 'medium') {
    const digitFreq = Array.from({ length: 4 }, () => new Array(10).fill(0));
    for (const c of candidates) {
      for (let i = 0; i < 4; i++) {
        digitFreq[i][parseInt(c[i], 10)]++;
      }
    }

    let bestScore = -1;
    let bestGuess = candidates[0];
    // Evaluate a sample of candidates (up to 100)
    const evalPool = candidates.length > 100 ? candidates.slice(0, 100) : candidates;
    for (const c of evalPool) {
      let score = 0;
      for (let i = 0; i < 4; i++) {
        score += digitFreq[i][parseInt(c[i], 10)];
      }
      if (score > bestScore) {
        bestScore = score;
        bestGuess = c;
      }
    }
    console.log(`[AI Solver][Medium] Chose ${bestGuess} (score ${bestScore}) from ${candidates.length} candidates`);
    return bestGuess;
  }

  // --- HARD: minimax — minimize the worst-case remaining pool ---
  let bestGuess = candidates[0];
  let minMaxBucket = Infinity;

  const evalPool = candidates.length > 80 ? candidates.slice(0, 80) : candidates;

  for (let i = 0; i < evalPool.length; i++) {
    const attempt = evalPool[i];
    const buckets = {};
    let maxBucket = 0;

    for (let j = 0; j < candidates.length; j++) {
      const fb = evaluateFeedback(attempt, candidates[j]);
      const key = fb.correctNumbers * 10 + fb.correctPosition; // cheap numeric key
      const count = (buckets[key] || 0) + 1;
      buckets[key] = count;
      if (count > maxBucket) maxBucket = count;
    }

    if (maxBucket < minMaxBucket) {
      minMaxBucket = maxBucket;
      bestGuess = attempt;
    }
  }

  console.log(`[AI Solver][Hard] Chose ${bestGuess} (worstCase ${minMaxBucket}) from ${candidates.length} candidates`);
  return bestGuess;
}

module.exports = {
  getNextAiGuess,
  evaluateFeedback
};
