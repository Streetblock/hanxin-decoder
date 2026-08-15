import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeMatrix,
  encodeFunctionInformation,
  placeFunctionInformation,
  symbologyIdentifierForPayload,
} from "../../src/core/index.js";
import { bits, buildMatrix } from "../helpers/symbol-fixture.mjs";

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

test("decodes every version, error level, and mask combination", () => {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  for (let version = 1; version <= 84; version += 1) {
    for (let level = 0; level <= 3; level += 1) {
      for (let mask = 0; mask <= 3; mask += 1) {
        const result = decodeMatrix(buildMatrix(payloadBits, version, level, mask));
        assert.equal(result.text, "7", `version ${version}, level ${level}, mask ${mask}`);
        assert.equal(result.version, version);
        assert.equal(result.errorCorrectionLevel, level);
        assert.equal(result.mask, mask);
      }
    }
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

test("matrix decoding is deterministic", () => {
  const payloadBits = `0010${bits(10, 6)}${bits(63, 6)}`;
  const matrix = buildMatrix(payloadBits, 17, 1, 2);
  assert.deepEqual(decodeMatrix(matrix), decodeMatrix(matrix));
});
