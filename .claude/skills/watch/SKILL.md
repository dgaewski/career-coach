---
name: watch
description: Schedule a recurring job search that runs on its own and saves new roles, e.g. /watch robotics weekly. Note the setup caveats below — scheduled runs happen in the background.
disable-model-invocation: true
argument-hint: "<category> <cadence>"
allowed-tools: Bash, Read
---

You are running **/watch** for this person — setting up a recurring `/find-jobs`. Be clear and honest about how scheduled runs work.

## Arguments (`$ARGUMENTS`)
A category/scope and a cadence, e.g. `robotics weekly` or `"remote ML" monthly`. If either is missing, ask.

## What to do
1. Read `USER.md` for their calibration (the scheduled search will use it).
2. Set up a recurring run of `/find-jobs <category>` at the requested cadence using Claude Code's scheduling.
3. **Explain the caveats plainly** before finishing — scheduled runs are headless/background, so:
   - the repo, the engine (`tools/` installed), and web access must be available when it runs;
   - each run commits new roles to their **private** repo (so a working `/backup` / `origin` is assumed);
   - interactively-authenticated services may be unavailable in a background run;
   - a capable model gives better discovery.
4. Tell them how to check results (their dashboard, or `/status`) and how to cancel the schedule.

If scheduling isn't available in their environment, say so and suggest running `/find-jobs` manually on their preferred cadence instead.
