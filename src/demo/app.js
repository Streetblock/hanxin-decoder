import { rasterFromBrowserBlob } from "../adapters/browser.js";
import { decodeImage } from "../index.js";

const elements = Object.freeze({
  cameraButton: document.getElementById("cameraButton"),
  cameraButtonLabel: document.getElementById("cameraButtonLabel"),
  cameraVideo: document.getElementById("cameraVideo"),
  captureCanvas: document.getElementById("captureCanvas"),
  clearButton: document.getElementById("clearButton"),
  copyButton: document.getElementById("copyButton"),
  correctedValue: document.getElementById("correctedValue"),
  decodedText: document.getElementById("decodedText"),
  dropzone: document.getElementById("dropzone"),
  emptyState: document.getElementById("emptyState"),
  fileButton: document.getElementById("fileButton"),
  fileInput: document.getElementById("fileInput"),
  framePreview: document.getElementById("framePreview"),
  imagePreview: document.getElementById("imagePreview"),
  levelValue: document.getElementById("levelValue"),
  maskValue: document.getElementById("maskValue"),
  pasteButton: document.getElementById("pasteButton"),
  polarityValue: document.getElementById("polarityValue"),
  resultContent: document.getElementById("resultContent"),
  resultEmpty: document.getElementById("resultEmpty"),
  rotationValue: document.getElementById("rotationValue"),
  scanOverlay: document.getElementById("scanOverlay"),
  segmentsValue: document.getElementById("segmentsValue"),
  sourceMeta: document.getElementById("sourceMeta"),
  statusBadge: document.getElementById("statusBadge"),
  statusMessage: document.getElementById("statusMessage"),
  symbologyValue: document.getElementById("symbologyValue"),
  versionValue: document.getElementById("versionValue"),
  bytesValue: document.getElementById("bytesValue"),
  workerState: document.getElementById("workerState"),
});

const captureContext = elements.captureCanvas.getContext("2d", { willReadFrequently: true });
const frameContext = elements.framePreview.getContext("2d");

const state = {
  stream: null,
  cameraTimer: null,
  cameraActive: false,
  cameraStarting: false,
  processing: false,
  generation: 0,
  imageUrl: null,
  successfulResult: null,
  sourceKind: "idle",
};

let decoderWorker;
let workerUnavailable = false;
let workerSequence = 0;
let pendingWorkerRequest;

function setStatus(status, badge, message) {
  elements.statusBadge.dataset.state = status;
  elements.statusBadge.textContent = badge;
  elements.statusMessage.textContent = message;
}

function setBusy(busy) {
  elements.scanOverlay.hidden = !busy;
  elements.fileButton.disabled = busy;
  elements.pasteButton.disabled = busy;
}

function setMedia(kind) {
  elements.emptyState.hidden = kind !== "idle";
  elements.imagePreview.hidden = kind !== "image";
  elements.cameraVideo.hidden = kind !== "camera";
  elements.framePreview.hidden = kind !== "frame";
  elements.dropzone.classList.toggle("has-media", kind !== "idle");
  state.sourceKind = kind;
}

function revokeImageUrl() {
  if (state.imageUrl !== null) {
    URL.revokeObjectURL(state.imageUrl);
    state.imageUrl = null;
  }
  elements.imagePreview.removeAttribute("src");
}

function cancelPendingDecode() {
  if (pendingWorkerRequest !== undefined) {
    pendingWorkerRequest.reject(new DOMException("Decode cancelled", "AbortError"));
    pendingWorkerRequest = undefined;
  }
  if (decoderWorker !== undefined) {
    decoderWorker.terminate();
    decoderWorker = undefined;
  }
}

function ensureWorker() {
  if (typeof Worker !== "function" || workerUnavailable) return undefined;
  if (decoderWorker !== undefined) return decoderWorker;

  try {
    decoderWorker = new Worker(new URL("./scan-worker.js", import.meta.url), { type: "module" });
  } catch {
    workerUnavailable = true;
    elements.workerState.textContent = "Direkter Modus";
    return undefined;
  }
  decoderWorker.addEventListener("message", (event) => {
    if (pendingWorkerRequest === undefined || event.data?.id !== pendingWorkerRequest.id) return;
    const pending = pendingWorkerRequest;
    pendingWorkerRequest = undefined;
    if (event.data.error) {
      pending.reject(new Error(event.data.error.message));
    } else {
      pending.resolve(event.data.result);
    }
  });
  decoderWorker.addEventListener("error", (event) => {
    if (pendingWorkerRequest !== undefined) {
      pendingWorkerRequest.reject(new Error(event.message || "Decoder-Worker fehlgeschlagen"));
      pendingWorkerRequest = undefined;
    }
    decoderWorker?.terminate();
    decoderWorker = undefined;
    workerUnavailable = true;
    elements.workerState.textContent = "Direkter Modus";
  });
  elements.workerState.textContent = "Worker aktiv";
  return decoderWorker;
}

