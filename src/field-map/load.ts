import { fieldMapFixture } from './field-map-fixture';
import type { FieldMapData } from './types';

type LoadFieldMapDataOptions = {
  privateDataUrl?: string;
  fetchData?: (url: string) => Promise<FieldMapData>;
};

async function fetchFieldMapData(url: string): Promise<FieldMapData> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Unable to load private field map data: ${response.status}`);
  }
  return (await response.json()) as FieldMapData;
}

/**
 * The one boundary in the build. It now returns the real extraction output
 * produced by scripts/4-classify.mjs; before that it returned seed fixtures.
 * Nothing downstream knows or cares which — the shape is the contract.
 *
 * The tracked default is anonymized fixture data, so a clean clone can run,
 * test, and build without access to private research history.
 */
export async function loadFieldMapData(
  options: LoadFieldMapDataOptions = {},
): Promise<FieldMapData> {
  if (!options.privateDataUrl) return assertConsistent(fieldMapFixture);

  const data = await (options.fetchData ?? fetchFieldMapData)(options.privateDataUrl);
  return assertConsistent(data);
}

/**
 * A conversation citing a topic the file never declares is a broken file. The
 * stats module would drop the id and carry on, which shrinks a topic's count,
 * shrinks every `expected` it appears in, and can erase a gap from the panel —
 * a wrong answer that looks exactly like a right one. Fail here instead, once,
 * naming the ids.
 */
export function assertConsistent(data: FieldMapData): FieldMapData {
  const declared = new Set(data.topics.map((t) => t.id));
  const unknown = [
    ...new Set(data.conversations.flatMap((c) => c.topicIds)),
  ].filter((id) => !declared.has(id));

  if (unknown.length > 0) {
    throw new Error(
      `Field map data is inconsistent: conversations cite undeclared topic ids: ${unknown.join(', ')}`,
    );
  }
  return data;
}
