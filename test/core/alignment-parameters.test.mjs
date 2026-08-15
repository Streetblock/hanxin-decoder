import assert from "node:assert/strict";
import test from "node:test";

import {
  alignmentParametersForVersion,
  alignmentRegionSpansForVersion,
  HAN_XIN_ALIGNMENT_PARAMETERS,
} from "../../src/core/index.js";

test("contains all 84 normative Table A.1 rows", () => {
  assert.equal(HAN_XIN_ALIGNMENT_PARAMETERS.length, 84);
  assert.deepEqual(alignmentParametersForVersion(1), {
    version: 1,
    dimension: 23,
    r: null,
    k: null,
    m: null,
  });
  assert.deepEqual(alignmentParametersForVersion(4), {
    version: 4,
    dimension: 29,
    r: 15,
    k: null,
    m: 1,
  });
  assert.deepEqual(alignmentParametersForVersion(27), {
    version: 27,
    dimension: 75,
    r: 18,
    k: 19,
    m: 3,
  });
  assert.deepEqual(alignmentParametersForVersion(58), {
    version: 58,
    dimension: 137,
    r: 18,
    k: 17,
    m: 7,
  });
  assert.deepEqual(alignmentParametersForVersion(84), {
    version: 84,
    dimension: 189,
    r: 19,
    k: 17,
    m: 10,
  });
});

test("alignment-region spans cover dimension minus one for every version", () => {
  for (const parameters of HAN_XIN_ALIGNMENT_PARAMETERS) {
    const spans = alignmentRegionSpansForVersion(parameters.version);
    if (parameters.version <= 3) {
      assert.deepEqual(spans, []);
      continue;
    }

    assert.equal(spans.length, parameters.m + 1);
    assert.equal(
      spans.reduce((total, span) => total + span, 0),
      parameters.dimension - 1,
    );
    assert.equal(spans.at(-1), parameters.r - 1);
    assert.ok(spans.every((span) => Number.isInteger(span) && span > 0));
  }
});

test("derives the omitted k value for versions 4 through 10", () => {
  assert.deepEqual(alignmentRegionSpansForVersion(4), [14, 14]);
  assert.deepEqual(alignmentRegionSpansForVersion(5), [16, 14]);
  assert.deepEqual(alignmentRegionSpansForVersion(10), [20, 20]);
  assert.deepEqual(alignmentRegionSpansForVersion(11), [14, 14, 14]);
});

test("alignment parameter rows and returned spans are immutable", () => {
  assert.equal(Object.isFrozen(HAN_XIN_ALIGNMENT_PARAMETERS), true);
  assert.equal(Object.isFrozen(alignmentParametersForVersion(32)), true);
  assert.equal(Object.isFrozen(alignmentRegionSpansForVersion(32)), true);
});

test("rejects versions outside Table A.1", () => {
  for (const version of [0, 85, 1.5]) {
    assert.throws(() => alignmentParametersForVersion(version), RangeError);
    assert.throws(() => alignmentRegionSpansForVersion(version), RangeError);
  }
});
