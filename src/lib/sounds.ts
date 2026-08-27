// Olympia Studio Sound Engine - Multi-channel High Fidelity Broadcast Audio
// He thong am thanh Gameshow chuyen nghiep: Da luong am thanh (Polyphonic), chong ngat tieng

class StudioSoundEngine {
  private isMuted: boolean = false;
  private audioPool: Record<string, HTMLAudioElement[]> = {};
  private poolSize: number = 3;

  constructor() {
    if (typeof window !== "undefined") {
      this.initPool();
    }
  }

  private initPool() {
    const soundKeys = ["tick", "buzzer", "correct", "wrong", "timeup", "reveal"];
    soundKeys.forEach((key) => {
      this.audioPool[key] = [];
      for (let i = 0; i < this.poolSize; i++) {
        const audio = new Audio(`/sounds/${key}.mp3`);
        audio.preload = "auto";
        this.audioPool[key].push(audio);
      }
    });
  }

  private playFromPool(key: string, volume = 0.85) {
    if (this.isMuted) return;
    if (typeof window === "undefined") return;

    try {
      if (!this.audioPool[key] || this.audioPool[key].length === 0) {
        this.initPool();
      }

      const pool = this.audioPool[key];
      if (!pool) return;

      // Tim 1 audio slot dang ranh hoac da ket thuc
      let audio = pool.find((a) => a.paused || a.ended);
      if (!audio) {
        audio = pool[0];
      }

      audio.currentTime = 0;
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.play().catch(() => {
        // Trinh duyet chan autoplay neu chua co tuong tac nguoi dung
      });
    } catch {
      // Fallback
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // 1. Tiếng Đồng Hồ Đếm Ngược Kịch Tính (Tension Tick)
  playTick() {
    this.playFromPool("tick", 0.7);
  }

  // 2. Tiếng Chuông Bấm Giành Quyền Đanh Thép (Sharp Buzzer Chime)
  playBuzzer() {
    this.playFromPool("buzzer", 1.0);
  }

  // 3. Tiếng Đáp Án Đúng Hoành Tráng (Win Fanfare)
  playCorrect() {
    this.playFromPool("correct", 0.95);
  }

  // 4. Tiếng Báo Sai Dứt Khoát (Wrong Buzz)
  playWrong() {
    this.playFromPool("wrong", 0.8);
  }

  // 5. Tiếng Lật Mở Thẻ Đáp Án (Whoosh Sparkle)
  playReveal() {
    this.playFromPool("reveal", 0.85);
  }

  // 6. Tiếng Hết Giờ (Dramatic Time's Up Gong)
  playTimeUp() {
    this.playFromPool("timeup", 1.0);
  }
}

export const sound = new StudioSoundEngine();