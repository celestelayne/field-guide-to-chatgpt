import { useEffect, useMemo, useState } from 'react';
import { FormattedExcerpt } from './FormattedExcerpt';
import { loadArchaeologyReport } from './load';
import type {
  ArchaeologyReport,
  Evidence,
  EvidenceBackedItem,
  TimelineEvent,
} from './types';

type ResearchArchaeologyProps = {
  onOpenFieldMap: () => void;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const authorLabel = (author: Evidence['author']) =>
  author === 'user' ? 'Your words' : author === 'assistant' ? 'Assistant' : 'External source';

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  const authors = [...new Set(evidence.map((item) => authorLabel(item.author)))];

  return (
    <details className="ra-evidence">
      <summary>
        <span>{evidence.length} {evidence.length === 1 ? 'citation' : 'citations'}</span>
        <span>{authors.join(' + ')}</span>
      </summary>
      <div className="ra-evidence-list">
        {evidence.map((item, index) => (
          <article className="ra-excerpt" key={`${item.conversationId}/${item.messageId}`}>
            <div className="ra-excerpt-meta">
              <b>{String(index + 1).padStart(2, '0')} · {authorLabel(item.author)}</b>
              <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
            </div>
            <blockquote><FormattedExcerpt text={item.excerpt} /></blockquote>
            <code className="ra-source-id">{item.conversationId} / {item.messageId}</code>
          </article>
        ))}
      </div>
    </details>
  );
}

function SectionHeader({ number, title, count }: { number: string; title: string; count?: number }) {
  return (
    <header className="ra-section-head">
      <span>{number}</span>
      <h2>{title}</h2>
      {count !== undefined && <b>{String(count).padStart(2, '0')}</b>}
    </header>
  );
}

function FindingCard({ item, index }: { item: EvidenceBackedItem; index: number }) {
  return (
    <article
      className={`ra-finding${index % 3 === 2 ? ' ra-finding-tint' : ''}`}
      style={{ order: index }}
    >
      <div className="ra-card-index">F{String(index + 1).padStart(2, '0')}</div>
      <p>{item.text}</p>
      <div className="ra-confidence">Reviewed · {Math.round(item.confidence * 100)}% confidence</div>
      <EvidenceList evidence={item.evidence} />
    </article>
  );
}

const recommendedNextStep = (checkpoint: string) => {
  const match = checkpoint.match(/Resume by (.+)$/s);
  if (!match) return checkpoint;
  return match[1].charAt(0).toUpperCase() + match[1].slice(1);
};

const timelinePreview = (timeline: TimelineEvent[], expanded: boolean) => {
  if (expanded || timeline.length <= 8) return timeline;
  return [...timeline.slice(0, 4), null, ...timeline.slice(-4)] as const;
};

const reportEvidence = (report: ArchaeologyReport) => [
  ...report.checkpoint.evidence,
  ...report.findings.flatMap((item) => item.evidence),
  ...report.decisions.flatMap((item) => item.evidence),
  ...report.rejectedDirections.flatMap((item) => item.evidence),
  ...report.openQuestions.flatMap((item) => item.evidence),
  ...report.timeline.flatMap((item) => item.evidence),
];

