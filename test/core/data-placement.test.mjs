import assert from "node:assert/strict";
import test from "node:test";

import {
  BitMatrix,
  createFunctionPattern,
  dataPlacementForVersion,
  placePicketFenceCodewords,
  readPicketFenceCodewords,
  rsBlockStructureFor,
} from "../../src/core/index.js";

test("partitions every non-function module exactly once in row-major order", () => {
  const observedRemainders = new Set();

  for (let version = 1; version <= 84; version += 1) {
    const pattern = createFunctionPattern(version);
    const placement = dataPlacementForVersion(version);
    const offsets = [...placement.codewordOffsets, ...placement.remainderOffsets];
    const expectedAvailable = pattern.dimension ** 2 - pattern.functionModules.count();

    assert.equal(offsets.length, expectedAvailable, `version ${version}`);
    assert.equal(new Set(offsets).size, offsets.length, `version ${version}`);
    assert.ok(offsets.every((offset, index) => index === 0 || offset > offsets[index - 1]));
    assert.ok(offsets.every((offset) => pattern.functionModules.data[offset] === 0));
    observedRemainders.add(placement.remainderBitCount);
  }

  assert.deepEqual([...observedRemainders].sort((a, b) => a - b), [1, 3, 5, 7]);
});

test("starts version 1 at the first available top-row modules", () => {
  const placement = dataPlacementForVersion(1);
  const coordinates = Array.from(placement.codewordOffsets.slice(0, 6), (offset) => ({
    row: Math.floor(offset / placement.dimension),
    column: offset % placement.dimension,
  }));

  assert.deepEqual(coordinates, [
    { row: 0, column: 9 },
    { row: 0, column: 10 },
    { row: 0, column: 11 },
    { row: 0, column: 12 },
    { row: 0, column: 13 },
    { row: 1, column: 9 },
  ]);
});

test("places and reads MSB-first codewords for every version", () => {
  for (let version = 1; version <= 84; version += 1) {
    const length = rsBlockStructureFor(version, 0).totalCodewords;
    const codewords = Uint8Array.from(
      { length },
      (_, index) => (index * 149 + version * 37) & 0xFF,
    );
    const matrix = placePicketFenceCodewords(codewords, version);
    assert.deepEqual(readPicketFenceCodewords(matrix, version), codewords);
  }
});

test("leaves all remainder modules light", () => {
  for (const version of [1, 4, 11, 24, 84]) {
    const placement = dataPlacementForVersion(version);
    const codewords = new Uint8Array(placement.totalCodewords).fill(0xFF);
    const matrix = placePicketFenceCodewords(codewords, version);
    assert.ok([...placement.remainderOffsets].every((offset) => matrix.data[offset] === 0));
  }
});

test("validates versions, matrix dimensions, and stream lengths", () => {
  assert.throws(() => dataPlacementForVersion(0), RangeError);
  assert.throws(() => dataPlacementForVersion(85), RangeError);
  assert.throws(() => readPicketFenceCodewords({}, 1), TypeError);
  assert.throws(() => readPicketFenceCodewords(new BitMatrix(25), 1), RangeError);
  assert.throws(() => placePicketFenceCodewords([], 1), TypeError);
  assert.throws(() => placePicketFenceCodewords(new Uint8Array(24), 1), RangeError);
});
