import fs from "node:fs";
import path from "node:path";

/**
 * Embedding helpers and canonical-corpus index loader.
 *
 * The canonical corpus is embedded at build time by
 * scripts/build-canonical-embeddings.mjs, which writes its output to
 * content/context/embeddings.json. That file is committed; the server reads
 * it at module load.
 *
 * Embedding values are stored as base64-encoded float32 arrays to keep the
 * file size reasonable (about 8KB per paragraph instead of ~18KB as JSON
 * arrays at full precision). At ~200 paragraphs that's ~1.6MB total.
 *
 * If the file is missing (build script hasn't run since the context was last
 * edited) or the model fingerprint doesn't match, search_context degrades to
 * keyword-only retrieval and logs a warning. Likewise, if OPENAI_API_KEY is
 * unset on the server, query embedding is skipped and hybrid search
 * collapses to its keyword half.
 */

export const EMBED_MODEL = "text-embedding-3-small";
export const EMBED_DIM = 1536;

export interface ParagraphEmbedding {
  file: string;
  title: string;
  paragraph_index: number;
  text: string;
  hash: string;
  embedding: Float32Array;
}

interface SerializedParagraph {
  file: string;
  title: string;
  paragraph_index: number;
  text: string;
  hash: string;
  embedding: string; // base64 float32
}

interface SerializedIndex {
  model: string;
  dim: number;
  generated_at: string;
  items: SerializedParagraph[];
}

const EMBEDDING_FILE = path.join(process.cwd(), "content", "context", "embeddings.json");

let cachedIndex: ParagraphEmbedding[] | null | undefined;

export function decodeEmbedding(b64: string): Float32Array {
  const bin = Buffer.from(b64, "base64");
  const out = new Float32Array(bin.byteLength / 4);
  for (let i = 0; i < out.length; i++) {
    out[i] = bin.readFloatLE(i * 4);
  }
  return out;
}

export function encodeEmbedding(arr: number[] | Float32Array): string {
  const buf = Buffer.alloc(arr.length * 4);
  for (let i = 0; i < arr.length; i++) {
    buf.writeFloatLE(arr[i], i * 4);
  }
  return buf.toString("base64");
}

export function getCanonicalEmbeddings(): ParagraphEmbedding[] | null {
  if (cachedIndex !== undefined) return cachedIndex;

  try {
    const raw = fs.readFileSync(EMBEDDING_FILE, "utf-8");
    const parsed = JSON.parse(raw) as SerializedIndex;
    if (parsed.model !== EMBED_MODEL || parsed.dim !== EMBED_DIM) {
      console.warn(
        `[embeddings] index fingerprint mismatch (got ${parsed.model}/${parsed.dim}, expected ${EMBED_MODEL}/${EMBED_DIM}); ignoring.`
      );
      cachedIndex = null;
      return null;
    }
    cachedIndex = parsed.items.map((item) => ({
      file: item.file,
      title: item.title,
      paragraph_index: item.paragraph_index,
      text: item.text,
      hash: item.hash,
      embedding: decodeEmbedding(item.embedding),
    }));
    return cachedIndex;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(
        `[embeddings] no canonical embedding index at ${EMBEDDING_FILE}; search_context will run keyword-only.`
      );
    } else {
      console.warn(`[embeddings] failed to load ${EMBEDDING_FILE}:`, err);
    }
    cachedIndex = null;
    return null;
  }
}

interface OpenAIEmbeddingResponse {
  data: { embedding: number[]; index: number }[];
}

/**
 * Embed a single query string via the OpenAI embeddings API. Returns null on
 * any failure (missing key, network error, non-2xx response). The caller is
 * expected to fall back to keyword-only retrieval rather than surface this
 * to the agent — embedding is an enhancement, not a hard dependency.
 */
export async function embedQuery(text: string): Promise<Float32Array | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: text }),
    });
    if (!res.ok) {
      console.warn(`[embeddings] OpenAI ${res.status}: ${await res.text()}`);
      return null;
    }
    const json = (await res.json()) as OpenAIEmbeddingResponse;
    const vec = json.data[0]?.embedding;
    if (!vec) return null;
    return new Float32Array(vec);
  } catch (err) {
    console.warn("[embeddings] OpenAI request failed:", err);
    return null;
  }
}

/**
 * Cosine similarity between two equal-length vectors. text-embedding-3-small
 * returns unit-norm vectors, so this is effectively a dot product, but we
 * compute the full cosine in case the underlying model is swapped later.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

/**
 * Reciprocal Rank Fusion. Takes multiple ranked lists of opaque ids and
 * returns a single merged ranking by summed reciprocal-rank score. k=60 is
 * the canonical constant from the original RRF paper. Stable across the
 * input lists' relative score scales — that's the whole point: keyword
 * scores and cosine similarities aren't comparable, but their ranks are.
 */
export function reciprocalRankFusion(
  lists: string[][],
  options: { k?: number; topN?: number } = {}
): string[] {
  const k = options.k ?? 60;
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, idx) => {
      const rank = idx + 1;
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
    });
  }
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const top = options.topN ? sorted.slice(0, options.topN) : sorted;
  return top.map(([id]) => id);
}
