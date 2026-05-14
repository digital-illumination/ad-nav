#!/usr/bin/env node
/**
 * Migrate journal entries from monthly files to one-file-per-entry layout.
 *
 *   Old: journal/YYYY-MM.md          (one file per UTC month; entries demarcated
 *                                     by H2 timestamp headings)
 *   New: journal/YYYY/MM/YYYY-MM-DDTHHMMSSZ-{agent-slug}.md
 *                                    (one file per entry; YAML frontmatter with
 *                                     timestamp, agent, tags; same body shape)
 *
 * Reads existing monthly files from the private journal repo, parses entries,
 * writes per-entry copies. Does NOT delete the old monthly files. Delete those
 * manually after verifying the new layout (a single commit on adam-corpus).
 *
 * Idempotent: if a target per-entry path already exists, it is skipped, not
 * overwritten. Safe to re-run.
 *
 * Env:
 *   JOURNAL_REPO     owner/repo of the private journal (e.g. digital-illumination/adam-corpus)
 *   GITHUB_TOKEN     PAT or installation token with contents:write on that repo
 *   JOURNAL_BRANCH   (optional, default main)
 *
 * Usage:
 *   node scripts/migrate-journal-to-per-entry.mjs           # dry run, prints plan
 *   node scripts/migrate-journal-to-per-entry.mjs --apply   # writes new files
 */

const REPO = process.env.JOURNAL_REPO;
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCH = process.env.JOURNAL_BRANCH || process.env.GITHUB_BRANCH || "main";
const APPLY = process.argv.includes("--apply");

if (!REPO || !TOKEN) {
  console.error("Missing JOURNAL_REPO or GITHUB_TOKEN env vars.");
  process.exit(1);
}

const GH_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "ad-nav-migrate",
};

const API = `https://api.github.com/repos/${REPO}`;

async function gh(path, init = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: { ...GH_HEADERS, ...(init.headers || {}) },
  });
}

