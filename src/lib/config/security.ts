export type SecurityConfigOptions = {
  env?: Record<string, string | undefined>;
  production?: boolean;
  fallback?: string;
};

const DEFAULT_LOCAL_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

const PLACEHOLDER_MARKERS = [
  "replace-with",
  "dev-only",
  "fallback",
  "default-secret",
  "aocc-production-jwt-secret-fallback-key-2026",
  "example",
  "changeme",
  "your-secret",
];

function normalizeOrigin(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    return new URL(candidate).origin;
  } catch {
    return candidate.replace(/\/$/, "");
  }
}

export function getRequiredRuntimeValue(name: string, options: SecurityConfigOptions = {}): string {
  const env = options.env ?? process.env;
  const value = env[name];
  const production = options.production ?? process.env.NODE_ENV === "production";

  if (value && value.trim() && !PLACEHOLDER_MARKERS.some((marker) => value.toLowerCase().includes(marker.toLowerCase()))) {
    return value.trim();
  }

  if (production) {
    throw new Error(`Missing required runtime value for ${name}. Set it explicitly in your environment before starting in production.`);
  }

  return options.fallback ?? "";
}

export function buildAllowedOrigins(options: SecurityConfigOptions = {}): string[] {
  const env = options.env ?? process.env;
  const production = options.production ?? process.env.NODE_ENV === "production";
  const rawValue = env.ALLOWED_ORIGINS ?? env.CORS_ALLOWED_ORIGINS ?? env.NEXT_PUBLIC_ALLOWED_ORIGINS ?? "";

  const configured = rawValue
    .split(",")
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));

  if (production) {
    return configured;
  }

  return [...new Set([...configured, ...DEFAULT_LOCAL_ORIGINS])];
}

export function isOriginAllowed(origin: string | null | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  return allowedOrigins.some((allowed) => {
    const normalizedAllowed = normalizeOrigin(allowed);
    if (!normalizedAllowed) return false;
    return normalizedAllowed === normalizedOrigin;
  });
}
