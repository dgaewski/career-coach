import { readFileSync } from "node:fs";
import path from "node:path";
import type { Config } from "./types.js";

export function loadConfig(toolsDir: string): Config {
  const raw = readFileSync(path.join(toolsDir, "config.json"), "utf8");
  return JSON.parse(raw) as Config;
}

export function loadPlaces(root: string): Record<string, [number, number]> {
  const raw = readFileSync(path.join(root, "geo", "places.json"), "utf8");
  return JSON.parse(raw) as Record<string, [number, number]>;
}
