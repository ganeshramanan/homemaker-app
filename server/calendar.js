// Calendar module: events with a date, optional time and optional yearly/monthly repeat.
// The server only stores and validates events; the app works out which ones fall on which day.
import { Router } from "express";
import { prisma } from "./db.js";
import { requireModule } from "./auth.js";

const r = Router();
r.use(requireModule("calendar"));

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const uid = (req) => req.user.id;
const bad = (res, msg) => res.status(400).json({ error: msg });
const MAX_EVENTS = 1000;
const REPEATS = ["none", "yearly", "monthly"];
const text = (v, max) => String(v ?? "").trim().slice(0, max);

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return y >= 1900 && y <= 2200 && t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
const validTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

function parse(b, partial) {
  const d = {};
  if (!partial || b.title !== undefined) d.title = text(b.title, 80);
  if (!partial || b.category !== undefined) d.category = text(b.category, 30) || "Other";
  if (!partial || b.date !== undefined) {
    if (!validDate(String(b.date ?? ""))) return { error: "Choose a valid date" };
    d.date = String(b.date);
  }
  if (!partial || b.time !== undefined) {
    const t = b.time ?? "";
    if (t === "") d.time = null;
    else if (!validTime(String(t))) return { error: "Choose a valid time" };
    else d.time = String(t);
  }
  if (!partial || b.repeat !== undefined) {
    const rp = b.repeat ?? "none";
    if (!REPEATS.includes(rp)) return { error: "Bad repeat setting" };
    d.repeat = rp;
  }
  if (!partial || b.note !== undefined) d.note = text(b.note, 300);
  if (d.title === "") { if (partial) delete d.title; else d.title = d.category || "Event"; }
  return { d };
}

r.get("/events", wrap(async (req, res) => {
  res.json(await prisma.calendarEvent.findMany({ where: { userId: uid(req) }, orderBy: [{ date: "asc" }, { id: "asc" }] }));
}));

r.post("/events", wrap(async (req, res) => {
  const { d, error } = parse(req.body, false);
  if (error) return bad(res, error);
  if ((await prisma.calendarEvent.count({ where: { userId: uid(req) } })) >= MAX_EVENTS) return bad(res, "Too many events. Delete some old ones first.");
  res.json(await prisma.calendarEvent.create({ data: { ...d, userId: uid(req) } }));
}));

r.patch("/events/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return bad(res, "Bad id");
  const { d, error } = parse(req.body, true);
  if (error) return bad(res, error);
  const n = await prisma.calendarEvent.updateMany({ where: { id, userId: uid(req) }, data: d });
  if (!n.count) return res.status(404).json({ error: "Not found" });
  res.json(await prisma.calendarEvent.findUnique({ where: { id } }));
}));

r.delete("/events/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return bad(res, "Bad id");
  await prisma.calendarEvent.deleteMany({ where: { id, userId: uid(req) } });
  res.json({ ok: true });
}));

export default r;
