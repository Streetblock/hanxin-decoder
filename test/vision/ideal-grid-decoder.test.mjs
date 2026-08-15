import test from "node:test";
import assert from "node:assert/strict";

import {
  BitMatrix,
  decodeIdealRaster,
  DEFAULT_MAX_GRID_CANDIDATES,
  deriveIdealGridCandidates,
  renderMatrixRaster,
  rotateBitMatrix,
  sampleIdealGrid,
  validateIdealFunctionPattern,
} from "../../src/index.js";
import { bits, buildMatrix } from "../helpers/symbol-fixture.mjs";

function boundsForSize(width, height = width) {
  return {
    left: 0,
    top: 0,
    right: width - 1,
    bottom: height - 1,
    width,
    height,
  };
}

function matrixFromRows(rows) {
  return BitMatrix.fromRows(rows.map((row) => [...row].map(Number)));
}

test("derives only exact version 1-84 grids in deterministic order", () => {
  assert.equal(DEFAULT_MAX_GRID_CANDIDATES, 12);
  assert.deepEqual(deriveIdealGridCandidates(boundsForSize(135)), [
    { version: 12, dimension: 45, moduleSize: 3 },
    { version: 3, dimension: 27, moduleSize: 5 },
  ]);
  assert.deepEqual(deriveIdealGridCandidates(boundsForSize(46)), [
    { version: 1, dimension: 23, moduleSize: 2 },
  ]);
});

test("rejects non-square, excessive, and malformed grid hypotheses", () => {
  assert.deepEqual(deriveIdealGridCandidates(boundsForSize(46, 47)), []);
  assert.throws(
    () => deriveIdealGridCandidates(boundsForSize(135), { maxGridCandidates: 1 }),
    (error) => error.code === "GRID_SAMPLING_FAILED",
  );
  assert.throws(() => deriveIdealGridCandidates({}), /bounds/);
  assert.throws(
    () => deriveIdealGridCandidates(boundsForSize(46), {
      minimumModuleSize: 3,
      maximumModuleSize: 2,
    }),
    /maximumModuleSize/,
  );
});

test("samples multiple interior pixels and resolves ties with the center", () => {
  const binary = new BitMatrix(4, 4);
  binary.set(0, 0).set(1, 0).set(0, 1);
  binary.set(2, 0).set(3, 1);
  binary.set(3, 3);
  const sampled = sampleIdealGrid(binary, boundsForSize(4), {
    dimension: 2,
    moduleSize: 2,
  });
  assert.deepEqual(sampled.toRows(), [[1, 1], [0, 0]]);
  assert.throws(
    () => sampleIdealGrid(binary, boundsForSize(3), { dimension: 2, moduleSize: 2 }),
    /exactly cover/,
  );
});

test("rotates rectangular matrices clockwise without mutating their source", () => {
  const source = matrixFromRows(["10", "00", "11"]);
  assert.deepEqual(rotateBitMatrix(source, 90).toRows(), [
    [1, 0, 1],
    [1, 0, 0],
  ]);
  assert.deepEqual(rotateBitMatrix(source, 180).toRows(), [
    [1, 1],
    [0, 0],
    [0, 1],
  ]);
  assert.deepEqual(source.toRows(), [[1, 0], [0, 0], [1, 1]]);
  assert.throws(() => rotateBitMatrix(source, 45), /rotationDegrees/);
});

test("selects and validates the version-specific fixed-pattern path", () => {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  const small = buildMatrix(payloadBits, 3, 0, 0);
  const aligned = buildMatrix(payloadBits, 4, 0, 0);
  assert.deepEqual(validateIdealFunctionPattern(small, 3), {
    matches: true,
    geometryPath: "corner-only",
    mismatches: 0,
  });
  assert.deepEqual(validateIdealFunctionPattern(aligned, 4), {
    matches: true,
    geometryPath: "alignment-assisted",
    mismatches: 0,
  });
  aligned.flip(0, 0);
  const damaged = validateIdealFunctionPattern(aligned, 4);
  assert.equal(damaged.matches, false);
  assert.equal(damaged.geometryPath, "alignment-assisted");
  assert.equal(damaged.mismatches, 1);
});

