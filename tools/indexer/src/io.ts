import { writeFile, rename } from "node:fs/promises";

/** Write via tmp file + rename so a crash or OneDrive sync lock never leaves a torn file. Retries EBUSY/EPERM. */
export async function atomicWrite(file: string, content: string): Promise<void> {
  const tmp = file + ".tmp";
  for (let attempt = 0; ; attempt++) {
    try {
      await writeFile(tmp, content, "utf8");
      await rename(tmp, file);
      return;
    } catch (e: unknown) {
      const code = (e as NodeJS.ErrnoException).code;
      if ((code === "EBUSY" || code === "EPERM") && attempt < 3) {
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
}
