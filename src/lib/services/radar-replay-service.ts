import { calculateDistanceNm } from "@/lib/simulation/logic";

export interface TrajectoryBreadcrumb {
  secondOffset: number; // 0 to scenario duration
  timestampZulu: string;
  latitude: number;
  longitude: number;
  altitudeFt: number;
  speedKt: number;
  headingDeg: number;
  verticalSpeedFpm: number;
  pitchDeg: number;
  rollDeg: number;
  n1Percent: number;
  fuelFlowKgh: number;
  phase: string;
  atcClearance?: string;
  tcasState: "NORMAL" | "TRAFFIC_ADVISORY" | "RESOLUTION_ADVISORY";
}

export interface ReplayAircraftTrack {
  id: string;
  callsign: string;
  aircraftType: string;
  airline: string;
  squawk: string;
  route: string;
  track: TrajectoryBreadcrumb[];
}

export interface ReplayIncidentScenario {
  id: string;
  title: string;
  description: string;
  category: "TCAS_RA_CONFLICT" | "CONTINUOUS_DESCENT" | "HOLDING_PATTERN" | "GO_AROUND_MISSED_APPROACH";
  severity: "CRITICAL" | "WARNING" | "ROUTINE";
  durationSeconds: number;
  airportCode: string;
  cpaDistanceNm?: number;
  cpaAltitudeFt?: number;
  aircraft: ReplayAircraftTrack[];
  investigationNotes: string[];
}

export interface IncidentInvestigationReport {
  scenarioId: string;
  scenarioTitle: string;
  generatedAt: string;
  investigationRef: string;
  severity: string;
  aircraftInvolved: {
    callsign: string;
    aircraftType: string;
    airline: string;
    initialAltFt: number;
    finalAltFt: number;
  }[];
  closestPointOfApproach: {
    horizontalSeparationNm: number;
    verticalSeparationFt: number;
    timestampZulu: string;
    icaoStandardMet: boolean;
  };
  safetyFindings: string[];
  recommendations: string[];
}

