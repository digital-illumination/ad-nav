import { clean, getContainer, readItem, ttlFor } from "./cosmos";
import { newOpaqueToken } from "./oauth";

/**
 * Cosmos DB storage for mid-session flags.
 *
 * Flags are short notes an agent drops during a session to mark something
 * worth keeping. They sit below the journal tier in maturity: cheaper to
 * write, scoped temporally, not source material. At session close the agent
 * recalls flags via `listFlagsForSubject`, weaves their content into a
 * structured journal entry, and passes the consumed ids back to the journal
 * write tool so the flags can be deleted.
 *
 * Container: `flags`, partitioned on `subject`, so listing a subject's flags
 * is a single-partition query and a lookup by id under the wrong subject
 * simply misses. Expiry filtering is done in code; the per-item TTL only
 * cleans up old documents.
 *
 * Schema fields:
 *   id          — random opaque id, the Cosmos item id too
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
  await getContainer(FLAGS).items.upsert({ ...doc, ttl: ttlFor(doc.expires_at) });
  return doc;
}

/**
 * List flags belonging to a subject that have not yet expired, oldest first.
 * Filtering by `expires_at` happens in code (not in the query), as it did on
 * Firestore. The 24h TTL keeps the per-subject set small enough that this
 * stays cheap.
 */
export async function listFlagsForSubject(subject: string): Promise<StoredFlag[]> {
  const { resources } = await getContainer(FLAGS)
    .items.query<Record<string, unknown>>(
      { query: "SELECT * FROM c WHERE c.subject = @subject", parameters: [{ name: "@subject", value: subject }] },
      { partitionKey: subject }
    )
    .fetchAll();

  const now = Date.now();
  return resources
    .map((r) => clean<StoredFlag>(r, true))
    .filter((f) => f.expires_at > now)
    .sort((a, b) => a.created_at - b.created_at);
}

/**
 * Consume flags by id. Returns the unexpired flags whose subject matches the
 * caller, then deletes those docs. Flags belonging to a different subject or
 * already expired are silently ignored, so a caller cannot use this to probe
 * for other subjects' flags.
 *
 * Point reads under the caller's own subject (the partition key), then
 * deletes. Not transactional across the read/delete boundary, which is
 * acceptable because flags are themselves ephemeral and idempotent on
 * re-consume (a missing flag is just skipped).
 */
export async function consumeFlags(params: {
  subject: string;
  ids: string[];
}): Promise<StoredFlag[]> {
  if (params.ids.length === 0) return [];

  const ids = [...new Set(params.ids)];
  const found = await Promise.all(
    ids.map((id) => readItem<StoredFlag>(FLAGS, id, params.subject, true))
  );

  const consumed: StoredFlag[] = [];
  const now = Date.now();
  for (const data of found) {
    if (!data) continue;
    if (data.subject !== params.subject) continue;
    if (data.expires_at < now) continue;
    consumed.push(data);
  }

  await Promise.all(
    consumed.map((f) =>
      getContainer(FLAGS)
        .item(f.id, params.subject)
        .delete()
        .catch(() => {})
    )
  );

  return consumed;
}
