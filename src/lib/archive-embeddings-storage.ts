import { createHash } from "node:crypto";
import { getFirestore } from "./firestore";

/**
 * Firestore-backed index of archive-tier embeddings.
 *
 * One Firestore doc per archive markdown file in `adam-corpus`. Shape mirrors
 * `journal_embeddings`: native number array, sha256-of-path doc id, derived
 * view over the markdown source-of-truth in adam-corpus. The backfill script
 * (scripts/backfill-archive-embeddings.mjs) regenerates the collection if it
 * drifts.
 *
 * Distinct from the journal index because archive entries are a different
 * shape (raw substrate vs distilled signal) and may be queried with a
 * different mindset. Same Firestore patterns, separate scope.
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
  await getFirestore().collection(COLLECTION).doc(docIdForPath(params.path)).set(doc);
}

export async function getArchiveEmbedding(path: string): Promise<StoredArchiveEmbedding | null> {
  const snap = await getFirestore().collection(COLLECTION).doc(docIdForPath(path)).get();
  if (!snap.exists) return null;
  return snap.data() as StoredArchiveEmbedding;
}

export async function listArchiveEmbeddings(): Promise<StoredArchiveEmbedding[]> {
  const snap = await getFirestore().collection(COLLECTION).get();
  return snap.docs.map((d) => d.data() as StoredArchiveEmbedding);
}
