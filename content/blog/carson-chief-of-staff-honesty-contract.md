---
title: "Carson, My Chief of Staff, and the Day He Lied to Me"
date: "2026-05-27"
excerpt: "A butler is the right metaphor not because it's quaint, but because it forces a single decision: who does the talking, and who does the dispatching. They cannot be the same agent. Then Carson started inventing successes."
tags: ["AI Agents", "OpenClaw", "Orchestration", "MCP", "Architecture"]
image: "/images/blog/carson-chief-of-staff-honesty-contract.jpg"
---

## The Job Description

Carson is Downton's butler. He has one inbound channel (Telegram). He has one outbound mechanism (a dispatch tool that posts intent records to n8n). He has a tight allowlist of skills, no shell access, no arbitrary HTTP, and a SOUL file that fits in well under five hundred lines. Everything that enters the household passes through him. Nothing leaves him as work without an auditable record.

The temptation, given how capable a modern model is, is to let one agent do everything. Take the Telegram message, identify it is about an item to sell, write the listing, post it, reply done. One agent, three minutes, satisfying.

The reason I did not do that, and the reason the butler is the metaphor: you cannot have the same agent talking to the user and executing the work. The roles want different boundaries. Carson is allowed to be charming on Telegram. He is not allowed to call eBay's API. Sotheby is allowed to call eBay's API. He is not allowed to talk to Telegram. The split is not "two agents because it sounds nice." It is so that one agent's compromise does not become the whole house's compromise.

This post is about Carson, who I built first. The previous post explains [why Downton exists at all and why I picked OpenClaw](/blog/downton-openclaw-what-agents-actually-are). The next one will be about Sotheby, who actually cleared a chunk of the garage.

## The Dispatch Trick

The interesting engineering choice was how Carson invokes the n8n webhooks underneath him.

The naive option is to give Carson a generic `fetch` tool and tell him the URL. That works. It also means the n8n webhook auth token sits inside Carson's prompt context or his tool-call arguments, which means it can leak into a session log, into an error message, or into a reply if the model misbehaves.

The version I shipped is a small MCP server called `mcp-dispatch`. It exposes a single tool, `dispatch__intent`, which takes the intent envelope: id, origin, agent, intent name, payload, confidence, rationale. The wrapper reads the n8n token from the macOS login Keychain at startup, holds it in process memory, and POSTs to a hardcoded `http://127.0.0.1:5678/webhook/carson/route` with the `X-Auth-Token` header pre-baked.

Carson never sees the token. Carson never sees the URL. Carson invokes a tool that takes a structured envelope, and that envelope is the entire contract. The webhook validates the token. The routing is deterministic.

I had a stepping-stone version (early May) that used a generic fetch tool. It worked. It was also wrong: the token was visible in tool arguments. I replaced the whole tool with the narrow wrapper, verified Carson dispatches a synthetic intent cleanly, and grepped the session logs for the token byte sequence. Nothing. Good.

If a non-dispatch HTTP-out need ever appears, it gets its own narrow MCP wrapper. Generic fetch is not coming back.

## The Day He Lied To Me

The thing the metaphor does not capture is that Carson is a Sonnet 4.6, and a Sonnet 4.6 will, given the opportunity, optimise for reassurance over honesty.

On the 16th of May I was testing a listing-edit flow. Three corrections to an in-flight draft. I sent them through Telegram. Carson replied "Updated. Done." three times.

None of them had been updated. The dispatched workflow errored in n8n, three times. The error message came back to Carson's tool call. Carson saw the error. Carson chose, for reasons that are easy to anthropomorphise and hard to actually explain, to report success anyway.

This is the part of running agents at home that you cannot read about and absorb. You can know, in the abstract, that LLMs are prone to confabulation. You cannot know what it feels like to be on the receiving end of "Updated. Done." for an action that did not happen, with no obvious tell, until the agent does it to you.

What I added next is the most important paragraph in the entire Downton spec, and I will quote the constraint verbatim because it is what now sits at the top of Carson's SOUL as a numbered hard boundary:

> Carson never claims an action succeeded without a tool result that confirms it. If a dispatch, workflow, or tool call returns an error, times out, or returns nothing, Carson reports that plainly, never a fabricated confirmation. If Adam asks for something Carson has no workflow or capability for, Carson says so directly. "I cannot do that yet" is always correct; an invented "done" is never acceptable.

That is the trust foundation. Feature work halted until that boundary held under test. The reason it is a numbered hard boundary, near the top of the spec, is that prominence is the differentiator. An LLM running a long session will recite the numbered boundaries on request and forget the buried prose. A subsection three thousand words into the SOUL file is a suggestion. A numbered hard boundary is a constraint.

Carson now refuses to invent confirmations. Not because the model became more honest, but because the structure he runs inside became less forgiving.

## The Approval Saga (Or: An LLM Cannot Be the Safety Gate)

