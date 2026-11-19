import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  buildArchaeologyReport,
  validateArchaeologyReport,
} from './archaeology-report.mjs';

const corpusFile = resolve(
  process.argv[2] ?? 'scripts/.cache/research-corpus.json',
);
const manifestFile = resolve(
  process.argv[3] ?? 'research/private/ai-native-design-engineering-ground-truth.json',
);
const retrievalFile = resolve(
  process.argv[4] ?? 'research/private/ai-native-design-engineering-retrieval.json',
);
const outputFile = resolve(
  process.argv[5] ?? 'research/private/ai-native-design-engineering-report.json',
);

const corpus = JSON.parse(readFileSync(corpusFile, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const retrieval = JSON.parse(readFileSync(retrievalFile, 'utf8'));
const report = buildArchaeologyReport({ manifest, retrieval, corpus });
const validation = validateArchaeologyReport({ report, retrieval, corpus });

if (!validation.valid) {
  throw new Error(`Invalid archaeology report:\n${validation.errors.join('\n')}`);
}

mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Valid archaeology report -> ${outputFile}`);
console.log(`  ${report.sources.length} reviewed sources`);
console.log(`  ${report.findings.length} findings`);
console.log(`  ${report.decisions.length} decisions`);
console.log(`  ${report.rejectedDirections.length} rejected directions`);
console.log(`  ${report.openQuestions.length} open questions`);
console.log(`  ${report.timeline.length} timeline events`);
