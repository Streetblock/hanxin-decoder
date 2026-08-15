import { cpus, platform, release } from "node:os";
import process from "node:process";
import { performance } from "node:perf_hooks";

import { decodeImage, renderMatrixRaster } from "../../src/index.js";
import { bits, buildMatrix } from "../helpers/symbol-fixture.mjs";

const RUNS = 30;
const WARMUP_RUNS = 5;
const P95_BUDGET_MS = 150;

const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
const matrix = buildMatrix(payloadBits, 84, 3, 3);
const image = renderMatrixRaster(matrix, { moduleSize: 5, quietZone: 4 });
const pixelCount = image.width * image.height;
if (pixelCount > 1_000_000) throw new Error("performance fixture exceeds one megapixel");

for (let run = 0; run < WARMUP_RUNS; run += 1) {
  const result = await decodeImage(image, { effort: "balanced", diagnostics: "none" });
  if (!result.ok) throw new Error(`warmup failed: ${result.code}`);
}

const durations = [];
for (let run = 0; run < RUNS; run += 1) {
  const startedAt = performance.now();
  const result = await decodeImage(image, { effort: "balanced", diagnostics: "none" });
  durations.push(performance.now() - startedAt);
  if (!result.ok || result.version !== 84 || result.errorLevel !== "L4" || result.mask !== 3) {
    throw new Error(`measured decode ${run + 1} returned an invalid result`);
  }
}

durations.sort((left, right) => left - right);
const percentile = (fraction) => durations[Math.ceil(durations.length * fraction) - 1];
const report = {
  ok: percentile(0.95) <= P95_BUDGET_MS,
  profile: "balanced",
  fixture: {
    version: 84,
    errorLevel: "L4",
    mask: 3,
    width: image.width,
    height: image.height,
    pixels: pixelCount,
  },
  runs: RUNS,
  warmupRuns: WARMUP_RUNS,
  budgetP95Ms: P95_BUDGET_MS,
  medianMs: Math.round(percentile(0.5) * 100) / 100,
  p95Ms: Math.round(percentile(0.95) * 100) / 100,
  maxMs: Math.round(durations.at(-1) * 100) / 100,
  runtime: {
    cpu: cpus()[0]?.model ?? "unknown",
    logicalProcessors: cpus().length,
    node: process.version,
    platform: `${platform()} ${release()} ${process.arch}`,
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
