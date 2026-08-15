import assert from "node:assert/strict";
import test from "node:test";

import { BitReader, decodeMatrix, HanXinMode, readPayload } from "../../src/core/index.js";
import { bits, buildMatrix } from "../helpers/symbol-fixture.mjs";

const ECI_THREE = `1000${bits(3, 8)}`;
const ECI_TWENTY_SIX = `1000${bits(26, 8)}`;

function concatBytes(...arrays) {
  return Uint8Array.from(arrays.flatMap((array) => [...array]));
}

function textSegment(count) {
  return `0010${bits(10, 6).repeat(count)}${bits(63, 6)}`;
}

function binarySegment(count) {
  return `0011${bits(count, 13)}${bits(0x41, 8).repeat(count)}`;
}

function commonChineseSegment(indicator, count) {
  return `${indicator}${bits(0, 12).repeat(count)}${bits(0xFFF, 12)}`;
}

function gb18030TwoByteSegment(count) {
  return `0110${bits(0, 15).repeat(count)}${bits(0x7FFF, 15)}`;
}

function gb18030FourByteSegments(count) {
  return `0111${bits(0, 21)}`.repeat(count);
}

function unicodeSegment(count) {
  const counter = count <= 7 ? bits(count, 4) : `10${bits(count, 6)}`;
  const group = `0001${counter}${bits(8, 4)}${bits(0, 8)}${bits(0x41, 8).repeat(count)}`;
  return `1001${group}1111`;
}

function gs1Segment(count) {
  return `11100001${textSegment(count)}${bits(0xFF, 8)}`;
}

function uriSegment(count) {
  return `11100010${bits(1, 3)}${bits(0, 6).repeat(count)}${bits(63, 6)}${bits(7, 3)}`;
}

const DATA_MODE_SAMPLES = Object.freeze([
  Object.freeze({
    mode: HanXinMode.NUMERIC,
    stream: `0001${bits(7, 10)}${bits(1021, 10)}`,
    bytes: Uint8Array.of(0x37),
  }),
  Object.freeze({ mode: HanXinMode.TEXT, stream: textSegment(1), bytes: Uint8Array.of(0x41) }),
  Object.freeze({ mode: HanXinMode.BINARY, stream: binarySegment(1), bytes: Uint8Array.of(0x41) }),
  Object.freeze({
    mode: HanXinMode.COMMON_CHINESE_REGION_ONE,
    stream: commonChineseSegment("0100", 1),
    bytes: Uint8Array.of(0xB0, 0xA1),
  }),
  Object.freeze({
    mode: HanXinMode.COMMON_CHINESE_REGION_TWO,
    stream: commonChineseSegment("0101", 1),
    bytes: Uint8Array.of(0xD8, 0xA1),
  }),
  Object.freeze({
    mode: HanXinMode.GB18030_TWO_BYTE,
    stream: gb18030TwoByteSegment(1),
    bytes: Uint8Array.of(0x81, 0x40),
  }),
  Object.freeze({
    mode: HanXinMode.GB18030_FOUR_BYTE,
    stream: gb18030FourByteSegments(1),
    bytes: Uint8Array.of(0x81, 0x30, 0x81, 0x30),
  }),
  Object.freeze({
    mode: HanXinMode.UNICODE,
    stream: "1001000100010000010000011111",
    bytes: Uint8Array.of(0x41),
  }),
  Object.freeze({ mode: HanXinMode.GS1, stream: gs1Segment(1), bytes: Uint8Array.of(0x41) }),
  Object.freeze({ mode: HanXinMode.URI, stream: uriSegment(1), bytes: Uint8Array.of(0x61) }),
]);

test("decodes every ordered pair of the ten data modes", () => {
  for (const left of DATA_MODE_SAMPLES) {
    for (const right of DATA_MODE_SAMPLES) {
      const payload = readPayload(BitReader.fromBitString(left.stream + right.stream));
      assert.deepEqual(payload.segments.map(({ mode }) => mode), [left.mode, right.mode]);
      assert.deepEqual(payload.bytes, concatBytes(left.bytes, right.bytes));
    }
  }
});

