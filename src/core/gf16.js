import { BinaryExtensionField } from "./binary-extension-field.js";

// GB/T 21049-2022 Annex G: alpha^4 + alpha + 1 = 0.
export const HAN_XIN_FUNCTION_INFO_PRIMITIVE_POLYNOMIAL = 0b10011;

export class GaloisField16 extends BinaryExtensionField {
  constructor(primitivePolynomial = HAN_XIN_FUNCTION_INFO_PRIMITIVE_POLYNOMIAL) {
    super({ degree: 4, primitivePolynomial });
  }
}

export const HAN_XIN_GF16 = new GaloisField16();
