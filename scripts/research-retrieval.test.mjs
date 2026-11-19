import { describe, expect, it } from 'vitest';
import {
  applyManifestOverrides,
  buildRetrievalQuery,
  buildRetrievalCandidates,
  buildResearchChunks,
  buildSeedQueryEmbedding,
  rankResearchChunks,
} from './research-retrieval.mjs';

const corpus = {
  conversations: [
    {
      id: 'conversation-1',
      title: 'A shopping idea',
      messages: [
        {
          id: 'user-message',
          role: 'user',
          createdAt: '2026-01-01T12:00:00.000Z',
          text: 'Find a well-made vintage bag with discreet branding.',
          isOnActiveBranch: true,
        },
        {
          id: 'assistant-message',
          role: 'assistant',
          createdAt: '2026-01-01T12:01:00.000Z',
          text: 'Compare material, condition, provenance, and total cost.',
          isOnActiveBranch: true,
        },
      ],
    },
  ],
};

describe('buildResearchChunks', () => {
  it('creates searchable chunks with message-level provenance', () => {
    expect(buildResearchChunks(corpus)).toEqual([
      {
        id: 'conversation-1/user-message/0',
        conversationId: 'conversation-1',
        conversationTitle: 'A shopping idea',
        messageId: 'user-message',
        role: 'user',
        createdAt: '2026-01-01T12:00:00.000Z',
        isOnActiveBranch: true,
        chunkIndex: 0,
        text: 'Find a well-made vintage bag with discreet branding.',
      },
      {
        id: 'conversation-1/assistant-message/0',
        conversationId: 'conversation-1',
        conversationTitle: 'A shopping idea',
        messageId: 'assistant-message',
        role: 'assistant',
        createdAt: '2026-01-01T12:01:00.000Z',
        isOnActiveBranch: true,
        chunkIndex: 0,
        text: 'Compare material, condition, provenance, and total cost.',
      },
    ]);
  });

  it('splits long messages into overlapping chunks without losing words', () => {
    const longCorpus = structuredClone(corpus);
    longCorpus.conversations[0].messages = [
      {
        ...longCorpus.conversations[0].messages[0],
        text: 'alpha beta gamma delta epsilon zeta eta theta iota kappa',
      },
    ];

    const chunks = buildResearchChunks(longCorpus, {
      maxChars: 28,
      overlapChars: 10,
    });
    const originalWords = new Set(
      longCorpus.conversations[0].messages[0].text.split(' '),
    );
    const chunkWords = new Set(chunks.flatMap((chunk) => chunk.text.split(' ')));
    const firstWords = new Set(chunks[0].text.split(' '));
    const secondWords = new Set(chunks[1].text.split(' '));

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunkWords).toEqual(originalWords);
    expect([...firstWords].some((word) => secondWords.has(word))).toBe(true);
  });
});

describe('rankResearchChunks', () => {
  it('returns the chunks most similar to the query embedding first', () => {
    const chunks = buildResearchChunks(corpus);
    const matches = rankResearchChunks({
      chunks,
      embeddings: new Float32Array([1, 0, 0, 1]),
      queryEmbedding: new Float32Array([0.9, 0.1]),
      dimension: 2,
      limit: 2,
    });

    expect(matches.map((match) => match.id)).toEqual([
      'conversation-1/user-message/0',
      'conversation-1/assistant-message/0',
    ]);
    expect(matches[0].score).toBeCloseTo(0.9);
  });
});

describe('buildRetrievalCandidates', () => {
  it('groups chunk matches by conversation and expands nearby messages', () => {
    const contextCorpus = structuredClone(corpus);
    contextCorpus.conversations[0].messages = [
      {
        id: 'before-message',
        role: 'user',
        createdAt: '2026-01-01T11:59:00.000Z',
        text: 'I am researching vintage accessories.',
        isOnActiveBranch: true,
      },
      ...contextCorpus.conversations[0].messages,
    ];
    const chunks = buildResearchChunks(contextCorpus);
    const matches = [
      {
        ...chunks.find((chunk) => chunk.messageId === 'user-message'),
        score: 0.92,
      },
    ];

    const candidates = buildRetrievalCandidates({
      matches,
      corpus: contextCorpus,
      contextRadius: 1,
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].conversationId).toBe('conversation-1');
    expect(candidates[0].score).toBeCloseTo(0.92);
    expect(
      candidates[0].contextMessages.map((message) => ({
        id: message.id,
        isMatched: message.isMatched,
      })),
    ).toEqual([
      { id: 'before-message', isMatched: false },
      { id: 'user-message', isMatched: true },
      { id: 'assistant-message', isMatched: false },
    ]);
  });
});

describe('applyManifestOverrides', () => {
  it('marks reviewed inclusions and exclusions even when retrieval misses them', () => {
    const overrideCorpus = structuredClone(corpus);
    overrideCorpus.conversations.push({
      id: 'false-positive',
      title: 'A different kind of shopping research',
      messages: [],
    });
    const candidates = [
      {
        conversationId: 'conversation-1',
        title: 'A shopping idea',
        score: 0.92,
        reviewStatus: 'candidate',
        matchedChunks: [],
        contextMessages: [],
      },
    ];
    const manifest = {
      includedConversations: [
        { id: 'conversation-1', reason: 'Reviewed seed evidence' },
      ],
      excludedConversations: [
        { id: 'false-positive', reason: 'Retail research, not personal shopping' },
      ],
      relevantMessages: [],
    };

    const reviewed = applyManifestOverrides({
      candidates,
      manifest,
      corpus: overrideCorpus,
    });

    expect(
      reviewed.map((candidate) => ({
        id: candidate.conversationId,
        status: candidate.reviewStatus,
        reason: candidate.overrideReason,
      })),
    ).toEqual([
      {
        id: 'conversation-1',
        status: 'included',
        reason: 'Reviewed seed evidence',
      },
      {
        id: 'false-positive',
        status: 'excluded',
        reason: 'Retail research, not personal shopping',
      },
    ]);
  });
});

describe('buildRetrievalQuery', () => {
  it('combines the idea description with user-authored seed evidence', () => {
    const manifest = {
      idea: {
        title: 'Personal vintage shopping',
        scope: 'Recover preferences and unresolved shopping questions.',
      },
      seedConversationId: 'conversation-1',
    };

    const query = buildRetrievalQuery({ manifest, corpus });

    expect(query).toContain('Personal vintage shopping');
    expect(query).toContain('Recover preferences and unresolved shopping questions.');
    expect(query).toContain('Find a well-made vintage bag with discreet branding.');
    expect(query).not.toContain(
      'Compare material, condition, provenance, and total cost.',
    );
  });
});

describe('buildSeedQueryEmbedding', () => {
  it('balances the idea description with user-authored seed-message vectors', () => {
    const chunks = buildResearchChunks(corpus);
    const query = buildSeedQueryEmbedding({
      seedConversationId: 'conversation-1',
      chunks,
      embeddings: new Float32Array([1, 0, 0, 1]),
      ideaEmbedding: new Float32Array([0, 1]),
      dimension: 2,
    });

    expect(query[0]).toBeCloseTo(Math.SQRT1_2);
    expect(query[1]).toBeCloseTo(Math.SQRT1_2);
  });
});
