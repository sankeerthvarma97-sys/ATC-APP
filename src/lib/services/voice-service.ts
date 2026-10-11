// AOCC Aviation Voice & VHF Radio Synthesizer
// Utilizes Web Speech API and Web Audio API for authentic ATC radio clearances & pilot readbacks

const NATO_PHONETIC: Record<string, string> = {
  A: "Alpha", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot",
  G: "Golf", H: "Hotel", I: "India", J: "Juliet", K: "Kilo", L: "Lima",
  M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo",
  S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey", X: "X-ray",
  Y: "Yankee", Z: "Zulu",
  "0": "Zero", "1": "One", "2": "Two", "3": "Three", "4": "Four",
  "5": "Five", "6": "Six", "7": "Seven", "8": "Eight", "9": "Niner",
};

export class AtcVoiceService {
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
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  public playRadioSquelch(durationMs = 50, volume = 0.08) {
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

  /**
   * Plays a VHF Roger Beep / Courtesy Tone (2400Hz pulse)
   */
  public playRogerBeep(volume = 0.05) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(2400, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // AudioContext unavailable
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

  public toPhonetic(code: string): string {
    return code
      .toUpperCase()
      .split("")
      .map((char) => NATO_PHONETIC[char] || char)
      .join(" ");
  }

  /**
   * Generates standard ICAO Pilot Readback text for a given ATC clearance
   */
  public generatePilotReadback(callsign: string, clearance: string): string {
    const cleanCallsign = callsign.trim();
    const cl = clearance.toLowerCase();

    if (cl.includes("cleared for takeoff")) {
      const rwyMatch = clearance.match(/runway\s+([0-9]{2}[LRC]?)/i);
      const rwy = rwyMatch ? rwyMatch[1] : "";
      return `Cleared for takeoff runway ${rwy}, ${cleanCallsign}.`;
    }

    if (cl.includes("pushback") && cl.includes("approved")) {
      const faceMatch = clearance.match(/face\s+(west|east|north|south)/i);
      const face = faceMatch ? `facing ${faceMatch[1]}` : "";
      return `Pushback and engine start approved ${face}, ${cleanCallsign}.`;
    }

    if (cl.includes("cleared to land")) {
      const rwyMatch = clearance.match(/runway\s+([0-9]{2}[LRC]?)/i);
      const rwy = rwyMatch ? rwyMatch[1] : "";
      return `Cleared to land runway ${rwy}, ${cleanCallsign}.`;
    }

    if (cl.includes("taxi")) {
      return `Taxi via Echo to holding point, ${cleanCallsign}.`;
    }

    if (cl.includes("squawk")) {
      const sqMatch = clearance.match(/squawk\s+([0-9]{4})/i);
      return `Squawk ${sqMatch ? sqMatch[1] : "assigned"}, ${cleanCallsign}.`;
    }

    if (cl.includes("descend") || cl.includes("maintain")) {
      return `Leaving flight level, descending as instructed, ${cleanCallsign}.`;
    }

    return `Wilco, ${cleanCallsign}.`;
  }

  /**
   * Speaks an authoritative ATC clearance or advisory with VHF squelch audio
   */
  public speakClearance(
    text: string,
    options: {
      isEmergency?: boolean;
      rate?: number;
      callsign?: string;
      withReadback?: boolean;
      onEnd?: () => void;
    } = {},
  ) {
    if (!this.isEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      options.onEnd?.();
      return;
    }

    try {
      this.playRadioSquelch(55, options.isEmergency ? 0.15 : 0.08);
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? (options.isEmergency ? 1.15 : 1.05);
      utterance.pitch = options.isEmergency ? 1.2 : 0.95;

      const voices = window.speechSynthesis.getVoices();
      const controllerVoice =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("David") || v.name.includes("Natural") || v.name.includes("Google US English")),
        ) || voices.find((v) => v.lang.startsWith("en"));

      if (controllerVoice) {
        utterance.voice = controllerVoice;
      }

      utterance.onend = () => {
        this.playRadioSquelch(35, 0.05);
        this.playRogerBeep(0.04);
        options.onEnd?.();

        // Optional automated pilot readback
        if (options.withReadback && options.callsign) {
          const readbackText = this.generatePilotReadback(options.callsign, text);
          setTimeout(() => {
            this.speakPilotReadback(readbackText);
          }, 850);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      options.onEnd?.();
    }
  }

  /**
   * Speaks an authentic pilot readback transmission with distinct cockpit mic characteristics
   */
  public speakPilotReadback(text: string, onEnd?: () => void) {
    if (!this.isEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }

    try {
      this.playRadioSquelch(45, 0.07);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.08;
      utterance.pitch = 1.08; // Higher/distinct pilot cockpit acoustic pitch

      const voices = window.speechSynthesis.getVoices();
      const pilotVoice =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Zira") || v.name.includes("Samantha") || v.name.includes("Google UK English")),
        ) || voices[0];

      if (pilotVoice) {
        utterance.voice = pilotVoice;
      }

      utterance.onend = () => {
        this.playRadioSquelch(30, 0.04);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      onEnd?.();
    }
  }
}

export const atcVoice = new AtcVoiceService();
