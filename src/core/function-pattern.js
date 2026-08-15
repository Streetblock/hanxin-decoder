import { alignmentRegionSpansForVersion } from "./alignment-parameters.js";
import { createCornerFunctionPattern } from "./corner-function-pattern.js";

const DARK = true;
const LIGHT = false;

function safePlot(pattern, column, row, value) {
  if (column < 0 || row < 0
    || column >= pattern.dimension || row >= pattern.dimension
    || pattern.functionModules.get(column, row)) {
    return;
  }

  pattern.modules.set(column, row, value);
  pattern.functionModules.set(column, row);
}

function placeAssistantPattern(pattern, centerColumn, centerRow) {
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      safePlot(
        pattern,
        centerColumn + columnOffset,
        centerRow + rowOffset,
        columnOffset === 0 && rowOffset === 0 ? DARK : LIGHT,
      );
    }
  }
}

function placeAlignmentPattern(pattern, right, top, width, height) {
  safePlot(pattern, right, top, DARK);
  safePlot(pattern, right - 1, top + 1, LIGHT);

  for (let offset = 1; offset <= width; offset += 1) {
    safePlot(pattern, right - offset, top, DARK);
    safePlot(pattern, right - offset - 1, top + 1, LIGHT);
  }

  for (let offset = 1; offset < height; offset += 1) {
    safePlot(pattern, right, top + offset, DARK);
    safePlot(pattern, right - 1, top + offset + 1, LIGHT);
  }
}

function placeAssistantPatterns(pattern, spans) {
  const { dimension } = pattern;
  const m = spans.length - 1;
  const boundaryCount = spans.length + 1;

  let row = 0;
  for (let region = 0; region < boundaryCount; region += 1) {
    if ((region % 2 === 0 && m % 2 === 1)
      || (region % 2 === 1 && m % 2 === 0)) {
      placeAssistantPattern(pattern, 0, row);
    }
    if (region % 2 === 1) {
      placeAssistantPattern(pattern, dimension - 1, row);
    }
    if (region < spans.length) row += spans[region];
  }

  let column = dimension - 1;
  for (let region = 0; region < boundaryCount; region += 1) {
    if ((region % 2 === 0 && m % 2 === 1)
      || (region % 2 === 1 && m % 2 === 0)) {
      placeAssistantPattern(pattern, column, dimension - 1);
    }
    if (region % 2 === 1) {
      placeAssistantPattern(pattern, column, 0);
    }
    if (region < spans.length) column -= spans[region];
  }
}

function placeAlignmentPatterns(pattern, spans) {
  const boundaryCount = spans.length + 1;
  let top = 0;

  for (let rowRegion = 0; rowRegion < boundaryCount; rowRegion += 1) {
    let right = pattern.dimension - 1;
    let plot = rowRegion % 2 === 0;
    const height = spans[Math.min(rowRegion, spans.length - 1)];

    for (let columnRegion = 0; columnRegion < boundaryCount; columnRegion += 1) {
      const width = spans[Math.min(columnRegion, spans.length - 1)];
      if (plot && !(top === 0 && right === pattern.dimension - 1)) {
        placeAlignmentPattern(
          pattern,
          right,
          top,
          width,
          height,
        );
      }
      plot = !plot;
      if (columnRegion < spans.length) right -= spans[columnRegion];
    }

    if (rowRegion < spans.length) top += spans[rowRegion];
  }
}

/**
 * Builds the complete fixed-module template defined in GB/T 21049-2022
 * sections 4.2.2-4.2.7. The returned matrices intentionally leave the two
 * function-information copies light until their decoded values are placed.
 */
export function createFunctionPattern(version) {
  const pattern = createCornerFunctionPattern(version);
  const spans = alignmentRegionSpansForVersion(version);

  if (spans.length > 0) {
    placeAssistantPatterns(pattern, spans);
    placeAlignmentPatterns(pattern, spans);
  }

  return pattern;
}
