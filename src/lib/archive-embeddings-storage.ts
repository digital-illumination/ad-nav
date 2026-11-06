import { createHash } from "node:crypto";
import { clean, getContainer, readItem } from "./cosmos";

/**
 * Cosmos DB index of archive-tier embeddings.
 *
 * One item per archive markdown file in `adam-corpus`. Shape mirrors
 * `journal_embeddings`: JSON number array, sha256-of-path item id, derived
 * view over the markdown source-of-truth in adam-corpus. The backfill script
 * (scripts/backfill-archive-embeddings.mjs) regenerates the collection if it
 * drifts.
 *
 * Distinct from the journal index because archive entries are a different
 * shape (raw substrate vs distilled signal) and may be queried with a
 * different mindset. Same storage pattern, separate container.
 */

const COLLECTION = "archive_embeddings";

export const ARCHIVE_KINDS = ["voice-memo", "note", "interview", "meeting", "other"] as const;
export type ArchiveKind = (typeof ARCHIVE_KINDS)[number];

export interface StoredArchiveEmbedding {
  path: string;
  timestamp: string;
  kind: ArchiveKind;
  source?: string;
  agent: string;
  preview: string;
  embedding: number[];
  created_at: number;
}

function docIdForPath(path: string): string {
  return createHash("sha256").update(path).digest("hex");
}

export async function upsertArchiveEmbedding(params: {
  path: string;
  timestamp: string;
  kind: ArchiveKind;
  source?: string;
  agent: string;
  preview: string;
  embedding: number[] | Float32Array;
}): Promise<void> {
  const doc: StoredArchiveEmbedding = {
    path: params.path,
    timestamp: params.timestamp,
    kind: params.kind,
    source: params.source,
    agent: params.agent,
    preview: params.preview,
    embedding: Array.from(params.embedding),
    created_at: Date.now(),
  };
  await getContainer(COLLECTION).items.upsert({ ...doc, id: docIdForPath(params.path) });
}

export async function getArchiveEmbedding(path: string): Promise<StoredArchiveEmbedding | null> {
  return readItem<StoredArchiveEmbedding>(COLLECTION, docIdForPath(path));
}

export async function listArchiveEmbeddings(): Promise<StoredArchiveEmbedding[]> {
  const { resources } = await getContainer(COLLECTION)
    .items.readAll<Record<string, unknown>>()
    .fetchAll();
  return resources.map((r) => clean<StoredArchiveEmbedding>(r));
}
