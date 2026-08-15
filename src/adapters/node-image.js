import { readFile, stat } from "node:fs/promises";

import jpeg from "jpeg-js";
import { PNG } from "pngjs";

import { decodeImage } from "../decoder/decode-image.js";
import {
  DEFAULT_MAX_RASTER_PIXELS,
  HanXinVisionError,
} from "../vision/binarization.js";

export const DEFAULT_MAX_INPUT_BYTES = 64 * 1024 * 1024;

const PNG_SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);

function normalizeBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  throw new TypeError("image bytes must be a Uint8Array or ArrayBuffer");
}

function adapterLimits(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  const maxPixels = options.maxPixels ?? DEFAULT_MAX_RASTER_PIXELS;
  if (!Number.isSafeInteger(maxPixels) || maxPixels <= 0) {
    throw new RangeError("maxPixels must be a positive safe integer");
  }
  const maxInputBytes = options.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES;
  if (!Number.isSafeInteger(maxInputBytes) || maxInputBytes <= 0) {
    throw new RangeError("maxInputBytes must be a positive safe integer");
  }
  return { maxPixels, maxInputBytes };
}

function checkInputLength(bytes, maxInputBytes) {
  if (bytes.byteLength > maxInputBytes) {
    throw new HanXinVisionError(
      "UNSUPPORTED_INPUT",
      `Encoded image contains ${bytes.byteLength} bytes; limit is ${maxInputBytes}`,
    );
  }
}

function hasPrefix(bytes, signature) {
  return signature.every((value, index) => bytes[index] === value);
}

