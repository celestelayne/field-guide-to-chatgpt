import { describe, expect, it } from 'vitest';
import { validateGroundTruthManifest } from './ground-truth-manifest.mjs';

const corpus = {
  conversations: [
    {
      id: 'conversation-1',
      messages: [
        { id: 'user-message', role: 'user' },
        { id: 'assistant-message', role: 'assistant' },
      ],
    },
  ],
};

const manifest = {
  schemaVersion: 1,
  id: 'pilot-idea',
  status: 'draft',
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
    decisions: [],
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

describe('validateGroundTruthManifest', () => {
  it('accepts a manifest whose evidence exists in the corpus', () => {
    expect(validateGroundTruthManifest(manifest, corpus)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('rejects conversation and message references missing from the corpus', () => {
    const invalid = structuredClone(manifest);
    invalid.includedConversations.push({
      id: 'missing-conversation',
      reason: 'Should not exist',
    });
    invalid.relevantMessages.push({
      conversationId: 'conversation-1',
      messageId: 'missing-message',
      reason: 'Should not exist',
    });

    expect(validateGroundTruthManifest(invalid, corpus)).toEqual({
      valid: false,
      errors: [
        'included conversation missing-conversation does not exist',
        'relevant message conversation-1/missing-message does not exist',
      ],
    });
  });

  it('rejects a user decision supported only by assistant evidence', () => {
    const invalid = structuredClone(manifest);
    invalid.relevantMessages.push({
      conversationId: 'conversation-1',
      messageId: 'assistant-message',
      reason: 'Assistant recommendation',
    });
    invalid.expected.decisions.push({
      id: 'decision-1',
      text: 'The user selected an option.',
      evidence: [
        {
          conversationId: 'conversation-1',
          messageId: 'assistant-message',
        },
      ],
    });

    expect(validateGroundTruthManifest(invalid, corpus)).toEqual({
      valid: false,
      errors: ['decision decision-1 must cite at least one user message'],
    });
  });

  it('rejects expected outcomes that cite missing evidence', () => {
    const invalid = structuredClone(manifest);
    invalid.expected.findings.push({
      id: 'finding-1',
      text: 'A finding',
      evidence: [
        {
          conversationId: 'conversation-1',
          messageId: 'missing-message',
        },
      ],
    });

    expect(validateGroundTruthManifest(invalid, corpus)).toEqual({
      valid: false,
      errors: [
        'finding finding-1 evidence conversation-1/missing-message does not exist',
      ],
    });
  });

  it('requires the seed conversation to be included', () => {
    const invalid = structuredClone(manifest);
    invalid.includedConversations = [];

    expect(validateGroundTruthManifest(invalid, corpus)).toEqual({
      valid: false,
      errors: ['seed conversation conversation-1 must be included'],
    });
  });

  it('rejects excluded conversations missing from the corpus', () => {
    const invalid = structuredClone(manifest);
    invalid.excludedConversations.push({
      id: 'missing-conversation',
      reason: 'False positive',
    });

    expect(validateGroundTruthManifest(invalid, corpus)).toEqual({
      valid: false,
      errors: ['excluded conversation missing-conversation does not exist'],
    });
  });

  it('requires expected evidence to be listed as relevant', () => {
    const invalid = structuredClone(manifest);
    invalid.expected.findings.push({
      id: 'finding-2',
      text: 'An assistant-supported finding',
      evidence: [
        {
          conversationId: 'conversation-1',
          messageId: 'assistant-message',
        },
      ],
    });

    expect(validateGroundTruthManifest(invalid, corpus)).toEqual({
      valid: false,
      errors: [
        'finding finding-2 evidence conversation-1/assistant-message is not listed as relevant',
      ],
    });
  });
});
