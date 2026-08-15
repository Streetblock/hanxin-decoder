import { BitReader } from "./bit-stream.js";
import { InvalidBitStreamError } from "./errors.js";

export const HanXinMode = Object.freeze({
  NUMERIC: "numeric",
  TEXT: "text",
  BINARY: "binary",
  COMMON_CHINESE_REGION_ONE: "common-chinese-region-one",
  COMMON_CHINESE_REGION_TWO: "common-chinese-region-two",
  GB18030_TWO_BYTE: "gb18030-two-byte",
  GB18030_FOUR_BYTE: "gb18030-four-byte",
  ECI: "eci",
  UNICODE: "unicode",
  GS1: "gs1",
  URI: "uri",
});

export const HAN_XIN_MODES = Object.freeze([
  Object.freeze({ mode: HanXinMode.NUMERIC, indicator: 0b0001, bitLength: 4 }),
  Object.freeze({ mode: HanXinMode.TEXT, indicator: 0b0010, bitLength: 4 }),
  Object.freeze({ mode: HanXinMode.BINARY, indicator: 0b0011, bitLength: 4 }),
  Object.freeze({ mode: HanXinMode.COMMON_CHINESE_REGION_ONE, indicator: 0b0100, bitLength: 4 }),
  Object.freeze({ mode: HanXinMode.COMMON_CHINESE_REGION_TWO, indicator: 0b0101, bitLength: 4 }),
  Object.freeze({ mode: HanXinMode.GB18030_TWO_BYTE, indicator: 0b0110, bitLength: 4 }),
  Object.freeze({ mode: HanXinMode.GB18030_FOUR_BYTE, indicator: 0b0111, bitLength: 4 }),
  Object.freeze({ mode: HanXinMode.ECI, indicator: 0b1000, bitLength: 4 }),
  Object.freeze({ mode: HanXinMode.UNICODE, indicator: 0b1001, bitLength: 4 }),
  Object.freeze({ mode: HanXinMode.GS1, indicator: 0b11100001, bitLength: 8 }),
  Object.freeze({ mode: HanXinMode.URI, indicator: 0b11100010, bitLength: 8 }),
]);

const FOUR_BIT_MODES = new Map(
  HAN_XIN_MODES
    .filter(({ bitLength }) => bitLength === 4)
    .map((definition) => [definition.indicator, definition]),
);
const EIGHT_BIT_MODES = new Map(
  HAN_XIN_MODES
    .filter(({ bitLength }) => bitLength === 8)
    .map((definition) => [definition.indicator, definition]),
);

export function readModeIndicator(reader) {
  if (!(reader instanceof BitReader)) {
    throw new TypeError("reader must be a BitReader");
  }
  if (reader.available < 4) {
    throw new InvalidBitStreamError("incomplete Han Xin mode indicator");
  }

  const prefix = reader.readBits(4);
  const shortDefinition = FOUR_BIT_MODES.get(prefix);
  if (shortDefinition) return shortDefinition;

  if (prefix !== 0b1110) {
    throw new InvalidBitStreamError(
      `reserved Han Xin mode indicator ${prefix.toString(2).padStart(4, "0")}`,
    );
  }
  if (reader.available < 4) {
    throw new InvalidBitStreamError("incomplete eight-bit Han Xin mode indicator");
  }

  const indicator = (prefix << 4) | reader.readBits(4);
  const longDefinition = EIGHT_BIT_MODES.get(indicator);
  if (!longDefinition) {
    throw new InvalidBitStreamError(
      `reserved Han Xin mode indicator ${indicator.toString(2).padStart(8, "0")}`,
    );
  }
  return longDefinition;
}
