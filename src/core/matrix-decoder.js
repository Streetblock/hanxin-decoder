import { BitMatrix } from "./bit-matrix.js";
import { readPicketFenceCodewords } from "./data-placement.js";
import { InvalidFunctionInformationError } from "./errors.js";
import { decodeFunctionInformationFromMatrix } from "./function-information.js";
import { createFunctionPattern } from "./function-pattern.js";
import { applyDataMask } from "./masks.js";
import { readPayload, symbologyIdentifierForPayload } from "./payload-segments.js";
import { correctPicketFenceCodewords } from "./rs-blocks.js";
import { versionForDimension } from "./version.js";

/**
 * Decodes an already normalized Han Xin module matrix through the complete
 * normative M1 pipeline. Image detection and sampling intentionally live
 * outside this core function.
 */
export function decodeMatrix(matrix) {
  if (!(matrix instanceof BitMatrix) || matrix.width !== matrix.height) {
    throw new TypeError("matrix must be a square BitMatrix");
  }

  const dimensionVersion = versionForDimension(matrix.width);
  const functionInformation = decodeFunctionInformationFromMatrix(matrix);
  if (functionInformation.version !== dimensionVersion) {
    throw new InvalidFunctionInformationError(
      `function information declares version ${functionInformation.version} `
      + `for a version ${dimensionVersion} matrix`,
    );
  }

  const pattern = createFunctionPattern(functionInformation.version);
  const unmasked = applyDataMask(
    matrix,
    functionInformation.mask,
    (row, column) => pattern.functionModules.data[row * matrix.width + column] !== 0,
  );
  const placedCodewords = readPicketFenceCodewords(unmasked, functionInformation.version);
  const corrected = correctPicketFenceCodewords(
    placedCodewords,
    functionInformation.version,
    functionInformation.errorCorrectionLevel,
  );
  const payload = readPayload(corrected.dataCodewords);

  return {
    ok: true,
    format: "han-xin",
    ...payload,
    symbologyIdentifier: symbologyIdentifierForPayload(payload),
    version: functionInformation.version,
    dimension: matrix.width,
    errorCorrectionLevel: functionInformation.errorCorrectionLevel,
    errorLevel: `L${functionInformation.errorCorrectionLevel + 1}`,
    mask: functionInformation.mask,
    correctedCodewords: corrected.correctedErrors,
    functionInformation,
    rsBlocks: corrected.blocks,
  };
}