function pngDimensions(bytes) {
  if (bytes.length < 24 || !hasPrefix(bytes, PNG_SIGNATURE)) {
    throw new HanXinVisionError("UNSUPPORTED_INPUT", "Input is not a valid PNG stream");
  }
  if (String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR") {
    throw new HanXinVisionError("UNSUPPORTED_INPUT", "PNG does not start with an IHDR chunk");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function validateEncodedDimensions({ width, height }, maxPixels) {
  const pixels = width * height;
  if (width <= 0 || height <= 0 || !Number.isSafeInteger(pixels) || pixels > maxPixels) {
    throw new HanXinVisionError(
      "UNSUPPORTED_INPUT",
      `Encoded image dimensions ${width}x${height} exceed the ${maxPixels}-pixel limit`,
    );
  }
}

function wrapDecodeError(format, error) {
  if (error instanceof HanXinVisionError) return error;
  return new HanXinVisionError(
    "UNSUPPORTED_INPUT",
    `${format} decoding failed: ${error?.message ?? String(error)}`,
    { cause: error },
  );
}

/** Decodes PNG bytes into an owned RGBA RasterImage. */
export function rasterFromPng(input, options = {}) {
  const bytes = normalizeBytes(input);
  const { maxPixels, maxInputBytes } = adapterLimits(options);
  checkInputLength(bytes, maxInputBytes);
  try {
    validateEncodedDimensions(pngDimensions(bytes), maxPixels);
    const decoded = PNG.sync.read(
      Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      { checkCRC: true },
    );
    validateEncodedDimensions(decoded, maxPixels);
    return Object.freeze({
      width: decoded.width,
      height: decoded.height,
      data: Uint8Array.from(decoded.data),
    });
  } catch (error) {
    throw wrapDecodeError("PNG", error);
  }
}

/** Decodes JPEG bytes into an owned RGBA RasterImage. */
export function rasterFromJpeg(input, options = {}) {
  const bytes = normalizeBytes(input);
  const { maxPixels, maxInputBytes } = adapterLimits(options);
  checkInputLength(bytes, maxInputBytes);
  if (bytes.length < 3 || bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) {
    throw new HanXinVisionError("UNSUPPORTED_INPUT", "Input is not a valid JPEG stream");
  }
  try {
    const decoded = jpeg.decode(
      Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      {
        formatAsRGBA: true,
        maxResolutionInMP: maxPixels / 1_000_000,
        maxMemoryUsageInMB: Math.max(16, Math.ceil((maxPixels * 16) / (1024 * 1024))),
        tolerantDecoding: false,
        useTArray: true,
      },
    );
    validateEncodedDimensions(decoded, maxPixels);
    return Object.freeze({
      width: decoded.width,
      height: decoded.height,
      data: Uint8Array.from(decoded.data),
    });
  } catch (error) {
    throw wrapDecodeError("JPEG", error);
  }
}

function detectedFormat(bytes, requestedFormat) {
  if (requestedFormat !== undefined) {
    const normalized = String(requestedFormat).toLowerCase();
    if (normalized === "png") return "png";
    if (normalized === "jpeg" || normalized === "jpg") return "jpeg";
    throw new RangeError("format must be png, jpeg, or jpg");
  }
  if (hasPrefix(bytes, PNG_SIGNATURE)) return "png";
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return "jpeg";
  throw new HanXinVisionError("UNSUPPORTED_INPUT", "Image format is neither PNG nor JPEG");
}

/** Detects PNG/JPEG by signature and returns a neutral raster. */
export function rasterFromImageBytes(input, options = {}) {
  const bytes = normalizeBytes(input);
  const format = detectedFormat(bytes, options.format);
  return format === "png" ? rasterFromPng(bytes, options) : rasterFromJpeg(bytes, options);
}

function controlFailure(options, startedAt) {
  if (options.signal?.aborted) {
    return Object.freeze({ ok: false, code: "ABORTED", message: "Image decoding was aborted" });
  }
  if (options.timeoutMs !== undefined && Date.now() - startedAt >= options.timeoutMs) {
    return Object.freeze({ ok: false, code: "TIMEOUT", message: "Image decoding exceeded its time budget" });
  }
  return undefined;
}

function remainingOptions(options, startedAt) {
  if (options.timeoutMs === undefined) return options;
  return { ...options, timeoutMs: Math.max(0, options.timeoutMs - (Date.now() - startedAt)) };
}

/** Decodes encoded image bytes and then runs the public Han Xin image API. */
export async function decodeImageBytes(input, options = {}) {
  const startedAt = Date.now();
  const preflight = controlFailure(options, startedAt);
  if (preflight !== undefined) return preflight;
  try {
    const raster = rasterFromImageBytes(input, options);
    const afterAdapter = controlFailure(options, startedAt);
    if (afterAdapter !== undefined) return afterAdapter;
    return decodeImage(raster, remainingOptions(options, startedAt));
  } catch (error) {
    if (error instanceof HanXinVisionError) {
      return Object.freeze({ ok: false, code: error.code, message: error.message });
    }
    throw error;
  }
}

/** Reads a local PNG/JPEG file with a pre-read size guard and decodes it. */
export async function decodeImageFile(path, options = {}) {
  const startedAt = Date.now();
  const { maxInputBytes } = adapterLimits(options);
  const preflight = controlFailure(options, startedAt);
  if (preflight !== undefined) return preflight;
  try {
    const file = await stat(path);
    if (!file.isFile() || file.size > maxInputBytes) {
      return Object.freeze({
        ok: false,
        code: "UNSUPPORTED_INPUT",
        message: `Image file must be a regular file of at most ${maxInputBytes} bytes`,
      });
    }
    const bytes = await readFile(path);
    const afterRead = controlFailure(options, startedAt);
    if (afterRead !== undefined) return afterRead;
    return decodeImageBytes(bytes, remainingOptions(options, startedAt));
  } catch (error) {
    if (error instanceof HanXinVisionError) {
      return Object.freeze({ ok: false, code: error.code, message: error.message });
    }
    return Object.freeze({
      ok: false,
      code: "UNSUPPORTED_INPUT",
      message: `Image file could not be read: ${error?.message ?? String(error)}`,
    });
  }
}
