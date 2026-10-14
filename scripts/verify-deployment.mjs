#!/usr/bin/env node
// AOCC Pre-Flight Deployment & Health Verification Script

import http from "node:http";

const BASE_URL = process.env.VERIFY_URL || "http://localhost:3000";

console.log("==================================================");
console.log("   AOCC AVIATION PLATFORM — PRE-FLIGHT VERIFIER   ");
console.log("==================================================");
console.log(`Checking target: ${BASE_URL}\n`);

async function testEndpoint(path, label) {
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    if (res.ok) {
      console.log(`  [PASS] ${label} (${path}) -> HTTP ${res.status}`);
      return true;
    } else {
      console.log(`  [FAIL] ${label} (${path}) -> HTTP ${res.status}`);
      return false;
    }
  } catch (err) {
    console.log(`  [ERR]  ${label} (${path}) -> ${err.message}`);
    return false;
  }
}

async function main() {
  const tests = [
    { path: "/api/health", label: "Production Health API" },
    { path: "/api/search?q=HYD", label: "Global Search Engine" },
    { path: "/api/flight-plans", label: "ICAO Flight Dispatch Service" },
    { path: "/api/weather/metar?station=HYD", label: "Aviation Weather Engine" },
    { path: "/login", label: "Login Access Gateway" },
  ];

  let passed = 0;
  for (const t of tests) {
    const ok = await testEndpoint(t.path, t.label);
    if (ok) passed++;
  }

  console.log("\n--------------------------------------------------");
  console.log(`Verification Complete: ${passed}/${tests.length} tests passed.`);
  if (passed === tests.length) {
    console.log("Status: ALL SYSTEMS GO. Ready for high-volume operational dispatch.");
    process.exit(0);
  } else {
    console.log("Status: PRE-FLIGHT ISSUES DETECTED. Check logs above.");
    process.exit(1);
  }
}

main();
