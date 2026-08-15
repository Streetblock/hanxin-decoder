import assert from "node:assert/strict";
import test from "node:test";

import {
  BitMatrix,
  bitsToFunctionInformation,
  decodeFunctionInformationFromMatrix,
  decodeFunctionInformation,
  encodeFunctionInformation,
  functionInformationCoordinates,
  functionInformationToBits,
  HAN_XIN_GF16,
  isFunctionInformationModule,
  placeFunctionInformation,
  readFunctionInformationCopies,
} from "../../src/core/index.js";

const ANNEX_G_CODEWORDS = Uint8Array.of(4, 6, 2, 13, 9, 5, 14);

test("GF(16) generator polynomial matches Annex G", () => {
  const generator = HAN_XIN_GF16.buildGenerator(4, 1);
  assert.deepEqual(
    Array.from(generator, (coefficient) => HAN_XIN_GF16.log(coefficient)),
    [0, 13, 6, 3, 10],
  );
});

test("encodes the Annex G function-information example exactly", () => {
  const encoded = encodeFunctionInformation({
    version: 50,
    errorCorrectionLevel: 0,
    mask: 2,
  });

  assert.deepEqual(encoded, ANNEX_G_CODEWORDS);
  assert.equal(
    Array.from(functionInformationToBits(encoded)).join(""),
    "0100011000101101100101011110",
  );
});

test("decodes every version, level, and mask combination without errors", () => {
  for (let version = 1; version <= 84; version += 1) {
    for (let errorCorrectionLevel = 0; errorCorrectionLevel <= 3; errorCorrectionLevel += 1) {
      for (let mask = 0; mask <= 3; mask += 1) {
        const encoded = encodeFunctionInformation({ version, errorCorrectionLevel, mask });
        const decoded = decodeFunctionInformation(encoded);
        assert.equal(decoded.version, version);
        assert.equal(decoded.errorCorrectionLevel, errorCorrectionLevel);
        assert.equal(decoded.mask, mask);
        assert.equal(decoded.correctedErrors, 0);
      }
    }
  }
});

test("corrects one and two damaged GF(16) symbols", () => {
  for (const damage of [
    [[0, 0b0011]],
    [[1, 0b0101], [6, 0b1001]],
  ]) {
    const received = Uint8Array.from(ANNEX_G_CODEWORDS);
    for (const [position, delta] of damage) received[position] ^= delta;
    const decoded = decodeFunctionInformation(received);
    assert.equal(decoded.version, 50);
    assert.equal(decoded.errorCorrectionLevel, 0);
    assert.equal(decoded.mask, 2);
    assert.equal(decoded.correctedErrors, damage.length);
    assert.deepEqual(decoded.codewords, ANNEX_G_CODEWORDS);
  }
});

test("converts function-information symbols to bits and back", () => {
  assert.deepEqual(
    bitsToFunctionInformation(functionInformationToBits(ANNEX_G_CODEWORDS)),
    ANNEX_G_CODEWORDS,
  );
});

test("validates function-information inputs strictly", () => {
  for (const version of [0, 85, 1.5]) {
    assert.throws(() => encodeFunctionInformation({ version, errorCorrectionLevel: 0, mask: 0 }));
  }
  assert.throws(() => encodeFunctionInformation({
    version: 1,
    errorCorrectionLevel: 4,
    mask: 0,
  }));
  assert.throws(() => encodeFunctionInformation({
    version: 1,
    errorCorrectionLevel: 0,
    mask: -1,
  }));
  assert.throws(() => decodeFunctionInformation(Uint8Array.of(1, 2, 3)));
  assert.throws(() => bitsToFunctionInformation(new Uint8Array(27)));

  const invalidBits = new Uint8Array(28);
  invalidBits[5] = 2;
  assert.throws(() => bitsToFunctionInformation(invalidBits));
});

