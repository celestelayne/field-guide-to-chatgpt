const SEARCHABLE_ROLES = new Set(['user', 'assistant']);

const splitMessage = (text, maxChars, overlapChars) => {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return [trimmed];

  const words = trimmed.split(/\s+/);
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    let end = start;
    let length = 0;
    while (end < words.length) {
      const nextLength = length + (end > start ? 1 : 0) + words[end].length;
      if (end > start && nextLength > maxChars) break;
      length = nextLength;
      end += 1;
    }
    chunks.push(words.slice(start, end).join(' '));
    if (end === words.length) break;

    let overlapStart = end;
    let overlapLength = 0;
    while (overlapStart > start) {
      const word = words[overlapStart - 1];
      const nextLength = overlapLength + (overlapLength > 0 ? 1 : 0) + word.length;
      if (nextLength > overlapChars) break;
      overlapLength = nextLength;
      overlapStart -= 1;
    }
    start = overlapStart === start ? end : overlapStart;
  }

  return chunks;
};

export function buildResearchChunks(
  corpus,
  { maxChars = 1200, overlapChars = 200 } = {},
) {
  return corpus.conversations.flatMap((conversation) =>
    conversation.messages
      .filter(
        (message) =>
          SEARCHABLE_ROLES.has(message.role) && message.text.trim().length > 0,
      )
      .flatMap((message) =>
        splitMessage(message.text, maxChars, overlapChars).map(
          (text, chunkIndex) => ({
            id: `${conversation.id}/${message.id}/${chunkIndex}`,
            conversationId: conversation.id,
            conversationTitle: conversation.title,
            messageId: message.id,
            role: message.role,
            createdAt: message.createdAt,
            isOnActiveBranch: message.isOnActiveBranch,
            chunkIndex,
            text,
          }),
        ),
      ),
  );
}

export function rankResearchChunks({
  chunks,
  embeddings,
  queryEmbedding,
  dimension,
  limit = 50,
}) {
  if (embeddings.length !== chunks.length * dimension) {
    throw new Error('Chunk embedding count does not match the chunk index');
  }
  if (queryEmbedding.length !== dimension) {
    throw new Error('Query embedding dimension does not match the chunk index');
  }

  return chunks
    .map((chunk, index) => {
      let score = 0;
      const offset = index * dimension;
      for (let value = 0; value < dimension; value += 1) {
        score += embeddings[offset + value] * queryEmbedding[value];
      }
      return { ...chunk, score };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function buildRetrievalCandidates({
  matches,
  corpus,
  contextRadius = 2,
}) {
  const conversations = new Map(
    corpus.conversations.map((conversation) => [conversation.id, conversation]),
  );
  const matchesByConversation = new Map();
  for (const match of matches) {
    const conversationMatches =
      matchesByConversation.get(match.conversationId) ?? [];
    conversationMatches.push(match);
    matchesByConversation.set(match.conversationId, conversationMatches);
  }

  return [...matchesByConversation.entries()]
    .map(([conversationId, conversationMatches]) => {
      const conversation = conversations.get(conversationId);
      const matchedMessageIds = new Set(
        conversationMatches.map((match) => match.messageId),
      );
      const contextIndexes = new Set();
      for (const [index, message] of conversation.messages.entries()) {
        if (!matchedMessageIds.has(message.id)) continue;
        const start = Math.max(0, index - contextRadius);
        const end = Math.min(
          conversation.messages.length - 1,
          index + contextRadius,
        );
        for (let contextIndex = start; contextIndex <= end; contextIndex += 1) {
          contextIndexes.add(contextIndex);
        }
      }

      return {
        conversationId,
        title: conversation.title,
        score: Math.max(...conversationMatches.map((match) => match.score)),
        reviewStatus: 'candidate',
        matchedChunks: conversationMatches,
        contextMessages: [...contextIndexes]
          .sort((a, b) => a - b)
          .map((index) => ({
            ...conversation.messages[index],
            isMatched: matchedMessageIds.has(conversation.messages[index].id),
          })),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.conversationId.localeCompare(b.conversationId),
    );
}

export function applyManifestOverrides({ candidates, manifest, corpus }) {
  const conversations = new Map(
    corpus.conversations.map((conversation) => [conversation.id, conversation]),
  );
  const byId = new Map(
    candidates.map((candidate) => [
      candidate.conversationId,
      { ...candidate },
    ]),
  );

  const apply = (entry, reviewStatus) => {
    const conversation = conversations.get(entry.id);
    const relevantMessageIds = new Set(
      manifest.relevantMessages
        .filter((reference) => reference.conversationId === entry.id)
        .map((reference) => reference.messageId),
    );
    const candidate = byId.get(entry.id) ?? {
      conversationId: entry.id,
      title: conversation?.title ?? entry.title ?? 'Untitled',
      score: null,
      matchedChunks: [],
      contextMessages: (conversation?.messages ?? [])
        .filter((message) => relevantMessageIds.has(message.id))
        .map((message) => ({
          ...message,
          isMatched: false,
          isManifestEvidence: true,
        })),
    };
    candidate.reviewStatus = reviewStatus;
    candidate.overrideReason = entry.reason;
    byId.set(entry.id, candidate);
  };

  for (const entry of manifest.includedConversations) apply(entry, 'included');
  for (const entry of manifest.excludedConversations) apply(entry, 'excluded');

  const priority = { included: 0, candidate: 1, excluded: 2 };
  return [...byId.values()].sort(
    (a, b) =>
      priority[a.reviewStatus] - priority[b.reviewStatus] ||
      (b.score ?? -Infinity) - (a.score ?? -Infinity) ||
      a.conversationId.localeCompare(b.conversationId),
  );
}

export function buildRetrievalQuery({ manifest, corpus, maxChars = 8000 }) {
  const seed = corpus.conversations.find(
    (conversation) => conversation.id === manifest.seedConversationId,
  );
  if (!seed) {
    throw new Error(`Seed conversation ${manifest.seedConversationId} does not exist`);
  }

  return [
    manifest.idea.title,
    manifest.idea.scope,
    ...seed.messages
      .filter(
        (message) =>
          message.role === 'user' && message.isOnActiveBranch !== false,
      )
      .map((message) => message.text),
  ]
    .join('\n')
    .slice(0, maxChars);
}

const normalize = (vector) => {
  let magnitude = 0;
  for (const value of vector) magnitude += value * value;
  magnitude = Math.sqrt(magnitude) || 1;
  return Float32Array.from(vector, (value) => value / magnitude);
};

export function buildSeedQueryEmbedding({
  seedConversationId,
  chunks,
  embeddings,
  ideaEmbedding,
  dimension,
}) {
  if (embeddings.length !== chunks.length * dimension) {
    throw new Error('Chunk embedding count does not match the chunk index');
  }

  const seedIndexes = chunks
    .map((chunk, index) => ({ chunk, index }))
    .filter(
      ({ chunk }) =>
        chunk.conversationId === seedConversationId &&
        chunk.role === 'user' &&
        chunk.isOnActiveBranch !== false,
    )
    .map(({ index }) => index);
  if (seedIndexes.length === 0) return normalize(ideaEmbedding);

  const seedCentroid = new Float64Array(dimension);
  for (const index of seedIndexes) {
    const offset = index * dimension;
    for (let value = 0; value < dimension; value += 1) {
      seedCentroid[value] += embeddings[offset + value];
    }
  }
  const normalizedSeed = normalize(seedCentroid);
  const combined = new Float64Array(dimension);
  for (let value = 0; value < dimension; value += 1) {
    combined[value] = ideaEmbedding[value] + normalizedSeed[value];
  }
  return normalize(combined);
}
