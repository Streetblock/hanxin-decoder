import { decodeImage } from "../index.js";

self.addEventListener("message", async (event) => {
  const { id, raster, options } = event.data ?? {};
  if (!Number.isSafeInteger(id) || raster === undefined) return;

  try {
    const image = {
      width: raster.width,
      height: raster.height,
      data: new Uint8ClampedArray(raster.buffer),
    };
    const result = await decodeImage(image, options);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id,
      error: {
        name: error?.name ?? "Error",
        message: error?.message ?? String(error),
      },
    });
  }
});