test("covers every ordered ECI adjacency and an immediate ECI replacement", () => {
  for (const sample of DATA_MODE_SAMPLES) {
    const afterEci = readPayload(BitReader.fromBitString(ECI_THREE + sample.stream));
    assert.deepEqual(afterEci.segments.map(({ mode }) => mode), [HanXinMode.ECI, sample.mode]);
    assert.equal(afterEci.segments[1].eciAssignment, 3);
    assert.deepEqual(afterEci.bytes, sample.bytes);

    const beforeEci = readPayload(BitReader.fromBitString(
      sample.stream + ECI_THREE + DATA_MODE_SAMPLES[1].stream,
    ));
    assert.deepEqual(
      beforeEci.segments.map(({ mode }) => mode),
      [sample.mode, HanXinMode.ECI, HanXinMode.TEXT],
    );
    assert.equal(beforeEci.segments[2].eciAssignment, 3);
    assert.deepEqual(beforeEci.bytes, concatBytes(sample.bytes, Uint8Array.of(0x41)));
  }

  const replacement = readPayload(BitReader.fromBitString(
    ECI_THREE + ECI_TWENTY_SIX + binarySegment(1),
  ));
  assert.deepEqual(
    replacement.segments.map(({ mode }) => mode),
    [HanXinMode.ECI, HanXinMode.ECI, HanXinMode.BINARY],
  );
  assert.equal(replacement.segments[2].eciAssignment, 26);
  assert.equal(replacement.text, "A");
});

test("fills version 1 L1 to each mode's selected maximum boundary", () => {
  const numeric = (count) => `0001${bits(999, 10).repeat(count)}${bits(1023, 10)}`;
  const capacityCases = [
    { mode: HanXinMode.NUMERIC, maximum: numeric(15), tooLarge: numeric(16), bytes: 45 },
    { mode: HanXinMode.TEXT, maximum: textSegment(26), tooLarge: textSegment(27), bytes: 26 },
    { mode: HanXinMode.BINARY, maximum: binarySegment(18), tooLarge: binarySegment(19), bytes: 18 },
    {
      mode: HanXinMode.COMMON_CHINESE_REGION_ONE,
      maximum: commonChineseSegment("0100", 12),
      tooLarge: commonChineseSegment("0100", 13),
      bytes: 24,
    },
    {
      mode: HanXinMode.COMMON_CHINESE_REGION_TWO,
      maximum: commonChineseSegment("0101", 12),
      tooLarge: commonChineseSegment("0101", 13),
      bytes: 24,
    },
    {
      mode: HanXinMode.GB18030_TWO_BYTE,
      maximum: gb18030TwoByteSegment(9),
      tooLarge: gb18030TwoByteSegment(10),
      bytes: 18,
    },
    {
      mode: HanXinMode.GB18030_FOUR_BYTE,
      maximum: gb18030FourByteSegments(6),
      tooLarge: gb18030FourByteSegments(7),
      bytes: 24,
    },
    {
      mode: HanXinMode.ECI,
      maximum: ECI_THREE + binarySegment(17),
      tooLarge: ECI_THREE + binarySegment(18),
      bytes: 17,
    },
    {
      mode: HanXinMode.UNICODE,
      maximum: unicodeSegment(17),
      tooLarge: unicodeSegment(18),
      bytes: 17,
    },
    { mode: HanXinMode.GS1, maximum: gs1Segment(23), tooLarge: gs1Segment(24), bytes: 23 },
    { mode: HanXinMode.URI, maximum: uriSegment(24), tooLarge: uriSegment(25), bytes: 24 },
  ];

  for (const capacityCase of capacityCases) {
    assert.ok(capacityCase.maximum.length <= 168, capacityCase.mode);
    assert.ok(capacityCase.tooLarge.length > 168, capacityCase.mode);
    assert.throws(() => buildMatrix(capacityCase.tooLarge, 1, 0, 0));
    const decoded = decodeMatrix(buildMatrix(capacityCase.maximum, 1, 0, 0));
    assert.equal(decoded.version, 1);
    assert.equal(decoded.errorCorrectionLevel, 0);
    assert.equal(decoded.segments[0].mode, capacityCase.mode);
    assert.equal(decoded.bytes.length, capacityCase.bytes);
  }
});