// Generate realistic 4D Trajectory for Scenario 1: TCAS RA Converging Incident
function generateTcasRaTracks(): ReplayAircraftTrack[] {
  const duration = 900; // 15 mins (900 seconds)
  const aicTrack: TrajectoryBreadcrumb[] = [];
  const vtiTrack: TrajectoryBreadcrumb[] = [];

  const baseZulu = new Date("2026-10-11T12:00:00Z").getTime();

  for (let s = 0; s <= duration; s += 10) {
    const timeStr = new Date(baseZulu + s * 1000).toISOString().slice(11, 19) + "Z";
    const prog = s / duration;

    // Aircraft A: Air India 101 (B787-8) from East heading West 270° at FL050
    // At s=420: STCA Traffic Advisory (TA)
    // At s=540: TCAS RA "CLIMB, CLIMB NOW"
    let aicAlt = 5000;
    let aicVs = 0;
    let aicPitch = 2.5;
    let aicTcas: TrajectoryBreadcrumb["tcasState"] = "NORMAL";
    let aicPhase = "Level flight FL050";
    let aicClearance = "AIC101 maintain 5000 feet, heading 270";

    if (s >= 420 && s < 540) {
      aicTcas = "TRAFFIC_ADVISORY";
      aicPhase = "STCA alert: traffic 12 o'clock 4 NM";
    } else if (s >= 540 && s < 700) {
      aicTcas = "RESOLUTION_ADVISORY";
      aicVs = 2200;
      aicPitch = 13.5;
      const climbTime = (s - 540) / 160;
      aicAlt = Math.round(5000 + climbTime * 1800);
      aicPhase = "TCAS RA: CLIMB commanded";
      aicClearance = "AIC101 TCAS climb authorized, climb FL070";
    } else if (s >= 700) {
      aicAlt = 6800;
      aicVs = 0;
      aicPitch = 3.0;
      aicPhase = "Level at FL070, conflict resolved";
      aicClearance = "AIC101 clear of conflict, resume own navigation";
    }

    const aicLat = 17.240 + (0.5 - prog) * 0.35;
    const aicLon = 78.750 - prog * 0.50;

    aicTrack.push({
      secondOffset: s,
      timestampZulu: timeStr,
      latitude: Number(aicLat.toFixed(5)),
      longitude: Number(aicLon.toFixed(5)),
      altitudeFt: aicAlt,
      speedKt: 250,
      headingDeg: 270,
      verticalSpeedFpm: aicVs,
      pitchDeg: Number(aicPitch.toFixed(1)),
      rollDeg: 0,
      n1Percent: aicVs > 0 ? 91 : 68,
      fuelFlowKgh: aicVs > 0 ? 3200 : 2100,
      phase: aicPhase,
      atcClearance: aicClearance,
      tcasState: aicTcas,
    });

    // Aircraft B: Vistara 814 (A320neo) from South heading North 360° at FL050
    // At s=540: TCAS RA "DESCEND, DESCEND NOW"
    let vtiAlt = 5000;
    let vtiVs = 0;
    let vtiPitch = 2.0;
    let vtiTcas: TrajectoryBreadcrumb["tcasState"] = "NORMAL";
    let vtiPhase = "Level flight FL050";
    let vtiClearance = "VTI814 maintain 5000 feet, heading 360";

    if (s >= 420 && s < 540) {
      vtiTcas = "TRAFFIC_ADVISORY";
      vtiPhase = "STCA alert: traffic 2 o'clock 4 NM";
    } else if (s >= 540 && s < 700) {
      vtiTcas = "RESOLUTION_ADVISORY";
      vtiVs = -1800;
      vtiPitch = -7.5;
      const descTime = (s - 540) / 160;
      vtiAlt = Math.round(5000 - descTime * 1600);
      vtiPhase = "TCAS RA: DESCEND commanded";
      vtiClearance = "VTI814 TCAS descend authorized, descend 3400ft";
    } else if (s >= 700) {
      vtiAlt = 3400;
      vtiVs = 0;
      vtiPitch = 2.0;
      vtiPhase = "Level at 3400ft, conflict resolved";
      vtiClearance = "VTI814 clear of conflict, turn right heading 040";
    }

    const vtiLat = 17.000 + prog * 0.45;
    const vtiLon = 78.500 + (prog - 0.5) * 0.05;

    vtiTrack.push({
      secondOffset: s,
      timestampZulu: timeStr,
      latitude: Number(vtiLat.toFixed(5)),
      longitude: Number(vtiLon.toFixed(5)),
      altitudeFt: vtiAlt,
      speedKt: 240,
      headingDeg: s > 700 ? 40 : 360,
      verticalSpeedFpm: vtiVs,
      pitchDeg: Number(vtiPitch.toFixed(1)),
      rollDeg: s > 700 ? 18 : 0,
      n1Percent: vtiVs < 0 ? 52 : 65,
      fuelFlowKgh: vtiVs < 0 ? 1100 : 1600,
      phase: vtiPhase,
      atcClearance: vtiClearance,
      tcasState: vtiTcas,
    });
  }

  return [
    {
      id: "trk-aic101",
      callsign: "AIC101",
      aircraftType: "Boeing 787-8",
      airline: "Air India",
      squawk: "4211",
      route: "DEL -> HYD",
      track: aicTrack,
    },
    {
      id: "trk-vti814",
      callsign: "VTI814",
      aircraftType: "Airbus A320neo",
      airline: "Vistara",
      squawk: "4212",
      route: "BOM -> HYD",
      track: vtiTrack,
    },
  ];
}

// Generate Scenario 2: Continuous Descent & ILS Intercept
function generateCdaApproachTrack(): ReplayAircraftTrack[] {
  const duration = 900;
  const track: TrajectoryBreadcrumb[] = [];
  const baseZulu = new Date("2026-10-11T13:00:00Z").getTime();

  for (let s = 0; s <= duration; s += 10) {
    const timeStr = new Date(baseZulu + s * 1000).toISOString().slice(11, 19) + "Z";
    const prog = s / duration;

    // Descent from FL180 to 2024ft runway elevation
    const alt = Math.round(18000 - prog * 15500);
    const spd = Math.round(290 - prog * 145); // Decelerating from 290 to 145 KIAS
    const vs = -1200;
    const pitch = -2.5;

    let phase = "Continuous Descent (CDA)";
    let clearance = "VTI814 cleared CDA approach runway 09L";
    if (s > 600) {
      phase = "ILS Localizer & Glideslope Established";
      clearance = "VTI814 cleared ILS 09L, wind 090/08, cleared to land";
    }

    const lat = 17.240 + (prog - 0.5) * 0.05;
    const lon = 78.100 + prog * 0.32;

    track.push({
      secondOffset: s,
      timestampZulu: timeStr,
      latitude: Number(lat.toFixed(5)),
      longitude: Number(lon.toFixed(5)),
      altitudeFt: Math.max(2050, alt),
      speedKt: Math.max(145, spd),
      headingDeg: 93,
      verticalSpeedFpm: vs,
      pitchDeg: pitch,
      rollDeg: 0,
      n1Percent: 58,
      fuelFlowKgh: 1250,
      phase,
      atcClearance: clearance,
      tcasState: "NORMAL",
    });
  }

  return [
    {
      id: "trk-vti-cda",
      callsign: "VTI814",
      aircraftType: "Airbus A320neo",
      airline: "Vistara",
      squawk: "4214",
      route: "BOM -> HYD",
      track,
    },
  ];
}

