import { InvalidFunctionInformationError } from "./errors.js";
import { HAN_XIN_GF16 } from "./gf16.js";
import { BitMatrix } from "./bit-matrix.js";
import { ReedSolomonCodec } from "./reed-solomon.js";
import {
  MAX_HAN_XIN_VERSION,
  MIN_HAN_XIN_VERSION,
  versionForDimension,
} from "./version.js";

export const HAN_XIN_ERROR_CORRECTION_LEVELS = Object.freeze({
  L1: 0,
  L2: 1,
  L3: 2,
  L4: 3,
});

const FUNCTION_INFO_DATA_SYMBOLS = 3;
const FUNCTION_INFO_CORRECTION_SYMBOLS = 4;
const FUNCTION_INFO_SYMBOLS = FUNCTION_INFO_DATA_SYMBOLS + FUNCTION_INFO_CORRECTION_SYMBOLS;
const FUNCTION_INFO_RS_BITS = FUNCTION_INFO_SYMBOLS * 4;
const FUNCTION_INFO_FILLER_BITS = 6;
const FUNCTION_INFO_COPY_BITS = FUNCTION_INFO_RS_BITS + FUNCTION_INFO_FILLER_BITS;
const functionInfoCodec = new ReedSolomonCodec({ field: HAN_XIN_GF16, generatorBase: 1 });

function assertVersion(version) {
  if (!Number.isInteger(version)
    || version < MIN_HAN_XIN_VERSION
    || version > MAX_HAN_XIN_VERSION) {
    throw new RangeError(
      `Han Xin version must be an integer from ${MIN_HAN_XIN_VERSION} to ${MAX_HAN_XIN_VERSION}`,
    );
  }
}

function assertTwoBitValue(name, value) {
  if (!Number.isInteger(value) || value < 0 || value > 3) {
    throw new RangeError(`${name} must be an integer from 0 to 3`);
  }
}

function assertFunctionInfoCodewords(codewords) {
  if (!(codewords instanceof Uint8Array) || codewords.length !== FUNCTION_INFO_SYMBOLS) {
    throw new TypeError("function information must contain seven GF(16) codewords");
  }
}

// Annex G stores version + 20 in the leading eight bits, followed by the
// two-bit error-correction level and two-bit mask number.
export function encodeFunctionInformation({ version, errorCorrectionLevel, mask }) {
  assertVersion(version);
  assertTwoBitValue("errorCorrectionLevel", errorCorrectionLevel);
  assertTwoBitValue("mask", mask);

  const value = ((version + 20) << 4) | (errorCorrectionLevel << 2) | mask;
  const informationCodewords = Uint8Array.of(
    (value >>> 8) & 0x0f,
    (value >>> 4) & 0x0f,
    value & 0x0f,
  );
  return functionInfoCodec.encode(informationCodewords, FUNCTION_INFO_CORRECTION_SYMBOLS);
}

export function decodeFunctionInformation(receivedCodewords) {
  assertFunctionInfoCodewords(receivedCodewords);

  const decoded = functionInfoCodec.decode(
    receivedCodewords,
    FUNCTION_INFO_CORRECTION_SYMBOLS,
  );
  const [high, low, settings] = decoded.codewords;
  const version = ((high << 4) | low) - 20;
  if (version < MIN_HAN_XIN_VERSION || version > MAX_HAN_XIN_VERSION) {
    throw new InvalidFunctionInformationError(
      `corrected function information contains invalid version ${version}`,
    );
  }

  return {
    version,
    errorCorrectionLevel: settings >>> 2,
    mask: settings & 0b11,
    correctedErrors: decoded.correctedErrors,
    codewords: decoded.codewords,
  };
}

export function functionInformationToBits(codewords) {
  assertFunctionInfoCodewords(codewords);
  const bits = new Uint8Array(FUNCTION_INFO_RS_BITS);
  for (let symbol = 0; symbol < codewords.length; symbol += 1) {
    HAN_XIN_GF16.assertElement("function information codeword", codewords[symbol]);
    for (let bit = 0; bit < 4; bit += 1) {
      bits[symbol * 4 + bit] = (codewords[symbol] >>> (3 - bit)) & 1;
    }
  }
  return bits;
}

export function bitsToFunctionInformation(bits) {
  if (!(bits instanceof Uint8Array) || bits.length !== FUNCTION_INFO_RS_BITS) {
    throw new TypeError("function information bit stream must contain 28 bits");
  }
  const codewords = new Uint8Array(FUNCTION_INFO_SYMBOLS);
  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] !== 0 && bits[index] !== 1) {
      throw new RangeError("function information bits must be zero or one");
    }
    codewords[index >>> 2] = (codewords[index >>> 2] << 1) | bits[index];
  }
  return codewords;
}

function assertMatrix(matrix) {
  if (!(matrix instanceof BitMatrix) || matrix.width !== matrix.height) {
    throw new TypeError("matrix must be a square BitMatrix");
  }
  versionForDimension(matrix.width);
}

