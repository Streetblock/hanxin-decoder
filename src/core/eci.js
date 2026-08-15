const ECI_CHARACTER_SETS = new Map();

function register(assignments, name, label, kind = "text-decoder") {
  const descriptor = Object.freeze({
    assignments: Object.freeze([...assignments]),
    name,
    label,
    kind,
  });
  for (const assignmentNumber of assignments) {
    ECI_CHARACTER_SETS.set(assignmentNumber, descriptor);
  }
}

register([0, 2], "IBM437", undefined, "unsupported");
register([1, 3], "ISO-8859-1", undefined, "latin1");
register([4], "ISO-8859-2", "iso-8859-2");
register([5], "ISO-8859-3", "iso-8859-3");
register([6], "ISO-8859-4", "iso-8859-4");
register([7], "ISO-8859-5", "iso-8859-5");
register([8], "ISO-8859-6", "iso-8859-6");
register([9], "ISO-8859-7", "iso-8859-7");
register([10], "ISO-8859-8", "iso-8859-8");
register([11], "ISO-8859-9", "iso-8859-9");
register([12], "ISO-8859-10", undefined, "unsupported");
register([13], "ISO-8859-11", "iso-8859-11");
register([15], "ISO-8859-13", "iso-8859-13");
register([16], "ISO-8859-14", undefined, "unsupported");
register([17], "ISO-8859-15", "iso-8859-15");
register([18], "ISO-8859-16", undefined, "unsupported");
register([20], "Shift_JIS", "shift_jis");
register([21], "windows-1250", "windows-1250");
register([22], "windows-1251", "windows-1251");
register([23], "windows-1252", "windows-1252");
register([24], "windows-1256", "windows-1256");
register([25], "UTF-16BE", "utf-16be");
register([26], "UTF-8", "utf-8");
register([27, 170], "US-ASCII", undefined, "ascii");
register([28], "Big5", "big5");
register([29], "GB18030", "gb18030");
register([30], "EUC-KR", "euc-kr");

class SingleByteDecoder {
  constructor(maximum) {
    this.maximum = maximum;
  }

  decode(bytes = new Uint8Array(0)) {
    let text = "";
    for (const byte of bytes) {
      if (byte > this.maximum) {
        throw new TypeError(`byte ${byte} is outside the character set`);
      }
      text += String.fromCharCode(byte);
    }
    return text;
  }
}

/** Returns the registered character-set descriptor for an ECI assignment. */
export function characterSetForEci(assignmentNumber) {
  if (!Number.isInteger(assignmentNumber) || assignmentNumber < 0 || assignmentNumber > 999_999) {
    throw new RangeError("ECI assignment number must be an integer from 0 through 999999");
  }
  return ECI_CHARACTER_SETS.get(assignmentNumber);
}

/**
 * Creates a strict streaming decoder for a registered character-set ECI.
 * Undefined means that the assignment is unknown or unavailable in this runtime.
 */
export function createEciTextDecoder(assignmentNumber) {
  const characterSet = characterSetForEci(assignmentNumber);
  if (!characterSet || characterSet.kind === "unsupported") return undefined;
  if (characterSet.kind === "latin1") return new SingleByteDecoder(0xFF);
  if (characterSet.kind === "ascii") return new SingleByteDecoder(0x7F);
  try {
    return new TextDecoder(characterSet.label, { fatal: true });
  } catch {
    return undefined;
  }
}

/** Decodes one complete ECI byte sequence without replacing malformed input. */
export function decodeEciBytes(assignmentNumber, bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("bytes must be a Uint8Array");
  }
  const characterSet = characterSetForEci(assignmentNumber);
  const decoder = createEciTextDecoder(assignmentNumber);
  if (!decoder) {
    return Object.freeze({ characterSet, supported: false, valid: undefined, text: undefined });
  }
  try {
    return Object.freeze({
      characterSet,
      supported: true,
      valid: true,
      text: decoder.decode(bytes),
    });
  } catch {
    return Object.freeze({ characterSet, supported: true, valid: false, text: undefined });
  }
}
