import { describe, expect, it } from 'vitest';
import { applyRetrievalDecisions } from './retrieval-decisions.mjs';

describe('applyRetrievalDecisions', () => {
  it('applies a complete review to every retrieval candidate', () => {
    const retrieval = {
      schemaVersion: 1,
      ideaId: 'vintage-shopping',
      candidates: [
        { conversationId: 'conversation-1', reviewStatus: 'candidate' },
        { conversationId: 'conversation-2', reviewStatus: 'candidate' },
      ],
    };
    const review = {
      schemaVersion: 1,
      ideaId: 'vintage-shopping',
      decisions: {
        'conversation-1': 'included',
        'conversation-2': 'excluded',
      },
    };

    expect(applyRetrievalDecisions({ retrieval, review })).toMatchObject({
      reviewStatus: 'complete',
      candidates: [
        { conversationId: 'conversation-1', reviewStatus: 'included' },
        { conversationId: 'conversation-2', reviewStatus: 'excluded' },
      ],
    });
  });

  it('rejects decisions exported for a different idea', () => {
    const retrieval = {
      schemaVersion: 1,
      ideaId: 'vintage-shopping',
      candidates: [],
    };
    const review = {
      schemaVersion: 1,
      ideaId: 'another-idea',
      decisions: {},
    };

    expect(() => applyRetrievalDecisions({ retrieval, review })).toThrow(
      'Review idea another-idea does not match retrieval idea vintage-shopping',
    );
  });

  it('rejects incomplete reviews and unsupported decisions', () => {
    const retrieval = {
      schemaVersion: 1,
      ideaId: 'vintage-shopping',
      candidates: [
        { conversationId: 'conversation-1', reviewStatus: 'candidate' },
        { conversationId: 'conversation-2', reviewStatus: 'candidate' },
      ],
    };

    expect(() =>
      applyRetrievalDecisions({
        retrieval,
        review: {
          schemaVersion: 1,
          ideaId: 'vintage-shopping',
          decisions: { 'conversation-1': 'unsure' },
        },
      }),
    ).toThrow(
      'Every retrieval candidate must be decided as included or excluded',
    );
  });
});
