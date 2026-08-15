import assert from "node:assert/strict";
import test from "node:test";
import { BitMatrix } from "../../src/core/index.js";

test("BitMatrix stores, flips, clones, and exports modules", () => {
  const matrix = new BitMatrix(3, 2);
  matrix.set(0, 0).set(2, 1).flip(1, 0);

  assert.equal(matrix.get(0, 0), true);
  assert.equal(matrix.get(1, 0), true);
  assert.equal(matrix.get(1, 1), false);
  assert.equal(matrix.count(), 3);
  assert.deepEqual(matrix.toRows(), [[1, 1, 0], [0, 0, 1]]);

  const clone = matrix.clone();
  assert.equal(clone.equals(matrix), true);
  clone.flip(0, 0);
  assert.equal(clone.equals(matrix), false);
});

test("BitMatrix validates dimensions, rows, and coordinates", () => {
  assert.throws(() => new BitMatrix(0), RangeError);
  assert.throws(() => BitMatrix.fromRows([[1, 0], [1]]), RangeError);
  assert.throws(() => BitMatrix.fromRows([[1, 2]]), TypeError);
  assert.throws(() => new BitMatrix(2).get(2, 0), RangeError);
});
