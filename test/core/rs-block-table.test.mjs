import assert from "node:assert/strict";
import test from "node:test";

import {
  expandRsBlocks,
  HAN_XIN_RS_BLOCK_TABLE,
  rsBlockStructureFor,
} from "../../src/core/index.js";

test("contains all 336 Table B.1 version and level combinations", () => {
  assert.equal(HAN_XIN_RS_BLOCK_TABLE.length, 84);
  assert.ok(HAN_XIN_RS_BLOCK_TABLE.every((levels) => levels.length === 4));

  for (let version = 1; version <= 84; version += 1) {
    const commonTotal = rsBlockStructureFor(version, 0).totalCodewords;
    for (let level = 0; level <= 3; level += 1) {
      const structure = rsBlockStructureFor(version, level);
      const blocks = expandRsBlocks(version, level);

      assert.equal(structure.version, version);
      assert.equal(structure.dimension, 2 * version + 21);
      assert.equal(structure.errorCorrectionLevel, level);
      assert.equal(structure.totalCodewords, commonTotal);
      assert.equal(structure.dataBits, structure.dataCodewords * 8);
      assert.equal(
        structure.dataCodewords + structure.correctionCodewords,
        structure.totalCodewords,
      );
      assert.equal(blocks.length, structure.blockCount);
      assert.equal(
        blocks.reduce((sum, block) => sum + block.totalCodewords, 0),
        structure.totalCodewords,
      );
      assert.equal(
        blocks.reduce((sum, block) => sum + block.dataCodewords, 0),
        structure.dataCodewords,
      );
      assert.equal(
        blocks.reduce((sum, block) => sum + block.correctionCodewords, 0),
        structure.correctionCodewords,
      );
      assert.ok(blocks.every((block) => block.totalCodewords <= 255));
      assert.ok(blocks.every((block) => block.correctionCodewords % 2 === 0));
    }
  }
});

test("matches representative rows from the first, middle, and last Annex B pages", () => {
  assert.deepEqual(rsBlockStructureFor(1, 0), {
    version: 1,
    dimension: 23,
    errorCorrectionLevel: 0,
    blockCount: 1,
    totalCodewords: 25,
    dataCodewords: 21,
    correctionCodewords: 4,
    dataBits: 168,
    batches: [{ count: 1, dataCodewords: 21, correctionCodewords: 4, totalCodewords: 25 }],
  });

  assert.deepEqual(rsBlockStructureFor(5, 3).batches, [
    { count: 1, dataCodewords: 14, correctionCodewords: 20, totalCodewords: 34 },
    { count: 1, dataCodewords: 13, correctionCodewords: 22, totalCodewords: 35 },
  ]);
  assert.deepEqual(rsBlockStructureFor(44, 2).batches, [
    { count: 13, dataCodewords: 35, correctionCodewords: 28, totalCodewords: 63 },
    { count: 6, dataCodewords: 34, correctionCodewords: 32, totalCodewords: 66 },
    { count: 1, dataCodewords: 30, correctionCodewords: 30, totalCodewords: 60 },
  ]);
  assert.deepEqual(rsBlockStructureFor(84, 3).batches, [
    { count: 79, dataCodewords: 18, correctionCodewords: 28, totalCodewords: 46 },
    { count: 4, dataCodewords: 33, correctionCodewords: 30, totalCodewords: 63 },
  ]);
});

test("Table B.1 records are deeply immutable", () => {
  const structure = rsBlockStructureFor(84, 3);
  assert.equal(Object.isFrozen(HAN_XIN_RS_BLOCK_TABLE), true);
  assert.equal(Object.isFrozen(HAN_XIN_RS_BLOCK_TABLE[83]), true);
  assert.equal(Object.isFrozen(structure), true);
  assert.equal(Object.isFrozen(structure.batches), true);
  assert.ok(structure.batches.every(Object.isFrozen));
  assert.equal(Object.isFrozen(expandRsBlocks(84, 3)), true);
});

test("rejects versions and levels outside Table B.1", () => {
  for (const version of [0, 85, 1.5]) {
    assert.throws(() => rsBlockStructureFor(version, 0), RangeError);
  }
  for (const level of [-1, 4, 1.5]) {
    assert.throws(() => rsBlockStructureFor(1, level), RangeError);
  }
});
