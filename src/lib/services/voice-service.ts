// AOCC Aviation Radio Text Dispatch & ICAO Phonetic Service
// Audio and microphone synthesizers decommissioned per Phase 7 Security & Audio Removal Mandate.

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
  private isEnabled = false;
  private listeners: Set<(enabled: boolean) => void> = new Set();

  public toggleAudio(): boolean {
    return false;
  }

  public isAudioActive(): boolean {
    return false;
  }

  public subscribe(_cb: (enabled: boolean) => void): () => void {
    return () => {};
  }

  public playRadioSquelch(_durationMs = 50, _volume = 0.08): void {
    // Audio permanently decommissioned
  }

  public playRogerBeep(_volume = 0.05): void {
    // Audio permanently decommissioned
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

  public speakClearance(
    _text: string,
    options: {
      isEmergency?: boolean;
      rate?: number;
      callsign?: string;
      withReadback?: boolean;
      onEnd?: () => void;
    } = {},
  ): void {
    options.onEnd?.();
  }

  public speakPilotReadback(_text: string, onEnd?: () => void): void {
    onEnd?.();
  }
}

export const atcVoice = new AtcVoiceService();
