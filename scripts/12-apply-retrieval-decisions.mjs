import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { applyRetrievalDecisions } from './retrieval-decisions.mjs';

const reviewArgument = process.argv[2];
if (!reviewArgument) {
  throw new Error(
    'Usage: npm run data:apply-retrieval-decisions -- <decisions.json>',
  );
}

const reviewFile = resolve(reviewArgument);
const retrievalFile = resolve(
  process.argv[3] ?? 'research/private/vintage-shopping-retrieval.json',
);
const retrieval = JSON.parse(readFileSync(retrievalFile, 'utf8'));
const review = JSON.parse(readFileSync(reviewFile, 'utf8'));
const reviewedRetrieval = applyRetrievalDecisions({ retrieval, review });
const archivedReviewFile = resolve(
  dirname(retrievalFile),
  `${retrieval.ideaId}-retrieval-decisions.json`,
);

mkdirSync(dirname(retrievalFile), { recursive: true });
writeFileSync(
  retrievalFile,
  `${JSON.stringify(reviewedRetrieval, null, 2)}\n`,
);
writeFileSync(archivedReviewFile, `${JSON.stringify(review, null, 2)}\n`);

const included = reviewedRetrieval.candidates.filter(
  (candidate) => candidate.reviewStatus === 'included',
).length;
const excluded = reviewedRetrieval.candidates.length - included;

console.log(`${reviewedRetrieval.candidates.length} decisions applied`);
console.log(`  ${included} included`);
console.log(`  ${excluded} excluded`);
console.log(`  reviewed retrieval -> ${retrievalFile}`);
console.log(`  archived decisions -> ${archivedReviewFile}`);
