# How the marker taxonomy was chosen

## The data does not pick a number

Silhouette scores over the embeddings, k=4..20, five k-means restarts each:

| k | silhouette |
|---|---|
| 6 | 0.0456 (local peak) |
| 7 | 0.0444 |
| 8 | 0.0442 |
| 10 | 0.0501 |
| 16 | 0.0559 |
| 20 | 0.0568 |

No elbow. Scores rise monotonically with k, which means finer splits always look
marginally "better" and nothing forces a stopping point. Even at best, 0.057 is
low: conversations sit about as close to a neighbouring cluster as to their own.

TF-IDF over the same text scored 0.012-0.021 - roughly a third of the embedding
scores - so semantic embeddings genuinely helped, but did not manufacture crisp
categories that were never there.

**The count is a design decision, not a statistical result.**

## Why k=10, then eight markers

k=6 is the cleanest run: six balanced, obviously nameable groups. But it hides
Design, folding it into teaching (design critique) and career (design
technologist roles). At k=10 Design separates and is the single largest group.

k=10 also produces two clusters that are not topics:

- **n=52, "bios"** - one client project, cutting across strategy, code,
  architecture and customer service. This is a *project* axis, not a topic axis.
  Worth modelling separately one day; not a marker.
- **n=51, "duration/mean/month"** - course-admin residue mixed with strays.

Dropping those two leaves eight markers with sizes from 94 to 172. Their members
are reassigned to their nearest marker at classification time.

## What this replaced

The original mock used seven placeholder markers. Three were roughly right
(Design & UX, AI, Engineering). Three do not exist as clusters at any k -
Finance, Travel (12 conversations total), and Health. Four substantial real
themes were missing entirely: Startup & Investors, Product Specs, Teaching &
Critique, and Personal & NYC.

## Thresholds

`FLOOR = 0.25` leaves 118 of 1127 conversations untagged - roughly the bottom
decile, where the closest marker is barely better than noise. Untagged is a real
answer and it matters: N counts only tagged conversations, so every untagged one
would otherwise shrink every `expected` and hide real gaps.

`MARGIN = 0.85` gives 1.39 markers per tagged conversation. Single-label would
misrepresent the data - the overlap is the point.

## Re-running

```
node scripts/1-normalize.mjs
npm i --no-save @xenova/transformers   # ~284MB, only needed for stage 2
node scripts/2-embed.mjs
node scripts/3-markers.mjs
node scripts/4-classify.mjs
```

Stage 3 asserts it can still find and drop the two non-topic clusters by
signature, and that all eight markers match a cluster. If the clustering shifts,
it fails loudly rather than silently emitting a different taxonomy.
