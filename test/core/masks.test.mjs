import assert from "node:assert/strict";
import test from "node:test";
import {
  BitMatrix,
  createFunctionPattern,
  HAN_XIN_MASKS,
  applyDataMask,
  isDataMaskModule,
} from "../../src/core/index.js";

test("evaluates the four Table 14 mask expressions using zero-based API coordinates", () => {
  assert.equal(isDataMaskModule(HAN_XIN_MASKS.NONE, 0, 0), false);

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const i = row + 1;
      const j = column + 1;
      assert.equal(
        isDataMaskModule(HAN_XIN_MASKS.CHECKERBOARD, row, column),
        (i + j) % 2 === 0,
      );
      assert.equal(
        isDataMaskModule(HAN_XIN_MASKS.MODULO_THREE, row, column),
        (((i + j) % 3) + (j % 3)) % 2 === 0,
      );
      assert.equal(
        isDataMaskModule(HAN_XIN_MASKS.RECIPROCAL_MODULO, row, column),
        ((i % j) + (j % i) + (i % 3) + (j % 3)) % 2 === 0,
      );
    }
  }
});

test("all masks preserve the complete version 84 function pattern", () => {
  const pattern = createFunctionPattern(84);
  const original = new BitMatrix(pattern.dimension).fill(true);

  for (let mask = 0; mask <= 3; mask += 1) {
    const masked = applyDataMask(original, mask, pattern.isFunctionModule);
    for (let row = 0; row < pattern.dimension; row += 1) {
      for (let column = 0; column < pattern.dimension; column += 1) {
        if (pattern.isFunctionModule(row, column)) {
          assert.equal(masked.get(column, row), true);
        }
      }
    }
    assert.equal(
      applyDataMask(masked, mask, pattern.isFunctionModule).equals(original),
      true,
    );
  }
});

test("masking is its own inverse and leaves function modules untouched", () => {
  const original = BitMatrix.fromRows([
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 1, 0, 0],
    [0, 0, 1, 1],
  ]);
  const isFunction = (row, column) => row === 0 || column === 0;

  for (let mask = 0; mask <= 3; mask += 1) {
    const masked = applyDataMask(original, mask, isFunction);
    const restored = applyDataMask(masked, mask, isFunction);
    assert.equal(restored.equals(original), true);
    for (let coordinate = 0; coordinate < 4; coordinate += 1) {
      assert.equal(masked.get(coordinate, 0), original.get(coordinate, 0));
      assert.equal(masked.get(0, coordinate), original.get(0, coordinate));
    }
  }
});
