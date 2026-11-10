// Budget module: monthly income and expense entries. Everything is scoped to req.user.
import { Router } from "express";
import { prisma } from "./db.js";
import { requireModule } from "./auth.js";
import { GROUPS, groupOf, defaultGroup } from "../client/src/budget-groups.js";

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
const parseHidden = (s) => { try { const v = JSON.parse(s || "{}"); return { income: Array.isArray(v.income) ? v.income.map(String) : [], expense: Array.isArray(v.expense) ? v.expense.map(String) : [] }; } catch { return { income: [], expense: [] }; } };
const readHidden = async (userId) => parseHidden((await prisma.user.findUnique({ where: { id: userId }, select: { hiddenCats: true } }))?.hiddenCats);
const writeHidden = (userId, h) => prisma.user.update({ where: { id: userId }, data: { hiddenCats: JSON.stringify(h) } });
const parseGroups = (s) => { try { const v = JSON.parse(s || "{}"); const out = {}; if (v && typeof v === "object" && !Array.isArray(v)) for (const [k, g] of Object.entries(v)) if (GROUPS.includes(g) && k.length <= 40) out[k] = g; return out; } catch { return {}; } };
const readGroups = async (userId) => parseGroups((await prisma.user.findUnique({ where: { id: userId }, select: { categoryGroups: true } }))?.categoryGroups);

r.get("/month", wrap(async (req, res) => {
  const m = String(req.query.m || "");
  if (!MONTH.test(m)) return bad(res, "Bad month");
  res.json(await prisma.budgetEntry.findMany({ where: { userId: uid(req), month: m }, orderBy: { id: "asc" } }));
}));

// Every category this user has used, so custom ones come back as chips.
r.get("/categories", wrap(async (req, res) => {
  const g = await prisma.budgetEntry.groupBy({ by: ["type", "category"], where: { userId: uid(req) }, _count: { _all: true } });
  const pick = (t) => g.filter((x) => x.type === t).sort((a, b) => b._count._all - a._count._all).map((x) => x.category);
  res.json({ income: pick("income"), expense: pick("expense"), hidden: await readHidden(uid(req)), groups: await readGroups(uid(req)) });
}));

// Delete a category: its entries (every month, any capital letters) move to "Other", so no amount is lost.
r.post("/categories/delete", wrap(async (req, res) => {
  const type = req.body.type === "income" ? "income" : req.body.type === "expense" ? "expense" : null;
  const category = text(req.body.category, 40);
  if (!type || !category) return bad(res, "Type and category needed");
  if (category.toLowerCase() === "other") return bad(res, "Other cannot be deleted");
  const out = await prisma.budgetEntry.updateMany({
    where: { userId: uid(req), type, category: { equals: category, mode: "insensitive" } },
    data: { category: "Other" },
  });
  // A built-in category (Rent, Groceries...) can't vanish from the code, so remember that this user removed it.
  if (req.body.builtin === true) {
    const h = await readHidden(uid(req));
    if (!h[type].some((x) => x.toLowerCase() === category.toLowerCase()) && h[type].length < 40) h[type].push(category);
    await writeHidden(uid(req), h);
  }
  res.json({ moved: out.count });
}));

// Bring the removed built-in categories back.
r.post("/categories/restore", wrap(async (req, res) => {
  const type = req.body.type === "income" ? "income" : req.body.type === "expense" ? "expense" : null;
  if (!type) return bad(res, "Type needed");
  const h = await readHidden(uid(req));
  h[type] = [];
  await writeHidden(uid(req), h);
  res.json({ ok: true });
}));

// Choose the group a category belongs to (an empty group puts it back to the default).
r.put("/category-group", wrap(async (req, res) => {
  const category = text(req.body.category, 40), group = String(req.body.group || "");
  if (!category) return bad(res, "Category needed");
  if (group && !GROUPS.includes(group)) return bad(res, "Unknown group");
  const ov = await readGroups(uid(req));
  for (const k of Object.keys(ov)) if (k.toLowerCase() === category.toLowerCase()) delete ov[k];
  if (group && group !== defaultGroup(category)) { if (Object.keys(ov).length >= 80) return bad(res, "Too many custom groups"); ov[category] = group; }
  await prisma.user.update({ where: { id: uid(req) }, data: { categoryGroups: JSON.stringify(ov) } });
  res.json({ groups: ov });
}));

// Totals for the Home card.
r.get("/summary", wrap(async (req, res) => {
  const m = String(req.query.m || "");
  if (!MONTH.test(m)) return bad(res, "Bad month");
  const [g, ov] = await Promise.all([
    prisma.budgetEntry.groupBy({ by: ["type", "category"], where: { userId: uid(req), month: m }, _sum: { amount: true } }),
    readGroups(uid(req)),
  ]);
  const r2 = (n) => Math.round(n * 100) / 100;
  let income = 0, expense = 0, saved = 0;
  for (const x of g) {
    const v = x._sum.amount ?? 0;
    if (x.type === "income") income += v;
    else if (groupOf(x.category, ov) === "saving") saved += v; // savings and investments are kept, not spent
    else expense += v;
  }
  income = r2(income); expense = r2(expense); saved = r2(saved);
  res.json({ income, expense, saved, balance: r2(income - expense - saved) });
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
