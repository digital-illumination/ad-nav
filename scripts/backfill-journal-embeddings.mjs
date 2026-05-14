#!/usr/bin/env node
/**
 * Backfill journal embeddings for every entry in adam-corpus.
 *
 * Walks `journal/YYYY/MM/*.md` via the GitHub Git Trees API, fetches each
 * entry's body, embeds it via OpenAI text-embedding-3-small, and upserts
 * the result into the Firestore `journal_embeddings` collection.
 *
 * Idempotent: any entry already present in Firestore (keyed by sha256 of its
 * file path) is skipped. Re-run as often as you like; only new or missing
 * entries get embedded.
 *
 * Env:
 *   JOURNAL_REPO            owner/repo of the journal (digital-illumination/adam-corpus)
 *   GITHUB_TOKEN            PAT with contents:read on that repo
 *   OPENAI_API_KEY          OpenAI key for embedding
 *   JOURNAL_BRANCH          (optional, default 'main')
 *   GOOGLE_CLOUD_PROJECT    (optional, default 'ad-nav')
 *
 * Firestore auth uses Application Default Credentials. If you haven't set
 * those up locally, run:
 *
 *   gcloud auth application-default login
 *
 * Usage:
 *   JOURNAL_REPO=digital-illumination/adam-corpus \
 *   GITHUB_TOKEN=ghp_... \
 *   OPENAI_API_KEY=sk-... \
 *   node scripts/backfill-journal-embeddings.mjs
 */

import crypto from "node:crypto";
import { Firestore } from "@google-cloud/firestore";

const REPO = process.env.JOURNAL_REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const OPENAI = process.env.OPENAI_API_KEY;
const BRANCH = process.env.JOURNAL_BRANCH || process.env.GITHUB_BRANCH || "main";
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || "ad-nav";

if (!REPO || !TOKEN || !OPENAI) {
  console.error("Missing JOURNAL_REPO, GITHUB_TOKEN, or OPENAI_API_KEY.");
  process.exit(1);
}

const COLLECTION = "journal_embeddings";
const MODEL = "text-embedding-3-small";

const firestore = new Firestore({
  projectId: PROJECT_ID,
  ignoreUndefinedProperties: true,
});

const GH_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ad-nav-backfill",
};

const API = `https://api.github.com/repos/${REPO}`;

function docIdForPath(path) {
  return crypto.createHash("sha256").update(path).digest("hex");
}

function stripFrontmatter(md) {
  if (!md.startsWith("---\n")) return md;
  const end = md.indexOf("\n---\n", 4);
  if (end === -1) return md;
  return md.slice(end + 5).trim();
}

function previewOf(body, max = 200) {
  const collapsed = body.replace(/\s+/g, " ").trim();
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 3)}...`;
}

function parseFrontmatter(md) {
  if (!md.startsWith("---\n")) return {};
  const end = md.indexOf("\n---\n", 4);
  if (end === -1) return {};
  const out = {};
  for (const line of md.slice(4, end).split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    out[m[1]] = val;
  }
  return out;
}

async function listJournalTree() {
  // One Trees API call returns the whole repo's path list; cheaper than
  // walking the Contents API directory-by-directory.
  const branchRes = await fetch(`${API}/branches/${encodeURIComponent(BRANCH)}`, {
    headers: GH_HEADERS,
  });
  if (!branchRes.ok) {
    throw new Error(`branch fetch failed: ${branchRes.status} ${await branchRes.text()}`);
  }
  const branchJson = await branchRes.json();
  const treeSha = branchJson.commit.commit.tree.sha;

  const treeRes = await fetch(`${API}/git/trees/${treeSha}?recursive=1`, { headers: GH_HEADERS });
  if (!treeRes.ok) {
    throw new Error(`tree fetch failed: ${treeRes.status} ${await treeRes.text()}`);
  }
  const treeJson = await treeRes.json();
  if (treeJson.truncated) {
    console.warn("WARNING: Trees API response was truncated; some entries may be missing.");
  }

  return treeJson.tree
    .filter((node) => node.type === "blob" && /^journal\/\d{4}\/\d{2}\/.+\.md$/.test(node.path))
    .map((node) => node.path)
    .sort();
}

async function fetchFile(path) {
  const res = await fetch(`${API}/contents/${path}?ref=${encodeURIComponent(BRANCH)}`, {
    headers: GH_HEADERS,
  });
  if (!res.ok) throw new Error(`fetch ${path} failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.encoding !== "base64") throw new Error(`unexpected encoding for ${path}: ${json.encoding}`);
  return Buffer.from(json.content, "base64").toString("utf-8");
}

async function embedText(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.data[0].embedding;
}

async function alreadyIndexed(path) {
  const snap = await firestore.collection(COLLECTION).doc(docIdForPath(path)).get();
  return snap.exists;
}

async function main() {
  console.log(`Repo:    ${REPO}`);
  console.log(`Branch:  ${BRANCH}`);
  console.log(`Project: ${PROJECT_ID}`);
  console.log();

  const paths = await listJournalTree();
  console.log(`Found ${paths.length} entry file${paths.length === 1 ? "" : "s"} under journal/.`);
  console.log();

  let written = 0;
  let skipped = 0;
  let failed = 0;

  for (const path of paths) {
    if (await alreadyIndexed(path)) {
      console.log(`  = ${path}  (already indexed)`);
      skipped++;
      continue;
    }
    try {
      const md = await fetchFile(path);
      const body = stripFrontmatter(md);
      const fm = parseFrontmatter(md);
      const timestamp = fm.timestamp || "";
      const agent = fm.agent || "unknown";
      const vec = await embedText(body);
      await firestore.collection(COLLECTION).doc(docIdForPath(path)).set({
        path,
        timestamp,
        agent,
        preview: previewOf(body),
        embedding: vec,
        created_at: Date.now(),
      });
      console.log(`  + ${path}  (written, ${vec.length} dims, agent=${agent})`);
      written++;
    } catch (err) {
      console.error(`  ! ${path}: ${err.message}`);
      failed++;
    }
  }

  console.log();
  console.log(`Written: ${written}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed:  ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
