import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  loadLocalEmbedder,
} from './local-embeddings.mjs';
import {
  applyManifestOverrides,
  buildRetrievalCandidates,
  buildSeedQueryEmbedding,
  rankResearchChunks,
} from './research-retrieval.mjs';

const corpusFile = resolve(
  process.argv[2] ?? 'scripts/.cache/research-corpus.json',
);
const chunksFile = resolve(
  process.argv[3] ?? 'scripts/.cache/research-chunks.json',
);
const embeddingsFile = resolve(
  process.argv[4] ?? 'scripts/.cache/research-chunk-embeddings.f32',
);
const manifestFile = resolve(
  process.argv[5] ?? 'research/private/ai-native-design-engineering-ground-truth.json',
);
const outputFile = resolve(
  process.argv[6] ?? 'research/private/ai-native-design-engineering-retrieval.json',
);

const corpus = JSON.parse(readFileSync(corpusFile, 'utf8'));
const chunks = JSON.parse(readFileSync(chunksFile, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const embeddingBuffer = readFileSync(embeddingsFile);
const embeddings = new Float32Array(
  embeddingBuffer.buffer,
  embeddingBuffer.byteOffset,
  embeddingBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT,
);

const ideaText = `${manifest.idea.title}\n${manifest.idea.scope}`;
const embedTexts = await loadLocalEmbedder();
const ideaEmbedding = await embedTexts([ideaText]);
const queryEmbedding = buildSeedQueryEmbedding({
  seedConversationId: manifest.seedConversationId,
  chunks,
  embeddings,
  ideaEmbedding,
  dimension: EMBEDDING_DIMENSION,
});
const matches = rankResearchChunks({
  chunks,
  embeddings,
  queryEmbedding,
  dimension: EMBEDDING_DIMENSION,
  limit: 200,
});
const retrievedCandidates = buildRetrievalCandidates({
  matches,
  corpus,
  contextRadius: 2,
}).slice(0, 25);
const candidates = applyManifestOverrides({
  candidates: retrievedCandidates,
  manifest,
  corpus,
});

const payload = {
  schemaVersion: 1,
  ideaId: manifest.id,
  model: EMBEDDING_MODEL,
  query: {
    type: 'idea-and-seed-conversation',
    seedConversationId: manifest.seedConversationId,
    text: ideaText,
  },
  candidates,
};

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`);

console.log(`${candidates.length} reviewed candidates -> ${outputFile}`);
console.log(
  `  ${candidates.filter((candidate) => candidate.reviewStatus === 'included').length} included`,
);
console.log(
  `  ${candidates.filter((candidate) => candidate.reviewStatus === 'candidate').length} candidates`,
);
console.log(
  `  ${candidates.filter((candidate) => candidate.reviewStatus === 'excluded').length} excluded`,
);
