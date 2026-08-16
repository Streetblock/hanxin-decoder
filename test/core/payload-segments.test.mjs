import assert from "node:assert/strict";
import test from "node:test";

import {
  BitReader,
  InvalidBitStreamError,
  readBinarySegment,
  readCommonChineseRegionOneSegment,
  readCommonChineseRegionTwoSegment,
  readEciSegment,
  readGb18030FourByteSegment,
  readGb18030TwoByteSegment,
  readGs1Segment,
  readModeIndicator,
  readNumericSegment,
  readPayload,
  readTextSegment,
  readUnicodeSegment,
  readUriSegment,
} from "../../src/core/index.js";

function bits(value, width) {
  return value.toString(2).padStart(width, "0");
}

function readerAfterIndicator(bitString, expectedMode) {
  const reader = BitReader.fromBitString(bitString);
  assert.equal(readModeIndicator(reader).mode, expectedMode);
  return reader;
}

test("decodes both normative numeric examples", () => {
  const examples = [
    {
      text: "84613168549316542",
      values: [846, 131, 685, 493, 165, 42, 1022],
    },
    {
      text: "0019536472255",
      values: [1, 953, 647, 225, 5, 1021],
    },
  ];

  for (const example of examples) {
    const reader = readerAfterIndicator(
      `0001${example.values.map((value) => bits(value, 10)).join("")}`,
      "numeric",
    );
    const segment = readNumericSegment(reader);
    assert.equal(segment.text, example.text);
    assert.deepEqual(segment.bytes, Uint8Array.from(example.text, (value) => value.charCodeAt(0)));
    assert.equal(reader.available, 0);
  }
});

test("honours all numeric final-group lengths and leading zeroes", () => {
  for (const [value, terminator, expected] of [
    [7, 1021, "7"],
    [7, 1022, "07"],
    [7, 1023, "007"],
  ]) {
    const reader = BitReader.fromBitString(`${bits(value, 10)}${bits(terminator, 10)}`);
    assert.equal(readNumericSegment(reader).text, expected);
  }
});

test("rejects malformed numeric segments", () => {
  for (const stream of [
    bits(1021, 10),
    `${bits(1000, 10)}${bits(1021, 10)}`,
    `${bits(42, 10)}${bits(1021, 10)}`,
    bits(42, 10),
  ]) {
    assert.throws(
      () => readNumericSegment(BitReader.fromBitString(stream)),
      InvalidBitStreamError,
    );
  }
});

test("decodes Text1, Text2, and repeated submode transitions", () => {
  const stream = [10, 37, 62, 29, 62, 61, 63].map((value) => bits(value, 6)).join("");
  const segment = readTextSegment(BitReader.fromBitString(stream));
  assert.equal(segment.text, "Ab!z");
  assert.deepEqual(segment.bytes, Uint8Array.of(0x41, 0x62, 0x21, 0x7A));
});

