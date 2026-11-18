import { resolve } from 'node:path';
import { writeResearchCorpus } from './research-corpus.mjs';

const exportDirectory = resolve(
  process.argv[2] ?? 'src/data/07312026-chatgpt-data-export',
);
const outputFile = resolve(
  process.argv[3] ?? 'scripts/.cache/research-corpus.json',
);

const counts = writeResearchCorpus({ exportDirectory, outputFile });

console.log(`${counts.conversations} conversations -> ${outputFile}`);
console.log(`  ${counts.messages} messages`);
console.log(`  ${counts.nodes} graph nodes`);
