export function validateGroundTruthManifest(manifest, corpus) {
  const errors = [];
  const conversations = new Map(
    corpus.conversations.map((conversation) => [conversation.id, conversation]),
  );
  const findMessage = (reference) =>
    conversations
      .get(reference.conversationId)
      ?.messages.find((message) => message.id === reference.messageId);
  const relevantMessageKeys = new Set(
    manifest.relevantMessages.map(
      (reference) => `${reference.conversationId}/${reference.messageId}`,
    ),
  );

  for (const candidate of manifest.includedConversations) {
    if (!conversations.has(candidate.id)) {
      errors.push(`included conversation ${candidate.id} does not exist`);
    }
  }
  for (const candidate of manifest.excludedConversations) {
    if (!conversations.has(candidate.id)) {
      errors.push(`excluded conversation ${candidate.id} does not exist`);
    }
  }
  if (
    !manifest.includedConversations.some(
      (candidate) => candidate.id === manifest.seedConversationId,
    )
  ) {
    errors.push(
      `seed conversation ${manifest.seedConversationId} must be included`,
    );
  }

  for (const reference of manifest.relevantMessages) {
    if (!findMessage(reference)) {
      errors.push(
        `relevant message ${reference.conversationId}/${reference.messageId} does not exist`,
      );
    }
  }

  const outcomeGroups = [
    ['finding', manifest.expected.findings],
    ['decision', manifest.expected.decisions],
    ['rejected direction', manifest.expected.rejectedDirections],
    ['open question', manifest.expected.openQuestions],
    ['checkpoint', [manifest.expected.checkpoint]],
  ];
  for (const [label, outcomes] of outcomeGroups) {
    for (const outcome of outcomes) {
      for (const reference of outcome.evidence) {
        const key = `${reference.conversationId}/${reference.messageId}`;
        if (!findMessage(reference)) {
          errors.push(
            `${label} ${outcome.id ?? 'current'} evidence ${key} does not exist`,
          );
        } else if (!relevantMessageKeys.has(key)) {
          errors.push(
            `${label} ${outcome.id ?? 'current'} evidence ${key} is not listed as relevant`,
          );
        }
      }
    }
  }

  for (const decision of manifest.expected.decisions) {
    const citesUser = decision.evidence.some(
      (reference) => findMessage(reference)?.role === 'user',
    );
    if (!citesUser) {
      errors.push(`decision ${decision.id} must cite at least one user message`);
    }
  }

  return { valid: errors.length === 0, errors };
}
