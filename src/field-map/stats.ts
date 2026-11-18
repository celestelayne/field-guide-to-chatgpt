import type { Conversation, Topic } from './types';

/**
 * A pair is only a finding if both topics were big enough that they should have
 * met. Two rare topics never co-occurring is meaningless — they were never going
 * to. This threshold is the entire feature.
 */
export const GAP_THRESHOLD = 5;

export type Cell = {
  rowTopicId: string;
  colTopicId: string;
  /** Conversations carrying both topics. On the diagonal, the topic's own count. */
  observed: number;
  /** Independence estimate: (n_i * n_j) / N. */
  expected: number;
  /** observed / expected, or null when expected is 0. */
  lift: number | null;
  flagged: boolean;
};

export type FieldMap = {
  /** Ordered by conversation volume, descending. Row and column order both. */
  topics: Topic[];
  /** Conversations carrying each topic, keyed by topic id. */
  counts: Record<string, number>;
  /** Square, symmetric, indexed [row][col] against `topics`. */
  cells: Cell[][];
  /** Flagged cells, upper triangle only, ranked by `expected` descending. */
  gaps: Cell[];
  /** N — conversations carrying at least one topic. */
  total: number;
};

/**
 * `expected` is approximate under multi-label assignment: a conversation can
 * carry several topics, so topic membership is not a partition and the counts
 * are not independent draws. That is fine here — we are ranking gaps, not doing
 * inference. No p-values are claimed and none should be.
 */
export function computeFieldMap(
  topics: Topic[],
  conversations: Conversation[],
): FieldMap {
  // A conversation listing the same topic twice still counts once. The unknown-id
  // filter is defensive only — `loadFieldMapData` rejects a file whose
  // conversations cite undeclared topics, so nothing should reach here.
  const known = new Set(topics.map((t) => t.id));
  const memberships = conversations.map(
    (c) => new Set(c.topicIds.filter((id) => known.has(id))),
  );

  // N counts only conversations carrying at least one topic. An untagged
  // conversation was never an opportunity for two topics to meet, so leaving it
  // in the denominator would shrink every `expected` and hide real gaps.
  const total = memberships.filter((m) => m.size > 0).length;

  const counts: Record<string, number> = {};
  for (const topic of topics) counts[topic.id] = 0;
  for (const m of memberships) {
    for (const id of m) counts[id] += 1;
  }

  const ordered = [...topics].sort(
    (a, b) => counts[b.id] - counts[a.id] || a.id.localeCompare(b.id),
  );

  const observed: number[][] = ordered.map(() => ordered.map(() => 0));
  const index = new Map(ordered.map((t, i) => [t.id, i]));
  for (const m of memberships) {
    const rows = [...m].map((id) => index.get(id)!);
    for (const i of rows) {
      for (const j of rows) observed[i][j] += 1;
    }
  }

  const cells = ordered.map((rowTopic, i) =>
    ordered.map((colTopic, j) => {
      const n = observed[i][j];
      const expected =
        total === 0 ? 0 : (counts[rowTopic.id] * counts[colTopic.id]) / total;
      return {
        rowTopicId: rowTopic.id,
        colTopicId: colTopic.id,
        observed: n,
        expected,
        lift: expected > 0 ? n / expected : null,
        flagged: n === 0 && expected >= GAP_THRESHOLD,
      };
    }),
  );

  const gaps: Cell[] = [];
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      if (cells[i][j].flagged) gaps.push(cells[i][j]);
    }
  }
  gaps.sort((a, b) => b.expected - a.expected);

  return { topics: ordered, counts, cells, gaps, total };
}

/** Conversations carrying both topics, for the populated-cell side panel. */
export function conversationsForPair(
  conversations: Conversation[],
  aId: string,
  bId: string,
): Conversation[] {
  return conversations.filter(
    (c) => c.topicIds.includes(aId) && c.topicIds.includes(bId),
  );
}