async function decodeRaster(raster, options) {
  const worker = ensureWorker();
  if (worker === undefined) {
    elements.workerState.textContent = "Direkter Modus";
    return decodeImage(raster, options);
  }
  if (pendingWorkerRequest !== undefined) {
    throw new Error("Es läuft bereits eine Dekodierung");
  }

  const id = ++workerSequence;
  const buffer = raster.data.buffer.slice(
    raster.data.byteOffset,
    raster.data.byteOffset + raster.data.byteLength,
  );
  const pending = new Promise((resolve, reject) => {
    pendingWorkerRequest = { id, resolve, reject };
  });
  worker.postMessage(
    { id, raster: { width: raster.width, height: raster.height, buffer }, options },
    [buffer],
  );
  return pending;
}

function formatBytes(bytes) {
  if (!bytes?.length) return "–";
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0").toUpperCase())
    .join(" ");
}

function formatSegments(segments) {
  if (!segments?.length) return "–";
  return segments.map((segment) => segment.mode).join(" · ");
}

function readablePayload(result) {
  if (result.text !== undefined) return result.text;
  return formatBytes(result.bytes);
}

function renderSuccess(result, sourceMessage) {
  state.successfulResult = result;
  elements.resultEmpty.hidden = true;
  elements.resultContent.hidden = false;
  elements.decodedText.textContent = readablePayload(result);
  elements.versionValue.textContent = String(result.version);
  elements.levelValue.textContent = result.errorLevel;
  elements.maskValue.textContent = String(result.mask);
  elements.rotationValue.textContent = `${result.rotationDegrees}°`;
  elements.polarityValue.textContent = result.polarity === "inverted" ? "Invertiert" : "Normal";
  elements.correctedValue.textContent = `${result.correctedCodewords ?? 0} CW`;
  elements.symbologyValue.textContent = result.symbologyIdentifier;
  elements.segmentsValue.textContent = formatSegments(result.segments);
  elements.bytesValue.textContent = formatBytes(result.bytes);
  setStatus("success", "Gelesen", sourceMessage);
  setBusy(false);
  elements.clearButton.disabled = false;
}

function renderFailure(result, source) {
  state.successfulResult = null;
  elements.resultContent.hidden = true;
  elements.resultEmpty.hidden = false;
  const detail = result?.code === "TIMEOUT"
    ? "Die Prüfung hat das Zeitlimit erreicht."
    : "Kein vollständig gültiger Han-Xin-Code erkannt.";
  setStatus("error", "Nicht erkannt", `${detail} ${source}`);
  setBusy(false);
  elements.clearButton.disabled = false;
}

function stopCamera({ preserveStatus = false } = {}) {
  state.generation += 1;
  if (state.cameraTimer !== null) {
    window.clearTimeout(state.cameraTimer);
    state.cameraTimer = null;
  }
  if (state.stream !== null) {
    for (const track of state.stream.getTracks()) track.stop();
  }
  state.stream = null;
  state.cameraActive = false;
  state.processing = false;
  elements.cameraVideo.pause();
  elements.cameraVideo.srcObject = null;
  elements.cameraButtonLabel.textContent = "Kamera starten";
  document.body.classList.remove("is-camera-active");
  if (!preserveStatus && state.sourceKind === "camera") {
    setStatus("idle", "Gestoppt", "Die Kamera wurde gestoppt.");
  }
}

function resetResult() {
  state.successfulResult = null;
  elements.resultContent.hidden = true;
  elements.resultEmpty.hidden = false;
  elements.decodedText.textContent = "";
}

function clearAll() {
  state.generation += 1;
  stopCamera({ preserveStatus: true });
  cancelPendingDecode();
  revokeImageUrl();
  resetResult();
  setMedia("idle");
  setBusy(false);
  elements.fileInput.value = "";
  elements.sourceMeta.textContent = "Noch kein Bild";
  elements.clearButton.disabled = true;
  setStatus("idle", "Bereit", "Öffnen Sie ein Bild oder starten Sie die Kamera.");
}

function validImageBlob(blob) {
  return blob instanceof Blob && ["image/png", "image/jpeg"].includes(blob.type);
}

