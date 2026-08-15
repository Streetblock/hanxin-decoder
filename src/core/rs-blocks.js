import { ReedSolomonCodec } from "./reed-solomon.js";
import { expandRsBlocks, rsBlockStructureFor } from "./rs-block-table.js";

const defaultCodec = new ReedSolomonCodec();
const PICKET_FENCE_STRIDE = 13;

function assertCodewordStream(name, codewords, expectedLength = undefined) {
  if (!(codewords instanceof Uint8Array)) {
    throw new TypeError(`${name} must be a Uint8Array`);
  }
  if (expectedLength !== undefined && codewords.length !== expectedLength) {
    throw new RangeError(
      `${name} must contain exactly ${expectedLength} codewords, got ${codewords.length}`,
    );
  }
}

// Section 5.7.3 orders C1, C14, C27, ... followed by C2, C15, C28, ... .
export function toPicketFenceOrder(blockSequentialCodewords) {
  assertCodewordStream("blockSequentialCodewords", blockSequentialCodewords);
  const ordered = new Uint8Array(blockSequentialCodewords.length);
  let output = 0;
  for (let start = 0; start < PICKET_FENCE_STRIDE; start += 1) {
    for (let index = start; index < blockSequentialCodewords.length; index += PICKET_FENCE_STRIDE) {
      ordered[output] = blockSequentialCodewords[index];
      output += 1;
    }
  }
  return ordered;
}

export function fromPicketFenceOrder(placedCodewords) {
  assertCodewordStream("placedCodewords", placedCodewords);
  const sequential = new Uint8Array(placedCodewords.length);
  let input = 0;
  for (let start = 0; start < PICKET_FENCE_STRIDE; start += 1) {
    for (let index = start; index < placedCodewords.length; index += PICKET_FENCE_STRIDE) {
      sequential[index] = placedCodewords[input];
      input += 1;
    }
  }
  return sequential;
}

export function splitRsBlocks(blockSequentialCodewords, version, errorCorrectionLevel) {
  const structure = rsBlockStructureFor(version, errorCorrectionLevel);
  assertCodewordStream(
    "blockSequentialCodewords",
    blockSequentialCodewords,
    structure.totalCodewords,
  );

  const descriptors = expandRsBlocks(version, errorCorrectionLevel);
  let offset = 0;
  const blocks = descriptors.map((descriptor, index) => {
    const codewords = blockSequentialCodewords.slice(
      offset,
      offset + descriptor.totalCodewords,
    );
    const block = Object.freeze({
      ...descriptor,
      index,
      codewords,
    });
    offset += descriptor.totalCodewords;
    return block;
  });
  return Object.freeze(blocks);
}

export function joinRsBlocks(blocks, version, errorCorrectionLevel) {
  if (!Array.isArray(blocks)) throw new TypeError("blocks must be an array");
  const structure = rsBlockStructureFor(version, errorCorrectionLevel);
  const descriptors = expandRsBlocks(version, errorCorrectionLevel);
  if (blocks.length !== descriptors.length) {
    throw new RangeError(`expected ${descriptors.length} RS blocks, got ${blocks.length}`);
  }

  const joined = new Uint8Array(structure.totalCodewords);
  let offset = 0;
  for (let index = 0; index < descriptors.length; index += 1) {
    const codewords = blocks[index]?.codewords;
    assertCodewordStream(
      `blocks[${index}].codewords`,
      codewords,
      descriptors[index].totalCodewords,
    );
    joined.set(codewords, offset);
    offset += codewords.length;
  }
  return joined;
}

export function correctRsBlocks(
  blockSequentialCodewords,
  version,
  errorCorrectionLevel,
  codec = defaultCodec,
) {
  if (!codec || typeof codec.decode !== "function") {
    throw new TypeError("codec must provide a decode method");
  }
  const structure = rsBlockStructureFor(version, errorCorrectionLevel);
  const receivedBlocks = splitRsBlocks(
    blockSequentialCodewords,
    version,
    errorCorrectionLevel,
  );
  const dataCodewords = new Uint8Array(structure.dataCodewords);
  const correctedCodewords = new Uint8Array(structure.totalCodewords);
  const correctedBlocks = [];
  let dataOffset = 0;
  let codewordOffset = 0;
  let correctedErrors = 0;

  for (const receivedBlock of receivedBlocks) {
    const decoded = codec.decode(
      receivedBlock.codewords,
      receivedBlock.correctionCodewords,
    );
    correctedErrors += decoded.correctedErrors;
    correctedCodewords.set(decoded.codewords, codewordOffset);
    dataCodewords.set(
      decoded.codewords.subarray(0, receivedBlock.dataCodewords),
      dataOffset,
    );
    correctedBlocks.push(Object.freeze({
      ...receivedBlock,
      codewords: decoded.codewords,
      correctedErrors: decoded.correctedErrors,
    }));
    codewordOffset += decoded.codewords.length;
    dataOffset += receivedBlock.dataCodewords;
  }

  return {
    dataCodewords,
    correctedCodewords,
    correctedErrors,
    blocks: Object.freeze(correctedBlocks),
  };
}

export function correctPicketFenceCodewords(
  placedCodewords,
  version,
  errorCorrectionLevel,
  codec = defaultCodec,
) {
  const structure = rsBlockStructureFor(version, errorCorrectionLevel);
  assertCodewordStream("placedCodewords", placedCodewords, structure.totalCodewords);
  const blockSequentialCodewords = fromPicketFenceOrder(placedCodewords);
  return {
    blockSequentialCodewords,
    ...correctRsBlocks(
      blockSequentialCodewords,
      version,
      errorCorrectionLevel,
      codec,
    ),
  };
}
