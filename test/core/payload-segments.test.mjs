import assert from "node:assert/strict";
import test from "node:test";

import {
  BitReader,
  InvalidBitStreamError,
  readBinarySegment,
  readModeIndicator,
  readNumericSegment,
  readTextSegment,
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
