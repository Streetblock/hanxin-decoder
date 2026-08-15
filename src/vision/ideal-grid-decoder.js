import { BitMatrix } from "../core/bit-matrix.js";
import { functionInformationCoordinates } from "../core/function-information.js";
import { createFunctionPattern } from "../core/function-pattern.js";
import { decodeMatrix } from "../core/matrix-decoder.js";
import {
  dimensionForVersion,
  MAX_HAN_XIN_VERSION,
  MIN_HAN_XIN_VERSION,
} from "../core/version.js";
import { binarizeRasterCandidates, HanXinVisionError } from "./binarization.js";

export const DEFAULT_MAX_GRID_CANDIDATES = 12;

const INPUT_ROTATIONS = Object.freeze([0, 90, 180, 270]);

function positiveInteger(name, value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
  return value;
}

function validateBounds(bounds) {
  if (bounds === null || typeof bounds !== "object" || Array.isArray(bounds)) {
    throw new TypeError("bounds must be an object");
  }
  for (const name of ["left", "top", "right", "bottom", "width", "height"]) {
    if (!Number.isSafeInteger(bounds[name]) || bounds[name] < 0) {
      throw new RangeError(`bounds.${name} must be a non-negative safe integer`);
    }
  }
  if (bounds.right < bounds.left || bounds.bottom < bounds.top) {
    throw new RangeError("bounds edges are reversed");
  }
  if (
    bounds.width !== bounds.right - bounds.left + 1
    || bounds.height !== bounds.bottom - bounds.top + 1
  ) {
    throw new RangeError("bounds dimensions do not match their inclusive edges");
  }
}

function validateGeometryOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  const minimumModuleSize = positiveInteger(
    "minimumModuleSize",
    options.minimumModuleSize ?? 2,
  );
  const maximumModuleSize = positiveInteger(
    "maximumModuleSize",
    options.maximumModuleSize ?? 256,
  );
  if (maximumModuleSize < minimumModuleSize) {
    throw new RangeError("maximumModuleSize must be >= minimumModuleSize");
  }
  const maxGridCandidates = positiveInteger(
    "maxGridCandidates",
    options.maxGridCandidates ?? DEFAULT_MAX_GRID_CANDIDATES,
  );
  if (maxGridCandidates > MAX_HAN_XIN_VERSION) {
    throw new RangeError(`maxGridCandidates must be <= ${MAX_HAN_XIN_VERSION}`);
  }
  return { minimumModuleSize, maximumModuleSize, maxGridCandidates };
}

/** Derives exact integer Han Xin grids from an inclusive square pixel frame. */
export function deriveIdealGridCandidates(bounds, options = {}) {
  validateBounds(bounds);
  const { minimumModuleSize, maximumModuleSize, maxGridCandidates } =
    validateGeometryOptions(options);
  if (bounds.width !== bounds.height) return Object.freeze([]);

  const candidates = [];
  for (let version = MIN_HAN_XIN_VERSION; version <= MAX_HAN_XIN_VERSION; version += 1) {
    const dimension = dimensionForVersion(version);
    if (bounds.width % dimension !== 0) continue;
    const moduleSize = bounds.width / dimension;
    if (moduleSize < minimumModuleSize || moduleSize > maximumModuleSize) continue;
    candidates.push(Object.freeze({ version, dimension, moduleSize }));
  }
  candidates.sort((left, right) => (
    left.moduleSize - right.moduleSize || right.dimension - left.dimension
  ));
  if (candidates.length > maxGridCandidates) {
    throw new HanXinVisionError(
      "GRID_SAMPLING_FAILED",
      `Frame has ${candidates.length} exact grids; limit is ${maxGridCandidates}`,
    );
  }
  return Object.freeze(candidates);
}

function samplingOffsets(moduleSize) {
  const offsets = new Set();
  for (const numerator of [1, 3, 5]) {
    offsets.add(Math.min(moduleSize - 1, Math.floor((numerator * moduleSize) / 6)));
  }
  return [...offsets];
}

