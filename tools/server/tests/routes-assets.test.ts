import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { DataStore } from "../src/store.js";

let app: Awaited<ReturnType<typeof buildApp>>;
let root: string;
beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), "ccassets-"));
  await mkdir(path.join(root, "assets", "logos"), { recursive: true });
  await writeFile(path.join(root, "assets", "logos", "acme.png"), "PNGDATA");
  app = await buildApp(new DataStore(root), root);
});
afterAll(async () => { await rm(root, { recursive: true, force: true }); });

describe("static /assets", () => {
  it("serves an existing logo file", async () => {
    const r = await app.inject({ method: "GET", url: "/assets/logos/acme.png" });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain("PNGDATA");
  });
  it("404s a missing logo file", async () => {
    const r = await app.inject({ method: "GET", url: "/assets/logos/nope.png" });
    expect(r.statusCode).toBe(404);
  });
});
