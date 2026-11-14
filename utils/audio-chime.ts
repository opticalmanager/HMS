/**
 * Web Audio API Clinic Announcement Chime Synthesizer
 *
 * Generates an industrial, high-clarity 2-tone chime (ding-dong: 880Hz A5 -> 587.33Hz D5)
 * natively in the browser with zero external audio assets. Resilient to browser autoplay policies.
 */

class AudioChimeService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a 2-tone melodic chime: Note 1 (880Hz / A5) followed by Note 2 (587.33Hz / D5)
   */
  public playChime(volume: number = 0.5): Promise<void> {
    if (this.isMuted || volume <= 0) return Promise.resolve();

    return new Promise((resolve) => {
      const ctx = this.getContext();
      if (!ctx) {
        resolve();
        return;
      }

      try {
        const safeVolume = Math.min(1, Math.max(0.001, volume));
        const now = ctx.currentTime;

        // Tone 1: High Bell Note (880Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, now); // A5

        gain1.gain.setValueAtTime(0.0001, now);
        gain1.gain.exponentialRampToValueAtTime(Math.max(0.0001, safeVolume * 0.8), now + 0.05);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.6);

        // Tone 2: Lower Bell Note (587.33Hz) after 0.28s delay
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(587.33, now + 0.28); // D5

        gain2.gain.setValueAtTime(0.0001, now + 0.28);
        gain2.gain.exponentialRampToValueAtTime(Math.max(0.0001, safeVolume), now + 0.33);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(now + 0.28);
        osc2.stop(now + 1.25);

        setTimeout(() => {
          resolve();
        }, 1300);
      } catch (err) {
        console.warn("[audio-chime] Audio playback interrupted or disabled by browser:", err);
        resolve();
      }
    });
  }
}

export const audioChime = new AudioChimeService();