/** Samples up to nine interior points per module using deterministic majority. */
export function sampleIdealGrid(binary, bounds, geometry, options = {}) {
  if (!(binary instanceof BitMatrix)) {
    throw new TypeError("binary must be a BitMatrix");
  }
  validateBounds(bounds);
  if (geometry === null || typeof geometry !== "object" || Array.isArray(geometry)) {
    throw new TypeError("geometry must be an object");
  }
  const dimension = positiveInteger("geometry.dimension", geometry.dimension);
  const moduleSize = positiveInteger("geometry.moduleSize", geometry.moduleSize);
  if (bounds.width !== dimension * moduleSize || bounds.height !== dimension * moduleSize) {
    throw new RangeError("geometry does not exactly cover bounds");
  }
  if (bounds.right >= binary.width || bounds.bottom >= binary.height) {
    throw new RangeError("bounds extend outside the binary raster");
  }
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  if (options.checkpoint !== undefined && typeof options.checkpoint !== "function") {
    throw new TypeError("options.checkpoint must be a function");
  }
  const checkpoint = options.checkpoint ?? (() => {});
  const offsets = samplingOffsets(moduleSize);
  const samplesPerModule = offsets.length ** 2;
  const centerOffset = Math.floor(moduleSize / 2);
  const sampled = new BitMatrix(dimension);

  for (let row = 0; row < dimension; row += 1) {
    checkpoint();
    const moduleTop = bounds.top + row * moduleSize;
    for (let column = 0; column < dimension; column += 1) {
      const moduleLeft = bounds.left + column * moduleSize;
      let darkSamples = 0;
      for (const offsetY of offsets) {
        const pixelRow = (moduleTop + offsetY) * binary.width;
        for (const offsetX of offsets) {
          darkSamples += binary.data[pixelRow + moduleLeft + offsetX];
        }
      }
      const center = binary.data[
        (moduleTop + centerOffset) * binary.width + moduleLeft + centerOffset
      ];
      if (darkSamples * 2 > samplesPerModule || (
        darkSamples * 2 === samplesPerModule && center !== 0
      )) {
        sampled.data[row * dimension + column] = 1;
      }
    }
  }
  checkpoint();
  return sampled;
}

/** Rotates a BitMatrix clockwise by a right angle. */
export function rotateBitMatrix(matrix, rotationDegrees) {
  if (!(matrix instanceof BitMatrix)) {
    throw new TypeError("matrix must be a BitMatrix");
  }
  if (!INPUT_ROTATIONS.includes(rotationDegrees)) {
    throw new RangeError("rotationDegrees must be one of 0, 90, 180, or 270");
  }
  if (rotationDegrees === 0) return matrix.clone();

  const rotatedWidth = rotationDegrees === 90 || rotationDegrees === 270
    ? matrix.height
    : matrix.width;
  const rotatedHeight = rotationDegrees === 90 || rotationDegrees === 270
    ? matrix.width
    : matrix.height;
  const rotated = new BitMatrix(rotatedWidth, rotatedHeight);
  for (let y = 0; y < matrix.height; y += 1) {
    for (let x = 0; x < matrix.width; x += 1) {
      if (!matrix.get(x, y)) continue;
      let targetX;
      let targetY;
      if (rotationDegrees === 90) {
        targetX = matrix.height - 1 - y;
        targetY = x;
      } else if (rotationDegrees === 180) {
        targetX = matrix.width - 1 - x;
        targetY = matrix.height - 1 - y;
      } else {
        targetX = y;
        targetY = matrix.width - 1 - x;
      }
      rotated.set(targetX, targetY);
    }
  }
  return rotated;
}

/** Validates every fixed module on the version-specific geometry path. */
export function validateIdealFunctionPattern(matrix, version) {
  if (!(matrix instanceof BitMatrix)) {
    throw new TypeError("matrix must be a BitMatrix");
  }
  const pattern = createFunctionPattern(version);
  if (matrix.width !== pattern.dimension || matrix.height !== pattern.dimension) {
    return Object.freeze({
      matches: false,
      geometryPath: version <= 3 ? "corner-only" : "alignment-assisted",
      mismatches: Number.POSITIVE_INFINITY,
    });
  }

  const informationModules = new Uint8Array(matrix.data.length);
  const information = functionInformationCoordinates(matrix.width);
  for (const copy of [information.primary, information.secondary]) {
    for (const { column, row } of copy) {
      informationModules[row * matrix.width + column] = 1;
    }
  }

  let mismatches = 0;
  for (let index = 0; index < matrix.data.length; index += 1) {
    if (pattern.functionModules.data[index] === 0 || informationModules[index] !== 0) continue;
    if (matrix.data[index] !== pattern.modules.data[index]) mismatches += 1;
  }
  return Object.freeze({
    matches: mismatches === 0,
    geometryPath: version <= 3 ? "corner-only" : "alignment-assisted",
    mismatches,
  });
}

