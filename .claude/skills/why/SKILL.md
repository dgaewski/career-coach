---
name: why
description: Explain why a specific role scored the way it did — which of your skills count, what's missing, and the geo/level/flags behind the fit. Run it on any role you're curious about, e.g. /why "Boston Dynamics".
disable-model-invocation: true
argument-hint: "<job (company or title)>"
allowed-tools: Read, Glob, Bash
---

You are running **/why** for this person — explaining one role's fit score in plain language. Be concrete and honest, not flattering.

## Find the role (`$ARGUMENTS`)
The argument is a company name, job title, or fragment. Make sure the data is fresh: if `data/jobs.json` is missing, run `npm run index` in `tools/` first. Read `data/jobs.json` and match the argument to a job (by company/title; if several match, ask which one). If nothing matches, say so and suggest `/status` or `/find-jobs`.

## Explain the fit
From that job's record use `fit.score`, `fit.tier`, and especially **`fit.reasons`** (the engine's own breakdown) plus `fit.flags`:
- **What counts in your favor** — the `has <skill> (weight)` reasons (skills you have that the role wants), plus the geo and level fit.
- **What's holding it back** — the `missing <skill>` / `partial <skill> via related` reasons (your real gaps for this role), and any flags (`below floor`, `clearance likely required`, `US work authorization … likely required`, thin posting).
- **The bottom line** — what the `tier` means, and the one or two things that would move the score most (usually closing a top missing skill).

Cite the role by name and link its page. Keep it to a tight, readable explanation — the goal is for them to understand the number, not a data dump. Offer `/compare` if they want to weigh it against another role.
