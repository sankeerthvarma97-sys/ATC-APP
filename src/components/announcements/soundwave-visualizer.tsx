"use client";

import React, { useEffect, useRef } from "react";

export interface SoundwaveVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  isMuted?: boolean;
  theme?: "emerald" | "amber" | "rose" | "cyan";
  label?: string;
  height?: number;
  className?: string;
}

export function SoundwaveVisualizer({
  analyser,
  isActive,
  isMuted = false,
  theme = "cyan",
  label,
  height = 96,
  className = "",
}: SoundwaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Buffer for audio data
    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    const themeColors = {
      cyan: {
        primary: "#06b6d4",
        secondary: "#0284c7",
        glow: "rgba(6, 182, 212, 0.6)",
        bg: "rgba(8, 145, 178, 0.08)",
        bar: "rgba(56, 189, 248, 0.5)",
      },
      emerald: {
        primary: "#10b981",
        secondary: "#059669",
        glow: "rgba(16, 185, 129, 0.6)",
        bg: "rgba(5, 150, 105, 0.08)",
        bar: "rgba(52, 211, 153, 0.5)",
      },
      amber: {
        primary: "#f59e0b",
        secondary: "#d97706",
        glow: "rgba(245, 158, 11, 0.6)",
        bg: "rgba(217, 119, 6, 0.08)",
        bar: "rgba(251, 191, 36, 0.5)",
      },
      rose: {
        primary: "#f43f5e",
        secondary: "#e11d48",
        glow: "rgba(244, 63, 94, 0.6)",
        bg: "rgba(225, 29, 72, 0.08)",
        bar: "rgba(251, 113, 133, 0.5)",
      },
    };

    const colors = isMuted ? themeColors.amber : themeColors[theme] || themeColors.cyan;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const render = () => {
      if (!canvas) return;
      const width = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      ctx.clearRect(0, 0, width, h);

      // Background ambient mesh
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, h);

      // Grid coordinate lines (Aerospace radar aesthetic)
      ctx.strokeStyle = "rgba(148, 163, 184, 0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(width, h / 2);
      ctx.stroke();

      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      time += 0.04;

      if (isActive && !isMuted && analyser) {
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        // 1. Draw Mirrored Frequency Spectrum Bars in Background
        const barCount = 48;
        const barWidth = width / barCount;
        ctx.fillStyle = colors.bar;

        for (let i = 0; i < barCount; i++) {
          const freqIndex = Math.floor((i / barCount) * (bufferLength / 2));
          const val = freqData[freqIndex] || 0;
          const barHeight = (val / 255) * (h * 0.45);

          const x = i * barWidth + barWidth * 0.15;
          const bw = barWidth * 0.7;

          // Upper and Lower symmetrical bars
          ctx.fillRect(x, h / 2 - barHeight, bw, barHeight);
          ctx.fillRect(x, h / 2, bw, barHeight);
        }

        // 2. Main Live Oscilloscope Soundwave
        ctx.shadowBlur = 12;
        ctx.shadowColor = colors.glow;
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0; // 0 to 2, center is 1.0
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, h / 2);
        ctx.stroke();

        // 3. Secondary High-Harmonic Glow Ribbon
        ctx.shadowBlur = 6;
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        x = 0;

        for (let i = 0; i < bufferLength; i += 2) {
          const v = timeData[i] / 128.0;
          const dynamicOffset = Math.sin(time + i * 0.1) * 3;
          const y = (v * h) / 2 + dynamicOffset;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth * 2;
        }
        ctx.stroke();

        ctx.shadowBlur = 0;
      } else {
        // Idle Ambient Sine Soundwave
        ctx.shadowBlur = 8;
        ctx.shadowColor = colors.glow;
        ctx.strokeStyle = isMuted ? "rgba(245, 158, 11, 0.4)" : colors.primary;
        ctx.lineWidth = 1.8;
        ctx.beginPath();

        const waveHeight = isMuted ? 3 : 8;
        const frequency = isMuted ? 0.02 : 0.04;

        for (let x = 0; x < width; x += 3) {
          const y = h / 2 + Math.sin(x * frequency + time) * waveHeight * Math.sin(x / 60);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      ro.disconnect();
    };
  }, [analyser, isActive, isMuted, theme]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-slate-800 bg-[#060b13] shadow-inner ${className}`}
      style={{ height }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Status Overlay HUD */}
      <div className="pointer-events-none absolute inset-x-3 top-2 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isActive
                ? isMuted
                  ? "bg-amber-400 animate-pulse"
                  : "bg-emerald-400 animate-ping"
                : "bg-slate-600"
            }`}
          />
          <span className="font-semibold text-slate-300 uppercase tracking-wider">
            {isMuted ? "MICROPHONE MUTED" : isActive ? "LIVE TRANSMISSION · 48 KHZ AUDIO" : "AUDIO STANDBY"}
          </span>
        </div>
        {label && <span className="text-slate-400 font-semibold">{label}</span>}
      </div>

      {/* Bottom Audio Grid Scale */}
      <div className="pointer-events-none absolute inset-x-3 bottom-1.5 flex items-center justify-between text-[9px] font-mono text-slate-500">
        <span>-60 dB</span>
        <span>-24 dB</span>
        <span>-12 dB</span>
        <span>-6 dB</span>
        <span className="text-emerald-400 font-bold">0 dB PEAK</span>
      </div>
    </div>
  );
}
