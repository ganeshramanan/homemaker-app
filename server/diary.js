// Diary module: one private entry per person per day. There is deliberately no admin route here:
// the admin can switch the section on or off for a user, but can never read diary text.
import { Router } from "express";
import { prisma } from "./db.js";
import { requireModule } from "./auth.js";

const r = Router();
r.use(requireModule("diary"));

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const uid = (req) => req.user.id;
const bad = (res, msg) => res.status(400).json({ error: msg });
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MOODS = ["happy", "calm", "sad", "tired", "angry"];
const MAX_TEXT = 8000;

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && y <= 2200 && t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
const pick = (e) => ({ id: e.id, date: e.date, text: e.text, mood: e.mood, updatedAt: e.updatedAt });

// All entries of one month, newest day first.
r.get("/entries", wrap(async (req, res) => {
  const m = String(req.query.month || "");
  if (!MONTH.test(m)) return bad(res, "Bad month");
  const rows = await prisma.diaryEntry.findMany({ where: { userId: uid(req), date: { startsWith: m } }, orderBy: { date: "desc" } });
  res.json(rows.map(pick));
}));

// Words anywhere in any entry, newest first.
r.get("/search", wrap(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  if (q.length < 2) return res.json([]);
  const rows = await prisma.diaryEntry.findMany({ where: { userId: uid(req), text: { contains: q, mode: "insensitive" } }, orderBy: { date: "desc" }, take: 100 });
  res.json(rows.map(pick));
}));

// The same day in earlier (and later) years.
r.get("/on-this-day", wrap(async (req, res) => {
  const d = String(req.query.date || "");
  if (!validDate(d)) return bad(res, "Bad date");
  const rows = await prisma.diaryEntry.findMany({ where: { userId: uid(req), date: { endsWith: d.slice(4), not: d } }, orderBy: { date: "desc" } });
  res.json(rows.filter((e) => e.text.trim()).map(pick));
}));

r.get("/entries/:date", wrap(async (req, res) => {
  if (!validDate(req.params.date)) return bad(res, "Bad date");
  const e = await prisma.diaryEntry.findUnique({ where: { userId_date: { userId: uid(req), date: req.params.date } } });
  res.json(e ? pick(e) : null);
}));

// Save a day. Empty text and no mood removes the entry.
r.put("/entries/:date", wrap(async (req, res) => {
  const date = req.params.date;
  if (!validDate(date)) return bad(res, "Bad date");
  const text = String(req.body.text ?? "").slice(0, MAX_TEXT);
  const mood = MOODS.includes(req.body.mood) ? req.body.mood : "";
  const where = { userId_date: { userId: uid(req), date } };
  if (!text.trim() && !mood) {
    await prisma.diaryEntry.deleteMany({ where: { userId: uid(req), date } });
    return res.json(null);
  }
  const e = await prisma.diaryEntry.upsert({ where, update: { text, mood }, create: { userId: uid(req), date, text, mood } });
  res.json(pick(e));
}));

r.delete("/entries/:date", wrap(async (req, res) => {
  if (!validDate(req.params.date)) return bad(res, "Bad date");
  await prisma.diaryEntry.deleteMany({ where: { userId: uid(req), date: req.params.date } });
  res.json({ ok: true });
}));

export default r;
