import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { validateGroundTruthManifest } from './ground-truth-manifest.mjs';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const roleLabel = (role) =>
  role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Unknown';

export function renderGroundTruthReview(manifest, corpus) {
  const validation = validateGroundTruthManifest(manifest, corpus);
  if (!validation.valid) {
    throw new Error(`Invalid ground-truth manifest:\n${validation.errors.join('\n')}`);
  }

  const conversations = new Map(
    corpus.conversations.map((conversation) => [conversation.id, conversation]),
  );
  const findMessage = (reference) =>
    conversations
      .get(reference.conversationId)
      .messages.find((message) => message.id === reference.messageId);

  const renderEvidence = (reference) => {
    const conversation = conversations.get(reference.conversationId);
    const message = findMessage(reference);
    const role = roleLabel(message.role);
    const timestamp = message.createdAt ?? 'Unknown date';

    return `
      <div class="evidence">
        <div class="evidence-meta">
          <span class="author ${escapeHtml(message.role)}">${escapeHtml(role)}</span>
          <time datetime="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time>
          <span>${escapeHtml(conversation.title)}</span>
        </div>
        <blockquote>${escapeHtml(message.text)}</blockquote>
        <code>${escapeHtml(reference.conversationId)}/${escapeHtml(reference.messageId)}</code>
      </div>`;
  };

  const renderOutcomes = (title, outcomes) => `
    <section>
      <h2>${escapeHtml(title)}</h2>
      ${outcomes
        .map(
          (outcome) => `
        <article class="conclusion">
          <div class="conclusion-heading">
            <h3>${escapeHtml(outcome.text)}</h3>
            ${outcome.id ? `<code>${escapeHtml(outcome.id)}</code>` : ''}
          </div>
          <div class="evidence-list">
            ${outcome.evidence.map(renderEvidence).join('')}
          </div>
        </article>`,
        )
        .join('')}
    </section>`;

  const renderConversationList = (title, conversationsToRender) => `
    <section>
      <h2>${escapeHtml(title)}</h2>
      <div class="coverage-list">
        ${conversationsToRender
          .map(
            (conversation) => `
          <article>
            <h3>${escapeHtml(conversation.title ?? conversation.id)}</h3>
            <p>${escapeHtml(conversation.reason)}</p>
            <code>${escapeHtml(conversation.id)}</code>
          </article>`,
          )
          .join('')}
      </div>
    </section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(manifest.idea.title)} — Ground-truth review</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #20201d; background: #f3f0e8; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { width: min(960px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 96px; }
    header, section { margin-bottom: 48px; }
    .private { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #3f2f28; color: #fff; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    h1 { max-width: 760px; margin: 18px 0 12px; font-family: Georgia, serif; font-size: clamp(38px, 7vw, 64px); line-height: 1; }
    h2 { margin: 0 0 18px; font-size: 14px; letter-spacing: .12em; text-transform: uppercase; }
    h3 { margin: 0; font-size: 21px; line-height: 1.35; }
    p { line-height: 1.6; }
    .scope { max-width: 760px; color: #5d5a52; font-size: 18px; }
    .status { margin-top: 24px; padding: 16px 18px; border-left: 4px solid #b05f3c; background: #fff9ef; }
    .conclusion { margin-bottom: 24px; overflow: hidden; border: 1px solid #d8d2c5; border-radius: 14px; background: #fff; box-shadow: 0 8px 24px rgb(45 38 29 / 5%); }
    .conclusion-heading { display: grid; gap: 10px; padding: 22px; border-bottom: 1px solid #e5dfd3; }
    code { overflow-wrap: anywhere; color: #746f65; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .evidence-list { display: grid; gap: 1px; background: #e5dfd3; }
    .evidence { padding: 20px 22px; background: #fbfaf6; }
    .evidence-meta { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; color: #716d64; font-size: 13px; }
    .author { padding: 4px 8px; border-radius: 999px; background: #e6e1d6; color: #39362f; font-weight: 700; }
    .author.user { background: #dce9dd; color: #24442a; }
    .author.assistant { background: #e0e4ef; color: #303d60; }
    blockquote { margin: 16px 0; padding-left: 16px; border-left: 3px solid #c5bba8; color: #37342e; font-family: Georgia, serif; font-size: 16px; line-height: 1.65; white-space: pre-wrap; }
    .coverage-list { display: grid; gap: 12px; }
    .coverage-list article { padding: 18px 20px; border: 1px solid #d8d2c5; border-radius: 12px; background: #fbfaf6; }
    .coverage-list h3 { font-size: 17px; }
    .coverage-list p { margin: 8px 0; color: #5d5a52; }
    @media print { :root { background: #fff; } main { width: 100%; padding: 0; } .conclusion { break-inside: avoid; box-shadow: none; } }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="private">Private review</span>
      <h1>${escapeHtml(manifest.idea.title)}</h1>
      <p class="scope">${escapeHtml(manifest.idea.scope)}</p>
      <p class="status"><strong>Status:</strong> ${escapeHtml(manifest.review.status)}. Review whether each conclusion is supported by the verbatim evidence directly below it.</p>
    </header>
    ${renderConversationList('Included conversations', manifest.includedConversations)}
    ${renderConversationList('Excluded false positives', manifest.excludedConversations)}
    ${renderOutcomes('Findings', manifest.expected.findings)}
    ${renderOutcomes('Decisions', manifest.expected.decisions)}
    ${renderOutcomes('Rejected directions', manifest.expected.rejectedDirections)}
    ${renderOutcomes('Open questions', manifest.expected.openQuestions)}
    ${renderOutcomes('Where you left off', [manifest.expected.checkpoint])}
  </main>
</body>
</html>`;
}

export function writeGroundTruthReview({ manifest, corpus, outputFile }) {
  const html = renderGroundTruthReview(manifest, corpus);
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${html}\n`);

  const conclusions = [
    ...manifest.expected.findings,
    ...manifest.expected.decisions,
    ...manifest.expected.rejectedDirections,
    ...manifest.expected.openQuestions,
    manifest.expected.checkpoint,
  ];

  return {
    conclusions: conclusions.length,
    evidence: conclusions.reduce(
      (total, conclusion) => total + conclusion.evidence.length,
      0,
    ),
  };
}
