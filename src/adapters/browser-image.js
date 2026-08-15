import { decodeImage } from "../decoder/decode-image.js";
import { DEFAULT_MAX_RASTER_PIXELS, HanXinVisionError } from "../vision/binarization.js";
import { validateRasterImage } from "../vision/raster-image.js";

function browserOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  const maxPixels = options.maxPixels ?? DEFAULT_MAX_RASTER_PIXELS;
  if (!Number.isSafeInteger(maxPixels) || maxPixels <= 0) {
    throw new RangeError("maxPixels must be a positive safe integer");
  }
  if (
    options.timeoutMs !== undefined
    && (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 0)
  ) {
    throw new RangeError("timeoutMs must be a finite number >= 0");
  }
  if (
    options.signal !== undefined
    && (
      options.signal === null
      || typeof options.signal !== "object"
      || typeof options.signal.aborted !== "boolean"
    )
  ) {
    throw new TypeError("signal must be an AbortSignal-compatible object");
  }
  return { maxPixels };
}

function browserCheckpoint(options, deadline) {
  if (options.signal?.aborted) {
    throw new HanXinVisionError("ABORTED", "Browser image decoding was aborted");
  }
  if (deadline !== undefined && Date.now() >= deadline) {
    throw new HanXinVisionError("TIMEOUT", "Browser image decoding exceeded its time budget");
  }
}

/** Copies an ImageData-compatible object into the neutral raster contract. */
export function rasterFromImageData(imageData, options = {}) {
  const { maxPixels } = browserOptions(options);
  const details = validateRasterImage(imageData);
  if (details.pixelCount > maxPixels) {
    throw new HanXinVisionError(
      "UNSUPPORTED_INPUT",
      `Browser image contains ${details.pixelCount} pixels; limit is ${maxPixels}`,
    );
  }
  return Object.freeze({
    width: details.width,
    height: details.height,
    data: Uint8ClampedArray.from(imageData.data),
  });
}

function canvasFor(width, height) {
  if (typeof globalThis.OffscreenCanvas === "function") {
    return new globalThis.OffscreenCanvas(width, height);
  }
  if (globalThis.document?.createElement) {
    const canvas = globalThis.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new HanXinVisionError("UNSUPPORTED_INPUT", "No browser canvas API is available");
}

/** Decodes a local browser Blob without network access. */
export async function rasterFromBrowserBlob(blob, options = {}) {
  const { maxPixels } = browserOptions(options);
  const deadline = options.timeoutMs === undefined ? undefined : Date.now() + options.timeoutMs;
  if (typeof globalThis.Blob !== "function" || !(blob instanceof globalThis.Blob)) {
    throw new TypeError("blob must be a Blob");
  }
  if (!["image/png", "image/jpeg"].includes(blob.type)) {
    throw new HanXinVisionError("UNSUPPORTED_INPUT", "Blob type must be image/png or image/jpeg");
  }
  if (typeof globalThis.createImageBitmap !== "function") {
    throw new HanXinVisionError("UNSUPPORTED_INPUT", "Browser image decoding is unavailable");
  }
  browserCheckpoint(options, deadline);

  let bitmap;
  try {
    bitmap = await globalThis.createImageBitmap(blob);
  } catch (error) {
    browserCheckpoint(options, deadline);
    throw new HanXinVisionError("UNSUPPORTED_INPUT", "PNG/JPEG image data is invalid", {
      cause: error,
    });
  }
  try {
    browserCheckpoint(options, deadline);
    const pixelCount = bitmap.width * bitmap.height;
    if (!Number.isSafeInteger(pixelCount) || pixelCount <= 0 || pixelCount > maxPixels) {
      throw new HanXinVisionError(
        "UNSUPPORTED_INPUT",
        `Browser image contains ${pixelCount} pixels; limit is ${maxPixels}`,
      );
    }
    const canvas = canvasFor(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { alpha: true, willReadFrequently: true });
    if (context === null) {
      throw new HanXinVisionError("UNSUPPORTED_INPUT", "Browser 2D canvas is unavailable");
    }
    context.drawImage(bitmap, 0, 0);
    browserCheckpoint(options, deadline);
    return rasterFromImageData(context.getImageData(0, 0, bitmap.width, bitmap.height), options);
  } finally {
    bitmap.close?.();
  }
}

/** Decodes a local PNG/JPEG Blob and runs the platform-neutral image API. */
export async function decodeBrowserImage(blob, options = {}) {
  const startedAt = Date.now();
  try {
    const raster = await rasterFromBrowserBlob(blob, options);
    const decodeOptions = options.timeoutMs === undefined
      ? options
      : { ...options, timeoutMs: Math.max(0, options.timeoutMs - (Date.now() - startedAt)) };
    return decodeImage(raster, decodeOptions);
  } catch (error) {
    if (error instanceof HanXinVisionError) {
      return Object.freeze({ ok: false, code: error.code, message: error.message });
    }
    throw error;
  }
}
