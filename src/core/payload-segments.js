import { BitReader } from "./bit-stream.js";
import { characterSetForEci, createEciTextDecoder } from "./eci.js";
import { InvalidBitStreamError } from "./errors.js";
import { HanXinMode, readModeIndicator } from "./modes.js";

const NUMERIC_TERMINATORS = new Map([
  [1021, 1],
  [1022, 2],
  [1023, 3],
]);
const TEXT_SWITCH = 62;
const TEXT_TERMINATOR = 63;
const COMMON_CHINESE_SWITCH = 0xFFE;
const COMMON_CHINESE_TERMINATOR = 0xFFF;
const GB18030_TWO_BYTE_TERMINATOR = 0x7FFF;
const GS1_FNC1 = 1000;

const URI_SET_A = Object.freeze([
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."0123456789",
  ".", "/", "-", "_", "~", ":", "@", "?", "#", "=", "+", "$", "&",
  "http://", "https://", "ftp://", "mailto:", "ldap://", "tel:", "urn:", "www.",
  ".com", ".net", ".gov", ".org", ".cn",
]);
const URI_SET_B = Object.freeze([
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "!", "*", "(", ")", ",", "{", "}", "|", "\\", "^", "[", "]", "`", "<", ">",
  "%", "\"", ";", ".htm", ".html", ".asp", ".aspx", ".php", ".jsp", "gtin", "ser",
  "bat", "exp", "search", "id", ".jp", ".it", ".de", ".br", ".fr", "gs1",
]);
const URI_SET_C = Object.freeze([
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."0123456789",
  "$", "-", "_", ".", "+", "!", "*", "(", ")", ",", "{", "}", "|", "\\", "^",
  "~", "[", "]", "`", "<", ">", "#", "%", "\"", ";", "/", "?", ":", "@", "&", "=",
  "http://", "https://", "ftp://", "mailto:", "ldap://", "tel:", "urn:", "www.",
  ".com", ".net", ".gov", ".org", ".cn", ".htm", ".html", ".asp", ".aspx", ".php",
  ".jsp", "gtin", "ser", "bat", "exp", "search", "id", ".jp", ".it", ".de", ".br",
  ".fr", "gs1", "search",
]);

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

function decodeGb18030(bytes) {
  try {
    return new TextDecoder("gb18030", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

function readUnicodeGroupCount(reader) {
  if (reader.available < 4) {
    throw new InvalidBitStreamError("Unicode byte-mode counter is truncated");
  }
  const prefix = reader.peekBits(4);
  let bitLength;
  let payloadBits;
  if ((prefix & 0b1000) === 0) {
    bitLength = 4;
    payloadBits = 3;
  } else if ((prefix & 0b1100) === 0b1000) {
    bitLength = 8;
    payloadBits = 6;
  } else if ((prefix & 0b1110) === 0b1100) {
    bitLength = 12;
    payloadBits = 9;
  } else if (prefix === 0b1110) {
    bitLength = 16;
    payloadBits = 12;
  } else {
    bitLength = 20;
    payloadBits = 15;
  }
  if (reader.available < bitLength) {
    throw new InvalidBitStreamError(`${bitLength}-bit Unicode byte-mode counter is truncated`);
  }
  const value = reader.readBits(bitLength) & ((2 ** payloadBits) - 1);
  if (value === 0) {
    throw new InvalidBitStreamError("Unicode byte-mode counter must be positive");
  }
  return value;
}

function decodeUtf8Character(bytes, expectedByteLength) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new InvalidBitStreamError("Unicode segment contains invalid UTF-8");
  }
  if (bytes.length !== expectedByteLength || Array.from(text).length !== 1) {
    throw new InvalidBitStreamError(
      `Unicode ${expectedByteLength}-byte group does not encode exactly one character`,
    );
  }
  return text;
}

function concatBytes(arrays) {
  const length = arrays.reduce((sum, bytes) => sum + bytes.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const bytes of arrays) {
    output.set(bytes, offset);
    offset += bytes.length;
  }
  return output;
}

function readerHasOnlyZeroes(reader) {
  const position = reader.position;
  try {
    while (reader.available > 0) {
      if (reader.readBits(Math.min(32, reader.available)) !== 0) return false;
    }
    return true;
  } finally {
    reader.position = position;
  }
}

function applyEciInterpretation(segments) {
  let activeAssignment;
  let activeCharacterSet;
  let decoder;
  let activeSupported = false;
  let runIndexes = [];
  let runValid = true;

  function invalidateRun() {
    runValid = false;
    decoder = undefined;
    for (const index of runIndexes) {
      segments[index] = { ...segments[index], text: undefined, eciValid: false };
    }
  }

  function finishRun() {
    if (decoder && runValid && runIndexes.length > 0) {
      try {
        const finalText = decoder.decode();
        const lastIndex = runIndexes.at(-1);
        segments[lastIndex] = {
          ...segments[lastIndex],
          text: `${segments[lastIndex].text}${finalText}`,
        };
      } catch {
        invalidateRun();
      }
    }
    runIndexes = [];
  }

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment.mode === HanXinMode.ECI) {
      finishRun();
      activeAssignment = segment.assignmentNumber;
      activeCharacterSet = characterSetForEci(activeAssignment);
      decoder = createEciTextDecoder(activeAssignment);
      activeSupported = decoder !== undefined;
      runValid = decoder !== undefined;
      segments[index] = {
        ...segment,
        eciCharacterSet: activeCharacterSet?.name,
        eciSupported: activeSupported,
      };
      continue;
    }
    if (activeAssignment === undefined) continue;

    runIndexes.push(index);
    const metadata = {
      eciAssignment: activeAssignment,
      eciCharacterSet: activeCharacterSet?.name,
      eciSupported: activeSupported,
      eciValid: activeSupported ? runValid : undefined,
    };
    if (!decoder || !runValid) {
      segments[index] = { ...segment, ...metadata, text: undefined };
      continue;
    }
    try {
      segments[index] = {
        ...segment,
        ...metadata,
        text: decoder.decode(segment.bytes, { stream: true }),
      };
    } catch {
      segments[index] = { ...segment, ...metadata, text: undefined, eciValid: false };
      invalidateRun();
    }
  }
  finishRun();
  return segments;
}

