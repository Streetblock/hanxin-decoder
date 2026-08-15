import assert from "node:assert/strict";
import test from "node:test";
import {
  BitReader,
  HAN_XIN_MODES,
  InvalidBitStreamError,
  readModeIndicator,
} from "../../src/core/index.js";

test("recognizes all eleven Table 1 mode indicators", () => {
  for (const expected of HAN_XIN_MODES) {
    const bits = expected.indicator.toString(2).padStart(expected.bitLength, "0");
    const reader = BitReader.fromBitString(`${bits}101011`);
    const actual = readModeIndicator(reader);
    assert.deepEqual(actual, expected);
    assert.equal(reader.position, expected.bitLength);
  }
});

test("rejects every reserved four-bit mode prefix", () => {
  for (const indicator of [0b0000, 0b1010, 0b1011, 0b1100, 0b1101, 0b1111]) {
    const reader = BitReader.fromBitString(indicator.toString(2).padStart(4, "0"));
    assert.throws(() => readModeIndicator(reader), InvalidBitStreamError);
  }
});

test("rejects reserved and incomplete extended mode indicators", () => {
  for (const suffix of [0, 3, 4, 7, 15]) {
    const reader = BitReader.fromBitString(`1110${suffix.toString(2).padStart(4, "0")}`);
    assert.throws(() => readModeIndicator(reader), InvalidBitStreamError);
  }
  assert.throws(
    () => readModeIndicator(BitReader.fromBitString("1110")),
    InvalidBitStreamError,
  );
  assert.throws(
    () => readModeIndicator(BitReader.fromBitString("101")),
    InvalidBitStreamError,
  );
});
