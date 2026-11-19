# Research Archaeology v1

## Summary

Research Archaeology reconstructs an unfinished idea from a user's research history and produces a trustworthy, source-linked account of where they left off.

The first vertical slice uses the already-imported ChatGPT export as the first data connector. It should prove that the product can recover prior research, distinguish user decisions from AI suggestions, and provide enough context to resume without repeating the same work.

## Problem

Research is scattered across conversations and tools. When an idea returns, the user cannot reliably remember:

- What they already learned
- Which sources mattered
- What they decided or rejected
- What remains unresolved
- Where they stopped

The user therefore repeats research instead of continuing it.

## Core promise

> Pick up where you left off without repeating your research.

## First vertical slice

Use the imported ChatGPT history to reconstruct one known idea and generate a trustworthy "where I left off" checkpoint.

The initial pilot should use the vintage-shopping agent. The export contains a likely anchor conversation titled **90s Fashion Brands**, plus potentially related shopping and sourcing conversations.

Before automating the complete workflow, establish the correct result for this one idea.

## Goals

- Recover the conversations and messages relevant to one unfinished idea.
- Reconstruct what the user learned, decided, rejected, and left unresolved.
- Make every conclusion traceable to its source evidence.
- Clearly distinguish user decisions from AI suggestions.
- Let the user understand and resume the idea in under two minutes.

## Non-goals

Research Archaeology v1 will not include:

- Claude, Perplexity, Google Docs, Notes, or browser connectors
- Automatic discovery of every idea in the export
- Continuous synchronization
- Collaboration or sharing
- Deadlines, priorities, or general task management
- A general-purpose chat-history viewer
- A complete redesign of the Field Map

## P0 experience

### 1. Idea overview

- Working title
- What the user was trying to build or understand
- Date range
- Number of relevant conversations

### 2. Where you left off

- Most recent state of the idea
- Last unresolved decision
- Concrete next step

This is the most important section and should be the most prominent part of the screen.

### 3. What you already learned

- Findings grouped by subtopic
- Repeated research consolidated
- Contradictions preserved rather than silently resolved

### 4. Decisions and directions

- Decisions the user explicitly made
- Options the user rejected
- AI suggestions clearly distinguished from user decisions

### 5. Open questions

- Questions asked but not resolved
- Decisions still awaiting evidence

### 6. Research timeline

- Chronological evolution across conversations
- Major pivots and recurring themes

### 7. Sources

- Every finding, decision, and checkpoint links to its conversation and message.
- No unsupported claims are displayed as facts.

### 8. Resume

- The screen suggests a concrete next action.
- A future version can launch a new research session with the checkpoint as context.

## Existing foundation

The repository already contains:

- The raw ChatGPT export
- A normalization pipeline
- Conversation-level embeddings
- Topic classification
- The Field Map interface

The import step is complete. However, the current normalized representation is insufficient for Research Archaeology:

- It discards complete message text.
- It retains only the first 400 characters of the opening prompt.
- It truncates combined user prompts to 2,000 characters.
- Existing embeddings use only the title and opening prompt.

Research Archaeology needs a separate full-message projection from the existing raw export. This is an extension of the ChatGPT connector, not a new import.

## Technical plan

### Phase 1: Protect private data

**Status: Complete.**

The repository's ignore rules protect:

- The raw ChatGPT export under `src/data/`
- The pipeline cache and embeddings under `scripts/.cache/`
- The derived Field Map payload
- Marker centroids derived from the private corpus
- Future private and generated archaeology outputs

Clean clones and production builds use a tracked anonymized fixture. Private Field Map data is opt-in through an ignored local environment setting and a development-only, localhost-only endpoint. It is not imported into application source code or bundled into production output.

### Phase 2: Create the full research corpus

**Status: Complete.**

The `chatgpt-export` connector projection preserves:

- Connector and source identifiers
- Conversation and message IDs
- Parent and branch relationships
- Roles and timestamps
- Complete message text
- URLs and citations
- Attachments when identifiable

Run `npm run data:corpus` to rebuild the ignored private output at `scripts/.cache/research-corpus.json`. The current export produces 1,127 conversations, 20,177 messages, and 21,304 graph nodes. The implementation retains structured message parts and raw metadata while also exposing normalized references, attachments, asset pointers, and URLs.

An anonymized fixture covers connector provenance, complete messages, branch relationships, research artifacts, export shard discovery, and private output generation.

### Phase 3: Establish pilot ground truth

**Status: Complete.**

Manually identify the conversations belonging to the personal vintage-shopping research thread.

Create a reviewed manifest containing:

- Seed conversation
- Included conversation IDs
- Excluded false positives
- Relevant message IDs
- Expected findings
- Expected decisions
- Expected rejected directions
- Expected unresolved questions
- Expected checkpoint

This manifest becomes the evaluation fixture for retrieval and extraction.