function coordinate(column, row) {
  return Object.freeze({ column, row });
}

// Each 34-bit copy is split over two 17-module L-shaped regions. Bit 8 and
// bit 25 occupy the corner module shared by the two arms of their L shape.
export function functionInformationCoordinates(dimension) {
  versionForDimension(dimension);
  const near = 8;
  const far = dimension - 9;
  const primary = [];
  const secondary = [];

  for (let index = 0; index <= 8; index += 1) {
    primary.push(coordinate(index, near));
    secondary.push(coordinate(dimension - 1 - index, far));
  }
  for (let index = 1; index <= 8; index += 1) {
    primary.push(coordinate(near, near - index));
    secondary.push(coordinate(far, far + index));
  }
  for (let index = 0; index <= 8; index += 1) {
    primary.push(coordinate(far, index));
    secondary.push(coordinate(near, dimension - 1 - index));
  }
  for (let index = 1; index <= 8; index += 1) {
    primary.push(coordinate(far + index, near));
    secondary.push(coordinate(near - index, far));
  }

  return Object.freeze({
    primary: Object.freeze(primary),
    secondary: Object.freeze(secondary),
  });
}

function buildFunctionInformationCopy(codewords, fillerBits) {
  if (!(fillerBits instanceof Uint8Array) || fillerBits.length !== FUNCTION_INFO_FILLER_BITS) {
    throw new TypeError("function information filler must contain six bits");
  }
  const bits = new Uint8Array(FUNCTION_INFO_COPY_BITS);
  bits.set(functionInformationToBits(codewords));
  for (let index = 0; index < fillerBits.length; index += 1) {
    if (fillerBits[index] !== 0 && fillerBits[index] !== 1) {
      throw new RangeError("function information filler bits must be zero or one");
    }
    bits[FUNCTION_INFO_RS_BITS + index] = fillerBits[index];
  }
  return bits;
}

export function placeFunctionInformation(
  matrix,
  codewords,
  fillerBits = new Uint8Array(FUNCTION_INFO_FILLER_BITS),
) {
  assertMatrix(matrix);
  const copyBits = buildFunctionInformationCopy(codewords, fillerBits);
  const coordinates = functionInformationCoordinates(matrix.width);
  const result = matrix.clone();

  for (const copy of [coordinates.primary, coordinates.secondary]) {
    for (let index = 0; index < FUNCTION_INFO_COPY_BITS; index += 1) {
      const { column, row } = copy[index];
      result.set(column, row, copyBits[index]);
    }
  }
  return result;
}

export function readFunctionInformationCopies(matrix) {
  assertMatrix(matrix);
  const coordinates = functionInformationCoordinates(matrix.width);
  const readCopy = (copy) => Uint8Array.from(
    copy,
    ({ column, row }) => Number(matrix.get(column, row)),
  );
  return {
    primary: readCopy(coordinates.primary),
    secondary: readCopy(coordinates.secondary),
  };
}

function decodeFunctionInformationCopy(bits) {
  return decodeFunctionInformation(
    bitsToFunctionInformation(bits.slice(0, FUNCTION_INFO_RS_BITS)),
  );
}

function sameFunctionInformation(left, right) {
  return left.version === right.version
    && left.errorCorrectionLevel === right.errorCorrectionLevel
    && left.mask === right.mask;
}

export function decodeFunctionInformationFromMatrix(matrix) {
  const copies = readFunctionInformationCopies(matrix);
  let primary;
  let secondary;
  let primaryError;
  let secondaryError;

  try {
    primary = decodeFunctionInformationCopy(copies.primary);
  } catch (error) {
    primaryError = error;
  }
  try {
    secondary = decodeFunctionInformationCopy(copies.secondary);
  } catch (error) {
    secondaryError = error;
  }

  if (primary && secondary && !sameFunctionInformation(primary, secondary)) {
    throw new InvalidFunctionInformationError(
      "the two function-information copies decode to different symbol parameters",
    );
  }
  if (!primary && !secondary) {
    throw new InvalidFunctionInformationError(
      "neither function-information copy is decodable",
      { cause: primaryError ?? secondaryError },
    );
  }

  const selected = primary ?? secondary;
  return {
    ...selected,
    source: primary && secondary ? "both" : primary ? "primary" : "secondary",
    copyCorrections: {
      primary: primary?.correctedErrors ?? null,
      secondary: secondary?.correctedErrors ?? null,
    },
  };
}

export function isFunctionInformationModule(dimension, row, column) {
  versionForDimension(dimension);
  if (!Number.isInteger(row) || !Number.isInteger(column)
    || row < 0 || column < 0 || row >= dimension || column >= dimension) {
    return false;
  }
  const near = 8;
  const far = dimension - 9;
  const inCornerRange = (value) => value <= near || value >= far;
  return (row === near && inCornerRange(column))
    || (row === far && inCornerRange(column))
    || (column === near && inCornerRange(row))
    || (column === far && inCornerRange(row));
}
