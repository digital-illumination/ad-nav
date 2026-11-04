import { createHash } from "node:crypto";
import { clean, getContainer, readItem } from "./cosmos";

/**
 * Cosmos DB index of journal-entry embeddings.
 *
 * One item per per-entry markdown file in `adam-corpus`. The embedding is
 * stored as a plain JSON array of numbers (1536 doubles, about 30KB per
 * item, well under the 2MB item limit). At this scale we don't need a vector
 * index: `semantic_search_journal` loads all items and does cosine
 * similarity in process.
 *
 * Item id (and partition key): sha256 of the entry path, which keeps `/`
 * and other awkward characters out of the id.
 *
 * Source of truth is still the markdown in adam-corpus. This container is
 * a derived index: if it's wiped or drifts, the backfill script
 * (scripts/backfill-journal-embeddings.mjs) regenerates it from the source.
 */

const COLLECTION = "journal_embeddings";

export interface StoredJournalEmbedding {
  path: string;
  timestamp: string;
  agent: string;
  preview: string;
  embedding: number[];
  created_at: number;
}

function docIdForPath(path: string): string {
  return createHash("sha256").update(path).digest("hex");
}

export async function upsertJournalEmbedding(params: {
  path: string;
  timestamp: string;
  agent: string;
  preview: string;
  embedding: number[] | Float32Array;
}): Promise<void> {
  const doc: StoredJournalEmbedding = {
    path: params.path,
    timestamp: params.timestamp,
    agent: params.agent,
    preview: params.preview,
    embedding: Array.from(params.embedding),
    created_at: Date.now(),
  };
  await getContainer(COLLECTION).items.upsert({ ...doc, id: docIdForPath(params.path) });
}

export async function getJournalEmbedding(path: string): Promise<StoredJournalEmbedding | null> {
  return readItem<StoredJournalEmbedding>(COLLECTION, docIdForPath(path));
}

export async function listJournalEmbeddings(): Promise<StoredJournalEmbedding[]> {
  const { resources } = await getContainer(COLLECTION)
    .items.readAll<Record<string, unknown>>()
    .fetchAll();
  return resources.map((r) => clean<StoredJournalEmbedding>(r));
}

/**
 * Strip YAML frontmatter from a markdown body so the embedding sees only the
 * substantive content. The same function shape is reproduced in the backfill
 * script (which is a .mjs and can't import this module), so keep them in
 * sync if either changes.
 */
export function stripFrontmatter(md: string): string {
  if (!md.startsWith("---\n")) return md;
  const end = md.indexOf("\n---\n", 4);
  if (end === -1) return md;
  return md.slice(end + 5).trim();
}

/**
 * Build a short, single-line preview for human-readable display alongside
 * the search results. Truncates to ~200 chars, collapses internal whitespace.
 */
export function previewOf(body: string, max = 200): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max - 3)}...`;
}
