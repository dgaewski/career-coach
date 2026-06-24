import { exec } from "node:child_process";
import path from "node:path";
import { runIndexer } from "../../indexer/src/index.js";
import { buildApp } from "./app.js";
import { DataStore } from "./store.js";
import { resolveWikiRoot } from "./paths.js";
import { makeReindexScheduler, startWatcher } from "./watch.js";
import { broadcast, closeAllClients } from "./sse.js";
import { dashboardState, buildDashboard } from "./dashboard.js";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";

const PORT = 4280;

async function main(): Promise<void> {
  const root = resolveWikiRoot(process.argv);
  const store = new DataStore(root);

  const reindex = async () => {
    try {
      await runIndexer(root, new Date());
      store.invalidate();
      broadcast("refresh", (await store.meta()).generatedAt);
      console.log(`[coach] re-indexed at ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      console.error("[coach] re-index failed:", e instanceof Error ? e.message : e);
    }
  };

  await reindex();                                       // fresh data on boot

  const scheduler = makeReindexScheduler(reindex, 1000);
  const app = await buildApp(store, root, () => scheduler.poke());
  const watcher = startWatcher(root, () => scheduler.poke());

  let stopping = false;
  const shutdown = async (): Promise<void> => {
    if (stopping) return;                                 // ignore a second Ctrl-C mid-shutdown
    stopping = true;
    await watcher.close();
    closeAllClients();          // end SSE streams first so app.close() doesn't hang on them
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Self-heal a missing or stale bundle on boot: serving an old bundle against
  // freshly-indexed data (whose shape may have changed) crashes the UI. Rebuild
  // is best-effort — if it fails we still serve whatever bundle exists.
  const state = dashboardState(root);
  if (state !== "fresh") {
    try {
      console.log(`[coach] dashboard bundle ${state} — rebuilding (npm run dash:build)…`);
      buildDashboard(root);
      console.log("[coach] dashboard rebuilt.");
    } catch (e) {
      console.error(`[coach] dashboard rebuild failed (${e instanceof Error ? e.message : e}) — `
        + "serving the existing bundle if present; run `npm run dash:build` manually.");
    }
  }

  const dist = path.join(root, "tools", "dashboard", "dist");
  if (existsSync(dist)) {
    await app.register(fastifyStatic, { root: dist });
    // BrowserRouter deep links (e.g. /jobs/acme-robot-dev) must serve the SPA shell.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/api/")) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: "not found" });
    });
  } else {
    app.get("/", async (_req, reply) => reply.type("text/html").send(
      `<h1>Career_Coach API</h1><p>Dashboard not built yet — run <code>npm run dash:build</code>. API live: <a href="/api/summary">/api/summary</a></p>`));
  }

  await app.listen({ port: PORT, host: "127.0.0.1" });
  console.log(`[coach] http://localhost:${PORT}`);
  if (process.platform === "win32") exec(`start http://localhost:${PORT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
