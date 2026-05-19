---
title: "The Consent Screen That Never Showed Up"
date: "2026-05-18"
excerpt: "The MCP server worked from Claude Code and from the desktop app. From a browser tab it refused every write, with no error worth the name. The fix took four pull requests and one offhand sentence from me that I should have led with."
tags: ["MCP", "OAuth", "AI Agents", "Claude", "Debugging"]
image: "/images/blog/consent-screen-never-showed-up.jpg"
---

## Where I Left Off

In the last few posts I kept referring to "the OAuth build" and then not explaining it, because at the time it worked, and working things make dull posts. This one stopped working in an interesting way, so now it gets its post.

The setup: my site runs a remote MCP server. Reads are public, so any agent, signed in or not, can pull my context files. Writes are not, so only I can append to the private journal. I use that server from three places: Claude Code on my laptop, the Claude desktop app, and Claude in a browser tab. Same server, same URL, three clients.

It worked from two of them. From the browser, every write was rejected, and the rejection told me almost nothing.

## Three Harnesses, Three Behaviours

The thing I didn't appreciate going in: "an MCP client" is not one thing. The three Claude harnesses authenticate in three different ways, and the differences stay invisible until exactly one of them breaks.

**Claude Code** uses a static bearer token I put in its config. No OAuth at all. It presents the token on every request, the server recognises it, done. This is why Claude Code never had a problem, and also why it told me nothing useful: a path that skips the entire auth flow cannot surface a bug in the auth flow.

**The desktop app** does real OAuth, eagerly. The moment you add the connector it runs the whole flow, gets a token, and caches it. So it had a token, and writes mostly worked.

**The browser** does real OAuth, lazily. It connects with no credentials, discovers it can read things, and reads them. It attempts to authenticate only when the server tells it to. If the server never tells it to, it never authenticates, and it never tells you that it didn't.

That last sentence is the entire bug. It took me two wrong fixes to see it.

## The Bug That Wasn't, Twice

My first theory was scope. The browser's token, if it had one, might be read-only. I found a real defect: when a client didn't request a specific scope, the server defaulted it to read-only instead of granting write. I fixed it. Genuine bug. Not the bug, because the browser had no token at all, so its scope was academic.

My second theory was token refresh. When a client refreshes an expired token, the old scopes were carried forward verbatim, so a token that started read-only stayed read-only forever even after the default was fixed. Also a real defect. Also fixed. Also not the bug, for the same reason: you cannot refresh a token you never had.

Two pull requests, two real latent defects repaired, zero progress on the symptom. I was fixing the scope of a token that did not exist. The reason I kept doing this is that the error said "requires the context:write scope", and I believed the error instead of checking what was actually on the wire. That is an embarrassing thing to put in a post and a useful thing to admit to myself.

## The Observation That Cracked It

The fix started with a sentence from me, not from the code. I have never seen a consent screen in the browser.

That should have been the first thing I reasoned about and it was roughly the twentieth. If you have never consented, you have never authorised anything, which means the browser was never running the OAuth flow. Not failing it. Not even starting it.

So I stopped theorising and looked at the wire. One unauthenticated write call, raw response:

```
HTTP/2 200
content-type: application/json

{"result":{"content":[{"type":"text",
  "text":"Unauthorized: ... requires the 'context:write' scope"}],
  "isError":true}}
```

A `200`. An "Unauthorized" message wrapped inside a successful HTTP response. No `WWW-Authenticate` header anywhere.

A web MCP client decides whether to authenticate from the HTTP status. It expects a protected resource to answer an unauthorised request with `401` and a `WWW-Authenticate` header pointing at the metadata it needs to begin OAuth. My server was answering with `200` and an apology in the body. To the browser that is a call that worked and returned some text. Nothing in it says "go and authenticate", so the browser never did, never showed a consent screen, and surfaced a tool error that read like a permissions problem when it was really a "you are a stranger and I never asked who you are" problem.

The fix is to fail loudly. An unauthorised call to a write tool now returns a real `401` with a real `WWW-Authenticate` header carrying the metadata pointer. Reads stay public and untouched. The browser got the signal, ran discovery, and showed me the consent screen I had been insisting did not exist.

## The Last Hop

The consent screen appeared. I approved it. It failed.

```
{"type":"error","error":{"type":"invalid_request_error",
  "message":"Method Not Allowed"}}
```

That error came from the browser client's own callback endpoint, not from my server, which made it briefly baffling. The chain: the consent page is a form, the form submits with POST, and on approval the server redirects the browser to the client's OAuth callback. I built that redirect with the framework's default helper, which returns a `307`. A `307` preserves the original method, so the browser did not GET the callback, it POSTed it. OAuth redirect endpoints accept GET. The client correctly rejected a POST it should never have been sent, and the rejection looked like the client was broken when the broken thing was my redirect.

The fix is one line, `307` to `303`. A `303` means "I have handled your POST, now go GET this other thing". It is the correct status for a post-consent redirect, and I had reached for the default instead of the right one.

After that it worked from the browser. Four pull requests: two that fixed real bugs that were not this one, one that made the server speak the part of the protocol clients actually listen to, one that fixed a redirect verb.

## The Other Thing: Prompts Aren't Commands

A smaller surprise from the same project, same theme. MCP servers can expose tools, which an agent calls, and prompts, which a user invokes. I wrote a `log-session` prompt and expected to type `/log-session` in Claude Code and have it appear.

It does not. Claude Code does not surface MCP prompts as slash commands. The `/` menu there is for the harness's own commands and your project commands, not for prompts arriving off a connector. The other clients treat prompts differently again. Same shape as the auth story: the capability is in the protocol, and how much of it reaches you depends on which harness you happen to be sitting in.

The workaround is unglamorous and worth knowing. Expose the prompt's content as a tool as well, so an agent can fetch the same text by calling a function, then ship a tiny project command file that calls that tool and follows what comes back. The protocol text lives once and is reachable two ways, so the surfaces cannot drift. That is duplicating the delivery, not the content, which is the only kind of duplication worth having.

## Three Things I Took Away

**Fail loud, or you have not failed, you have lied.** A `200` with an error string inside it is not an error to anything that reads HTTP for a living. The status code is the part of the response other software actually believes. If a request did not succeed, the status has to say so, or every client that trusts the protocol gets misled in exactly the way I misled the browser for a fortnight.

**The harness is part of the contract.** "It works in Claude Code" is not a fact about my server. It is a fact about one client that happens to skip the hard part. Three harnesses, three auth models, and the only way to know something works in the one you will use is to test it in the one you will use.

**I believed the error message over the wire, and I should have believed the offhand remark over both.** The decisive clue was a sentence I said out loud and then ignored for most of a day. The wire told the truth the moment I looked at it. The error message was technically accurate and completely misleading, which is the most dangerous kind of accurate. I shipped two correct fixes to the wrong problem because reading a string is easier than reading a packet. I would like to say I will not do that again.

The OAuth build is the part of this project I kept not writing about because it worked. It is now the part I have learned the most from, entirely because of the fortnight it spent not working from one of three places that all looked the same from where I was standing.
