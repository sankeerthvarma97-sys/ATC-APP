"use client";

import React, { useEffect, useRef } from "react";

interface AircraftVector {
  id: string;
  callsign: string;
  altitude: number; // in ft
  flightLevel: string;
  speed: number; // kt
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  history: { x: number; y: number; z: number }[];
}

export function Aerospace3dBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let isRunning = true;
    let lastTime = performance.now();

    // Screen dimensions
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse parallax tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
      targetTiltX = mouseY * 0.15; // pitch
      targetTiltY = mouseX * 0.25; // yaw
    };

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize);

    // Radar & 3D Flight Setup
    let sweepAngle = 0;
    const radarRadius = 380;

    // Aircraft simulated fleet
    const aircraftFleet: AircraftVector[] = [
      {
        id: "ac1",
        callsign: "SC101",
        altitude: 34000,
        flightLevel: "FL340",
        speed: 460,
        x: -240,
        y: -120,
        z: 80,
        vx: 0.7,
        vy: 0.35,
        vz: 0.05,
        color: "#38bdf8",
        history: [],
      },
      {
        id: "ac2",
        callsign: "AV202",
        altitude: 28000,
        flightLevel: "FL280",
        speed: 410,
        x: 180,
        y: -220,
        z: 60,
        vx: -0.5,
        vy: 0.6,
        vz: -0.04,
        color: "#0284c7",
        history: [],
      },
      {
        id: "ac3",
        callsign: "IS501",
        altitude: 39000,
        flightLevel: "FL390",
        speed: 510,
        x: 220,
        y: 160,
        z: 110,
        vx: -0.65,
        vy: -0.4,
        vz: 0.02,
        color: "#06b6d4",
        history: [],
      },
      {
        id: "ac4",
        callsign: "BH305",
        altitude: 18000,
        flightLevel: "FL180",
        speed: 320,
        x: -160,
        y: 200,
        z: 40,
        vx: 0.55,
        vy: -0.5,
        vz: -0.08,
        color: "#38bdf8",
        history: [],
      },
      {
        id: "ac5",
        callsign: "NV412",
        altitude: 24000,
        flightLevel: "FL240",
        speed: 380,
        x: 50,
        y: -260,
        z: 75,
        vx: -0.2,
        vy: 0.75,
        vz: 0.03,
        color: "#38bdf8",
        history: [],
      },
      {
        id: "ac6",
        callsign: "SG808",
        altitude: 31000,
        flightLevel: "FL310",
        speed: 440,
        x: -280,
        y: 40,
        z: 95,
        vx: 0.8,
        vy: 0.15,
        vz: 0.04,
        color: "#0284c7",
        history: [],
      },
    ];

    // Navigational Waypoints on Radar Surface
    const waypoints = [
      { name: "HYD-VOR", x: 0, y: 0 },
      { name: "OPERA", x: 140, y: -120 },
      { name: "TULSA", x: -180, y: -90 },
      { name: "BOM-FIX", x: -220, y: 150 },
      { name: "DEL-TRK", x: 60, y: -240 },
      { name: "BLR-RNAV", x: 190, y: 170 },
      { name: "MAA-APP", x: -130, y: 220 },
    ];

    // Perspective Projection helper
    const fov = 480;
    const cameraZ = 650;
    const basePitch = 0.95; // angled radar plane view

    function project3D(
      x: number,
      y: number,
      z: number,
      pitch: number,
      yaw: number,
      cx: number,
      cy: number
    ): { px: number; py: number; scale: number; depth: number } {
      // 1. Yaw (Y-axis rotation)
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const x1 = x * cosY + y * sinY;
      const y1 = -x * sinY + y * cosY;
      const z1 = z;

      // 2. Pitch (X-axis tilt)
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const x2 = x1;
      const y2 = y1 * cosP - z1 * sinP;
      const z2 = y1 * sinP + z1 * cosP + cameraZ;

      if (z2 <= 20) return { px: -9999, py: -9999, scale: 0, depth: z2 };

      const scale = fov / z2;
      const px = cx + x2 * scale;
      const py = cy + y2 * scale;

      return { px, py, scale, depth: z2 };
    }

    // Main render loop
    const render = (time: number) => {
      if (!isRunning) return;

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Smooth mouse parallax lerp
      currentTiltX += (targetTiltX - currentTiltX) * 0.05;
      currentTiltY += (targetTiltY - currentTiltY) * 0.05;

      const pitch = basePitch + currentTiltX;
      const yaw = currentTiltY;

      const cx = width / 2;
      const cy = height / 2 + 30;

      // Clear with deep aerospace atmosphere
      ctx.fillStyle = "#050810";
      ctx.fillRect(0, 0, width, height);

      // Radial background glow at radar epicenter
      const bgGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.7);
      bgGlow.addColorStop(0, "rgba(2, 132, 199, 0.15)");
      bgGlow.addColorStop(0.35, "rgba(3, 105, 161, 0.06)");
      bgGlow.addColorStop(0.7, "rgba(7, 11, 19, 0.95)");
      bgGlow.addColorStop(1, "#050810");
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, width, height);

      // Advance radar sweep beam
      sweepAngle = (sweepAngle + dt * 0.8) % (Math.PI * 2);

      // 1. Draw 3D Radar Altitude Range Rings
      const rings = [70, 150, 240, 330, 420];
      for (const r of rings) {
        ctx.beginPath();
        const segments = 64;
        let started = false;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const rx = Math.cos(theta) * r;
          const ry = Math.sin(theta) * r;
          const { px, py } = project3D(rx, ry, 0, pitch, yaw, cx, cy);
          if (i === 0) {
            ctx.moveTo(px, py);
            started = true;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.strokeStyle = r === 420 ? "rgba(56, 189, 248, 0.15)" : "rgba(3, 105, 161, 0.22)";
        ctx.lineWidth = 1;
        if (r === 240 || r === 420) {
          ctx.setLineDash([4, 6]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 2. Draw 3D Navigational Radial Axes (every 30 deg)
      for (let deg = 0; deg < 360; deg += 30) {
        const rad = (deg * Math.PI) / 180;
        const p1 = project3D(0, 0, 0, pitch, yaw, cx, cy);
        const p2 = project3D(
          Math.cos(rad) * 440,
          Math.sin(rad) * 440,
          0,
          pitch,
          yaw,
          cx,
          cy
        );

        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.strokeStyle =
          deg % 90 === 0 ? "rgba(14, 165, 233, 0.25)" : "rgba(3, 105, 161, 0.12)";
        ctx.lineWidth = deg % 90 === 0 ? 1.2 : 0.8;
        ctx.stroke();

        // Degree label at perimeter
        if (deg % 90 === 0 && p2.scale > 0.3) {
          ctx.fillStyle = "rgba(56, 189, 248, 0.5)";
          ctx.font = `${Math.max(9, 10 * p2.scale)}px monospace`;
          ctx.textAlign = "center";
          const label = deg === 0 ? "000° N" : deg === 90 ? "090° E" : deg === 180 ? "180° S" : "270° W";
          ctx.fillText(label, p2.px, p2.py - 4);
        }
      }

      // 3. Draw Radar Phosphor Sweep Wedge in 3D
      const sweepSegments = 24;
      const sweepSpan = Math.PI * 0.35; // 63 degrees phosphor decay trail
      for (let s = 0; s < sweepSegments; s++) {
        const a1 = sweepAngle - (s / sweepSegments) * sweepSpan;
        const a2 = sweepAngle - ((s + 1) / sweepSegments) * sweepSpan;
        const alpha = (1 - s / sweepSegments) * 0.16;

        const pOrigin = project3D(0, 0, 0, pitch, yaw, cx, cy);
        const pOuter1 = project3D(
          Math.cos(a1) * 430,
          Math.sin(a1) * 430,
          0,
          pitch,
          yaw,
          cx,
          cy
        );
        const pOuter2 = project3D(
          Math.cos(a2) * 430,
          Math.sin(a2) * 430,
          0,
          pitch,
          yaw,
          cx,
          cy
        );

        ctx.beginPath();
        ctx.moveTo(pOrigin.px, pOrigin.py);
        ctx.lineTo(pOuter1.px, pOuter1.py);
        ctx.lineTo(pOuter2.px, pOuter2.py);
        ctx.closePath();
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.fill();
      }

      // 4. Draw Navigational Waypoints
      for (const wp of waypoints) {
        const { px, py, scale } = project3D(wp.x, wp.y, 0, pitch, yaw, cx, cy);
        if (scale <= 0) continue;

        // Diamond waypoint symbol
        const dSize = 4 * scale;
        ctx.beginPath();
        ctx.moveTo(px, py - dSize);
        ctx.lineTo(px + dSize, py);
        ctx.lineTo(px, py + dSize);
        ctx.lineTo(px - dSize, py);
        ctx.closePath();
        ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
        ctx.fillStyle = "rgba(2, 132, 199, 0.4)";
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
        ctx.font = `${Math.max(8, 9 * scale)}px monospace`;
        ctx.textAlign = "left";
        ctx.fillText(`▲ ${wp.name}`, px + dSize + 3, py + 3);
      }

      // 5. Update and Draw 3D Aircraft Fleet
      for (const ac of aircraftFleet) {
        // Position integration
        ac.x += ac.vx * dt * 45;
        ac.y += ac.vy * dt * 45;
        ac.z += ac.vz * dt * 15;

        // Boundaries bounce / reset for continuous 24/7 flight simulation
        if (Math.hypot(ac.x, ac.y) > 360) {
          ac.vx = -ac.vx;
          ac.vy = -ac.vy;
        }
        if (ac.z < 30 || ac.z > 140) {
          ac.vz = -ac.vz;
        }

        // Add history point
        if (Math.random() < 0.35) {
          ac.history.push({ x: ac.x, y: ac.y, z: ac.z });
          if (ac.history.length > 14) ac.history.shift();
        }

        // Draw 3D flight trajectory ribbon
        if (ac.history.length > 1) {
          ctx.beginPath();
          for (let h = 0; h < ac.history.length; h++) {
            const hp = ac.history[h];
            const pt = project3D(hp.x, hp.y, hp.z, pitch, yaw, cx, cy);
            if (h === 0) ctx.moveTo(pt.px, pt.py);
            else ctx.lineTo(pt.px, pt.py);
          }
          ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Project aircraft in air (x, y, z) and radar ground shadow (x, y, 0)
        const airPt = project3D(ac.x, ac.y, ac.z, pitch, yaw, cx, cy);
        const gndPt = project3D(ac.x, ac.y, 0, pitch, yaw, cx, cy);

        if (airPt.scale <= 0) continue;

        // Altitude leader line from aircraft down to radar ground shadow
        ctx.beginPath();
        ctx.moveTo(airPt.px, airPt.py);
        ctx.lineTo(gndPt.px, gndPt.py);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Radar ground shadow track
        ctx.beginPath();
        ctx.arc(gndPt.px, gndPt.py, 2.5 * gndPt.scale, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(2, 132, 199, 0.5)";
        ctx.fill();

        // 3D Aircraft Icon (Delta Wing heading)
        const heading = Math.atan2(ac.vy, ac.vx);
        const iconSize = 7 * airPt.scale;

        ctx.save();
        ctx.translate(airPt.px, airPt.py);
        ctx.rotate(heading);

        // Delta wing geometry
        ctx.beginPath();
        ctx.moveTo(iconSize * 1.4, 0); // nose
        ctx.lineTo(-iconSize, -iconSize * 0.9); // left wingtip
        ctx.lineTo(-iconSize * 0.4, 0); // tail center
        ctx.lineTo(-iconSize, iconSize * 0.9); // right wingtip
        ctx.closePath();

        ctx.fillStyle = ac.color;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();

        // Tactical Data Tag (Callsign, FL, Speed)
        const tagX = airPt.px + 12;
        const tagY = airPt.py - 6;

        ctx.fillStyle = "rgba(7, 11, 19, 0.75)";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 0.75;
        const boxW = 82;
        const boxH = 26;
        ctx.fillRect(tagX, tagY, boxW, boxH);
        ctx.strokeRect(tagX, tagY, boxW, boxH);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(ac.callsign, tagX + 4, tagY + 11);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "8px monospace";
        ctx.fillText(`${ac.flightLevel} · ${ac.speed}KT`, tagX + 4, tagY + 21);
      }

      // 6. Tactical Vignette Overlay
      const vig = ctx.createLinearGradient(0, 0, 0, height);
      vig.addColorStop(0, "rgba(5, 8, 16, 0.7)");
      vig.addColorStop(0.2, "rgba(5, 8, 16, 0)");
      vig.addColorStop(0.8, "rgba(5, 8, 16, 0)");
      vig.addColorStop(1, "rgba(5, 8, 16, 0.85)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);

      animationFrameId = requestAnimationFrame(render);
    };

    // 24/7 Tab visibility handling: pause loop when backgrounded to prevent GPU waste
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else {
        isRunning = true;
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050810]">
      <canvas
        ref={canvasRef}
        className="h-full w-full block"
        style={{ pointerEvents: "none" }}
      />
      {/* Subtle telemetry line decorations */}
      <div className="absolute top-4 left-6 font-mono text-[10px] text-sky-500/40 tracking-widest uppercase select-none">
        AOCC TACTICAL AIRSPACE RADAR · 3D TELEMETRY VECTOR v2.4
      </div>
      <div className="absolute bottom-4 right-6 font-mono text-[10px] text-sky-500/40 tracking-widest uppercase select-none">
        ICAO SECTOR HYD / 24/7 LIVE RADAR SWEEP
      </div>
    </div>
  );
}
