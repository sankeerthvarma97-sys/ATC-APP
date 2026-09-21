// AOCC Aviation Voice & VHF Radio Synthesizer
// Utilizes Web Speech API and Web Audio API for authentic ATC radio clearances

const NATO_PHONETIC: Record<string, string> = {
  A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot",
  G: "Golf", H: "Hotel", I: "India", J: "Juliet", K: "Kilo", L: "Lima",
  M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo",
  S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey", X: "X-ray",
  Y: "Yankee", Z: "Zulu",
  "0": "Zero", "1": "One", "2": "Two", "3": "Three", "4": "Four",
  "5": "Five", "6": "Six", "7": "Seven", "8": "Eight", "9": "Niner",
};

class AtcVoiceService {
  private isEnabled = true;
  private audioCtx: AudioContext | null = null;
  private listeners: Set<(enabled: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("aocc_atc_audio_enabled");
      if (stored !== null) {
        this.isEnabled = stored === "true";
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Generates an authentic VHF radio mic click / squelch burst (50ms bandpassed noise)
   */
  private playRadioSquelch(durationMs = 45, volume = 0.08) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const bufferSize = Math.floor(ctx.sampleRate * (durationMs / 1000));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to simulate 1.2 kHz - 2.8 kHz VHF radio bandwidth
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1800;
      filter.Q.value = 2.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch {
      // Audio context restricted by browser autoplay policy until user gesture
    }
  }

  public toggleAudio(force?: boolean): boolean {
    this.isEnabled = force !== undefined ? force : !this.isEnabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("aocc_atc_audio_enabled", String(this.isEnabled));
    }
    this.listeners.forEach((cb) => cb(this.isEnabled));
    return this.isEnabled;
  }

  public isAudioActive(): boolean {
    return this.isEnabled;
  }

  public subscribe(cb: (enabled: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Formats an aviation callsign into NATO phonetic pronunciation (e.g. SC101 -> Sierra Charlie One Zero One)
   */
  public toPhonetic(code: string): string {
    return code
      .toUpperCase()
      .split("")
      .map((char) => NATO_PHONETIC[char] || char)
      .join(" ");
  }

  /**
   * Speaks an authoritative ATC clearance or advisory with VHF squelch audio
   */
  public speakClearance(text: string, options: { isEmergency?: boolean; rate?: number } = {}) {
    if (!this.isEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    try {
      // Squelch click before transmission
      this.playRadioSquelch(55, options.isEmergency ? 0.15 : 0.08);

      window.speechSynthesis.cancel(); // Cancel any prior queue for immediate clearance delivery

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? (options.isEmergency ? 1.15 : 1.05);
      utterance.pitch = options.isEmergency ? 1.2 : 0.95;

      // Select natural English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") || v.name.includes("David") || v.name.includes("Google") || v.name.includes("Daniel"))
      ) || voices.find((v) => v.lang.startsWith("en"));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        // Trailing squelch click after transmission release
        setTimeout(() => this.playRadioSquelch(35, 0.05), 50);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      // Non-blocking fallback
    }
  }
}

export const atcVoice = new AtcVoiceService();
