import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateArchaeologyReport } from './archaeology-report.mjs';

const reportFile = resolve(
  process.argv[2] ?? 'research/private/ai-native-design-engineering-report.json',
);
const corpusFile = resolve(
  process.argv[3] ?? 'scripts/.cache/research-corpus.json',
);
const retrievalFile = resolve(
  process.argv[4] ?? 'research/private/ai-native-design-engineering-retrieval.json',
);

const report = JSON.parse(readFileSync(reportFile, 'utf8'));
const corpus = JSON.parse(readFileSync(corpusFile, 'utf8'));
const retrieval = JSON.parse(readFileSync(retrievalFile, 'utf8'));
const validation = validateArchaeologyReport({ report, retrieval, corpus });

if (!validation.valid) {
  console.error(validation.errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Valid archaeology report: ${report.idea.id}`);
  console.log(`  ${report.sources.length} reviewed sources`);
  console.log(
    `  ${report.findings.length + report.decisions.length + report.rejectedDirections.length + report.openQuestions.length + 1} evidence-backed conclusions`,
  );
}
