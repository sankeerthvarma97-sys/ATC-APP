export type StartupConfigStatus = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

const REQUIRED_RUNTIME_KEYS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "ADMIN_BOOTSTRAP_EMAIL",
  "ADMIN_BOOTSTRAP_PASSWORD",
] as const;

const PLACEHOLDER_MARKERS = [
  "replace-with",
  "dev-only",
  "fallback",
  "default-secret",
  "changeme",
  "your-secret",
  "placeholder",
];

function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) {
    return true;
  }

  const normalized = value.trim();
  if (!normalized) {
    return true;
  }

  return PLACEHOLDER_MARKERS.some((marker) => normalized.toLowerCase().includes(marker.toLowerCase()));
}

export function validateStartupConfiguration(
  env: Record<string, string | undefined> = process.env,
): StartupConfigStatus {
  const missing = REQUIRED_RUNTIME_KEYS.filter((key) => isPlaceholderValue(env[key]));
  const warnings: string[] = [];

  for (const key of REQUIRED_RUNTIME_KEYS) {
    const value = env[key];
    if (value && isPlaceholderValue(value)) {
      warnings.push(`${key} is using a placeholder or insecure fallback value.`);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
  };
}