async function loadBlob(blob, sourceName = "Lokales Bild") {
  if (!validImageBlob(blob)) {
    setStatus("error", "Dateiformat", "Bitte verwenden Sie eine PNG- oder JPEG-Datei.");
    return;
  }

  stopCamera({ preserveStatus: true });
  cancelPendingDecode();
  const generation = ++state.generation;
  revokeImageUrl();
  resetResult();
  state.imageUrl = URL.createObjectURL(blob);
  elements.imagePreview.src = state.imageUrl;
  elements.imagePreview.alt = `Zu prüfendes Bild: ${sourceName}`;
  setMedia("image");
  elements.sourceMeta.textContent = sourceName;
  elements.clearButton.disabled = false;
  setBusy(true);
  setStatus("scanning", "Prüfung", "Das Bild wird lokal und vollständig validiert.");

  try {
    const raster = await rasterFromBrowserBlob(blob, { maxPixels: 4096 ** 2, timeoutMs: 1_000 });
    if (generation !== state.generation) return;
    elements.sourceMeta.textContent = `${sourceName} · ${raster.width} × ${raster.height}`;
    const result = await decodeRaster(raster, {
      effort: "balanced",
      diagnostics: "basic",
      timeoutMs: 700,
      maxPixels: 4096 ** 2,
    });
    if (generation !== state.generation) return;
    if (result.ok) {
      renderSuccess(result, "Datei lokal dekodiert. Es wurden keine Daten übertragen.");
    } else {
      renderFailure(result, "Versuchen Sie ein schärferes, frontal ausgerichtetes Bild.");
    }
  } catch (error) {
    if (generation !== state.generation || error?.name === "AbortError") return;
    renderFailure({ code: "UNSUPPORTED_INPUT" }, error?.message ?? "Das Bild konnte nicht gelesen werden.");
  }
}

function copyCameraFrame() {
  const width = elements.captureCanvas.width;
  const height = elements.captureCanvas.height;
  elements.framePreview.width = width;
  elements.framePreview.height = height;
  frameContext.drawImage(elements.captureCanvas, 0, 0, width, height);
}

function scheduleCameraScan(generation, delay = 420) {
  if (!state.cameraActive || generation !== state.generation) return;
  state.cameraTimer = window.setTimeout(() => scanCameraFrame(generation), delay);
}

async function scanCameraFrame(generation) {
  if (
    !state.cameraActive
    || state.processing
    || generation !== state.generation
    || elements.cameraVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
  ) {
    scheduleCameraScan(generation);
    return;
  }

  state.processing = true;
  const width = elements.cameraVideo.videoWidth;
  const height = elements.cameraVideo.videoHeight;
  const scale = Math.min(1, 960 / Math.max(width, height));
  elements.captureCanvas.width = Math.max(1, Math.round(width * scale));
  elements.captureCanvas.height = Math.max(1, Math.round(height * scale));
  captureContext.drawImage(
    elements.cameraVideo,
    0,
    0,
    elements.captureCanvas.width,
    elements.captureCanvas.height,
  );

  const imageData = captureContext.getImageData(
    0,
    0,
    elements.captureCanvas.width,
    elements.captureCanvas.height,
  );

  try {
    const result = await decodeRaster(
      { width: imageData.width, height: imageData.height, data: imageData.data },
      { effort: "fast", diagnostics: "basic", timeoutMs: 300, maxPixels: 1_000_000 },
    );
    if (!state.cameraActive || generation !== state.generation) return;
    if (result.ok) {
      copyCameraFrame();
      setMedia("frame");
      stopCamera({ preserveStatus: true });
      renderSuccess(result, "Live-Code gelesen. Das erfolgreiche Bild wurde eingefroren.");
      elements.cameraButtonLabel.textContent = "Erneut scannen";
      return;
    }
    setStatus("scanning", "Kamera live", "Code vollständig und möglichst gerade im Rahmen halten.");
  } catch (error) {
    if (generation !== state.generation || error?.name === "AbortError") return;
    setStatus("error", "Kamerafehler", error?.message ?? "Das Kamerabild konnte nicht geprüft werden.");
  } finally {
    state.processing = false;
  }
  scheduleCameraScan(generation);
}

