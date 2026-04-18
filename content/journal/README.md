# Journal

Working memory for Adam's context portfolio.

## What lives here

Session-level observations written by agents via the `append_to_journal` MCP tool. One file per calendar month (`YYYY-MM.md`). Append-only from the agent's perspective.

## What this is NOT

This is not the canonical context portfolio. Canonical files live in `content/context/` and are human-edited. Agents do not write there.

## Purpose

The journal accumulates signal over time so that patterns can be spotted later. A curator pass (human, agent-assisted, or scheduled) reads the journal periodically and proposes changes to the canonical context as pull requests. Any promotion from journal to canonical goes through human review.

## Format

Each entry is appended by `append_to_journal`. The server renders a consistent shape:

```markdown
## YYYY-MM-DDTHH:MMZ — <agent name>

**Summary:** 2-4 sentence overview.

**Decisions:**
- ...

**Patterns:**
- ...

**Follow-ups:**
- ...

**Tags:** foo, bar

---
```

All fields except `summary` are optional.

## Privacy

The privacy rules in `SPEC.md` apply here too. No real names for CtM colleagues, no client names from Digital Illumination, no operational secrets. The journal is public once it's committed to a public repo.
