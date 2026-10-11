/**
 * AOCC Fail-Closed Test Target Guardrail
 * 
 * Enforces strict, non-negotiable protection against executing load tests,
 * benchmarks, or stress harnesses against production or unauthorized remote hosts.
 */

// Permitted test host patterns (Fail-closed allowlist)
const APPROVED_LOCAL_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
]);

// Documented safety limits for isolated test harnesses
export const SAFETY_LIMITS = {
  MAX_VIRTUAL_USERS: 10000,
  MAX_CONCURRENCY: 60,
  MAX_TIMEOUT_MS: 30000,
  DEFAULT_LOCAL_PORT: 3005,
};

/**
 * Validates the target URL. Fails closed (aborts process or throws error)
 * if the target is production, unapproved, or malformed.
 * 
 * @param {string} targetUrl - The target base URL to evaluate.
 * @param {object} options - Validation options.
 * @param {boolean} options.throwOnError - If true, throws Error instead of process.exit (for unit testing).
 * @returns {URL} The parsed and validated target URL object.
 */
export function validateTestTarget(targetUrl, options = {}) {
  if (!targetUrl || typeof targetUrl !== "string") {
    const msg = "🛑 FATAL SAFETY ABORT: Target URL must be a non-empty string.";
    if (options.throwOnError) throw new Error(msg);
    console.error(msg);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = new URL(targetUrl.trim());
  } catch (err) {
    const msg = `🛑 FATAL SAFETY ABORT: Invalid target URL '${targetUrl}': ${err.message}`;
    if (options.throwOnError) throw new Error(msg);
    console.error(msg);
    process.exit(1);
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Explicit production blacklist check (Primary guard)
  const isProduction =
    hostname.includes("vercel.app") ||
    hostname.includes("atc-app-one") ||
    hostname.includes("atc-app") ||
    hostname.includes("onrender.com") ||
    hostname.includes("production") ||
    hostname.startsWith("prod.");

  if (isProduction) {
    const msg = `🛑 FATAL SAFETY ABORT: Target '${targetUrl}' resolved to a PRODUCTION domain. Load testing against production is strictly prohibited.`;
    if (options.throwOnError) throw new Error(msg);
    console.error(msg);
    process.exit(1);
  }

  // 2. Fail-closed allowlist check (Secondary guard)
  const isApprovedLocal = APPROVED_LOCAL_HOSTNAMES.has(hostname);
  const isApprovedStaging =
    process.env.AOCC_ALLOW_REMOTE_STAGING === "true" &&
    (hostname.endsWith(".staging.internal") || hostname.endsWith(".preview.internal"));

  if (!isApprovedLocal && !isApprovedStaging) {
    const msg = `🛑 FATAL SAFETY ABORT: Target '${targetUrl}' is not an approved isolated test host. Fail-closed policy permits only localhost / 127.0.0.1 or verified internal staging.`;
    if (options.throwOnError) throw new Error(msg);
    console.error(msg);
    process.exit(1);
  }

  return parsed;
}
