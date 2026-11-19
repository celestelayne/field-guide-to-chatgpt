const messageIndex = (corpus) =>
  new Map(
    corpus.conversations.flatMap((conversation) =>
      conversation.messages.map((message) => [
        `${conversation.id}/${message.id}`,
        message,
      ]),
    ),
  );

export function buildArchaeologyReport({ manifest, retrieval, corpus }) {
  const messages = messageIndex(corpus);
  const conversations = new Map(
    corpus.conversations.map((conversation) => [conversation.id, conversation]),
  );
  const enrichEvidence = (reference) => {
    const message = messages.get(
      `${reference.conversationId}/${reference.messageId}`,
    );
    return {
      conversationId: reference.conversationId,
      messageId: reference.messageId,
      excerpt: message.text,
      author: message.role,
      createdAt: message.createdAt,
    };
  };
  const enrichItem = (item) => ({
    ...item,
    confidence: 1,
    evidence: item.evidence.map(enrichEvidence),
  });

  return {
    schemaVersion: 1,
    idea: { id: manifest.id, ...manifest.idea },
    checkpoint: enrichItem(manifest.expected.checkpoint),
    findings: manifest.expected.findings.map(enrichItem),
    decisions: manifest.expected.decisions.map(enrichItem),
    rejectedDirections: manifest.expected.rejectedDirections.map(enrichItem),
    openQuestions: manifest.expected.openQuestions.map(enrichItem),
    timeline: manifest.relevantMessages
      .map((reference) => {
        const evidence = enrichEvidence(reference);
        return {
          text: reference.reason,
          createdAt: evidence.createdAt,
          evidence: [evidence],
        };
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    sources: retrieval.candidates.filter(
      (candidate) => candidate.reviewStatus === 'included',
    ).map((candidate) => {
      const conversation = conversations.get(candidate.conversationId);
      return {
        conversationId: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.messages.length,
      };
    }),
  };
}

export function validateArchaeologyReport({ report, retrieval, corpus }) {
  const messages = messageIndex(corpus);
  const errors = [];
  const validateEvidence = (label, evidence) => {
    const key = `${evidence.conversationId}/${evidence.messageId}`;
    const message = messages.get(key);
    if (!message) {
      errors.push(`${label} evidence ${key} does not exist`);
    } else if (!message.text.includes(evidence.excerpt)) {
      errors.push(`${label} evidence ${key} is not verbatim source text`);
    } else if (message.role !== evidence.author) {
      errors.push(`${label} evidence ${key} author does not match source`);
    }
  };
  const groups = [
    ['finding', report.findings],
    ['decision', report.decisions],
    ['rejected direction', report.rejectedDirections],
    ['open question', report.openQuestions],
    ['checkpoint', [report.checkpoint]],
  ];

  for (const [label, items] of groups) {
    for (const item of items) {
      if (
        typeof item.confidence !== 'number' ||
        item.confidence < 0 ||
        item.confidence > 1
      ) {
        errors.push(
          `${label} ${item.id ?? 'current'} confidence must be between 0 and 1`,
        );
      }
      for (const evidence of item.evidence) {
        validateEvidence(`${label} ${item.id ?? 'current'}`, evidence);
      }
    }
  }

  for (const decision of report.decisions) {
    const citesUser = decision.evidence.some(
      (evidence) =>
        messages.get(`${evidence.conversationId}/${evidence.messageId}`)
          ?.role === 'user',
    );
    if (!citesUser) {
      errors.push(`decision ${decision.id} must cite at least one user message`);
    }
  }

  for (const event of report.timeline) {
    for (const evidence of event.evidence) {
      validateEvidence(`timeline event ${event.text}`, evidence);
    }
  }

  const includedSourceIds = new Set(
    retrieval.candidates
      .filter((candidate) => candidate.reviewStatus === 'included')
      .map((candidate) => candidate.conversationId),
  );
  const reportSourceIds = new Set(
    report.sources.map((source) => source.conversationId),
  );
  for (const conversationId of includedSourceIds) {
    if (!reportSourceIds.has(conversationId)) {
      errors.push(`reviewed source ${conversationId} is missing from report`);
    }
  }
  for (const source of report.sources) {
    if (!includedSourceIds.has(source.conversationId)) {
      errors.push(
        `source ${source.conversationId} was not included by review`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
