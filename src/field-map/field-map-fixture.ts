import type { FieldMapData } from './types';

export const fieldMapFixture: FieldMapData = {
  topics: [
    { id: 'ideas', label: 'Ideas' },
    { id: 'research', label: 'Research' },
    { id: 'decisions', label: 'Decisions' },
  ],
  conversations: [
    {
      id: 'fixture-research-session',
      title: 'Explore a research question',
      date: '2026-01-04T15:00:00.000Z',
      topicIds: ['ideas', 'research'],
      messages: 6,
      model: null,
      opening: 'What have I already learned about this idea?',
    },
    {
      id: 'fixture-review-findings',
      title: 'Review earlier findings',
      date: '2026-01-03T15:00:00.000Z',
      topicIds: ['research'],
      messages: 4,
      model: null,
      opening: 'Help me understand the useful findings from this research.',
    },
    {
      id: 'fixture-record-decision',
      title: 'Record a project decision',
      date: '2026-01-02T15:00:00.000Z',
      topicIds: ['decisions'],
      messages: 3,
      model: null,
      opening: 'I decided to test the smallest version first.',
    },
    {
      id: 'fixture-untagged-note',
      title: 'Unsorted note',
      date: '2026-01-01T15:00:00.000Z',
      topicIds: [],
      messages: 2,
      model: null,
      opening: 'Save this thought for later.',
    },
  ],
};
