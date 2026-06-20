// Per-key in-memory mutex. Serializes read-modify-write on a single file so
// concurrent POSTs (app-status / note) can't clobber each other (lost update).
// Single-process only — adequate for the local single-user server.
const chains = new Map<string, Promise<unknown>>();

export function withFileLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  // run fn after the prior holder settles, whether it resolved or rejected
  const result = prev.then(() => fn(), () => fn());
  // keep a non-rejecting tail so one failure doesn't poison the queue
  const tail = result.then(() => {}, () => {});
  chains.set(key, tail);
  // drop the entry once the queue drains, so the map doesn't grow unbounded
  tail.then(() => { if (chains.get(key) === tail) chains.delete(key); });
  return result;
}
