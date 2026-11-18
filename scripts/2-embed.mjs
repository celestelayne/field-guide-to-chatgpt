import { readFileSync, writeFileSync } from 'node:fs';

// Stage 2 - local sentence embeddings for each conversation.
//
// This is the only stage with a heavy dependency (~284MB with onnxruntime), so
// it is deliberately NOT in package.json. Install it once, here or globally:
//
//   npm i --no-save @xenova/transformers
//   node scripts/2-embed.mjs
//
// Nothing leaves this machine except the one-time model download. Your
// conversations are never sent to an embedding API.

const IN = 'scripts/.cache/normalized.json';
const OUT = 'scripts/.cache/embeddings.f32';
const DIM = 384;

let pipeline, env;
try {
  ({ pipeline, env } = await import('@xenova/transformers'));
} catch {
  console.error('Missing @xenova/transformers.\n\n  npm i --no-save @xenova/transformers\n');
  process.exit(1);
}
env.allowLocalModels = false;

const docs = JSON.parse(readFileSync(IN, 'utf8'));
const texts = docs.map((d) => `${d.title}. ${d.opening}`.replace(/\s+/g, ' ').slice(0, 900));

console.log(`embedding ${texts.length} conversations with all-MiniLM-L6-v2 ...`);
const extract = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const vecs = new Float32Array(texts.length * DIM);
const t0 = Date.now();
const BATCH = 32;
for (let i = 0; i < texts.length; i += BATCH) {
  const batch = texts.slice(i, i + BATCH);
  const res = await extract(batch, { pooling: 'mean', normalize: true });
  for (let b = 0; b < batch.length; b++) {
    vecs.set(res.data.slice(b * DIM, (b + 1) * DIM), (i + b) * DIM);
  }
  process.stdout.write(`  ${Math.min(i + BATCH, texts.length)}/${texts.length}\r`);
}

writeFileSync(OUT, Buffer.from(vecs.buffer));
console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${OUT} (${texts.length} x ${DIM})`);
