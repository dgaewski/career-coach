---
name: update
description: Pull the latest engine improvements from the template into your instance, without touching your personal data. Run it occasionally to stay current.
disable-model-invocation: true
allowed-tools: Bash, Read, Edit
---

You are running **/update** for this person — pulling engine updates from the public template (`upstream`) into their instance. Their data is never touched (the template and the user own different files by design).

1. **Check for `upstream`:** run `git remote -v`.
   - **If there is no `upstream` remote** → explain gracefully and stop: the public template isn't wired up yet, so there's nothing to pull. This command becomes active once `upstream` is set up (when the public template ships). Do not invent a remote.
   - **If `upstream` exists** → continue.
2. `git fetch upstream`, then merge the engine changes into their branch. By design the template and the user own different files, so this should apply cleanly; if anything ever conflicts, resolve engine files (`tools/`, `CLAUDE.md`, `.claude/`) in favor of the template and the user's data in favor of the user, and explain what you did.
3. If dependencies changed, run `npm install` in `tools/`. Then run `npm run index` to regenerate `data/`.
4. Tell them to restart the dashboard (`npm run coach`) to pick up the new engine, and summarize what's new.
