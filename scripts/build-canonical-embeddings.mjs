#!/usr/bin/env node
/**
 * Build canonical context embeddings.
 *
 * Reads each markdown file in content/context/, splits each into paragraphs
 * by blank-line separation, embeds every paragraph via OpenAI
 * text-embedding-3-small, and writes content/context/embeddings.json.
 *
 * The output JSON stores each embedding as a base64-encoded float32 array
 * (4 bytes per dimension instead of ~12 chars per dimension as a JSON
 * array), which keeps the on-disk file around 1.5MB instead of ~3MB.
 *
 * Idempotent: re-runs reuse any embedding whose paragraph sha256 already
 * matches the existing index. Run this after editing a context file, or
 * before each release, to keep the canonical retrieval index fresh.
 *
 * Env:
 *   OPENAI_API_KEY — required.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/build-canonical-embeddings.mjs
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const CONTEXT_DIR = path.join(REPO_ROOT, "content", "context");
const OUT_FILE = path.join(CONTEXT_DIR, "embeddings.json");

const MODEL = "text-embedding-3-small";
const DIM = 1536;
const BATCH_SIZE = 128;

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Missing OPENAI_API_KEY env var.");
  process.exit(1);
}

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function splitParagraphs(content) {
  return content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function encodeEmbedding(arr) {
  const buf = Buffer.alloc(arr.length * 4);
  for (let i = 0; i < arr.length; i++) {
    buf.writeFloatLE(arr[i], i * 4);
  }
  return buf.toString("base64");
}

function loadExistingIndex() {
  if (!fs.existsSync(OUT_FILE)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(OUT_FILE, "utf-8"));
    if (parsed.model !== MODEL || parsed.dim !== DIM) {
      console.warn(
        `Existing index uses ${parsed.model}/${parsed.dim} (this script writes ${MODEL}/${DIM}); regenerating from scratch.`
      );
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn(`Failed to parse existing index: ${err.message}; regenerating from scratch.`);
    return null;
  }
}

async function embedBatch(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input: texts }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}

async function main() {
  // Load the existing index (if any) so we can reuse embeddings whose source
  // paragraph hasn't changed. Keyed by sha256 of the paragraph text.
  const existing = loadExistingIndex();
  const byHash = new Map();
  if (existing) {
    for (const item of existing.items) byHash.set(item.hash, item.embedding);
  }

  const files = fs
    .readdirSync(CONTEXT_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const paragraphs = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTEXT_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const filename = file.replace(/\.md$/, "");
    const title = data.title || filename.replace(/-/g, " ");
    const paras = splitParagraphs(content);
    paras.forEach((text, idx) => {
      paragraphs.push({
        file: filename,
        title,
        paragraph_index: idx,
        text,
        hash: sha256(text),
      });
    });
  }

  console.log(`Found ${paragraphs.length} paragraphs across ${files.length} files.`);

  const toEmbed = paragraphs.filter((p) => !byHash.has(p.hash));
  console.log(`Reusing ${paragraphs.length - toEmbed.length} existing embeddings.`);
  console.log(`Embedding ${toEmbed.length} new/changed paragraphs.`);

  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    process.stdout.write(
      `  batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toEmbed.length / BATCH_SIZE)} (${batch.length} items)...`
    );
    const embeddings = await embedBatch(batch.map((p) => p.text));
    for (let j = 0; j < batch.length; j++) {
      byHash.set(batch[j].hash, encodeEmbedding(embeddings[j]));
    }
    process.stdout.write(" done\n");
  }

  const items = paragraphs.map((p) => ({
    file: p.file,
    title: p.title,
    paragraph_index: p.paragraph_index,
    text: p.text,
    hash: p.hash,
    embedding: byHash.get(p.hash),
  }));

  const out = {
    model: MODEL,
    dim: DIM,
    generated_at: new Date().toISOString(),
    items,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(out));
  const sizeKb = (fs.statSync(OUT_FILE).size / 1024).toFixed(0);
  console.log(`\nWrote ${OUT_FILE}\n  ${items.length} paragraphs, ${sizeKb}KB on disk.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
