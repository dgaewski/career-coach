// Dashboard screenshot helper. Usage: node shot.mjs [route ...] [--dark] [--width=N]
// Captures http://localhost:4280<route> to PNGs under the OS temp dir so I can "see" the dashboard.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const dark = args.includes("--dark");
const widthArg = args.find(a => a.startsWith("--width="));
const width = widthArg ? parseInt(widthArg.split("=")[1], 10) : 1440;
const routes = args.filter(a => !a.startsWith("--"));
const ROUTES = routes.length ? routes : ["/", "/jobs", "/skills", "/companies", "/map", "/coach", "/tracker", "/brief"];

const outDir = path.join(os.tmpdir(), "cc-shots");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
if (dark) await ctx.addInitScript(() => localStorage.setItem("cc-theme", "dark"));
const page = await ctx.newPage();

for (const route of ROUTES) {
  const url = `http://localhost:4280${route}`;
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 }); // SSE keeps the conn open, so 'networkidle' never fires
    await page.waitForSelector("main, .topnav", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2200); // let data fetches + animations/charts settle
    const slug = (route === "/" ? "overview" : route.replace(/\//g, "_").replace(/^_/, "")) + (dark ? "_dark" : "");
    const file = path.join(outDir, `${slug}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`shot ${route} -> ${file}`);
  } catch (e) {
    console.log(`FAIL ${route}: ${e.message}`);
  }
}
await browser.close();
console.log(`done -> ${outDir}`);
