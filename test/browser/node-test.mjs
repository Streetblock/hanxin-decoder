const registeredTests = [];

export default function test(name, callback) {
  if (typeof name !== "string" || typeof callback !== "function") {
    throw new TypeError("test requires a name and callback");
  }
  registeredTests.push(Object.freeze({ name, callback }));
}

export async function runRegisteredTests() {
  const results = [];
  const started = performance.now();
  for (const definition of registeredTests) {
    const testStarted = performance.now();
    try {
      await definition.callback();
      results.push({
        name: definition.name,
        ok: true,
        durationMs: performance.now() - testStarted,
      });
    } catch (error) {
      results.push({
        name: definition.name,
        ok: false,
        durationMs: performance.now() - testStarted,
        error: {
          name: error?.name ?? "Error",
          message: error?.message ?? String(error),
          stack: error?.stack,
        },
      });
    }
  }
  const failed = results.filter((result) => !result.ok);
  return Object.freeze({
    ok: failed.length === 0,
    tests: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    durationMs: performance.now() - started,
    failures: failed,
    results,
  });
}