// Generate Scenario 3: Monsoon Weather Holding Orbit
function generateHoldingPatternTrack(): ReplayAircraftTrack[] {
  const duration = 900;
  const track: TrajectoryBreadcrumb[] = [];
  const baseZulu = new Date("2026-10-11T14:00:00Z").getTime();

  for (let s = 0; s <= duration; s += 10) {
    const timeStr = new Date(baseZulu + s * 1000).toISOString().slice(11, 19) + "Z";
    // 4-minute holding pattern racetrack loop (240 seconds per orbit)
    const orbitAngle = ((s % 240) / 240) * Math.PI * 2;
    const lat = 17.400 + Math.sin(orbitAngle) * 0.08;
    const lon = 78.600 + Math.cos(orbitAngle) * 0.12;
    const hdg = Math.round(((orbitAngle * 180) / Math.PI + 90) % 360);

    track.push({
      secondOffset: s,
      timestampZulu: timeStr,
      latitude: Number(lat.toFixed(5)),
      longitude: Number(lon.toFixed(5)),
      altitudeFt: 12000,
      speedKt: 220,
      headingDeg: hdg,
      verticalSpeedFpm: 0,
      pitchDeg: 2.0,
      rollDeg: 25,
      n1Percent: 68,
      fuelFlowKgh: 1650,
      phase: `Holding at BOPOL orbit cycle ${Math.floor(s / 240) + 1}`,
      atcClearance: "SEJ303 hold at BOPOL FL120, right turns, expect release at 14:20Z",
      tcasState: "NORMAL",
    });
  }

  return [
    {
      id: "trk-sej-hold",
      callsign: "SEJ303",
      aircraftType: "Boeing 737-800",
      airline: "SpiceJet",
      squawk: "4215",
      route: "DEL -> HYD",
      track,
    },
  ];
}

// Generate Scenario 4: TOGA Missed Approach Go-Around
function generateGoAroundTrack(): ReplayAircraftTrack[] {
  const duration = 600;
  const track: TrajectoryBreadcrumb[] = [];
  const baseZulu = new Date("2026-10-11T15:00:00Z").getTime();

  for (let s = 0; s <= duration; s += 10) {
    const timeStr = new Date(baseZulu + s * 1000).toISOString().slice(11, 19) + "Z";

    let alt = 2500;
    let vs = -750;
    let pitch = 1.0;
    let n1 = 60;
    let spd = 150;
    let phase = "Short final runway 09L";
    let clearance = "UAE545 cleared to land runway 09L";

    if (s >= 180 && s < 360) {
      // Windshear alert! Go-Around TOGA
      phase = "WINDSHEAR ALERT: TOGA Go-Around Initiated";
      clearance = "UAE545 GO AROUND, climb straight ahead 4000ft";
      const climbTime = (s - 180) / 180;
      alt = Math.round(550 + climbTime * 3450);
      vs = 2500;
      pitch = 15.0;
      n1 = 98;
      spd = 185;
    } else if (s >= 360) {
      phase = "Missed approach published turn, leveling 4000ft";
      clearance = "UAE545 turn right heading 180, climb 4000, contact radar 124.95";
      alt = 4000;
      vs = 0;
      pitch = 3.5;
      n1 = 70;
      spd = 210;
    } else {
      alt = Math.round(2500 - (s / 180) * 1950);
    }

    const prog = s / duration;
    const lat = 17.240 + (s >= 360 ? (s - 360) * -0.0002 : 0);
    const lon = 78.350 + prog * 0.25;

    track.push({
      secondOffset: s,
      timestampZulu: timeStr,
      latitude: Number(lat.toFixed(5)),
      longitude: Number(lon.toFixed(5)),
      altitudeFt: Math.max(550, alt),
      speedKt: spd,
      headingDeg: s >= 360 ? 180 : 93,
      verticalSpeedFpm: vs,
      pitchDeg: pitch,
      rollDeg: s >= 360 ? 20 : 0,
      n1Percent: n1,
      fuelFlowKgh: n1 > 90 ? 4800 : 1900,
      phase,
      atcClearance: clearance,
      tcasState: "NORMAL",
    });
  }

  return [
    {
      id: "trk-uae-ga",
      callsign: "UAE545",
      aircraftType: "Boeing 777-300ER",
      airline: "Emirates",
      squawk: "7701",
      route: "DXB -> HYD",
      track,
    },
  ];
}

