import { InvalidBitStreamError } from "./errors.js";

function assertBitCount(count, maximum = 32) {
  if (!Number.isInteger(count) || count < 0 || count > maximum) {
    throw new RangeError(`bit count must be an integer from 0 to ${maximum}`);
  }
}

export class BitReader {
  constructor(bytes, bitLength = bytes?.length * 8) {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError("bytes must be a Uint8Array");
    }
    if (!Number.isInteger(bitLength) || bitLength < 0 || bitLength > bytes.length * 8) {
      throw new RangeError("bitLength is outside the supplied byte array");
    }
    this.bytes = bytes;
    this.bitLength = bitLength;
    this.position = 0;
  }

  static fromBitString(bits) {
    if (typeof bits !== "string" || /[^01]/u.test(bits)) {
      throw new TypeError("bits must contain only '0' and '1'");
    }
    const bytes = new Uint8Array(Math.ceil(bits.length / 8));
    for (let index = 0; index < bits.length; index += 1) {
      if (bits[index] === "1") bytes[index >>> 3] |= 1 << (7 - (index & 7));
    }
    return new BitReader(bytes, bits.length);
  }

  get available() {
    return this.bitLength - this.position;
  }

  get byteOffset() {
    return this.position >>> 3;
  }

  get bitOffset() {
    return this.position & 7;
  }

  readBits(count) {
    assertBitCount(count);
    if (count > this.available) {
      throw new InvalidBitStreamError(
        `requested ${count} bits with only ${this.available} bits available`,
      );
    }

    let result = 0;
    for (let remaining = count; remaining > 0; remaining -= 1) {
      const byte = this.bytes[this.position >>> 3];
      result = result * 2 + ((byte >>> (7 - (this.position & 7))) & 1);
      this.position += 1;
    }
    return result >>> 0;
  }

  readBoolean() {
    return this.readBits(1) === 1;
  }

  peekBits(count) {
    const position = this.position;
    try {
      return this.readBits(count);
    } finally {
      this.position = position;
    }
  }

  skip(count) {
    assertBitCount(count, Number.MAX_SAFE_INTEGER);
    if (count > this.available) {
      throw new InvalidBitStreamError(
        `cannot skip ${count} bits with only ${this.available} bits available`,
      );
    }
    this.position += count;
    return this;
  }
}

export class BitWriter {
  constructor() {
    this.bits = [];
  }

  get bitLength() {
    return this.bits.length;
  }

  write(value, count) {
    assertBitCount(count);
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError("value must be a non-negative safe integer");
    }
    const limit = count === 32 ? 0x1_0000_0000 : 2 ** count;
    if (value >= limit) {
      throw new RangeError(`value ${value} does not fit in ${count} bits`);
    }
    for (let shift = count - 1; shift >= 0; shift -= 1) {
      this.bits.push(Math.floor(value / (2 ** shift)) & 1);
    }
    return this;
  }

  writeBits(bits) {
    if (typeof bits !== "string" || /[^01]/u.test(bits)) {
      throw new TypeError("bits must contain only '0' and '1'");
    }
    for (const bit of bits) this.bits.push(bit === "1" ? 1 : 0);
    return this;
  }

  toUint8Array() {
    const bytes = new Uint8Array(Math.ceil(this.bits.length / 8));
    for (let index = 0; index < this.bits.length; index += 1) {
      bytes[index >>> 3] |= this.bits[index] << (7 - (index & 7));
    }
    return bytes;
  }

  toBitString() {
    return this.bits.join("");
  }
}
