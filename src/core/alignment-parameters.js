import {
  MAX_HAN_XIN_VERSION,
  MIN_HAN_XIN_VERSION,
  dimensionForVersion,
} from "./version.js";

// GB/T 21049-2022 Table A.1. A null value represents the dash printed in the
// normative table. For versions 4-10, k is not printed because with m = 1 it
// is derivable as symbol dimension - r.
const R_VALUES = [
  null, null, null, 15, 15, 17, 18, 19, 20, 21,
  15, 15, 15, 17, 17, 19, 19, 19, 19, 21,
  21, 17, 16, 18, 17, 19, 18, 20, 19, 21,
  20, 17, 19, 17, 19, 17, 19, 21, 19, 21,
  18, 20, 17, 19, 21, 18, 20, 22, 17, 19,
  15, 17, 19, 21, 17, 19, 21, 18, 20, 15,
  17, 19, 21, 16, 18, 17, 19, 21, 15, 17,
  19, 21, 15, 17, 18, 20, 22, 15, 17, 19,
  21, 23, 17, 19,
];

const K_VALUES = [
  null, null, null, null, null, null, null, null, null, null,
  14, 15, 16, 16, 17, 17, 18, 19, 20, 20,
  21, 16, 17, 17, 18, 18, 19, 19, 20, 20,
  21, 17, 17, 18, 18, 19, 19, 19, 20, 20,
  17, 17, 18, 18, 18, 19, 19, 19, 17, 17,
  18, 18, 18, 18, 19, 19, 19, 17, 17, 18,
  18, 18, 18, 19, 19, 17, 17, 17, 18, 18,
  18, 18, 19, 19, 17, 17, 17, 18, 18, 18,
  18, 18, 17, 17,
];

const M_VALUES = [
  null, null, null, 1, 1, 1, 1, 1, 1, 1,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  2, 3, 3, 3, 3, 3, 3, 3, 3, 3,
  3, 4, 4, 4, 4, 4, 4, 4, 4, 4,
  5, 5, 5, 5, 5, 5, 5, 5, 6, 6,
  6, 6, 6, 6, 6, 6, 6, 7, 7, 7,
  7, 7, 7, 7, 7, 8, 8, 8, 8, 8,
  8, 8, 8, 8, 9, 9, 9, 9, 9, 9,
  9, 9, 10, 10,
];

if (R_VALUES.length !== MAX_HAN_XIN_VERSION
  || K_VALUES.length !== MAX_HAN_XIN_VERSION
  || M_VALUES.length !== MAX_HAN_XIN_VERSION) {
  throw new Error("internal error: incomplete Han Xin alignment parameter table");
}

export const HAN_XIN_ALIGNMENT_PARAMETERS = Object.freeze(
  R_VALUES.map((r, index) => Object.freeze({
    version: index + 1,
    dimension: dimensionForVersion(index + 1),
    r,
    k: K_VALUES[index],
    m: M_VALUES[index],
  })),
);

export function alignmentParametersForVersion(version) {
  if (!Number.isInteger(version)
    || version < MIN_HAN_XIN_VERSION
    || version > MAX_HAN_XIN_VERSION) {
    throw new RangeError(
      `Han Xin version must be an integer from ${MIN_HAN_XIN_VERSION} to ${MAX_HAN_XIN_VERSION}`,
    );
  }
  return HAN_XIN_ALIGNMENT_PARAMETERS[version - 1];
}

export function alignmentRegionSpansForVersion(version) {
  const parameters = alignmentParametersForVersion(version);
  if (parameters.m === null) return Object.freeze([]);

  const repeatedSpan = parameters.k ?? parameters.dimension - parameters.r;
  return Object.freeze([
    ...new Array(parameters.m).fill(repeatedSpan),
    parameters.r - 1,
  ]);
}
