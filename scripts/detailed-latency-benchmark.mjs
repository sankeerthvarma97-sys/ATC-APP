const BASE_URL = process.env.BASE_URL || "http://localhost:3005";

async function timeFetch(url, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const durationMs = Math.round((performance.now() - start) * 10) / 10;
    const bodyText = await res.text();
    let json = null;
    try {
      json = JSON.parse(bodyText);
    } catch {}
    return { status: res.status, durationMs, sizeBytes: bodyText.length, json };
  } catch (err) {
    return { status: "ERR", durationMs: Math.round((performance.now() - start) * 10) / 10, error: err.message };
  }
}

async function benchmarkEndpoint(name, url, options = {}, iterations = 3) {
  // Warmup run
  await timeFetch(url, options);

  let totalMs = 0;
  let lastResult = null;
  for (let i = 0; i < iterations; i++) {
    const r = await timeFetch(url, options);
    totalMs += r.durationMs;
    lastResult = r;
  }
  const avgMs = Math.round((totalMs / iterations) * 10) / 10;
  return {
    name,
    avgMs,
    status: lastResult?.status,
    sizeBytes: lastResult?.sizeBytes,
  };
}

async function run() {
  console.log(`\n======================================================================`);
  console.log(`  AOCC DETAILED LATENCY & PERFORMANCE BENCHMARK (Baseline / Verification)`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`======================================================================\n`);

  const tests = [
    { name: "Page Shell: /login", url: `${BASE_URL}/login` },
    { name: "Page Shell: /admin (Redirects to Login if unauth)", url: `${BASE_URL}/admin`, options: { redirect: "manual" } },
    { name: "Page Shell: /staff (Redirects to Login if unauth)", url: `${BASE_URL}/staff`, options: { redirect: "manual" } },
    { name: "Page Shell: /passenger", url: `${BASE_URL}/passenger` },
    { name: "API: GET /api/health", url: `${BASE_URL}/api/health` },
    { name: "API: GET /api/flights", url: `${BASE_URL}/api/flights` },
    { name: "API: GET /api/operations/snapshot", url: `${BASE_URL}/api/operations/snapshot` },
    { name: "API: GET /api/search?q=JFK", url: `${BASE_URL}/api/search?q=JFK` },
    { name: "API: GET /api/resources?type=RUNWAY", url: `${BASE_URL}/api/resources?type=RUNWAY` },
    { name: "API: GET /api/resources?type=GATE", url: `${BASE_URL}/api/resources?type=GATE` },
    { name: "API: GET /api/simulation/staff?page=1&pageSize=20", url: `${BASE_URL}/api/simulation/staff?page=1&pageSize=20` },
  ];

  const results = [];
  for (const t of tests) {
    const res = await benchmarkEndpoint(t.name, t.url, t.options);
    results.push(res);
    const statusStr = res.status ? `(HTTP ${res.status})` : "(ERR)";
    const sizeStr = res.sizeBytes ? `${(res.sizeBytes / 1024).toFixed(1)} KB` : "";
    console.log(
      `  • ${res.name.padEnd(54, " ")}: ${String(res.avgMs).padStart(6, " ")} ms  ${statusStr.padEnd(12, " ")} ${sizeStr}`
    );
  }

  const mem = process.memoryUsage();
  console.log(`\n----------------------------------------------------------------------`);
  console.log(`  Memory Footprint: RSS ${(mem.rss / 1024 / 1024).toFixed(1)} MB | Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`);
  console.log(`======================================================================\n`);
}

run();
