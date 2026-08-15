import assert from "node:assert/strict";
import test from "node:test";

import {
  characterSetForEci,
  createEciTextDecoder,
  decodeEciBytes,
} from "../../src/core/index.js";

test("maps the registered character-set ECI assignments", () => {
  assert.equal(characterSetForEci(9).name, "ISO-8859-7");
  assert.equal(characterSetForEci(26).name, "UTF-8");
  assert.equal(characterSetForEci(29).name, "GB18030");
  assert.equal(characterSetForEci(170).name, "US-ASCII");
  assert.equal(characterSetForEci(14), undefined);
  assert.equal(characterSetForEci(899), undefined);
});

test("decodes supported ECI bytes strictly", () => {
  assert.equal(decodeEciBytes(3, Uint8Array.of(0x41, 0xE4)).text, "Aä");
  assert.equal(decodeEciBytes(9, Uint8Array.of(0xC1, 0xC2, 0xC3)).text, "ΑΒΓ");
  assert.equal(decodeEciBytes(26, Uint8Array.of(0xE2, 0x82, 0xAC)).text, "€");
  assert.equal(decodeEciBytes(27, Uint8Array.of(0x80)).valid, false);
  assert.equal(decodeEciBytes(26, Uint8Array.of(0xC3)).valid, false);
});

test("reports unknown and runtime-unsupported assignments without text", () => {
  const unknown = decodeEciBytes(899, Uint8Array.of(0x41));
  assert.equal(unknown.characterSet, undefined);
  assert.equal(unknown.supported, false);
  assert.equal(unknown.text, undefined);

  assert.equal(createEciTextDecoder(0), undefined);
  assert.equal(decodeEciBytes(0, Uint8Array.of(0x41)).text, undefined);
});

test("validates the public ECI helpers", () => {
  assert.throws(() => characterSetForEci(-1), RangeError);
  assert.throws(() => characterSetForEci(1_000_000), RangeError);
  assert.throws(() => decodeEciBytes(3, [0x41]), TypeError);
});
