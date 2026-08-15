import test from "node:test";
import assert from "node:assert/strict";

import { renderMatrixRaster } from "../../src/index.js";
import {
  decodeBrowserImage,
  rasterFromBrowserBlob,
  rasterFromImageData,
} from "../../src/adapters/browser.js";
import { bits, buildMatrix } from "../helpers/symbol-fixture.mjs";

function rgbaSymbol() {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  return renderMatrixRaster(buildMatrix(payloadBits, 1, 0, 1), {
    moduleSize: 5,
    quietZone: 4,
    format: "rgba8",
  });
}

async function encodedBlob(type) {
  const raster = rgbaSymbol();
  const canvas = new OffscreenCanvas(raster.width, raster.height);
  const context = canvas.getContext("2d");
  context.putImageData(
    new ImageData(new Uint8ClampedArray(raster.data), raster.width, raster.height),
    0,
    0,
  );
  return canvas.convertToBlob({ type, quality: 1 });
}

test("browser ImageData conversion is owned and platform neutral", () => {
  const source = new ImageData(new Uint8ClampedArray([0, 1, 2, 3]), 1, 1);
  const raster = rasterFromImageData(source);
  assert.deepEqual(raster.data, source.data);
  assert.ok(raster.data !== source.data);
});

test("browser PNG and JPEG Blobs decode locally into neutral rasters", async () => {
  for (const type of ["image/png", "image/jpeg"]) {
    const raster = await rasterFromBrowserBlob(await encodedBlob(type));
    assert.ok(raster.width > 0);
    assert.equal(raster.width, raster.height);
    assert.equal(raster.data.length, raster.width * raster.height * 4);
  }
});

test("browser PNG and JPEG Blobs pass through the public decoder", async () => {
  for (const type of ["image/png", "image/jpeg"]) {
    const result = await decodeBrowserImage(await encodedBlob(type));
    assert.equal(result.ok, true, type);
    assert.equal(result.text, "7");
    assert.equal(result.version, 1);
    assert.equal(result.mask, 1);
  }
});

test("browser Blob adapter enforces type, size, and abort controls", async () => {
  assert.equal((await decodeBrowserImage(new Blob(["x"], { type: "text/plain" }))).code, "UNSUPPORTED_INPUT");
  assert.equal((await decodeBrowserImage(new Blob(["not a png"], { type: "image/png" }))).code, "UNSUPPORTED_INPUT");
  assert.equal(
    (await decodeBrowserImage(await encodedBlob("image/png"), { maxPixels: 10 })).code,
    "UNSUPPORTED_INPUT",
  );
  const controller = new AbortController();
  controller.abort();
  assert.equal(
    (await decodeBrowserImage(await encodedBlob("image/png"), { signal: controller.signal })).code,
    "ABORTED",
  );
  assert.equal(
    (await decodeBrowserImage(await encodedBlob("image/png"), { timeoutMs: 0 })).code,
    "TIMEOUT",
  );
});