test("decodes representative small and alignment-pattern versions in every orientation", () => {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  for (const [version, level, mask] of [
    [1, 0, 0],
    [4, 1, 1],
    [17, 2, 2],
    [84, 3, 3],
  ]) {
    const matrix = buildMatrix(payloadBits, version, level, mask);
    for (const rotation of [0, 90, 180, 270]) {
      for (const inverted of [false, true]) {
        const moduleSize = 2;
        const quietZone = 3;
        const offsetX = 5;
        const offsetY = 7;
        const raster = renderMatrixRaster(matrix, {
          moduleSize,
          quietZone,
          offsetX,
          offsetY,
          width: offsetX + (matrix.width + 2 * quietZone) * moduleSize + 9,
          height: offsetY + (matrix.height + 2 * quietZone) * moduleSize + 7,
          rotation,
          inverted,
        });
        const result = decodeIdealRaster(raster);
        assert.equal(result.ok, true, `v${version} r${rotation} i${inverted}`);
        assert.equal(result.text, "7");
        assert.equal(result.version, version);
        assert.equal(result.errorCorrectionLevel, level);
        assert.equal(result.mask, mask);
        assert.equal(result.rotationDegrees, rotation);
        assert.equal(result.polarity, inverted ? "inverted" : "normal");
        assert.equal(result.moduleSize, moduleSize);
        assert.equal(result.erasuresUsed, 0);
        assert.equal(
          result.diagnostics.geometryPath,
          version <= 3 ? "corner-only" : "alignment-assisted",
        );
        assert.equal(result.diagnostics.fixedPatternMismatches, 0);
        assert.deepEqual(result.corners, [
          { x: 11, y: 13 },
          { x: 11 + matrix.width * 2, y: 13 },
          { x: 11 + matrix.width * 2, y: 13 + matrix.height * 2 },
          { x: 11, y: 13 + matrix.height * 2 },
        ]);
      }
    }
  }
});

test("decodes all M2 module scales and color formats", () => {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  const matrix = buildMatrix(payloadBits, 1, 0, 0);
  for (const moduleSize of [2, 3, 4, 8]) {
    for (const rotation of [0, 90, 180, 270]) {
      const result = decodeIdealRaster(renderMatrixRaster(matrix, {
        moduleSize,
        quietZone: 2,
        rotation,
      }));
      assert.equal(result.ok, true);
      assert.equal(result.moduleSize, moduleSize);
      assert.equal(result.rotationDegrees, rotation);
    }
  }

  for (const raster of [
    renderMatrixRaster(matrix, {
      moduleSize: 2,
      quietZone: 2,
      format: "rgb8",
      foreground: [20, 50, 80],
      background: [240, 245, 250],
    }),
    renderMatrixRaster(matrix, {
      moduleSize: 2,
      quietZone: 2,
      format: "rgba8",
      foreground: [20, 50, 80, 255],
      background: [255, 255, 255, 0],
    }),
  ]) {
    assert.equal(decodeIdealRaster(raster).ok, true);
  }
});

test("decodes all 1,344 coverage matrices from two-pixel rasters", () => {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  for (let version = 1; version <= 84; version += 1) {
    for (let level = 0; level <= 3; level += 1) {
      for (let mask = 0; mask <= 3; mask += 1) {
        const matrix = buildMatrix(payloadBits, version, level, mask);
        const raster = renderMatrixRaster(matrix, { moduleSize: 2, quietZone: 2 });
        const result = decodeIdealRaster(raster);
        assert.equal(result.ok, true, `version ${version}, level ${level}, mask ${mask}`);
        assert.equal(result.text, "7");
        assert.equal(result.version, version);
        assert.equal(result.errorCorrectionLevel, level);
        assert.equal(result.mask, mask);
        assert.equal(result.moduleSize, 2);
      }
    }
  }
});

test("returns stable failures for blank and non-grid rasters", () => {
  assert.deepEqual(decodeIdealRaster({
    width: 10,
    height: 10,
    data: new Uint8Array(100).fill(255),
  }), {
    ok: false,
    code: "NO_SYMBOL",
    message: "Raster has insufficient contrast for a Han Xin symbol",
  });

  const stripe = new Uint8Array(20 * 10).fill(255);
  for (let y = 2; y < 8; y += 1) {
    for (let x = 3; x < 17; x += 1) stripe[y * 20 + x] = 0;
  }
  const result = decodeIdealRaster({ width: 20, height: 10, data: stripe });
  assert.equal(result.ok, false);
  assert.equal(result.code, "GRID_SAMPLING_FAILED");
});

test("turns abort and timeout controls into stable decode failures", () => {
  const image = { width: 200, height: 200, data: new Uint8Array(40_000) };
  const controller = new AbortController();
  controller.abort();
  assert.equal(decodeIdealRaster(image, { signal: controller.signal }).code, "ABORTED");
  assert.equal(decodeIdealRaster(image, { timeoutMs: 0 }).code, "TIMEOUT");
});
