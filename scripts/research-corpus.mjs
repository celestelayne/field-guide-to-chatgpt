import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CONNECTOR = { id: 'chatgpt-export', type: 'chatgpt-export' };

const toIso = (seconds) =>
  typeof seconds === 'number' && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null;

const textFromParts = (parts = []) =>
  parts
    .flatMap((part) => {
      if (typeof part === 'string') return [part];
      if (part && typeof part.text === 'string') return [part.text];
      return [];
    })
    .join('\n')
    .trim();

const walk = (value, visit) => {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      visit(key, item);
      walk(item, visit);
    }
  }
};

const urlsFrom = (...values) => {
  const urls = new Set();
  const collect = (value) => {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) {
        urls.add(match[0].replace(/[.,;:!?]+$/, ''));
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) collect(item);
      return;
    }
    if (value && typeof value === 'object') {
      for (const item of Object.values(value)) collect(item);
    }
  };
  for (const value of values) collect(value);
  return [...urls];
};

const assetPointersFrom = (parts) => {
  const pointers = new Set();
  walk(parts, (key, value) => {
    if (key === 'asset_pointer' && typeof value === 'string') pointers.add(value);
    if (key === 'audio_asset_pointer' && typeof value === 'string') pointers.add(value);
    if (key === 'video_container_asset_pointer' && typeof value === 'string') {
      pointers.add(value);
    }
    if (key === 'frames_asset_pointers' && Array.isArray(value)) {
      for (const pointer of value) {
        if (typeof pointer === 'string') pointers.add(pointer);
      }
    }
  });
  return [...pointers];
};

const activeBranchFrom = (mapping, currentNodeId) => {
  const active = new Set();
  let nodeId = currentNodeId;
  while (nodeId && !active.has(nodeId)) {
    active.add(nodeId);
    nodeId = mapping[nodeId]?.parent ?? null;
  }
  return active;
};

const childNodesByParent = (mapping) => {
  const children = new Map();
  for (const node of Object.values(mapping)) {
    if (!node?.parent) continue;
    const siblings = children.get(node.parent) ?? [];
    siblings.push(node.id);
    children.set(node.parent, siblings);
  }
  return children;
};

const messageFromNode = (node, childNodes, activeBranch, conversationId) => {
  const message = node.message;
  const parts = message.content?.parts ?? [];
  const metadata = message.metadata ?? {};
  const references = metadata.content_references ?? [];
  const attachments = metadata.attachments ?? [];
  return {
    id: message.id,
    source: {
      connectorId: CONNECTOR.id,
      conversationId,
      sourceMessageId: message.id,
      sourceNodeId: node.id,
    },
    nodeId: node.id,
    parentNodeId: node.parent ?? null,
    childNodeIds: childNodes.get(node.id) ?? [],
    isOnActiveBranch: activeBranch.has(node.id),
    role: message.author?.role ?? 'unknown',
    createdAt: toIso(message.create_time),
    contentType: message.content?.content_type ?? null,
    text: textFromParts(parts),
    parts,
    references,
    attachments,
    assetPointers: assetPointersFrom(parts),
    urls: urlsFrom(parts, references, metadata.search_result_groups ?? []),
    metadata,
  };
};

const conversationFromExport = (conversation, sourceFile) => {
  const mapping = conversation.mapping ?? {};
  const conversationId = conversation.conversation_id ?? conversation.id;
  const childNodes = childNodesByParent(mapping);
  const activeBranch = activeBranchFrom(mapping, conversation.current_node);

  return {
    id: conversationId,
    source: {
      connectorId: CONNECTOR.id,
      sourceFile,
      sourceId: conversation.id ?? conversation.conversation_id,
    },
    title: conversation.title?.trim() || 'Untitled',
    createdAt: toIso(conversation.create_time),
    updatedAt: toIso(conversation.update_time),
    currentNodeId: conversation.current_node ?? null,
    defaultModel: conversation.default_model_slug ?? null,
    nodes: Object.values(mapping).map((node) => ({
      id: node.id,
      parentNodeId: node.parent ?? null,
      childNodeIds: childNodes.get(node.id) ?? [],
      messageId: node.message?.id ?? null,
      isOnActiveBranch: activeBranch.has(node.id),
    })),
    messages: Object.values(mapping)
      .filter((node) => node?.message)
      .map((node) =>
        messageFromNode(node, childNodes, activeBranch, conversationId),
      )
      .sort(
        (a, b) =>
          (a.createdAt ?? '').localeCompare(b.createdAt ?? '') ||
          a.id.localeCompare(b.id),
      ),
  };
};

export function buildResearchCorpus(sources) {
  return {
    schemaVersion: 1,
    connector: CONNECTOR,
    conversations: sources.flatMap(({ sourceFile, conversations }) =>
      conversations.map((conversation) =>
        conversationFromExport(conversation, sourceFile),
      ),
    ),
  };
}

export function readChatGPTExport(exportDirectory) {
  return readdirSync(exportDirectory)
    .filter((file) => /^conversations-\d+\.json$/.test(file))
    .sort()
    .map((sourceFile) => ({
      sourceFile,
      conversations: JSON.parse(
        readFileSync(join(exportDirectory, sourceFile), 'utf8'),
      ),
    }));
}

export function writeResearchCorpus({ exportDirectory, outputFile }) {
  const corpus = buildResearchCorpus(readChatGPTExport(exportDirectory));
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${JSON.stringify(corpus, null, 2)}\n`);

  return {
    conversations: corpus.conversations.length,
    messages: corpus.conversations.reduce(
      (total, conversation) => total + conversation.messages.length,
      0,
    ),
    nodes: corpus.conversations.reduce(
      (total, conversation) => total + conversation.nodes.length,
      0,
    ),
  };
}
