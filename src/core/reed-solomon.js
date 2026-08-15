import { HAN_XIN_GF256 } from "./gf256.js";
import { ReedSolomonError } from "./errors.js";

class Polynomial {
  constructor(field, coefficients) {
    if (!(coefficients instanceof Uint8Array) && !Array.isArray(coefficients)) {
      throw new TypeError("coefficients must be an array");
    }
    if (coefficients.length === 0) throw new RangeError("polynomial must not be empty");

    this.field = field;
    let first = 0;
    while (first < coefficients.length - 1 && coefficients[first] === 0) first += 1;
    this.coefficients = Uint8Array.from(coefficients).subarray(first);
  }

  get degree() {
    return this.coefficients.length - 1;
  }

  get isZero() {
    return this.coefficients[0] === 0;
  }

  coefficient(degree) {
    return this.coefficients[this.coefficients.length - 1 - degree];
  }

  evaluateAt(value) {
    if (value === 0) return this.coefficient(0);
    let result = this.coefficients[0];
    for (let index = 1; index < this.coefficients.length; index += 1) {
      result = this.field.multiply(result, value) ^ this.coefficients[index];
    }
    return result;
  }

  add(other) {
    if (this.field !== other.field) throw new TypeError("polynomial field mismatch");
    if (this.isZero) return other;
    if (other.isZero) return this;

    let smaller = this.coefficients;
    let larger = other.coefficients;
    if (smaller.length > larger.length) [smaller, larger] = [larger, smaller];

    const sum = Uint8Array.from(larger);
    const offset = larger.length - smaller.length;
    for (let index = 0; index < smaller.length; index += 1) {
      sum[offset + index] ^= smaller[index];
    }
    return new Polynomial(this.field, sum);
  }

  multiply(other) {
    if (this.field !== other.field) throw new TypeError("polynomial field mismatch");
    if (this.isZero || other.isZero) return new Polynomial(this.field, [0]);
    return new Polynomial(
      this.field,
      this.field.polynomialMultiply(this.coefficients, other.coefficients),
    );
  }

  multiplyScalar(scalar) {
    if (scalar === 0) return new Polynomial(this.field, [0]);
    if (scalar === 1) return this;
    return new Polynomial(
      this.field,
      Uint8Array.from(this.coefficients, (coefficient) => (
        this.field.multiply(coefficient, scalar)
      )),
    );
  }

  multiplyByMonomial(degree, coefficient) {
    if (!Number.isInteger(degree) || degree < 0) {
      throw new RangeError("monomial degree must be a non-negative integer");
    }
    if (coefficient === 0) return new Polynomial(this.field, [0]);
    const result = new Uint8Array(this.coefficients.length + degree);
    for (let index = 0; index < this.coefficients.length; index += 1) {
      result[index] = this.field.multiply(this.coefficients[index], coefficient);
    }
    return new Polynomial(this.field, result);
  }
}

function buildMonomial(field, degree, coefficient) {
  if (!Number.isInteger(degree) || degree < 0) {
    throw new RangeError("monomial degree must be a non-negative integer");
  }
  if (coefficient === 0) return new Polynomial(field, [0]);
  const coefficients = new Uint8Array(degree + 1);
  coefficients[0] = coefficient;
  return new Polynomial(field, coefficients);
}

function runEuclideanAlgorithm(field, left, right, correctionCodewords) {
  let a = left;
  let b = right;
  if (a.degree < b.degree) [a, b] = [b, a];

  let previousRemainder = a;
  let remainder = b;
  let previousAuxiliary = new Polynomial(field, [0]);
  let auxiliary = new Polynomial(field, [1]);

  while (2 * remainder.degree >= correctionCodewords) {
    const olderRemainder = previousRemainder;
    const olderAuxiliary = previousAuxiliary;
    previousRemainder = remainder;
    previousAuxiliary = auxiliary;

    if (previousRemainder.isZero) {
      throw new ReedSolomonError("Euclidean algorithm reached a zero remainder");
    }

    remainder = olderRemainder;
    let quotient = new Polynomial(field, [0]);
    const denominatorInverse = field.inverse(
      previousRemainder.coefficient(previousRemainder.degree),
    );

    while (remainder.degree >= previousRemainder.degree && !remainder.isZero) {
      const degreeDifference = remainder.degree - previousRemainder.degree;
      const scale = field.multiply(
        remainder.coefficient(remainder.degree),
        denominatorInverse,
      );
      quotient = quotient.add(buildMonomial(field, degreeDifference, scale));
      remainder = remainder.add(
        previousRemainder.multiplyByMonomial(degreeDifference, scale),
      );
    }

    auxiliary = quotient.multiply(previousAuxiliary).add(olderAuxiliary);
    if (remainder.degree >= previousRemainder.degree) {
      throw new ReedSolomonError("Euclidean polynomial division did not reduce the degree");
    }
  }

  const normalization = auxiliary.coefficient(0);
  if (normalization === 0) {
    throw new ReedSolomonError("error locator cannot be normalized");
  }
  const inverse = field.inverse(normalization);
  return [auxiliary.multiplyScalar(inverse), remainder.multiplyScalar(inverse)];
}

