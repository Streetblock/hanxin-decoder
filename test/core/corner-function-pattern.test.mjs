import assert from "node:assert/strict";
import test from "node:test";

import {
  createCornerFunctionPattern,
  functionInformationCoordinates,
  rsBlockStructureFor,
} from "../../src/core/index.js";

const TOP_LEFT = [
  "1111111",
  "1000000",
  "1011111",
  "1010000",
  "1010111",
  "1010111",
  "1010111",
];

function rotateClockwise(rows) {
  return rows.map((_, row) => (
    rows.map((source, column) => source[row]).reverse().join("")
  ));
}

function readSquare(matrix, originColumn, originRow, size) {
  return Array.from({ length: size }, (_, row) => (
    Array.from({ length: size }, (_, column) => (
      matrix.get(originColumn + column, originRow + row) ? "1" : "0"
    )).join("")
  ));
}

test("places the four normatively oriented 7x7 finder patterns", () => {
  const { dimension, modules } = createCornerFunctionPattern(1);
  const clockwise = rotateClockwise(TOP_LEFT);
  const halfTurn = rotateClockwise(clockwise);

  assert.deepEqual(readSquare(modules, 0, 0, 7), TOP_LEFT);
  assert.deepEqual(readSquare(modules, dimension - 7, 0, 7), clockwise);
  assert.deepEqual(readSquare(modules, 0, dimension - 7, 7), clockwise);
  assert.deepEqual(readSquare(modules, dimension - 7, dimension - 7, 7), halfTurn);
});

test("reserves light one-module separators around every finder", () => {
  const { dimension, modules, functionModules } = createCornerFunctionPattern(84);
  const far = dimension - 8;
  const coordinates = [];
  for (let offset = 0; offset < 8; offset += 1) {
    coordinates.push(
      [offset, 7], [7, offset],
      [dimension - 1 - offset, 7], [far, offset],
      [offset, far], [7, dimension - 1 - offset],
      [dimension - 1 - offset, far], [far, dimension - 1 - offset],
    );
  }

  for (const [column, row] of coordinates) {
    assert.equal(functionModules.get(column, row), true);
    assert.equal(modules.get(column, row), false);
  }
});

test("reserves both 34-module function-information copies", () => {
  for (const version of [1, 4, 24, 84]) {
    const pattern = createCornerFunctionPattern(version);
    const coordinates = functionInformationCoordinates(pattern.dimension);
    const flattened = [...coordinates.primary, ...coordinates.secondary];
    assert.equal(flattened.length, 68);
    assert.equal(new Set(flattened.map(({ column, row }) => `${column},${row}`)).size, 68);
    assert.ok(flattened.every(({ column, row }) => (
      pattern.functionModules.get(column, row)
    )));
  }
});

test("contains exactly 324 corner function modules for every version", () => {
  for (let version = 1; version <= 84; version += 1) {
    const pattern = createCornerFunctionPattern(version);
    assert.equal(pattern.functionModules.count(), 324);
  }
});

test("is the complete function map for versions 1 through 3", () => {
  for (let version = 1; version <= 3; version += 1) {
    const pattern = createCornerFunctionPattern(version);
    const available = pattern.dimension ** 2 - pattern.functionModules.count();
    const codewordBits = rsBlockStructureFor(version, 0).totalCodewords * 8;
    assert.equal(available - codewordBits, 5);
  }
});

test("provides a row-column predicate suitable for masking", () => {
  const pattern = createCornerFunctionPattern(1);
  assert.equal(pattern.isFunctionModule(0, 0), true);
  assert.equal(pattern.isFunctionModule(10, 10), false);
  assert.equal(pattern.isFunctionModule(-1, 0), false);
  assert.equal(pattern.isFunctionModule(0, pattern.dimension), false);
});
