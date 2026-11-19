import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  loadLocalEmbedder,
} from './local-embeddings.mjs';

const chunksFile = resolve(
  process.argv[2] ?? 'scripts/.cache/research-chunks.json',
);
const outputFile = resolve(
  process.argv[3] ?? 'scripts/.cache/research-chunk-embeddings.f32',
);

const chunks = JSON.parse(readFileSync(chunksFile, 'utf8'));
const texts = chunks.map(
  (chunk) =>
    `${chunk.conversationTitle}\n${chunk.role}: ${chunk.text}`,
);

console.log(`embedding ${chunks.length} message chunks with ${EMBEDDING_MODEL} ...`);
const embedTexts = await loadLocalEmbedder();
const startedAt = Date.now();
const embeddings = await embedTexts(texts, {
  onProgress: (completed, total) =>
    process.stdout.write(`  ${completed}/${total}\r`),
});

writeFileSync(outputFile, Buffer.from(embeddings.buffer));
console.log(
  `\ndone in ${((Date.now() - startedAt) / 1000).toFixed(0)}s -> ${outputFile} (${chunks.length} x ${EMBEDDING_DIMENSION})`,
);
