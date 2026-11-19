import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeRetrievalReview } from './research-retrieval-review.mjs';

const retrievalFile = resolve(
  process.argv[2] ?? 'research/private/vintage-shopping-retrieval.json',
);
const outputFile = resolve(
  process.argv[3] ?? 'research/private/vintage-shopping-retrieval-review.html',
);

const retrieval = JSON.parse(readFileSync(retrievalFile, 'utf8'));
const counts = writeRetrievalReview({ retrieval, outputFile });

console.log(`${counts.candidates} retrieval candidates -> ${outputFile}`);
