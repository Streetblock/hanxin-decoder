export const MIN_HAN_XIN_VERSION = 1;
export const MAX_HAN_XIN_VERSION = 84;

function assertVersion(version) {
  if (!Number.isInteger(version)
    || version < MIN_HAN_XIN_VERSION
    || version > MAX_HAN_XIN_VERSION) {
    throw new RangeError(
      `Han Xin version must be an integer from ${MIN_HAN_XIN_VERSION} to ${MAX_HAN_XIN_VERSION}`,
    );
  }
}

export function dimensionForVersion(version) {
  assertVersion(version);
  return 2 * version + 21;
}

export function versionForDimension(dimension) {
  if (!Number.isInteger(dimension) || dimension < 23 || dimension > 189 || dimension % 2 === 0) {
    throw new RangeError("Han Xin dimension must be an odd integer from 23 to 189");
  }
  const version = (dimension - 21) / 2;
  assertVersion(version);
  return version;
}
