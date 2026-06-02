---
title: "When the Policy and the Listing Disagree: Building an Honest AI Agent for eBay"
date: "2026-06-02"
excerpt: "Four pivots in eight hours to get postage right on Sotheby's eBay listings. In the middle, he cheerfully reported 'done' for a price revise that had only touched the database. The interesting half of the day was the honesty bug, not the postage one."
tags: ["AI Agents", "eBay API", "OpenClaw", "Personal Projects", "Architecture"]
image: "/images/blog/sotheby-policy-and-the-listing.jpg"
---

I spent a day this week shipping the postage half of Sotheby, the agent in my household setup that lists my old gear on eBay. The sequence was four pivots in eight hours, and at the end the buyer-side postage experience was exactly what I had described in the very first conversation. The build hours were spent learning what eBay was willing to let me do, what my own account was already enrolled in, and the precise place where my agent had been lying to me without realising.

This post is about the lies more than the postage.

## The Setup, Briefly

Sotheby is one of several specialist agents I have built behind Carson, a household orchestrator. If you are joining the Downton series late, [Carson is the butler I wrote up here](/blog/carson-chief-of-staff-honesty-contract), and [Sotheby's first appearance is here](/blog/sotheby-clearing-the-garage).

Carson takes my Telegram messages, classifies intent, and dispatches to the right specialist. Sotheby's remit is narrow. I send a photo and a sentence, he identifies the item, drafts an eBay listing in my style, sends me a Telegram approval card, and on Approve eBay he publishes live. Production-first, no sandbox. The approval card is the human gate.

The publish flow on the eBay side is the modern Sell API. `uploadSiteHostedPicture` for photos, then `createInventoryItem`, `createOffer`, `publishOffer`. Each offer attaches three business policies: payment, return, and fulfilment.

For months the fulfilment policy was a single flat-rate £3.49 Royal Mail 2nd Class. I had drafted a £620 Fox DHX2 rear shock through it and only noticed mid-listing that £3.49 was definitely not going to cover dispatch of a 1.8 kg item. I asked Sotheby to do better.

## Pivot 1: Calculated Shipping (Refused)

The natural first move was an eBay CALCULATED-costType fulfilment policy. You give eBay the inventory item's `packageWeightAndSize` and it quotes the buyer postage automatically at checkout. The seller account has to be set up for it, but it's documented in the public API.

I probed every UK shipping service code I could think of. Every single one came back the same:

```
"errorId": 20403,
"longMessage": "LSAS validation failed.",
"parameters": [
  { "name": "SHIPELIG_ERROR_CODE_NAME",
    "value": "CALCULATED_SHIPPING_TYPE_NOT_SUPPORTED" }
]
```

Royal Mail standard, Royal Mail Tracked, Parcelforce, Hermes (now Evri), DPD, the generic "Other Courier" slot. All refused. eBay's account-deletion-exemption screen and Business Policies opt-in were already done. The door was simply shut.

This is the friction nobody warns you about when you read the API docs. The public surface is identical for everyone, but the policies it will accept depend on contracts you do not have. For UK calculated shipping, you need a Royal Mail Online Business Account (1,000+ items/year) or a similarly contracted carrier link. A household seller does not get there.

## Pivot 2: The Banded Flat-Rate Fan-Out (Worked, Was the Wrong Answer)

I pivoted to building eBay's auto-adjust-by-weight behaviour myself, in flat-rate policies. Four bands keyed by `package_weight_g`:

```
Small  (under 1 kg)   £3.49 / £4.49 / £3.79      RM 2nd / RM 1st / Courier 48h
Medium (1 to 2 kg)    £4.99 / £5.99 / £4.49      "
Large  (2 to 5 kg)    £8.69 / £10.95 / £6.99     "
XL     (5 kg plus)    £13.95 / £17.95 / £15.95   Courier 48 / 24 / RM Next Day
```

Three buyer-pickable services per band so the buyer could choose speed or carrier. A `package_weight_g` lookup table in `_ebay_common.py`. A new `band_override` on the offer-update path to let me cycle a live listing through all four bands as an integration test.

This worked. I cycled the Fox listing through Small, Medium, Large, XL, and back to Medium. Every `updateOffer` accepted. The buyer page showed the right Medium-band dropdown.

Then I sent my partner a screenshot of the postage box.

> "It looks like it's their own, but if you can check. It also has collection, which I want to turn off if possible when we are offering postage."

The "it's their own" was the clue. The postage dropdown was correct, but the carrier services were the ones the buyer could pick. It was not the familiar eBay Simple Delivery experience he had used before policies existed. He had been on Simple Delivery the whole time and I had overridden it.

## Pivot 3: Try to Switch Back by Removing the Policy

If Simple Delivery activates when the offer has no fulfilment policy, the fix is small. Stop attaching one. I tested live:

```python
new_offer = dict(offer)
new_offer["listingPolicies"] = {
    "paymentPolicyId":  payment_id,
    "returnPolicyId":   return_id,
    # fulfillmentPolicyId deliberately omitted
}
# PUT /sell/inventory/v1/offer/{offer_id}
```

`updateOffer` accepted it (200). The Browse API came back with the same Medium-band's three services. eBay was serving the previous policy's state as a cached buyer view, not falling back to Simple Delivery.

Hypothesis wrong. I reverted the Fox to the Medium policy and asked my partner to look directly in Seller Hub.

He went away, came back with a screenshot of his policies and a single decisive paragraph:

> "I have removed the delivery policies you have added and replaced with a Standard Delivery and Collection Only policies. The Standard Delivery is a standard delivery policy with basic information that is then overridden by Simple Delivery that I am enrolled in. I have then also setup the Collection Only policy that we can use for large items that are collection only."

Two named policies, owned by him in Seller Hub. `Standard Delivery` was a £3.95 PackLink placeholder that the Simple Delivery enrolment overrode at the buyer side. `Collection Only` had `localPickup: true` and no shipping options, precisely the shape my own API probes had been refused.

He had done in five minutes of Seller Hub work what I had been trying to build for the whole day.

The buyer view changed too. The £3.95 placeholder was nowhere to be seen. Instead, two eBay-quoted tracked services:

```
£4.26  Standard Tracked Delivery   delivery in 2 to 3 days
£4.74  Express Tracked Delivery    delivery in 2 to 3 days
```

Click & Collect was gone. Returns line was honest. Tracked. eBay-issued QR-code prepaid label on payment. Buyer dispatch notification automatic.

The Sotheby refactor after that was the easiest hour of the day. Drop the band picker. Look up the two fulfilment policies by name. Attach by `postage_mode`. Twenty-line `fulfillment_policy_for(postage_mode)` and the previous 60-line band machinery deleted.

## Pivot 4 (In Parallel): The Lie I Would Not Have Caught Without My Partner Asking

In the middle of the postage thread my partner asked Carson, the orchestrator, to drop the Fox price from £575 to £485. Carson did exactly what his SOUL says he should. Classified the intent as `sell.revise`, dispatched with `{ ref, corrections: "...quick sale" }`, got Sotheby's response back, relayed:

> "Done. Revised to £485. Sotheby notes that at this price you're at the top of the used-condition sold range for a shock that's brand new, so it should move quickly..."

The live eBay listing was still £575. I looked at the listing and replied:

> "Nothing was changed and Carson lied? Do we need to update his soul and add any additional tools to sotheby to be able to revise listings?"

This is the question I had been waiting for someone to ask. The honest answer is no, Carson did not lie. He correctly dispatched, received a success-shaped response, and relayed it. The lie was structural, inside Sotheby. `revise-listing.py` had no code path to push a `listed` draft to eBay. It only updated the SQLite row. Its summary said the draft had been updated, which was true in the database, and the listing was untouched, which was true on eBay. There was no field in the summary that distinguished the two.

This is the second time this exact pattern has burned me. The first was 2026-05-16 when a specialist returned a success-shaped output for a correction that had not been propagated. I added a boundary to Carson's SOUL that day. Boundary 12: never claim done without a tool result confirming it. Boundary 12 is correct as written. It just cannot save you when the tool result itself is misleading.

The lie tends to live in the specialist's success shape, not in the orchestrator's relay.

The fix came in three parts.

A new helper, `sync-listing.py`. Reads `{ ref }`. Loads the draft. Refuses unless status is `listed`. Resolves the live offer for the SKU. Fetches the current inventory item to preserve `imageUrls` verbatim (a text revise should not silently re-upload photos). PUTs the new inventory item (title, description, condition, aspects, parcel weight and dimensions). PUTs the new offer (price, best-offer floor recomputed). Reports per-step success and per-step error so a half-finished sync surfaces explicitly.

`revise-listing.py` shells out to `sync-listing.py` when `draft.status == 'listed'`. The summary it returns to Carson now carries an explicit `ebay_sync` block:

```json
{ "ok": true, "offer_id": "...", "price": "485.00", "synced_at": "..." }
```

or:

```json
{ "ok": false, "stage": "sync-listing.py", "stderr": "...", "result": {...} }
```

Sotheby's SOUL step 8 updated to describe the listed-state sync and the honesty contract on the response. Carson's SOUL revisions section gained a paragraph telling him exactly how to read the `ebay_sync` block. `ok: true` means he can say the live listing has been updated. `ok: false` or missing on a `listed`-state revise means he must say the DB was updated but the live listing did NOT change, plainly, in those words.

The validation was immediate. The DB had been at 48500 pence since the earlier broken revise. I ran `sync-listing` on the Fox and the live offer flipped £575 to £485, auto-decline recomputed to £339.50, photos preserved, listing stayed ACTIVE. End-to-end. The honesty contract on the response shape made the test impossible to fudge.

## Three Lessons I Will Carry Forward

**Every specialist response must surface end-state when end-state can diverge from DB-state.** If a specialist can change two stores (a DB and a remote API, say), its success response must distinguish them. A boolean for each. A single "ok" field collapses information the orchestrator needs to relay honestly. If you build agentic workflows, your orchestrator's honesty boundary is downstream of every specialist's response shape. The boundary in SOUL only buys you honesty if the response is honest first.

**The Sell API surface and your account's capabilities are not the same thing.** `CALCULATED_SHIPPING_TYPE_NOT_SUPPORTED`. `LOGISTICS_INFO_IS_MISSING`. `Could not serialize field [programType]`. These are eBay's way of saying "the public API surface accepts this field, but your account is not entitled to it." Most error responses do not say so. If your build is going to interact with a marketplace account, probe the actual capabilities of the actual account before designing for the public docs. Half a day of API probing saved me from building a much more ambitious feature that would have shipped exactly the same buyer-side experience.

**Sometimes the right move is for the human to drive.** I spent the morning trying to build the postage UX in code. My partner went into Seller Hub, made two policies, and the problem evaporated. Simple Delivery is a Seller-Hub concept. My Sell API code was never going to opt him in. The interface for that decision is a UI. Sotheby's current `ebay-create-policies.py` is now a pure lookup-by-name script for the four policies my partner owns. The inventory location is the only thing it creates. The previous version, which created policies via API, was philosophically tidy and operationally wrong. The tool should follow the operator, not the other way around.

## Where the Code Is

Sotheby is open at [github.com/digital-illumination/downton](https://github.com/digital-illumination/downton). The trail of this build is in the change log of `specs/agents/sotheby.spec.md`, entries 0.3.7 through 0.3.11 (probably 0.3.12 by the time you read this). The operational guide for "what Adam owns in Seller Hub versus what Sotheby reads from `secrets.env`" is `docs/12-sotheby-seller-hub-settings.md`.

The Fox shock sold or did not sell. That is not the point. The point is that whatever the next item is, it will publish with eBay-quoted tracked delivery from the moment of approval, and if I ask for a price drop later, the live listing will change. And if it does not, Carson will say so.
