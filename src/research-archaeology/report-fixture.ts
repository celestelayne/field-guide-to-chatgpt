import type { ArchaeologyReport } from './types';

const userEvidence = {
  conversationId: 'fixture-conversation-1',
  messageId: 'fixture-message-1',
  excerpt:
    'I want the archive to help people resume earlier work without repeating the same research.',
  author: 'user' as const,
  createdAt: '2026-01-08T14:00:00.000Z',
};

const assistantEvidence = {
  conversationId: 'fixture-conversation-1',
  messageId: 'fixture-message-2',
  excerpt:
    'A source-linked checkpoint would preserve decisions, open questions, and a concrete place to resume.',
  author: 'assistant' as const,
  createdAt: '2026-01-08T14:02:00.000Z',
};

export const reportFixture: ArchaeologyReport = {
  schemaVersion: 1,
  reviewStatus: 'reviewed',
  idea: {
    id: 'fixture-research-memory',
    title: 'Research memory prototype',
    scope: 'Recover the useful state of an unfinished idea from prior research.',
  },
  checkpoint: {
    text: 'The research established the core problem and evidence model, but stopped before testing the resume experience. Resume by reviewing the first checkpoint with a real project and recording what is missing.',
    confidence: 1,
    evidence: [userEvidence, assistantEvidence],
  },
  findings: [
    {
      id: 'fixture-finding-1',
      text: 'A useful research memory needs conclusions and their original evidence together.',
      confidence: 1,
      evidence: [assistantEvidence],
    },
  ],
  decisions: [
    {
      id: 'fixture-decision-1',
      text: 'Begin with one unfinished idea and preserve source-level provenance.',
      confidence: 1,
      evidence: [userEvidence],
    },
  ],
  rejectedDirections: [
    {
      id: 'fixture-rejected-1',
      text: 'Do not begin as a general-purpose chat-history viewer.',
      confidence: 1,
      evidence: [userEvidence],
    },
  ],
  openQuestions: [
    {
      id: 'fixture-question-1',
      text: 'Can someone understand and resume the idea in under two minutes?',
      confidence: 1,
      evidence: [assistantEvidence],
    },
  ],
  timeline: [
    {
      text: userEvidence.excerpt,
      annotation: 'Defined the resume-without-researching-again goal.',
      createdAt: userEvidence.createdAt,
      evidence: [userEvidence],
    },
    {
      text: 'Proposed an evidence-backed checkpoint.',
      annotation: 'Proposed an evidence-backed checkpoint.',
      createdAt: assistantEvidence.createdAt,
      evidence: [assistantEvidence],
    },
  ],
  sources: [
    {
      conversationId: 'fixture-conversation-1',
      title: 'Recovering unfinished research',
      createdAt: '2026-01-08T14:00:00.000Z',
      updatedAt: '2026-01-08T14:02:00.000Z',
      messageCount: 2,
    },
  ],
};
