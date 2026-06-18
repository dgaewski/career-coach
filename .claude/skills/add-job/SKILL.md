---
name: add-job
description: Add a single job posting you found yourself — paste a URL or the posting text — and it gets scored and added to your dashboard. Use this for one-off roles outside your regular search.
disable-model-invocation: true
argument-hint: "<url or pasted posting text>"
allowed-tools: WebFetch, Read, Write, Edit, Glob, Grep, Bash
---

You are running **/add-job** for this person — ingesting one posting they handed you. Be warm and brief.

First read `USER.md` (their calibration) and `CLAUDE.md` (the **"Workflow: Manual drop"** section and the page schemas).

## Input (`$ARGUMENTS`)
- **a URL** → WebFetch it and confirm it's a real, live, specific posting (not a 404 or a generic careers page).
- **pasted posting text** → use it directly.
- **empty** → ask them to paste the URL or the posting text.

## Run the Manual drop workflow
Follow "Workflow: Manual drop" in `CLAUDE.md`:
- **Preserve the raw text first** under `raw-sources/postings/` (git-ignored; never committed).
- **Dedup** against their `jobs/` — if it's already there (or a repost), note it on the existing page rather than duplicating.
- Author the job page (valid frontmatter; non-empty `## Fit notes` specific to this person), create/update the company page, and create any missing skill pages.
- **Slugs exact** (the skill page's `slug:`, not its title); soft terms in `keywords:`. Add a non-remote city to `geo/places.json`.
- Update `index.md` + `log.md`.

## Finish
Run `npm run index` then `npm run checklinks` in `tools/`; resolve any warnings/errors/dead links. Report plainly: the role, its fit score and top gaps, and whether it was new or a duplicate.
