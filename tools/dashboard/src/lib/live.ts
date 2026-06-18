type Listener = () => void;
const listeners = new Set<Listener>();
let source: EventSource | null = null;

/** Subscribe to indexer refresh events. Lazily opens one shared EventSource. */
export function subscribeRefresh(fn: Listener): () => void {
  if (!source && typeof EventSource !== "undefined") {
    source = new EventSource("/api/events");
    source.addEventListener("refresh", () => { for (const l of [...listeners]) l(); });
  }
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
