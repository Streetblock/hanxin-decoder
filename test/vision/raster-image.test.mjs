import assert from "node:assert/strict";
import test from "node:test";

import { toGrayscaleRaster, validateRasterImage } from "../../src/index.js";

test("infers Gray8, RGB8, and RGBA8 from exact raster lengths", () => {
  for (const [channels, format] of [[1, "gray8"], [3, "rgb8"], [4, "rgba8"]]) {
    const details = validateRasterImage({
      width: 3,
      height: 2,
      data: new Uint8ClampedArray(3 * 2 * channels),
    });
    assert.equal(details.pixelCount, 6);
    assert.equal(details.channels, channels);
    assert.equal(details.format, format);
  }
});

test("copies Gray8 into an owned canonical raster", () => {
  const source = Uint8Array.of(0, 64, 128, 255);
  const raster = toGrayscaleRaster({ width: 2, height: 2, data: source });
  assert.deepEqual(raster.data, source);
  assert.ok(raster.data !== source);
  source[0] = 255;
  assert.equal(raster.data[0], 0);
});

test("converts RGB8 with deterministic integer luminance", () => {
  const raster = toGrayscaleRaster({
    width: 4,
    height: 1,
    data: Uint8Array.of(
      255, 0, 0,
      0, 255, 0,
      0, 0, 255,
      255, 255, 255,
    ),
  });
  assert.deepEqual(raster.data, Uint8Array.of(77, 149, 29, 255));
});

test("composites RGBA8 onto white before grayscale conversion", () => {
  const raster = toGrayscaleRaster({
    width: 4,
    height: 1,
    data: Uint8Array.of(
      255, 0, 0, 255,
      0, 0, 0, 0,
      0, 0, 0, 128,
      255, 0, 0, 128,
    ),
  });
  assert.deepEqual(raster.data, Uint8Array.of(77, 255, 127, 166));
});

test("rejects malformed rasters before conversion", () => {
  for (const image of [
    null,
    {},
    { width: 0, height: 1, data: new Uint8Array(0) },
    { width: 1.5, height: 1, data: new Uint8Array(1) },
    { width: Number.MAX_SAFE_INTEGER, height: 2, data: new Uint8Array(1) },
    { width: 1, height: 1, data: new Uint16Array(1) },
    { width: 2, height: 2, data: new Uint8Array(8) },
    { width: 2, height: 2, data: new Uint8Array(20) },
  ]) {
    assert.throws(() => validateRasterImage(image));
    assert.throws(() => toGrayscaleRaster(image));
  }
});
