export class HanXinCoreError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class InvalidBitStreamError extends HanXinCoreError {
  constructor(message, options = undefined) {
    super("PAYLOAD_INVALID", message, options);
  }
}

export class ReedSolomonError extends HanXinCoreError {
  constructor(message, options = undefined) {
    super("RS_UNCORRECTABLE", message, options);
  }
}

export class InvalidFunctionInformationError extends HanXinCoreError {
  constructor(message, options = undefined) {
    super("FUNCTION_INFO_INVALID", message, options);
  }
}
