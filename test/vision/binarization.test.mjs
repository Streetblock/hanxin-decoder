import test from "node:test";
import assert from "node:assert/strict";

import {
  binarizeRasterCandidates,
  BitMatrix,
  DEFAULT_MAX_RASTER_PIXELS,
  findForegroundBounds,
  renderMatrixRaster,
} from "../../src/index.js";

function matrixFromRows(rows) {
  return BitMatrix.fromRows(rows.map((row) => [...row].map(Number)));
}

function candidateFor(result, polarity) {
  return result.candidates.find((candidate) => candidate.polarity === polarity);
}

test("computes a deterministic global threshold and ordered polarities", () => {
  const result = binarizeRasterCandidates({
    width: 4,
    height: 1,
    data: Uint8Array.of(10, 10, 240, 240),
  });

  assert.equal(result.minimumLuminance, 10);
  assert.equal(result.maximumLuminance, 240);
  assert.equal(result.contrast, 230);
  assert.equal(result.threshold, 125);
  assert.deepEqual(result.candidates.map(({ polarity }) => polarity), ["normal", "inverted"]);
  assert.deepEqual(candidateFor(result, "normal").binary.toRows(), [[1, 1, 0, 0]]);
  assert.deepEqual(candidateFor(result, "inverted").binary.toRows(), [[0, 0, 1, 1]]);
});

test("returns no candidates for a raster below the contrast floor", () => {
  const result = binarizeRasterCandidates({
    width: 2,
    height: 2,
    data: Uint8Array.of(100, 101, 100, 101),
  }, { minimumContrast: 2 });

  assert.equal(result.contrast, 1);
  assert.equal(result.threshold, null);
  assert.deepEqual(result.candidates, []);
});

test("finds the exact translated symbol frame in both polarities", () => {
  const matrix = matrixFromRows(["101", "010", "101"]);
  const common = {
    moduleSize: 2,
    quietZone: 2,
    offsetX: 5,
    offsetY: 7,
    width: 31,
    height: 29,
  };
  const expectedBounds = {
    left: 9,
    top: 11,
    right: 14,
    bottom: 16,
    width: 6,
    height: 6,
    foregroundPixels: matrix.count() * 4,
  };

  for (const inverted of [false, true]) {
    const raster = renderMatrixRaster(matrix, { ...common, inverted });
    const result = binarizeRasterCandidates(raster);
    const polarity = inverted ? "inverted" : "normal";
    assert.deepEqual(candidateFor(result, polarity).bounds, expectedBounds);
  }
});

test("preserves frame detection for colored RGB and transparent RGBA input", () => {
  const matrix = matrixFromRows(["11", "01"]);
  const expected = {
    left: 3,
    top: 3,
    right: 6,
    bottom: 6,
    width: 4,
    height: 4,
    foregroundPixels: 12,
  };
  const rgb = renderMatrixRaster(matrix, {
    moduleSize: 2,
    quietZone: 1,
    offsetX: 1,
    offsetY: 1,
    format: "rgb8",
    foreground: [20, 50, 80],
    background: [240, 245, 250],
  });
  const rgba = renderMatrixRaster(matrix, {
    moduleSize: 2,
    quietZone: 1,
    offsetX: 1,
    offsetY: 1,
    format: "rgba8",
    foreground: [20, 50, 80, 255],
    background: [255, 255, 255, 0],
  });

  assert.deepEqual(candidateFor(binarizeRasterCandidates(rgb), "normal").bounds, expected);
  assert.deepEqual(candidateFor(binarizeRasterCandidates(rgba), "normal").bounds, expected);
});

test("can disable the ordered inverted second attempt and override the threshold", () => {
  const result = binarizeRasterCandidates({
    width: 4,
    height: 1,
    data: Uint8Array.of(0, 100, 200, 255),
  }, { threshold: 100, tryInverted: false });

  assert.equal(result.threshold, 100);
  assert.deepEqual(result.candidates.map(({ polarity }) => polarity), ["normal"]);
  assert.deepEqual(result.candidates[0].binary.toRows(), [[1, 1, 0, 0]]);
});

test("findForegroundBounds handles empty and non-square binary images", () => {
  assert.equal(findForegroundBounds(new BitMatrix(3, 2)), null);
  const matrix = new BitMatrix(4, 3).set(3, 0).set(1, 2);
  assert.deepEqual(findForegroundBounds(matrix), {
    left: 1,
    top: 0,
    right: 3,
    bottom: 2,
    width: 3,
    height: 3,
    foregroundPixels: 2,
  });
});

test("enforces raster and option limits before candidate allocation", () => {
  const image = { width: 2, height: 2, data: new Uint8Array(4) };
  assert.equal(DEFAULT_MAX_RASTER_PIXELS, 16_777_216);
  assert.throws(
    () => binarizeRasterCandidates(image, { maxPixels: 3 }),
    (error) => error.code === "UNSUPPORTED_INPUT",
  );
  assert.throws(() => binarizeRasterCandidates(image, { maxPixels: 0 }), /maxPixels/);
  assert.throws(() => binarizeRasterCandidates(image, { minimumContrast: 0 }), /minimumContrast/);
  assert.throws(() => binarizeRasterCandidates(image, { threshold: 256 }), /threshold/);
  assert.throws(() => binarizeRasterCandidates(image, { tryInverted: 1 }), /tryInverted/);
  assert.throws(() => binarizeRasterCandidates(image, { signal: {} }), /signal/);
  assert.throws(() => findForegroundBounds({}), /BitMatrix/);
});

test("honours abort and timeout checkpoints before and during preprocessing", () => {
  const image = { width: 200, height: 200, data: new Uint8Array(40_000) };
  const controller = new AbortController();
  controller.abort();
  assert.throws(
    () => binarizeRasterCandidates(image, { signal: controller.signal }),
    (error) => error.code === "ABORTED",
  );
  assert.throws(
    () => binarizeRasterCandidates(image, { timeoutMs: 0 }),
    (error) => error.code === "TIMEOUT",
  );

  let reads = 0;
  const duringSignal = {
    get aborted() {
      reads += 1;
      return reads >= 4;
    },
  };
  assert.throws(
    () => binarizeRasterCandidates(image, { signal: duringSignal }),
    (error) => error.code === "ABORTED",
  );
  assert.ok(reads >= 4);
});
