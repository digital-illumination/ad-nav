---
title: "Feeding the Corpus"
date: "2026-05-16"
excerpt: "Last week I argued the corpus is the asset. Then I looked at the corpus: nine entries, one of them a smoke test. The storage was solved. The habit wasn't."
tags: ["AI Agents", "Personal Persona", "Architecture", "RAG", "MCP"]
image: "/images/blog/feeding-the-corpus.jpg"
---

## Where I Left Off

A few days ago I [argued the corpus is the asset and the model is replaceable](/blog/agents-over-trained-model). Build the substrate, I said. Wait. The model will come.

Then I opened the substrate. Nine journal entries. One of them was a smoke test. Another was a stray `curl` I'd fired during the OAuth build and never cleaned up.

I had spent weeks building somewhere to put things and put almost nothing there. The architecture was sound and the cupboard was bare. That's a more interesting failure than it looks, so this post is about what I did with it.

## The Filing Cabinet Problem

The thing I got wrong was assuming the hard part was storage. It wasn't. Storage was an afternoon. The hard part is that the corpus only grows if I feed it, and the moment something worth capturing happens is exactly the moment I'm busy doing the thing worth capturing. Nobody stops mid-decision to write a structured note about the decision. I certainly don't.

Opportunistic capture, the "drop a thought in when you remember" model, has the same failure mode as a gym membership. The intent is real and the behaviour never shows up. Six weeks of "I'll log that later" produces a corpus of nine entries and a lot of lost context.

So the problem wasn't where the signal goes. It was what makes the signal get written down at all.

## The Plumbing

Some of what I built this week was necessary and not very interesting, so I'll be quick.

The journal used to be one file per month. I changed it to one file per entry. The atomic unit of the data is an entry, not a calendar month, and every tool I wanted downstream (search, indexing, the curator) got cheaper when the file boundaries matched the data boundaries. Monthly files were an aggregation I'd added because it felt tidy. Tidy is not a design principle.

I added a flag tool: a way for an agent to mark a moment mid-conversation without committing to a full entry. The temptation was to make flags a new storage tier with its own lifecycle. I didn't. Flags expire in a day and exist only to be folded into a real entry later. Resisting the urge to promote every concept to its own tier is most of what kept this from becoming a filing system with a filing system inside it.

Embeddings came next, so the corpus is searchable by meaning and not just by keyword. The one decision that mattered: I blend keyword and vector results by rank, not by score. Cosine similarity and keyword overlap aren't on the same scale, and pretending they are produces confident nonsense. Ranks stay comparable even when scores don't. That's the whole trick and it's older than I am.

None of that fixed the filing cabinet problem. It just meant the cabinet was well organised while staying empty.

## The Actual Idea: Be Interviewed

The fix was to stop relying on myself to volunteer and build something that asks.

There's now a daily interview. I trigger it, and an agent reads the recent journal and the canonical context, works out what it doesn't know or what's gone stale, and asks me five questions. Two are fixed: what moved today, what's on my mind for tomorrow. The other three it picks based on what the corpus is missing. I answer by talking, because I dictate everything anyway, and the agent does two things with each answer. The raw words go to an archive, unedited, because the unedited version is the part that's hard to reconstruct later. A distilled summary goes to the journal, because that's the part that needs to be searchable.

The shift is small and it's the entire point. Being asked a specific question I can answer in thirty seconds of talking is a different task to remembering, unprompted, that I should record something. The first one happens. The second doesn't, and I have months of evidence for exactly how reliably it doesn't.

Whether the questions are any good is the open risk, and I'll come back to that.

## The Curator I Deliberately Didn't Build

The plan always had a curator: something that reads the accumulated journal and proposes updates to the canonical "about me" files, with me approving each change.

I built half of it. There's a tool that, given a canonical file, finds the journal and archive material related to it and hands it back for review. There is deliberately no tool that drafts the change and opens the pull request. An automated curator with nine entries to learn from would produce fluent, plausible, wrong updates, and I'd spend longer catching its mistakes than I'd spend writing the updates myself.

In the last post I said the curator is where the judgement lives, and judgement has no signal until the journal has content. Still true. The retrieval half is useful now. The judgement half can wait until there's something to judge. Building the half that's ready and then stopping is harder than it sounds, because the other half is the one I actually wanted to build.

## What I'm Not Sure About

I've built semantic search across three storage tiers for a corpus that, as of this morning, would fit in a single email. There are two honest readings of that. One is that the capture layer has to exist before the corpus can grow, so building it first is correct sequencing. The other is that I've spent a week polishing infrastructure to avoid the duller work of actually using it every day.

Both are true at once and I won't know the ratio until I've run the interview for a month. If I'm still doing it in June, the sequencing was right. If the interview tool sits unused next to the empty cabinet, I'll have my answer, and it won't be a flattering one.

The other unknown is whether the questions will be good. A bad interviewer produces a worse corpus than no interviewer, because it fills the substrate with noise that reads like signal. I've given the agent the context to ask well. Whether it does isn't something I can verify by testing. I find out by reading a month of entries and wincing, or not.

## Three Things I Took Away

**"Build the corpus" was a behaviour problem wearing an engineering problem's clothes.** I treated it as storage because storage is the part I know how to solve. The real constraint was that I don't reliably do unprompted admin about my own thinking. The engineering response to a behaviour problem is to build the thing that triggers the behaviour, not a nicer place to put the behaviour's output.

**The markdown is the asset. Everything else is a view.** Embeddings, the search index, the Firestore collections, the graph I still haven't built: every one of them is derived from the text and can be thrown away and rebuilt. I keep restating this because every time I forget it I start treating the index as precious, and the architecture gets worse the moment I do.

**The half I didn't build is worth more than the half I did.** Not building the automated curator this week was the best decision in the week, and it shows up nowhere except as an absence. That's the awkward thing about restraint as an engineering output. It doesn't demo.

The last post argued for the corpus over the model. This one is me finding out that arguing for the corpus and feeding the corpus are different jobs, and only one of them is hard. I'll know by June whether the thing I built to make the hard one easier actually does.
