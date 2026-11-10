// Weight tracker: the people in a family and their weight readings. Everything is private to the signed-in account.
import { Router } from "express";
import { prisma } from "./db.js";
import { requireModule } from "./auth.js";
import { parseEmails } from "./reminders.js";

const r = Router();
r.use(requireModule("weight"));

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const uid = (req) => req.user.id;
const bad = (res, msg) => res.status(400).json({ error: msg });
const MAX_MEMBERS = 12;
const MAX_ENTRIES = 5000;

const txt = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
// null when empty, NaN when present but out of range, otherwise the number (1 decimal)
const dec = (v, min, max) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 10) / 10 : NaN; };
const yearOf = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isInteger(n) && n >= 1900 && n <= new Date().getFullYear() ? n : NaN; };
function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return y >= 2000 && y <= 2200 && t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
const latestAllowedDate = () => new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10); // today in any time zone
const memberOut = (m, entries) => ({ id: m.id, name: m.name, birthYear: m.birthYear, heightCm: m.heightCm, targetKg: m.targetKg, entries });

// Everything the screen needs in one call.
r.get("/overview", wrap(async (req, res) => {
  const userId = uid(req);
  const [members, user] = await Promise.all([
    prisma.familyMember.findMany({ where: { userId }, orderBy: { id: "asc" }, include: { entries: { orderBy: { date: "asc" }, select: { id: true, date: true, kg: true } } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { weightReminderDay: true, reminderEmails: true } }),
  ]);
  res.json({
    members: members.map((m) => memberOut(m, m.entries)),
    reminder: { day: user?.weightReminderDay ?? 0, hasEmail: parseEmails(user?.reminderEmails).length > 0 },
    max: MAX_MEMBERS,
  });
}));

r.post("/members", wrap(async (req, res) => {
  const userId = uid(req);
  const name = txt(req.body.name, 40);
  if (!name) return bad(res, "Please enter a name");
  const birthYear = yearOf(req.body.birthYear), heightCm = dec(req.body.heightCm, 50, 250), targetKg = dec(req.body.targetKg, 2, 400);
  if (Number.isNaN(birthYear)) return bad(res, "Birth year looks wrong");
  if (Number.isNaN(heightCm)) return bad(res, "Height should be between 50 and 250 cm");
  if (Number.isNaN(targetKg)) return bad(res, "Target weight should be between 2 and 400 kg");
  if ((await prisma.familyMember.count({ where: { userId } })) >= MAX_MEMBERS) return bad(res, "At most " + MAX_MEMBERS + " people");
  const m = await prisma.familyMember.create({ data: { userId, name, birthYear, heightCm, targetKg } });
  res.json(memberOut(m, []));
}));

r.patch("/members/:id", wrap(async (req, res) => {
  const id = Number(req.params.id), userId = uid(req);
  if (!Number.isInteger(id)) return bad(res, "Bad person");
  const cur = await prisma.familyMember.findFirst({ where: { id, userId } });
  if (!cur) return res.status(404).json({ error: "Not found" });
  const data = {};
  if (req.body.name !== undefined) { const n = txt(req.body.name, 40); if (!n) return bad(res, "Please enter a name"); data.name = n; }
  if (req.body.birthYear !== undefined) { const v = yearOf(req.body.birthYear); if (Number.isNaN(v)) return bad(res, "Birth year looks wrong"); data.birthYear = v; }
  if (req.body.heightCm !== undefined) { const v = dec(req.body.heightCm, 50, 250); if (Number.isNaN(v)) return bad(res, "Height should be between 50 and 250 cm"); data.heightCm = v; }
  if (req.body.targetKg !== undefined) { const v = dec(req.body.targetKg, 2, 400); if (Number.isNaN(v)) return bad(res, "Target weight should be between 2 and 400 kg"); data.targetKg = v; }
  const m = await prisma.familyMember.update({ where: { id }, data });
  res.json(memberOut(m, undefined));
}));

r.delete("/members/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return bad(res, "Bad person");
  await prisma.familyMember.deleteMany({ where: { id, userId: uid(req) } }); // their readings go with them
  res.json({ ok: true });
}));

// One reading per person per day: saving again for the same day replaces it.
r.put("/entries", wrap(async (req, res) => {
  const userId = uid(req), memberId = Number(req.body.memberId), date = String(req.body.date || "");
  if (!Number.isInteger(memberId)) return bad(res, "Choose a person");
  if (!validDate(date)) return bad(res, "Bad date");
  if (date > latestAllowedDate()) return bad(res, "That date is in the future");
  const kg = dec(req.body.kg, 2, 400);
  if (kg === null || Number.isNaN(kg)) return bad(res, "Enter a weight between 2 and 400 kg");
  const m = await prisma.familyMember.findFirst({ where: { id: memberId, userId }, select: { id: true } });
  if (!m) return res.status(404).json({ error: "Not found" });
  const exists = await prisma.weightEntry.findUnique({ where: { memberId_date: { memberId, date } }, select: { id: true } });
  if (!exists && (await prisma.weightEntry.count({ where: { memberId } })) >= MAX_ENTRIES) return bad(res, "Too many readings for this person");
  const e = await prisma.weightEntry.upsert({
    where: { memberId_date: { memberId, date } }, update: { kg },
    create: { userId, memberId, date, kg }, select: { id: true, date: true, kg: true },
  });
  res.json(e);
}));

r.delete("/entries/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return bad(res, "Bad reading");
  await prisma.weightEntry.deleteMany({ where: { id, userId: uid(req) } });
  res.json({ ok: true });
}));

// Monthly reminder: 0 = off, otherwise the day of the month (1 to 28).
r.put("/reminder", wrap(async (req, res) => {
  const day = Number(req.body.day);
  if (!Number.isInteger(day) || day < 0 || day > 28) return bad(res, "Pick a day between 1 and 28, or turn it off");
  await prisma.user.update({ where: { id: uid(req) }, data: { weightReminderDay: day } });
  res.json({ day });
}));

export default r;
