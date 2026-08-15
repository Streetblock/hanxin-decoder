const RASTER_FORMATS = Object.freeze({
  1: "gray8",
  3: "rgb8",
  4: "rgba8",
});

function assertDimension(name, value) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

/** Validates a platform-neutral raster and reports its inferred pixel format. */
export function validateRasterImage(image) {
  if (!image || typeof image !== "object") {
    throw new TypeError("image must be a RasterImage object");
  }
  assertDimension("image.width", image.width);
  assertDimension("image.height", image.height);
  if (!(image.data instanceof Uint8Array) && !(image.data instanceof Uint8ClampedArray)) {
    throw new TypeError("image.data must be a Uint8Array or Uint8ClampedArray");
  }

  const pixelCount = image.width * image.height;
  if (!Number.isSafeInteger(pixelCount)) {
    throw new RangeError("image dimensions exceed the safe raster size");
  }
  const channels = image.data.length / pixelCount;
  const format = RASTER_FORMATS[channels];
  if (format === undefined) {
    throw new RangeError(
      `image.data length must be width * height * 1, 3, or 4; got ${image.data.length}`,
    );
  }

  return Object.freeze({
    width: image.width,
    height: image.height,
    pixelCount,
    channels,
    format,
  });
}

function luminance(red, green, blue) {
  return (77 * red + 150 * green + 29 * blue + 128) >>> 8;
}

function compositeOverWhite(channel, alpha) {
  return Math.floor((channel * alpha + 255 * (255 - alpha) + 127) / 255);
}

/** Converts Gray8, RGB8, or RGBA8 input to an owned canonical Gray8 raster. */
export function toGrayscaleRaster(image, options = {}) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new TypeError("options must be an object");
  }
  if (options.checkpoint !== undefined && typeof options.checkpoint !== "function") {
    throw new TypeError("options.checkpoint must be a function");
  }

  const details = validateRasterImage(image);
  const grayscale = new Uint8Array(details.pixelCount);
  const checkpoint = options.checkpoint ?? (() => {});
  const chunkSize = 16_384;

  if (details.channels === 1) {
    for (let start = 0; start < details.pixelCount; start += chunkSize) {
      checkpoint();
      const end = Math.min(start + chunkSize, details.pixelCount);
      grayscale.set(image.data.subarray(start, end), start);
    }
  } else if (details.channels === 3) {
    for (let pixel = 0, offset = 0; pixel < details.pixelCount; pixel += 1, offset += 3) {
      if (pixel % chunkSize === 0) checkpoint();
      grayscale[pixel] = luminance(
        image.data[offset],
        image.data[offset + 1],
        image.data[offset + 2],
      );
    }
  } else {
    for (let pixel = 0, offset = 0; pixel < details.pixelCount; pixel += 1, offset += 4) {
      if (pixel % chunkSize === 0) checkpoint();
      const alpha = image.data[offset + 3];
      grayscale[pixel] = luminance(
        compositeOverWhite(image.data[offset], alpha),
        compositeOverWhite(image.data[offset + 1], alpha),
        compositeOverWhite(image.data[offset + 2], alpha),
      );
    }
  }
  checkpoint();

  return Object.freeze({
    width: details.width,
    height: details.height,
    data: grayscale,
  });
}
