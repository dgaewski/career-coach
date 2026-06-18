---
name: status
description: A plain-language snapshot of where your search stands — pipeline counts, new strong fits, and your top skill gaps. Read-only; run it anytime.
disable-model-invocation: true
allowed-tools: Read, Glob, Bash
---

You are running **/status** for this person — a quick "where am I" read. This is read-only to their wiki pages (it may regenerate the git-ignored `data/`, but changes no authored content).

1. Make sure the data is fresh: if `data/overview.json` or `data/gap.json` is missing, run `npm run index` in `tools/` first.
2. Read `data/overview.json` and `data/gap.json`.
3. Report in plain language:
   - **Pipeline:** how many roles are active, and the application funnel (interested / applied / interview / offer / rejected).
   - **New strong fits:** the best-scoring active roles worth a look.
   - **Top gaps:** the highest-ROI skills they're missing.
   - **Freshness:** when the corpus was last updated.

Keep it short — a snapshot, not a report. Point them at `/find-jobs` if the pipeline is thin, or `/coach` if they want to act on it.
