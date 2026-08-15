import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDataMask,
  BitMatrix,
  correctPicketFenceCodewords,
  createFunctionPattern,
  decodeFunctionInformationFromMatrix,
  decodeMatrix,
  encodeFunctionInformation,
  placeFunctionInformation,
  placePicketFenceCodewords,
  readPicketFenceCodewords,
  toPicketFenceOrder,
} from "../../src/core/index.js";
import { ANNEX_F_INTERMEDIATE } from "../fixtures/annex-f-intermediate.mjs";
import { ANNEX_F_MATRIX_ROWS } from "../fixtures/annex-f-matrices.mjs";

const EXPECTED = Object.freeze([
  Object.freeze({
    text: "1234567890",
    version: 1,
    errorLevel: "L1",
    mask: 1,
    byteHex: "31 32 33 34 35 36 37 38 39 30",
    segmentShape: [["numeric", 10]],
  }),
  Object.freeze({
    text: "1234567890ABCDEFGabcdefg,Han Xin Code",
    version: 10,
    errorLevel: "L3",
    mask: 2,
    byteHex: "31 32 33 34 35 36 37 38 39 30 41 42 43 44 45 46 47 61 62 63 64 65 66 67 2c 48 61 6e 20 58 69 6e 20 43 6f 64 65",
    segmentShape: [["numeric", 10], ["text", 27]],
  }),
  Object.freeze({
    text: "Summer Palace Ticket for 6 June 2015 13:00;2015年6月6日夜01時00分PM頤和園のチケット;2015년6월6일13시오후여름궁전티켓.2015年6月6号下午13:00的颐和园门票;",
    version: 17,
    errorLevel: "L2",
    mask: 2,
    byteHex: "53 75 6d 6d 65 72 20 50 61 6c 61 63 65 20 54 69 63 6b 65 74 20 66 6f 72 20 36 20 4a 75 6e 65 20 32 30 31 35 20 31 33 3a 30 30 3b 32 30 31 35 c4 ea 36 d4 c2 36 c8 d5 d2 b9 30 31 95 72 30 30 b7 d6 50 4d ee 55 ba cd 88 40 a4 ce a5 c1 a5 b1 a5 c3 a5 c8 3b 32 30 31 35 82 38 d8 33 36 83 33 8a 33 36 83 33 9b 31 31 33 83 32 a2 37 83 32 f6 37 83 36 a8 33 83 32 f1 31 83 30 af 35 82 37 f6 30 83 33 a8 37 83 35 c4 33 83 34 df 34 2e 32 30 31 35 c4 ea 36 d4 c2 36 ba c5 cf c2 ce e7 31 33 3a 30 30 b5 c4 d2 c3 ba cd d4 b0 c3 c5 c6 b1 3b",
    segmentShape: [
      ["text", 47], ["common-chinese-region-one", 2], ["text", 1],
      ["common-chinese-region-one", 2], ["text", 1],
      ["common-chinese-region-one", 4], ["text", 2], ["gb18030-two-byte", 2],
      ["text", 2], ["common-chinese-region-one", 2], ["text", 2],
      ["gb18030-two-byte", 16], ["text", 5], ["gb18030-four-byte", 4],
      ["text", 1], ["gb18030-four-byte", 4], ["text", 1],
      ["gb18030-four-byte", 4], ["text", 2],
      ["gb18030-four-byte", 4], ["gb18030-four-byte", 4],
      ["gb18030-four-byte", 4], ["gb18030-four-byte", 4],
      ["gb18030-four-byte", 4], ["gb18030-four-byte", 4],
      ["gb18030-four-byte", 4], ["gb18030-four-byte", 4],
      ["gb18030-four-byte", 4], ["text", 5],
      ["common-chinese-region-one", 2], ["text", 1],
      ["common-chinese-region-one", 2], ["text", 1],
      ["common-chinese-region-one", 6], ["text", 5],
      ["common-chinese-region-one", 12], ["text", 1],
    ],
  }),
]);

function matrixFromRows(rows) {
  return BitMatrix.fromRows(rows.map((row) => [...row].map(Number)));
}

function byteHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(" ");
}

function bitString(bytes) {
  return Array.from(bytes, (value) => value.toString(2).padStart(8, "0")).join("");
}

test("decodes all three final Annex F matrices byte-exactly", () => {
  for (let index = 0; index < EXPECTED.length; index += 1) {
    const result = decodeMatrix(matrixFromRows(ANNEX_F_MATRIX_ROWS[index]));
    const expected = EXPECTED[index];
    assert.equal(result.text, expected.text, `example ${index + 1} text`);
    assert.equal(byteHex(result.bytes), expected.byteHex, `example ${index + 1} bytes`);
    assert.equal(result.version, expected.version, `example ${index + 1} version`);
    assert.equal(result.errorLevel, expected.errorLevel, `example ${index + 1} level`);
    assert.equal(result.mask, expected.mask, `example ${index + 1} mask`);
    assert.equal(result.correctedCodewords, 0, `example ${index + 1} corrections`);
    assert.deepEqual(
      result.segments.map((segment) => [segment.mode, segment.bytes.length]),
      expected.segmentShape,
      `example ${index + 1} segments`,
    );
    assert.equal(result.symbologyIdentifier, "]h0", `example ${index + 1} identifier`);
  }
});

