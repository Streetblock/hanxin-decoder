import { BitMatrix } from "./bit-matrix.js";
import { functionInformationCoordinates } from "./function-information.js";
import { dimensionForVersion } from "./version.js";

const FINDER_SIZE = 7;
const CORNER_REGION_SIZE = 8;

const TOP_LEFT_FINDER = Object.freeze([
  "1111111",
  "1000000",
  "1011111",
  "1010000",
  "1010111",
  "1010111",
  "1010111",
]);

function finderValue(rotation, x, y) {
  let sourceX = x;
  let sourceY = y;
  if (rotation === 1) {
    sourceX = y;
    sourceY = FINDER_SIZE - 1 - x;
  } else if (rotation === 2) {
    sourceX = FINDER_SIZE - 1 - x;
    sourceY = FINDER_SIZE - 1 - y;
  }
  return TOP_LEFT_FINDER[sourceY][sourceX] === "1";
}

function reserve(functionModules, column, row) {
  functionModules.set(column, row);
}

function placeFinder(modules, functionModules, originColumn, originRow, rotation) {
  for (let y = 0; y < FINDER_SIZE; y += 1) {
    for (let x = 0; x < FINDER_SIZE; x += 1) {
      const column = originColumn + x;
      const row = originRow + y;
      modules.set(column, row, finderValue(rotation, x, y));
      reserve(functionModules, column, row);
    }
  }
}

function placeSeparators(functionModules, dimension) {
  const far = dimension - CORNER_REGION_SIZE;
  for (let offset = 0; offset < CORNER_REGION_SIZE; offset += 1) {
    reserve(functionModules, offset, 7);
    reserve(functionModules, 7, offset);

    reserve(functionModules, dimension - 1 - offset, 7);
    reserve(functionModules, far, offset);

    reserve(functionModules, offset, far);
    reserve(functionModules, 7, dimension - 1 - offset);

    reserve(functionModules, dimension - 1 - offset, far);
    reserve(functionModules, far, dimension - 1 - offset);
  }
}

/**
 * Builds the four finder patterns, their light separators, and the two
 * function-information copies. Versions 1-3 have no alignment patterns, so
 * this is their complete function-pattern template. Versions 4-84 add the
 * alignment and assistant-alignment patterns defined in section 4.2.5/4.2.6.
 */
export function createCornerFunctionPattern(version) {
  const dimension = dimensionForVersion(version);
  const modules = new BitMatrix(dimension);
  const functionModules = new BitMatrix(dimension);
  const farFinder = dimension - FINDER_SIZE;

  placeFinder(modules, functionModules, 0, 0, 0);
  placeFinder(modules, functionModules, farFinder, 0, 1);
  placeFinder(modules, functionModules, 0, farFinder, 1);
  placeFinder(modules, functionModules, farFinder, farFinder, 2);
  placeSeparators(functionModules, dimension);

  const information = functionInformationCoordinates(dimension);
  for (const copy of [information.primary, information.secondary]) {
    for (const { column, row } of copy) reserve(functionModules, column, row);
  }

  return {
    version,
    dimension,
    modules,
    functionModules,
    isFunctionModule(row, column) {
      if (!Number.isInteger(row) || !Number.isInteger(column)
        || row < 0 || column < 0 || row >= dimension || column >= dimension) {
        return false;
      }
      return functionModules.get(column, row);
    },
  };
}
