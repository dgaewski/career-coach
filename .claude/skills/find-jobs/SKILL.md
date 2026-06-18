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

## Run the Ingest batch workflow (scoped to this user)
Follow "Workflow: Ingest batch" in `CLAUDE.md` end to end. These guardrails matter most — do not skip them:
- **Real postings only.** Search company career pages and public ATS boards (Greenhouse/Lever/Ashby) across their tracks × **all** their geo-zones (not just their home metro). Respect `exclude` — never ingest those domains.
- **Verify each posting is live.** WebFetch the canonical posting URL and confirm it returns a real, specific job (not a 404/410, not a generic careers/search page) before authoring a page for it.
- **Dedup** against their existing `jobs/` (exact `url`, then normalized company+title). A repost → note it on the existing page's `## Red flags`, don't re-ingest.
- **Slugs must be exact.** Each `skills:` entry must be a skill page's exact `slug:` value (run `grep '^slug:' skills/*.md` first), not the page title. Soft/tooling terms go in `keywords:`.
- **Geo:** add each non-remote city to `geo/places.json` (repo root) for any zone defined in their `USER.md`.
- Write the job page (with a non-empty `## Fit notes` specific to this person), create/update the company page, create any missing skill pages, and update `index.md` + `log.md`.

## Finish
- Run `npm run index` then `npm run checklinks` in `tools/`. Resolve any unresolvable slugs, alias collisions, empty `## Fit notes`, or dead links before reporting.
- Write a batch brief at `coach/briefs/<today> Batch Brief.md` (see Ingest step 7).
- Report plainly: how many new roles, how many dupes skipped, the top skills this batch, and the best 2–3 fits.
