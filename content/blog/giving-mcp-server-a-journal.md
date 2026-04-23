---
title: "Giving My MCP Server a Journal"
date: "2026-04-19"
excerpt: "Last week's personal MCP server was read-only. That wasn't a feature. Making it writable, without letting agents trample the content, turned into the most interesting week of architecture since I first shipped it."
tags: ["MCP", "AI Agents", "OAuth", "Claude Desktop", "Architecture"]
image: "/images/blog/mcp-journal.jpg"
---

## Where I Left Off

Last week I [built a personal MCP server](/blog/building-mcp-server-personal-context). Twenty minutes of TypeScript, ten markdown files, any MCP-compatible agent could pull my context without me telling it where to look.

The server was read-only. That was deliberate, and it was wrong.

## The Bug I Shipped

The problem became obvious almost immediately. Every session with an agent reveals something about me. An opinion formed. A project parked. A preference I didn't know I had until an agent got it wrong. If the canonical context files just sit there untouched, they go stale fast, and the next session starts from the same slightly-out-of-date snapshot as the last.

Read-only context portfolios die quickly.

So: add a write tool. Let agents append to the context files when they learn something. Gate it behind a bearer token so only I can trigger writes. Done in an afternoon.

I built `append_to_context`. I shipped it. I wrote a smoke-test entry to `current-projects.md` that said, in effect, "Adam built a write tool today."

Then I looked at the file.

## What the Wrong Tool Looks Like

`current-projects.md` is not a changelog. It's a carefully-written paragraph-per-section summary of where my attention sits and why. A one-line bullet that says "Built append_to_context, 2026-04-17" is noise. It would be noise if I'd written it myself.

Same applies across all ten context files. `identity.md` is a distilled "who is this person" page. `communication-style.md` is accumulated wisdom about how I write. `decision-log.md` captures frameworks I actually use. None of them benefit from an append-only tool dropping session detail at the bottom.

The canonical files want an *editor*, not a logger.

I deleted the smoke-test line and started again.

## The Reframe: Three Tiers

The fix was to stop conflating two jobs that look alike and aren't.

**Session** lives inside the agent. Granular, ephemeral, nobody's problem but the agent's. Every turn of every conversation.

**Journal** is where agents write observations when something non-trivial happens. Structured fields for summary, decisions made, preferences revealed, follow-ups generated. Append-only, one entry per session. Public once committed, but nobody reads it to learn who I am. It's a raw feed.

**Canonical context** is the distilled About Adam. Human-edited. Low churn. Updated only after a curator pass promotes patterns from the journal, with me approving each PR. Agents must *not* write here directly.

So agents get a cheap way to capture signal. I get an accumulated archive of session observations. The canonical files stay clean because an editor (me) owns them, informed by a journal an agent maintained for me.

This isn't a novel structure. It's the pattern used for memory consolidation, where short-term working memory gets filtered into long-term storage via a curation step. The surprise for me was discovering my naive first attempt was trying to skip the filter.

## The Engineering: OAuth So Any Agent Can Play

Agents can write to the journal. Which agents? All of them. Or at least, any I'd plausibly use.

Claude Code on my laptop. Claude Desktop. claude.ai on mobile. Cowork. Continue. Cursor. Whatever comes next. They're all MCP-capable, they all authenticate differently, and they don't all speak the static-bearer approach I'd bolted on for Claude Code.

The answer was OAuth 2.1, which the modern MCP clients expect. Which meant:

**Discovery metadata** at `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource`. Clients hit these on first connect to learn where to authenticate.

**Dynamic client registration** at `/api/oauth/register`. Claude Desktop and friends POST their own client metadata and receive a `client_id`. No manual setup on my end. No shared secrets.

**An authorize endpoint** with a consent page. I wrote the consent page inline, in the site's cyberpunk theme, because if I'm going to have an OAuth approval screen on my own domain it might as well look the part. The screen knows your GitHub identity, shows the requesting client's name, lists the scopes, and gives you Approve and Deny. No framework, no drama.

**A token endpoint** with PKCE and refresh rotation. Access tokens are signed JWTs, cheap to verify without a Firestore round-trip. Refresh tokens are opaque strings that rotate on use. Present the old one once, you get a new one back. Present it twice, rejected.

**GitHub as upstream identity.** I didn't want to run user accounts. GitHub already knows who I am, and I'm the only person on the allowlist for now. If someone else should ever get write access, I add a single line to an env var.

**Firestore for state.** Client registrations, authorization codes, refresh tokens. Cloud Run scales to zero, so there's no in-process memory to rely on. Firestore's free tier is generous enough that this costs me nothing.

Reads stay public. Only writes require a token with the `context:write` scope. The static `MCP_WRITE_TOKEN` path still works for Claude Code, so nothing there needs reconfiguring.

Two days of careful work. Not hard, just a lot of small pieces that all have to line up. I shipped it in three commits, one per layer, so each could be reviewed independently.

## What I Didn't Expect

The hardest part wasn't the OAuth. It was the taste problem.

When *should* an agent log a session? What counts as meaningful? What belongs in summary versus decisions versus patterns?

I wrote a `session_logging_guide` tool that spells out the rules, and bundled them into the MCP server's instructions field so clients read them on connect. Log at natural closes. Capture decisions made, preferences revealed, problems explored, follow-ups generated. Skip trivial activity. Ask before logging unless I've explicitly said "log this."

Even with those rules, agents will probably log too much for the first few weeks and I'll have to correct the noise. That's calibration, not failure. The alternative is no signal at all.

## What's Still Unsolved

The curator. The thing that reads the journal periodically, spots patterns that have matured enough to promote, drafts a PR against the canonical files, and hands it to me for review.

I haven't built it. I'm deliberately waiting. Right now the journal has one real entry, the one this post is about. A curator has nothing to pattern-match against. Give it a month. Let the journal collect some actual signal. Then the curator has a well-defined job.

If I built it today, it would produce worse content than I would, because the input isn't there yet. I'd be debugging taste, not logic.

## Three Things I Took Away

**The naive solution and the right solution weren't architecturally close.** An append-to-context tool and an append-to-journal tool sound similar. They aren't. One writes to the wrong thing with the wrong granularity. The other has a different audience and a different lifecycle. Drop the prefix, drop the whole design.

**OAuth was the cheapest part of "agents everywhere."** It looks heavy. In practice it's the thing that lets this server be useful from ten different clients without me managing tokens or running a user table. Build the shape that lets more things plug in.

**The curator is where the judgement lives.** Everything up to and including OAuth is plumbing. The curator is where taste and context meet, and judgement has no signal until the journal has content. For now, doing nothing on that front is the right move.

The MCP post ended with "build the context first. The plumbing is the easy bit." Writing context is harder. The architecture has to respect what it's writing to.
