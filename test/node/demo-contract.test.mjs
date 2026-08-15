import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("browser demo exposes the complete accessible M4.1 control surface", async () => {
  const html = await read("index.html");
  for (const id of [
    "fileInput",
    "fileButton",
    "pasteButton",
    "cameraButton",
    "clearButton",
    "copyButton",
    "dropzone",
    "cameraVideo",
    "statusMessage",
    "resultContent",
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`), id);
  }
  assert.match(html, /aria-live=["']polite["']/);
  assert.match(html, /accept=["']image\/png,image\/jpeg["']/);
  assert.match(html, /connect-src 'none'/);
});

test("browser demo keeps image processing local and behind public library exports", async () => {
  const [app, worker] = await Promise.all([
    read("src/demo/app.js"),
    read("src/demo/scan-worker.js"),
  ]);
  assert.match(app, /from "\.\.\/adapters\/browser\.js"/);
  assert.match(app, /from "\.\.\/index\.js"/);
  assert.match(worker, /from "\.\.\/index\.js"/);
  for (const source of [app, worker]) {
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/);
  }
});

test("camera lifecycle stops tracks and successful scans freeze a frame", async () => {
  const app = await read("src/demo/app.js");
  assert.match(app, /for \(const track of state\.stream\.getTracks\(\)\) track\.stop\(\)/);
  assert.match(app, /copyCameraFrame\(\)/);
  assert.match(app, /setMedia\("frame"\)/);
  assert.match(app, /window\.addEventListener\("pagehide"/);
  assert.match(app, /new Worker\([\s\S]*type: "module"/);
});
