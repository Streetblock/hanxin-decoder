import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDataMask,
  BitReader,
  createFunctionPattern,
  decodeMatrix,
  encodeFunctionInformation,
  expandRsBlocks,
  joinRsBlocks,
  placeFunctionInformation,
  placePicketFenceCodewords,
  ReedSolomonCodec,
  rsBlockStructureFor,
  symbologyIdentifierForPayload,
  toPicketFenceOrder,
} from "../../src/core/index.js";

function bits(value, width) {
  return value.toString(2).padStart(width, "0");
}

function buildMatrix(payloadBits, version, errorCorrectionLevel, mask, damage = undefined) {
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

test("decodes normalized matrices through function info, mask, RS, and payload", () => {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  for (const [version, level, mask] of [
    [1, 0, 0],
    [4, 1, 1],
    [11, 2, 2],
    [24, 3, 3],
  ]) {
    const result = decodeMatrix(buildMatrix(payloadBits, version, level, mask));
    assert.equal(result.ok, true);
    assert.equal(result.text, "7");
    assert.deepEqual(result.bytes, Uint8Array.of(0x37));
    assert.equal(result.version, version);
    assert.equal(result.dimension, 2 * version + 21);
    assert.equal(result.errorCorrectionLevel, level);
    assert.equal(result.errorLevel, `L${level + 1}`);
    assert.equal(result.mask, mask);
    assert.equal(result.correctedCodewords, 0);
    assert.equal(result.symbologyIdentifier, "]h0");
  }
});

test("corrects codeword damage in the complete matrix pipeline", () => {
  const payloadBits = `0010${bits(10, 6)}${bits(63, 6)}`;
  const matrix = buildMatrix(payloadBits, 5, 3, 2, (codewords) => {
    codewords[0] ^= 0x55;
    codewords[3] ^= 0xA7;
  });
  const result = decodeMatrix(matrix);
  assert.equal(result.text, "A");
  assert.equal(result.correctedCodewords, 2);
});

test("rejects a dimension that contradicts valid function information", () => {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  const matrix = buildMatrix(payloadBits, 2, 0, 0);
  const conflicting = placeFunctionInformation(
    matrix,
    encodeFunctionInformation({ version: 1, errorCorrectionLevel: 0, mask: 0 }),
  );
  assert.throws(
    () => decodeMatrix(conflicting),
    (error) => error.code === "FUNCTION_INFO_INVALID",
  );
});

test("derives every Annex K symbology identifier modifier", () => {
  for (const [flags, expected] of [
    [{}, "]h0"],
    [{ eciUsed: true }, "]h1"],
    [{ gs1: true }, "]h2"],
    [{ uri: true }, "]h4"],
    [{ unicode: true }, "]h8"],
  ]) {
    assert.equal(symbologyIdentifierForPayload({ segments: [], ...flags }), expected);
  }
  assert.throws(
    () => symbologyIdentifierForPayload({ segments: [], eciUsed: true, unicode: true }),
    (error) => error.code === "PAYLOAD_INVALID",
  );
});
