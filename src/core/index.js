export { BitMatrix } from "./bit-matrix.js";
export {
  dataPlacementForVersion,
  placePicketFenceCodewords,
  readPicketFenceCodewords,
} from "./data-placement.js";
export { createCornerFunctionPattern } from "./corner-function-pattern.js";
export { createFunctionPattern } from "./function-pattern.js";
export { BitReader, BitWriter } from "./bit-stream.js";
export {
  alignmentParametersForVersion,
  alignmentRegionSpansForVersion,
  HAN_XIN_ALIGNMENT_PARAMETERS,
} from "./alignment-parameters.js";
export { BinaryExtensionField } from "./binary-extension-field.js";
export {
  GaloisField16,
  HAN_XIN_FUNCTION_INFO_PRIMITIVE_POLYNOMIAL,
  HAN_XIN_GF16,
} from "./gf16.js";
export {
  GaloisField256,
  HAN_XIN_GF256,
  HAN_XIN_PRIMITIVE_POLYNOMIAL,
} from "./gf256.js";
export { ReedSolomonCodec } from "./reed-solomon.js";
export {
  expandRsBlocks,
  HAN_XIN_RS_BLOCK_TABLE,
  rsBlockStructureFor,
} from "./rs-block-table.js";
export {
  correctPicketFenceCodewords,
  correctRsBlocks,
  fromPicketFenceOrder,
  joinRsBlocks,
  splitRsBlocks,
  toPicketFenceOrder,
} from "./rs-blocks.js";
export {
  HAN_XIN_MASKS,
  applyDataMask,
  isDataMaskModule,
} from "./masks.js";
export {
  HAN_XIN_MODES,
  HanXinMode,
  readModeIndicator,
} from "./modes.js";
export {
  readBinarySegment,
  readCommonChineseRegionOneSegment,
  readCommonChineseRegionTwoSegment,
  readEciSegment,
  readGb18030FourByteSegment,
  readGb18030TwoByteSegment,
  readGs1Segment,
  readNumericSegment,
  readPayload,
  readTextSegment,
  readUnicodeSegment,
  readUriSegment,
} from "./payload-segments.js";
export {
  MAX_HAN_XIN_VERSION,
  MIN_HAN_XIN_VERSION,
  dimensionForVersion,
  versionForDimension,
} from "./version.js";
export {
  bitsToFunctionInformation,
  decodeFunctionInformationFromMatrix,
  decodeFunctionInformation,
  encodeFunctionInformation,
  functionInformationCoordinates,
  functionInformationToBits,
  HAN_XIN_ERROR_CORRECTION_LEVELS,
  isFunctionInformationModule,
  placeFunctionInformation,
  readFunctionInformationCopies,
} from "./function-information.js";
export {
  HanXinCoreError,
  InvalidFunctionInformationError,
  InvalidBitStreamError,
  ReedSolomonError,
} from "./errors.js";
