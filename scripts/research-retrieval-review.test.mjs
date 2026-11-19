import { describe, expect, it } from 'vitest';
import { renderRetrievalReview } from './research-retrieval-review.mjs';

const retrieval = {
  ideaId: 'vintage-shopping',
  model: 'example-model',
  query: { text: 'Personal vintage shopping research' },
  candidates: [
    {
      conversationId: 'conversation-1',
      title: 'Vintage bag research',
      score: 0.81234,
      reviewStatus: 'candidate',
      matchedChunks: [
        {
          id: 'conversation-1/message-1/0',
          messageId: 'message-1',
          role: 'user',
          createdAt: '2026-01-01T12:00:00.000Z',
          score: 0.81234,
          text: 'I want a subtle <vintage> bag & good provenance.',
        },
      ],
    },
  ],
};

describe('renderRetrievalReview', () => {
  it('shows each candidate with status, score, and verbatim matched evidence', () => {
    const html = renderRetrievalReview(retrieval);

    expect(html).toContain('Vintage bag research');
    expect(html).toContain('candidate');
    expect(html).toContain('0.8123');
    expect(html).toContain('User');
    expect(html).toContain('2026-01-01T12:00:00.000Z');
    expect(html).toContain(
      'I want a subtle &lt;vintage&gt; bag &amp; good provenance.',
    );
  });

  it('preselects reviewed manifest decisions', () => {
    const reviewed = structuredClone(retrieval);
    reviewed.candidates[0].reviewStatus = 'included';

    expect(renderRetrievalReview(reviewed)).toContain(
      '<input type="radio" name="conversation-1" checked> Include',
    );
  });

  it('persists review choices and can export them as private JSON', () => {
    const html = renderRetrievalReview(retrieval);

    expect(html).toContain('id="export-decisions"');
    expect(html).toContain('localStorage.setItem');
    expect(html).toContain('retrieval-decisions.json');
  });
});
