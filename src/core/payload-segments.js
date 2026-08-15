import { BitReader } from "./bit-stream.js";
import { InvalidBitStreamError } from "./errors.js";
import { HanXinMode } from "./modes.js";

const NUMERIC_TERMINATORS = new Map([
  [1021, 1],
  [1022, 2],
  [1023, 3],
]);
const TEXT_SWITCH = 62;
const TEXT_TERMINATOR = 63;

function assertReader(reader) {
  if (!(reader instanceof BitReader)) {
    throw new TypeError("reader must be a BitReader");
  }
}

function asciiBytes(text) {
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

function textOneByte(value) {
  if (value <= 9) return 0x30 + value;
  if (value <= 35) return 0x41 + value - 10;
  return 0x61 + value - 36;
}

function textTwoByte(value) {
  if (value <= 27) return value;
  if (value <= 43) return 0x20 + value - 28;
  if (value <= 50) return 0x3A + value - 44;
  if (value <= 56) return 0x5B + value - 51;
  return 0x7B + value - 57;
}

/** Reads a numeric segment after its four-bit mode indicator. */
export function readNumericSegment(reader) {
  assertReader(reader);
  const groups = [];

  while (true) {
    if (reader.available < 10) {
      throw new InvalidBitStreamError("numeric segment has no complete terminator");
    }
    const value = reader.readBits(10);
    const finalDigitCount = NUMERIC_TERMINATORS.get(value);
    if (finalDigitCount !== undefined) {
      if (groups.length === 0) {
        throw new InvalidBitStreamError("numeric terminator appears before any digit group");
      }

      const finalValue = groups.at(-1);
      if (finalValue >= 10 ** finalDigitCount) {
        throw new InvalidBitStreamError(
          `numeric final group ${finalValue} does not fit ${finalDigitCount} digits`,
        );
      }

      const text = groups
        .map((group, index) => group.toString().padStart(
          index === groups.length - 1 ? finalDigitCount : 3,
          "0",
        ))
        .join("");
      return {
        mode: HanXinMode.NUMERIC,
        bytes: asciiBytes(text),
        text,
        characterCount: text.length,
      };
    }

    if (value > 999) {
      throw new InvalidBitStreamError(`reserved numeric value ${value}`);
    }
    groups.push(value);
  }
}

/** Reads a Text segment after its four-bit mode indicator. */
export function readTextSegment(reader) {
  assertReader(reader);
  const values = [];
  let submode = 1;
  let needsCharacterAfterSwitch = false;

  while (true) {
    if (reader.available < 6) {
      throw new InvalidBitStreamError("text segment has no complete terminator");
    }
    const value = reader.readBits(6);
    if (value === TEXT_TERMINATOR) {
      if (values.length === 0) {
        throw new InvalidBitStreamError("text terminator appears before any character");
      }
      if (needsCharacterAfterSwitch) {
        throw new InvalidBitStreamError("text submode switch is not followed by a character");
      }
      break;
    }
    if (value === TEXT_SWITCH) {
      if (needsCharacterAfterSwitch) {
        throw new InvalidBitStreamError("consecutive text submode switches are invalid");
      }
      submode = submode === 1 ? 2 : 1;
      needsCharacterAfterSwitch = true;
      continue;
    }

    values.push(submode === 1 ? textOneByte(value) : textTwoByte(value));
    needsCharacterAfterSwitch = false;
  }

  const bytes = Uint8Array.from(values);
  let text = "";
  for (const value of bytes) text += String.fromCharCode(value);
  return {
    mode: HanXinMode.TEXT,
    bytes,
    text,
    characterCount: bytes.length,
  };
}

/** Reads a binary/byte segment after its four-bit mode indicator. */
export function readBinarySegment(reader) {
  assertReader(reader);
  if (reader.available < 13) {
    throw new InvalidBitStreamError("binary segment has no complete byte count");
  }
  const byteCount = reader.readBits(13);
  if (byteCount === 0) {
    throw new InvalidBitStreamError("binary segment byte count must be positive");
  }
  if (reader.available < byteCount * 8) {
    throw new InvalidBitStreamError(
      `binary segment declares ${byteCount} bytes with only ${Math.floor(reader.available / 8)} available`,
    );
  }

  const bytes = new Uint8Array(byteCount);
  for (let index = 0; index < byteCount; index += 1) {
    bytes[index] = reader.readBits(8);
  }
  return {
    mode: HanXinMode.BINARY,
    bytes,
    text: undefined,
    characterCount: byteCount,
  };
}
