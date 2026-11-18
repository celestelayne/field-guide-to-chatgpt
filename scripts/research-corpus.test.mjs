import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildResearchCorpus,
  readChatGPTExport,
  writeResearchCorpus,
} from './research-corpus.mjs';

const conversation = {
  id: 'conversation-1',
  conversation_id: 'conversation-1',
  title: 'An unfinished idea',
  create_time: 1_700_000_000,
  update_time: 1_700_000_300,
  current_node: 'assistant-node',
  default_model_slug: 'example-model',
  mapping: {
    root: { id: 'root', parent: null, message: null },
    'user-node': {
      id: 'user-node',
      parent: 'root',
      message: {
        id: 'user-message',
        author: { role: 'user' },
        create_time: 1_700_000_100,
        content: { content_type: 'text', parts: ['The complete user message.'] },
        metadata: {},
      },
    },
    'assistant-node': {
      id: 'assistant-node',
      parent: 'user-node',
      message: {
        id: 'assistant-message',
        author: { role: 'assistant' },
        create_time: 1_700_000_200,
        content: { content_type: 'text', parts: ['The complete assistant response.'] },
        metadata: { model_slug: 'example-model' },
      },
    },
  },
};

describe('buildResearchCorpus', () => {
  it('preserves complete messages with ChatGPT connector provenance', () => {
    const corpus = buildResearchCorpus([
      { sourceFile: 'conversations-000.json', conversations: [conversation] },
    ]);

    expect(corpus.connector).toEqual({ id: 'chatgpt-export', type: 'chatgpt-export' });
    expect(corpus.conversations).toHaveLength(1);
    expect(corpus.conversations[0].source).toEqual({
      connectorId: 'chatgpt-export',
      sourceFile: 'conversations-000.json',
      sourceId: 'conversation-1',
    });
    expect(corpus.conversations[0].messages.map((message) => message.text)).toEqual([
      'The complete user message.',
      'The complete assistant response.',
    ]);
    expect(corpus.conversations[0].messages[0].source).toEqual({
      connectorId: 'chatgpt-export',
      conversationId: 'conversation-1',
      sourceMessageId: 'user-message',
      sourceNodeId: 'user-node',
    });
  });

  it('preserves parent, child, and active-branch relationships', () => {
    const branched = {
      ...conversation,
      mapping: {
        ...conversation.mapping,
        'alternate-node': {
          id: 'alternate-node',
          parent: 'user-node',
          message: {
            id: 'alternate-message',
            author: { role: 'assistant' },
            create_time: 1_700_000_250,
            content: { content_type: 'text', parts: ['An alternate response.'] },
            metadata: {},
          },
        },
      },
    };

    const corpus = buildResearchCorpus([
      { sourceFile: 'conversations-000.json', conversations: [branched] },
    ]);
    const byId = Object.fromEntries(
      corpus.conversations[0].messages.map((message) => [message.id, message]),
    );

    expect(byId['user-message']).toMatchObject({
      parentNodeId: 'root',
      childNodeIds: ['assistant-node', 'alternate-node'],
      isOnActiveBranch: true,
    });
    expect(byId['assistant-message'].isOnActiveBranch).toBe(true);
    expect(byId['alternate-message'].isOnActiveBranch).toBe(false);
    expect(corpus.conversations[0].nodes).toContainEqual({
      id: 'root',
      parentNodeId: null,
      childNodeIds: ['user-node'],
      messageId: null,
      isOnActiveBranch: true,
    });
  });

  it('exposes references, attachments, assets, and URLs without dropping raw metadata', () => {
    const withResearchArtifacts = structuredClone(conversation);
    withResearchArtifacts.mapping['user-node'].message.content.parts = [
      'Review https://example.com/notes before continuing.',
      {
        content_type: 'image_asset_pointer',
        asset_pointer: 'file-service://image-1',
      },
    ];
    withResearchArtifacts.mapping['user-node'].message.metadata = {
      content_references: [
        {
          type: 'webpage',
          title: 'Example source',
          url: 'https://example.com/source',
        },
      ],
      attachments: [
        {
          id: 'attachment-1',
          name: 'notes.pdf',
          mime_type: 'application/pdf',
          size: 123,
        },
      ],
    };

    const corpus = buildResearchCorpus([
      {
        sourceFile: 'conversations-000.json',
        conversations: [withResearchArtifacts],
      },
    ]);
    const message = corpus.conversations[0].messages.find(
      (candidate) => candidate.id === 'user-message',
    );

    expect(message.references).toEqual(
      withResearchArtifacts.mapping['user-node'].message.metadata.content_references,
    );
    expect(message.attachments).toEqual(
      withResearchArtifacts.mapping['user-node'].message.metadata.attachments,
    );
    expect(message.assetPointers).toEqual(['file-service://image-1']);
    expect(message.urls).toEqual([
      'https://example.com/notes',
      'https://example.com/source',
    ]);
    expect(message.metadata).toEqual(
      withResearchArtifacts.mapping['user-node'].message.metadata,
    );
  });
});

describe('readChatGPTExport', () => {
  it('reads conversation shards and ignores unrelated JSON files', () => {
    const directory = mkdtempSync(join(tmpdir(), 'chatgpt-export-fixture-'));
    try {
      writeFileSync(
        join(directory, 'conversations-000.json'),
        JSON.stringify([conversation]),
      );
      writeFileSync(join(directory, 'user.json'), JSON.stringify({ id: 'private-user' }));

      expect(readChatGPTExport(directory)).toEqual([
        {
          sourceFile: 'conversations-000.json',
          conversations: [conversation],
        },
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe('writeResearchCorpus', () => {
  it('writes the connector output to a requested private path', () => {
    const directory = mkdtempSync(join(tmpdir(), 'research-corpus-fixture-'));
    const exportDirectory = join(directory, 'export');
    const outputFile = join(directory, 'private', 'research-corpus.json');

    try {
      writeFileSync(join(directory, '.keep'), '');
      writeFileSync(join(directory, 'unrelated.json'), '{}');
      mkdirSync(exportDirectory);
      writeFileSync(
        join(exportDirectory, 'conversations-000.json'),
        JSON.stringify([conversation]),
      );

      const result = writeResearchCorpus({ exportDirectory, outputFile });
      const written = JSON.parse(readFileSync(outputFile, 'utf8'));

      expect(result).toEqual({ conversations: 1, messages: 2, nodes: 3 });
      expect(written.conversations[0].id).toBe('conversation-1');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
