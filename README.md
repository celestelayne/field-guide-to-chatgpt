# Field Guide to ChatGPT

Field Guide to ChatGPT is becoming a source-agnostic research memory tool for unfinished ideas and projects.

Its core promise is simple:

> Pick up where you left off without repeating your research.

Research often gets scattered across ChatGPT, Claude, Perplexity, browser searches, notes, and documents. When an idea returns weeks or months later, the useful context is gone: what was learned, which sources mattered, what was decided, what remained unresolved, and what should happen next.

This project reconstructs that history so an idea can be resumed instead of researched from scratch.

## Research Archaeology

The first product experience is the **Research Archaeology** screen. It reconstructs one unfinished idea and presents:

- Where the user left off
- A recommended next step
- Prior findings and references
- Explicit decisions and rejected directions
- Unresolved questions
- A chronological research timeline
- Source evidence for every conclusion

The first vertical slice uses a vintage-shopping agent as the pilot idea. The goal is to recover its history across multiple ChatGPT conversations and produce a trustworthy, source-linked checkpoint.

See [the product specification](docs/spec.md) for requirements, acceptance criteria, and the implementation plan.

## Data connectors

The already-imported ChatGPT export is the first data connector, not the product boundary.

The architecture should eventually support additional sources—including Claude, Perplexity, browser research, Google Docs, Notes, bookmarks, and uploaded files—through a shared research model.

## Current foundation

The repository currently contains:

- A React, TypeScript, and Vite application
- An imported ChatGPT history
- A full-message research corpus with source provenance and conversation graphs
- A normalization and embedding pipeline
- Topic classification across 1,127 conversations
- The Field Map interface for exploring conversation themes

The Field Map is useful retrieval infrastructure and an earlier product experiment. The next milestone moves from **classifying conversations by topic** to **reconstructing the history of an idea**.

The original normalized data contains conversation metadata, opening prompts, and truncated user text. Research Archaeology now has a separate full-message projection that preserves message-level provenance, citations, attachments, and branch relationships.

## Development

Requirements:

- Node.js
- npm

Install dependencies and start the application:

```bash
npm install
npm run dev
```

Clean clones use a tracked anonymized fixture. To load the ignored private Field Map data during local development, create `.env.local` from `.env.example` and set:

```bash
VITE_USE_PRIVATE_RESEARCH_DATA=true
```

Private data is served by a development-only, localhost-only endpoint. It is not imported by application source code and is not included in production builds.

Run validation:

```bash
npm test
npm run lint
npm run build
```

## Existing data pipeline

Build the private full-message corpus from the imported ChatGPT export:

```bash
npm run data:corpus
npm run data:validate-ground-truth
npm run data:review-ground-truth
```

The first command writes `scripts/.cache/research-corpus.json`. The second validates the private vintage-shopping ground-truth manifest against that corpus. The third generates a private HTML review page with every conclusion beside its verbatim evidence, author, and timestamp. All private data and review files are excluded from Git.

The existing Field Map pipeline runs in four stages:

```bash
node scripts/1-normalize.mjs
npm install --no-save @xenova/transformers
node scripts/2-embed.mjs
node scripts/3-markers.mjs
node scripts/4-classify.mjs
```

`@xenova/transformers` is a large, pipeline-only dependency and is intentionally not included in `package.json`.

## Privacy

This repository contains local research derived from personal ChatGPT history. The raw export, full-message corpus, embeddings, and generated archaeology reports may contain private or confidential information.

Do not commit or publish those files. The repository's ignore rules exclude the current `src/data` export, derived Field Map payload, marker centroids, pipeline cache, local environment configuration, and future private archaeology outputs. Only anonymized fixtures should be tracked for tests and examples.
