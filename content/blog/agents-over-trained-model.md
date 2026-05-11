---
title: "Why I Chose Agents Over a Trained Model"
date: "2026-05-11"
excerpt: "Last week I stood up a private corpus for myself. The obvious next move is fine-tune a model on it. I'm not going to. Here's the reasoning."
tags: ["AI Agents", "Personal Persona", "Architecture", "Fine-Tuning", "RAG"]
image: "/images/blog/agents-over-trained-model.jpg"
---

## The Question Sitting Behind the Corpus

A few days ago I [shipped the substrate for a personal persona](/blog/giving-mcp-server-a-journal): a private repo where every conversation, voice memo, decision, and meeting note can land. The point is to build up enough material that, in time, something useful can be made of it. An agent that writes in my voice. A draft-checker that catches when I'm contradicting myself. Eventually, a longer-lived artefact my family might interact with.

The most obvious thing to do with a personal corpus is fine-tune a model on it.

I'm not going to. Or at least, not yet, and probably not for a long time. Here's the reasoning, because it's the kind of thing where the obvious move is wrong for non-obvious reasons.

## What Fine-Tuning Actually Buys You

Fine-tuning a base model on your own data trades two things off. You get style and idiom for free, baked into the weights so you don't have to spell them out every conversation. The model writes in your register because it was trained to. You also get the ability to encode patterns that are hard to put into words. The way you structure an argument. The transitions you reach for. The jokes you almost make but pull back from.

In exchange, you get a frozen artefact. The model is stuck on the snapshot of you at training time, and updating it means another training run. You also get a model that's slightly worse than the base at everything except sounding like you, because fine-tuning trades off general capability for narrow alignment. And the base model is a moving target. Anthropic ships a new Claude every few months. OpenAI does the same. The fine-tuned version I'd ship in May is bested by the base model two months later, and now I'm choosing between "sounds more like Adam" and "is genuinely smarter".

For corporate use cases, where you fine-tune on a stable domain (legal documents, customer support transcripts), the trade-off works. The domain doesn't change quickly. Style matters more than freshness. The cost of re-training is amortised over thousands of inferences.

For personal use, none of that holds. The thing I'm trying to capture is *me-as-I-am-now*, and "now" keeps moving. A fine-tuned Adam-2026 is wrong by 2027. The base model improvements are massive on the timescale I'd be retraining at. And the cost of one training run is more than the lifetime cost of every RAG query I'd ever make.

## What Agents-With-Context Buys Instead

The alternative is agents-with-context. Same corpus, but instead of training a model on it, you let a current base model retrieve from it at inference time. RAG, in the general sense.

What you give up: the model doesn't write in my voice automatically. It has to be told my voice exists, retrieve the relevant chunks, and apply them per query. That's slower per request and burns more context window per turn.

What you get is everything that "frozen" gave up. The model is whatever I picked yesterday. Claude Opus 5, GPT-6, whatever's good now. The corpus is whatever I added last night. If my view on something changed this morning, the agent picks up the new version. There's no retraining cycle. There's no model that ages out of date the moment I learn something.

The other thing you get is transparency. When the agent makes a claim about me, I can ask "where in the corpus did that come from", and it can tell me. With a fine-tuned model, the claim is implicit in 70 billion weights. I'd never know if it had invented an opinion I never held until I read it and flinched. With RAG, the source material is right there in the prompt.

## The Data Flywheel Argument

Here's the bit that actually clinches it.

The corpus is the asset. The model is replaceable. Every hour I spend on capture (the journal, the conversation transcripts, the decision logs) adds to the corpus. Every hour the corpus grows, the agent gets better, regardless of which model is wrapping it. If a year from now I want to fine-tune, the corpus is what feeds the fine-tune.

Whereas if I went straight to fine-tuning today, I'd have to compress my current thin corpus into weights. With maybe 50 conversations and a few decision logs, the fine-tune would be undertrained and overfit at the same time. It would write in a passable imitation of my voice with very little actual content underneath, which is the worst of both worlds.

Wait two years. Let the corpus grow. By then I'll have hundreds of structured conversations, decision logs with retrospectives filled in, voice memos with transcripts, blog drafts and the ones I killed. *That's* a fine-tuneable corpus. And by then the base models will be different enough that whatever fine-tuning interface looks like in 2028 won't be what it looks like in 2026.

In other words: the data flywheel runs at the corpus layer, not the model layer. Build the corpus first. The model choice is a 2028 problem.

## When I'd Change My Mind

Three things would push me toward fine-tuning sooner:

**Voice fidelity in real-time.** If I started using the persona in interactive use cases where latency matters (a real-time avatar for live conversations, say), the RAG retrieval overhead might start to bite, and a fine-tune would feel different in the way only fine-tunes do. I don't have those use cases yet. They're not on the next year's roadmap.

**A specific stylistic register that RAG can't reach.** Some things are too granular to retrieve. The way I almost-but-not-quite hedge a recommendation. The cadence of my pushback. If I notice the RAG-fed agent never quite gets these right despite a rich corpus, that's a signal that style needs to live in weights, not in retrieval. I haven't hit that yet either.

**A stable enough model frontier.** If base model progress slowed to a crawl and the upgrade cost of staying current became negligible, the "fine-tune ages out" objection weakens. Doesn't look like that's happening anytime soon.

None of those is true today. So: corpus, agent, RAG. Re-evaluate in 2028.

## Three Things I Took Away

**The default is wrong because the default reasoning is wrong.** "I have data, therefore I should train" is what AI-as-it-was looked like. AI-as-it-is rewards corpora over models, because retrieval-augmented base models are now competitive with fine-tunes for most personal use cases. Update the prior.

**Build the asset that compounds.** Models are replaceable, corpora aren't. Every hour on capture is an hour that doesn't get re-spent because the models change. Every hour on fine-tuning is potentially deprecated by the next model release. Pick the work that doesn't deprecate.

**Treat fine-tuning as a future option, not a current plan.** I'm not arguing against fine-tuning. I'm arguing against fine-tuning *now*, with a thin corpus, against a fast-moving frontier. Same corpus, same instinct, same goal, applied to today's actual conditions, gives a different answer than the obvious one.

The blog post I wrote a few days ago [explained the storage architecture for the corpus](/blog/giving-mcp-server-a-journal). This one is the strategic case for why that architecture is the thing worth building, even when the more glamorous option (fine-tune Adam-bot) is sitting right there. Build the substrate. Wait. The model will come.
