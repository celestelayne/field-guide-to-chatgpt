import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildResearchChunks } from './research-retrieval.mjs';

const corpusFile = resolve(
  process.argv[2] ?? 'scripts/.cache/research-corpus.json',
);
const outputFile = resolve(
  process.argv[3] ?? 'scripts/.cache/research-chunks.json',
);

const corpus = JSON.parse(readFileSync(corpusFile, 'utf8'));
const chunks = buildResearchChunks(corpus);

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(chunks)}\n`);

console.log(`${chunks.length} message chunks -> ${outputFile}`);
console.log(
  `  ${new Set(chunks.map((chunk) => chunk.messageId)).size} source messages`,
);
console.log(
  `  ${new Set(chunks.map((chunk) => chunk.conversationId)).size} conversations`,
);
