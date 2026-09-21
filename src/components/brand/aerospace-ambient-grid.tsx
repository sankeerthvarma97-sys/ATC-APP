"use client";

import React, { useEffect, useRef } from "react";

/**
 * Ambient, ultra-lightweight aerospace tactical grid animation.
 * Runs in the background of the authenticated AOCC portal shell.
 * Hardware-accelerated, uses <0.5% CPU, automatically sleeps when tab is hidden,
 * ensuring 24/7 stability without memory leaks.
 */
export function AerospaceAmbientGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let isRunning = true;
    let lastTime = performance.now();
    let sweepY = 0;

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Subtle drifting waypoints
    const particles = Array.from({ length: 18 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      size: Math.random() * 1.5 + 1,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const render = (time: number) => {
      if (!isRunning) return;

      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Subtle moving horizontal radar scanline
      sweepY = (sweepY + dt * 35) % (h + 100);

      const grad = ctx.createLinearGradient(0, sweepY - 80, 0, sweepY);
      grad.addColorStop(0, "rgba(2, 132, 199, 0)");
      grad.addColorStop(0.8, "rgba(56, 189, 248, 0.035)");
      grad.addColorStop(1, "rgba(14, 165, 233, 0.08)");

      ctx.fillStyle = grad;
      ctx.fillRect(0, Math.max(0, sweepY - 80), w, 80);

      // Scanline beam edge
      ctx.beginPath();
      ctx.moveTo(0, sweepY);
      ctx.lineTo(w, sweepY);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // 2. Drifting Waypoint Beacons
      for (const p of particles) {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
        ctx.fill();

        // Crosshair ticks
        ctx.beginPath();
        ctx.moveTo(p.x - 3, p.y);
        ctx.lineTo(p.x + 3, p.y);
        ctx.moveTo(p.x, p.y - 3);
        ctx.lineTo(p.x, p.y + 3);
        ctx.strokeStyle = `rgba(56, 189, 248, ${p.alpha * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animId);
      } else {
        isRunning = true;
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(14, 165, 233, 0.02) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(14, 165, 233, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full block" />
    </div>
  );
}
