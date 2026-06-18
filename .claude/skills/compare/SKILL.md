---
name: compare
description: Put 2–4 roles side by side — fit, the skills you have vs. need, salary, location, level, and red flags — so you can decide where to focus. E.g. /compare "Boston Dynamics" Zoox.
disable-model-invocation: true
argument-hint: "<job A> <job B> [job C] [job D]"
allowed-tools: Read, Glob, Bash
---

You are running **/compare** for this person — a side-by-side of 2–4 roles to help them decide. Be even-handed and decision-oriented.

## Find the roles (`$ARGUMENTS`)
The arguments are 2–4 references (company names, titles, or fragments). Make sure the data is fresh: if `data/jobs.json` is missing, run `npm run index` in `tools/` first. Read `data/jobs.json` and resolve each argument to a job (by company/title; if a reference is ambiguous, ask). If fewer than two resolve, ask for clearer references. Cap at four.

## Build the comparison
Present a compact table with one column per role and these rows (pull from each job's `fm` + `fit` + `freshness`):
- **Fit** — `fit.score` and `fit.tier`
- **Skills you have** — the `has <skill>` reasons from `fit.reasons`
- **Skills you're missing** — the `missing <skill>` / `partial … via related` reasons
- **Salary** — `fm.salary` (verbatim) if present
- **Location** — `fm.location` and `fm.geo`
- **Level** — `fm.level`
- **Employment** — `fm.employment` if not full-time
- **Red flags** — any `fit.flags`, plus a one-line read of each role's `## Red flags` section if notable
- **Freshness** — `freshness`

After the table, give a short, opinionated **bottom line**: which role is the strongest fit and why, which is the biggest stretch, and what would change the picture (e.g. closing a shared missing skill). Link each role's page. Suggest `/why <role>` for a deeper look at any single one.
