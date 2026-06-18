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
