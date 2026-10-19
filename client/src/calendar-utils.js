// Pure date helpers for the calendar. Dates are plain "YYYY-MM-DD" strings, so no time zones get involved.
export const pad = (n) => String(n).padStart(2, "0");
export const ymd = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`; // m is 1-12
export const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-12
export const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return { y, m, d }; };
export const localToday = (now = new Date()) => ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());
export const nowMin = (now = new Date()) => now.getHours() * 60 + now.getMinutes();
export const addDays = (s, n) => { const { y, m, d } = parseYmd(s); const t = new Date(Date.UTC(y, m - 1, d + n)); return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
export const weekday = (s) => { const { y, m, d } = parseYmd(s); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }; // 0 = Sunday
export const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export const fmtTime = (t) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };

// Dates (as strings) on which one event happens inside [from, to], both inclusive.
export function datesIn(ev, from, to) {
  if (ev.date > to) return [];
  const out = [], base = parseYmd(ev.date), a = parseYmd(from), b = parseYmd(to);
  if (ev.repeat === "yearly") {
    for (let y = Math.max(a.y, base.y); y <= b.y; y++) {
      const date = ymd(y, base.m, Math.min(base.d, daysIn(y, base.m))); // 29 Feb falls on 28 Feb in other years
      if (date >= from && date <= to && date >= ev.date) out.push(date);
    }
  } else if (ev.repeat === "monthly") {
    let y = a.y, m = a.m;
    if (base.y > y || (base.y === y && base.m > m)) { y = base.y; m = base.m; }
    while (y < b.y || (y === b.y && m <= b.m)) {
      const date = ymd(y, m, Math.min(base.d, daysIn(y, m))); // the 31st falls on the last day of shorter months
      if (date >= from && date <= to && date >= ev.date) out.push(date);
      if (++m > 12) { m = 1; y++; }
    }
  } else if (ev.date >= from && ev.date <= to) out.push(ev.date);
  return out;
}

// All occurrences of all events inside [from, to], sorted by day, with all-day events first.
export function occurrences(events, from, to) {
  const out = [];
  for (const ev of events) for (const date of datesIn(ev, from, to)) out.push({ ...ev, date, baseDate: ev.date, key: `${ev.id}|${date}` });
  return out.sort((x, y) => x.date.localeCompare(y.date) || (x.time || "").localeCompare(y.time || "") || x.id - y.id);
}

// Where an occurrence stands right now: past, now (up to 60 minutes after its time), soon (later today), today (all-day), later.
export function statusOf(o, today, nowM) {
  if (o.date < today) return "past";
  if (o.date > today) return "later";
  if (!o.time) return "today";
  const s = toMin(o.time);
  return nowM < s ? "soon" : nowM < s + 60 ? "now" : "past";
}
