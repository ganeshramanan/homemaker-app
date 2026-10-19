// Budget module: monthly income and expense entries. Everything is scoped to req.user.
import { Router } from "express";
import { prisma } from "./db.js";
import { requireModule } from "./auth.js";

const r = Router();
r.use(requireModule("budget"));

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const uid = (req) => req.user.id;
const bad = (res, msg) => res.status(400).json({ error: msg });
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_PER_MONTH = 500;
const money = (v) => {
  const n = Number(v);
  return v !== "" && v !== null && Number.isFinite(n) && n >= 0 && n < 1e10 ? Math.round(n * 100) / 100 : null;
};
const text = (v, max) => String(v ?? "").trim().slice(0, max);

r.get("/month", wrap(async (req, res) => {
  const m = String(req.query.m || "");
  if (!MONTH.test(m)) return bad(res, "Bad month");
  res.json(await prisma.budgetEntry.findMany({ where: { userId: uid(req), month: m }, orderBy: { id: "asc" } }));
}));

// Totals for the Home card.
r.get("/summary", wrap(async (req, res) => {
  const m = String(req.query.m || "");
  if (!MONTH.test(m)) return bad(res, "Bad month");
  const g = await prisma.budgetEntry.groupBy({ by: ["type"], where: { userId: uid(req), month: m }, _sum: { amount: true } });
  const sum = (t) => Math.round(((g.find((x) => x.type === t)?._sum.amount) ?? 0) * 100) / 100;
  const income = sum("income"), expense = sum("expense");
  res.json({ income, expense, balance: Math.round((income - expense) * 100) / 100 });
}));

r.post("/entries", wrap(async (req, res) => {
  const { month, type, category, title, paid } = req.body;
  const amount = money(req.body.amount);
  if (!MONTH.test(String(month))) return bad(res, "Bad month");
  if (type !== "income" && type !== "expense") return bad(res, "Bad type");
  if (amount === null) return bad(res, "Enter a valid amount");
  if ((await prisma.budgetEntry.count({ where: { userId: uid(req), month } })) >= MAX_PER_MONTH) return bad(res, "Too many entries this month");
  const cat = text(category, 40) || "Other";
  res.json(await prisma.budgetEntry.create({
    data: { userId: uid(req), month, type, category: cat, title: text(title, 60) || cat, amount, paid: type === "expense" && !!paid },
  }));
}));

r.patch("/entries/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return bad(res, "Bad id");
  const data = {};
  if (req.body.amount !== undefined) { const a = money(req.body.amount); if (a === null) return bad(res, "Enter a valid amount"); data.amount = a; }
  if (req.body.title !== undefined) { const v = text(req.body.title, 60); if (v) data.title = v; }
  if (req.body.category !== undefined) { const v = text(req.body.category, 40); if (v) data.category = v; }
  if (req.body.paid !== undefined) data.paid = !!req.body.paid;
  const n = await prisma.budgetEntry.updateMany({ where: { id, userId: uid(req) }, data });
  if (!n.count) return res.status(404).json({ error: "Not found" });
  res.json(await prisma.budgetEntry.findUnique({ where: { id } }));
}));

r.delete("/entries/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return bad(res, "Bad id");
  await prisma.budgetEntry.deleteMany({ where: { id, userId: uid(req) } });
  res.json({ ok: true });
}));

// Carry last month's entries into a new month (paid ticks reset; same name+type is not duplicated).
r.post("/copy", wrap(async (req, res) => {
  const { from, to } = req.body;
  if (!MONTH.test(String(from)) || !MONTH.test(String(to)) || from === to) return bad(res, "Bad month");
  const [src, have] = await Promise.all([
    prisma.budgetEntry.findMany({ where: { userId: uid(req), month: from }, orderBy: { id: "asc" } }),
    prisma.budgetEntry.findMany({ where: { userId: uid(req), month: to } }),
  ]);
  const key = (e) => `${e.type}|${e.title.toLowerCase()}`;
  const seen = new Set(have.map(key));
  const fresh = src.filter((e) => !seen.has(key(e)));
  if (have.length + fresh.length > MAX_PER_MONTH) return bad(res, "Too many entries this month");
  if (fresh.length) await prisma.budgetEntry.createMany({
    data: fresh.map((e) => ({ userId: uid(req), month: to, type: e.type, category: e.category, title: e.title, amount: e.amount, paid: false })),
  });
  res.json({ added: fresh.length });
}));

export default r;
