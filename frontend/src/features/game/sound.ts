/**
 * Web Audio API Sound Synthesizer & Haptic Feedback for Realtime Guessing Arena
 * 100% client-side, zero external asset dependencies, crystal-clear instant audio.
 * Categorized and distinct acoustic identity for every game event and phase.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('game_sound_muted');
        this.isMuted = stored === 'true';
      } catch {
        this.isMuted = false;
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('game_sound_muted', String(muted));
      } catch {
        // Ignore local storage error
      }
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    if (!this.isMuted) {
      this.playClick();
    }
    return this.isMuted;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Helper to play an oscillator tone with smooth exponential gain envelope
   */
  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    gainLevel = 0.15,
    delay = 0,
    endFreq?: number
  ): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (endFreq !== undefined && endFreq > 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), startTime + duration);
      }

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    } catch {
      // Audio execution catch
    }
  }

  // ==========================================
  // 1. NUMBER KEYPAD & INPUT (Bàn Phím & Gõ Số Bậc Thang)
  // ==========================================

  /**
   * Pitch rises with each digit entered:
   * 1st digit: C5 (523Hz)
   * 2nd digit: E5 (659Hz)
   * 3rd digit: G5 (784Hz)
   * 4th digit: C6 (1046Hz) - Full code entered chime
   */
  public playDigitKey(digitPosition: number): void {
    const scale = [523.25, 659.25, 783.99, 1046.5];
    const freq = scale[Math.min(scale.length - 1, Math.max(0, digitPosition - 1))] ?? 659.25;
    const isFourth = digitPosition >= 4;
    this.playTone(freq, isFourth ? 'triangle' : 'sine', isFourth ? 0.12 : 0.06, isFourth ? 0.16 : 0.12);
  }

  /**
   * Soft tactile downward tick when deleting a digit (Backspace)
   */
  public playDigitDelete(): void {
    this.playTone(460, 'sine', 0.05, 0.12, 0, 320);
  }

  /**
   * Fast descending brush when clearing all digits
   */
  public playDigitClear(): void {
    this.playTone(400, 'triangle', 0.08, 0.12, 0, 180);
  }

  /**
   * Fast energetic upward swoosh when submitting a guess
   */
  public playSubmitGuess(): void {
    this.playTone(320, 'triangle', 0.14, 0.18, 0, 750);
  }

  /**
   * Simple UI click / tap
   */
  public playClick(): void {
    this.playTone(1100, 'triangle', 0.03, 0.08);
  }

  /**
   * Copy Room ID success - crisp double high pop
   */
  public playCopySuccess(): void {
    this.playTone(600, 'sine', 0.07, 0.12, 0);
    this.playTone(950, 'sine', 0.12, 0.15, 0.05);
  }

  /**
   * Soft descending whoosh when leaving room
   */
  public playLeaveRoom(): void {
    this.playTone(360, 'sine', 0.12, 0.12, 0, 180);
  }

  // ==========================================
  // 2. SECRET SETUP (Khóa Mật Mã Két Sắt & Phòng Chờ)
  // ==========================================

  /**
   * Heavy mechanical vault lock when player confirms secret
   */
  public playSecretLocked(): void {
    this.playTone(130, 'sawtooth', 0.16, 0.22, 0, 65); // Deep latch thud
    this.playTone(850, 'triangle', 0.1, 0.18, 0.06); // Metallic click 1
    this.playTone(1250, 'sine', 0.2, 0.2, 0.12); // Metallic lock 2
  }

  /**
   * Notifies that opponent has finished locking their secret
   */
  public playOpponentSecretReady(): void {
    this.playTone(523.25, 'sine', 0.14, 0.14, 0); // C5
    this.playTone(659.25, 'sine', 0.22, 0.16, 0.09); // E5
  }

  /**
   * Opponent entered room / Match found
   */
  public playOpponentJoined(): void {
    this.playTone(523.25, 'triangle', 0.12, 0.18, 0); // C5
    this.playTone(659.25, 'triangle', 0.12, 0.18, 0.08); // E5
    this.playTone(783.99, 'triangle', 0.25, 0.22, 0.16); // G5
  }

  /**
   * Room joined by current player
   */
  public playRoomJoin(): void {
    this.playTone(440, 'sine', 0.12, 0.15, 0); // A4
    this.playTone(659.25, 'sine', 0.25, 0.18, 0.08); // E5
  }

  // ==========================================
  // 3. ROCK-PAPER-SCISSORS (Oẳn Tù Tì Giành Quyền Đi Trước)
  // ==========================================

  /**
   * When player taps Rock, Paper, or Scissors
   */
  public playRpsSelect(): void {
    this.playTone(280, 'triangle', 0.09, 0.18, 0, 180);
  }

  /**
   * When player WINS RPS duel (Gets 1st guess turn!)
   */
  public playRpsWin(): void {
    this.playTone(523.25, 'triangle', 0.14, 0.2, 0); // C5
    this.playTone(659.25, 'triangle', 0.14, 0.2, 0.1); // E5
    this.playTone(783.99, 'triangle', 0.35, 0.24, 0.2); // G5
  }

  /**
   * When opponent wins RPS duel
   */
  public playRpsLose(): void {
    this.playTone(440, 'sine', 0.18, 0.15, 0); // A4
    this.playTone(349.23, 'sine', 0.28, 0.14, 0.1); // F4
  }

  /**
   * When RPS is a TIE (Metal clash - Choose again!)
   */
  public playRpsTie(): void {
    this.playTone(380, 'sawtooth', 0.12, 0.18, 0, 240);
    this.playTone(420, 'triangle', 0.15, 0.16, 0.04);
  }

  // ==========================================
  // 4. COUNTDOWN & BATTLE START (Đếm Ngược Khai Trận)
  // ==========================================

  /**
   * Countdown ticks (3, 2, 1) with rising frequency
   */
  public playCountdownTick(remainingSeconds: number): void {
    const freqs: Record<number, number> = { 3: 440, 2: 587.33, 1: 783.99 };
    const f = freqs[remainingSeconds] || 600;
    this.playTone(f, 'sine', 0.08, 0.16);
  }

  /**
   * Battle Start Gong / Horn (CHIẾN! / GO!)
   */
  public playBattleStart(): void {
    this.playTone(261.63, 'sawtooth', 0.5, 0.22, 0); // C4
    this.playTone(392.0, 'triangle', 0.6, 0.24, 0.02); // G4
    this.playTone(523.25, 'sine', 0.7, 0.26, 0.04); // C5
  }

  // ==========================================
  // 5. TURN ALERTS & TIMER (Thông Báo Lượt Chơi & Thời Gian)
  // ==========================================

  /**
   * Upbeat 2-tone chime notifying: "It's YOUR turn to guess!"
   */
  public playTurnAlert(): void {
    this.playTone(659.25, 'sine', 0.12, 0.18, 0); // E5
    this.playTone(880, 'triangle', 0.22, 0.22, 0.08); // A5
  }

  /**
   * Subtle low tick when turn passes to opponent
   */
  public playOpponentTurn(): void {
    this.playTone(320, 'sine', 0.07, 0.1, 0);
  }

  /**
   * Urgent pulse tick for final seconds of a turn
   */
  public playTimerWarning(secondsRemaining: number): void {
    const freq = secondsRemaining <= 2 ? 880 : 660;
    this.playTone(freq, 'sawtooth', 0.08, 0.18);
  }

  // ==========================================
  // 6. GUESS RESULTS - YOU (Phân Chia Chi Tiết Kết Quả Đoán)
  // ==========================================

  /**
   * Feedback when YOU make a guess:
   * - 0 numbers, 0 pos: Miss (Dull soft drop)
   * - 1-2 numbers (Cows): Gentle crystal glass ping
   * - 3 numbers (Cows): Cheerful 3-tone arpeggio ("HOT! SẮP GIẢI ĐƯỢC HẾT SỐ!")
   * - 1 Bull (1 position): Crisp metallic lock chime
   * - 2 Bulls (2 positions): Dual metallic lock chime
   * - 3 Bulls (3 positions): Dramatic golden near-win arpeggio!
   * - 4 Bulls: Triggers playVictory()
   */
  public playMyGuessResult(correctNumbers: number, correctPosition: number): void {
    if (correctPosition === 4) {
      this.playVictory();
      return;
    }

    if (correctPosition === 3) {
      // 3 Bulls - Incredible near win!
      this.playTone(783.99, 'triangle', 0.15, 0.22, 0); // G5
      this.playTone(987.77, 'triangle', 0.18, 0.24, 0.08); // B5
      this.playTone(1174.66, 'sine', 0.35, 0.26, 0.16); // D6
      this.playTone(1567.98, 'sine', 0.45, 0.28, 0.24); // G6
      return;
    }

    if (correctPosition === 2) {
      // 2 Bulls - Crisp dual lock chime
      this.playTone(587.33, 'sine', 0.14, 0.2, 0); // D5
      this.playTone(739.99, 'triangle', 0.18, 0.22, 0.07); // F#5
      this.playTone(880, 'triangle', 0.28, 0.24, 0.14); // A5
      return;
    }

    if (correctPosition === 1) {
      // 1 Bull - Solid lock chime
      this.playTone(587.33, 'sine', 0.14, 0.2, 0); // D5
      this.playTone(880, 'triangle', 0.24, 0.22, 0.08); // A5
      return;
    }

    if (correctNumbers >= 3) {
      // 3 Cows (0 Bulls) - Sắp giải xong!
      this.playTone(523.25, 'sine', 0.12, 0.18, 0); // C5
      this.playTone(659.25, 'sine', 0.15, 0.2, 0.07); // E5
      this.playTone(783.99, 'sine', 0.25, 0.22, 0.14); // G5
      return;
    }

    if (correctNumbers > 0) {
      // 1-2 Cows - Gentle crystal glass ping
      this.playTone(587.33, 'sine', 0.18, 0.16);
      return;
    }

    // Complete miss (0 & 0) - Dull soft drop
    this.playTone(170, 'sawtooth', 0.18, 0.1, 0, 85);
  }

  // ==========================================
  // 7. GUESS RESULTS - OPPONENT (Hồi Hộp: Đối Thủ Đang Đoán)
  // ==========================================

  /**
   * Feedback when OPPONENT makes a guess:
   * - 0-1 matches: Safe, relaxing low wooden tap (You are safe!)
   * - 2 matches or 1 position: Caution alert (Opponent is catching up)
   * - 3 matches or 2-3 positions: High danger alarm (Suspense! Opponent near cracking your code!)
   */
  public playOpponentGuessResult(correctNumbers: number, correctPosition: number): void {
    if (correctPosition >= 2 || correctNumbers >= 3) {
      // High alert: Opponent is very close to breaking your code!
      this.playTone(392, 'sawtooth', 0.14, 0.16, 0, 310);
      this.playTone(370, 'sawtooth', 0.24, 0.18, 0.12, 270);
    } else if (correctPosition >= 1 || correctNumbers >= 2) {
      // Medium alert
      this.playTone(440, 'triangle', 0.16, 0.13, 0);
    } else {
      // Opponent missed - You are safe!
      this.playTone(220, 'sine', 0.12, 0.1, 0);
    }
  }

  // ==========================================
  // 8. MATCH END & REWARDS (Chiến Thắng, Thất Bại, Lên Cấp)
  // ==========================================

  /**
   * Glorious Victory Fanfare (Major arpeggio C5 -> E5 -> G5 -> C6 + swell)
   */
  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const isLast = i === notes.length - 1;
      this.playTone(freq, 'triangle', isLast ? 0.75 : 0.16, isLast ? 0.28 : 0.18, i * 0.12);
    });
    // Celebratory harmony backing
    this.playTone(523.25, 'sine', 0.75, 0.15, 0.36);
    this.playTone(659.25, 'sine', 0.75, 0.15, 0.36);
  }

  /**
   * Defeat Sound (Minor descending 4-note cadence)
   */
  public playDefeat(): void {
    const notes = [493.88, 440, 392, 329.63]; // B4, A4, G4, E4
    notes.forEach((freq, i) => {
      this.playTone(freq, 'sine', 0.3, 0.14, i * 0.12);
    });
  }

  /**
   * Level up / Rank up sparkling fanfare
   */
  public playLevelUp(): void {
    const notes = [523.25, 659.25, 783.99, 987.77, 1318.51];
    notes.forEach((freq, i) => {
      this.playTone(freq, 'sine', 0.25, 0.18, i * 0.08);
    });
  }

  // ==========================================
  // 9. SOCIAL & CONNECTION (Chat, Mất Kết Nối, Tái Đấu)
  // ==========================================

  /**
   * New Chat Message bubble pop
   */
  public playChatPop(): void {
    this.playTone(420, 'sine', 0.08, 0.15, 0, 840);
  }

  /**
   * Rematch request from opponent
   */
  public playRematchRequest(): void {
    this.playTone(587.33, 'triangle', 0.14, 0.18, 0); // D5
    this.playTone(880, 'triangle', 0.26, 0.2, 0.09); // A5
  }

  /**
   * Opponent temporarily disconnected (Warning tone)
   */
  public playOpponentDisconnected(): void {
    this.playTone(400, 'sawtooth', 0.14, 0.15, 0, 240);
    this.playTone(320, 'sawtooth', 0.22, 0.16, 0.12, 180);
  }

  /**
   * Opponent reconnected (Restoration chime)
   */
  public playOpponentReconnected(): void {
    this.playTone(392, 'sine', 0.12, 0.15, 0);
    this.playTone(587.33, 'sine', 0.22, 0.18, 0.08);
  }

  /**
   * Duplicate guess / validation warning
   */
  public playWarning(): void {
    this.playTone(360, 'sawtooth', 0.1, 0.15, 0);
    this.playTone(300, 'sawtooth', 0.16, 0.15, 0.08);
  }

  /**
   * System / Room error
   */
  public playError(): void {
    this.playTone(240, 'sawtooth', 0.2, 0.14, 0, 150);
  }
}

export const sound = new SoundManager();

/**
 * Mobile Haptic Vibration wrapper
 */
export function triggerHaptic(pattern: number | number[] = 30): void {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration unsupported error
    }
  }
}