The confirmed pilot scope is personal vintage and resale shopping research, not an AI shopping-agent product concept. The reviewed private manifest includes one seed conversation, six documented false positives, 25 relevant messages, evidence-backed expected outcomes, and an approved checkpoint. Run `npm run data:validate-ground-truth` to verify that every citation resolves to the private corpus and that user decisions cite user-authored evidence. Run `npm run data:review-ground-truth` to generate a private HTML review page that places each conclusion beside verbatim source evidence, author, and timestamp.

### Phase 4: Retrieve relevant research

**Status: Complete.**

Replace title-and-opening retrieval with message- or chunk-level semantic retrieval.

The retrieval flow should:

1. Start with an idea description or seed conversation.
2. Search embedded user and assistant message chunks.
3. Group matching chunks back into conversations.
4. Expand around matching messages to recover context.
5. Rank candidate conversations.
6. Allow inclusion or exclusion before reconstruction.

For v1, the reviewed manifest can override retrieval mistakes.

The local retrieval pipeline now indexes 40,172 overlapping chunks from 18,441 user and assistant messages across all 1,127 conversations. It uses the existing `Xenova/all-MiniLM-L6-v2` model, combines the idea description with a centroid of user-authored seed messages, ranks chunk matches, groups them by conversation, and expands two surrounding messages for context.

The first pilot run ranked **90s Fashion Brands** first at `0.8099`, ahead of the next semantic result at `0.6336`. The completed human review retained two of 27 candidate conversations and excluded 25. Run `npm run data:review-retrieval` to generate the ignored private candidate-review page. Review choices persist locally in the browser, can be exported as private JSON, and are validated and applied with `npm run data:apply-retrieval-decisions -- /path/to/retrieval-decisions.json`.

### Phase 5: Produce an archaeology report

**Status: Complete.**

Generate structured data rather than arbitrary prose.

```ts
type Evidence = {
  conversationId: string
  messageId: string
  excerpt: string
  author: 'user' | 'assistant' | 'tool'
}

type EvidenceBackedItem = {
  text: string
  confidence: number
  evidence: Evidence[]
}

type ArchaeologyReport = {
  idea: IdeaSummary
  checkpoint: Checkpoint
  findings: EvidenceBackedItem[]
  decisions: EvidenceBackedItem[]
  rejectedDirections: EvidenceBackedItem[]
  openQuestions: EvidenceBackedItem[]
  timeline: TimelineEvent[]
  sources: SourceConversation[]
}
```

Each extracted item must include:

- Source conversation ID
- Source message ID
- Supporting excerpt
- Confidence
- Whether it came from the user, an assistant, or an external source

A user decision must not be inferred from an assistant recommendation alone.

The first private pilot report is generated deterministically from the approved ground-truth conclusions and the completed retrieval review. It preserves both human-approved source conversations while making no uncited conclusions from the newly discovered source. The report contains one checkpoint, five findings, four user decisions, two rejected directions, three open questions, and 25 chronological research events. Every evidence object resolves to verbatim corpus text with matching authorship and provenance. Run `npm run data:archaeology-report` to rebuild it and `npm run data:validate-archaeology-report` to verify it before use by the Phase 6 interface.

### Phase 6: Build the Research Archaeology screen

Build the screen against the reviewed pilot report JSON before depending on automated extraction. This separates interface decisions from retrieval and extraction quality.

The visual hierarchy should be:

1. Where you left off
2. Recommended next step
3. What you already know
4. What remains unresolved
5. How the idea evolved
6. Original evidence

The Field Map can remain accessible, but it should not be the default experience for this vertical slice.

### Phase 7: Automate and validate

Add semantic retrieval and structured extraction, then compare the generated report with the reviewed ground truth.

Refine the pipeline until the checkpoint is accurate, well-supported, and useful for resuming the idea.

## Acceptance criteria

- At least 80% of manually identified relevant conversations are retrieved.
- Every displayed finding, decision, and checkpoint has source evidence.
- No assistant suggestion is presented as a user decision.
- The report preserves material contradictions and uncertainty.
- The checkpoint accurately describes the last known state of the idea.
- The screen provides a concrete recommended next step.
- The user can understand and resume the idea in under two minutes.
- The user does not need to reopen most original conversations to recover context.

## Build order

1. Protect private data.
2. Add full-message normalization.
3. Define and validate the archaeology report schema.
4. Build the vintage-shopping ground-truth manifest.
5. Create the first reviewed report.
6. Build the Research Archaeology screen.
7. Add semantic retrieval and structured extraction.
8. Compare automated output with the ground truth.
9. Refine until the checkpoint is trustworthy.

## Future connectors

The product architecture should remain source-agnostic. ChatGPT export is the first connector, not the product boundary.

Potential later connectors include:

- Claude
- Perplexity
- Google Search and browser history
- Google Docs
- Notes
- Bookmarks
- Manual files and uploads

All connectors should map into the same canonical research model so Research Archaeology can eventually reconstruct an idea across sources.
