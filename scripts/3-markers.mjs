import { readFileSync, writeFileSync } from 'node:fs';

// Stage 3 - derive the marker taxonomy.
//
// Clusters the embeddings at k=10, discards the two clusters that are not
// topics (one is a single client project, one is a mixed residue), names the
// remaining eight from signature vocabulary, and writes their centroids.
//
// k=10 was chosen from a sweep: silhouette peaks locally at k=6 and steps up at
// k=10. k=6 is cleaner but hides Design, which is the largest single group once
// it separates. Nothing about the data forces a number - see NOTES.md.
//
//   node scripts/3-markers.mjs

const DIM = 384;
const docs = JSON.parse(readFileSync('scripts/.cache/normalized.json', 'utf8'));
const buf = readFileSync('scripts/.cache/embeddings.f32');
const X = new Float32Array(buf.buffer, buf.byteOffset, docs.length * DIM);
const N = docs.length;
const row = (i) => X.subarray(i * DIM, (i + 1) * DIM);
const dot = (a, b) => { let s = 0; for (let i = 0; i < DIM; i++) s += a[i] * b[i]; return s; };

const K = 10;
const SEEDS = [1, 7, 13, 29, 101];

// Clusters that are not topics. Dropping these is a judgement call, recorded
// here rather than buried: "bios" is one client, "duration" is course-admin
// residue mixed with strays. Their members get reassigned to the nearest marker.
const DROP = ['bios', 'duration'];

const MARKERS = [
  { id: 'design',   label: 'Design & Systems',      signature: ['design', 'figma', 'architecture', 'principles', 'styles', 'spec'] },
  { id: 'startup',  label: 'Startup & Investors',   signature: ['investor', 'investors', 'startups', 'funding', 'brand', 'beauty'] },
  { id: 'specs',    label: 'Product Specs',         signature: ['stories', 'epic', 'onboarding', 'requirements', 'dashboard'] },
  { id: 'career',   label: 'Career & Applications', signature: ['resume', 'cover', 'letter', 'applying', 'technologist', 'job'] },
  { id: 'teaching', label: 'Teaching & Critique',   signature: ['colloquium', 'jury', 'assignment', 'rationale', 'students', 'lecture'] },
  { id: 'ai',       label: 'AI & Agents',           signature: ['agent', 'agents', 'llm', 'prompt', 'rag', 'conversational'] },
  { id: 'personal', label: 'Personal & NYC',        signature: ['ues', 'dining', 'recipe', 'apartment', 'food', 'nyc'] },
  { id: 'code',     label: 'Code & Frontend',       signature: ['react', 'node', 'typescript', 'express', 'javascript', 'css'] },
];

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function kmeans(k, seed) {
  const rnd = mulberry32(seed);
  const picks = [Math.floor(rnd() * N)];
  while (picks.length < k) {
    const d2 = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      let best = -1;
      for (const p of picks) best = Math.max(best, dot(row(i), row(p)));
      const d = 1 - best; d2[i] = d * d;
    }
    let sum = 0; for (let i = 0; i < N; i++) sum += d2[i];
    let r = rnd() * (sum || 1), pick = 0;
    for (let i = 0; i < N; i++) { r -= d2[i]; if (r <= 0) { pick = i; break; } }
    picks.push(pick);
  }
  let cents = picks.map((p) => Float64Array.from(row(p)));
  const assign = new Int32Array(N).fill(-1);
  let obj = 0;
  for (let iter = 0; iter < 60; iter++) {
    let changed = 0; obj = 0;
    for (let i = 0; i < N; i++) {
      let bestS = -Infinity, bestC = 0; const r0 = row(i);
      for (let c = 0; c < k; c++) {
        let s = 0; const cc = cents[c];
        for (let d = 0; d < DIM; d++) s += r0[d] * cc[d];
        if (s > bestS) { bestS = s; bestC = c; }
      }
      if (assign[i] !== bestC) { assign[i] = bestC; changed++; }
      obj += bestS;
    }
    const next = Array.from({ length: k }, () => new Float64Array(DIM));
    for (let i = 0; i < N; i++) {
      const c = next[assign[i]]; const r0 = row(i);
      for (let d = 0; d < DIM; d++) c[d] += r0[d];
    }
    for (let c = 0; c < k; c++) {
      let n = 0; for (let d = 0; d < DIM; d++) n += next[c][d] * next[c][d];
      n = Math.sqrt(n) || 1;
      for (let d = 0; d < DIM; d++) next[c][d] /= n;
    }
    cents = next;
    if (!changed) break;
  }
  return { assign, cents, obj: obj / N };
}

