import { describe, expect, it } from "vitest";
import { AtcVoiceService } from "@/lib/services/voice-service";

describe("AtcVoiceService & VHF Radio Communications", () => {
  it("translates aviation callsigns to standard ICAO NATO phonetic pronunciation", () => {
    const service = new AtcVoiceService();
    const phonetic = service.toPhonetic("SC101");
    expect(phonetic).toBe("Sierra Charlie One Zero One");

    const runwayPhonetic = service.toPhonetic("09L");
    expect(runwayPhonetic).toBe("Zero Niner Lima");
  });

  it("generates authentic ICAO pilot readbacks for takeoff clearances", () => {
    const service = new AtcVoiceService();
    const clearance = "SkyConnect 101, wind 090 at 8 knots, runway 09 Left, cleared for takeoff.";
    const readback = service.generatePilotReadback("SC101", clearance);

    expect(readback).toContain("Cleared for takeoff");
    expect(readback).toContain("09");
    expect(readback).toContain("SC101");
  });

  it("generates authentic pilot readbacks for pushback approvals", () => {
    const service = new AtcVoiceService();
    const clearance = "AeroVista 245, pushback and engine start approved, face west, QNH 1013.";
    const readback = service.generatePilotReadback("AV245", clearance);

    expect(readback).toContain("Pushback and engine start approved");
    expect(readback).toContain("west");
    expect(readback).toContain("AV245");
  });

  it("generates authentic pilot readbacks for landing clearances", () => {
    const service = new AtcVoiceService();
    const clearance = "Blue Horizon 310, cleared to land runway 09 Left.";
    const readback = service.generatePilotReadback("BH310", clearance);

    expect(readback).toContain("Cleared to land");
    expect(readback).toContain("BH310");
  });

  it("toggles audio active state and persists preference cleanly", () => {
    const service = new AtcVoiceService();
    const initial = service.isAudioActive();
    const toggled = service.toggleAudio();
    expect(toggled).toBe(!initial);

    // Toggle back
    const restored = service.toggleAudio();
    expect(restored).toBe(initial);
  });
});
