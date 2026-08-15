# Han Xin Decoder

Norm-driven Han Xin Code decoder for browsers and Node.js. The implementation
targets GB/T 21049-2022 and keeps the normative decoder core independent from
image loading, camera handling, the DOM, and the demo UI.

Milestone M1, the bit-exact normative core, is complete and accepted. The
project is now implementing M2 for clean digital raster symbols. Product scope,
release gates, and milestone evidence are defined in:

- `docs/PRODUKTSPEZIFIKATION.md`
- `docs/AKZEPTANZKRITERIEN.md`
- `docs/M1_AKZEPTANZBERICHT.md`
- `docs/M2_PLAN.md`

Run the current core tests with:

```sh
npm test
```

The package is intentionally marked `UNLICENSED` and private until the project
license and third-party provenance review are complete.
