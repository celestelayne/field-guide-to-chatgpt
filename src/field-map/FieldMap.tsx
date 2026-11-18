import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { loadFieldMapData } from './load';
import { computeFieldMap } from './stats';
import type { Conversation, FieldMapData, Topic } from './types';

/**
 * The Field Map — a React port of the Claude Design canvas
 * "D3 - Field Map · Mission Panel.dc.html", running on the real classified
 * export rather than the canvas's mock store.
 */

const MARKER_COLOR: Record<string, string> = {
  design: '#A8A6FF',
  startup: '#FFC29F',
  teaching: '#B8FF9F',
  career: '#FFA6F6',
  specs: '#8FD9C0',
  ai: '#FFE95C',
  personal: '#FF9F9F',
  code: '#A6FAFF',
};

const FALLBACK_COLOR = '#D8D3C4';
const colorOf = (id: string) => MARKER_COLOR[id] ?? FALLBACK_COLOR;

const up = (s: string) => s.toUpperCase();

const fmtDate = (iso: string) =>
  up(
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  );

const byDateDesc = (a: Conversation, b: Conversation) => b.date.localeCompare(a.date);

/** How often each other marker shares a conversation with this one. */
function neighbours(conversations: Conversation[], id: string) {
  const counts: Record<string, number> = {};
  for (const c of conversations) {
    if (!c.topicIds.includes(id)) continue;
    for (const other of c.topicIds) {
      if (other !== id) counts[other] = (counts[other] ?? 0) + 1;
    }
  }
  return counts;
}

