---
title: "Sotheby, Or: How I Cleared My Garage Without Touching eBay"
date: "2026-05-28"
excerpt: "I had a garage full of stuff and no patience for the eBay Seller Hub. The honest version of \"AI does it for me\" is photo in, live listing out, with one button in the middle that I still have to press."
tags: ["AI Agents", "eBay API", "Personal Projects", "OpenClaw", "Architecture"]
image: "/images/blog/sotheby-clearing-the-garage.jpg"
---

## The Garage Problem

The Stacey garage is not a garage so much as a graveyard of decisions I made between 2019 and last spring. A road bike I have not ridden since the second lockdown. A jigsaw I bought for a project that never happened. Two pairs of unused hi-fi speakers I will not explain. A mattress, in clean condition, that no longer matches the bed it came with.

In theory, I sell this stuff on eBay. In practice, I have looked at the eBay Seller Hub once, given up, and shut the laptop. The interface is built for people who sell at volume. The listing form is a Christmas tree of fields that mean different things in different categories. Listing a single bike is a forty-minute job for a hundred-pound return. The maths does not work.

What works for me is photo, sentence, listing. Press a button. Done.

That is Sotheby. The Downton agent who turns a photo and a caption into a written, priced, properly categorised eBay listing. He runs behind Carson, never on Telegram directly. He has his own SOUL file, his own SQLite database, and an allowlist of skills that does not include "talking to humans." Where Carson is the chief of staff (and I [wrote up his story last time](/blog/carson-chief-of-staff-honesty-contract)), Sotheby is the auctioneer.

If you have not seen the previous two posts, the [framing one is here](/blog/downton-openclaw-what-agents-actually-are). Sotheby is the agent I am happiest about so far. He is also the agent who taught me the most about what "production-ready" actually means on a personal project.

## The Shape of the Work

A listing is a small but real piece of work. Sotheby breaks it into six steps.

**Intake.** A photo arrives on Telegram, addressed to Carson, with a caption. Carson recognises the intent (`sell.create`), dispatches it to Sotheby's create webhook with the photo path in the payload, and tells me Sotheby is on it.

**Identification.** Sotheby calls Anthropic with the image and a `submit_identification` tool. The model returns a best-guess brand, model, condition, visible defects, a postability flag (can this be parcelled, or is it collection-only?), and up to three follow-up questions if it cannot tell what the item is from the photo. If the answer needs clarifying, Sotheby asks through Carson and waits.

**Research.** Sotheby pulls recent sold listings from eBay UK (sold prices, not asking prices, drive valuations), gets at least five comparables, and computes a price range with a recommended list price slightly above the midpoint.

**Draft.** One structured-output model call produces the eBay title, the description in my house style (emoji-iconed sections, bullets, a keywords line), the eBay category and condition codes, a suggested buy-it-now price, a Best Offer auto-decline floor at 70% of list, and the postage mode. If the draft qualifies for a Facebook variant (collection-only, or I asked for extra exposure in the caption), the same call produces a warmer, shorter FB version.

**Approval card.** The card arrives on Telegram via a separate bot: primary photo, eBay title, price, postage tag, comp summary, and three buttons (Approve eBay, Approve Facebook, Cancel). The card is the gate. I press a button.

**Publish.** On Approve eBay, the workflow chains the eBay Sell API sequence: image upload (Trading API `UploadSiteHostedPictures`), then `createInventoryItem`, then `createOffer` referencing the right fulfilment policy, then `publishOffer`. The live listing URL comes back. Sotheby logs it. The draft moves to `listed`.

The whole thing runs on the Mini, persists to a SQLite database at `/Users/downton/data/sotheby/db/sotheby.db`, and keeps every intake photo on disk indefinitely (storage is about 1.25GB a year at household volume, the Mini does not care).

That is Sotheby on a good day. The interesting story is the bad days.

## The Multi-Photo Bug That Should Not Have Happened

Adam-the-user sends multiple photos by reflex. A card front and back. A bike from three angles. A piece of furniture wide, close, scuffed-bit. He sends them as one message, because that is how Telegram works.

Adam-the-developer wrote Phase 1a to handle a single intake photo, with multi-photo selection deferred to Phase 2. The Phase 1a contract said: the create flow reads `payload.image`, persists it under `photos/{draft_id}/`, and proceeds.

On the 19th of May I sent four photos of a Pokémon card. The dispatch carried `payload.images` (a list), not `payload.image` (a string). The create node read `payload.image`, found nothing, and threw "no image path in payload." Carson reported the failure plainly (the honesty boundary held, which was a small reassurance in an otherwise irritating moment). No draft was created.

The fix was specifying the resolution order: `payload.image` || `payload.image_path` || `payload.images[0]`. Use the first photo. The rest are ignored for Phase 1a, they sit on disk in OpenClaw's inbound area, and Phase 2 picks them up properly with multi-image upload to eBay and a primary-image selector.

This is not an exciting bug. The lesson is the bit underneath it: be tolerant in the receiver, then fix the dispatch shape in Carson. The spec calls this the lesson banked from 0.3.2. The defensive classifier in the workflow caught the bad shape even when the upstream agent did not produce the right one. The agent above gets cleaner over time. The workflow below stays paranoid.

I would not have known to write it that way without the bug.

## The Mattress Question

A week later, sat in front of the actual mattress in the actual garage, I asked Carson, through Telegram: "Is it worth selling this mattress?" No photo. Just the question.

This was, by Carson's lights, a `sell` intent. He dispatched `sell.create-listing` with research instructions in the caption and no image. The workflow's create node hit the same failure mode as the Pokémon-card bug (no image, throws) and nothing came back. Two execution traces in n8n, both errored. Silent failure on Telegram.

