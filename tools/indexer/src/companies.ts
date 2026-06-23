import type { Doc, JobFM, CompanyFM, CompanyStats } from "./types.js";
import { parseSalaryMidpoint } from "./salary.js";
import { slugify } from "./slug.js";

const LOGO_EXTS = ["png", "svg", "jpg", "jpeg", "webp"] as const;

function resolveLogo(name: string, logoFiles: string[]): string | null {
  const slug = slugify(name);
  for (const ext of LOGO_EXTS) {
    const f = `${slug}.${ext}`;
    if (logoFiles.includes(f)) return `assets/logos/${f}`;
  }
  return null;
}

export function computeCompanies(
  jobs: Doc<JobFM>[],
  companyDocs: Doc<CompanyFM>[] = [],
  logoFiles: string[] = [],
): CompanyStats[] {
  const fmByName = new Map(companyDocs.map(d => [d.name, d.fm]));
  const byCompany = new Map<string, Doc<JobFM>[]>();
  for (const j of jobs) {
    if (!byCompany.has(j.fm.company)) byCompany.set(j.fm.company, []);
    byCompany.get(j.fm.company)!.push(j);
  }
  return [...byCompany.entries()].map(([name, list]) => {
    const active = list.filter(j => j.fm.status === "active");
    const salaries = list.map(j => parseSalaryMidpoint(j.fm.salary)).filter((s): s is number => s !== null);
    const levels: Record<string, number> = {};
    for (const j of active) levels[j.fm.level] = (levels[j.fm.level] ?? 0) + 1;
    const fm = fmByName.get(name);
    return {
      name, active: active.length, total: list.length,
      avgSalary: salaries.length ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : null,
      remoteShare: active.length ? active.filter(j => j.fm.geo === "remote").length / active.length : 0,
      levels, repeatPoster: list.length >= 2,
      hq: fm?.hq, industry: fm?.industry, size: fm?.size,
      careersUrl: fm?.["careers-url"], domain: fm?.domain, founded: fm?.founded,
      logo: resolveLogo(name, logoFiles),
    };
  }).sort((a, b) => b.active - a.active);
}