test("reproduces every published intermediate stream of Annex F example 1", () => {
  const informationBits = [
    "0001",
    "0001111011",
    "0111001000",
    "1100010101",
    "0000000000",
    "1111111101",
  ].join("");
  assert.equal(informationBits.length, 54);

  const informationCodewords = Uint8Array.from([
    0x11, 0xED, 0xC8, 0xC5, 0x40, 0x0F, 0xF4,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  const finalCodewords = Uint8Array.from([
    ...informationCodewords,
    0xEB, 0xB4, 0x68, 0x1D,
  ]);
  const placedCodewords = Uint8Array.from([
    0x11, 0x00, 0xED, 0x00, 0xC8, 0x00, 0xC5, 0x00, 0x40, 0x00,
    0x0F, 0x00, 0xF4, 0x00, 0x00, 0x00, 0x00, 0xEB, 0x00, 0xB4,
    0x00, 0x68, 0x00, 0x1D, 0x00,
  ]);
  assert.deepEqual(toPicketFenceOrder(finalCodewords), placedCodewords);

  const functionCodewords = encodeFunctionInformation({
    version: 1,
    errorCorrectionLevel: 0,
    mask: 1,
  });
  assert.deepEqual(functionCodewords, Uint8Array.of(0x1, 0x5, 0x1, 0x5, 0x3, 0xC, 0xB));

  const unmasked = placePicketFenceCodewords(placedCodewords, 1);
  const pattern = createFunctionPattern(1);
  const masked = applyDataMask(
    unmasked,
    1,
    (row, column) => pattern.functionModules.data[row * pattern.dimension + column] !== 0,
  );
  const finalMatrix = placeFunctionInformation(masked, functionCodewords);
  assert.ok(finalMatrix.equals(matrixFromRows(ANNEX_F_MATRIX_ROWS[0])));
});

test("reproduces every published intermediate stream of Annex F examples 2 and 3", () => {
  for (const expected of ANNEX_F_INTERMEDIATE) {
    const finalMatrix = matrixFromRows(ANNEX_F_MATRIX_ROWS[expected.example - 1]);
    const functionInformation = decodeFunctionInformationFromMatrix(finalMatrix);
    assert.equal(functionInformation.version, expected.version);
    assert.equal(functionInformation.errorCorrectionLevel, expected.errorCorrectionLevel);
    assert.equal(functionInformation.mask, expected.mask);
    assert.deepEqual(functionInformation.codewords, expected.functionCodewords);

    const generatedFunctionCodewords = encodeFunctionInformation({
      version: expected.version,
      errorCorrectionLevel: expected.errorCorrectionLevel,
      mask: expected.mask,
    });
    assert.deepEqual(generatedFunctionCodewords, expected.functionCodewords);

    const pattern = createFunctionPattern(expected.version);
    const unmasked = applyDataMask(
      finalMatrix,
      expected.mask,
      (row, column) => (
        pattern.functionModules.data[row * pattern.dimension + column] !== 0
      ),
    );
    const placedCodewords = readPicketFenceCodewords(unmasked, expected.version);
    assert.deepEqual(placedCodewords, expected.placedCodewords);
    assert.deepEqual(toPicketFenceOrder(expected.finalCodewords), expected.placedCodewords);

    const corrected = correctPicketFenceCodewords(
      placedCodewords,
      expected.version,
      expected.errorCorrectionLevel,
    );
    assert.equal(corrected.correctedErrors, 0);
    assert.deepEqual(corrected.blockSequentialCodewords, expected.finalCodewords);
    const expectedRsInformation = expected.informationCodewords.subarray(
      0,
      corrected.dataCodewords.length,
    );
    assert.deepEqual(corrected.dataCodewords, expectedRsInformation);
    const publishedExcessPadding = expected.informationCodewords.subarray(
      corrected.dataCodewords.length,
    );
    assert.equal(
      publishedExcessPadding.length,
      expected.publishedExcessPaddingCodewords ?? 0,
    );
    assert.ok(publishedExcessPadding.every((value) => value === 0));

    const paddedInformationBits = bitString(expected.informationCodewords);
    const informationBits = paddedInformationBits.slice(0, expected.informationBitLength);
    assert.equal(informationBits.length, expected.informationBitLength);
    if (expected.informationBits !== undefined) {
      assert.equal(informationBits, expected.informationBits);
    }
    assert.match(paddedInformationBits.slice(expected.informationBitLength), /^0*$/u);

    const reconstructedUnmasked = placePicketFenceCodewords(
      expected.placedCodewords,
      expected.version,
    );
    const reconstructedMasked = applyDataMask(
      reconstructedUnmasked,
      expected.mask,
      (row, column) => (
        pattern.functionModules.data[row * pattern.dimension + column] !== 0
      ),
    );
    const reconstructedFinal = placeFunctionInformation(
      reconstructedMasked,
      expected.functionCodewords,
    );
    assert.ok(reconstructedFinal.equals(finalMatrix));
  }
});
