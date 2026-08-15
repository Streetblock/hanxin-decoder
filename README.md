# Han Xin Decoder

Norm-driven Han Xin Code decoder for browsers and Node.js. The implementation
targets GB/T 21049-2022 and keeps the normative decoder core independent from
image loading, camera handling, the DOM, and the demo UI.

Milestone M1, the bit-exact normative core, is complete and accepted. M2 now
decodes ideal Gray8, RGB8, and RGBA8 raster symbols at right-angle rotations,
both polarities, and translated positions through the complete M1 validation
pipeline. File adapters and the final M2 acceptance gates remain in progress.
Product scope, release gates, and milestone evidence are defined in:

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
