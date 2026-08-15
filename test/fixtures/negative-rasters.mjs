function raster(width, height, background = 255) {
  return { width, height, data: new Uint8Array(width * height).fill(background) };
}

function plot(image, x, y, value = 0) {
  if (x >= 0 && y >= 0 && x < image.width && y < image.height) {
    image.data[y * image.width + x] = value;
  }
}

function rectangle(image, left, top, width, height, value = 0) {
  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) plot(image, x, y, value);
  }
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function documentRaster(index) {
  const image = raster(80, 60);
  rectangle(image, 7, 6, 24 + index % 20, 4);
  for (let line = 0; line < 7; line += 1) {
    const width = 42 + ((index * 13 + line * 7) % 27);
    rectangle(image, 7, 16 + line * 5, width, 2);
  }
  rectangle(image, 58, 45, 14, 8);
  return image;
}

function textRaster(index) {
  const image = raster(64, 32);
  const random = seededRandom(0xA11CE + index);
  for (let glyph = 0; glyph < 10; glyph += 1) {
    const left = 3 + glyph * 6;
    const height = 10 + Math.floor(random() * 14);
    rectangle(image, left, 4, 2, height);
    rectangle(image, left, 4, 4, 2);
    if (random() > 0.4) rectangle(image, left, 4 + Math.floor(height / 2), 4, 2);
  }
  return image;
}

function finder(modules, originX, originY) {
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const border = x === 0 || y === 0 || x === 6 || y === 6;
      const center = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      modules[(originY + y) * Math.sqrt(modules.length) + originX + x] = border || center ? 1 : 0;
    }
  }
}

function qrLikeRaster(index) {
  const dimension = [21, 25, 29, 33][index % 4];
  const modules = new Uint8Array(dimension * dimension);
  finder(modules, 0, 0);
  finder(modules, dimension - 7, 0);
  finder(modules, 0, dimension - 7);
  const random = seededRandom(0x5152_0000 + index);
  for (let y = 8; y < dimension; y += 1) {
    for (let x = 8; x < dimension; x += 1) {
      if (random() > 0.53) modules[y * dimension + x] = 1;
    }
  }
  const scale = 2;
  const quiet = 2;
  const image = raster((dimension + 2 * quiet) * scale, (dimension + 2 * quiet) * scale);
  for (let y = 0; y < dimension; y += 1) {
    for (let x = 0; x < dimension; x += 1) {
      if (modules[y * dimension + x]) {
        rectangle(image, (x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }
    }
  }
  return image;
}

function dataMatrixLikeRaster(index) {
  const dimension = [14, 16, 18, 20][index % 4];
  const scale = 2;
  const quiet = 2;
  const image = raster((dimension + 2 * quiet) * scale, (dimension + 2 * quiet) * scale);
  for (let module = 0; module < dimension; module += 1) {
    rectangle(image, quiet * scale, (quiet + module) * scale, scale, scale);
    rectangle(image, (quiet + module) * scale, (quiet + dimension - 1) * scale, scale, scale);
    if (module % 2 === 0) {
      rectangle(image, (quiet + module) * scale, quiet * scale, scale, scale);
      rectangle(image, (quiet + dimension - 1) * scale, (quiet + module) * scale, scale, scale);
    }
  }
  const random = seededRandom(0xDA7A_0000 + index);
  for (let y = 1; y < dimension - 1; y += 1) {
    for (let x = 1; x < dimension - 1; x += 1) {
      if (random() > 0.58) {
        rectangle(image, (quiet + x) * scale, (quiet + y) * scale, scale, scale);
      }
    }
  }
  return image;
}

function noiseRaster(index) {
  const image = raster(46, 46);
  const random = seededRandom(0xB01D_0000 + index);
  for (let offset = 0; offset < image.data.length; offset += 1) {
    image.data[offset] = random() > 0.5 ? 255 : 0;
  }
  image.data[0] = 0;
  image.data[image.width - 1] = 0;
  image.data[(image.height - 1) * image.width] = 0;
  image.data[image.data.length - 1] = 0;
  return image;
}

export function negativeRasterCorpus() {
  const corpus = [];
  for (let index = 0; index < 200; index += 1) {
    corpus.push(
      { category: "document", index, image: documentRaster(index) },
      { category: "text", index, image: textRaster(index) },
      { category: "qr", index, image: qrLikeRaster(index) },
      { category: "data-matrix", index, image: dataMatrixLikeRaster(index) },
      { category: "noise", index, image: noiseRaster(index) },
    );
  }
  return corpus;
}