const REPLAY_SCENARIOS: ReplayIncidentScenario[] = [
  {
    id: "tcas-ra-conflict-01",
    title: "TCAS II Resolution Advisory (RA) Airspace Near-Miss Reconstruction",
    description: "Loss of standard radar separation between AIC101 (B787) and VTI814 (A320) at FL050, resulting in coordinated TCAS RA Climb/Descend advisories.",
    category: "TCAS_RA_CONFLICT",
    severity: "CRITICAL",
    durationSeconds: 900,
    airportCode: "HYD",
    cpaDistanceNm: 1.85,
    cpaAltitudeFt: 1400,
    aircraft: generateTcasRaTracks(),
    investigationNotes: [
      "Loss of 5.0 NM radar separation began at 12:07:00Z (4.2 NM, 300 FT).",
      "Short Term Conflict Alert (STCA) visual/audio chime triggered in TRACON sector.",
      "TCAS II Version 7.1 issued coordinated dual RA: AIC101 CLIMB (2,200 fpm) / VTI814 DESCEND (1,800 fpm).",
      "Closest Point of Approach (CPA): 1.85 NM horizontal, 1,400 FT vertical separation safely restored.",
      "Safety margin maintained; zero collision hazard post-divergence.",
    ],
  },
  {
    id: "hyd-cda-approach-02",
    title: "Continuous Descent Approach (CDA) & Precision ILS Cat-I Intercept",
    description: "Vistara 814 fuel-optimized idle descent from FL180 down to localizer capture on Runway 09L with smooth energy management.",
    category: "CONTINUOUS_DESCENT",
    severity: "ROUTINE",
    durationSeconds: 900,
    airportCode: "HYD",
    aircraft: generateCdaApproachTrack(),
    investigationNotes: [
      "Optimal CDA idle descent saved estimated 180 kg fuel and reduced terminal CO2 footprint.",
      "Glidepath captured smoothly at 2,500 ft without level-off thrust surges.",
      "Speed managed within ICAO 160 KIAS to 4 DME standard.",
    ],
  },
  {
    id: "bopol-holding-orbit-03",
    title: "Monsoon CB Cell Avoidance & BOPOL Waypoint Holding Pattern",
    description: "SpiceJet 303 standard 1-minute holding pattern orbits at FL120 due to active thunderstorm activity on runway approach corridor.",
    category: "HOLDING_PATTERN",
    severity: "WARNING",
    durationSeconds: 900,
    airportCode: "HYD",
    aircraft: generateHoldingPatternTrack(),
    investigationNotes: [
      "Severe convective activity required 24-minute holding delay over BOPOL.",
      "Right-hand turns flown with standard 25° bank angle and wind drift correction.",
      "Fuel reserves monitored; alternate diversion airport (BOM) verified available.",
    ],
  },
  {
    id: "uae-goaround-04",
    title: "Unstable Approach & Low-Altitude TOGA Missed Approach",
    description: "Emirates 545 encounters severe windshear at 550 ft AGL on short final, executing immediate TOGA go-around and missed approach.",
    category: "GO_AROUND_MISSED_APPROACH",
    severity: "WARNING",
    durationSeconds: 600,
    airportCode: "HYD",
    aircraft: generateGoAroundTrack(),
    investigationNotes: [
      "Low-altitude windshear triggered immediate TOGA go-around protocol.",
      "Maximum continuous thrust spooled in 2.1 seconds; positive rate of climb verified.",
      "Airfield safety protected; re-sequenced for second approach with 12 NM spacing.",
    ],
  },
];

export function listReplayScenarios(): ReplayIncidentScenario[] {
  return REPLAY_SCENARIOS;
}

export function getReplayScenarioById(id: string): ReplayIncidentScenario | undefined {
  return REPLAY_SCENARIOS.find((s) => s.id === id);
}

/**
 * Interpolates flight telemetry at an exact arbitrary second
 */
