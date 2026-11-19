export const EMBEDDING_DIMENSION = 384;
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';

export async function loadLocalEmbedder() {
  let pipeline;
  let env;
  try {
    ({ pipeline, env } = await import('@xenova/transformers'));
  } catch {
    throw new Error(
      'Missing @xenova/transformers. Run npm install --no-save @xenova/transformers.',
    );
  }
  env.allowLocalModels = false;
  const extract = await pipeline('feature-extraction', EMBEDDING_MODEL);

  return async function embedTexts(
    texts,
    { batchSize = 32, onProgress = () => {} } = {},
  ) {
    const embeddings = new Float32Array(
      texts.length * EMBEDDING_DIMENSION,
    );
    for (let start = 0; start < texts.length; start += batchSize) {
      const batch = texts.slice(start, start + batchSize);
      const result = await extract(batch, {
        pooling: 'mean',
        normalize: true,
      });
      embeddings.set(result.data, start * EMBEDDING_DIMENSION);
      onProgress(Math.min(start + batch.length, texts.length), texts.length);
    }
    return embeddings;
  };
}
