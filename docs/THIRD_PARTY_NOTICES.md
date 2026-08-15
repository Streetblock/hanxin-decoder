# Third-party dependencies

Stand: 2026-08-16

The runtime library remains dependency-free for its main, `./core`,
`./decoder`, `./vision`, and `./browser` exports. The following dependencies
are imported only by the explicit Node adapter export `./node`.

| Package | Version | License | Runtime dependencies | Purpose |
| --- | ---: | --- | ---: | --- |
| [pngjs](https://www.npmjs.com/package/pngjs) | 7.0.0 | MIT | 0 | Synchronous PNG-to-RGBA decoding |
| [jpeg-js](https://www.npmjs.com/package/jpeg-js) | 0.4.4 | BSD-3-Clause | 0 | Synchronous JPEG-to-RGBA decoding |

Both versions are pinned exactly in `package.json` and `package-lock.json`.
Their complete license texts are distributed by npm inside the respective
package directories. Redistribution of a future packaged application must
retain the notices required by those licenses.
