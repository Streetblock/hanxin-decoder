import test from "node:test";
import assert from "node:assert/strict";

import { decodeImage, renderMatrixRaster } from "../../src/index.js";
import { bits, buildMatrix } from "../helpers/symbol-fixture.mjs";

function idealRaster() {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  return renderMatrixRaster(buildMatrix(payloadBits, 4, 2, 3), {
    moduleSize: 2,
    quietZone: 3,
    rotation: 270,
    inverted: true,
  });
}

test("decodeImage exposes the promised asynchronous success contract", async () => {
  const pending = decodeImage(idealRaster());
  assert.ok(pending instanceof Promise);
  const result = await pending;
  assert.equal(result.ok, true);
  assert.equal(result.format, "han-xin");
  assert.equal(result.text, "7");
  assert.equal(result.version, 4);
  assert.equal(result.errorLevel, "L3");
  assert.equal(result.mask, 3);
  assert.equal(result.rotationDegrees, 270);
  assert.equal(result.polarity, "inverted");
  assert.equal(result.erasuresUsed, 0);
  assert.deepEqual(result.confidence, {
    overall: 1,
    detection: 1,
    geometry: 1,
    sampling: 1,
    validation: 1,
  });
  assert.equal(result.diagnostics.geometryPath, "alignment-assisted");
});

test("decodeImage honours the diagnostics level", async () => {
  const result = await decodeImage(idealRaster(), { diagnostics: "none" });
  assert.equal(result.ok, true);
  assert.equal("diagnostics" in result, false);
});

test("decodeImage returns stable abort, timeout, and no-symbol failures", async () => {
  const blank = { width: 10, height: 10, data: new Uint8Array(100).fill(255) };
  assert.equal((await decodeImage(blank)).code, "NO_SYMBOL");
  assert.equal((await decodeImage(blank, { timeoutMs: 0 })).code, "TIMEOUT");
  const controller = new AbortController();
  controller.abort();
  assert.equal((await decodeImage(blank, { signal: controller.signal })).code, "ABORTED");
});

test("decodeImage rejects invalid public options", async () => {
  const blank = { width: 1, height: 1, data: Uint8Array.of(255) };
  await assert.rejects(() => decodeImage(blank, null), /options/);
  await assert.rejects(() => decodeImage(blank, { effort: "maximum" }), /effort/);
  await assert.rejects(() => decodeImage(blank, { diagnostics: "verbose" }), /diagnostics/);
});