test("maps two disjoint 34-bit copies onto 68 function-information modules", () => {
  const { primary, secondary } = functionInformationCoordinates(23);
  assert.equal(primary.length, 34);
  assert.equal(secondary.length, 34);

  const key = ({ column, row }) => `${column},${row}`;
  assert.equal(new Set(primary.map(key)).size, 34);
  assert.equal(new Set(secondary.map(key)).size, 34);
  assert.equal(new Set([...primary, ...secondary].map(key)).size, 68);

  assert.deepEqual(primary[0], { column: 0, row: 8 });
  assert.deepEqual(primary[8], { column: 8, row: 8 });
  assert.deepEqual(primary[9], { column: 8, row: 7 });
  assert.deepEqual(primary[16], { column: 8, row: 0 });
  assert.deepEqual(primary[17], { column: 14, row: 0 });
  assert.deepEqual(primary[33], { column: 22, row: 8 });

  assert.deepEqual(secondary[0], { column: 22, row: 14 });
  assert.deepEqual(secondary[8], { column: 14, row: 14 });
  assert.deepEqual(secondary[9], { column: 14, row: 15 });
  assert.deepEqual(secondary[16], { column: 14, row: 22 });
  assert.deepEqual(secondary[17], { column: 8, row: 22 });
  assert.deepEqual(secondary[33], { column: 0, row: 14 });
});

test("places and reads both function-information copies for minimum and maximum versions", () => {
  for (const dimension of [23, 189]) {
    const encoded = encodeFunctionInformation({
      version: (dimension - 21) / 2,
      errorCorrectionLevel: 3,
      mask: 1,
    });
    const filler = Uint8Array.of(1, 0, 1, 0, 1, 0);
    const matrix = placeFunctionInformation(new BitMatrix(dimension, dimension), encoded, filler);
    const copies = readFunctionInformationCopies(matrix);

    assert.deepEqual(copies.primary, copies.secondary);
    assert.deepEqual(copies.primary.slice(0, 28), functionInformationToBits(encoded));
    assert.deepEqual(copies.primary.slice(28), filler);
    assert.equal(decodeFunctionInformationFromMatrix(matrix).source, "both");
  }
});

test("falls back to the second copy when the first exceeds RS capacity", () => {
  const encoded = encodeFunctionInformation({ version: 17, errorCorrectionLevel: 1, mask: 3 });
  const original = placeFunctionInformation(new BitMatrix(55, 55), encoded);
  const damaged = original.clone();
  const { primary } = functionInformationCoordinates(55);

  for (const bitIndex of [0, 4, 8]) {
    const { column, row } = primary[bitIndex];
    damaged.flip(column, row);
  }

  const decoded = decodeFunctionInformationFromMatrix(damaged);
  assert.equal(decoded.version, 17);
  assert.equal(decoded.errorCorrectionLevel, 1);
  assert.equal(decoded.mask, 3);
  assert.equal(decoded.source, "secondary");
  assert.equal(decoded.copyCorrections.primary, null);
  assert.equal(decoded.copyCorrections.secondary, 0);
});

test("rejects contradictory valid function-information copies", () => {
  const dimension = 23;
  const first = placeFunctionInformation(
    new BitMatrix(dimension, dimension),
    encodeFunctionInformation({ version: 1, errorCorrectionLevel: 0, mask: 0 }),
  );
  const secondBits = functionInformationToBits(
    encodeFunctionInformation({ version: 1, errorCorrectionLevel: 3, mask: 2 }),
  );
  const { secondary } = functionInformationCoordinates(dimension);
  for (let index = 0; index < secondBits.length; index += 1) {
    const { column, row } = secondary[index];
    first.set(column, row, secondBits[index]);
  }
  assert.throws(() => decodeFunctionInformationFromMatrix(first));
});

test("identifies exactly the function-information modules", () => {
  const dimension = 23;
  const coordinates = functionInformationCoordinates(dimension);
  for (const { column, row } of [...coordinates.primary, ...coordinates.secondary]) {
    assert.equal(isFunctionInformationModule(dimension, row, column), true);
  }
  assert.equal(isFunctionInformationModule(dimension, 9, 9), false);
});
