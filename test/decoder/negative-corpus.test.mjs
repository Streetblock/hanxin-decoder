import test from "node:test";
import assert from "node:assert/strict";

import { decodeImage } from "../../src/index.js";
import { negativeRasterCorpus } from "../fixtures/negative-rasters.mjs";

test("rejects 1,000 deterministic non-Han-Xin raster images", async () => {
  const corpus = negativeRasterCorpus();
  assert.equal(corpus.length, 1000);
  const falsePositives = [];
  const categoryCounts = new Map();
  for (const fixture of corpus) {
    categoryCounts.set(fixture.category, (categoryCounts.get(fixture.category) ?? 0) + 1);
    const result = await decodeImage(fixture.image, { diagnostics: "none" });
    if (result.ok) falsePositives.push(`${fixture.category}:${fixture.index}`);
  }
  assert.deepEqual(Object.fromEntries(categoryCounts), {
    document: 200,
    text: 200,
    qr: 200,
    "data-matrix": 200,
    noise: 200,
  });
  assert.deepEqual(falsePositives, []);
});
