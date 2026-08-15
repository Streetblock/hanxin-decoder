function assertInteger(name, value, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer >= ${minimum}`);
  }
}

export class BitMatrix {
  constructor(width, height = width, data = undefined) {
    assertInteger("width", width, 1);
    assertInteger("height", height, 1);

    const size = width * height;
    if (!Number.isSafeInteger(size)) {
      throw new RangeError("BitMatrix dimensions are too large");
    }

    this.width = width;
    this.height = height;

    if (data === undefined) {
      this.data = new Uint8Array(size);
    } else {
      if (!(data instanceof Uint8Array) || data.length !== size) {
        throw new TypeError(`data must be a Uint8Array of length ${size}`);
      }
      this.data = Uint8Array.from(data, (value) => (value ? 1 : 0));
    }
  }

  static fromRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new TypeError("rows must be a non-empty array");
    }
    const width = rows[0]?.length;
    assertInteger("row width", width, 1);
    if (rows.some((row) => row.length !== width)) {
      throw new RangeError("all rows must have the same width");
    }

    const matrix = new BitMatrix(width, rows.length);
    for (let y = 0; y < rows.length; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const value = rows[y][x];
        if (value !== 0 && value !== 1 && value !== false && value !== true) {
          throw new TypeError("rows may contain only zero/one or boolean values");
        }
        matrix.data[y * width + x] = value ? 1 : 0;
      }
    }
    return matrix;
  }

  #offset(x, y) {
    assertInteger("x", x);
    assertInteger("y", y);
    if (x >= this.width || y >= this.height) {
      throw new RangeError(`coordinate (${x}, ${y}) is outside ${this.width}x${this.height}`);
    }
    return y * this.width + x;
  }

  get(x, y) {
    return this.data[this.#offset(x, y)] === 1;
  }

  set(x, y, value = true) {
    this.data[this.#offset(x, y)] = value ? 1 : 0;
    return this;
  }

  flip(x, y) {
    const offset = this.#offset(x, y);
    this.data[offset] ^= 1;
    return this;
  }

  fill(value) {
    this.data.fill(value ? 1 : 0);
    return this;
  }

  count() {
    let total = 0;
    for (const value of this.data) total += value;
    return total;
  }

  clone() {
    return new BitMatrix(this.width, this.height, this.data);
  }

  equals(other) {
    if (!(other instanceof BitMatrix)) return false;
    if (this.width !== other.width || this.height !== other.height) return false;
    for (let index = 0; index < this.data.length; index += 1) {
      if (this.data[index] !== other.data[index]) return false;
    }
    return true;
  }

  toRows() {
    const rows = [];
    for (let y = 0; y < this.height; y += 1) {
      rows.push(Array.from(this.data.subarray(y * this.width, (y + 1) * this.width)));
    }
    return rows;
  }
}
