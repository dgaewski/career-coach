---
name: launch
description: Start the local dashboard server and open it in your browser, e.g. /launch. Serves the live coaching dashboard at http://localhost:4280 with hot-reload.
disable-model-invocation: true
allowed-tools: Bash, Read
---

You are running **/launch** for this person — bringing up their local dashboard. The server (`npm run coach`) serves the dashboard at **http://localhost:4280** and hot-reloads as wiki pages change.

## What to do

1. **Is it already running?** Quick-check the port before starting a second copy (it would fail with a port-in-use error):
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:4280` (or any equivalent reachability check).
   - If it answers (`200`), it's already up — just give them the URL and stop here; don't launch again.
2. **Fresh data:** a clone that has never been indexed has no git-ignored `data/`. If `data/overview.json` is missing, run `npm run index` in `tools/` first (one pass) so the dashboard has something to serve.
3. **Launch in the background.** Start `npm run coach` from `tools/` as a background process (it's a long-running server — never run it in the foreground, it would block the session). On boot the server **builds the dashboard bundle itself** if it's missing or stale (the UI is a per-instance bundle in the git-ignored `tools/dashboard/dist/`), so a fresh clone self-heals — no manual `npm run dash:build` needed. Give it a moment, then confirm the port is answering.
4. **Report plainly:**
   - The URL: **http://localhost:4280** (offer to open it in their browser).
   - That it hot-reloads — edits from `/find-jobs`, `/enrich`, `/coach`, etc. show up live, no restart needed.
   - How to stop it: close the session, or kill the background process (mention the platform's way — e.g. `Ctrl-C` in the terminal running it, or stopping the background task).

If the server fails to start, surface the actual error (commonly: dependencies not installed → tell them to run `/setup`; or the port is taken by something else → suggest freeing :4280). Don't claim success without confirming the port answers.
