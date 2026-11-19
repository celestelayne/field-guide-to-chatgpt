import { describe, expect, it } from 'vitest';
import {
  buildArchaeologyReport,
  validateArchaeologyReport,
} from './archaeology-report.mjs';

const corpus = {
  conversations: [
    {
      id: 'conversation-1',
      title: 'Vintage research',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-02T12:00:00.000Z',
      messages: [
        {
          id: 'message-1',
          role: 'user',
          createdAt: '2026-01-01T12:00:00.000Z',
          text: 'I decided to choose understated vintage bags.',
        },
      ],
    },
  ],
};

const reference = {
  conversationId: 'conversation-1',
  messageId: 'message-1',
};

const manifest = {
  id: 'vintage-shopping',
  idea: { title: 'Vintage shopping', scope: 'Personal shopping research' },
  relevantMessages: [{ ...reference, reason: 'Records the decision' }],
  expected: {
    findings: [],
    decisions: [
      {
        id: 'decision-1',
        text: 'Choose understated vintage bags.',
        evidence: [reference],
      },
    ],
    rejectedDirections: [],
    openQuestions: [],
    checkpoint: {
      text: 'Resume by building a shortlist.',
      evidence: [reference],
    },
  },
};

const retrieval = {
  reviewStatus: 'complete',
  candidates: [
    {
      conversationId: 'conversation-1',
      title: 'Vintage research',
      reviewStatus: 'included',
    },
  ],
};

describe('buildArchaeologyReport', () => {
  it('turns a reviewed conclusion into an evidence-backed report item', () => {
    const report = buildArchaeologyReport({ manifest, retrieval, corpus });

    expect(report.decisions).toEqual([
      {
        id: 'decision-1',
        text: 'Choose understated vintage bags.',
        confidence: 1,
        evidence: [
          {
            conversationId: 'conversation-1',
            messageId: 'message-1',
            excerpt: 'I decided to choose understated vintage bags.',
            author: 'user',
            createdAt: '2026-01-01T12:00:00.000Z',
          },
        ],
      },
    ]);
  });

  it('preserves the reviewed source set and chronological research trail', () => {
    const report = buildArchaeologyReport({ manifest, retrieval, corpus });

    expect(report.sources).toEqual([
      {
        conversationId: 'conversation-1',
        title: 'Vintage research',
        createdAt: '2026-01-01T12:00:00.000Z',
        updatedAt: '2026-01-02T12:00:00.000Z',
        messageCount: 1,
      },
    ]);
    expect(report.timeline).toEqual([
      {
        text: 'Records the decision',
        createdAt: '2026-01-01T12:00:00.000Z',
        evidence: [
          {
            conversationId: 'conversation-1',
            messageId: 'message-1',
            excerpt: 'I decided to choose understated vintage bags.',
            author: 'user',
            createdAt: '2026-01-01T12:00:00.000Z',
          },
        ],
      },
    ]);
  });

  it('validates the generated report against its corpus and reviewed sources', () => {
    const report = buildArchaeologyReport({ manifest, retrieval, corpus });

    expect(validateArchaeologyReport({ report, retrieval, corpus })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('rejects evidence that is not verbatim source text', () => {
    const report = buildArchaeologyReport({ manifest, retrieval, corpus });
    report.decisions[0].evidence[0].excerpt = 'A paraphrase with no source.';

    expect(validateArchaeologyReport({ report, retrieval, corpus })).toEqual({
      valid: false,
      errors: [
        'decision decision-1 evidence conversation-1/message-1 is not verbatim source text',
      ],
    });
  });

  it('rejects a user decision supported only by assistant evidence', () => {
    const assistantCorpus = structuredClone(corpus);
    assistantCorpus.conversations[0].messages[0].role = 'assistant';
    const report = buildArchaeologyReport({
      manifest,
      retrieval,
      corpus: assistantCorpus,
    });

    expect(
      validateArchaeologyReport({
        report,
        retrieval,
        corpus: assistantCorpus,
      }),
    ).toEqual({
      valid: false,
      errors: ['decision decision-1 must cite at least one user message'],
    });
  });

  it('rejects report sources that were not included by human review', () => {
    const report = buildArchaeologyReport({ manifest, retrieval, corpus });
    report.sources.push({
      conversationId: 'conversation-2',
      title: 'Unreviewed source',
      messageCount: 1,
    });

    expect(validateArchaeologyReport({ report, retrieval, corpus })).toEqual({
      valid: false,
      errors: ['source conversation-2 was not included by review'],
    });
  });

  it('rejects evidence with incorrect authorship metadata', () => {
    const report = buildArchaeologyReport({ manifest, retrieval, corpus });
    report.decisions[0].evidence[0].author = 'assistant';

    expect(validateArchaeologyReport({ report, retrieval, corpus })).toEqual({
      valid: false,
      errors: [
        'decision decision-1 evidence conversation-1/message-1 author does not match source',
      ],
    });
  });

  it('requires conclusion confidence to be between zero and one', () => {
    const report = buildArchaeologyReport({ manifest, retrieval, corpus });
    report.decisions[0].confidence = 1.5;

    expect(validateArchaeologyReport({ report, retrieval, corpus })).toEqual({
      valid: false,
      errors: ['decision decision-1 confidence must be between 0 and 1'],
    });
  });

  it('validates timeline evidence against the original message', () => {
    const report = buildArchaeologyReport({ manifest, retrieval, corpus });
    report.timeline[0].evidence[0].excerpt = 'Invented timeline evidence.';

    expect(validateArchaeologyReport({ report, retrieval, corpus })).toEqual({
      valid: false,
      errors: [
        'timeline event Records the decision evidence conversation-1/message-1 is not verbatim source text',
      ],
    });
  });

  it('requires every human-approved source to remain in the report', () => {
    const report = buildArchaeologyReport({ manifest, retrieval, corpus });
    report.sources = [];

    expect(validateArchaeologyReport({ report, retrieval, corpus })).toEqual({
      valid: false,
      errors: ['reviewed source conversation-1 is missing from report'],
    });
  });
});
