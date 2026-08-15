import test from "node:test";
import assert from "node:assert/strict";

import { BitMatrix, renderMatrixRaster } from "../../src/index.js";
import { validateRasterImage } from "../../src/vision/raster-image.js";
import { ANNEX_F_MATRIX_ROWS } from "../fixtures/annex-f-matrices.mjs";
import { bits, buildMatrix } from "../helpers/symbol-fixture.mjs";

function matrixFromRows(rows) {
  return BitMatrix.fromRows(rows.map((row) => [...row].map(Number)));
}

function grayRows(image) {
  const rows = [];
  for (let y = 0; y < image.height; y += 1) {
    rows.push(Array.from(image.data.subarray(y * image.width, (y + 1) * image.width)));
  }
  return rows;
}

test("renders modules with an exact quiet zone and module size", () => {
  const image = renderMatrixRaster(matrixFromRows(["10", "01"]), {
    moduleSize: 2,
    quietZone: 1,
  });

  assert.deepEqual(validateRasterImage(image), {
    width: 8,
    height: 8,
    pixelCount: 64,
    channels: 1,
    format: "gray8",
  });
  assert.equal(image.data[0], 255);
  assert.equal(image.data[2 * image.width + 2], 0);
  assert.equal(image.data[2 * image.width + 4], 255);
  assert.equal(image.data[4 * image.width + 4], 0);
});

test("applies clockwise rotations to rectangular matrices", () => {
  const matrix = matrixFromRows(["10", "00", "11"]);
  const expected = new Map([
    [0, [[0, 255], [255, 255], [0, 0]]],
    [90, [[0, 255, 0], [0, 255, 255]]],
    [180, [[0, 0], [255, 255], [255, 0]]],
    [270, [[255, 255, 0], [0, 255, 0]]],
  ]);

  for (const [rotation, rows] of expected) {
    assert.deepEqual(grayRows(renderMatrixRaster(matrix, { rotation })), rows);
  }
});

test("inversion swaps the complete foreground and background", () => {
  const image = renderMatrixRaster(matrixFromRows(["1"]), {
    quietZone: 1,
    inverted: true,
  });
  assert.deepEqual(grayRows(image), [
    [0, 0, 0],
    [0, 255, 0],
    [0, 0, 0],
  ]);
});

test("supports RGB colors, offsets, and a larger target canvas", () => {
  const image = renderMatrixRaster(matrixFromRows(["1"]), {
    format: "rgb8",
    foreground: [10, 20, 30],
    background: [240, 230, 220],
    offsetX: 2,
    offsetY: 1,
    width: 5,
    height: 4,
  });
  assert.deepEqual(Array.from(image.data.subarray(0, 3)), [240, 230, 220]);
  const moduleOffset = (1 * image.width + 2) * 3;
  assert.deepEqual(Array.from(image.data.subarray(moduleOffset, moduleOffset + 3)), [10, 20, 30]);
  assert.equal(validateRasterImage(image).format, "rgb8");
});

test("supports transparent RGBA backgrounds", () => {
  const image = renderMatrixRaster(matrixFromRows(["1"]), {
    format: "rgba8",
    quietZone: 1,
    foreground: [1, 2, 3, 255],
    background: [250, 251, 252, 0],
  });
  assert.deepEqual(Array.from(image.data.subarray(0, 4)), [250, 251, 252, 0]);
  const center = (image.width + 1) * 4;
  assert.deepEqual(Array.from(image.data.subarray(center, center + 4)), [1, 2, 3, 255]);
});

test("renders the three Annex F matrices deterministically across the M2 scale corpus", () => {
  for (const rows of ANNEX_F_MATRIX_ROWS) {
    const matrix = matrixFromRows(rows);
    for (const moduleSize of [2, 3, 4, 8]) {
      for (const rotation of [0, 90, 180, 270]) {
        const options = { moduleSize, quietZone: 4, rotation };
        const first = renderMatrixRaster(matrix, options);
        const second = renderMatrixRaster(matrix, options);
        const expectedDimension = (matrix.width + 8) * moduleSize;
        assert.equal(first.width, expectedDimension);
        assert.equal(first.height, expectedDimension);
        assert.deepEqual(first.data, second.data);

        let darkPixels = 0;
        for (const value of first.data) darkPixels += value === 0 ? 1 : 0;
        assert.equal(darkPixels, matrix.count() * moduleSize ** 2);
      }
    }
  }
});

test("renders all 1,344 version, level, and mask coverage matrices", () => {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  for (let version = 1; version <= 84; version += 1) {
    for (let level = 0; level <= 3; level += 1) {
      for (let mask = 0; mask <= 3; mask += 1) {
        const matrix = buildMatrix(payloadBits, version, level, mask);
        const image = renderMatrixRaster(matrix, { moduleSize: 2, quietZone: 4 });
        const expectedDimension = (matrix.width + 8) * 2;
        assert.equal(image.width, expectedDimension);
        assert.equal(image.height, expectedDimension);
        assert.equal(image.data.length, expectedDimension ** 2);
      }
    }
  }
});

test("rejects invalid renderer options before allocation", () => {
  const matrix = matrixFromRows(["1"]);
  assert.throws(() => renderMatrixRaster({}), /BitMatrix/);
  assert.throws(() => renderMatrixRaster(matrix, { moduleSize: 0 }), /moduleSize/);
  assert.throws(() => renderMatrixRaster(matrix, { quietZone: -1 }), /quietZone/);
  assert.throws(() => renderMatrixRaster(matrix, { rotation: 45 }), /rotation/);
  assert.throws(() => renderMatrixRaster(matrix, { format: "cmyk" }), /format/);
  assert.throws(() => renderMatrixRaster(matrix, { format: "rgb8", foreground: [0] }), /foreground/);
  assert.throws(() => renderMatrixRaster(matrix, { width: 0 }), /width/);
  assert.throws(
    () => renderMatrixRaster(matrix, { offsetX: 2, width: 2 }),
    /too small/,
  );
});
