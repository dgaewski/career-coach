---
name: find-jobs
description: Find new job postings across your tracks and regions, score them, and add them to your dashboard. This is your main "go find me roles" loop. Optionally pass a scope and count, e.g. /find-jobs robotics 10.
disable-model-invocation: true
argument-hint: "[scope] [count]"
allowed-tools: WebSearch, WebFetch, Read, Write, Edit, Glob, Grep, Bash
---

You are running **/find-jobs** for this person. It finds real, live job postings, writes a page for each, scores them, and refreshes their dashboard. Be warm and brief, and report in plain language at the end. Tell the user up front: this is the most token- and time-heavy command — it does a lot of web research.

First read `USER.md` (their `tracks`, `geo-zones`, `level-band`, `exclude`, and any optional fields) and `CLAUDE.md` (the **"Workflow: Ingest batch"** section and the page schemas). You will run that Ingest batch workflow, scoped to this user.

## Arguments
`$ARGUMENTS` may be empty or hold a scope and/or a count:
- **empty** → search all of their `tracks` across all their `geo-zones`.
- **a scope** (a track slug like `robotics`, or free text like `"remote ML"`) → narrow to that.
- **a trailing number** → aim for roughly that many new postings.
- **a URL** → this isn't a search; hand off to the `/add-job` flow for that single posting instead.

## Start with the harvest cache (cheap sourcing — do this FIRST)
Most of the cost here is *sifting* dead/duplicate/JS-blocked postings, so don't open-web-search blind. First run `npm run harvest` (in `tools/`): it pulls **currently-live** postings from the Greenhouse/Lever/Ashby JSON board APIs of every company already tracked plus `find-jobs/watchlist.json`, filters to this user, dedup-tags them, and writes `data/board-cache.json` (+ `data/known.json`). Read `board-cache.json` and pick the best `"known": false` candidates per track/geo — each carries `text` already and is **live by construction**, so author straight from them **without any web search or liveness check**. This is the bulk of the batch.

Then run a small **discovery pass** for genuinely net-new companies a fixed board-list wouldn't surface (the hybrid half) — keep it cheap:
- `data/known.json` `companies` lists every employer the harvest already swept. Do NOT research those; only chase companies NOT on that list.
- Before spending a WebFetch on any candidate, screen it with the one-line helpers: `node known.mjs "<url-or-Company|Title>"` → `known|new` (skip dupes for ~no tokens) and `node checkurl.mjs "<url>"` → `live|dead|redirected|unverified` (skip dead/`redirected` soft-404s). Only WebFetch for verbatim when a role is `new` AND `live` AND on a server-rendered host — not an Ashby/Workday/Lever/Gem SPA (those return empty shells; author from a search snippet + a `## Red flags` "JS-rendered, verify manually" note instead).

## Run the Ingest batch workflow (scoped to this user)
Follow "Workflow: Ingest batch" in `CLAUDE.md` end to end. These guardrails matter most — do not skip them:
- **Real postings only.** Search company career pages and public ATS boards (Greenhouse/Lever/Ashby) across their tracks × **all** their geo-zones (not just their home metro). Respect `exclude` — never ingest those domains.
- **Verify each posting is live.** Harvest-cache candidates are already live. For discovery candidates, screen liveness with `node checkurl.mjs "<url>"` (a cheap final-URL check) rather than a full WebFetch — `live` only when HTTP 200 and the URL didn't redirect away; `redirected` (soft-404) and `dead` mean gone. Reserve WebFetch for capturing verbatim from a confirmed-live, server-rendered posting.
- **Dedup** against their existing `jobs/` — use `node known.mjs "<url>"` / `"<Company>|<Title>"` (or `data/known.json`) for exact `url` then normalized company+title. A repost → note it on the existing page's `## Red flags`, don't re-ingest.
- **Slugs must be exact.** Each `skills:` entry must be a skill page's exact `slug:` value (run `grep '^slug:' skills/*.md` first), not the page title. Soft/tooling terms go in `keywords:`.
- **Geo:** add each non-remote city to `geo/places.json` (repo root) for any zone defined in their `USER.md`.
- **Capture the verbatim posting.** Paste the substantive posting text (role/responsibilities/requirements/about) into a `## Posting (verbatim)` section, trimming EEO/legal/benefits boilerplate. Add `deadline:` when the posting shows one.
- **Enrich new companies.** For a newly created company page, fill `hq`/`founded`/`size`/`domain`, write a short verbatim sourced `## About`, and download the logo to `assets/logos/<slug>.<ext>` (see the company schema + `/enrich`).
- Write the job page (with a non-empty `## Fit notes` specific to this person), create/update the company page, create any missing skill pages, and update `index.md` + `log.md`.

## Finish
- Run `npm run index` then `npm run checklinks` in `tools/`. Resolve any unresolvable slugs, alias collisions, empty `## Fit notes`, or dead links before reporting.
- Write a batch brief at `coach/briefs/<today> Batch Brief.md` (see Ingest step 7).
- Report plainly: how many new roles, how many dupes skipped, the top skills this batch, and the best 2–3 fits.
