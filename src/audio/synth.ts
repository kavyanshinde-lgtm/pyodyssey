type Ctx = AudioContext;

class AudioEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private noiseBuffer: AudioBuffer | null = null;
  private lastClick = 0;

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.72, this.ctx.currentTime, 0.02);
    }
  }

  isMuted() {
    return this.muted;
  }

  unlock() {
    this.ensure();
  }

  private ensure(): Ctx | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return null;
      this.ctx = new AudioCtor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.72;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoise(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private makeNoise(ctx: Ctx): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private output(): [Ctx, GainNode] | null {
    const ctx = this.ensure();
    if (!ctx || !this.master) return null;
    return [ctx, this.master];
  }

  private tone(
    frequency: number,
    duration: number,
    options: {
      type?: OscillatorType;
      gain?: number;
      delay?: number;
      endFrequency?: number;
      detune?: number;
    } = {},
  ) {
    const output = this.output();
    if (!output) return;
    const [ctx, master] = output;
    const start = ctx.currentTime + (options.delay ?? 0);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = options.type ?? 'square';
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, options.endFrequency),
        start + duration,
      );
    }
    if (options.detune) oscillator.detune.value = options.detune;
    const peak = options.gain ?? 0.08;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(
    duration: number,
    options: { gain?: number; delay?: number; frequency?: number; q?: number; type?: BiquadFilterType } = {},
  ) {
    const output = this.output();
    if (!output || !this.noiseBuffer) return;
    const [ctx, master] = output;
    const start = ctx.currentTime + (options.delay ?? 0);
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = options.type ?? 'bandpass';
    filter.frequency.value = options.frequency ?? 1800;
    filter.Q.value = options.q ?? 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(options.gain ?? 0.08, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration + 0.01);
  }

  key() {
    const now = performance.now();
    if (now - this.lastClick < 22) return;
    this.lastClick = now;
    this.noise(0.035, { gain: 0.035, frequency: 2600 + Math.random() * 900, q: 1.4 });
    this.tone(150 + Math.random() * 30, 0.035, { type: 'triangle', gain: 0.018 });
  }

  backspace() {
    this.noise(0.05, { gain: 0.028, frequency: 900, q: 0.8 });
    this.tone(120, 0.06, { type: 'sine', gain: 0.016, endFrequency: 80 });
  }

  pop() {
    this.tone(660, 0.07, { type: 'sine', gain: 0.06, endFrequency: 980 });
    this.noise(0.04, { gain: 0.025, frequency: 3000 });
  }

  chime() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((note, index) => {
      this.tone(note, 0.16, {
        type: 'triangle',
        gain: 0.07,
        delay: index * 0.045,
      });
      this.tone(note * 2, 0.1, {
        type: 'sine',
        gain: 0.025,
        delay: index * 0.045,
      });
    });
  }

  error() {
    this.noise(0.11, { gain: 0.04, frequency: 380, q: 0.7 });
    this.tone(190, 0.16, { type: 'sawtooth', gain: 0.045, endFrequency: 88 });
    this.tone(140, 0.22, { type: 'square', gain: 0.028, delay: 0.06, endFrequency: 70 });
  }

  warning() {
    this.tone(740, 0.08, { type: 'square', gain: 0.03 });
    this.tone(620, 0.1, { type: 'square', gain: 0.025, delay: 0.09 });
  }

  coin() {
    this.tone(988, 0.08, { type: 'square', gain: 0.05 });
    this.tone(1319, 0.16, { type: 'square', gain: 0.05, delay: 0.06 });
  }

  success() {
    const sequence = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    sequence.forEach((note, index) => {
      this.tone(note, 0.22, {
        type: 'square',
        gain: 0.055,
        delay: index * 0.1,
      });
    });
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((note) => {
      this.tone(note, 0.55, {
        type: 'triangle',
        gain: 0.04,
        delay: 0.62,
      });
    });
    this.noise(0.3, { gain: 0.03, frequency: 5000, q: 0.6 });
  }

  victory() {
    const melody = [523.25, 523.25, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5];
    const rhythm = [0.09, 0.09, 0.09, 0.13, 0.22, 0.1, 0.1, 0.45];
    let offset = 0;
    melody.forEach((note, index) => {
      this.tone(note, rhythm[index] + 0.06, {
        type: 'square',
        gain: 0.06,
        delay: offset,
      });
      this.tone(note / 2, rhythm[index] + 0.04, {
        type: 'triangle',
        gain: 0.035,
        delay: offset,
      });
      offset += rhythm[index];
    });
    [523.25, 659.25, 783.99, 1046.5].forEach((note) => {
      this.tone(note, 0.8, { type: 'triangle', gain: 0.035, delay: offset });
    });
    this.noise(0.6, { gain: 0.04, frequency: 6200, q: 0.5 });
  }

  explosion() {
    this.noise(0.9, { gain: 0.18, frequency: 180, q: 0.4, type: 'lowpass' });
    this.tone(55, 0.9, { type: 'sawtooth', gain: 0.08, endFrequency: 22 });
    this.noise(0.45, { gain: 0.1, frequency: 2400, q: 0.5, delay: 0.1 });
  }

  whoosh() {
    this.noise(0.18, { gain: 0.03, frequency: 900, q: 0.8 });
  }

  levelUp() {
    const notes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((note, index) => {
      this.tone(note, 0.18, { type: 'triangle', gain: 0.06, delay: index * 0.07 });
    });
  }
}

export const audio = new AudioEngine();
