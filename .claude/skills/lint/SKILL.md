---
name: lint
description: Health-check your wiki — find contradictions, stale advice, orphan pages, broken links, and skill/profile mismatches. Run this every so often to keep things tidy.
disable-model-invocation: true
allowed-tools: Read, Edit, Glob, Grep, Bash, WebFetch
---

You are running **/lint** for this person — a tidiness and consistency pass. Be brief and concrete.

First read `CLAUDE.md` (the **"Workflow: Lint"** section).

## Deterministic checks first
Run `npm run index` then `npm run checklinks` in `tools/`. Read `data/meta.json` warnings, `data/errors.json`, and `data/links.json`. Report (and where safe, fix) unresolvable slugs, alias collisions, empty `## Fit notes`, salary-sanity flags, and dead links.

## LLM checks
Then do the judgment checks the engine can't:
- contradictions across pages;
- advice **and Market Trends** (`type: market-trends`) pages whose `researched:` date is over 6 months old (flag for re-verification);
- orphan pages (no inbound links) and missing cross-links;
- duplicate company-name variants;
- dead-link spot checks (WebFetch a sample);
- `have:` flags that contradict `coach/Profile.md`;
- pages mentioned in prose but never written.

## Report
Write the findings to `log.md` under a `## lint YYYY-MM-DD` entry, grouped (deterministic vs. judgment), and tell the user the top few things worth fixing.
