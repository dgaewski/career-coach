import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["*.test.mjs", "indexer/tests/**/*.test.ts", "server/tests/**/*.test.ts", "dashboard/tests/**/*.test.{ts,tsx}"] },
});
