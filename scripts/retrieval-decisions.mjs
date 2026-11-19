export function applyRetrievalDecisions({ retrieval, review }) {
  if (review.ideaId !== retrieval.ideaId) {
    throw new Error(
      `Review idea ${review.ideaId} does not match retrieval idea ${retrieval.ideaId}`,
    );
  }

  const candidateIds = new Set(
    retrieval.candidates.map((candidate) => candidate.conversationId),
  );
  const decisionEntries = Object.entries(review.decisions ?? {});
  const isComplete =
    decisionEntries.length === candidateIds.size &&
    decisionEntries.every(
      ([conversationId, decision]) =>
        candidateIds.has(conversationId) &&
        (decision === 'included' || decision === 'excluded'),
    );
  if (!isComplete) {
    throw new Error(
      'Every retrieval candidate must be decided as included or excluded',
    );
  }

  return {
    ...retrieval,
    reviewStatus: 'complete',
    candidates: retrieval.candidates.map((candidate) => ({
      ...candidate,
      reviewStatus: review.decisions[candidate.conversationId],
    })),
  };
}
