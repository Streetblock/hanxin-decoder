import assert from "node:assert/strict";
import test from "node:test";
import {
  GaloisField256,
  HAN_XIN_GF256,
  HAN_XIN_PRIMITIVE_POLYNOMIAL,
} from "../../src/core/index.js";

test("Han Xin uses the normative primitive polynomial 0x163", () => {
  assert.equal(HAN_XIN_PRIMITIVE_POLYNOMIAL, 0x163);
  assert.equal(HAN_XIN_GF256.exp(0), 1);
  assert.equal(HAN_XIN_GF256.exp(255), 1);

  for (let value = 1; value < 256; value += 1) {
    assert.equal(HAN_XIN_GF256.multiply(value, HAN_XIN_GF256.inverse(value)), 1);
  }
});

test("rejects a degree-8 polynomial that is not primitive for alpha=2", () => {
  assert.throws(() => new GaloisField256(0x100), /primitive|generate/u);
});

test("generator polynomials match GB/T 21049-2022 Annex E", () => {
  const exponent = (value) => HAN_XIN_GF256.exp(value);

  assert.deepEqual(
    Array.from(HAN_XIN_GF256.buildGenerator(2)),
    [1, exponent(198), exponent(3)],
  );
  assert.deepEqual(
    Array.from(HAN_XIN_GF256.buildGenerator(4)),
    [1, exponent(82), exponent(250), exponent(87), exponent(10)],
  );
  assert.deepEqual(
    Array.from(HAN_XIN_GF256.buildGenerator(6)),
    [1, exponent(159), exponent(88), exponent(64), exponent(95), exponent(173), exponent(21)],
  );
  assert.deepEqual(
    Array.from(HAN_XIN_GF256.buildGenerator(8)),
    [
      1,
      exponent(105),
      exponent(139),
      exponent(192),
      exponent(239),
      exponent(201),
      exponent(157),
      exponent(132),
      exponent(36),
    ],
  );
});