export function sampleAircraftTelemetry(
  track: TrajectoryBreadcrumb[],
  secondOffset: number,
): TrajectoryBreadcrumb {
  if (track.length === 0) {
    return {
      secondOffset: 0,
      timestampZulu: "00:00:00Z",
      latitude: 17.24,
      longitude: 78.43,
      altitudeFt: 0,
      speedKt: 0,
      headingDeg: 0,
      verticalSpeedFpm: 0,
      pitchDeg: 0,
      rollDeg: 0,
      n1Percent: 0,
      fuelFlowKgh: 0,
      phase: "Parked",
      tcasState: "NORMAL",
    };
  }

  // Find surrounding breadcrumbs
  const clampedSec = Math.max(0, Math.min(secondOffset, track[track.length - 1].secondOffset));
  let idx = 0;
  while (idx < track.length - 1 && track[idx + 1].secondOffset <= clampedSec) {
    idx++;
  }

  const p1 = track[idx];
  const p2 = track[idx + 1] || p1;

  if (p1 === p2 || p2.secondOffset === p1.secondOffset) {
    return p1;
  }

  const fraction = (clampedSec - p1.secondOffset) / (p2.secondOffset - p1.secondOffset);

  return {
    secondOffset: clampedSec,
    timestampZulu: fraction > 0.5 ? p2.timestampZulu : p1.timestampZulu,
    latitude: Number((p1.latitude + fraction * (p2.latitude - p1.latitude)).toFixed(5)),
    longitude: Number((p1.longitude + fraction * (p2.longitude - p1.longitude)).toFixed(5)),
    altitudeFt: Math.round(p1.altitudeFt + fraction * (p2.altitudeFt - p1.altitudeFt)),
    speedKt: Math.round(p1.speedKt + fraction * (p2.speedKt - p1.speedKt)),
    headingDeg: Math.round(p1.headingDeg + fraction * (p2.headingDeg - p1.headingDeg)),
    verticalSpeedFpm: Math.round(p1.verticalSpeedFpm + fraction * (p2.verticalSpeedFpm - p1.verticalSpeedFpm)),
    pitchDeg: Number((p1.pitchDeg + fraction * (p2.pitchDeg - p1.pitchDeg)).toFixed(1)),
    rollDeg: Number((p1.rollDeg + fraction * (p2.rollDeg - p1.rollDeg)).toFixed(1)),
    n1Percent: Math.round(p1.n1Percent + fraction * (p2.n1Percent - p1.n1Percent)),
    fuelFlowKgh: Math.round(p1.fuelFlowKgh + fraction * (p2.fuelFlowKgh - p1.fuelFlowKgh)),
    phase: fraction > 0.5 ? p2.phase : p1.phase,
    atcClearance: fraction > 0.5 ? p2.atcClearance : p1.atcClearance,
    tcasState: fraction > 0.5 ? p2.tcasState : p1.tcasState,
  };
}

/**
 * Generates an ICAO Annex 13 Safety Incident Investigation Report
 */
export function generateInvestigationReport(scenarioId: string): IncidentInvestigationReport {
  const scenario = getReplayScenarioById(scenarioId) || REPLAY_SCENARIOS[0];

  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    generatedAt: new Date().toISOString(),
    investigationRef: `AOCC-SAFETY-INCIDENT-${scenario.id.toUpperCase()}-2026`,
    severity: scenario.severity,
    aircraftInvolved: scenario.aircraft.map((ac) => ({
      callsign: ac.callsign,
      aircraftType: ac.aircraftType,
      airline: ac.airline,
      initialAltFt: ac.track[0]?.altitudeFt || 0,
      finalAltFt: ac.track[ac.track.length - 1]?.altitudeFt || 0,
    })),
    closestPointOfApproach: {
      horizontalSeparationNm: scenario.cpaDistanceNm ?? 5.0,
      verticalSeparationFt: scenario.cpaAltitudeFt ?? 1000,
      timestampZulu: "12:09:00Z",
      icaoStandardMet: (scenario.cpaDistanceNm ?? 5.0) >= 5.0 || (scenario.cpaAltitudeFt ?? 1000) >= 1000,
    },
    safetyFindings: scenario.investigationNotes,
    recommendations: [
      "Verify TRACON STCA visual cue audible chime latency within 2.0 seconds.",
      "Re-brief terminal controllers on sector transfer altitudes during peak runway arrival streams.",
      "Ensure all airborne carriers maintain TCAS Version 7.1 avionics compliance.",
    ],
  };
}
