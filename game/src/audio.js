// Nightvault — synthesized sound effects. No audio files: every sound is a
// WebAudio oscillator/noise burst built at runtime. One job: play named cues.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.alarmTimer = 0;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch (e) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Short oscillator blip: freq slides from f0 to f1 over `dur` seconds.
  blip(f0, f1, dur, type, gain) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(gain || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // Filtered noise burst (smoke hiss, footsteps).
  noise(dur, freq, gain) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq || 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.ctx.destination);
    src.start(t);
  }

  pickup() { this.blip(880, 1320, 0.12, 'sine', 0.14); }
  coin() { this.blip(2400, 1800, 0.09, 'triangle', 0.12); this.blip(3000, 2400, 0.07, 'sine', 0.08); }
  smoke() { this.noise(0.5, 900, 0.2); }
  emp() { this.blip(1600, 120, 0.35, 'sawtooth', 0.1); }
  door() { this.blip(220, 330, 0.15, 'triangle', 0.1); }
  spotted() { this.blip(520, 780, 0.18, 'square', 0.08); }
  caught() {
    this.blip(392, 392, 0.16, 'square', 0.12);
    setTimeout(() => this.blip(311, 311, 0.2, 'square', 0.12), 170);
    setTimeout(() => this.blip(233, 180, 0.4, 'square', 0.12), 360);
  }
  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => this.blip(n, n, 0.22, 'triangle', 0.13), i * 130));
  }
  click() { this.blip(600, 500, 0.05, 'square', 0.06); }
  buy() { this.blip(700, 1050, 0.1, 'sine', 0.12); }
  denied() { this.blip(200, 140, 0.15, 'square', 0.09); }

  // Called every frame while playing: two-beat alarm while the meter is high.
  updateAlarm(dt, alarm) {
    if (!this.ctx || this.muted) return;
    if (alarm > 55) {
      this.alarmTimer -= dt;
      if (this.alarmTimer <= 0) {
        this.alarmTimer = alarm > 85 ? 0.45 : 0.8;
        this.blip(980, 980, 0.09, 'square', 0.05);
      }
    } else {
      this.alarmTimer = 0;
    }
  }
}
