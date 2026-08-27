// Olympia Studio Sound Engine - Pure Web Audio API Harmonics Synthesizer
// Khong phu thuoc mang, khong bi tre latency, am thanh vang am chuan truyen hinh

class StudioSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

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

  // 1. Tiếng Đồng Hồ Đếm Ngược (Nhịp Gõ Trầm Ấm Kịch Tính VTV)
  playTick() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Layer 1: High Wood Tick
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, t);
    osc1.frequency.exponentialRampToValueAtTime(300, t + 0.04);
    gain1.gain.setValueAtTime(0.18, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.04);

    // Layer 2: Low Thump Sub
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(140, t);
    osc2.frequency.exponentialRampToValueAtTime(60, t + 0.06);
    gain2.gain.setValueAtTime(0.2, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t);
    osc2.stop(t + 0.06);
  }

  // 2. Tiếng Chuông Bấm Giành Quyền (Tubular Bell Chime Ngân Vang)
  playBuzzer() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const frequencies = [587.33, 880, 1174.66, 1760]; // D5 Major Harmonics
    const weights = [0.3, 0.2, 0.12, 0.08];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(weights[i], t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 1.2);
    });
  }

  // 3. Tiếng Đáp Án Đúng (Chiến Thắng Hoành Tráng C Major Fanfare)
  playCorrect() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    // Arpeggio: C5 -> E5 -> G5 -> C6
    const melody = [
      { note: 523.25, time: 0.0, dur: 0.12, vol: 0.2 },
      { note: 659.25, time: 0.08, dur: 0.12, vol: 0.22 },
      { note: 783.99, time: 0.16, dur: 0.15, vol: 0.25 },
      { note: 1046.5, time: 0.24, dur: 0.9, vol: 0.35 },
      { note: 1318.51, time: 0.26, dur: 0.9, vol: 0.2 },
    ];

    melody.forEach(({ note, time, dur, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(note, t + time);

      gain.gain.setValueAtTime(vol, t + time);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + time);
      osc.stop(t + time + dur);
    });
  }

  // 4. Tiếng Đáp Án Sai (Êm Dịu, Không Chói Tai)
  playWrong() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const chords = [
      { note: 220, time: 0.0, dur: 0.25 },
      { note: 174.61, time: 0.12, dur: 0.4 },
    ];

    chords.forEach(({ note, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(note, t + time);
      osc.frequency.exponentialRampToValueAtTime(note * 0.9, t + time + dur);

      gain.gain.setValueAtTime(0.18, t + time);
      gain.gain.exponentialRampToValueAtTime(0.001, t + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + time);
      osc.stop(t + time + dur);
    });
  }

  // 5. Tiếng Lật Mở Đáp Án (Whoosh Shimmer)
  playReveal() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(1100, t + 0.2);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // 6. Tiếng Hết Giờ (Double Gong Dứt Khoát)
  playTimeUp() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const gongs = [
      { note: 330, time: 0.0, dur: 0.4 },
      { note: 220, time: 0.18, dur: 0.7 },
    ];

    gongs.forEach(({ note, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(note, t + time);

      gain.gain.setValueAtTime(0.25, t + time);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t + time);
      osc.stop(t + time + dur);
    });
  }
}

export const sound = new StudioSoundEngine();