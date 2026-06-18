export function parseSalaryMidpoint(s: string | undefined): number | null {
  if (!s) return null;
  if (/\/\s*hr|hour/i.test(s)) return null;
  const nums: number[] = [];
  const kMatches = s.matchAll(/\$?\s*(\d{2,3}(?:\.\d+)?)\s*k/gi);
  for (const m of kMatches) nums.push(Math.round(parseFloat(m[1]) * 1000));
  if (nums.length === 0) {
    const dMatches = s.matchAll(/\$\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?)/g);
    for (const m of dMatches) nums.push(Math.round(parseFloat(m[1].replace(/,/g, ""))));
  }
  if (nums.length === 0) return null;
  const mid = (Math.min(...nums) + Math.max(...nums)) / 2;
  return Math.round(mid);
}

export function salaryWarnings(
  entries: { file: string; midpoint: number }[],
  range: { min: number; max: number },
): string[] {
  return entries
    .filter(e => e.midpoint < range.min || e.midpoint > range.max)
    .map(e => `salary sanity: ${e.file} midpoint $${e.midpoint} outside $${range.min}–$${range.max}`);
}
