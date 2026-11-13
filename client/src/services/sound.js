// High-fidelity Web Audio API sound generator for realistic calling tones
// Zero external files, zero latency, runs offline and in all modern browsers

class SoundService {
  constructor() {
    this.audioCtx = null;
    this.activeOscillators = [];
    this.ringInterval = null;
    this.isMuted = false;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play outgoing ringing tone (US/International standard 440Hz + 480Hz modulated)
  playOutgoingRing() {
    this.stopAll();
    const ctx = this.getAudioContext();

    const playTone = () => {
      if (!this.ringInterval) return;
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime + 1.8);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 2.0);
        osc2.stop(ctx.currentTime + 2.0);
      } catch (e) {
        console.warn('Audio tone error:', e);
      }
    };

    // Immediate first tone
    this.ringInterval = true;
    playTone();
    // Repeat every 4 seconds (standard ring cadence: 2s on, 2s off)
    this.ringTimer = setInterval(playTone, 4000);
  }

  // Play incoming ringtone (melodic modern chime pattern)
  playIncomingRingtone() {
    this.stopAll();
    const ctx = this.getAudioContext();

    const notes = [
      { freq: 523.25, time: 0, dur: 0.2 },      // C5
      { freq: 659.25, time: 0.25, dur: 0.2 },   // E5
      { freq: 783.99, time: 0.5, dur: 0.2 },    // G5
      { freq: 1046.50, time: 0.75, dur: 0.4 },  // C6
      { freq: 783.99, time: 1.3, dur: 0.2 },    // G5
      { freq: 1046.50, time: 1.55, dur: 0.5 }   // C6
    ];

    const playChime = () => {
      if (!this.ringInterval) return;
      try {
        const now = ctx.currentTime;
        notes.forEach(({ freq, time, dur }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          gain.gain.setValueAtTime(0, now + time);
          gain.gain.linearRampToValueAtTime(0.12, now + time + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + dur);
        });
      } catch (e) {
        console.warn('Ringtone error:', e);
      }
    };

    this.ringInterval = true;
    playChime();
    this.ringTimer = setInterval(playChime, 2800);
  }

  // Connected chime (ascending double-tap)
  playConnectedChime() {
    this.stopAll();
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      [587.33, 880.00].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.3);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // End call chime (descending)
  playEndedChime() {
    this.stopAll();
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      [440, 330].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.15);

        gain.gain.setValueAtTime(0, now + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.15 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.25);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  // Stop any active ringing
  stopAll() {
    if (this.ringTimer) {
      clearInterval(this.ringTimer);
      this.ringTimer = null;
    }
    this.ringInterval = null;
  }
}

export const sound = new SoundService();
