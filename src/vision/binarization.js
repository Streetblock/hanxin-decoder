import { BitMatrix } from "../core/bit-matrix.js";
import { toGrayscaleRaster, validateRasterImage } from "./raster-image.js";

export const DEFAULT_MAX_RASTER_PIXELS = 4096 ** 2;

const CHECK_INTERVAL = 16_384;

export class HanXinVisionError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = code;
  }
}

function validateOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  if (options.tryInverted !== undefined && typeof options.tryInverted !== "boolean") {
    throw new TypeError("tryInverted must be a boolean");
  }
  const maxPixels = options.maxPixels ?? DEFAULT_MAX_RASTER_PIXELS;
  if (!Number.isSafeInteger(maxPixels) || maxPixels <= 0) {
    throw new RangeError("maxPixels must be a positive safe integer");
  }
  const minimumContrast = options.minimumContrast ?? 1;
  if (!Number.isInteger(minimumContrast) || minimumContrast < 1 || minimumContrast > 255) {
    throw new RangeError("minimumContrast must be an integer between 1 and 255");
  }
  if (
    options.threshold !== undefined
    && (!Number.isInteger(options.threshold) || options.threshold < 0 || options.threshold > 255)
  ) {
    throw new RangeError("threshold must be an integer between 0 and 255");
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
  return { maxPixels, minimumContrast };
}

function createControl(options) {
  const deadline = options.timeoutMs === undefined ? undefined : Date.now() + options.timeoutMs;
  return Object.freeze({
    checkpoint() {
      if (options.signal?.aborted) {
        throw new HanXinVisionError("ABORTED", "Raster preprocessing was aborted");
      }
      if (deadline !== undefined && Date.now() >= deadline) {
        throw new HanXinVisionError("TIMEOUT", "Raster preprocessing exceeded its time budget");
      }
    },
  });
}

function emptyBounds() {
  return {
    left: Number.POSITIVE_INFINITY,
    top: Number.POSITIVE_INFINITY,
    right: -1,
    bottom: -1,
    foregroundPixels: 0,
  };
}

function includePixel(bounds, x, y) {
  if (x < bounds.left) bounds.left = x;
  if (x > bounds.right) bounds.right = x;
  if (y < bounds.top) bounds.top = y;
  if (y > bounds.bottom) bounds.bottom = y;
  bounds.foregroundPixels += 1;
}

function finalizeBounds(bounds) {
  if (bounds.foregroundPixels === 0) return null;
  return Object.freeze({
    left: bounds.left,
    top: bounds.top,
    right: bounds.right,
    bottom: bounds.bottom,
    width: bounds.right - bounds.left + 1,
    height: bounds.bottom - bounds.top + 1,
    foregroundPixels: bounds.foregroundPixels,
  });
}

/** Returns the smallest inclusive pixel rectangle containing every set bit. */
export function findForegroundBounds(binary) {
  if (!(binary instanceof BitMatrix)) {
    throw new TypeError("binary must be a BitMatrix");
  }
  const bounds = emptyBounds();
  for (let y = 0; y < binary.height; y += 1) {
    const rowOffset = y * binary.width;
    for (let x = 0; x < binary.width; x += 1) {
      if (binary.data[rowOffset + x] !== 0) includePixel(bounds, x, y);
    }
  }
  return finalizeBounds(bounds);
}

function noContrastResult(grayscale, minimum, maximum) {
  return Object.freeze({
    width: grayscale.width,
    height: grayscale.height,
    minimumLuminance: minimum,
    maximumLuminance: maximum,
    contrast: maximum - minimum,
    threshold: null,
    candidates: Object.freeze([]),
  });
}

/**
 * Creates ordered normal and inverted binary candidates for an ideal raster.
 * Candidate bounds remain in input-image pixel coordinates.
 */
export function binarizeRasterCandidates(image, options = {}) {
  const { maxPixels, minimumContrast } = validateOptions(options);
  const details = validateRasterImage(image);
  if (details.pixelCount > maxPixels) {
    throw new HanXinVisionError(
      "UNSUPPORTED_INPUT",
      `Raster contains ${details.pixelCount} pixels; limit is ${maxPixels}`,
    );
  }

  const control = createControl(options);
  control.checkpoint();
  const grayscale = toGrayscaleRaster(image, { checkpoint: () => control.checkpoint() });

  let minimum = 255;
  let maximum = 0;
  for (let index = 0; index < grayscale.data.length; index += 1) {
    if (index % CHECK_INTERVAL === 0) control.checkpoint();
    const value = grayscale.data[index];
    if (value < minimum) minimum = value;
    if (value > maximum) maximum = value;
  }
  control.checkpoint();

  const contrast = maximum - minimum;
  if (contrast < minimumContrast) {
    return noContrastResult(grayscale, minimum, maximum);
  }

  const threshold = options.threshold ?? (minimum + Math.floor(contrast / 2));
  const normal = new BitMatrix(details.width, details.height);
  const inverted = options.tryInverted === false
    ? undefined
    : new BitMatrix(details.width, details.height);
  const normalBounds = emptyBounds();
  const invertedBounds = emptyBounds();

  for (let index = 0; index < grayscale.data.length; index += 1) {
    if (index % CHECK_INTERVAL === 0) control.checkpoint();
    const y = Math.floor(index / details.width);
    const x = index - y * details.width;
    const isNormalForeground = grayscale.data[index] <= threshold;
    if (isNormalForeground) {
      normal.data[index] = 1;
      includePixel(normalBounds, x, y);
    } else if (inverted !== undefined) {
      inverted.data[index] = 1;
      includePixel(invertedBounds, x, y);
    }
  }
  control.checkpoint();

  const candidates = [];
  const finalizedNormalBounds = finalizeBounds(normalBounds);
  if (finalizedNormalBounds !== null) {
    candidates.push(Object.freeze({
      polarity: "normal",
      binary: normal,
      bounds: finalizedNormalBounds,
    }));
  }
  const finalizedInvertedBounds = finalizeBounds(invertedBounds);
  if (inverted !== undefined && finalizedInvertedBounds !== null) {
    candidates.push(Object.freeze({
      polarity: "inverted",
      binary: inverted,
      bounds: finalizedInvertedBounds,
    }));
  }

  return Object.freeze({
    width: details.width,
    height: details.height,
    minimumLuminance: minimum,
    maximumLuminance: maximum,
    contrast,
    threshold,
    candidates: Object.freeze(candidates),
  });
}
