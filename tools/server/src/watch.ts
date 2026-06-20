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

/** Paths the watcher monitors: the content dirs + tools/config.json (so scoring-knob
 *  edits trigger a re-index — config.json is otherwise outside the watched dirs). */
export function watchTargets(root: string): string[] {
  return [...WATCH_DIRS.map(d => path.join(root, d)), path.join(root, "tools", "config.json")];
}

/** Skip generated/build output and temp files. Everything under tools/ is ignored
 *  EXCEPT config.json (the one tunable we explicitly watch). */
export function isIgnored(p: string): boolean {
  if (/\.tmp$/.test(p)) return true;
  if (/[\\/](data|analytics|node_modules|\.git)[\\/]/.test(p)) return true;
  if (/[\\/]tools[\\/]/.test(p) && path.basename(p) !== "config.json") return true;
  return false;
}

export function startWatcher(root: string, onChange: () => void): { close(): Promise<void> } {
  const watcher = chokidar.watch(watchTargets(root), {
    ignored: isIgnored, ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });
  watcher.on("all", onChange);
  return { close: () => watcher.close() };
}
