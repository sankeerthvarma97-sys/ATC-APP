import React from "react";

interface AoccLogoProps {
  size?: number | "sm" | "md" | "lg" | "xl";
  withText?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

export function AoccLogo({ size = "md", withText = false, className = "" }: AoccLogoProps) {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || 36;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <radialGradient id="aocc-radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#0369a1" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#070b13" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="aocc-wing-primary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id="aocc-wing-facet" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="60%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="aocc-radar-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Background Radar Backplate */}
        <circle cx="50" cy="50" r="48" fill="#070b13" stroke="#1e293b" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="46" fill="url(#aocc-radar-glow)" />

        {/* Radar Range Rings */}
        <circle cx="50" cy="50" r="40" stroke="url(#aocc-radar-ring)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        <circle cx="50" cy="50" r="30" stroke="#0369a1" strokeWidth="1" opacity="0.5" />
        <circle cx="50" cy="50" r="18" stroke="#0284c7" strokeWidth="1" opacity="0.7" />
        <circle cx="50" cy="50" r="6" stroke="#38bdf8" strokeWidth="1" opacity="0.9" />

        {/* Navigational Crosshair Axes */}
        <line x1="50" y1="4" x2="50" y2="96" stroke="#0369a1" strokeWidth="0.75" opacity="0.4" />
        <line x1="4" y1="50" x2="96" y2="50" stroke="#0369a1" strokeWidth="0.75" opacity="0.4" />
        <line x1="16" y1="16" x2="84" y2="84" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3" />
        <line x1="16" y1="84" x2="84" y2="16" stroke="#0284c7" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3" />

        {/* Radar Waypoint Fix Blips */}
        <circle cx="50" cy="10" r="1.5" fill="#38bdf8" />
        <circle cx="80" cy="50" r="1.5" fill="#38bdf8" />
        <circle cx="50" cy="90" r="1.5" fill="#38bdf8" />
        <circle cx="20" cy="50" r="1.5" fill="#38bdf8" />

        {/* Supersonic Delta Aircraft Silhouette (Ascending Vector) */}
        <g transform="rotate(45 50 50)">
          {/* Exhaust Afterburner Glow */}
          <ellipse cx="50" cy="74" rx="3.5" ry="5.5" fill="#38bdf8" opacity="0.8" filter="blur(1px)" />

          {/* Left Wing Facet */}
          <path
            d="M50 20 L30 68 L48 62 Z"
            fill="url(#aocc-wing-facet)"
          />

          {/* Right Wing Facet */}
          <path
            d="M50 20 L70 68 L52 62 Z"
            fill="url(#aocc-wing-primary)"
          />

          {/* Fuselage Spine */}
          <path
            d="M50 16 L53 64 L50 67 L47 64 Z"
            fill="#f8fafc"
          />

          {/* Canopy Glass */}
          <path
            d="M50 28 L51.8 38 L50 41 L48.2 38 Z"
            fill="#0ea5e9"
          />
        </g>
      </svg>

      {withText && (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-black tracking-wider text-white uppercase font-mono">
            AOCC
          </span>
          <span className="text-[9px] font-mono tracking-widest text-sky-400 uppercase">
            Operations Control
          </span>
        </div>
      )}
    </div>
  );
}
