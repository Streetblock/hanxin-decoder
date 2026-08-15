class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = "AssertionError";
  }
}

function fail(message) {
  throw new AssertionError(message);
}

function valueDescription(value) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") return `${value}n`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sameTypedArray(left, right) {
  if (left.constructor !== right.constructor || left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (!Object.is(left[index], right[index])) return false;
  }
  return true;
}

function sameValue(left, right, seen) {
  if (Object.is(left, right)) return true;
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) {
    return false;
  }
  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) return false;
  if (ArrayBuffer.isView(left) || ArrayBuffer.isView(right)) {
    return ArrayBuffer.isView(left) && ArrayBuffer.isView(right) && sameTypedArray(left, right);
  }

  let rightValues = seen.get(left);
  if (rightValues?.has(right)) return true;
  if (!rightValues) {
    rightValues = new WeakSet();
    seen.set(left, rightValues);
  }
  rightValues.add(right);

  if (left instanceof Map) {
    if (left.size !== right.size) return false;
    for (const [key, value] of left) {
      if (!right.has(key) || !sameValue(value, right.get(key), seen)) return false;
    }
    return true;
  }
  if (left instanceof Set) {
    if (left.size !== right.size) return false;
    for (const value of left) if (!right.has(value)) return false;
    return true;
  }

  const leftKeys = Reflect.ownKeys(left);
  const rightKeys = Reflect.ownKeys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!sameValue(left[key], right[key], seen)) return false;
  }
  return true;
}

function equal(actual, expected, message = undefined) {
  if (!Object.is(actual, expected)) {
    fail(message ?? `Expected ${valueDescription(actual)} to equal ${valueDescription(expected)}`);
  }
}

function deepEqual(actual, expected, message = undefined) {
  if (!sameValue(actual, expected, new WeakMap())) {
    fail(message ?? "Expected values to be deeply equal");
  }
}

function ok(value, message = undefined) {
  if (!value) fail(message ?? `Expected a truthy value, received ${valueDescription(value)}`);
}

function throws(callback, expected = undefined, message = undefined) {
  let error;
  try {
    callback();
  } catch (caught) {
    error = caught;
  }
  if (error === undefined) fail(message ?? "Expected the callback to throw");
  if (expected === undefined) return error;

  if (expected instanceof RegExp) {
    if (!expected.test(String(error?.message ?? error))) {
      fail(message ?? `Thrown error did not match ${expected}`);
    }
    return error;
  }
  if (typeof expected === "function") {
    const isErrorConstructor = expected === Error || expected.prototype instanceof Error;
    const matches = isErrorConstructor ? error instanceof expected : expected(error) === true;
    if (!matches) fail(message ?? `Thrown error did not satisfy ${expected.name || "predicate"}`);
    return error;
  }
  fail(message ?? "Unsupported expected-error matcher");
}

async function rejects(callback, expected = undefined, message = undefined) {
  let error;
  try {
    await callback();
  } catch (caught) {
    error = caught;
  }
  if (error === undefined) fail(message ?? "Expected the callback to reject");
  if (expected === undefined) return error;

  if (expected instanceof RegExp) {
    if (!expected.test(String(error?.message ?? error))) {
      fail(message ?? `Rejected error did not match ${expected}`);
    }
    return error;
  }
  if (typeof expected === "function") {
    const isErrorConstructor = expected === Error || expected.prototype instanceof Error;
    const matches = isErrorConstructor ? error instanceof expected : expected(error) === true;
    if (!matches) fail(message ?? `Rejected error did not satisfy ${expected.name || "predicate"}`);
    return error;
  }
  fail(message ?? "Unsupported expected-error matcher");
}

function match(actual, expression, message = undefined) {
  if (typeof actual !== "string" || !(expression instanceof RegExp) || !expression.test(actual)) {
    fail(message ?? `${valueDescription(actual)} did not match ${expression}`);
  }
}

const assert = Object.freeze({
  AssertionError,
  deepEqual,
  equal,
  match,
  ok,
  rejects,
  throws,
});

export { AssertionError, deepEqual, equal, match, ok, rejects, throws };
export default assert;