let best = null;
for (const seed of SEEDS) {
  const r = kmeans(K, seed);
  if (!best || r.obj > best.obj) best = r;
}

const STOP = new Set('a an the and or but if then that this these those there here it its is are was were be for with from about into your you our we my me not no of in on to as at by can could would should will do does did have has had what which when where why how i\'m let want need help please make get use give write create best good better way thing one two also like really much many ok yes thanks new'.split(/\s+/));
const toks = docs.map((d) => new Set(((`${d.title} ${d.opening}`).toLowerCase().match(/[a-z][a-z0-9+#._-]{2,}/g) || []).filter((t) => !STOP.has(t) && t.length >= 3 && t.length <= 22)));
const globalDf = new Map();
for (const s of toks) for (const t of s) globalDf.set(t, (globalDf.get(t) || 0) + 1);

const clusters = Array.from({ length: K }, (_, c) => {
  const members = []; for (let i = 0; i < N; i++) if (best.assign[i] === c) members.push(i);
  const df = new Map();
  for (const i of members) for (const t of toks[i]) df.set(t, (df.get(t) || 0) + 1);
  const terms = [...df.entries()]
    .filter(([, n]) => n >= 3)
    .map(([t, n]) => [t, Math.log((n / members.length) / ((globalDf.get(t) - n + 0.5) / (N - members.length + 1))) * Math.sqrt(n)])
    .sort((a, b) => b[1] - a[1]).slice(0, 20).map((x) => x[0]);
  return { c, members, terms, df };
});

const dropped = clusters.filter((cl) => DROP.some((d) => cl.terms.includes(d)));
if (dropped.length !== DROP.length) {
  console.error(`Expected to drop ${DROP.length} clusters by signature [${DROP}], matched ${dropped.length}.`);
  console.error('Clustering has shifted; re-inspect before trusting the taxonomy.');
  clusters.forEach((cl) => console.error(`  n=${cl.members.length}: ${cl.terms.slice(0, 8).join(', ')}`));
  process.exit(1);
}
const keep = clusters.filter((cl) => !dropped.includes(cl));

// Greedy 1:1 match of kept clusters to named markers by signature-term coverage.
const score = (cl, m) => m.signature.reduce((s, t) => s + (cl.df.get(t) || 0) / cl.members.length, 0);
const pairs = [];
for (const cl of keep) for (const m of MARKERS) pairs.push([score(cl, m), cl, m]);
pairs.sort((a, b) => b[0] - a[0]);
const usedC = new Set(), usedM = new Set(), matched = [];
for (const [s, cl, m] of pairs) {
  if (usedC.has(cl.c) || usedM.has(m.id) || s <= 0) continue;
  usedC.add(cl.c); usedM.add(m.id); matched.push({ marker: m, cluster: cl, score: s });
}
if (matched.length !== MARKERS.length) {
  console.error(`Only matched ${matched.length}/${MARKERS.length} markers to clusters.`);
  process.exit(1);
}

matched.sort((a, b) => b.cluster.members.length - a.cluster.members.length);
const out = matched.map(({ marker, cluster }) => ({
  id: marker.id,
  label: marker.label,
  seedSize: cluster.members.length,
  centroid: Array.from(best.cents[cluster.c], (v) => Number(v.toFixed(6))),
}));

writeFileSync('scripts/markers.json', `${JSON.stringify(out, null, 1)}\n`);

console.log(`k=${K}, cohesion ${best.obj.toFixed(4)}`);
console.log(`dropped ${dropped.length} non-topic clusters: ${dropped.map((d) => `n=${d.members.length} (${d.terms.slice(0, 3).join('/')})`).join(', ')}`);
console.log(`\n8 markers -> scripts/markers.json`);
for (const { marker, cluster } of matched) {
  console.log(`  ${marker.label.padEnd(24)} seed n=${String(cluster.members.length).padStart(4)}   ${cluster.terms.slice(0, 6).join(', ')}`);
}
