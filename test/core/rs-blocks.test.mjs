import assert from "node:assert/strict";
import test from "node:test";

import {
  correctPicketFenceCodewords,
  correctRsBlocks,
  expandRsBlocks,
  fromPicketFenceOrder,
  joinRsBlocks,
  ReedSolomonCodec,
  rsBlockStructureFor,
  splitRsBlocks,
  toPicketFenceOrder,
} from "../../src/core/index.js";

test("applies the normative stride-13 picket-fence ordering", () => {
  const sequential = Uint8Array.from({ length: 30 }, (_, index) => index);
  const ordered = toPicketFenceOrder(sequential);
  assert.deepEqual(
    Array.from(ordered),
    [
      0, 13, 26,
      1, 14, 27,
      2, 15, 28,
      3, 16, 29,
      4, 17, 5, 18, 6, 19, 7, 20, 8, 21, 9, 22, 10, 23, 11, 24, 12, 25,
    ],
  );
  assert.deepEqual(fromPicketFenceOrder(ordered), sequential);
});

test("picket-fence ordering round-trips every normative stream length", () => {
  for (let version = 1; version <= 84; version += 1) {
    const length = rsBlockStructureFor(version, 0).totalCodewords;
    const sequential = Uint8Array.from({ length }, (_, index) => (index * 149 + 31) & 0xff);
    assert.deepEqual(
      fromPicketFenceOrder(toPicketFenceOrder(sequential)),
      sequential,
    );
  }
});

test("splits and rejoins all 336 normative RS block structures", () => {
  for (let version = 1; version <= 84; version += 1) {
    for (let level = 0; level <= 3; level += 1) {
      const length = rsBlockStructureFor(version, level).totalCodewords;
      const sequential = Uint8Array.from({ length }, (_, index) => (index + version + level) & 0xff);
      const blocks = splitRsBlocks(sequential, version, level);
      assert.deepEqual(joinRsBlocks(blocks, version, level), sequential);
    }
  }
});

test("splits the Annex F example into its single (25,21,4) block", () => {
  const codewords = Uint8Array.from([
    0x11, 0xed, 0xc8, 0xc5, 0x40, 0x0f, 0xf4,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0xeb, 0xb4, 0x68, 0x1d,
  ]);
  const [block] = splitRsBlocks(codewords, 1, 0);
  assert.equal(block.dataCodewords, 21);
  assert.equal(block.correctionCodewords, 4);
  assert.deepEqual(block.codewords, codewords);
});

test("corrects every block independently and restores the information stream", () => {
  const version = 5;
  const level = 3;
  const descriptors = expandRsBlocks(version, level);
  const codec = new ReedSolomonCodec();
  let nextValue = 1;
  const expectedData = [];
  const encodedBlocks = descriptors.map((descriptor) => {
    const information = Uint8Array.from(
      { length: descriptor.dataCodewords },
      () => (nextValue++ * 37) & 0xff,
    );
    expectedData.push(...information);
    return {
      codewords: codec.encode(information, descriptor.correctionCodewords),
    };
  });
  const encoded = joinRsBlocks(encodedBlocks, version, level);
  const damaged = Uint8Array.from(encoded);
  damaged[0] ^= 0x51;
  damaged[3] ^= 0xa2;
  damaged[7] ^= 0x0f;
  damaged[34] ^= 0x33;
  damaged[40] ^= 0xc7;

  const corrected = correctRsBlocks(damaged, version, level);
  assert.deepEqual(corrected.correctedCodewords, encoded);
  assert.deepEqual(corrected.dataCodewords, Uint8Array.from(expectedData));
  assert.equal(corrected.correctedErrors, 5);
  assert.deepEqual(corrected.blocks.map((block) => block.correctedErrors), [3, 2]);

  const placed = toPicketFenceOrder(damaged);
  const fromPlacement = correctPicketFenceCodewords(placed, version, level);
  assert.deepEqual(fromPlacement.correctedCodewords, encoded);
  assert.deepEqual(fromPlacement.dataCodewords, Uint8Array.from(expectedData));
});

test("rejects streams and block lists with incorrect lengths", () => {
  assert.throws(() => splitRsBlocks(new Uint8Array(24), 1, 0), RangeError);
  assert.throws(() => joinRsBlocks([], 1, 0), RangeError);
  assert.throws(() => correctPicketFenceCodewords(new Uint8Array(26), 1, 0), RangeError);
  assert.throws(() => toPicketFenceOrder([]), TypeError);
});
