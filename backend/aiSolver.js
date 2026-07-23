/**
 * AI Solver for 4-Digit Number Guessing Game (Bulls and Cows)
 * Supports 3 Difficulty Levels:
 * 1. 'easy': Random guesser without deduction.
 * 2. 'medium': Deductive candidate elimination (logical guesser).
 * 3. 'hard': Minimax information entropy solver (master optimal guesser).
 */

// Pre-generate all 5,040 valid 4-digit codes with unique digits (cached in memory)
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

// Zero-allocation feedback evaluation (Ultra-fast)
// correctPosition: exact index matches
// correctNumbers: total character matches anywhere in target
function evaluateFeedback(guess, target) {
  let correctPosition = 0;
  let correctNumbers = 0;

  for (let i = 0; i < 4; i++) {
    if (guess.charCodeAt(i) === target.charCodeAt(i)) {
      correctPosition++;
    }
    if (target.indexOf(guess[i]) !== -1) {
      correctNumbers++;
    }
  }

  return { correctNumbers, correctPosition };
}

/**
 * Gets the next guess for AI based on chosen difficulty
 * @param {Array<{guess: string, correctNumbers: number, correctPosition: number}>} pastAiGuesses
 * @param {'easy' | 'medium' | 'hard'} difficulty
 * @returns {string} Next 4-digit guess string
 */
function getNextAiGuess(pastAiGuesses = [], difficulty = 'medium') {
  // --- EASY DIFFICULTY ---
  if (difficulty === 'easy') {
    const guessedSet = new Set(pastAiGuesses.map(p => p.guess));
    const unGuessed = ALL_CANDIDATES.filter(c => !guessedSet.has(c));
    return unGuessed[Math.floor(Math.random() * unGuessed.length)] || "1234";
  }

  // --- INITIAL GUESS (MEDIUM & HARD) ---
  if (!pastAiGuesses || pastAiGuesses.length === 0) {
    const initialGuesses = ["0123", "1234", "3456", "5678", "2468", "1357"];
    return initialGuesses[Math.floor(Math.random() * initialGuesses.length)];
  }

  // --- DEDUCTIVE CANDIDATE ELIMINATION ---
  let candidates = ALL_CANDIDATES.filter(candidate => {
    for (let i = 0; i < pastAiGuesses.length; i++) {
      const past = pastAiGuesses[i];
      const feedback = evaluateFeedback(past.guess, candidate);
      if (
        feedback.correctPosition !== past.correctPosition ||
        feedback.correctNumbers !== past.correctNumbers
      ) {
        return false;
      }
    }
    return true;
  });

  // Fallback if empty
  if (candidates.length === 0) {
    const guessedSet = new Set(pastAiGuesses.map(p => p.guess));
    const fallbackList = ALL_CANDIDATES.filter(c => !guessedSet.has(c));
    return fallbackList.length > 0 ? fallbackList[Math.floor(Math.random() * fallbackList.length)] : "1234";
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  // --- MEDIUM DIFFICULTY ---
  if (difficulty === 'medium') {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // --- HARD DIFFICULTY (MINIMAX INFORMATION ENTROPY) ---
  let bestGuess = candidates[0];
  let minMaxScore = Infinity;

  // Ultra-fast evaluation pool sample (max 80 candidates for <1ms execution)
  const poolToEvaluate = candidates.length > 80 ? candidates.slice(0, 80) : candidates;

  for (let i = 0; i < poolToEvaluate.length; i++) {
    const guessAttempt = poolToEvaluate[i];
    const feedbackCounts = {};
    let maxCountForGuess = 0;

    for (let j = 0; j < candidates.length; j++) {
      const fb = evaluateFeedback(guessAttempt, candidates[j]);
      const key = `${fb.correctNumbers}-${fb.correctPosition}`;
      const count = (feedbackCounts[key] || 0) + 1;
      feedbackCounts[key] = count;
      if (count > maxCountForGuess) {
        maxCountForGuess = count;
      }
    }

    if (maxCountForGuess < minMaxScore) {
      minMaxScore = maxCountForGuess;
      bestGuess = guessAttempt;
    }
  }

  return bestGuess || candidates[0];
}

module.exports = {
  getNextAiGuess,
  evaluateFeedback
};
