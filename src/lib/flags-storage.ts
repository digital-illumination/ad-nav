import { getFirestore } from "./firestore";
import { newOpaqueToken } from "./oauth";

/**
 * Firestore-backed storage for mid-session flags.
 *
 * Flags are short notes an agent drops during a session to mark something
 * worth keeping. They sit below the journal tier in maturity: cheaper to
 * write, scoped temporally, not source material. At session close the agent
 * recalls flags via `listFlagsForSubject`, weaves their content into a
 * structured journal entry, and passes the consumed ids back to the journal
 * write tool so the flags can be deleted.
 *
 * Collection: `flags`. Single-field index on `subject` is automatic; no
 * composite index needed because expiry filtering is done client-side.
 *
 * Schema fields:
 *   id          — random opaque id, doc id too
 *   subject     — auth subject ("admin" for static-bearer, JWT sub for OAuth)
 *   text        — the observation (capped at FLAG_MAX_LEN by the caller)
 *   kind        — optional category for downstream merging
 *   agent       — optional client name for traceability
 *   created_at  — Date.now() at write time
 *   expires_at  — created_at + FLAG_TTL_MS
 */

const FLAGS = "flags";
const FLAG_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const FLAG_KINDS = ["decision", "preference", "observation", "followup"] as const;
export type FlagKind = (typeof FLAG_KINDS)[number];

export const FLAG_MAX_LEN = 500;

export interface StoredFlag {
  id: string;
  subject: string;
  text: string;
  kind?: FlagKind;
  agent?: string;
  created_at: number;
  expires_at: number;
}

export async function createFlag(params: {
  subject: string;
  text: string;
  kind?: FlagKind;
  agent?: string;
}): Promise<StoredFlag> {
  const id = newOpaqueToken(12);
  const now = Date.now();
  const doc: StoredFlag = {
    id,
    subject: params.subject,
    text: params.text,
    kind: params.kind,
    agent: params.agent,
    created_at: now,
    expires_at: now + FLAG_TTL_MS,
  };
  await getFirestore().collection(FLAGS).doc(id).set(doc);
  return doc;
}

/**
 * List flags belonging to a subject that have not yet expired, oldest first.
 * Filtering by `expires_at` happens in code (not in the query) so we don't
 * need a composite Firestore index. The 24h TTL keeps the per-subject set
 * small enough that this stays cheap.
 */
export async function listFlagsForSubject(subject: string): Promise<StoredFlag[]> {
  const snap = await getFirestore()
    .collection(FLAGS)
    .where("subject", "==", subject)
    .get();

  const now = Date.now();
  return snap.docs
    .map((d) => d.data() as StoredFlag)
    .filter((f) => f.expires_at > now)
    .sort((a, b) => a.created_at - b.created_at);
}

/**
 * Consume flags by id. Returns the unexpired flags whose subject matches the
 * caller, then deletes those docs. Flags belonging to a different subject or
 * already expired are silently ignored, so a caller cannot use this to probe
 * for other subjects' flags.
 *
 * Reads + deletes in a single batched round trip. Not transactional across
 * the read/delete boundary, which is acceptable because flags are themselves
 * ephemeral and idempotent on re-consume (a missing flag is just skipped).
 */
export async function consumeFlags(params: {
  subject: string;
  ids: string[];
}): Promise<StoredFlag[]> {
  if (params.ids.length === 0) return [];

  const firestore = getFirestore();
  const refs = params.ids.map((id) => firestore.collection(FLAGS).doc(id));
  const snaps = await firestore.getAll(...refs);

  const consumed: StoredFlag[] = [];
  const now = Date.now();
  const batch = firestore.batch();

  for (const snap of snaps) {
    if (!snap.exists) continue;
    const data = snap.data() as StoredFlag | undefined;
    if (!data) continue;
    if (data.subject !== params.subject) continue;
    if (data.expires_at < now) continue;
    consumed.push(data);
    batch.delete(snap.ref);
  }

  if (consumed.length > 0) {
    await batch.commit();
  }

  return consumed;
}
