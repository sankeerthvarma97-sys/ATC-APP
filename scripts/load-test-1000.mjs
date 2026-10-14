#!/usr/bin/env node

/**
 * AOCC 1,000 Staff Concurrency & High-Load Stress Test
 * Simulates high-density concurrent staff usage across operational endpoints.
 *
 * Safety: remote targets require an explicit host allowlist and opt-in.
 * Known production hosts are always blocked.
 */

import { validateTestTarget } from "./load-test-safety-guard.mjs";

const RAW_URL = process.env.AOCC_BASE_URL || "http://127.0.0.1:3005";
const VALIDATED_TARGET = validateTestTarget(RAW_URL);
const BASE_URL = VALIDATED_TARGET.origin;

const TOTAL_STAFF_REQUESTS = 1000;
const BLOCKED_PRODUCTION_HOSTS = new Set([
  "atc-app-one.vercel.app",
  "atc-app.vercel.app",
]);

function assertSafeTarget(rawUrl) {
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("Unsafe load-test target: AOCC_BASE_URL must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) {
    throw new Error("Unsafe load-test target: only HTTP(S) URLs without embedded credentials are allowed.");
  }

  const host = target.hostname.toLowerCase();
  if (BLOCKED_PRODUCTION_HOSTS.has(host)) {
    throw new Error(`Refusing to load-test known production host: ${host}`);
  }

  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
  if (!isLocal) {
    if (process.env.AOCC_ALLOW_REMOTE_TEST_TARGET !== "true") {
      throw new Error("Remote load-test targets are disabled. Use localhost or explicitly opt in for an approved staging host.");
    }
    const allowlist = (process.env.AOCC_ALLOWED_TEST_HOSTS || "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (!allowlist.includes(host)) {
      throw new Error(`Remote target host "${host}" is not in AOCC_ALLOWED_TEST_HOSTS; refusing to run.`);
    }
  }

  if (target.pathname !== "/" || target.search || target.hash) {
    // A base URL may include a path, but it is easy to unintentionally target a proxy or production route.
    // Keep the base URL origin-only and put endpoint paths in ENDPOINTS.
    throw new Error("AOCC_BASE_URL must be an origin only (for example http://localhost:3000), without a path, query, or fragment.");
  }
}

assertSafeTarget(BASE_URL);

const ENDPOINTS = [
  { path: "/api/health", name: "System Health" },
  { path: "/api/flights", name: "Flights Radar Telemetry" },
  { path: "/api/resources?type=RUNWAY", name: "Runway Status" },
  { path: "/api/resources?type=GATE", name: "Gate Resources" },
  { path: "/api/flight-plans", name: "ICAO Flight Plans" },
  { path: "/api/search?q=JFK", name: "Global Search Engine" },
  { path: "/login", name: "Staff Portal Shell" },
];

async function measureRequest(endpoint, index) {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${endpoint.path}`, {
      headers: {
        "x-staff-simulated-id": `staff-${index}`,
        "User-Agent": "AOCC-Staff-LoadTest/1.0",
      },
    });
    const duration = performance.now() - start;
    return {
      ok: res.ok,
      status: res.status,
      duration,
      name: endpoint.name,
    };
  } catch (err) {
    const duration = performance.now() - start;
    return {
      ok: false,
      status: 0,
      duration,
      name: endpoint.name,
      error: err.cause?.message || err.message,
    };
  }
}

async function runConcurrentQueue(totalRequests, concurrency = 60) {
  process.stdout.write(`  ⏳ Processing ${totalRequests} staff operations across ${concurrency} concurrent workers... `);
  const queueStart = performance.now();
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < totalRequests) {
      const idx = nextIndex++;
      const endpoint = ENDPOINTS[idx % ENDPOINTS.length];
      const result = await measureRequest(endpoint, idx);
      results.push(result);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  const queueDuration = performance.now() - queueStart;
  const passed = results.filter((r) => r.ok).length;
  console.log(`Done in ${queueDuration.toFixed(1)}ms (${passed}/${totalRequests} OK)`);

  return results;
}

async function main() {
  console.log("✈️ Starting AOCC 1,000 Staff High-Load Concurrency Audit...");
  console.log(`🎯 Target Host: ${BASE_URL}`);
  console.log(`👥 Total Simulated Staff Requests: ${TOTAL_STAFF_REQUESTS}`);

  const memBefore = process.memoryUsage();
  const testStart = performance.now();

  const allResults = await runConcurrentQueue(TOTAL_STAFF_REQUESTS, 60);

  const totalDuration = performance.now() - testStart;
  const memAfter = process.memoryUsage();

  const totalSuccess = allResults.filter((r) => r.ok).length;
  const totalFailed = allResults.length - totalSuccess;
  const successRate = ((totalSuccess / allResults.length) * 100).toFixed(2);

  const durations = allResults.map((r) => r.duration).sort((a, b) => a - b);
  const minLatency = durations[0].toFixed(1);
  const maxLatency = durations[durations.length - 1].toFixed(1);
  const avgLatency = (durations.reduce((acc, d) => acc + d, 0) / durations.length).toFixed(1);
  const p50 = durations[Math.floor(durations.length * 0.5)].toFixed(1);
  const p95 = durations[Math.floor(durations.length * 0.95)].toFixed(1);
  const p99 = durations[Math.floor(durations.length * 0.99)].toFixed(1);
  const throughput = ((allResults.length / totalDuration) * 1000).toFixed(1);

  console.log("\n==============================================");
  console.log("📊 1,000 Staff Load Test Benchmark Report:");
  console.log("==============================================");
  console.log(`  ✅ Successful Requests : ${totalSuccess} / ${allResults.length} (${successRate}%)`);
  console.log(`  ❌ Failed Requests     : ${totalFailed}`);
  console.log(`  🚀 Total Throughput    : ${throughput} req/sec`);
  console.log(`  ⚡ Total Elapsed Time  : ${(totalDuration / 1000).toFixed(2)} seconds`);
  console.log("\n⏱️ Response Latency Percentiles:");
  console.log(`  - Minimum Latency      : ${minLatency} ms`);
  console.log(`  - Average Latency      : ${avgLatency} ms`);
  console.log(`  - P50 (Median) Latency : ${p50} ms`);
  console.log(`  - P95 Latency          : ${p95} ms`);
  console.log(`  - P99 Latency          : ${p99} ms`);
  console.log(`  - Max Latency          : ${maxLatency} ms`);

  console.log("\n🧠 Memory Profile Under High-End Load:");
  console.log(`  - Initial RSS          : ${Math.round(memBefore.rss / 1024 / 1024)} MB`);
  console.log(`  - Final RSS            : ${Math.round(memAfter.rss / 1024 / 1024)} MB`);
  console.log(`  - Heap Used            : ${Math.round(memAfter.heapUsed / 1024 / 1024)} MB`);

  if (totalFailed > 0) {
    console.error(`\n❌ Load test failed: ${totalFailed} requests were unsuccessful.`);
    const samples = allResults.filter((r) => !r.ok).slice(0, 5);
    for (const s of samples) {
      console.error(`   - ${s.name}: status=${s.status} error=${s.error}`);
    }
    process.exit(1);
  }

  console.log("\n🎉 High-End Staff Concurrency Test: 100% PASSED (Zero Failures)");
}

main().catch((err) => {
  console.error("Load test runner crashed:", err);
  process.exit(1);
});