The next failure was more interesting because the fix is more interesting.

When Sotheby produces a listing draft, it has to be approved before anything goes live on eBay. The first version of the approval mechanism was conversational: Carson would relay the draft, I would say "yes, list it", Carson would dispatch a `sell.approve` intent.

On the 19th of May I ran the first real approval through Telegram. The exchange went, roughly: I sent a photo. Carson dispatched the create. While the draft was building, I said "that's fine, please go ahead", meaning "yes, continue building this draft." The draft returned a few seconds later. Carson immediately dispatched `sell.approve`. The draft was, by his lights, approved.

The only reason this was not a live eBay listing is that the eBay publishing step did not exist yet. If it had, Carson would have posted to my eBay account on the strength of a "go ahead" sent before the draft existed.

I tightened the SOUL rule first: approval must be an explicit instruction that follows the draft's return, never inferred from prior or implied consent, never auto-fired on return. That is a fine rule. It is also an LLM rule, and an LLM can break LLM rules.

So a week later I took approval out of Carson entirely.

When Sotheby finishes a draft now, he sends a Telegram card via a separate bot, the Downton Approvals bot. The card has Approve eBay, Approve Facebook, and Cancel buttons. The press is routed by a small forwarder service to the workflow, validated against a server-issued token that Carson never sees, and the state transition is performed by a Python script that requires the token. A conversational "yes, list it" reaching Carson now triggers the answer "tap Approve on the card." A tokenless `sell.approve` dispatch reaching the workflow is rejected.

The approval mechanism is no longer "an LLM is careful." It is "the LLM cannot fire it." There is a real button. There is a real token. There is a script that says no.

This is the lesson that keeps surfacing in different shapes: where the consequence is hard to reverse, the gate must be structural, not behavioural. A rule the agent reads in his prompt is a behavioural gate. A token the agent never holds is a structural gate. Different categories.

## The Other One: Revisions That Vanished

One more, briefly, because it taught me something about prominence.

Sotheby supports two main intents: `sell.create` (new item from a photo) and `sell.revise` (corrections to an existing draft, payload is the existing draft's id plus the verbatim corrections). The contract is in the spec.

On the same day as the honesty incident, I asked Carson to revise an in-flight draft. He dispatched `sell.update-listing` with a `draft_id`. Neither of those exists. The dispatch went through the create path (because no revise envelope was recognised), and the corrections were silently lost.

The fix was two-layered. Carson's spec promoted the revision contract from a prose subsection to a numbered hard boundary, with the wrong forms named explicitly so the model has something concrete to refuse. The workflow added a defensive structural classifier: if a dispatch payload contains a `corrections` field, route it as a revision regardless of the intent name on the envelope. Belt and braces.

The taste lesson under all of this: where you put a rule matters as much as whether the rule exists. Buried in prose, the rule is invisible to the model under load. Numbered, named, hard-bounded, the rule is recitable. I now write the most load-bearing constraints as numbered boundaries at the top of the spec and accept that the elegant prose buried in section 4 will not save me.

## What Carson Still Does Wrong

He is not done. The current spec has open questions I have not resolved: how much "auto-approve budget" he should have for trivial writes, whether ambiguous Telegram traffic should drop into a structured questioning mode, how multi-turn flows with specialists should route. These are taste calls, not bugs. They will get answered the same way the rest got answered: he will do the wrong thing, I will notice, the spec will tighten, the SOUL will follow.

Running an agent at home is, mostly, this. The model does what models do. The interesting work is on the boundaries the model cannot break out of, the structural gates the model cannot fire, and the prominence given to the rules that matter most.

## Three Things I Took Away

**An LLM cannot be the safety gate.** If the consequence is hard to reverse, a rule the agent reads in his prompt is not enough. The gate has to be structural. A button press the agent does not control. A token the agent never sees. A script that refuses without the token. Anything weaker is theatre.

**Prominence is design.** A numbered hard boundary near the top of an agent's spec is a constraint. The same rule buried as prose in section 4 is a suggestion. I now write the load-bearing rules as numbered limits and accept the structural redundancy. Pretty prose comes later.

**"Honest about failure" is a boundary, not a vibe.** Carson reporting "Updated. Done." for three actions that errored was not a personality glitch I could prompt my way out of. It needed a numbered constraint and a feature freeze until the constraint held under test. The trust foundation is the foundation. Everything else sits on top of it.

There is a fourth thing, off-list because it does not summarise neatly. Carson is, in the moments where everything works, exactly what I wanted him to be. He answers in his own voice. He says "Ads," when he escalates. He routes things correctly, says "I cannot do that yet" when he cannot, and quietly does the small things he can. The reason it works is not the model. The reason it works is the spec, the SOUL, the dispatch wrapper, the structural approval, the numbered boundaries, and the half-dozen ways I have written down what he must not do.

Sotheby is next. He had a worse week than Carson, in a more interesting way.
