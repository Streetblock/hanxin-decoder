export { toGrayscaleRaster, validateRasterImage } from "./raster-image.js";
export { renderMatrixRaster } from "./matrix-renderer.js";
export {
  binarizeRasterCandidates,
  DEFAULT_MAX_RASTER_PIXELS,
  findForegroundBounds,
  HanXinVisionError,
} from "./binarization.js";
export {
  decodeIdealRaster,
  DEFAULT_MAX_GRID_CANDIDATES,
  deriveIdealGridCandidates,
  rotateBitMatrix,
  sampleIdealGrid,
  validateIdealFunctionPattern,
} from "./ideal-grid-decoder.js";
