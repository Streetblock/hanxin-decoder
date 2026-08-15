import { BitMatrix } from "./bit-matrix.js";
import { createFunctionPattern } from "./function-pattern.js";
import { rsBlockStructureFor } from "./rs-block-table.js";

function totalCodewordsForVersion(version) {
  // Total symbol capacity is identical for L1-L4; level zero is sufficient.
  return rsBlockStructureFor(version, 0).totalCodewords;
}

function assertMatrixForVersion(matrix, version, dimension) {
  if (!(matrix instanceof BitMatrix)) {
    throw new TypeError("matrix must be a BitMatrix");
  }
  if (matrix.width !== dimension || matrix.height !== dimension) {
    throw new RangeError(
      `version ${version} requires a ${dimension}x${dimension} matrix`,
    );
  }
}

function assertPlacedCodewords(codewords, expectedLength) {
  if (!(codewords instanceof Uint8Array)) {
    throw new TypeError("placedCodewords must be a Uint8Array");
  }
  if (codewords.length !== expectedLength) {
    throw new RangeError(
      `placedCodewords must contain exactly ${expectedLength} codewords`,
    );
  }
}

/**
 * Returns row-major matrix offsets for the placed codeword bits and the
 * trailing remainder bits. The caller owns both typed arrays.
 */
export function dataPlacementForVersion(version) {
  const pattern = createFunctionPattern(version);
  const totalCodewords = totalCodewordsForVersion(version);
  const codewordBitCount = totalCodewords * 8;
  const availableCount = pattern.dimension ** 2 - pattern.functionModules.count();
  const remainderBitCount = availableCount - codewordBitCount;

  if (remainderBitCount < 0) {
    throw new Error(`internal error: version ${version} has insufficient data modules`);
  }

  const codewordOffsets = new Uint16Array(codewordBitCount);
  const remainderOffsets = new Uint16Array(remainderBitCount);
  let codewordIndex = 0;
  let remainderIndex = 0;

  for (let offset = 0; offset < pattern.functionModules.data.length; offset += 1) {
    if (pattern.functionModules.data[offset] !== 0) continue;
    if (codewordIndex < codewordBitCount) {
      codewordOffsets[codewordIndex] = offset;
      codewordIndex += 1;
    } else {
      remainderOffsets[remainderIndex] = offset;
      remainderIndex += 1;
    }
  }

  if (codewordIndex !== codewordBitCount || remainderIndex !== remainderBitCount) {
    throw new Error(`internal error: incomplete data placement for version ${version}`);
  }

  return Object.freeze({
    version,
    dimension: pattern.dimension,
    totalCodewords,
    codewordBitCount,
    remainderBitCount,
    codewordOffsets,
    remainderOffsets,
  });
}

/** Reads the matrix stream in its normative stride-13 (picket-fence) order. */
export function readPicketFenceCodewords(matrix, version) {
  const placement = dataPlacementForVersion(version);
  assertMatrixForVersion(matrix, version, placement.dimension);

  const codewords = new Uint8Array(placement.totalCodewords);
  for (let bitIndex = 0; bitIndex < placement.codewordBitCount; bitIndex += 1) {
    if (matrix.data[placement.codewordOffsets[bitIndex]] !== 0) {
      codewords[bitIndex >>> 3] |= 0x80 >>> (bitIndex & 7);
    }
  }
  return codewords;
}

/**
 * Places a complete stride-13 codeword stream into an otherwise fixed symbol
 * template. Remainder and not-yet-set function-information modules stay light.
 */
export function placePicketFenceCodewords(placedCodewords, version) {
  const placement = dataPlacementForVersion(version);
  assertPlacedCodewords(placedCodewords, placement.totalCodewords);

  const pattern = createFunctionPattern(version);
  const matrix = pattern.modules.clone();
  for (let bitIndex = 0; bitIndex < placement.codewordBitCount; bitIndex += 1) {
    const value = (placedCodewords[bitIndex >>> 3] & (0x80 >>> (bitIndex & 7))) !== 0;
    if (value) {
      const offset = placement.codewordOffsets[bitIndex];
      matrix.data[offset] = 1;
    }
  }
  return matrix;
}
