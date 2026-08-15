# Han Xin Decoder

Norm-driven Han Xin Code decoder for browsers and Node.js. The implementation
targets GB/T 21049-2022 and keeps the normative decoder core independent from
image loading, camera handling, the DOM, and the demo UI.

Milestones M1 and M2 are complete and accepted. The library decodes ideal
Gray8, RGB8, and RGBA8 raster symbols at right-angle rotations, both
polarities, and translated positions through the complete normative pipeline.
Local PNG and JPEG adapters are available for browsers and Node.js. Arbitrary
rotation, perspective and degraded camera images are the scope of M3.
Product scope, release gates, and milestone evidence are defined in:

- `docs/PRODUKTSPEZIFIKATION.md`
- `docs/AKZEPTANZKRITERIEN.md`
- `docs/M1_AKZEPTANZBERICHT.md`
- `docs/M2_AKZEPTANZBERICHT.md`
- `docs/M2_PLAN.md`
- `docs/THIRD_PARTY_NOTICES.md`

Run the current core tests with:

```sh
npm test
```

The package is intentionally marked `UNLICENSED` and private until the project
license and third-party provenance review are complete.
