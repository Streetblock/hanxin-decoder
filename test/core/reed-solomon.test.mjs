import assert from "node:assert/strict";
import test from "node:test";
import { ReedSolomonCodec, ReedSolomonError } from "../../src/core/index.js";

const codec = new ReedSolomonCodec();

// GB/T 21049-2022, Annex F, example 1: version 1 / L1 uses one (25, 21, 4)
// block. The final four values are the normative correction codewords.
const information = Uint8Array.of(
  0x11, 0xed, 0xc8, 0xc5, 0x40, 0x0f, 0xf4,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
);
const normativeCodewords = Uint8Array.of(...information, 0xeb, 0xb4, 0x68, 0x1d);

test("encodes the normative Annex F Reed-Solomon vector", () => {
  assert.deepEqual(codec.encode(information, 4), normativeCodewords);
});

test("accepts the error-free normative block", () => {
  const result = codec.decode(normativeCodewords, 4);
  assert.equal(result.correctedErrors, 0);
  assert.deepEqual(result.codewords, normativeCodewords);
});

test("corrects one and two unknown codeword errors", () => {
  for (const changes of [
    [[0, 0x55]],
    [[24, 0xa7]],
    [[0, 0x55], [24, 0xa7]],
    [[7, 0x01], [13, 0x80]],
  ]) {
    const damaged = Uint8Array.from(normativeCodewords);
    for (const [position, difference] of changes) damaged[position] ^= difference;
    const result = codec.decode(damaged, 4);
    assert.equal(result.correctedErrors, changes.length);
    assert.deepEqual(result.codewords, normativeCodewords);
  }
});

test("rejects a tested block with more errors than its correction capacity", () => {
  const damaged = Uint8Array.from(normativeCodewords);
  damaged[0] ^= 0x55;
  damaged[7] ^= 0x19;
  damaged[24] ^= 0xa7;
  assert.throws(() => codec.decode(damaged, 4), ReedSolomonError);
});
