import { readFileSync, writeFileSync } from 'node:fs';

// Stage 4 - assign every conversation to markers by nearest centroid.
//
// Deterministic, no network, no model calls: pure cosine similarity against the
// eight centroids frozen in scripts/markers.json.
//
//   node scripts/4-classify.mjs
//
// FLOOR   a conversation whose best marker scores below this is left untagged.
//         0.25 cuts roughly the bottom decile - conversations whose closest
//         marker is barely better than noise. Untagged is a real answer, and it
//         matters: N counts only tagged conversations.
//
// MARGIN  a conversation also carries any marker scoring within 85% of its best
//         one, capped at three. Topics here genuinely overlap - hiring a design
//         engineer for an AI product is three markers at once - so forcing a
//         single label would be a lie about the data.

const FLOOR = 0.25;
const MARGIN = 0.85;
const MAX_LABELS = 3;
const OPENING_CHARS = 240;
const OUT = 'src/field-map/field-map-data.json';
const DIM = 384;

const markers = JSON.parse(readFileSync('scripts/markers.json', 'utf8'));
const docs = JSON.parse(readFileSync('scripts/.cache/normalized.json', 'utf8'));
const buf = readFileSync('scripts/.cache/embeddings.f32');
const X = new Float32Array(buf.buffer, buf.byteOffset, docs.length * DIM);
const cents = markers.map((m) => Float64Array.from(m.centroid));

const conversations = docs.map((d, i) => {
  const r = X.subarray(i * DIM, (i + 1) * DIM);
  const sims = cents.map((c) => { let s = 0; for (let k = 0; k < DIM; k++) s += r[k] * c[k]; return s; });
  const top = Math.max(...sims);

  const topicIds = top < FLOOR
    ? []
    : sims
        .map((s, m) => [s, m])
        .filter(([s]) => s >= MARGIN * top)
        .sort((a, b) => b[0] - a[0])
        .slice(0, MAX_LABELS)
        .map(([, m]) => markers[m].id);

  return {
    id: d.id,
    title: d.title,
    date: d.created,
    topicIds,
    messages: d.messages,
    model: d.model,
    opening: d.opening.slice(0, OPENING_CHARS),
  };
});

const payload = {
  topics: markers.map((m) => ({ id: m.id, label: m.label })),
  conversations,
};

// Same invariant loadFieldMapData enforces: no conversation may cite a topic
// the file does not declare.
const declared = new Set(payload.topics.map((t) => t.id));
const undeclared = [...new Set(conversations.flatMap((c) => c.topicIds))].filter((id) => !declared.has(id));
if (undeclared.length) { console.error(`undeclared topic ids: ${undeclared.join(', ')}`); process.exit(1); }

writeFileSync(OUT, `${JSON.stringify(payload)}\n`);

// --- report ---
const tagged = conversations.filter((c) => c.topicIds.length > 0);
const counts = Object.fromEntries(markers.map((m) => [m.id, 0]));
for (const c of tagged) for (const id of c.topicIds) counts[id]++;

console.log(`${conversations.length} conversations -> ${OUT}`);
console.log(`  tagged (N): ${tagged.length}   untagged: ${conversations.length - tagged.length}`);
console.log(`  labels per tagged conversation: ${(tagged.reduce((s, c) => s + c.topicIds.length, 0) / tagged.length).toFixed(2)}\n`);

for (const m of [...markers].sort((a, b) => counts[b.id] - counts[a.id])) {
  const n = counts[m.id];
  console.log(`  ${m.label.padEnd(24)} ${String(n).padStart(4)}  ${'#'.repeat(Math.round(n / 6))}`);
}

const pairs = [];
for (let i = 0; i < markers.length; i++) {
  for (let j = i + 1; j < markers.length; j++) {
    const a = markers[i].id, b = markers[j].id;
    const observed = tagged.filter((c) => c.topicIds.includes(a) && c.topicIds.includes(b)).length;
    pairs.push([observed, (counts[a] * counts[b]) / tagged.length, markers[i].label, markers[j].label]);
  }
}
const zeros = pairs.filter(([o]) => o === 0).sort((x, y) => y[1] - x[1]);
console.log(`\n  pairs that never co-occur: ${zeros.length} of ${pairs.length}`);
for (const [, e, a, b] of zeros.slice(0, 5)) {
  console.log(`    ${a} x ${b} - expected ${e.toFixed(1)}${e >= 5 ? '  FLAG' : ''}`);
}
