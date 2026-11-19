import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateGroundTruthManifest } from './ground-truth-manifest.mjs';

const manifestFile = resolve(
  process.argv[2] ?? 'research/private/vintage-shopping-ground-truth.json',
);
const corpusFile = resolve(
  process.argv[3] ?? 'scripts/.cache/research-corpus.json',
);

const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const corpus = JSON.parse(readFileSync(corpusFile, 'utf8'));
const result = validateGroundTruthManifest(manifest, corpus);

if (!result.valid) {
  for (const error of result.errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Valid ${manifest.status} manifest: ${manifest.id}`);
  console.log(`  ${manifest.includedConversations.length} included conversation`);
  console.log(`  ${manifest.excludedConversations.length} excluded conversations`);
  console.log(`  ${manifest.relevantMessages.length} relevant messages`);
}
