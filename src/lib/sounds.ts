// Studio Sound Manager - Audio Samples + Studio Fallback Synthesizer
class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  // Danh sách các Audio Samples chuẩn Gameshow Studio chất lượng cao
  private sampleUrls = {
    tick: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3", // Tiếng gõ đồng hồ kịch tính
    buzzer: "https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3", // Tiếng chuông bấm giành quyền
    correct: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3", // Fanfare chiến thắng đúng
    wrong: "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3", // Tiếng báo sai nhẹ nhàng
    timeUp: "https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3", // Tiếng còi hết giờ
    reveal: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3", // Tiếng lật mở đáp án
  };

  constructor() {
    // Preload audio samples
    if (typeof window !== "undefined") {
      Object.entries(this.sampleUrls).forEach(([key, url]) => {
        try {
          const audio = new Audio(url);
          audio.preload = "auto";
          audio.volume = 0.6;
          this.audioCache.set(key, audio);
        } catch {
          // Ignored
        }
      });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private playSample(key: keyof typeof this.sampleUrls, fallbackSynth: () => void) {
    if (this.isMuted) return;

    try {
      const cached = this.audioCache.get(key);
      if (cached) {
        const soundClone = cached.cloneNode() as HTMLAudioElement;
        soundClone.volume = key === "tick" ? 0.35 : 0.6;
        soundClone.play().catch(() => {
          fallbackSynth();
        });
        return;
      }
    } catch {
      // Fallback
    }
    fallbackSynth();
  }

  // 1. Đếm ngược (Tick gõ gỗ studio ấm)
  playTick() {
    this.playSample("tick", () => {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2000, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    });
  }

  // 2. Chuông giành quyền bấm chuông (Bell Chime ngân vang)
  playBuzzer() {
    this.playSample("buzzer", () => {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) return;

      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.03);
        osc.stop(ctx.currentTime + 0.6);
      });
    });
  }

  // 3. Đáp án đúng (Fanfare chiến thắng hoành tráng)
  playCorrect() {
    this.playSample("correct", () => {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) return;

      const notes = [
        { f: 523.25, t: 0.0, d: 0.15 },
        { f: 659.25, t: 0.1, d: 0.15 },
        { f: 783.99, t: 0.2, d: 0.2 },
        { f: 1046.5, t: 0.3, d: 0.6 },
      ];

      notes.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, ctx.currentTime + t);

        gain.gain.setValueAtTime(0.2, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + d);
      });
    });
  }

  // 4. Đáp án sai (Nhẹ nhàng thanh lịch)
  playWrong() {
    this.playSample("wrong", () => {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    });
  }

  // 5. Lật mở đáp án (Whoosh Chime)
  playReveal() {
    this.playSample("reveal", () => {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    });
  }

  // 6. Hết giờ (Double Chime)
  playTimeUp() {
    this.playSample("timeUp", () => {
      const ctx = this.getContext();
      if (!ctx || this.isMuted) return;

      [440, 349.23].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);

        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.15);
        osc.stop(ctx.currentTime + idx * 0.15 + 0.35);
      });
    });
  }
}

export const sound = new SoundManager();