async function listDir(dirPath) {
  const res = await gh(`/contents/${dirPath}?ref=${encodeURIComponent(BRANCH)}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`list ${dirPath} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchFile(path) {
  const res = await gh(`/contents/${path}?ref=${encodeURIComponent(BRANCH)}`);
  if (!res.ok) throw new Error(`fetch ${path} failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.encoding !== "base64") throw new Error(`unexpected encoding for ${path}: ${json.encoding}`);
  return Buffer.from(json.content, "base64").toString("utf-8");
}

async function fileExists(path) {
  const res = await gh(`/contents/${path}?ref=${encodeURIComponent(BRANCH)}`);
  return res.status === 200;
}

async function putFile(path, content, message) {
  const res = await fetch(`${API}/contents/${path}`, {
    method: "PUT",
    headers: { ...GH_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf-8").toString("base64"),
      branch: BRANCH,
    }),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.content.sha;
}

function slugAgent(agent) {
  const cleaned = (agent ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "unknown";
}

function yamlString(s) {
  return JSON.stringify(String(s).replace(/\n/g, " ").trim());
}

function yamlTagsArray(tags) {
  if (tags.length === 0) return "[]";
  return `[${tags.map(yamlString).join(", ")}]`;
}

function normalizeTimestamp(ts) {
  // Accepts minute-resolution (2026-05-11T18:19Z) or second-resolution
  // (2026-05-11T18:19:00Z). Returns second-resolution.
  const m = ts.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?Z$/);
  if (!m) return null;
  const [, date, hh, mm, ss] = m;
  return `${date}T${hh}:${mm}:${ss ?? "00"}Z`;
}

function compactTimestamp(ts) {
  // 2026-05-11T18:19:00Z -> 2026-05-11T181900Z
  return ts.replace(/:/g, "");
}

function entryPath(ts, agent) {
  const [date] = ts.split("T");
  const [year, mm] = date.split("-");
  return `journal/${year}/${mm}/${compactTimestamp(ts)}-${slugAgent(agent)}.md`;
}

/**
 * Parse a monthly journal markdown into entries. Each entry begins with a line
 * matching `## {ISO timestamp} {dash} {agent}`. The dash may be em dash (—),
 * en dash (–), or ASCII hyphen (-).
 *
 * Lines before the first H2 heading (frontmatter, file title) are discarded.
 */
function parseMonthlyJournal(raw) {
  let body = raw;
  if (raw.startsWith("---\n")) {
    const end = raw.indexOf("\n---\n", 4);
    if (end !== -1) body = raw.slice(end + 5);
  }

  const lines = body.split("\n");
  const entries = [];
  let current = null;
  // Heading shape written by the old `formatJournalEntry`:
  //   ## 2026-05-10T18:19Z — claude-code
  // The ASCII hyphen can also appear in date fragments, so the timestamp is
  // pinned explicitly and the separator only allows em dash / en dash (which
  // is what the writer used). Surrounding whitespace is required to avoid
  // greedy edge cases.
  const headingRe = /^##\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z)\s+[—–]\s+(.+?)\s*$/;

  for (const line of lines) {
    const m = line.match(headingRe);
    if (m) {
      if (current) entries.push(current);
      const ts = normalizeTimestamp(m[1]);
      if (!ts) {
        console.warn(`  ! skipping entry with unparseable timestamp: ${m[1]}`);
        current = null;
        continue;
      }
      current = { timestamp: ts, agent: m[2].trim(), bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) entries.push(current);

  return entries
    .map((e) => ({
      timestamp: e.timestamp,
      agent: e.agent,
      body: trimEntryBody(e.bodyLines),
    }))
    .filter((e) => e.body.length > 0);
}

function trimEntryBody(lines) {
  let end = lines.length;
  while (end > 0) {
    const l = lines[end - 1].trim();
    if (l === "" || l === "---") {
      end--;
      continue;
    }
    break;
  }
  return lines.slice(0, end).join("\n").trim();
}

function extractTagsFromBody(body) {
  const m = body.match(/^\*\*Tags:\*\*\s+(.+)$/m);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatEntryFile(entry) {
  const tags = extractTagsFromBody(entry.body);
  return [
    "---",
    `timestamp: ${entry.timestamp}`,
    `agent: ${yamlString(entry.agent)}`,
    `tags: ${yamlTagsArray(tags)}`,
    "---",
    "",
    `# ${entry.timestamp} — ${entry.agent}`,
    "",
    entry.body,
    "",
  ].join("\n");
}

async function main() {
  console.log(`Repo:   ${REPO}`);
  console.log(`Branch: ${BRANCH}`);
  console.log(`Mode:   ${APPLY ? "APPLY (will write)" : "dry run (no writes)"}`);
  console.log("");

  const items = await listDir("journal");
  const monthly = items
    .filter((i) => i.type === "file" && /^\d{4}-\d{2}\.md$/.test(i.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (monthly.length === 0) {
    console.log("No legacy monthly files found at journal/YYYY-MM.md. Nothing to migrate.");
    return;
  }

  let totalEntries = 0;
  let totalWritten = 0;
  let totalSkipped = 0;

  for (const file of monthly) {
    console.log(`# ${file.name}`);
    const raw = await fetchFile(file.path);
    const entries = parseMonthlyJournal(raw);
    console.log(`  parsed ${entries.length} entries`);
    totalEntries += entries.length;

    for (const entry of entries) {
      const path = entryPath(entry.timestamp, entry.agent);
      if (!APPLY) {
        console.log(`  + ${path}  (${entry.body.length} chars)`);
        continue;
      }
      if (await fileExists(path)) {
        console.log(`  = ${path}  (already exists, skipped)`);
        totalSkipped++;
        continue;
      }
      const sha = await putFile(
        path,
        formatEntryFile(entry),
        `Migrate journal entry ${entry.timestamp} (${entry.agent}) from monthly file`
      );
      console.log(`  + ${path}  (written, sha ${sha.slice(0, 7)})`);
      totalWritten++;
    }
  }

  console.log("");
  console.log(`Total entries seen: ${totalEntries}`);
  if (APPLY) {
    console.log(`Written: ${totalWritten}`);
    console.log(`Skipped (already existed): ${totalSkipped}`);
    console.log("");
    console.log("Old monthly files are untouched. Verify the new per-entry layout,");
    console.log("then delete journal/YYYY-MM.md manually via a commit on the journal repo.");
  } else {
    console.log("Dry run only. Re-run with --apply to write per-entry files.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
