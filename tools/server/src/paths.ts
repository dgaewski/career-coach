import path from "node:path";
import { fileURLToPath } from "node:url";

/** Wiki root: argv[2] if given, else three dirs up from server/src (tools/..). */
export function resolveWikiRoot(argv: string[]): string {
  if (argv[2]) return path.resolve(argv[2]);
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..", "..");
}
