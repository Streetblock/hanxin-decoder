import { performance } from "node:perf_hooks";

import { decodeMatrix } from "../../src/core/index.js";
import { bits, buildMatrix } from "../helpers/symbol-fixture.mjs";

const WARMUP_RUNS = 10;
const MEASURED_RUNS = 50;
const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
const matrix = buildMatrix(payloadBits, 84, 3, 3);

for (let index = 0; index < WARMUP_RUNS; index += 1) decodeMatrix(matrix);

const samples = [];
for (let index = 0; index < MEASURED_RUNS; index += 1) {
  const started = performance.now();
  decodeMatrix(matrix);
  samples.push(performance.now() - started);
}
samples.sort((left, right) => left - right);

const percentile = (fraction) => samples[Math.ceil(samples.length * fraction) - 1];
const result = {
  benchmark: "matrix-to-payload",
  version: 84,
  errorLevel: "L4",
  mask: 3,
  runtime: process.version,
  platform: `${process.platform}-${process.arch}`,
  warmupRuns: WARMUP_RUNS,
  measuredRuns: MEASURED_RUNS,
  medianMs: percentile(0.5),
  p95Ms: percentile(0.95),
  maximumMs: samples.at(-1),
  budgetP95Ms: 20,
  passed: percentile(0.95) <= 20,
};

console.log(JSON.stringify(result));
if (!result.passed) process.exitCode = 1;
