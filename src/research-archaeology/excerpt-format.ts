export type InlineSegment = {
  type: 'text' | 'strong' | 'code';
  text: string;
};

export type ExcerptBlock =
  | { type: 'paragraph'; content: InlineSegment[] }
  | { type: 'heading'; level: number; content: InlineSegment[] }
  | { type: 'unordered-list'; items: InlineSegment[][] }
  | { type: 'ordered-list'; items: InlineSegment[][] }
  | { type: 'code-block'; language?: string; text: string };

const parseInline = (value: string): InlineSegment[] => {
  const segments: InlineSegment[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let cursor = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      segments.push({ type: 'text', text: value.slice(cursor, index) });
    }
    const token = match[0];
    segments.push(
      token.startsWith('**')
        ? { type: 'strong', text: token.slice(2, -2) }
        : { type: 'code', text: token.slice(1, -1) },
    );
    cursor = index + token.length;
  }

  if (cursor < value.length) {
    segments.push({ type: 'text', text: value.slice(cursor) });
  }
  return segments.length > 0 ? segments : [{ type: 'text', text: value }];
};

export function parseExcerpt(value: string): ExcerptBlock[] {
  const blocks: ExcerptBlock[] = [];
  const lines = value.split('\n');
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({
      type: 'paragraph',
      content: parseInline(paragraph.join('\n')),
    });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(/^```([^\s`]*)\s*$/);
    if (fence) {
      flushParagraph();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push({
        type: 'code-block',
        ...(fence[1] ? { language: fence[1] } : {}),
        text: code.join('\n'),
      });
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        content: parseInline(heading[2]),
      });
      continue;
    }

    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      const previous = blocks.at(-1);
      const item = parseInline(unordered[1]);
      if (previous?.type === 'unordered-list') previous.items.push(item);
      else blocks.push({ type: 'unordered-list', items: [item] });
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      const previous = blocks.at(-1);
      const item = parseInline(ordered[1]);
      if (previous?.type === 'ordered-list') previous.items.push(item);
      else blocks.push({ type: 'ordered-list', items: [item] });
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();
  return blocks;
}
