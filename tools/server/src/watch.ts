import chokidar from "chokidar";
import path from "node:path";

export interface ReindexScheduler { poke(): void }

/** Debounce pokes into single runs; pokes arriving mid-run schedule one trailing run. */
export function makeReindexScheduler(run: () => Promise<void>, debounceMs: number): ReindexScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let runningPromise: Promise<void> | null = null;
  let pending = false;

  const fire = () => {
    timer = null;
    if (runningPromise) { pending = true; return; }
    runningPromise = run().finally(() => {
      runningPromise = null;
      if (pending) { pending = false; schedule(); }
    });
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fire, debounceMs);
  };
  return { poke: schedule };
}

const WATCH_DIRS = ["jobs", "skills", "companies", "coach"];
const IGNORE = /[\\/](data|analytics|tools|node_modules|\.git)[\\/]|\.tmp$/;

export function startWatcher(root: string, onChange: () => void): { close(): Promise<void> } {
  const watcher = chokidar.watch(WATCH_DIRS.map(d => path.join(root, d)), {
    ignored: IGNORE, ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });
  watcher.on("all", onChange);
  return { close: () => watcher.close() };
}
