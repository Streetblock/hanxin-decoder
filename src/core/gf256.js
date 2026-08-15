import { BinaryExtensionField } from "./binary-extension-field.js";

export const HAN_XIN_PRIMITIVE_POLYNOMIAL = 0b101100011;

export class GaloisField256 extends BinaryExtensionField {
  constructor(primitivePolynomial) {
    super({ degree: 8, primitivePolynomial });
  }
}

export const HAN_XIN_GF256 = new GaloisField256(HAN_XIN_PRIMITIVE_POLYNOMIAL);
