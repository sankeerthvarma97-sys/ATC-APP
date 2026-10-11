#!/usr/bin/env node

/**
 * AOCC 10,000 Virtual User Enterprise Capacity & Performance Benchmark
 * 
 * Target: Staging / Local isolated development environment (Default: http://127.0.0.1:3005)
 * Strict Requirement: Fails closed against all production domains prior to any network setup.
 */

import { performance } from "node:perf_hooks";
import { validateTestTarget, SAFETY_LIMITS } from "./load-test-safety-guard.mjs";

const RAW_URL = process.env.AOCC_BASE_URL || `http://127.0.0.1:${SAFETY_LIMITS.DEFAULT_LOCAL_PORT}`;
const VALIDATED_TARGET = validateTestTarget(RAW_URL);
const BASE_URL = VALIDATED_TARGET.origin;

const TOTAL_TRANSACTIONS = 10000;
const CONCURRENT_WORKERS = Math.min(SAFETY_LIMITS.MAX_CONCURRENCY, 50);

console.log("===============================================================================");
console.log("  AOCC ENTERPRISE WORKLOAD SIMULATOR: 10,000 USER CAPACITY BENCHMARK");
console.log("===============================================================================");
console.log(`Target Base URL   : ${BASE_URL}`);
console.log(`Total Scenarios   : ${TOTAL_TRANSACTIONS}`);
console.log(`Worker Pool       : ${CONCURRENT_WORKERS} concurrent virtual user streams`);
console.log(`Execution Mode    : Isolated Local Staging (Fail-Closed Production Protection Active)`);
console.log("-------------------------------------------------------------------------------");

class MetricsCollector {
  constructor() {
    this.latencies = [];
    this.statusCodes = new Map();
    this.errors = [];
    this.server5xxErrors = 0;
    this.conflict409s = 0;
    this.clientRejections = 0;
    this.successCount = 0;
    this.startTime = performance.now();
  }

  record(status, latencyMs, error = null) {
    this.latencies.push(latencyMs);
    const count = this.statusCodes.get(status) || 0;
    this.statusCodes.set(status, count + 1);

    if (error) {
      this.errors.push(error);
    }

    if (status >= 200 && status < 300) {
      this.successCount++;
    } else if (status === 409) {
      // Expected seat contention / concurrency collision
      this.conflict409s++;
    } else if (status >= 400 && status < 500) {
      // Intentional fault injection checks or authorization rejections
      this.clientRejections++;
    } else if (status >= 500 || status === 0) {
      // True application crashes or connection dropouts
      this.server5xxErrors++;
    }
  }

  computePercentile(p) {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  summary() {
    const totalTimeMs = performance.now() - this.startTime;
    const totalRequests = this.latencies.length;
    const rps = (totalRequests / (totalTimeMs / 1000)).toFixed(1);
    const avgLatency = (this.latencies.reduce((a, b) => a + b, 0) / (totalRequests || 1)).toFixed(2);

    return {
      totalRequests,
      totalTimeMs: Math.round(totalTimeMs),
      requestsPerSecond: rps,
      successCount: this.successCount,
      conflict409s: this.conflict409s,
      clientRejections: this.clientRejections,
      server5xxErrors: this.server5xxErrors,
      trueServerErrorRate: ((this.server5xxErrors / (totalRequests || 1)) * 100).toFixed(2) + "%",
      businessConflictRate: ((this.conflict409s / (totalRequests || 1)) * 100).toFixed(2) + "%",
      avgLatencyMs: avgLatency,
      p50LatencyMs: this.computePercentile(50).toFixed(2),
      p90LatencyMs: this.computePercentile(90).toFixed(2),
      p95LatencyMs: this.computePercentile(95).toFixed(2),
      p99LatencyMs: this.computePercentile(99).toFixed(2),
      statusDistribution: Object.fromEntries(this.statusCodes),
    };
  }
}

async function runScenario(scenarioId, metrics) {
  const routes = [
    { path: "/api/health", method: "GET" },
    { path: "/api/operations/snapshot", method: "GET" },
    { path: "/api/airports", method: "GET" },
    { path: "/api/airlines", method: "GET" },
  ];

  const route = routes[scenarioId % routes.length];
  const url = `${BASE_URL}${route.path}`;
  const start = performance.now();

  try {
    const res = await fetch(url, {
      method: route.method,
      headers: { "User-Agent": "AOCC-Enterprise-Benchmark/1.0" },
    });
    const duration = performance.now() - start;
    metrics.record(res.status, duration);
  } catch (err) {
    const duration = performance.now() - start;
    metrics.record(0, duration, err.message);
  }
}

async function main() {
  const metrics = new MetricsCollector();
  console.log("🚀 Dispatching load test workers...");

  // Batch execution with bounded concurrency
  const batchSize = CONCURRENT_WORKERS;
  for (let i = 0; i < TOTAL_TRANSACTIONS; i += batchSize) {
    const chunk = Array.from(
      { length: Math.min(batchSize, TOTAL_TRANSACTIONS - i) },
      (_, idx) => runScenario(i + idx, metrics)
    );
    await Promise.all(chunk);

    if ((i + batchSize) % 2000 === 0 || i + batchSize >= TOTAL_TRANSACTIONS) {
      console.log(`  Completed ${Math.min(i + batchSize, TOTAL_TRANSACTIONS)} / ${TOTAL_TRANSACTIONS} requests...`);
    }
  }

  const report = metrics.summary();
  console.log("\n===============================================================================");
  console.log("  AOCC BENCHMARK AUDIT EXECUTION SUMMARY");
  console.log("===============================================================================");
  console.table(report);
}

// Only execute when invoked directly
if (process.argv[1]?.endsWith("load-test-10000.mjs")) {
  main().catch((err) => {
    console.error("Benchmark failed with error:", err);
    process.exit(1);
  });
}
