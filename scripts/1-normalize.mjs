import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';

// Stage 1 - flatten the ChatGPT export into one record per conversation.
// Deterministic, no model calls, no network. Everything downstream reads this
// instead of re-parsing 120MB of export JSON.
//
//   node scripts/1-normalize.mjs

const EXPORT_DIR = 'src/data/07312026-chatgpt-data-export';
const OUT = 'scripts/.cache/normalized.json';

mkdirSync('scripts/.cache', { recursive: true });

const out = [];
for (const f of readdirSync(EXPORT_DIR).filter((f) => /^conversations-\d+\.json$/.test(f)).sort()) {
  for (const c of JSON.parse(readFileSync(`${EXPORT_DIR}/${f}`, 'utf8'))) {
    const nodes = Object.values(c.mapping || {}).filter((n) => n.message?.author);

    const msgs = nodes
      .filter((n) => n.message.author.role !== 'system')
      .map((n) => ({
        role: n.message.author.role,
        t: n.message.create_time || 0,
        text: (n.message.content?.parts || [])
          .filter((p) => typeof p === 'string')
          .join(' ')
          .trim(),
      }))
      .filter((m) => m.text)
      .sort((a, b) => a.t - b.t);

    const asked = msgs.filter((m) => m.role === 'user');

    out.push({
      id: c.conversation_id || c.id,
      title: (c.title || '').trim() || 'Untitled',
      created: c.create_time ? new Date(c.create_time * 1000).toISOString() : null,
      updated: c.update_time ? new Date(c.update_time * 1000).toISOString() : null,
      messages: msgs.length,
      userMessages: asked.length,
      model: c.default_model_slug || null,
      starred: !!c.is_starred,
      archived: !!c.is_archived,
      opening: asked[0] ? asked[0].text.slice(0, 400) : '',
      // Classification input is what you ASKED, not what the model answered.
      askText: asked.map((m) => m.text).join(' \n').slice(0, 2000),
    });
  }
}

writeFileSync(OUT, JSON.stringify(out));
console.log(`${out.length} conversations -> ${OUT}`);
console.log(`  single-turn: ${out.filter((c) => c.userMessages <= 1).length}`);
console.log(`  median messages: ${out.map((c) => c.messages).sort((a, b) => a - b)[Math.floor(out.length / 2)]}`);
