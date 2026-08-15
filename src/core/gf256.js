const FIELD_SIZE = 256;
const FIELD_ORDER = FIELD_SIZE - 1;

export const HAN_XIN_PRIMITIVE_POLYNOMIAL = 0b101100011;

function assertElement(name, value) {
  if (!Number.isInteger(value) || value < 0 || value >= FIELD_SIZE) {
    throw new RangeError(`${name} must be a GF(256) element from 0 to 255`);
  }
}

export class GaloisField256 {
  constructor(primitivePolynomial) {
    if (!Number.isInteger(primitivePolynomial)
      || primitivePolynomial < 0x100
      || primitivePolynomial >= 0x200) {
      throw new RangeError("primitivePolynomial must be a degree-8 binary polynomial");
    }

    this.primitivePolynomial = primitivePolynomial;
    this.expTable = new Uint8Array(FIELD_ORDER * 2);
    this.logTable = new Int16Array(FIELD_SIZE);
    this.logTable.fill(-1);

    let value = 1;
    for (let exponent = 0; exponent < FIELD_ORDER; exponent += 1) {
      if (this.logTable[value] !== -1) {
        throw new RangeError("polynomial is not primitive for generator alpha = 2");
      }
      this.expTable[exponent] = value;
      this.logTable[value] = exponent;
      value <<= 1;
      if ((value & 0x100) !== 0) value ^= primitivePolynomial;
      value &= 0xff;
    }
    if (value !== 1) {
      throw new RangeError("polynomial does not generate GF(256)");
    }
    for (let exponent = FIELD_ORDER; exponent < this.expTable.length; exponent += 1) {
      this.expTable[exponent] = this.expTable[exponent - FIELD_ORDER];
    }
  }

  add(left, right) {
    assertElement("left", left);
    assertElement("right", right);
    return left ^ right;
  }

  exp(exponent) {
    if (!Number.isInteger(exponent)) throw new TypeError("exponent must be an integer");
    const normalized = ((exponent % FIELD_ORDER) + FIELD_ORDER) % FIELD_ORDER;
    return this.expTable[normalized];
  }

  log(value) {
    assertElement("value", value);
    if (value === 0) throw new RangeError("log(0) is undefined in GF(256)");
    return this.logTable[value];
  }

  inverse(value) {
    assertElement("value", value);
    if (value === 0) throw new RangeError("zero has no multiplicative inverse");
    return this.expTable[FIELD_ORDER - this.logTable[value]];
  }

  multiply(left, right) {
    assertElement("left", left);
    assertElement("right", right);
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
      assertElement("left coefficient", left[i]);
      for (let j = 0; j < right.length; j += 1) {
        assertElement("right coefficient", right[j]);
        product[i + j] ^= this.multiply(left[i], right[j]);
      }
    }
    return product;
  }

  buildGenerator(degree, firstRoot = 1) {
    if (!Number.isInteger(degree) || degree < 0 || degree >= FIELD_SIZE) {
      throw new RangeError("generator degree must be an integer from 0 to 255");
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

export const HAN_XIN_GF256 = new GaloisField256(HAN_XIN_PRIMITIVE_POLYNOMIAL);