export function ResearchArchaeology({ onOpenFieldMap }: ResearchArchaeologyProps) {
  const [report, setReport] = useState<ArchaeologyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  useEffect(() => {
    const privateDataUrl =
      import.meta.env.DEV && import.meta.env.VITE_USE_PRIVATE_RESEARCH_DATA === 'true'
        ? '/__private/archaeology-report.json'
        : undefined;

    loadArchaeologyReport({ privateDataUrl }).then(setReport).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load report');
    });
  }, []);

  const evidenceBySource = useMemo(() => {
    if (!report) return new Map<string, Evidence[]>();
    const grouped = new Map<string, Map<string, Evidence>>();
    for (const evidence of reportEvidence(report)) {
      const source = grouped.get(evidence.conversationId) ?? new Map<string, Evidence>();
      source.set(evidence.messageId, evidence);
      grouped.set(evidence.conversationId, source);
    }
    return new Map(
      [...grouped].map(([conversationId, evidence]) => [
        conversationId,
        [...evidence.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      ]),
    );
  }, [report]);

  if (error) {
    return (
      <main className="ra-root ra-state">
        <p className="ra-eyebrow">Research Archaeology</p>
        <h1>The report could not be loaded.</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="ra-root ra-state" aria-busy="true">
        <p className="ra-eyebrow">Research Archaeology</p>
        <h1>Reconstructing your last known state…</h1>
      </main>
    );
  }

  const sourceDates = report.sources.flatMap((source) => [source.createdAt, source.updatedAt]).sort();
  const conclusionCount =
    report.findings.length +
    report.decisions.length +
    report.rejectedDirections.length +
    report.openQuestions.length +
    1;
  const visibleTimeline = timelinePreview(report.timeline, showAllTimeline);
  const findingColumns = [0, 1].map((column) =>
    report.findings
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => index % 2 === column),
  );

  return (
    <main className="ra-root">
      <nav className="ra-nav" aria-label="Primary navigation">
        <a href="#top" className="ra-brand">Field Guide / <b>Research Archaeology</b></a>
        <button type="button" onClick={onOpenFieldMap}>Open Field Map <span aria-hidden="true">→</span></button>
      </nav>

      {report.reviewStatus === 'draft' && (
        <div className="ra-draft-notice" role="status">
          <b>Draft pilot</b>
          <span>Conclusions and adjacent conversations are awaiting your review.</span>
        </div>
      )}

      <header className="ra-masthead" id="top">
        <div>
          <p className="ra-eyebrow">Recovered idea · {report.idea.id}</p>
          <h1>{report.idea.title}</h1>
          <p className="ra-scope">{report.idea.scope}</p>
        </div>
        <dl className="ra-metrics">
          <div><dt>Date range</dt><dd>{formatDate(sourceDates[0])}—{formatDate(sourceDates.at(-1) ?? sourceDates[0])}</dd></div>
          <div><dt>Sources</dt><dd>{String(report.sources.length).padStart(2, '0')} conversations</dd></div>
          <div><dt>Conclusions</dt><dd>{String(conclusionCount).padStart(2, '0')} evidence-backed</dd></div>
        </dl>
      </header>

      <section className="ra-checkpoint">
        <div className="ra-checkpoint-main">
          <SectionHeader number="01" title="Where you left off" />
          <p>{report.checkpoint.text}</p>
          <EvidenceList evidence={report.checkpoint.evidence} />
        </div>
        <aside className="ra-resume">
          <p className="ra-eyebrow">Resume here</p>
          <h2>{recommendedNextStep(report.checkpoint.text)}</h2>
          <ol>
            {report.openQuestions.slice(0, 3).map((question) => <li key={question.id}>{question.text}</li>)}
          </ol>
        </aside>
      </section>

      <section className="ra-section">
        <SectionHeader number="02" title="What you already know" count={report.findings.length} />
        <div className="ra-findings-grid">
          {findingColumns.map((column, columnIndex) => (
            <div className="ra-findings-column" key={columnIndex}>
              {column.map(({ item, index }) => (
                <FindingCard key={item.id} item={item} index={index} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="ra-split-section">
        <div className="ra-section ra-decisions">
          <SectionHeader number="03" title="Decisions" count={report.decisions.length} />
          <div className="ra-item-list">
            {report.decisions.map((item, index) => (
              <article className="ra-list-item" key={item.id}>
                <span>✓</span>
                <div><b>{String(index + 1).padStart(2, '0')}</b><p>{item.text}</p><EvidenceList evidence={item.evidence} /></div>
              </article>
            ))}
          </div>
        </div>
        <div className="ra-section ra-rejected">
          <SectionHeader number="03B" title="Rejected directions" count={report.rejectedDirections.length} />
          <div className="ra-item-list">
            {report.rejectedDirections.map((item, index) => (
              <article className="ra-list-item" key={item.id}>
                <span>×</span>
                <div><b>{String(index + 1).padStart(2, '0')}</b><p>{item.text}</p><EvidenceList evidence={item.evidence} /></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ra-section ra-questions">
        <SectionHeader number="04" title="What remains unresolved" count={report.openQuestions.length} />
        <ol>
          {report.openQuestions.map((item) => (
            <li key={item.id}>
              <p>{item.text}</p>
              <EvidenceList evidence={item.evidence} />
            </li>
          ))}
        </ol>
      </section>

      <section className="ra-section ra-timeline">
        <SectionHeader number="05" title="How the idea evolved" count={report.timeline.length} />
        <div className="ra-timeline-list">
          {visibleTimeline.map((event, index) =>
            event ? (
              <article key={`${event.createdAt}/${event.text}`}>
                <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
                <span aria-hidden="true" />
                <div>
                  <div className="ra-timeline-question">
                    <FormattedExcerpt text={event.text} />
                  </div>
                  <p className="ra-timeline-annotation">{event.annotation}</p>
                  <EvidenceList evidence={event.evidence} />
                </div>
              </article>
            ) : (
              <div className="ra-timeline-gap" key={`gap-${index}`}>· · ·</div>
            ),
          )}
        </div>
        {report.timeline.length > 8 && (
          <button className="ra-text-button" type="button" onClick={() => setShowAllTimeline((value) => !value)}>
            {showAllTimeline ? 'Show condensed timeline' : `Show all ${report.timeline.length} events`}
          </button>
        )}
      </section>

      <section className="ra-section ra-sources">
        <SectionHeader number="06" title="Original evidence" count={report.sources.length} />
        {report.sources.map((source, index) => {
          const evidence = evidenceBySource.get(source.conversationId) ?? [];
          return (
            <details key={source.conversationId}>
              <summary>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <b>{source.title}</b>
                <span>{source.messageCount} messages · {evidence.length} cited</span>
                <span>Expand</span>
              </summary>
              <div className="ra-source-body">
                <code>{source.conversationId}</code>
                <EvidenceList evidence={evidence} />
              </div>
            </details>
          );
        })}
      </section>

      <footer className="ra-footer">
        <b>Research Archaeology</b>
        <span>Pick up where you left off without repeating your research.</span>
      </footer>
    </main>
  );
}
