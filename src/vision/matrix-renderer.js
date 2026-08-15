import { BitMatrix } from "../core/bit-matrix.js";

const FORMATS = Object.freeze({
  gray8: 1,
  rgb8: 3,
  rgba8: 4,
});

function integerOption(name, value, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be a safe integer >= ${minimum}`);
  }
  return value;
}

function normalizeColor(name, value, channels, fallback) {
  const color = value === undefined ? fallback : value;

  if (channels === 1) {
    if (!Number.isInteger(color) || color < 0 || color > 255) {
      throw new RangeError(`${name} must be an integer between 0 and 255 for gray8`);
    }
    return [color];
  }

  if (!Array.isArray(color) || color.length !== channels) {
    throw new TypeError(`${name} must be an array with ${channels} channels`);
  }

  for (const channel of color) {
    if (!Number.isInteger(channel) || channel < 0 || channel > 255) {
      throw new RangeError(`${name} channels must be integers between 0 and 255`);
    }
  }

  return color.slice();
}

function fillRaster(data, color, channels) {
  if (channels === 1) {
    data.fill(color[0]);
    return;
  }

  for (let offset = 0; offset < data.length; offset += channels) {
    data.set(color, offset);
  }
}

function setPixel(data, width, x, y, color, channels) {
  const offset = (y * width + x) * channels;
  data.set(color, offset);
}

function rotatedCoordinates(x, y, width, height, rotation) {
  switch (rotation) {
    case 0:
      return [x, y];
    case 90:
      return [height - 1 - y, x];
    case 180:
      return [width - 1 - x, height - 1 - y];
    case 270:
      return [y, width - 1 - x];
    default:
      throw new RangeError("rotation must be one of 0, 90, 180, or 270");
  }
}

/**
 * Renders a BitMatrix into a platform-neutral raster image.
 *
 * The quiet zone is measured in modules. Offsets and output dimensions are
 * measured in pixels. Rotation is clockwise.
 */
export function renderMatrixRaster(matrix, options = {}) {
  if (!(matrix instanceof BitMatrix)) {
    throw new TypeError("matrix must be a BitMatrix");
  }
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }

  const moduleSize = integerOption("moduleSize", options.moduleSize ?? 1, 1);
  const quietZone = integerOption("quietZone", options.quietZone ?? 0, 0);
  const offsetX = integerOption("offsetX", options.offsetX ?? 0, 0);
  const offsetY = integerOption("offsetY", options.offsetY ?? 0, 0);
  const rotation = options.rotation ?? 0;
  if (![0, 90, 180, 270].includes(rotation)) {
    throw new RangeError("rotation must be one of 0, 90, 180, or 270");
  }
  if (options.inverted !== undefined && typeof options.inverted !== "boolean") {
    throw new TypeError("inverted must be a boolean");
  }

  const format = options.format ?? "gray8";
  const channels = FORMATS[format];
  if (channels === undefined) {
    throw new RangeError("format must be gray8, rgb8, or rgba8");
  }

  const defaults = channels === 1
    ? { foreground: 0, background: 255 }
    : channels === 3
      ? { foreground: [0, 0, 0], background: [255, 255, 255] }
      : { foreground: [0, 0, 0, 255], background: [255, 255, 255, 255] };
  let foreground = normalizeColor("foreground", options.foreground, channels, defaults.foreground);
  let background = normalizeColor("background", options.background, channels, defaults.background);
  if (options.inverted === true) {
    [foreground, background] = [background, foreground];
  }

  const rotatedWidth = rotation === 90 || rotation === 270 ? matrix.height : matrix.width;
  const rotatedHeight = rotation === 90 || rotation === 270 ? matrix.width : matrix.height;
  const symbolWidth = integerOption(
    "rendered symbol width",
    (rotatedWidth + 2 * quietZone) * moduleSize,
    1,
  );
  const symbolHeight = integerOption(
    "rendered symbol height",
    (rotatedHeight + 2 * quietZone) * moduleSize,
    1,
  );
  const minimumWidth = integerOption("minimum output width", offsetX + symbolWidth, 1);
  const minimumHeight = integerOption("minimum output height", offsetY + symbolHeight, 1);
  const width = integerOption("width", options.width ?? minimumWidth, 1);
  const height = integerOption("height", options.height ?? minimumHeight, 1);
  if (width < minimumWidth || height < minimumHeight) {
    throw new RangeError(
      `output ${width}x${height} is too small; at least ${minimumWidth}x${minimumHeight} is required`,
    );
  }

  const length = width * height * channels;
  if (!Number.isSafeInteger(length)) {
    throw new RangeError("output raster is too large");
  }
  const data = new Uint8Array(length);
  fillRaster(data, background, channels);

  const originX = offsetX + quietZone * moduleSize;
  const originY = offsetY + quietZone * moduleSize;
  for (let y = 0; y < matrix.height; y += 1) {
    for (let x = 0; x < matrix.width; x += 1) {
      if (!matrix.get(x, y)) continue;
      const [rotatedX, rotatedY] = rotatedCoordinates(
        x,
        y,
        matrix.width,
        matrix.height,
        rotation,
      );
      const pixelX = originX + rotatedX * moduleSize;
      const pixelY = originY + rotatedY * moduleSize;
      for (let dy = 0; dy < moduleSize; dy += 1) {
        for (let dx = 0; dx < moduleSize; dx += 1) {
          setPixel(data, width, pixelX + dx, pixelY + dy, foreground, channels);
        }
      }
    }
  }

  return Object.freeze({ width, height, data });
}