function findErrorLocations(field, errorLocator) {
  const count = errorLocator.degree;
  if (count === 1) return [errorLocator.coefficient(1)];

  const locations = [];
  for (let value = 1; value < field.size && locations.length < count; value += 1) {
    if (errorLocator.evaluateAt(value) === 0) locations.push(field.inverse(value));
  }
  if (locations.length !== count) {
    throw new ReedSolomonError("error locator roots do not match its degree");
  }
  return locations;
}

function findErrorMagnitudes(field, errorEvaluator, errorLocations, generatorBase) {
  return errorLocations.map((location, index) => {
    const inverseLocation = field.inverse(location);
    let denominator = 1;
    for (let other = 0; other < errorLocations.length; other += 1) {
      if (other === index) continue;
      denominator = field.multiply(
        denominator,
        field.multiply(errorLocations[other], inverseLocation) ^ 1,
      );
    }

    let magnitude = field.multiply(
      errorEvaluator.evaluateAt(inverseLocation),
      field.inverse(denominator),
    );
    if (generatorBase !== 0) magnitude = field.multiply(magnitude, inverseLocation);
    return magnitude;
  });
}

function assertCodewords(field, codewords) {
  if (!(codewords instanceof Uint8Array)) {
    throw new TypeError("codewords must be a Uint8Array");
  }
  if (codewords.length === 0 || codewords.length > field.order) {
    throw new RangeError(
      `a Reed-Solomon block over GF(${field.size}) must contain 1 to ${field.order} codewords`,
    );
  }
  for (const codeword of codewords) {
    field.assertElement("codeword", codeword);
  }
}

export class ReedSolomonCodec {
  constructor({ field = HAN_XIN_GF256, generatorBase = 1 } = {}) {
    this.field = field;
    this.generatorBase = generatorBase;
  }

  encode(informationCodewords, correctionCodewords) {
    assertCodewords(this.field, informationCodewords);
    if (!Number.isInteger(correctionCodewords)
      || correctionCodewords <= 0
      || informationCodewords.length + correctionCodewords > this.field.order) {
      throw new RangeError("invalid correction codeword count");
    }

    const generator = this.field.buildGenerator(correctionCodewords, this.generatorBase);
    const working = new Uint8Array(informationCodewords.length + correctionCodewords);
    working.set(informationCodewords);

    for (let index = 0; index < informationCodewords.length; index += 1) {
      const coefficient = working[index];
      if (coefficient === 0) continue;
      for (let generatorIndex = 1; generatorIndex < generator.length; generatorIndex += 1) {
        working[index + generatorIndex] ^= this.field.multiply(
          generator[generatorIndex],
          coefficient,
        );
      }
    }

    const encoded = new Uint8Array(working.length);
    encoded.set(informationCodewords);
    encoded.set(working.subarray(informationCodewords.length), informationCodewords.length);
    return encoded;
  }

  decode(receivedCodewords, correctionCodewords) {
    assertCodewords(this.field, receivedCodewords);
    if (!Number.isInteger(correctionCodewords)
      || correctionCodewords <= 0
      || correctionCodewords >= receivedCodewords.length) {
      throw new RangeError("invalid correction codeword count");
    }

    const received = Uint8Array.from(receivedCodewords);
    const polynomial = new Polynomial(this.field, received);
    const syndromeCoefficients = new Uint8Array(correctionCodewords);
    let hasError = false;

    for (let index = 0; index < correctionCodewords; index += 1) {
      const syndrome = polynomial.evaluateAt(
        this.field.exp(index + this.generatorBase),
      );
      syndromeCoefficients[correctionCodewords - 1 - index] = syndrome;
      if (syndrome !== 0) hasError = true;
    }

    if (!hasError) {
      return {
        codewords: received,
        correctedErrors: 0,
        syndromes: syndromeCoefficients,
      };
    }

    const [errorLocator, errorEvaluator] = runEuclideanAlgorithm(
      this.field,
      buildMonomial(this.field, correctionCodewords, 1),
      new Polynomial(this.field, syndromeCoefficients),
      correctionCodewords,
    );
    const errorLocations = findErrorLocations(this.field, errorLocator);
    const errorMagnitudes = findErrorMagnitudes(
      this.field,
      errorEvaluator,
      errorLocations,
      this.generatorBase,
    );

    for (let index = 0; index < errorLocations.length; index += 1) {
      const position = received.length - 1 - this.field.log(errorLocations[index]);
      if (position < 0 || position >= received.length) {
        throw new ReedSolomonError("calculated error position is outside the block");
      }
      received[position] ^= errorMagnitudes[index];
    }

    const verified = new Polynomial(this.field, received);
    for (let index = 0; index < correctionCodewords; index += 1) {
      if (verified.evaluateAt(this.field.exp(index + this.generatorBase)) !== 0) {
        throw new ReedSolomonError("corrected block still has a non-zero syndrome");
      }
    }

    return {
      codewords: received,
      correctedErrors: errorLocations.length,
      syndromes: syndromeCoefficients,
    };
  }
}
