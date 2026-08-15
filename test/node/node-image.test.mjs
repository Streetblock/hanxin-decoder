import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

import jpeg from "jpeg-js";
import { PNG } from "pngjs";

import { renderMatrixRaster } from "../../src/index.js";
import {
  decodeImageBytes,
  decodeImageFile,
  DEFAULT_MAX_INPUT_BYTES,
  rasterFromImageBytes,
  rasterFromJpeg,
  rasterFromPng,
} from "../../src/adapters/node.js";
import { bits, buildMatrix } from "../helpers/symbol-fixture.mjs";

function rgbaSymbol() {
  const payloadBits = `0001${bits(7, 10)}${bits(1021, 10)}`;
  const matrix = buildMatrix(payloadBits, 1, 0, 2);
  return renderMatrixRaster(matrix, {
    moduleSize: 5,
    quietZone: 4,
    format: "rgba8",
  });
}

function encodedFixtures() {
  const raster = rgbaSymbol();
  const input = { width: raster.width, height: raster.height, data: Buffer.from(raster.data) };
  return {
    raster,
    png: PNG.sync.write(input),
    jpeg: jpeg.encode(input, 100).data,
  };
}

test("Node PNG and JPEG adapters produce owned neutral RGBA rasters", () => {
  const { raster, png, jpeg: jpegBytes } = encodedFixtures();
  for (const decoded of [rasterFromPng(png), rasterFromJpeg(jpegBytes)]) {
    assert.equal(decoded.width, raster.width);
    assert.equal(decoded.height, raster.height);
    assert.equal(decoded.data.length, raster.width * raster.height * 4);
    assert.ok(decoded.data instanceof Uint8Array);
  }
  assert.deepEqual(rasterFromImageBytes(png), rasterFromPng(png));
  assert.deepEqual(rasterFromImageBytes(jpegBytes), rasterFromJpeg(jpegBytes));
});

test("encoded PNG and JPEG bytes decode through the public image pipeline", async () => {
  const { png, jpeg: jpegBytes } = encodedFixtures();
  for (const [format, bytes] of [["png", png], ["jpeg", jpegBytes]]) {
    const result = await decodeImageBytes(bytes);
    assert.equal(result.ok, true, format);
    assert.equal(result.text, "7");
    assert.equal(result.version, 1);
    assert.equal(result.mask, 2);
  }
});

test("decodeImageFile reads local PNG and JPEG files behind a size guard", async () => {
  const { png, jpeg: jpegBytes } = encodedFixtures();
  const directory = await mkdtemp(join(tmpdir(), "hanxin-node-adapter-"));
  const resolvedDirectory = resolve(directory);
  if (!resolvedDirectory.startsWith(resolve(tmpdir()) + sep)) {
    throw new Error("temporary test directory escaped the system temp directory");
  }
  try {
    const pngPath = join(directory, "symbol.png");
    const jpegPath = join(directory, "symbol.jpg");
    await writeFile(pngPath, png);
    await writeFile(jpegPath, jpegBytes);
    assert.equal((await decodeImageFile(pngPath)).ok, true);
    assert.equal((await decodeImageFile(jpegPath)).ok, true);
    assert.equal(
      (await decodeImageFile(pngPath, { maxInputBytes: png.length - 1 })).code,
      "UNSUPPORTED_INPUT",
    );
  } finally {
    await rm(resolvedDirectory, { recursive: true, force: true });
  }
});

test("Node adapters reject corrupt, oversized, and unsupported inputs", async () => {
  assert.equal(DEFAULT_MAX_INPUT_BYTES, 64 * 1024 * 1024);
  assert.throws(() => rasterFromImageBytes(Uint8Array.of(1, 2, 3)), /neither PNG nor JPEG/);
  assert.throws(() => rasterFromPng(Uint8Array.of(1, 2, 3)), /valid PNG/);
  assert.throws(() => rasterFromJpeg(Uint8Array.of(0xFF, 0xD8, 0xFF)), /decoding failed/);

  const oversizedPngHeader = new Uint8Array(24);
  oversizedPngHeader.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  oversizedPngHeader.set([0x49, 0x48, 0x44, 0x52], 12);
  new DataView(oversizedPngHeader.buffer).setUint32(16, 5000);
  new DataView(oversizedPngHeader.buffer).setUint32(20, 5000);
  assert.throws(
    () => rasterFromPng(oversizedPngHeader, { maxPixels: 1_000_000 }),
    /pixel limit/,
  );
  assert.equal(
    (await decodeImageBytes(Uint8Array.of(1, 2, 3))).code,
    "UNSUPPORTED_INPUT",
  );
});

test("encoded-image decoding honours a pre-aborted signal", async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await decodeImageBytes(encodedFixtures().png, { signal: controller.signal });
  assert.equal(result.ok, false);
  assert.equal(result.code, "ABORTED");
});
