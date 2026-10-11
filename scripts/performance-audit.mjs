const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const BLOCKED_PRODUCTION_HOSTS = new Set([
  "atc-app-one.vercel.app",
  "atc-app.vercel.app",
]);

function assertSafeTarget(rawUrl) {
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("Unsafe performance-audit target: BASE_URL must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(target.protocol) || target.username || target.password) {
    throw new Error("Unsafe performance-audit target: only HTTP(S) URLs without embedded credentials are allowed.");
  }

  const host = target.hostname.toLowerCase();
  if (BLOCKED_PRODUCTION_HOSTS.has(host)) {
    throw new Error(`Refusing to benchmark known production host: ${host}`);
  }

  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
  if (!isLocal) {
    if (process.env.AOCC_ALLOW_REMOTE_TEST_TARGET !== "true") {
      throw new Error("Remote performance audits are disabled. Use localhost or explicitly opt in for an approved staging host.");
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
    throw new Error("BASE_URL must be an origin only (for example http://localhost:3000), without a path, query, or fragment.");
  }
}

assertSafeTarget(BASE_URL);

async function measureHttpLatency(url, options = {}) {
  const start = performance.now();
  const res = await fetch(url, options);
  const latency = performance.now() - start;
  return { status: res.status, latencyMs: Math.round(latency * 100) / 100 };
}

async function runPerformanceAudit() {
  console.log("⏱️ Starting AOCC Performance & Latency Benchmark...\n");

  const benchmarks = [
    { name: "Initial HTML Shell (GET /login)", url: `${BASE_URL}/login` },
    { name: "Health Check (GET /api/health)", url: `${BASE_URL}/api/health` },
    { name: "Global Search Engine (GET /api/search?q=JFK)", url: `${BASE_URL}/api/search?q=JFK` },
    { name: "Flights REST Telemetry (GET /api/flights)", url: `${BASE_URL}/api/flights` },
    { name: "Runway Resources (GET /api/resources?type=RUNWAY)", url: `${BASE_URL}/api/resources?type=RUNWAY` },
    { name: "Gate Resources (GET /api/resources?type=GATE)", url: `${BASE_URL}/api/resources?type=GATE` },
    { name: "ICAO Flight Plans (GET /api/flight-plans)", url: `${BASE_URL}/api/flight-plans` },
    { name: "AI Briefing Telemetry (POST /api/ai/briefing)", url: `${BASE_URL}/api/ai/briefing`, options: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ focus: "runways", question: "Quick check runway status." })
    }},
  ];

  const results = [];

  for (const b of benchmarks) {
    try {
      await measureHttpLatency(b.url, b.options);
      let totalMs = 0;
      let lastStatus = 200;
      const runs = 3;
      for (let i = 0; i < runs; i++) {
        const m = await measureHttpLatency(b.url, b.options);
        totalMs += m.latencyMs;
        lastStatus = m.status;
      }
      const avgMs = Math.round((totalMs / runs) * 10) / 10;
      results.push({ name: b.name, status: lastStatus, avgLatencyMs: avgMs });
      console.log(`  ⚡ ${b.name.padEnd(52, " ")}: ${avgMs} ms (HTTP ${lastStatus})`);
    } catch (err) {
      console.error(`  ❌ Failed benchmark ${b.name}:`, err.message);
      results.push({ name: b.name, status: "ERROR", avgLatencyMs: -1 });
    }
  }

  const mem = process.memoryUsage();
  console.log("\n📊 System Process Memory Footprint:");
  console.log(`  - Heap Used : ${Math.round(mem.heapUsed / 1024 / 1024)} MB`);
  console.log(`  - Heap Total: ${Math.round(mem.heapTotal / 1024 / 1024)} MB`);
  console.log(`  - RSS       : ${Math.round(mem.rss / 1024 / 1024)} MB`);

  console.log("\n==============================================");
  console.log("Performance Audit Complete");
  console.log("==============================================\n");
}

runPerformanceAudit().catch((err) => {
  console.error("Performance audit aborted:", err.message);
  process.exitCode = 1;
});