test("covers every Text1 and Text2 table entry", () => {
  const textOneValues = Array.from({ length: 62 }, (_, value) => value);
  const textOne = readTextSegment(BitReader.fromBitString(
    [...textOneValues, 63].map((value) => bits(value, 6)).join(""),
  ));
  assert.equal(textOne.text, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");

  const textTwoValues = Array.from({ length: 62 }, (_, value) => value);
  const textTwo = readTextSegment(BitReader.fromBitString(
    [62, ...textTwoValues, 63].map((value) => bits(value, 6)).join(""),
  ));
  assert.deepEqual(textTwo.bytes, Uint8Array.from([
    ...Array.from({ length: 28 }, (_, value) => value),
    ...Array.from({ length: 16 }, (_, value) => value + 0x20),
    ...Array.from({ length: 7 }, (_, value) => value + 0x3A),
    ...Array.from({ length: 6 }, (_, value) => value + 0x5B),
    ...Array.from({ length: 5 }, (_, value) => value + 0x7B),
  ]));
});

test("rejects malformed text segments", () => {
  for (const values of [
    [63],
    [10],
    [10, 62, 63],
    [10, 62, 62, 63],
  ]) {
    const stream = values.map((value) => bits(value, 6)).join("");
    assert.throws(
      () => readTextSegment(BitReader.fromBitString(stream)),
      InvalidBitStreamError,
    );
  }
});

test("decodes arbitrary binary bytes using the 13-bit count", () => {
  const values = [0x00, 0xFF, 0x41, 0x80];
  const stream = `${bits(values.length, 13)}${values.map((value) => bits(value, 8)).join("")}`;
  const segment = readBinarySegment(BitReader.fromBitString(stream));
  assert.deepEqual(segment.bytes, Uint8Array.from(values));
  assert.equal(segment.text, undefined);
});

test("rejects zero-length and truncated binary segments", () => {
  for (const stream of [
    bits(0, 13),
    "10101",
    `${bits(2, 13)}${bits(0x41, 8)}`,
  ]) {
    assert.throws(
      () => readBinarySegment(BitReader.fromBitString(stream)),
      InvalidBitStreamError,
    );
  }
});

test("segment readers compose without requiring byte alignment", () => {
  const stream = [
    "0001", bits(7, 10), bits(1021, 10),
    "0010", bits(10, 6), bits(63, 6),
    "0011", bits(1, 13), bits(0xFF, 8),
  ].join("");
  const reader = BitReader.fromBitString(stream);

  assert.equal(readModeIndicator(reader).mode, "numeric");
  assert.equal(readNumericSegment(reader).text, "7");
  assert.equal(readModeIndicator(reader).mode, "text");
  assert.equal(readTextSegment(reader).text, "A");
  assert.equal(readModeIndicator(reader).mode, "binary");
  assert.deepEqual(readBinarySegment(reader).bytes, Uint8Array.of(0xFF));
  assert.equal(reader.available, 0);
});

test("decodes common Chinese region-one examples and all subranges", () => {
  const stream = [0x8DA, 0xF86, 0xFE7, 0xFFF].map((value) => bits(value, 12)).join("");
  const segment = readCommonChineseRegionOneSegment(BitReader.fromBitString(stream));
  assert.deepEqual(segment.bytes, Uint8Array.from([0xC8, 0xAB, 0xA3, 0xBB, 0xA8, 0xBE]));
  assert.equal(segment.characterCount, 3);
  assert.deepEqual(segment.values, [
    { region: 1, value: 0x8DA },
    { region: 1, value: 0xF86 },
    { region: 1, value: 0xFE7 },
  ]);
});

test("decodes common Chinese region-two and in-segment region switches", () => {
  const stream = [0x9EC, 0xFFE, 0x8DA, 0xFFE, 0, 0xFFF]
    .map((value) => bits(value, 12)).join("");
  const segment = readCommonChineseRegionTwoSegment(BitReader.fromBitString(stream));
  assert.deepEqual(segment.bytes, Uint8Array.from([
    0xF3, 0xA3,
    0xC8, 0xAB,
    0xD8, 0xA1,
  ]));
  assert.deepEqual(segment.values.map(({ region }) => region), [2, 1, 2]);
});

test("rejects malformed common Chinese segments", () => {
  for (const [reader, decode] of [
    [BitReader.fromBitString(bits(0xFFF, 12)), readCommonChineseRegionOneSegment],
    [BitReader.fromBitString(bits(4074, 12)), readCommonChineseRegionOneSegment],
    [BitReader.fromBitString(bits(3008, 12)), readCommonChineseRegionTwoSegment],
    [BitReader.fromBitString(bits(0, 11)), readCommonChineseRegionOneSegment],
  ]) {
    assert.throws(() => decode(reader), InvalidBitStreamError);
  }
});

test("decodes GB 18030 two-byte examples and boundary trail bytes", () => {
  const values = [0x14D9, 0x15F4, 0, 63, 23939];
  const stream = [...values, 0x7FFF].map((value) => bits(value, 15)).join("");
  const segment = readGb18030TwoByteSegment(BitReader.fromBitString(stream));
  assert.deepEqual(segment.bytes, Uint8Array.from([
    0x9D, 0x51,
    0x9E, 0xAF,
    0x81, 0x40,
    0x81, 0x80,
    0xFE, 0xFE,
  ]));
});

test("rejects malformed GB 18030 two-byte segments", () => {
  for (const stream of [
    bits(0x7FFF, 15),
    `${bits(23940, 15)}${bits(0x7FFF, 15)}`,
    bits(0, 14),
  ]) {
    assert.throws(
      () => readGb18030TwoByteSegment(BitReader.fromBitString(stream)),
      InvalidBitStreamError,
    );
  }
});

test("decodes GB 18030 four-byte normative example and boundaries", () => {
  const example = readGb18030FourByteSegment(BitReader.fromBitString(bits(0x3098, 21)));
  assert.deepEqual(example.bytes, Uint8Array.of(0x81, 0x39, 0xEF, 0x30));

  const first = readGb18030FourByteSegment(BitReader.fromBitString(bits(0, 21)));
  assert.deepEqual(first.bytes, Uint8Array.of(0x81, 0x30, 0x81, 0x30));

  const last = readGb18030FourByteSegment(BitReader.fromBitString(bits(1_587_599, 21)));
  assert.deepEqual(last.bytes, Uint8Array.of(0xFE, 0x39, 0xFE, 0x39));
});

test("rejects truncated and reserved GB 18030 four-byte values", () => {
  assert.throws(
    () => readGb18030FourByteSegment(BitReader.fromBitString(bits(0, 20))),
    InvalidBitStreamError,
  );
  assert.throws(
    () => readGb18030FourByteSegment(BitReader.fromBitString(bits(1_587_600, 21))),
    InvalidBitStreamError,
  );
});

test("decodes all three ECI assignment-number forms", () => {
  for (const [stream, assignmentNumber, bitLength] of [
    ["0" + bits(3, 7), 3, 8],
    ["10" + bits(899, 14), 899, 16],
    ["110" + bits(999_999, 21), 999_999, 24],
  ]) {
    const reader = BitReader.fromBitString(stream);
    const segment = readEciSegment(reader);
    assert.equal(segment.assignmentNumber, assignmentNumber);
    assert.equal(segment.bitLength, bitLength);
    assert.equal(reader.available, 0);
  }
});

test("rejects truncated and reserved ECI assignment numbers", () => {
  for (const stream of [
    "0101010",
    "10" + bits(0, 13),
    "110" + bits(0, 20),
    "110" + bits(1_000_000, 21),
  ]) {
    assert.throws(() => readEciSegment(BitReader.fromBitString(stream)), InvalidBitStreamError);
  }
});

test("decodes differential Unicode byte modes and transitions", () => {
  const stream = [
    bits(1, 4),
    "0011",
    bits(2, 4),
    bits(0x41, 8),
    "00", "01", "10",
    bits(2, 4),
    "0010",
    bits(0, 4), bits(1, 4),
    bits(0xC3, 8), bits(0xA9, 8),
    "0", "1",
    "1111",
  ].join("");
  const segment = readUnicodeSegment(BitReader.fromBitString(stream));
  assert.equal(segment.text, "ABCéê");
  assert.deepEqual(segment.bytes, new TextEncoder().encode("ABCéê"));
  assert.deepEqual(segment.groups.map(({ byteMode, count }) => ({ byteMode, count })), [
    { byteMode: 1, count: 3 },
    { byteMode: 2, count: 2 },
  ]);
});

test("decodes UTF-8 characters across Unicode byte-mode group boundaries", () => {
  const stream = [
    bits(1, 4),
    "0001",
    bits(0, 4),
    bits(0xC3, 8),
    bits(2, 4),
    "0001",
    bits(0, 4), bits(0, 4),
    bits(0xA9, 8), bits(0x41, 8),
    "1111",
  ].join("");
  const segment = readUnicodeSegment(BitReader.fromBitString(stream));
  assert.equal(segment.text, "éA");
  assert.equal(segment.characterCount, 2);
  assert.deepEqual(segment.bytes, Uint8Array.of(0xC3, 0xA9, 0x41));
  assert.deepEqual(segment.groups.map(({ byteMode, count }) => ({ byteMode, count })), [
    { byteMode: 1, count: 1 },
    { byteMode: 2, count: 1 },
  ]);
});

test("decodes every Unicode byte-mode counter form", () => {
  for (const [count, counter] of [
    [1, "0001"],
    [8, "10" + bits(8, 6)],
    [64, "110" + bits(64, 9)],
    [512, "1110" + bits(512, 12)],
    [4096, "11110" + bits(4096, 15)],
  ]) {
    const stream = [
      bits(1, 4), counter,
      bits(0, 4), bits(0x41, 8),
      "1111",
    ].join("");
    const segment = readUnicodeSegment(BitReader.fromBitString(stream));
    assert.equal(segment.characterCount, count);
    assert.equal(segment.bytes.length, count);
    assert.ok(segment.bytes.every((value) => value === 0x41));
  }
});

test("rejects malformed Unicode segments", () => {
  const malformed = [
    "1111",
    bits(5, 4),
    `${bits(1, 4)}0000`,
    `${bits(1, 4)}0001${bits(9, 4)}${bits(0x41, 8)}1111`,
    `${bits(1, 4)}0001${bits(0, 4)}${bits(0x80, 8)}1111`,
  ];
  for (const stream of malformed) {
    assert.throws(
      () => readUnicodeSegment(BitReader.fromBitString(stream)),
      InvalidBitStreamError,
    );
  }
});

test("decodes the first normative GS1 example", () => {
  const numericValues = [10, 345, 312, 0, 1, 117, 191, 125, 10, 1022];
  const textValues = [10, 11, 12, 13, 1, 2, 3, 4, 63];
  const stream = [
    "0001", numericValues.map((value) => bits(value, 10)).join(""),
    "0010", textValues.map((value) => bits(value, 6)).join(""),
    bits(0xFF, 8),
  ].join("");
  const segment = readGs1Segment(BitReader.fromBitString(stream));
  assert.equal(segment.text, "01034531200000111719112510ABCD1234");
  assert.equal(segment.segments.length, 2);
  assert.equal(segment.gs1, true);
});

test("decodes GS1 FNC1 through the numeric extension value", () => {
  const stream = [
    "0010", [10, 63].map((value) => bits(value, 6)).join(""),
    "0001", [1000, 211, 0, 1021].map((value) => bits(value, 10)).join(""),
    bits(0xFF, 8),
  ].join("");
  const segment = readGs1Segment(BitReader.fromBitString(stream));
  assert.equal(segment.text, `A\u001D2110`);
  assert.equal(segment.bytes[1], 0x1D);
});

test("rejects empty, truncated, and foreign-mode GS1 containers", () => {
  for (const stream of [
    bits(0xFF, 8),
    "0001" + bits(1, 10),
    "0011" + bits(1, 13) + bits(0x41, 8) + bits(0xFF, 8),
  ]) {
    assert.throws(() => readGs1Segment(BitReader.fromBitString(stream)), InvalidBitStreamError);
  }
});

test("decodes the normative URI-A example", () => {
  const values = [49, 56, 4, 23, 0, 12, 15, 11, 4, 57, 63];
  const stream = `001${values.map((value) => bits(value, 6)).join("")}111`;
  const segment = readUriSegment(BitReader.fromBitString(stream));
  assert.equal(segment.text, "http://www.example.com");
  assert.deepEqual(segment.bytes, new TextEncoder().encode(segment.text));
});

test("decodes URI-A, URI-B, URI-C, switches, and percent encoding", () => {
  const stream = [
    "001", bits(0, 6), bits(62, 6), bits(0, 6), bits(63, 6),
    "011", bits(125, 7), bits(1, 6), bits(62, 6), bits(1, 6), bits(63, 6),
    "011", bits(124, 7), bits(127, 7),
    "100", bits(2, 6), bits(0xE8, 8), bits(0xAF, 8),
    "111",
  ].join("");
  const segment = readUriSegment(BitReader.fromBitString(stream));
  assert.equal(segment.text, "aAbBsearch%E8%AF");
  assert.deepEqual(segment.groups.map(({ set }) => set), ["A", "C", "C", "percent"]);
});

test("rejects malformed URI containers", () => {
  for (const stream of [
    "111",
    "000",
    "001" + bits(0, 5),
    "100" + bits(0, 6),
    "100" + bits(2, 6) + bits(0xE8, 8),
  ]) {
    assert.throws(() => readUriSegment(BitReader.fromBitString(stream)), InvalidBitStreamError);
  }
});

test("dispatches mixed payloads, propagates ECI, and consumes zero padding", () => {
  const stream = [
    "1000", "0" + bits(3, 7),
    "0001", bits(7, 10), bits(1021, 10),
    "0010", bits(10, 6), bits(63, 6),
    "11100010", "001", bits(0, 6), bits(63, 6), "111",
    "000000",
  ].join("");
  const payload = readPayload(BitReader.fromBitString(stream));
  assert.equal(payload.text, "7Aa");
  assert.equal(payload.segments.length, 4);
  assert.equal(payload.segments[1].eciAssignment, 3);
  assert.equal(payload.segments[3].eciAssignment, 3);
  assert.equal(payload.eciUsed, true);
  assert.equal(payload.uri, true);
});

test("decodes the normative ECI 000009 binary byte sequence", () => {
  const bytes = [0xA1, 0xA2, 0xA3, 0xA4, 0xA5];
  const stream = [
    "1000", "0" + bits(9, 7),
    "0011", bits(bytes.length, 13), ...bytes.map((value) => bits(value, 8)),
  ].join("");
  const payload = readPayload(BitReader.fromBitString(stream));
  assert.deepEqual(payload.bytes, Uint8Array.from(bytes));
  assert.equal(payload.segments[0].eciCharacterSet, "ISO-8859-7");
  assert.equal(payload.segments[1].eciAssignment, 9);
  assert.equal(payload.segments[1].eciSupported, true);
  assert.equal(payload.segments[1].eciValid, true);
});

test("keeps a multibyte ECI decoder alive across mode boundaries and switches", () => {
  const stream = [
    "1000", "0" + bits(26, 7),
    "0011", bits(1, 13), bits(0xE2, 8),
    "0011", bits(2, 13), bits(0x82, 8), bits(0xAC, 8),
    "1000", "0" + bits(3, 7),
    "0010", bits(10, 6), bits(63, 6),
  ].join("");
  const payload = readPayload(BitReader.fromBitString(stream));
  assert.equal(payload.text, "€A");
  assert.equal(payload.segments[1].text, "");
  assert.equal(payload.segments[2].text, "€");
  assert.equal(payload.segments[2].eciAssignment, 26);
  assert.equal(payload.segments[4].eciAssignment, 3);
});

test("preserves unknown ECI bytes and segment boundaries without invented text", () => {
  const stream = [
    "1000", "10" + bits(899, 14),
    "0011", bits(1, 13), bits(0x41, 8),
    "0010", bits(11, 6), bits(63, 6),
  ].join("");
  const payload = readPayload(BitReader.fromBitString(stream));
  assert.deepEqual(payload.bytes, Uint8Array.of(0x41, 0x42));
  assert.equal(payload.text, undefined);
  assert.equal(payload.segments.length, 3);
  assert.equal(payload.segments[1].eciAssignment, 899);
  assert.equal(payload.segments[1].eciSupported, false);
  assert.equal(payload.segments[1].text, undefined);
  assert.equal(payload.segments[2].text, undefined);
});

test("invalid ECI bytes make the complete ECI run textless but remain lossless", () => {
  const stream = [
    "1000", "0" + bits(26, 7),
    "0011", bits(1, 13), bits(0xC3, 8),
    "0010", bits(10, 6), bits(63, 6),
  ].join("");
  const payload = readPayload(BitReader.fromBitString(stream));
  assert.deepEqual(payload.bytes, Uint8Array.of(0xC3, 0x41));
  assert.equal(payload.text, undefined);
  assert.equal(payload.segments[1].eciValid, false);
  assert.equal(payload.segments[2].eciValid, false);
  assert.equal(payload.segments[2].eciSupported, true);
});

test("payload dispatcher preserves binary bytes without inventing text", () => {
  const stream = `0011${bits(2, 13)}${bits(0x00, 8)}${bits(0xFF, 8)}`;
  const payload = readPayload(BitReader.fromBitString(stream));
  assert.deepEqual(payload.bytes, Uint8Array.of(0x00, 0xFF));
  assert.equal(payload.text, undefined);
});
