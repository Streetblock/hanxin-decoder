import assert from "node:assert/strict";
import test from "node:test";
import { dimensionForVersion, versionForDimension } from "../../src/core/index.js";

test("maps all 84 Han Xin versions to their odd symbol dimensions", () => {
  for (let version = 1; version <= 84; version += 1) {
    const dimension = dimensionForVersion(version);
    assert.equal(dimension, 2 * version + 21);
    assert.equal(versionForDimension(dimension), version);
  }
  assert.equal(dimensionForVersion(1), 23);
  assert.equal(dimensionForVersion(27), 75);
  assert.equal(dimensionForVersion(58), 137);
  assert.equal(dimensionForVersion(84), 189);
});

test("rejects versions and dimensions outside the standard", () => {
  for (const version of [0, 85, 1.5]) {
    assert.throws(() => dimensionForVersion(version), RangeError);
  }
  for (const dimension of [21, 24, 190]) {
    assert.throws(() => versionForDimension(dimension), RangeError);
  }
});
