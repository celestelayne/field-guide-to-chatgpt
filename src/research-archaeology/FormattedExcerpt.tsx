import { parseExcerpt, type InlineSegment } from './excerpt-format';

const renderInline = (segments: InlineSegment[]) =>
  segments.map((segment, index) => {
    const key = `${segment.type}-${index}`;
    if (segment.type === 'strong') return <strong key={key}>{segment.text}</strong>;
    if (segment.type === 'code') return <code key={key}>{segment.text}</code>;
    return <span key={key}>{segment.text}</span>;
  });

export function FormattedExcerpt({ text }: { text: string }) {
  return parseExcerpt(text).map((block, index) => {
    const key = `${block.type}-${index}`;

    if (block.type === 'code-block') {
      return (
        <div className="ra-code-block" key={key}>
          {block.language && <span>{block.language}</span>}
          <pre><code>{block.text}</code></pre>
        </div>
      );
    }

    if (block.type === 'unordered-list' || block.type === 'ordered-list') {
      const List = block.type === 'unordered-list' ? 'ul' : 'ol';
      return (
        <List key={key}>
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </List>
      );
    }

    if (block.type === 'heading') {
      return (
        <div
          aria-level={block.level}
          className={`ra-excerpt-heading ra-excerpt-heading-${block.level}`}
          key={key}
          role="heading"
        >
          {renderInline(block.content)}
        </div>
      );
    }

    return <p key={key}>{renderInline(block.content)}</p>;
  });
}
