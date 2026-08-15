import assert from "node:assert/strict";
import test from "node:test";
import { BitReader, BitWriter, InvalidBitStreamError } from "../../src/core/index.js";

test("BitReader reads across byte boundaries in network bit order", () => {
  const reader = new BitReader(Uint8Array.of(0b10110110, 0b01100000), 11);
  assert.equal(reader.readBits(3), 0b101);
  assert.equal(reader.peekBits(5), 0b10110);
  assert.equal(reader.readBits(5), 0b10110);
  assert.equal(reader.readBits(3), 0b011);
  assert.equal(reader.available, 0);
  assert.throws(() => reader.readBits(1), InvalidBitStreamError);
});

test("BitWriter round-trips an unaligned bit stream", () => {
  const writer = new BitWriter().write(0b1001, 4).writeBits("01101").write(3, 2);
  assert.equal(writer.toBitString(), "10010110111");

  const reader = new BitReader(writer.toUint8Array(), writer.bitLength);
  assert.equal(reader.readBits(4), 0b1001);
  assert.equal(reader.readBits(5), 0b01101);
  assert.equal(reader.readBits(2), 3);
});