function createDecodeControl(options) {
  const deadline = options.timeoutMs === undefined ? undefined : Date.now() + options.timeoutMs;
  return {
    remainingTimeout() {
      return deadline === undefined ? undefined : Math.max(0, deadline - Date.now());
    },
    checkpoint() {
      if (options.signal?.aborted) {
        throw new HanXinVisionError("ABORTED", "Ideal raster decoding was aborted");
      }
      if (deadline !== undefined && Date.now() >= deadline) {
        throw new HanXinVisionError("TIMEOUT", "Ideal raster decoding exceeded its time budget");
      }
    },
  };
}

function failureFromVisionError(error) {
  return Object.freeze({ ok: false, code: error.code, message: error.message });
}

function frameCorners(bounds) {
  return Object.freeze([
    Object.freeze({ x: bounds.left, y: bounds.top }),
    Object.freeze({ x: bounds.right + 1, y: bounds.top }),
    Object.freeze({ x: bounds.right + 1, y: bounds.bottom + 1 }),
    Object.freeze({ x: bounds.left, y: bounds.bottom + 1 }),
  ]);
}

/**
 * Decodes an ideal, axis-aligned or right-angle-rotated raster through the
 * complete normative matrix decoder. Photographic geometry remains M3.
 */
export function decodeIdealRaster(image, options = {}) {
  const control = createDecodeControl(options);
  try {
    control.checkpoint();
    const analysis = binarizeRasterCandidates(image, {
      ...options,
      timeoutMs: control.remainingTimeout(),
    });
    let gridCandidates = 0;
    let attempts = 0;

    for (const polarityCandidate of analysis.candidates) {
      control.checkpoint();
      const geometries = deriveIdealGridCandidates(polarityCandidate.bounds, options);
      gridCandidates += geometries.length;
      for (const geometry of geometries) {
        control.checkpoint();
        const sampled = sampleIdealGrid(
          polarityCandidate.binary,
          polarityCandidate.bounds,
          geometry,
          { checkpoint: () => control.checkpoint() },
        );
        for (const rotationDegrees of INPUT_ROTATIONS) {
          control.checkpoint();
          attempts += 1;
          const normalizationRotation = (360 - rotationDegrees) % 360;
          const normalized = rotateBitMatrix(sampled, normalizationRotation);
          const patternValidation = validateIdealFunctionPattern(normalized, geometry.version);
          if (!patternValidation.matches) continue;
          try {
            const decoded = decodeMatrix(normalized);
            return {
              ...decoded,
              rotationDegrees,
              polarity: polarityCandidate.polarity,
              moduleSize: geometry.moduleSize,
              corners: frameCorners(polarityCandidate.bounds),
              erasuresUsed: 0,
              diagnostics: Object.freeze({
                stage: "ideal-grid",
                attempts,
                gridCandidates,
                geometryPath: patternValidation.geometryPath,
                fixedPatternMismatches: patternValidation.mismatches,
              }),
            };
          } catch {
            // A candidate is accepted only after complete M1 validation.
          }
        }
      }
    }

    if (analysis.candidates.length === 0) {
      return Object.freeze({
        ok: false,
        code: "NO_SYMBOL",
        message: "Raster has insufficient contrast for a Han Xin symbol",
      });
    }
    if (gridCandidates === 0) {
      return Object.freeze({
        ok: false,
        code: "GRID_SAMPLING_FAILED",
        message: "No exact version 1-84 grid fits the candidate frames",
      });
    }
    return Object.freeze({
      ok: false,
      code: "NO_SYMBOL",
      message: "No raster candidate passed complete Han Xin validation",
      diagnostics: Object.freeze({ stage: "matrix-validation", attempts, gridCandidates }),
    });
  } catch (error) {
    if (error instanceof HanXinVisionError) return failureFromVisionError(error);
    throw error;
  }
}
