import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const roleLabel = (role) =>
  role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Unknown';

export function renderRetrievalReview(retrieval) {
  const ideaIdJson = JSON.stringify(retrieval.ideaId).replaceAll('<', '\\u003c');
  const cards = retrieval.candidates
    .map((candidate, index) => {
      const score = candidate.score === null ? 'manifest override' : candidate.score.toFixed(4);
      const checked = (status) =>
        candidate.reviewStatus === status ? ' checked' : '';
      const matches = candidate.matchedChunks.slice(0, 5).map(
        (match) => `
          <div class="evidence">
            <div class="meta">
              <span class="author ${escapeHtml(match.role)}">${escapeHtml(roleLabel(match.role))}</span>
              <time datetime="${escapeHtml(match.createdAt ?? 'Unknown date')}">${escapeHtml(match.createdAt ?? 'Unknown date')}</time>
              <strong>match ${escapeHtml(match.score.toFixed(4))}</strong>
            </div>
            <blockquote>${escapeHtml(match.text)}</blockquote>
            <code>${escapeHtml(match.messageId)}</code>
          </div>`,
      );

      return `
        <article class="candidate ${escapeHtml(candidate.reviewStatus)}">
          <header>
            <div>
              <span class="rank">${index + 1}</span>
              <span class="status">${escapeHtml(candidate.reviewStatus)}</span>
            </div>
            <h2>${escapeHtml(candidate.title)}</h2>
            <p class="score">Conversation score: ${escapeHtml(score)}</p>
            ${candidate.overrideReason ? `<p class="reason">${escapeHtml(candidate.overrideReason)}</p>` : ''}
            <code>${escapeHtml(candidate.conversationId)}</code>
          </header>
          <div class="review-choice" aria-label="Review choice">
            <label><input type="radio" name="${escapeHtml(candidate.conversationId)}"${checked('included')}> Include</label>
            <label><input type="radio" name="${escapeHtml(candidate.conversationId)}"${checked('excluded')}> Exclude</label>
            <label><input type="radio" name="${escapeHtml(candidate.conversationId)}"${checked('candidate')}> Unsure</label>
          </div>
          <details ${candidate.reviewStatus === 'candidate' ? 'open' : ''}>
            <summary>${matches.length} top matched excerpts</summary>
            ${matches.join('') || '<p class="empty">No semantic match; added by the reviewed manifest.</p>'}
          </details>
        </article>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Research retrieval review — ${escapeHtml(retrieval.ideaId)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #22211e; background: #f1eee7; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { width: min(980px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 96px; }
    .private { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #312b27; color: #fff; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 18px 0 12px; font-family: Georgia, serif; font-size: clamp(38px, 7vw, 64px); line-height: 1; }
    .intro { max-width: 760px; margin-bottom: 40px; color: #5f5a51; font-size: 18px; line-height: 1.6; }
    .candidate { margin-bottom: 22px; overflow: hidden; border: 1px solid #d8d1c4; border-radius: 14px; background: #fff; box-shadow: 0 8px 24px rgb(45 38 29 / 5%); }
    .candidate > header { padding: 22px; }
    .candidate h2 { margin: 10px 0 6px; font-size: 24px; }
    .rank, .status { display: inline-block; margin-right: 8px; padding: 4px 8px; border-radius: 999px; background: #ebe6dc; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .included .status { background: #dce9dd; color: #24442a; }
    .excluded .status { background: #f0deda; color: #6b2f28; }
    .score, .reason { margin: 6px 0; color: #625e55; }
    code { overflow-wrap: anywhere; color: #777168; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .review-choice { display: flex; flex-wrap: wrap; gap: 18px; padding: 14px 22px; border-block: 1px solid #e5dfd3; background: #fbf9f4; }
    details { padding: 16px 22px 22px; }
    summary { cursor: pointer; font-weight: 700; }
    .evidence { margin-top: 16px; padding: 18px; border-radius: 10px; background: #f7f4ed; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; color: #716d64; font-size: 13px; }
    .author { padding: 4px 8px; border-radius: 999px; background: #e6e1d6; color: #39362f; font-weight: 700; }
    .author.user { background: #dce9dd; color: #24442a; }
    .author.assistant { background: #e0e4ef; color: #303d60; }
    blockquote { margin: 14px 0; padding-left: 14px; border-left: 3px solid #c5bba8; font-family: Georgia, serif; line-height: 1.6; white-space: pre-wrap; }
    .empty { color: #777168; font-style: italic; }
    button { margin: 0 0 28px; padding: 11px 16px; border: 0; border-radius: 8px; background: #312b27; color: #fff; cursor: pointer; font: inherit; font-weight: 700; }
    button:hover { background: #4a4039; }
    @media print { :root { background: #fff; } main { width: 100%; padding: 0; } .candidate { break-inside: avoid; box-shadow: none; } }
  </style>
</head>
<body>
  <main>
    <span class="private">Private review</span>
    <h1>Research retrieval candidates</h1>
    <p class="intro">Review each conversation against its top verbatim semantic matches. Mark whether it belongs to the personal vintage-shopping research thread. Existing manifest decisions are labeled included or excluded; unchecked candidates still require review.</p>
    <button id="export-decisions" type="button">Download review decisions</button>
    ${cards}
  </main>
  <script>
    const ideaId = ${ideaIdJson};
    const storageKey = 'retrieval-review:' + ideaId;
    const statusFromInput = (input) => ({
      Include: 'included',
      Exclude: 'excluded',
      Unsure: 'candidate',
    })[input.parentElement.textContent.trim()];
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    for (const input of document.querySelectorAll('.review-choice input')) {
      if (saved[input.name] === statusFromInput(input)) input.checked = true;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        saved[input.name] = statusFromInput(input);
        localStorage.setItem(storageKey, JSON.stringify(saved));
      });
    }
    document.querySelector('#export-decisions').addEventListener('click', () => {
      const decisions = {};
      for (const input of document.querySelectorAll('.review-choice input:checked')) {
        decisions[input.name] = statusFromInput(input);
      }
      const payload = JSON.stringify({ schemaVersion: 1, ideaId, decisions }, null, 2);
      const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = ideaId + '-retrieval-decisions.json';
      link.click();
      URL.revokeObjectURL(url);
    });
  </script>
</body>
</html>`;
}

export function writeRetrievalReview({ retrieval, outputFile }) {
  const html = renderRetrievalReview(retrieval);
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${html}\n`);
  return { candidates: retrieval.candidates.length };
}