The fix this time was a new shape of work entirely.

Sotheby gained a third intent, `sell.research`. The payload is `{ item, description?, condition?, category?, caption? }`. No photo. No DB row. No approval card. It calls Anthropic with a new `submit_research` tool that returns the item identification, the market summary, a realistic low and high estimate, a recommended venue (eBay, Facebook Marketplace, Gumtree, charity, skip-or-dispose, other), a `worth_listing` boolean, an honest recommendation paragraph, the rationale, and any follow-up questions. The result returns through Carson, conversationally. Nothing is persisted because research is a query, not an artefact.

The research voice is the same honest-marketplace voice as drafting. The four-year-old mattress in clean condition? eBay UK does not allow used mattresses to be listed in many categories, the listing-on-Gumtree-or-Facebook hassle is real, and the upside is twenty pounds. The honest answer is "no, don't sell it. Drop it at a charity that takes mattresses, or book a skip."

I would have been embarrassed if Sotheby had spent a hundred lines drafting a listing for a mattress I should not be listing. The Research path is what stops that. It is also what the defensive classifier in the workflow now catches structurally: any create-shaped dispatch arriving without an image is routed to Research, regardless of intent name. Belt, braces, second pair of trousers.

## Production-First, Or: Dropping the Sandbox

I wrote the original spec with a sandbox-first gate. Three sandbox listings proven in eBay's developer sandbox before any production listing. Approve every listing, even in the sandbox.

I dropped it on the 24th of May.

The decision was a money-and-time one. The eBay sandbox is a parallel environment with its own setup, its own quirks, its own way of not quite matching production. For a personal household selling low-value items (sub-£200), the cost of the sandbox setup outweighs the safety benefit. The approval card is the real human gate. If I press Approve eBay and the publish fails, I see the failure on the card. No listing is created. The draft stays `approved-ebay` for a re-trigger. If I press Approve eBay and the publish succeeds, I see the live URL. There is no half-state where a partial listing reads as live.

What replaced the sandbox is engineering guardrails on the publish step:

- A deterministic SKU equal to `draft_id`. eBay rejects double-listing the same SKU, so a re-run cannot create a duplicate.
- A status check: the publish refuses unless the draft is in `approved-ebay` and not already in the `listings` table.
- Stop-and-report on any step error. If `createInventoryItem` fails, the draft stays `approved-ebay`, nothing is written to `listings`, and the card reports the failure. No silent "kind of listed" state.

The first real Approve eBay press posted a £40 item to my eBay account in roughly twelve seconds. The live URL came back. The draft moved to `listed`. I checked eBay. It was there. It sold three days later.

If I had insisted on the sandbox-first gate, I would still be configuring the developer environment instead of clearing the garage.

## Why Facebook Marketplace Is Always a Copy-Ready Draft

People ask: why does Sotheby publish to eBay but not to Facebook? Surely the local-pickup audience is bigger.

The answer is that Meta does not offer a public Marketplace listing API for individual sellers. There is no equivalent of the eBay Sell API for FB. If I want a Facebook listing posted automatically, I would need either a browser-automation hack against Marketplace (brittle, against Meta's terms) or a Facebook business account with API access I do not qualify for.

So Sotheby's FB output is copy-ready text. The approval card has an Approve Facebook button. Pressing it returns the FB title and description in a copy-paste format, with the photo file paths. I paste it into Facebook Marketplace manually.

That is honest. The earlier draft of the spec described the FB flow as something it was not, and I cut it back to what Sotheby actually does. Approve Facebook records the decision. The copy-ready hand-off is not yet built, and the card says so plainly. I would rather a slightly-disappointing button than a button that lies about what happened. Carson's honesty contract applies here too.

## What Sotheby Has Not Solved

He is not done. Two things stand out.

The first is **multi-photo eBay uploads**. Phase 1a uses the first photo only. eBay listings are richer with three or four. Phase 2 covers it.

The second is **auto-relisting and price reduction**. If a listing sits without an offer for a week, the right move is to drop the price 5% and relist. Sotheby does not do that yet. Phase 2 covers it too.

Neither is urgent. The bike sold the day after I listed it. The hi-fi speakers sold inside three days. The garage is, for the first time since 2019, an empty room with a workbench in it.

## Three Things I Took Away

**Tolerant in the receiver, fixed in the dispatcher.** The multi-photo bug and the mattress-research failure both followed the same pattern. A downstream workflow assumed the upstream agent would send the right shape, and a small variation in the real world broke it. The fix is two-layered every time. The agent above gets cleaner. The workflow below stays paranoid. Without both, the system falls over the first time the user does something the spec did not predict.

**Production-first beats sandbox-first when the gate is real.** A sandbox is an insurance policy. It is also a tax on every release. For low-stakes personal use with a structural approval gate (button, token, refuse-without-token), the insurance is not worth the tax. Engineering guardrails on the publish step do the real safety work: deterministic SKU, status check, stop-and-report. The sandbox is what I built when I did not yet trust the guardrails.

**The honest "we don't do that yet" is more useful than the polite "we do that, kind of."** Approve Facebook records the decision and tells me the copy-ready hand-off is not built. That is irritating once. It is also accurate, which means I never end up thinking a listing went up that did not. Carson's honesty contract is the foundation. Sotheby's job is to apply it to every state transition he can do, and to refuse the ones he cannot.

The garage is empty. Sotheby is at version 0.3.6 and still wrong in interesting ways. The next agent to ship is Florence (housekeeper). She has a simpler job, a stricter scope, and, with any luck, a less dramatic debut.
