import { describe, expect, it } from 'vitest';
import { parseExcerpt } from './excerpt-format';

describe('parseExcerpt', () => {
  it('renders Markdown bullets and emphasis as structured content', () => {
    expect(
      parseExcerpt(
        '- **ADR-004 (COMP-001):** Named exports. One component per file. Inline props type.',
      ),
    ).toEqual([
      {
        type: 'unordered-list',
        items: [
          [
            { type: 'strong', text: 'ADR-004 (COMP-001):' },
            {
              type: 'text',
              text: ' Named exports. One component per file. Inline props type.',
            },
          ],
        ],
      },
    ]);
  });

  it('preserves fenced code with its language label', () => {
    expect(
      parseExcerpt('Example:\n\n```ts\nconst answer = 42;\n```'),
    ).toEqual([
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Example:' }],
      },
      {
        type: 'code-block',
        language: 'ts',
        text: 'const answer = 42;',
      },
    ]);
  });
});
