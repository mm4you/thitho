// Olympia Studio Sound Engine - HQ Broadcast Audio Samples
// Phat truc tiep cac file audio studio chuan TV tu /sounds/

class StudioSoundEngine {
  private isMuted: boolean = false;
  private audioCache: Record<string, HTMLAudioElement> = {};

  constructor() {
    if (typeof window !== "undefined") {
      this.preload();
    }
  }

  private preload() {
    const soundFiles = [
      { key: "tick", path: "/sounds/tick.mp3" },
      { key: "buzzer", path: "/sounds/buzzer.mp3" },
      { key: "correct", path: "/sounds/correct.mp3" },
      { key: "wrong", path: "/sounds/wrong.mp3" },
      { key: "timeup", path: "/sounds/timeup.mp3" },
      { key: "reveal", path: "/sounds/reveal.mp3" },
    ];

    soundFiles.forEach(({ key, path }) => {
      const audio = new Audio(path);
      audio.preload = "auto";
      this.audioCache[key] = audio;
    });
  }

  private playSample(key: string, volume = 0.8) {
    if (this.isMuted) return;
    if (typeof window === "undefined") return;

    try {
      let audio = this.audioCache[key];
      if (!audio) {
        audio = new Audio(`/sounds/${key}.mp3`);
        this.audioCache[key] = audio;
      }
      audio.currentTime = 0;
      audio.volume = volume;
      audio.play().catch(() => {
        // Trinh duyet chan autoplay
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

  // 1. Tiếng Đồng Hồ Đếm Ngược (Mechanical Studio Clock Tick)
  playTick() {
    this.playSample("tick", 0.6);
  }

  // 2. Tiếng Chuông Bấm Giành Quyền (Game Show Buzzer Bell)
  playBuzzer() {
    this.playSample("buzzer", 0.9);
  }

  // 3. Tiếng Đáp Án Đúng (Win Fanfare)
  playCorrect() {
    this.playSample("correct", 0.85);
  }

  // 4. Tiếng Đáp Án Sai (Game Show Wrong Buzz)
  playWrong() {
    this.playSample("wrong", 0.7);
  }

  // 5. Tiếng Lật Mở Đáp Án (Sparkle Reveal)
  playReveal() {
    this.playSample("reveal", 0.7);
  }

  // 6. Tiếng Hết Giờ (Time's Up Gong)
  playTimeUp() {
    this.playSample("timeup", 0.85);
  }
}

export const sound = new StudioSoundEngine();