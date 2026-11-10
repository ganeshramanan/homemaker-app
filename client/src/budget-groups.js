// Which group each expense category belongs to. Used by the server (totals) and the screens (charts), so they always agree.
// "saving" = savings and investments: money you keep, not money you spend.
export const GROUPS = ["saving", "insurance", "regular", "lifestyle"];
const RULES = [
  ["saving", /sav|gold|chit|selvamagal|sukanya|\brd\b|stock|share|mutual|\bsip\b|invest|\bfd\b|fixed deposit|ppf|\bnps\b|crypto|bond/i],
  ["insurance", /insur|\blic\b|premium|mediclaim/i],
  ["lifestyle", /entertain|festival|cloth|charity|silambam|gift|travel|holiday|hobby|movie|dining|party|shopping|^other$/i],
];
export function defaultGroup(category) {
  const c = String(category || "").trim();
  for (const [g, re] of RULES) if (re.test(c)) return g;
  return "regular";
}
// overrides: the person's own choices, { "Category name": "group" }
export function groupOf(category, overrides = {}) {
  const c = String(category || "").trim().toLowerCase();
  for (const k of Object.keys(overrides || {})) if (k.toLowerCase() === c && GROUPS.includes(overrides[k])) return overrides[k];
  return defaultGroup(category);
}
