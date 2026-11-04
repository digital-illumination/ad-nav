#!/usr/bin/env node
/**
 * One-off cutover copy: live sign-in state from Google Firestore to Cosmos DB.
 *
 * Copies the documents that connectors and browsers depend on, so nobody has
 * to sign in again when DNS moves from Google Cloud Run to Azure:
 *
 *   oauth_clients         every registered client (Claude, Codex, ...)
 *   oauth_refresh_tokens  unrevoked, unexpired tokens only
 *   sessions              unexpired browser sessions only
 *   flags                 unexpired flags only (24 hour life)
 *
 * Authorization codes are not copied: they live five minutes.
 * Embeddings are not copied: rebuild them with scripts/backfill-*.mjs.
 *
 * Refresh tokens rotate on every use, so run this more than once: before the
 * DNS change, straight after it, and once more after the old records' TTL has
 * passed. Every write is an upsert keyed on the same id, so re-running is
 * safe. A token Google rotated after the last run will be missing on Azure;
 * the affected connector re-authorises once.
 *
 * Reads Firestore through its REST API with a token from
 * `gcloud auth print-access-token` (read-only; no Google SDK dependency in
 * this repo). Writes Cosmos DB with Microsoft Entra auth.
 *
 * Prints counts and nothing else: no token, id or value is ever printed.
 *
 * Env:
 *   COSMOS_ENDPOINT    Cosmos DB account endpoint
 *   COSMOS_DATABASE    (optional, default 'ad-nav')
 *   AZURE_SUBSCRIPTION      Digital Illumination subscription (name or id), so
 *                           the az CLI credential signs in as the right account
 *
 * Usage:
 *   node scripts/azure/copy-signins-from-firestore.mjs            # dry run
 *   node scripts/azure/copy-signins-from-firestore.mjs --apply
 *
 * Delete this script when the Google project is shut down.
 */

import { execFileSync } from "node:child_process";
import { CosmosClient } from "@azure/cosmos";
import { AzureCliCredential, DefaultAzureCredential } from "@azure/identity";

const APPLY = process.argv.includes("--apply");
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT;
const COSMOS_DATABASE = process.env.COSMOS_DATABASE || "ad-nav";
const SUBSCRIPTION = process.env.AZURE_SUBSCRIPTION;
const PROJECT = process.env.FIRESTORE_PROJECT || "ad-nav";

if (!COSMOS_ENDPOINT) {
  console.error("Missing COSMOS_ENDPOINT.");
  process.exit(1);
}

const gcpToken = execFileSync("gcloud", ["auth", "print-access-token"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
}).trim();

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

/** Decode a Firestore REST typed value into plain JSON. */
function decode(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  throw new Error(`Unsupported Firestore value type: ${Object.keys(v).join(",")}`);
}

function decodeFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decode(v);
  return out;
}

async function listCollection(name) {
  const docs = [];
  let pageToken = "";
  do {
    const url = `${FS_BASE}/${name}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${gcpToken}` } });
    if (!res.ok) throw new Error(`Firestore list ${name}: HTTP ${res.status}`);
    const json = await res.json();
    for (const d of json.documents || []) {
      docs.push({ docId: d.name.split("/").pop(), data: decodeFields(d.fields || {}) });
    }
    pageToken = json.nextPageToken || "";
  } while (pageToken);
  return docs;
}

const db = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  aadCredentials: SUBSCRIPTION ? new AzureCliCredential({ subscription: SUBSCRIPTION }) : new DefaultAzureCredential(),
}).database(COSMOS_DATABASE);

const DAY_S = 24 * 60 * 60;
const ttlFor = (expiresAtMs) => Math.max(60, Math.ceil((expiresAtMs - Date.now()) / 1000) + DAY_S);

const now = Date.now();
const PLAN = [
  {
    name: "oauth_clients",
    keep: () => true,
    toItem: (docId, d) => ({ ...d, id: docId }),
  },
  {
    name: "oauth_refresh_tokens",
    keep: (d) => !d.revoked && d.expires_at > now,
    toItem: (docId, d) => ({ ...d, id: docId, ttl: ttlFor(d.expires_at) }),
  },
  {
    name: "sessions",
    keep: (d) => d.expiresAt > now,
    toItem: (docId, d) => ({ ...d, id: docId, ttl: ttlFor(d.expiresAt) }),
  },
  {
    name: "flags",
    keep: (d) => d.expires_at > now,
    toItem: (docId, d) => ({ ...d, id: docId, ttl: ttlFor(d.expires_at) }),
  },
];

async function main() {
  console.log(APPLY ? "Mode: apply" : "Mode: dry run (pass --apply to write)");
  for (const step of PLAN) {
    const docs = await listCollection(step.name);
    const kept = docs.filter(({ data }) => step.keep(data));
    let written = 0;
    if (APPLY) {
      const container = db.container(step.name);
      for (const { docId, data } of kept) {
        await container.items.upsert(step.toItem(docId, data));
        written++;
      }
    }
    console.log(`${step.name}: ${docs.length} in Firestore, ${kept.length} to copy, ${written} written`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
