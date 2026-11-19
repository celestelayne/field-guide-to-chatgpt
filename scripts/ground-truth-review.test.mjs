import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  renderGroundTruthReview,
  writeGroundTruthReview,
} from './ground-truth-review.mjs';

const corpus = {
  conversations: [
    {
      id: 'conversation-1',
      title: 'A vintage shopping conversation',
      messages: [
        {
          id: 'user-message',
          role: 'user',
          createdAt: '2023-11-14T22:15:00.000Z',
          text: 'I prefer <quality> bootcut & dark denim.',
        },
      ],
    },
  ],
};

const manifest = {
  schemaVersion: 1,
  id: 'pilot-idea',
  status: 'draft',
  idea: { title: 'Vintage shopping', scope: 'Personal shopping research.' },
  review: { status: 'needs-user-review', notes: [] },
  seedConversationId: 'conversation-1',
  includedConversations: [{ id: 'conversation-1', reason: 'Seed evidence' }],
  excludedConversations: [],
  relevantMessages: [
    {
      conversationId: 'conversation-1',
      messageId: 'user-message',
      reason: 'Defines the preference',
    },
  ],
  expected: {
    findings: [],
    decisions: [
      {
        id: 'decision-denim',
        text: 'Choose quality bootcut denim.',
        evidence: [
          { conversationId: 'conversation-1', messageId: 'user-message' },
        ],
      },
    ],
    rejectedDirections: [],
    openQuestions: [],
    checkpoint: {
      text: 'Resume by reviewing candidates.',
      evidence: [
        { conversationId: 'conversation-1', messageId: 'user-message' },
      ],
    },
  },
};

describe('renderGroundTruthReview', () => {
  it('shows a conclusion beside verbatim evidence with author and date', () => {
    const html = renderGroundTruthReview(manifest, corpus);

    expect(html).toContain('<h2>Decisions</h2>');
    expect(html).toContain('Choose quality bootcut denim.');
    expect(html).toContain('<span class="author user">User</span>');
    expect(html).toContain(
      '<time datetime="2023-11-14T22:15:00.000Z">2023-11-14T22:15:00.000Z</time>',
    );
    expect(html).toContain(
      'I prefer &lt;quality&gt; bootcut &amp; dark denim.',
    );
  });

  it('writes a private review page to the requested path', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ground-truth-review-'));
    const outputFile = join(directory, 'private', 'review.html');

    try {
      const result = writeGroundTruthReview({ manifest, corpus, outputFile });

      expect(result).toEqual({ conclusions: 2, evidence: 2 });
      expect(readFileSync(outputFile, 'utf8')).toContain(
        '<title>Vintage shopping — Ground-truth review</title>',
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
