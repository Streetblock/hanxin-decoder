import assert from "node:assert/strict";
import test from "node:test";

import {
  expandRsBlocks,
  ReedSolomonCodec,
  ReedSolomonError,
} from "../../src/core/index.js";

const codec = new ReedSolomonCodec();

function allBlockTypes() {
  const unique = new Map();
  for (let version = 1; version <= 84; version += 1) {
    for (let level = 0; level <= 3; level += 1) {
      for (const block of expandRsBlocks(version, level)) {
        unique.set(`${block.dataCodewords}:${block.correctionCodewords}`, block);
      }
    }
  }
  return [...unique.values()];
}

function edgePositions(length, count) {
  return Array.from({ length: count }, (_, index) => (
    index % 2 === 0 ? index >>> 1 : length - 1 - (index >>> 1)
  ));
}

function middlePositions(length, count) {
  const start = Math.floor((length - count) / 2);
  return Array.from({ length: count }, (_, index) => start + index);
}

function randomPositions(length, count, initialSeed) {
  let seed = initialSeed >>> 0;
  const positions = new Set();
  while (positions.size < count) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    positions.add((seed >>> 0) % length);
  }
  return [...positions];
}

function damage(codewords, positions, salt) {
  const damaged = Uint8Array.from(codewords);
  for (const position of positions) {
    const difference = ((position * 73 + salt * 29) & 0xFF) || 1;
    damaged[position] ^= difference;
  }
  return damaged;
}

test("corrects 1..t edge, middle, and seeded-random errors for every RS block type", () => {
  const blockTypes = allBlockTypes();
  assert.equal(blockTypes.length, 241);

  for (const block of blockTypes) {
    const information = Uint8Array.from(
      { length: block.dataCodewords },
      (_, index) => (index * 149 + block.dataCodewords * 37 + block.correctionCodewords) & 0xFF,
    );
    const encoded = codec.encode(information, block.correctionCodewords);
    const capacity = block.correctionCodewords / 2;

    for (let errorCount = 1; errorCount <= capacity; errorCount += 1) {
      const patterns = [
        edgePositions(encoded.length, errorCount),
        middlePositions(encoded.length, errorCount),
        randomPositions(
          encoded.length,
          errorCount,
          block.dataCodewords * 65_537 + block.correctionCodewords * 257 + errorCount,
        ),
      ];
      for (let patternIndex = 0; patternIndex < patterns.length; patternIndex += 1) {
        const damaged = damage(encoded, patterns[patternIndex], errorCount + patternIndex * 31);
        const decoded = codec.decode(damaged, block.correctionCodewords);
        assert.equal(decoded.correctedErrors, errorCount);
        assert.deepEqual(
          decoded.codewords,
          encoded,
          `${block.dataCodewords}+${block.correctionCodewords}, ${errorCount} errors, pattern ${patternIndex}`,
        );
      }
    }
  }
});

test("never accepts a different codeword beyond t in every RS block type", () => {
  for (const block of allBlockTypes()) {
    const information = Uint8Array.from(
      { length: block.dataCodewords },
      (_, index) => (index * 97 + block.dataCodewords + block.correctionCodewords * 11) & 0xFF,
    );
    const encoded = codec.encode(information, block.correctionCodewords);
    const positions = randomPositions(
      encoded.length,
      block.correctionCodewords / 2 + 1,
      block.dataCodewords * 4099 + block.correctionCodewords,
    );
    const damaged = damage(encoded, positions, 197);

    try {
      const decoded = codec.decode(damaged, block.correctionCodewords);
      assert.deepEqual(decoded.codewords, encoded);
    } catch (error) {
      assert.ok(error instanceof ReedSolomonError);
    }
  }
});
