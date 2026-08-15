import assert from "node:assert/strict";
import test from "node:test";

import {
  createCornerFunctionPattern,
  createFunctionPattern,
  rsBlockStructureFor,
} from "../../src/core/index.js";

function assertModule(pattern, column, row, value) {
  assert.equal(pattern.functionModules.get(column, row), true, `reserved (${column}, ${row})`);
  assert.equal(pattern.modules.get(column, row), value, `value (${column}, ${row})`);
}

test("is identical to the corner-only template for versions 1 through 3", () => {
  for (let version = 1; version <= 3; version += 1) {
    const complete = createFunctionPattern(version);
    const corners = createCornerFunctionPattern(version);
    assert.equal(complete.modules.equals(corners.modules), true);
    assert.equal(complete.functionModules.equals(corners.functionModules), true);
  }
});

test("places the version 4 alignment borders and clipped assistant patterns", () => {
  const pattern = createFunctionPattern(4);

  // Clipped assistant patterns at the top and right symbol boundaries.
  assertModule(pattern, 14, 0, true);
  assertModule(pattern, 13, 1, false);
  assertModule(pattern, 28, 14, true);
  assertModule(pattern, 27, 13, false);

  // The alternating alignment border anchored at the central boundary.
  assertModule(pattern, 14, 14, true);
  assertModule(pattern, 0, 14, true);
  assertModule(pattern, 14, 27, true);
  assertModule(pattern, 13, 28, false);
  assertModule(pattern, 19, 28, true);
});

test("places representative even- and odd-m assistant patterns", () => {
  const version11 = createFunctionPattern(11); // m = 2, boundaries 0, 14, 28, 42
  assertModule(version11, 0, 14, true);
  assertModule(version11, 42, 14, true);
  assertModule(version11, 28, 0, true);
  assertModule(version11, 28, 42, true);

  const version24 = createFunctionPattern(24); // m = 3, boundaries 0, 17, 34, 51, 68
  assertModule(version24, 0, 34, true);
  assertModule(version24, 68, 17, true);
  assertModule(version24, 51, 0, true);
  assertModule(version24, 34, 68, true);
});

test("reserves enough data modules for every version and level", () => {
  for (let version = 1; version <= 84; version += 1) {
    const pattern = createFunctionPattern(version);
    const available = pattern.dimension ** 2 - pattern.functionModules.count();

    for (let level = 0; level < 4; level += 1) {
      const codewordBits = rsBlockStructureFor(version, level).totalCodewords * 8;
      assert.ok(available >= codewordBits, `version ${version}, level ${level + 1}`);
    }
  }
});

test("has stable complete-function-module counts at representative versions", () => {
  assert.deepEqual(
    [4, 11, 24, 84].map((version) => createFunctionPattern(version).functionModules.count()),
    [402, 560, 874, 4630],
  );
});

test("leaves only the normative odd remainder-bit counts", () => {
  const remainderCounts = new Set();
  for (let version = 1; version <= 84; version += 1) {
    const pattern = createFunctionPattern(version);
    const available = pattern.dimension ** 2 - pattern.functionModules.count();
    const codewordBits = rsBlockStructureFor(version, 0).totalCodewords * 8;
    remainderCounts.add(available - codewordBits);
  }
  assert.deepEqual([...remainderCounts].sort((a, b) => a - b), [1, 3, 5, 7]);
});

test("returns a complete row-column function-module predicate", () => {
  const pattern = createFunctionPattern(84);
  assert.equal(pattern.isFunctionModule(0, 0), true);
  assert.equal(pattern.isFunctionModule(17, 171), true);
  assert.equal(pattern.isFunctionModule(100, 100), false);
});
