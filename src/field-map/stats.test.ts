import { describe, expect, it } from 'vitest';
import type { FieldMap } from './stats';
import { computeFieldMap, conversationsForPair, GAP_THRESHOLD } from './stats';
import type { Conversation, Topic } from './types';

const TOPICS: Topic[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
  { id: 'c', label: 'C' },
  { id: 'd', label: 'D' },
  { id: 'e', label: 'E' },
  { id: 'f', label: 'F' },
];

/** A conversation with the fields the stats module ignores filled in. */
const conv = (o: { id: string; topicIds: string[] }): Conversation => ({
  id: o.id,
  title: `Conversation ${o.id}`,
  date: '2024-01-01T00:00:00.000Z',
  topicIds: o.topicIds,
  messages: 2,
  model: null,
  opening: '',
});


/**
 * 125 conversations, 100 of them tagged, so N = 100.
 * n_a = 30, n_b = 30, n_c = 43, n_d = 3, n_e = 4, n_f = 0.
 *
 * Planted: a×b never co-occur, expected 9 — must flag.
 *          b×c never co-occur, expected 12.9 — must flag.
 *          d×e never co-occur, expected 0.12 — must NOT flag.
 *          a×c co-occur 10 times — populated.
 *          f is empty, so every f cell has expected 0.
 */
function fixture(): Conversation[] {
  const out: Conversation[] = [];
  const push = (topicIds: string[], n: number) => {
    for (let i = 0; i < n; i++) {
      out.push(conv({ id: `c${out.length}`, topicIds }));
    }
  };
  push(['a'], 20);
  push(['a', 'c'], 10);
  push(['b'], 30);
  push(['c'], 33);
  push(['d'], 3);
  push(['e'], 4);
  push([], 25); // untagged — excluded from N
  return out;
}

function cell(map: FieldMap, rowId: string, colId: string) {
  const i = map.topics.findIndex((t) => t.id === rowId);
  const j = map.topics.findIndex((t) => t.id === colId);
  return map.cells[i][j];
}

describe('computeFieldMap', () => {
  const map = computeFieldMap(TOPICS, fixture());

  it('counts conversations per topic', () => {
    expect(map.counts).toEqual({ a: 30, b: 30, c: 43, d: 3, e: 4, f: 0 });
  });

  it('excludes untagged conversations from N', () => {
    expect(fixture()).toHaveLength(125);
    expect(map.total).toBe(100);
  });

  it('is unaffected by how many untagged conversations exist', () => {
    const tagged = fixture().filter((c) => c.topicIds.length > 0);
    const padded = [
      ...tagged,
      ...Array.from({ length: 400 }, (_, i) => conv({ id: `pad${i}`, topicIds: [] })),
    ];
    expect(computeFieldMap(TOPICS, padded)).toEqual(map);
  });

  it('orders topics by volume, descending', () => {
    expect(map.topics.map((t) => t.id)).toEqual(['c', 'a', 'b', 'e', 'd', 'f']);
  });

  it('flags the planted high-volume zero cells', () => {
    const ab = cell(map, 'a', 'b');
    expect(ab.observed).toBe(0);
    expect(ab.expected).toBe(9); // 30 * 30 / 100
    expect(ab.lift).toBe(0);
    expect(ab.flagged).toBe(true);

    const bc = cell(map, 'b', 'c');
    expect(bc.observed).toBe(0);
    expect(bc.expected).toBe(12.9); // 30 * 43 / 100
    expect(bc.flagged).toBe(true);
  });

  it('does not flag a planted low-volume zero cell', () => {
    const de = cell(map, 'd', 'e');
    expect(de.observed).toBe(0);
    expect(de.expected).toBeCloseTo(0.12);
    expect(de.flagged).toBe(false);
  });

  it('computes lift for a populated cell', () => {
    const ac = cell(map, 'a', 'c');
    expect(ac.observed).toBe(10);
    expect(ac.expected).toBe(12.9); // 30 * 43 / 100
    expect(ac.lift).toBeCloseTo(10 / 12.9); // they meet, but less than chance
    expect(ac.flagged).toBe(false);
  });

  it('is symmetric', () => {
    for (let i = 0; i < map.topics.length; i++) {
      for (let j = 0; j < map.topics.length; j++) {
        expect(map.cells[i][j].observed).toBe(map.cells[j][i].observed);
        expect(map.cells[i][j].expected).toBeCloseTo(map.cells[j][i].expected);
        expect(map.cells[i][j].flagged).toBe(map.cells[j][i].flagged);
      }
    }
  });

  it('has a diagonal equal to each topic own count', () => {
    for (const topic of map.topics) {
      expect(cell(map, topic.id, topic.id).observed).toBe(map.counts[topic.id]);
    }
  });

  it('never flags the diagonal', () => {
    for (const topic of map.topics) {
      expect(cell(map, topic.id, topic.id).flagged).toBe(false);
    }
  });

  it('returns null lift when expected is 0', () => {
    for (const topic of map.topics) {
      const c = cell(map, 'f', topic.id);
      expect(c.expected).toBe(0);
      expect(c.lift).toBeNull();
      expect(c.flagged).toBe(false);
    }
  });

  it('flags exactly the cells the threshold selects', () => {
    for (const row of map.cells) {
      for (const c of row) {
        expect(c.flagged).toBe(c.observed === 0 && c.expected >= GAP_THRESHOLD);
      }
    }
  });

  it('ranks gaps by expected, descending, once per pair', () => {
    expect(map.gaps.map((g) => `${g.rowTopicId}x${g.colTopicId}`)).toEqual([
      'cxb', // expected 12.9
      'axb', // expected 9
    ]);
    expect(map.gaps.map((g) => g.expected)).toEqual([12.9, 9]);
  });

  it('ignores duplicate and unknown topic ids', () => {
    const dupes = computeFieldMap(TOPICS, [
      conv({ id: 'x', topicIds: ['a', 'a', 'zzz'] }),
    ]);
    expect(dupes.counts.a).toBe(1);
    expect(cell(dupes, 'a', 'a').observed).toBe(1);
  });

  it.each([
    ['no conversations', [] as Conversation[]],
    [
      'only untagged conversations',
      [conv({ id: 'u', topicIds: [] })],
    ],
  ])('does not divide by zero when N is 0: %s', (_label, conversations) => {
    const empty = computeFieldMap(TOPICS, conversations);
    expect(empty.total).toBe(0);
    expect(empty.gaps).toEqual([]);
    for (const row of empty.cells) {
      for (const c of row) {
        expect(c.observed).toBe(0);
        expect(c.expected).toBe(0);
        expect(c.lift).toBeNull();
        expect(c.flagged).toBe(false);
      }
    }
  });
});

describe('conversationsForPair', () => {
  it('returns only conversations carrying both topics', () => {
    const conversations = fixture();
    const shared = conversationsForPair(conversations, 'a', 'c');
    expect(shared).toHaveLength(10);
    expect(
      shared.every(
        (c) => c.topicIds.includes('a') && c.topicIds.includes('c'),
      ),
    ).toBe(true);
    expect(conversationsForPair(conversations, 'a', 'b')).toHaveLength(0);
  });
});
