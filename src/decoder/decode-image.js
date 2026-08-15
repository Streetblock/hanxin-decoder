import { decodeIdealRaster } from "../vision/ideal-grid-decoder.js";

const EFFORTS = new Set(["fast", "balanced", "thorough"]);
const DIAGNOSTICS_LEVELS = new Set(["none", "basic", "full"]);

function validateDecodeOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  if (options.effort !== undefined && !EFFORTS.has(options.effort)) {
    throw new RangeError("effort must be fast, balanced, or thorough");
  }
  if (options.diagnostics !== undefined && !DIAGNOSTICS_LEVELS.has(options.diagnostics)) {
    throw new RangeError("diagnostics must be none, basic, or full");
  }
}

function withoutDiagnostics(result) {
  const { diagnostics: _diagnostics, ...publicResult } = result;
  return publicResult;
}

/**
 * Public platform-neutral image decoder. M2 handles ideal digital rasters;
 * arbitrary rotation, perspective, blur, and uneven lighting remain M3.
 */
export async function decodeImage(image, options = {}) {
  validateDecodeOptions(options);
  const result = decodeIdealRaster(image, options);
  const diagnosticsLevel = options.diagnostics ?? "basic";
  const normalized = diagnosticsLevel === "none" ? withoutDiagnostics(result) : result;
  if (!normalized.ok) return normalized;

  return {
    ...normalized,
    confidence: Object.freeze({
      overall: 1,
      detection: 1,
      geometry: 1,
      sampling: 1,
      validation: 1,
    }),
  };
}
