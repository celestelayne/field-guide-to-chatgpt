import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeGroundTruthReview } from './ground-truth-review.mjs';

const manifestFile = resolve(
  process.argv[2] ?? 'research/private/vintage-shopping-ground-truth.json',
);
const corpusFile = resolve(
  process.argv[3] ?? 'scripts/.cache/research-corpus.json',
);
const outputFile = resolve(
  process.argv[4] ?? 'research/private/vintage-shopping-review.html',
);

const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const corpus = JSON.parse(readFileSync(corpusFile, 'utf8'));
const counts = writeGroundTruthReview({ manifest, corpus, outputFile });

console.log(`${counts.conclusions} conclusions -> ${outputFile}`);
console.log(`  ${counts.evidence} verbatim evidence excerpts`);
