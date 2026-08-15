import assert from "node:assert/strict";

import {
  applyDataMask,
  BitReader,
  createFunctionPattern,
  encodeFunctionInformation,
  expandRsBlocks,
  joinRsBlocks,
  placeFunctionInformation,
  placePicketFenceCodewords,
  ReedSolomonCodec,
  rsBlockStructureFor,
  toPicketFenceOrder,
} from "../../src/core/index.js";

export function bits(value, width) {
  return value.toString(2).padStart(width, "0");
}

export function buildMatrix(
  payloadBits,
  version,
  errorCorrectionLevel,
  mask,
  damage = undefined,
) {
  const structure = rsBlockStructureFor(version, errorCorrectionLevel);
  assert.ok(payloadBits.length <= structure.dataBits);
  const information = BitReader.fromBitString(payloadBits.padEnd(structure.dataBits, "0")).bytes;
  const codec = new ReedSolomonCodec();
  let offset = 0;
  const blocks = expandRsBlocks(version, errorCorrectionLevel).map((descriptor) => {
    const data = information.slice(offset, offset + descriptor.dataCodewords);
    offset += descriptor.dataCodewords;
    return { codewords: codec.encode(data, descriptor.correctionCodewords) };
  });
  const sequential = joinRsBlocks(blocks, version, errorCorrectionLevel);
  if (damage) damage(sequential);
  const placed = toPicketFenceOrder(sequential);
  const unmasked = placePicketFenceCodewords(placed, version);
  const pattern = createFunctionPattern(version);
  const masked = applyDataMask(
    unmasked,
    mask,
    (row, column) => pattern.functionModules.data[row * pattern.dimension + column] !== 0,
  );
  return placeFunctionInformation(
    masked,
    encodeFunctionInformation({ version, errorCorrectionLevel, mask }),
  );
}