async function startCamera() {
  if (state.cameraStarting) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("error", "Nicht verfügbar", "Dieser Browser stellt keine Kamera-Schnittstelle bereit.");
    return;
  }

  stopCamera({ preserveStatus: true });
  cancelPendingDecode();
  revokeImageUrl();
  resetResult();
  state.cameraStarting = true;
  elements.cameraButton.disabled = true;
  elements.clearButton.disabled = false;
  const generation = state.generation;
  setBusy(true);
  setStatus("scanning", "Freigabe", "Kamerazugriff wird angefragt …");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
    if (generation !== state.generation) {
      for (const track of stream.getTracks()) track.stop();
      return;
    }
    state.stream = stream;
    state.cameraActive = true;
    elements.cameraVideo.srcObject = stream;
    setMedia("camera");
    await elements.cameraVideo.play();
    elements.sourceMeta.textContent = `${elements.cameraVideo.videoWidth} × ${elements.cameraVideo.videoHeight} · Live`;
    elements.cameraButtonLabel.textContent = "Kamera stoppen";
    elements.clearButton.disabled = false;
    document.body.classList.add("is-camera-active");
    setBusy(false);
    setStatus("scanning", "Kamera live", "Code vollständig und möglichst gerade im Rahmen halten.");
    scheduleCameraScan(generation, 80);
  } catch (error) {
    if (generation !== state.generation) return;
    stopCamera({ preserveStatus: true });
    setBusy(false);
    setMedia("idle");
    setStatus(
      "error",
      "Kamera blockiert",
      error?.name === "NotAllowedError"
        ? "Der Kamerazugriff wurde nicht freigegeben."
        : "Die Kamera konnte nicht gestartet werden.",
    );
  } finally {
    state.cameraStarting = false;
    elements.cameraButton.disabled = false;
  }
}

async function readClipboard() {
  if (!navigator.clipboard?.read) {
    setStatus("idle", "Einfügen", "Drücken Sie Strg+V, um ein kopiertes Bild einzufügen.");
    return;
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((candidate) => ["image/png", "image/jpeg"].includes(candidate));
      if (type !== undefined) {
        await loadBlob(await item.getType(type), "Zwischenablage");
        return;
      }
    }
    setStatus("error", "Kein Bild", "Die Zwischenablage enthält kein PNG- oder JPEG-Bild.");
  } catch {
    setStatus("idle", "Einfügen", "Zwischenablage blockiert. Verwenden Sie stattdessen Strg+V.");
  }
}

async function copyResult() {
  if (state.successfulResult === null) return;
  try {
    await navigator.clipboard.writeText(readablePayload(state.successfulResult));
    setStatus("success", "Kopiert", "Der dekodierte Inhalt wurde kopiert.");
  } catch {
    setStatus("error", "Nicht kopiert", "Der Browser hat den Zugriff auf die Zwischenablage blockiert.");
  }
}

function firstImageFile(files) {
  return Array.from(files ?? []).find((file) => validImageBlob(file));
}

elements.fileButton.addEventListener("click", () => elements.fileInput.click());
elements.fileInput.addEventListener("change", () => {
  const file = firstImageFile(elements.fileInput.files);
  if (file !== undefined) loadBlob(file, file.name);
});
elements.cameraButton.addEventListener("click", () => {
  if (state.cameraActive) {
    stopCamera();
    setMedia("idle");
    setBusy(false);
  } else {
    startCamera();
  }
});
elements.pasteButton.addEventListener("click", readClipboard);
elements.clearButton.addEventListener("click", clearAll);
elements.copyButton.addEventListener("click", copyResult);

elements.dropzone.addEventListener("click", () => {
  if (!state.cameraActive) elements.fileInput.click();
});
elements.dropzone.addEventListener("keydown", (event) => {
  if (!state.cameraActive && ["Enter", " "].includes(event.key)) {
    event.preventDefault();
    elements.fileInput.click();
  }
});

for (const type of ["dragenter", "dragover", "dragleave", "drop"]) {
  elements.dropzone.addEventListener(type, (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
}
elements.dropzone.addEventListener("dragenter", () => elements.dropzone.classList.add("is-dragging"));
elements.dropzone.addEventListener("dragover", () => elements.dropzone.classList.add("is-dragging"));
elements.dropzone.addEventListener("dragleave", () => elements.dropzone.classList.remove("is-dragging"));
elements.dropzone.addEventListener("drop", (event) => {
  elements.dropzone.classList.remove("is-dragging");
  const file = firstImageFile(event.dataTransfer?.files);
  if (file !== undefined) loadBlob(file, file.name);
  else setStatus("error", "Dateiformat", "Bitte legen Sie eine PNG- oder JPEG-Datei ab.");
});

document.addEventListener("paste", (event) => {
  const file = firstImageFile(Array.from(event.clipboardData?.items ?? [], (item) => item.getAsFile()).filter(Boolean));
  if (file !== undefined) loadBlob(file, "Zwischenablage");
});

window.addEventListener("pagehide", () => {
  stopCamera({ preserveStatus: true });
  cancelPendingDecode();
  revokeImageUrl();
});

clearAll();
ensureWorker();
