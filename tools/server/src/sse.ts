import type { FastifyReply } from "fastify";

const clients = new Set<FastifyReply>();

export function addClient(reply: FastifyReply): void {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  reply.raw.write("retry: 2000\n\n");
  clients.add(reply);
  reply.raw.on("close", () => clients.delete(reply));
}

/** End every open SSE response and clear the registry — call on shutdown so
 *  app.close() doesn't hang waiting on long-lived event-stream connections. */
export function closeAllClients(): void {
  for (const c of clients) { try { c.raw.end(); } catch { /* already gone */ } }
  clients.clear();
}

export function broadcast(event: string, data: string): void {
  for (const c of clients) {
    try {
      c.raw.write(`event: ${event}\ndata: ${data}\n\n`);
    } catch {
      // Socket died without a close event; drop the client so one dead
      // connection can't stop the broadcast to the rest.
      clients.delete(c);
    }
  }
}
