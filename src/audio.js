// src/audio.js
class SoundManager {
  constructor() {
    this.ctx = null;
    this.music = null;
    this._musicOn = false;
    this._musicTimer = null;
  }

  // Must be called after a user click/key event to unlock browser audio
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Browsers create the context suspended; a gesture alone is not enough.
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  playTone(freqStart, freqEnd, type, duration, vol = 0.15) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type; // 'sine', 'triangle', 'square', 'sawtooth'
    osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, freqEnd),
      this.ctx.currentTime + duration,
    );

    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.ctx.currentTime + duration,
    );

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // --- Sound Effects ---
  dash() {
    this.playTone(180, 520, "triangle", 0.25, 0.2);
  }

  gemPickup() {
    this.playTone(587, 880, "sine", 0.18, 0.25);
  }

  laserShot() {
    this.playTone(1200, 120, "sawtooth", 0.12, 0.15);
  }

  catHurt() {
    this.playTone(160, 60, "square", 0.22, 0.2);
  }

  playerHit() {
    this.playTone(220, 40, "sawtooth", 0.35, 0.3);
  }

  step() {
    const baseFreq = 95 + Math.random() * 25;
    this.playTone(baseFreq, 40, 'triangle', 0.05, 0.04);
  }

  // --- Background Music ---
  // Tries public/audio/theme.mp3; if that file is missing, loops a soft synth theme.
  playMusic(src) {
    this.init();
    if (this._musicOn) return;
    this._musicOn = true;

    const url = src || `${import.meta.env.BASE_URL}audio/theme.mp3`;
    if (!this.music) {
      this.music = new Audio(url);
      this.music.loop = true;
      this.music.volume = 0.3;
    }
    this.music.play().then(() => this._stopSynth()).catch(() => {
      this.music = null;
      this._startSynth();
    });
  }

  pauseMusic() {
    this._musicOn = false;
    if (this.music) this.music.pause();
    this._stopSynth();
  }

  resumeMusic() {
    this.init();
    this._musicOn = true;
    if (this.music) this.music.play().catch(() => this._startSynth());
    else this._startSynth();
  }

  _startSynth() {
    if (this._musicTimer || !this.ctx) return;
    const melody = [220, 261.63, 293.66, 261.63, 329.63, 293.66, 246.94, 196];
    let step = 0;
    const beat = 0.42;
    const tick = () => {
      if (!this._musicOn || !this.ctx) return;
      const freq = melody[step % melody.length];
      this.playTone(freq, freq * 0.97, 'triangle', beat * 0.9, 0.07);
      if (step % 4 === 0) this.playTone(110, 110, 'sine', beat * 3.6, 0.04);
      step++;
      this._musicTimer = setTimeout(tick, beat * 1000);
    };
    tick();
  }

  _stopSynth() {
    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }
  }
}

export const audio = new SoundManager();
