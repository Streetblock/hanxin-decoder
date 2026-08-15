export class BinaryExtensionField {
  constructor({ degree, primitivePolynomial }) {
    if (!Number.isInteger(degree) || degree < 2 || degree > 8) {
      throw new RangeError("degree must be an integer from 2 to 8");
    }

    const size = 1 << degree;
    if (!Number.isInteger(primitivePolynomial)
      || primitivePolynomial < size
      || primitivePolynomial >= size * 2) {
      throw new RangeError(`primitivePolynomial must be a degree-${degree} binary polynomial`);
    }

    this.degree = degree;
    this.size = size;
    this.order = size - 1;
    this.primitivePolynomial = primitivePolynomial;
    this.expTable = new Uint8Array(this.order * 2);
    this.logTable = new Int16Array(this.size);
    this.logTable.fill(-1);

    let value = 1;
    for (let exponent = 0; exponent < this.order; exponent += 1) {
      if (this.logTable[value] !== -1) {
        throw new RangeError("polynomial is not primitive for generator alpha = 2");
      }
      this.expTable[exponent] = value;
      this.logTable[value] = exponent;
      value <<= 1;
      if ((value & this.size) !== 0) value ^= primitivePolynomial;
      value &= this.order;
    }
    if (value !== 1) {
      throw new RangeError(`polynomial does not generate GF(${this.size})`);
    }
    for (let exponent = this.order; exponent < this.expTable.length; exponent += 1) {
      this.expTable[exponent] = this.expTable[exponent - this.order];
    }
  }

  assertElement(name, value) {
    if (!Number.isInteger(value) || value < 0 || value >= this.size) {
      throw new RangeError(
        `${name} must be a GF(${this.size}) element from 0 to ${this.order}`,
      );
    }
  }

  add(left, right) {
    this.assertElement("left", left);
    this.assertElement("right", right);
    return left ^ right;
  }

  exp(exponent) {
    if (!Number.isInteger(exponent)) throw new TypeError("exponent must be an integer");
    const normalized = ((exponent % this.order) + this.order) % this.order;
    return this.expTable[normalized];
  }

  log(value) {
    this.assertElement("value", value);
    if (value === 0) throw new RangeError(`log(0) is undefined in GF(${this.size})`);
    return this.logTable[value];
  }

  inverse(value) {
    this.assertElement("value", value);
    if (value === 0) throw new RangeError("zero has no multiplicative inverse");
    return this.expTable[this.order - this.logTable[value]];
  }

  multiply(left, right) {
    this.assertElement("left", left);
    this.assertElement("right", right);
    if (left === 0 || right === 0) return 0;
    return this.expTable[this.logTable[left] + this.logTable[right]];
  }

  polynomialMultiply(left, right) {
    if (!Array.isArray(left) && !(left instanceof Uint8Array)) {
      throw new TypeError("left polynomial must be an array");
    }
    if (!Array.isArray(right) && !(right instanceof Uint8Array)) {
      throw new TypeError("right polynomial must be an array");
    }
    if (left.length === 0 || right.length === 0) {
      throw new RangeError("polynomials must not be empty");
    }

    const product = new Uint8Array(left.length + right.length - 1);
    for (let i = 0; i < left.length; i += 1) {
      this.assertElement("left coefficient", left[i]);
      for (let j = 0; j < right.length; j += 1) {
        this.assertElement("right coefficient", right[j]);
        product[i + j] ^= this.multiply(left[i], right[j]);
      }
    }
    return product;
  }

  buildGenerator(degree, firstRoot = 1) {
    if (!Number.isInteger(degree) || degree < 0 || degree > this.order) {
      throw new RangeError(
        `generator degree must be an integer from 0 to ${this.order}`,
      );
    }
    if (!Number.isInteger(firstRoot)) throw new TypeError("firstRoot must be an integer");

    let generator = Uint8Array.of(1);
    for (let index = 0; index < degree; index += 1) {
      generator = this.polynomialMultiply(
        generator,
        Uint8Array.of(1, this.exp(firstRoot + index)),
      );
    }
    return generator;
  }
}
