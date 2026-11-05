// Diary module: one private entry per person per day. There is deliberately no admin route here:
// the admin can switch the section on or off for a user, but can never read diary text.
import express, { Router } from "express";
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
const MAX_PHOTOS_PER_DAY = 6;
const MAX_PHOTO_BYTES = 900 * 1024;      // the phone shrinks photos first; this is the safety net
const MAX_USER_BYTES = 25 * 1024 * 1024; // per person, so one user cannot fill the shared free-tier database
const isJpeg = (b) => Buffer.isBuffer(b) && b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && y <= 2200 && t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
const pick = (e, photos) => ({ id: e.id, date: e.date, text: e.text, mood: e.mood, updatedAt: e.updatedAt, ...(photos !== undefined && { photos }) });
// How many photos each of these days has, in one query.
async function counts(userId, dates) {
  if (!dates.length) return {};
  const g = await prisma.diaryPhoto.groupBy({ by: ["date"], where: { userId, date: { in: dates } }, _count: { _all: true } });
  return Object.fromEntries(g.map((x) => [x.date, x._count._all]));
}
const withCounts = async (userId, rows) => { const c = await counts(userId, rows.map((e) => e.date)); return rows.map((e) => pick(e, c[e.date] || 0)); };

// All entries of one month, newest day first.
r.get("/entries", wrap(async (req, res) => {
  const m = String(req.query.month || "");
  if (!MONTH.test(m)) return bad(res, "Bad month");
  const rows = await prisma.diaryEntry.findMany({ where: { userId: uid(req), date: { startsWith: m } }, orderBy: { date: "desc" } });
  res.json(await withCounts(uid(req), rows));
}));

// Words anywhere in any entry, newest first.
r.get("/search", wrap(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  if (q.length < 2) return res.json([]);
  const rows = await prisma.diaryEntry.findMany({ where: { userId: uid(req), text: { contains: q, mode: "insensitive" } }, orderBy: { date: "desc" }, take: 100 });
  res.json(await withCounts(uid(req), rows));
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
  if (!e) return res.json(null);
  const ph = await prisma.diaryPhoto.findMany({ where: { userId: uid(req), date: req.params.date }, orderBy: { id: "asc" }, select: { id: true } });
  res.json(pick(e, ph.map((p) => p.id)));
}));

// Save a day. Empty text and no mood removes the entry.
r.put("/entries/:date", wrap(async (req, res) => {
  const date = req.params.date;
  if (!validDate(date)) return bad(res, "Bad date");
  const text = String(req.body.text ?? "").slice(0, MAX_TEXT);
  const mood = MOODS.includes(req.body.mood) ? req.body.mood : "";
  const where = { userId_date: { userId: uid(req), date } };
  if (!text.trim() && !mood && (await prisma.diaryPhoto.count({ where: { userId: uid(req), date } })) === 0) {
    await prisma.diaryEntry.deleteMany({ where: { userId: uid(req), date } });
    return res.json(null);
  }
  const e = await prisma.diaryEntry.upsert({ where, update: { text, mood }, create: { userId: uid(req), date, text, mood } });
  res.json(pick(e));
}));

r.delete("/entries/:date", wrap(async (req, res) => {
  if (!validDate(req.params.date)) return bad(res, "Bad date");
  await prisma.diaryPhoto.deleteMany({ where: { userId: uid(req), date: req.params.date } });
  await prisma.diaryEntry.deleteMany({ where: { userId: uid(req), date: req.params.date } });
  res.json({ ok: true });
}));

// ----- photos -----
// Upload one JPEG (raw bytes). The phone has already shrunk it; JPEG is checked by its first bytes, never trusted by name.
r.post("/entries/:date/photos", express.raw({ type: () => true, limit: "1mb" }), wrap(async (req, res) => {
  const date = req.params.date, userId = uid(req);
  if (!validDate(date)) return bad(res, "Bad date");
  const buf = req.body;
  if (!isJpeg(buf)) return bad(res, "Only JPEG photos are accepted");
  if (buf.length > MAX_PHOTO_BYTES) return bad(res, "That photo is too large");
  if ((await prisma.diaryPhoto.count({ where: { userId, date } })) >= MAX_PHOTOS_PER_DAY) return bad(res, "At most " + MAX_PHOTOS_PER_DAY + " photos a day");
  const used = await prisma.diaryPhoto.aggregate({ where: { userId }, _sum: { size: true } });
  if ((used._sum.size || 0) + buf.length > MAX_USER_BYTES) return bad(res, "Your photo space is full. Delete some photos first");
  await prisma.diaryEntry.upsert({ where: { userId_date: { userId, date } }, update: {}, create: { userId, date, text: "", mood: "" } });
  const p = await prisma.diaryPhoto.create({ data: { userId, date, data: buf, size: buf.length }, select: { id: true } });
  res.json({ id: p.id });
}));

// Only the owner can fetch a photo.
r.get("/photos/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return bad(res, "Bad photo");
  const p = await prisma.diaryPhoto.findFirst({ where: { id, userId: uid(req) }, select: { data: true } });
  if (!p) return res.status(404).json({ error: "Not found" });
  res.set({ "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline", "Content-Length": String(p.data.length) });
  res.end(Buffer.from(p.data));
}));

r.delete("/photos/:id", wrap(async (req, res) => {
  const id = Number(req.params.id), userId = uid(req);
  if (!Number.isInteger(id) || id < 1) return bad(res, "Bad photo");
  const p = await prisma.diaryPhoto.findFirst({ where: { id, userId }, select: { date: true } });
  if (!p) return res.status(404).json({ error: "Not found" });
  await prisma.diaryPhoto.delete({ where: { id } });
  // a day that now has no words, no mood and no photos is no longer an entry
  const e = await prisma.diaryEntry.findUnique({ where: { userId_date: { userId, date: p.date } } });
  if (e && !e.text.trim() && !e.mood && (await prisma.diaryPhoto.count({ where: { userId, date: p.date } })) === 0) await prisma.diaryEntry.delete({ where: { id: e.id } });
  res.json({ ok: true });
}));

export default r;