function modelTally(conversations: Conversation[]) {
  const counts: Record<string, number> = {};
  for (const c of conversations) {
    if (c.model) counts[c.model] = (counts[c.model] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
}

type Selection =
  | { kind: 'topic'; id: string }
  | { kind: 'convo'; id: string }
  | null;

export function FieldMap() {
  const [data, setData] = useState<FieldMapData | null>(null);
  const [sel, setSel] = useState<Selection>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [allTopics, setAllTopics] = useState(false);
  const [box, setBox] = useState({ w: 560, h: 440 });
  const canvas = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const privateDataUrl =
      import.meta.env.DEV && import.meta.env.VITE_USE_PRIVATE_RESEARCH_DATA === 'true'
        ? '/__private/field-map-data.json'
        : undefined;

    loadFieldMapData({ privateDataUrl }).then(setData);
  }, []);

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) =>
      setBox({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  if (!data) {
    return (
      <div className="fm-root">
        <header className="fm-head">
          <span className="fm-logo">THE FIELD MAP</span>
          <span className="fm-stat">READING EXPORT…</span>
        </header>
      </div>
    );
  }

  if (data.conversations.length === 0) {
    return (
      <div className="fm-root">
        <header className="fm-head">
          <span className="fm-logo">THE FIELD MAP</span>
          <span className="fm-stat">PRIVATE DATA NOT LOADED</span>
        </header>
        <main className="fm-centre">
          <div className="fm-panel-pad">
            <div className="fm-kicker">LOCAL RESEARCH ONLY</div>
            <h1 className="fm-title-xl">YOUR RESEARCH HISTORY STAYS PRIVATE</h1>
            <p>
              Personal conversation data is available only in local development and is
              excluded from production builds.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const { conversations } = data;
  // 1127 conversations across 8 markers is sub-millisecond; recompute freely.
  const map = computeFieldMap(data.topics, conversations);
  const ordered = map.topics;
  const counts = map.counts;
  const maxCount = Math.max(...ordered.map((t) => counts[t.id]), 1);

  const searching = q.trim().length > 0;
  const selectedTopic: Topic | undefined =
    sel?.kind === 'topic' ? ordered.find((t) => t.id === sel.id) : undefined;
  const selectedConvo =
    sel?.kind === 'convo' ? conversations.find((c) => c.id === sel.id) : undefined;

  const openTopic = (id: string) => () => {
    setSel({ kind: 'topic', id });
    setQ('');
  };
  const openConvo = (id: string) => () => {
    setSel({ kind: 'convo', id });
    setQ('');
  };
  const reset = () => {
    setSel(null);
    setQ('');
    setHover(null);
  };

  const lit = hover ?? (selectedTopic ? selectedTopic.id : null);

  // --- centre plot geometry, mirroring the canvas ---
  const GAP = 14;
  const plotW = (box.w - 36 - GAP * 2) / 3;
  const plotH = (box.h - 36 - GAP * 2) / 3;
  const maxD = Math.max(44, Math.min(plotW - 8, plotH - 52));

  const shownTopics = allTopics ? ordered : ordered.slice(0, 6);
  const models = modelTally(conversations);
  const maxModel = models.length ? models[0][1] : 1;

  const convosFor = (id: string) =>
    conversations.filter((c) => c.topicIds.includes(id)).sort(byDateDesc);

  const results = searching
    ? {
        topics: ordered.filter((t) => t.label.toLowerCase().includes(q.trim().toLowerCase())),
        conversations: conversations
          .filter((c) => {
            const s = q.trim().toLowerCase();
            return (
              c.title.toLowerCase().includes(s) || c.opening.toLowerCase().includes(s)
            );
          })
          .sort(byDateDesc),
      }
    : { topics: [], conversations: [] };

  const convoRow = (c: Conversation) => (
    <button type="button" key={c.id} className="fm-convo" onClick={openConvo(c.id)}>
      <span
        className="fm-convo-dot"
        style={{ background: c.topicIds[0] ? colorOf(c.topicIds[0]) : 'transparent' }}
      />
      <span className="fm-convo-title">{c.title}</span>
      <span className="fm-convo-date">{fmtDate(c.date)}</span>
    </button>
  );

  return (
    <div className="fm-root">
      <header className="fm-head">
        <button type="button" className="fm-logo" onClick={reset}>
          THE FIELD MAP
        </button>
        <span className="fm-stat">
          {conversations.length} CHATS · {ordered.length} MARKERS · {map.total} TAGGED
        </span>
        <span className="fm-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="SEARCH THE FIELD"
            aria-label="Search the field"
          />
        </span>
      </header>

      <div className="fm-body">
        {/* ---------------- left rail ---------------- */}
        <aside className="fm-rail">
          <div className="fm-rail-head">
            <b>YOUR HISTORY</b>
            <span>{conversations.length} CHATS</span>
          </div>

          <div className="fm-rail-body">
            <div className="fm-sec">
              <span className="fm-sec-label">MODELS</span>
              <span className="fm-sec-count">{models.length} OF MANY</span>
            </div>
            <div className="fm-sec-sub">Which model answered</div>
            <div className="fm-list">
              {models.map(([model, n], i) => (
                <div key={model} className="fm-meter-row" style={{ cursor: 'default' }}>
                  <span className="fm-meter-top">
                    <span className="fm-rank">{String(i + 1).padStart(2, '0')}</span>
                    <span className="fm-meter-name">{model}</span>
                    <span className="fm-meter-count">{n}</span>
                  </span>
                  <span className="fm-bar">
                    <i style={{ width: `${Math.round((n / maxModel) * 100)}%` }} />
                  </span>
                </div>
              ))}
            </div>

            <div className="fm-sec">
              <span className="fm-sec-label">TOP TOPICS</span>
              <span className="fm-sec-count">
                {allTopics ? `ALL ${ordered.length}` : `TOP 6 OF ${ordered.length}`}
              </span>
            </div>
            <div className="fm-sec-sub">What I talk about most</div>
            <div className="fm-list">
              {shownTopics.map((t, i) => {
                const on = selectedTopic?.id === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    className="fm-topic-row"
                    style={{ background: on ? '#000' : 'transparent', color: on ? '#fff' : '#000' }}
                    onClick={openTopic(t.id)}
                    onMouseEnter={() => setHover(t.id)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <span className="fm-rank">{String(i + 1).padStart(2, '0')}</span>
                    <span className="fm-swatch" style={{ background: colorOf(t.id) }} />
                    <span className="fm-topic-name">{up(t.label)}</span>
                    <span
                      className="fm-topic-count"
                      style={{ fontSize: i === 0 ? 19 : i < 3 ? 16 : 14 }}
                    >
                      {counts[t.id]}
                    </span>
                  </button>
                );
              })}
            </div>
            {ordered.length > 6 && (
              <button type="button" className="fm-more" onClick={() => setAllTopics(!allTopics)}>
                {allTopics ? 'SHOW TOP 6 ONLY' : `VIEW ALL ${ordered.length} TOPICS`}
              </button>
            )}
          </div>

          {selectedTopic && (
            <div className="fm-filter">
              <span>FILTERED BY TOPIC · {up(selectedTopic.label)}</span>
              <button type="button" className="fm-clear" onClick={reset}>
                CLEAR ✕
              </button>
            </div>
          )}
        </aside>

        {/* ---------------- centre plot ---------------- */}
        <main className="fm-centre">
          <div className="fm-plot">
            <div className="fm-canvas" ref={canvas}>
              {ordered.map((t) => {
                const active = selectedTopic?.id === t.id;
                const d = Math.max(30, Math.round(maxD * Math.sqrt(counts[t.id] / maxCount)));
                const dim = lit && lit !== t.id ? 0.25 : 1;
                return (
                  <button
                    type="button"
                    key={t.id}
                    className="fm-pin"
                    style={{ gridColumn: active ? 'span 2' : 'span 1', opacity: dim }}
                    onClick={openTopic(t.id)}
                  >
                    <span
                      className="fm-pin-circle"
                      style={{
                        width: d,
                        height: d,
                        background: active ? '#000' : colorOf(t.id),
                        boxShadow: active ? '0 0 0 #000' : '6px 6px 0 #000',
                      }}
                    >
                      <b
                        style={{
                          color: active ? '#fff' : '#000',
                          fontSize: d > 110 ? 30 : d > 80 ? 24 : d > 58 ? 19 : 14,
                        }}
                      >
                        {counts[t.id]}
                      </b>
                    </span>
                    <span className="fm-pin-label">{up(t.label)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="fm-hint">
            {selectedTopic
              ? 'THE OPEN MARKER TAKES TWO PLOTS · ITS NEIGHBOURS SIT IN THE PANEL'
              : 'CIRCLE SIZE = HOW MUCH YOU TALK ABOUT IT · CLICK A MARKER'}
          </div>
        </main>

        {/* ---------------- right panel ---------------- */}
        <aside className="fm-panel">
          {searching ? (
            <div className="fm-panel-pad">
              <div className="fm-kicker" style={{ marginBottom: 10 }}>
                {results.topics.length} TOPICS · {results.conversations.length} CHATS
              </div>
              <h2 className="fm-title-lg">“{q}”</h2>
              <div className="fm-chips">
                {results.topics.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className="fm-chip"
                    style={{ background: colorOf(t.id) }}
                    onClick={openTopic(t.id)}
                  >
                    {up(t.label)} · {counts[t.id]}
                  </button>
                ))}
              </div>
              {results.conversations.slice(0, 60).map(convoRow)}
            </div>
          ) : selectedConvo ? (
            <div>
              <div className="fm-crumbs">
                {selectedConvo.topicIds.map((id) => (
                  <button
                    type="button"
                    key={id}
                    className="fm-crumb"
                    style={{ background: colorOf(id) }}
                    onClick={openTopic(id)}
                  >
                    {up(ordered.find((t) => t.id === id)?.label ?? id)}
                  </button>
                ))}
                <span className="fm-crumb fm-crumb-flat">→ {fmtDate(selectedConvo.date)}</span>
              </div>
              <div className="fm-panel-pad">
                <h2 className="fm-title-lg">{selectedConvo.title}</h2>
                <div className="fm-kicker" style={{ marginBottom: 20, opacity: 0.55 }}>
                  {selectedConvo.messages} MESSAGES
                  {selectedConvo.model ? ` · ${up(selectedConvo.model)}` : ''}
                </div>
                <div className="fm-turn" style={{ background: 'var(--accent)' }}>
                  <div className="fm-turn-label">YOU ASKED</div>
                  <div className="fm-turn-text">{selectedConvo.opening}</div>
                </div>
                <div className="fm-note" style={{ marginTop: 14 }}>
                  ONLY THE OPENING MESSAGE IS IN THE PAYLOAD. THE FULL TRANSCRIPT IS 28.5MB
                  ACROSS 20,177 MESSAGES — IT NEEDS PER-CONVERSATION FILES FETCHED ON DEMAND.
                </div>
              </div>
            </div>
          ) : selectedTopic ? (
            <div>
              <div className="fm-panel-hero" style={{ background: colorOf(selectedTopic.id) }}>
                <div className="fm-kicker">
                  MARKER · RANK #{ordered.indexOf(selectedTopic) + 1}
                </div>
                <h2 className="fm-title-xl">{up(selectedTopic.label)}</h2>
                <div className="fm-bignum">
                  <b>{counts[selectedTopic.id]}</b>
                  <span>
                    CHATS ·{' '}
                    {Math.round((counts[selectedTopic.id] / conversations.length) * 100)}% OF THE
                    FIELD
                  </span>
                </div>
              </div>
              <div className="fm-panel-pad">
                <div className="fm-block">
                  <span className="fm-kicker">NEIGHBOURING MARKERS</span>
                  {(() => {
                    const n = neighbours(conversations, selectedTopic.id);
                    const rows = ordered
                      .filter((t) => t.id !== selectedTopic.id)
                      .map((t) => ({ t, together: n[t.id] ?? 0 }))
                      .sort((a, b) => b.together - a.together);
                    return rows.map(({ t, together }) => (
                      <button
                        type="button"
                        key={t.id}
                        className="fm-neighbour"
                        style={{ background: together ? colorOf(t.id) : '#fff' }}
                        onClick={openTopic(t.id)}
                      >
                        <b>{up(t.label)}</b>
                        <span>{together ? `${together} SHARED` : 'NEVER SHARED'}</span>
                      </button>
                    ));
                  })()}
                </div>

                <div>
                  <span className="fm-kicker" style={{ display: 'block', marginBottom: 10 }}>
                    CONVERSATIONS HERE
                  </span>
                  {convosFor(selectedTopic.id).slice(0, 80).map(convoRow)}
                </div>
              </div>
            </div>
          ) : (
            <div className="fm-panel-pad">
              <div className="fm-kicker-rule">
                <span className="fm-kicker">THE FIELD</span>
                <b>{conversations.length}</b>
              </div>
              <div className="fm-block" style={{ marginTop: 14 }}>
                {[
                  ['TAGGED', `${map.total}`],
                  ['UNTAGGED', `${conversations.length - map.total}`],
                  ['MARKERS', `${ordered.length}`],
                  [
                    'SPAN',
                    `${conversations.map((c) => c.date).sort()[0].slice(0, 7)} → ${conversations
                      .map((c) => c.date)
                      .sort()
                      .slice(-1)[0]
                      .slice(0, 7)}`,
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      padding: '9px 2px',
                      borderBottom: '1px solid #000',
                    }}
                  >
                    <span className="fm-kicker" style={{ opacity: 0.55 }}>
                      {label}
                    </span>
                    <span style={{ fontFamily: 'var(--display)', fontSize: 17 }}>{value}</span>
                  </div>
                ))}
              </div>

              <span className="fm-kicker" style={{ display: 'block', marginBottom: 10 }}>
                MOST RECENT
              </span>
              {[...conversations].sort(byDateDesc).slice(0, 25).map(convoRow)}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
