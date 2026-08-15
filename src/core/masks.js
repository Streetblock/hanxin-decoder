import { BitMatrix } from "./bit-matrix.js";

export const HAN_XIN_MASKS = Object.freeze({
  NONE: 0,
  CHECKERBOARD: 1,
  MODULO_THREE: 2,
  RECIPROCAL_MODULO: 3,
});

function assertMask(mask) {
  if (!Number.isInteger(mask) || mask < 0 || mask > 3) {
    throw new RangeError("Han Xin mask must be 0, 1, 2, or 3");
  }
}

function assertCoordinate(name, coordinate) {
  if (!Number.isInteger(coordinate) || coordinate < 0) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

// GB/T 21049-2022 Table 14 defines i and j as one-based row/column
// coordinates. The public core uses conventional zero-based coordinates and
// converts them before evaluating the normative expressions.
export function isDataMaskModule(mask, row, column) {
  assertMask(mask);
  assertCoordinate("row", row);
  assertCoordinate("column", column);

  const i = row + 1;
  const j = column + 1;
  switch (mask) {
    case HAN_XIN_MASKS.NONE:
      return false;
    case HAN_XIN_MASKS.CHECKERBOARD:
      return (i + j) % 2 === 0;
    case HAN_XIN_MASKS.MODULO_THREE:
      return (((i + j) % 3) + (j % 3)) % 2 === 0;
    case HAN_XIN_MASKS.RECIPROCAL_MODULO:
      return ((i % j) + (j % i) + (i % 3) + (j % 3)) % 2 === 0;
    default:
      return false;
  }
}

export function applyDataMask(matrix, mask, isFunctionModule = () => false) {
  if (!(matrix instanceof BitMatrix)) {
    throw new TypeError("matrix must be a BitMatrix");
  }
  if (typeof isFunctionModule !== "function") {
    throw new TypeError("isFunctionModule must be a function");
  }
  assertMask(mask);

  const result = matrix.clone();
  for (let row = 0; row < matrix.height; row += 1) {
    for (let column = 0; column < matrix.width; column += 1) {
      if (!isFunctionModule(row, column) && isDataMaskModule(mask, row, column)) {
        result.flip(column, row);
      }
    }
  }
  return result;
}