function commonChineseRegionOneBytes(value) {
  if (value < 3760) {
    return [Math.floor(value / 94) + 0xB0, (value % 94) + 0xA1];
  }
  if (value < 4042) {
    const offset = value - 0xEB0;
    return [Math.floor(offset / 94) + 0xA1, (offset % 94) + 0xA1];
  }
  if (value < 4074) return [0xA8, value - 0xFCA + 0xA1];
  throw new InvalidBitStreamError(`reserved common Chinese region-one value ${value}`);
}

function commonChineseRegionTwoBytes(value) {
  if (value >= 3008) {
    throw new InvalidBitStreamError(`reserved common Chinese region-two value ${value}`);
  }
  return [Math.floor(value / 94) + 0xD8, (value % 94) + 0xA1];
}

function commonChineseMode(region) {
  return region === 1
    ? HanXinMode.COMMON_CHINESE_REGION_ONE
    : HanXinMode.COMMON_CHINESE_REGION_TWO;
}

function readCommonChineseSegment(reader, initialRegion) {
  assertReader(reader);
  let region = initialRegion;
  const values = [];
  const output = [];

  while (true) {
    if (reader.available < 12) {
      throw new InvalidBitStreamError("common Chinese segment has no complete terminator");
    }
    const value = reader.readBits(12);
    if (value === COMMON_CHINESE_TERMINATOR) break;
    if (value === COMMON_CHINESE_SWITCH) {
      region = region === 1 ? 2 : 1;
      continue;
    }

    const bytes = region === 1
      ? commonChineseRegionOneBytes(value)
      : commonChineseRegionTwoBytes(value);
    output.push(...bytes);
    values.push({ region, value });
  }

  if (values.length === 0) {
    throw new InvalidBitStreamError("common Chinese terminator appears before any character");
  }

  const bytes = Uint8Array.from(output);
  return {
    mode: commonChineseMode(initialRegion),
    bytes,
    text: decodeGb18030(bytes),
    characterCount: values.length,
    values,
  };
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

/** Reads a common-Chinese region-one segment after its four-bit mode indicator. */
export function readCommonChineseRegionOneSegment(reader) {
  return readCommonChineseSegment(reader, 1);
}

/** Reads a common-Chinese region-two segment after its four-bit mode indicator. */
export function readCommonChineseRegionTwoSegment(reader) {
  return readCommonChineseSegment(reader, 2);
}

/** Reads a GB 18030 two-byte segment after its four-bit mode indicator. */
export function readGb18030TwoByteSegment(reader) {
  assertReader(reader);
  const output = [];
  let characterCount = 0;

  while (true) {
    if (reader.available < 15) {
      throw new InvalidBitStreamError("GB 18030 two-byte segment has no complete terminator");
    }
    const value = reader.readBits(15);
    if (value === GB18030_TWO_BYTE_TERMINATOR) break;
    if (value >= 23940) {
      throw new InvalidBitStreamError(`reserved GB 18030 two-byte value ${value}`);
    }

    const first = Math.floor(value / 190) + 0x81;
    const trail = value % 190;
    const second = trail < 63 ? trail + 0x40 : trail + 0x41;
    output.push(first, second);
    characterCount += 1;
  }

  if (characterCount === 0) {
    throw new InvalidBitStreamError("GB 18030 two-byte terminator appears before any character");
  }

  const bytes = Uint8Array.from(output);
  return {
    mode: HanXinMode.GB18030_TWO_BYTE,
    bytes,
    text: decodeGb18030(bytes),
    characterCount,
  };
}

/** Reads the single character carried by a GB 18030 four-byte segment. */
export function readGb18030FourByteSegment(reader) {
  assertReader(reader);
  if (reader.available < 21) {
    throw new InvalidBitStreamError("GB 18030 four-byte segment is truncated");
  }
  const value = reader.readBits(21);
  if (value >= 1_587_600) {
    throw new InvalidBitStreamError(`reserved GB 18030 four-byte value ${value}`);
  }

  let remainder = value;
  const first = Math.floor(remainder / 12_600);
  remainder %= 12_600;
  const second = Math.floor(remainder / 1_260);
  remainder %= 1_260;
  const third = Math.floor(remainder / 10);
  const fourth = remainder % 10;
  const bytes = Uint8Array.of(first + 0x81, second + 0x30, third + 0x81, fourth + 0x30);
  return {
    mode: HanXinMode.GB18030_FOUR_BYTE,
    bytes,
    text: decodeGb18030(bytes),
    characterCount: 1,
    value,
  };
}

/** Reads an AIM ECI assignment number after its four-bit mode indicator. */
export function readEciSegment(reader) {
  assertReader(reader);
  if (reader.available < 8) {
    throw new InvalidBitStreamError("ECI assignment number is truncated");
  }

  const prefix = reader.peekBits(2);
  let assignmentNumber;
  let bitLength;
  if ((prefix & 0b10) === 0) {
    assignmentNumber = reader.readBits(8) & 0x7F;
    bitLength = 8;
  } else if (prefix === 0b10) {
    if (reader.available < 16) {
      throw new InvalidBitStreamError("16-bit ECI assignment number is truncated");
    }
    assignmentNumber = reader.readBits(16) & 0x3FFF;
    bitLength = 16;
  } else {
    if (reader.available < 24) {
      throw new InvalidBitStreamError("24-bit ECI assignment number is truncated");
    }
    assignmentNumber = reader.readBits(24) & 0x1F_FFFF;
    bitLength = 24;
    if (assignmentNumber > 999_999) {
      throw new InvalidBitStreamError(`reserved ECI assignment number ${assignmentNumber}`);
    }
  }

  return {
    mode: HanXinMode.ECI,
    bytes: new Uint8Array(0),
    text: undefined,
    characterCount: 0,
    assignmentNumber,
    bitLength,
  };
}

/** Reads the standard's differential UTF-8 representation in Unicode mode. */
export function readUnicodeSegment(reader) {
  assertReader(reader);
  const output = [];
  const groups = [];
  let text = "";

  while (true) {
    if (reader.available < 4) {
      throw new InvalidBitStreamError("Unicode segment has no complete terminator");
    }
    const byteMode = reader.readBits(4);
    if (byteMode === 0b1111) break;
    if (byteMode < 1 || byteMode > 4) {
      throw new InvalidBitStreamError(`reserved Unicode byte mode ${byteMode}`);
    }

    const count = readUnicodeGroupCount(reader);
    if (reader.available < byteMode * 12) {
      throw new InvalidBitStreamError("Unicode byte-mode header is truncated");
    }
    const differenceWidths = Array.from({ length: byteMode }, () => reader.readBits(4));
    if (differenceWidths.some((width) => width > 8)) {
      throw new InvalidBitStreamError("Unicode difference width exceeds eight bits");
    }
    const minima = Array.from({ length: byteMode }, () => reader.readBits(8));

    for (let groupIndex = 0; groupIndex < count; groupIndex += 1) {
      const bytes = new Uint8Array(byteMode);
      for (let byteIndex = 0; byteIndex < byteMode; byteIndex += 1) {
        const width = differenceWidths[byteIndex];
        if (reader.available < width) {
          throw new InvalidBitStreamError("Unicode difference data is truncated");
        }
        const value = minima[byteIndex] + reader.readBits(width);
        if (value > 0xFF) {
          throw new InvalidBitStreamError("Unicode differential byte exceeds 255");
        }
        bytes[byteIndex] = value;
      }
      const character = decodeUtf8Character(bytes, byteMode);
      output.push(...bytes);
      text += character;
    }
    groups.push({ byteMode, count, differenceWidths, minima });
  }

  if (groups.length === 0) {
    throw new InvalidBitStreamError("Unicode terminator appears before any byte-mode group");
  }

  return {
    mode: HanXinMode.UNICODE,
    bytes: Uint8Array.from(output),
    text,
    characterCount: Array.from(text).length,
    groups,
  };
}

function readGs1NumericSegment(reader) {
  const tokens = [];
  let finalDigitCount;

  while (true) {
    if (reader.available < 10) {
      throw new InvalidBitStreamError("GS1 numeric segment has no complete terminator");
    }
    const value = reader.readBits(10);
    const terminatorDigits = NUMERIC_TERMINATORS.get(value);
    if (terminatorDigits !== undefined) {
      finalDigitCount = terminatorDigits;
      break;
    }
    if (value === GS1_FNC1) {
      tokens.push({ fnc1: true });
    } else if (value <= 999) {
      tokens.push({ value });
    } else {
      throw new InvalidBitStreamError(`reserved GS1 numeric value ${value}`);
    }
  }

  const numericTokens = tokens.filter(({ value }) => value !== undefined);
  if (numericTokens.length === 0) {
    throw new InvalidBitStreamError("GS1 numeric terminator appears before any digit group");
  }
  const lastNumericToken = numericTokens.at(-1);
  if (lastNumericToken.value >= 10 ** finalDigitCount) {
    throw new InvalidBitStreamError(
      `GS1 numeric final group ${lastNumericToken.value} does not fit ${finalDigitCount} digits`,
    );
  }

  let text = "";
  for (const token of tokens) {
    if (token.fnc1) {
      text += "\u001D";
      continue;
    }
    const width = token === lastNumericToken ? finalDigitCount : 3;
    text += token.value.toString().padStart(width, "0");
  }
  return {
    mode: HanXinMode.NUMERIC,
    bytes: asciiBytes(text),
    text,
    characterCount: text.length,
    gs1: true,
  };
}

/** Reads a GS1 container after its eight-bit mode indicator. */
export function readGs1Segment(reader) {
  assertReader(reader);
  const segments = [];

  while (true) {
    if (reader.available < 8) {
      throw new InvalidBitStreamError("GS1 segment has no complete terminator");
    }
    if (reader.peekBits(8) === 0xFF) {
      reader.skip(8);
      break;
    }

    const definition = readModeIndicator(reader);
    let segment;
    if (definition.mode === HanXinMode.NUMERIC) {
      segment = readGs1NumericSegment(reader);
    } else if (definition.mode === HanXinMode.TEXT) {
      segment = { ...readTextSegment(reader), gs1: true };
    } else {
      throw new InvalidBitStreamError(`mode ${definition.mode} is not permitted inside GS1`);
    }
    segments.push(segment);
  }

  if (segments.length === 0) {
    throw new InvalidBitStreamError("GS1 terminator appears before any data segment");
  }
  const bytes = concatBytes(segments.map((segment) => segment.bytes));
  return {
    mode: HanXinMode.GS1,
    bytes,
    text: segments.map((segment) => segment.text).join(""),
    characterCount: bytes.length,
    segments,
    gs1: true,
  };
}

function uriSetDefinition(set) {
  if (set === "A") return { values: URI_SET_A, width: 6, switchValue: 62, endValue: 63 };
  if (set === "B") return { values: URI_SET_B, width: 6, switchValue: 62, endValue: 63 };
  return { values: URI_SET_C, width: 7, switchValue: undefined, endValue: 127 };
}

function readUriCharacterSet(reader, initialSet) {
  let set = initialSet;
  let text = "";
  while (true) {
    const definition = uriSetDefinition(set);
    if (reader.available < definition.width) {
      throw new InvalidBitStreamError(`URI-${set} character data is truncated`);
    }
    const value = reader.readBits(definition.width);
    if (value === definition.endValue) return text;
    if (set === "C" && value === 125) {
      set = "A";
      continue;
    }
    if (set === "C" && value === 126) {
      set = "B";
      continue;
    }
    if (value === definition.switchValue) {
      set = set === "A" ? "B" : "A";
      continue;
    }
    const token = definition.values[value];
    if (token === undefined) {
      throw new InvalidBitStreamError(`reserved URI-${set} value ${value}`);
    }
    text += token;
  }
}

/** Reads a URI container after its eight-bit mode indicator. */
export function readUriSegment(reader) {
  assertReader(reader);
  let text = "";
  const groups = [];

  while (true) {
    if (reader.available < 3) {
      throw new InvalidBitStreamError("URI segment has no complete terminator");
    }
    const indicator = reader.readBits(3);
    if (indicator === 0b111) break;
    if (indicator >= 1 && indicator <= 3) {
      const set = String.fromCharCode(0x40 + indicator);
      const value = readUriCharacterSet(reader, set);
      text += value;
      groups.push({ set, text: value });
      continue;
    }
    if (indicator === 0b100) {
      if (reader.available < 6) {
        throw new InvalidBitStreamError("URI percent-encoding count is truncated");
      }
      const count = reader.readBits(6);
      if (count === 0) {
        throw new InvalidBitStreamError("URI percent-encoding count must be positive");
      }
      if (reader.available < count * 8) {
        throw new InvalidBitStreamError("URI percent-encoding bytes are truncated");
      }
      const bytes = new Uint8Array(count);
      let escaped = "";
      for (let index = 0; index < count; index += 1) {
        bytes[index] = reader.readBits(8);
        escaped += `%${bytes[index].toString(16).padStart(2, "0").toUpperCase()}`;
      }
      text += escaped;
      groups.push({ set: "percent", text: escaped, bytes });
      continue;
    }
    throw new InvalidBitStreamError(`reserved URI character-set indicator ${indicator}`);
  }

  if (groups.length === 0) {
    throw new InvalidBitStreamError("URI terminator appears before any character group");
  }
  const bytes = new TextEncoder().encode(text);
  return {
    mode: HanXinMode.URI,
    bytes,
    text,
    characterCount: Array.from(text).length,
    groups,
    uri: true,
  };
}

const SEGMENT_READERS = Object.freeze({
  [HanXinMode.NUMERIC]: readNumericSegment,
  [HanXinMode.TEXT]: readTextSegment,
  [HanXinMode.BINARY]: readBinarySegment,
  [HanXinMode.COMMON_CHINESE_REGION_ONE]: readCommonChineseRegionOneSegment,
  [HanXinMode.COMMON_CHINESE_REGION_TWO]: readCommonChineseRegionTwoSegment,
  [HanXinMode.GB18030_TWO_BYTE]: readGb18030TwoByteSegment,
  [HanXinMode.GB18030_FOUR_BYTE]: readGb18030FourByteSegment,
  [HanXinMode.ECI]: readEciSegment,
  [HanXinMode.UNICODE]: readUnicodeSegment,
  [HanXinMode.GS1]: readGs1Segment,
  [HanXinMode.URI]: readUriSegment,
});

/** Decodes a complete information bit stream into its ordered Han Xin segments. */
export function readPayload(input) {
  const reader = input instanceof BitReader ? input : new BitReader(input);
  const segments = [];

  while (reader.available > 0) {
    if (readerHasOnlyZeroes(reader)) {
      reader.skip(reader.available);
      break;
    }
    const definition = readModeIndicator(reader);
    const segment = SEGMENT_READERS[definition.mode](reader);
    segments.push(segment);
  }

  applyEciInterpretation(segments);

  const dataSegments = segments.filter((segment) => segment.mode !== HanXinMode.ECI);
  if (dataSegments.length === 0) {
    throw new InvalidBitStreamError("payload contains no data segment");
  }
  const bytes = concatBytes(dataSegments.map((segment) => segment.bytes));
  const hasLosslessText = dataSegments.every((segment) => segment.text !== undefined);
  return {
    bytes,
    text: hasLosslessText ? dataSegments.map((segment) => segment.text).join("") : undefined,
    segments,
    bitsRead: reader.position,
    eciUsed: segments.some((segment) => segment.mode === HanXinMode.ECI),
    gs1: segments.some((segment) => segment.mode === HanXinMode.GS1),
    uri: segments.some((segment) => segment.mode === HanXinMode.URI),
    unicode: segments.some((segment) => segment.mode === HanXinMode.UNICODE),
  };
}

/** Returns the ISO/IEC 15424 Han Xin symbology identifier from Annex K. */
export function symbologyIdentifierForPayload(payload) {
  if (!payload || !Array.isArray(payload.segments)) {
    throw new TypeError("payload must be a decoded Han Xin payload");
  }
  const modifiers = [
    [payload.eciUsed, 1],
    [payload.gs1, 2],
    [payload.uri, 4],
    [payload.unicode, 8],
  ].filter(([enabled]) => enabled).map(([, modifier]) => modifier);
  if (modifiers.length > 1) {
    throw new InvalidBitStreamError(
      "payload combines modes with incompatible symbology-identifier modifiers",
    );
  }
  return `]h${modifiers[0] ?? 0}`;
}
