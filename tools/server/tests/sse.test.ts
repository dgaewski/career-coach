import { describe, it, expect } from "vitest";
import { addClient, broadcast, closeAllClients } from "../src/sse.js";

function fakeReply() {
  const calls = { writes: [] as string[], ended: false };
  const raw = {
    writeHead() {},
    write(s: string) { calls.writes.push(s); return true; },
    on() {},
    end() { calls.ended = true; },
  };
  return { reply: { raw } as any, calls };
}

describe("sse", () => {
  it("broadcasts events to registered clients", () => {
    const a = fakeReply();
    addClient(a.reply);
    broadcast("refresh", "2026-06-20");
    expect(a.calls.writes.some(w => w.includes("event: refresh") && w.includes("2026-06-20"))).toBe(true);
  });

  it("closeAllClients ends every connection and stops further broadcasts", () => {
    const a = fakeReply(), b = fakeReply();
    addClient(a.reply); addClient(b.reply);
    closeAllClients();
    expect(a.calls.ended).toBe(true);
    expect(b.calls.ended).toBe(true);
    const before = a.calls.writes.length;
    broadcast("refresh", "x");          // registry cleared → no writes to closed clients
    expect(a.calls.writes.length).toBe(before);
  });
});
