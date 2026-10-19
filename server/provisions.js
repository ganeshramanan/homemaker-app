// Provisions module: shopping list, inventory, catalog, monthly history. Everything is scoped to req.user.
import { Router } from "express";
import { prisma } from "./db.js";
import { parseList } from "./parser.js";
import { CATALOG } from "./catalog.js";

const FACTOR = { "kg>g": 1000, "g>kg": 0.001, "L>ml": 1000, "ml>L": 0.001 };
const convert = (qty, from, to) => (from === to ? qty : qty * (FACTOR[`${from}>${to}`] ?? 1));
const stepOf = (u) => (u === "kg" || u === "L" ? 0.5 : u === "g" || u === "ml" ? 100 : 1);
const num = (v, d) => (Number.isFinite(+v) && +v > 0 ? +v : d);
const dict = Object.fromEntries(CATALOG.map((c) => [c.name, { category: c.category, unit: c.unit, minQty: c.min }]));
const INC = { items: { orderBy: { position: "asc" } } };

export async function activeList(userId) {
  const q = () => prisma.list.findFirst({ where: { userId, status: "active" }, include: INC });
  return (await q()) ?? prisma.list.create({ data: { userId } }).then(q).catch(q);
}

export async function addRows(userId, list, rows) {
  const current = [...list.items];
  let pos = current.length ? Math.max(...current.map((i) => i.position)) + 1 : 0;
  for (const r of rows) {
    const name = String(r.name || "").trim().slice(0, 60);
    if (!name) continue;
    const qty = num(r.qty, 1), unit = String(r.unit || "pcs").slice(0, 12);
    const existing = current.find((i) => !i.bought && i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.qty += convert(qty, unit, existing.unit);
      await prisma.listItem.update({ where: { id: existing.id }, data: { qty: existing.qty } });
    } else {
      const item = await prisma.item.findUnique({ where: { userId_name: { userId, name } } });
      current.push(await prisma.listItem.create({ data: { listId: list.id, itemId: item?.id ?? null, name, qty, unit, position: pos++ } }));
    }
  }
}

export const seedInventory = async (userId) =>
  (await prisma.item.createMany({
    skipDuplicates: true,
    data: CATALOG.map((c, i) => ({ userId, name: c.name, category: c.category, unit: c.unit, minQty: c.min, stock: +(c.min * (i % 6 === 0 ? 0.5 : 3)).toFixed(2) })),
  })).count;

const r = Router();
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const uid = (req) => req.user.id;
const mine = (id, userId) => ({ id: +id, list: { userId } });

r.post("/parse", (req, res) => res.json(parseList(String(req.body.text || "").slice(0, 2000))));
r.get("/catalog", (_, res) => res.json(CATALOG));

// ----- current list -----
r.get("/list", wrap(async (req, res) => res.json(await activeList(uid(req)))));

r.post("/list/items", wrap(async (req, res) => {
  await addRows(uid(req), await activeList(uid(req)), [].concat(req.body.items ?? []));
  res.json(await activeList(uid(req)));
}));

r.patch("/list/items/:id", wrap(async (req, res) => {
  const { qty, unit, name, price } = req.body;
  await prisma.listItem.updateMany({ where: mine(req.params.id, uid(req)), data: {
    ...(qty != null && num(qty, 0) && { qty: +qty }), ...(unit && { unit }), ...(name && { name }), ...(price !== undefined && { price: price === null ? null : +price }) } });
  res.json(await activeList(uid(req)));
}));

r.delete("/list/items/:id", wrap(async (req, res) => {
  await prisma.listItem.deleteMany({ where: mine(req.params.id, uid(req)) });
  res.json(await activeList(uid(req)));
}));

r.put("/list/order", wrap(async (req, res) => {
  const owned = new Set((await prisma.listItem.findMany({ where: { list: { userId: uid(req) } }, select: { id: true } })).map((x) => x.id));
  const ids = [].concat(req.body.ids ?? []).filter((id) => owned.has(id));
  await prisma.$transaction(ids.map((id, position) => prisma.listItem.update({ where: { id }, data: { position } })));
  res.json(await activeList(uid(req)));
}));

// Bought adds to stock; un-bought reverses it.
r.post("/list/items/:id/bought", wrap(async (req, res) => {
  const userId = uid(req);
  const li = await prisma.listItem.findFirst({ where: mine(req.params.id, userId) });
  if (!li) return res.status(404).json({ error: "Not found" });
  const bought = req.body.bought ?? !li.bought;
  if (bought !== li.bought) {
    const d = dict[li.name];
    const item = (await prisma.item.findUnique({ where: { userId_name: { userId, name: li.name } } })) ??
      (await prisma.item.create({ data: { userId, name: li.name, unit: li.unit, category: d?.category ?? "Other", minQty: d ? convert(d.minQty, d.unit, li.unit) : 0 } }));
    const delta = convert(li.qty, li.unit, item.unit) * (bought ? 1 : -1);
    await prisma.item.update({ where: { id: item.id }, data: { stock: Math.max(0, +(item.stock + delta).toFixed(3)) } });
    await prisma.listItem.update({ where: { id: li.id }, data: { bought, itemId: item.id } });
  }
  res.json(await activeList(userId));
}));

// ----- next month: preview, then confirm -----
r.get("/list/next-preview", wrap(async (req, res) => {
  const userId = uid(req), list = await activeList(userId);
  const items = list.items.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit, reason: "last" }));
  const have = new Set(items.map((i) => i.name));
  const low = await prisma.item.findMany({ where: { userId, minQty: { gt: 0 } } });
  for (const i of low.filter((x) => x.stock <= x.minQty && !have.has(x.name)))
    items.push({ name: i.name, qty: Math.max(+(i.minQty * 2 - i.stock).toFixed(2), stepOf(i.unit)), unit: i.unit, reason: "low" });
  res.json({ items });
}));

// Closes the current list into History and starts a new one with the chosen items.
r.post("/list/new", wrap(async (req, res) => {
  const userId = uid(req), old = await activeList(userId);
  await prisma.$transaction(old.items.length
    ? [prisma.list.update({ where: { id: old.id }, data: { status: "done", closedAt: new Date() } })]
    : [prisma.list.delete({ where: { id: old.id } })]);
  await addRows(userId, await activeList(userId), [].concat(req.body.items ?? []));
  res.json(await activeList(userId));
}));

// ----- history (one entry per finished month/list) -----
r.get("/history", wrap(async (req, res) => {
  const lists = await prisma.list.findMany({ where: { userId: uid(req), status: "done" }, orderBy: { closedAt: "desc" }, take: 60, include: { items: { select: { bought: true } } } });
  res.json(lists.map((l) => ({ id: l.id, closedAt: l.closedAt, count: l.items.length, bought: l.items.filter((i) => i.bought).length })));
}));

r.get("/history/:id", wrap(async (req, res) => {
  const l = await prisma.list.findFirst({ where: { id: +req.params.id, userId: uid(req), status: "done" }, include: INC });
  l ? res.json(l) : res.status(404).json({ error: "Not found" });
}));

r.post("/history/:id/copy", wrap(async (req, res) => {
  const l = await prisma.list.findFirst({ where: { id: +req.params.id, userId: uid(req), status: "done" }, include: INC });
  if (!l) return res.status(404).json({ error: "Not found" });
  await addRows(uid(req), await activeList(uid(req)), l.items.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit })));
  res.json(await activeList(uid(req)));
}));

// ----- inventory -----
r.get("/inventory", wrap(async (req, res) => res.json(await prisma.item.findMany({ where: { userId: uid(req) }, orderBy: [{ category: "asc" }, { name: "asc" }] }))));

r.patch("/inventory/:id", wrap(async (req, res) => {
  const { stock, minQty, delta } = req.body;
  const cur = await prisma.item.findFirst({ where: { id: +req.params.id, userId: uid(req) } });
  if (!cur) return res.status(404).json({ error: "Not found" });
  const data = {};
  if (delta != null) data.stock = Math.max(0, +(cur.stock + +delta).toFixed(3));
  if (stock != null) data.stock = Math.max(0, +stock);
  if (minQty != null) data.minQty = Math.max(0, +minQty);
  res.json(await prisma.item.update({ where: { id: cur.id }, data }));
}));

r.post("/inventory", wrap(async (req, res) => {
  const userId = uid(req), name = String(req.body.name || "").trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: "Name needed" });
  const { unit = "pcs", stock = 0, minQty = 0, category = "Other" } = req.body;
  res.json(await prisma.item.upsert({ where: { userId_name: { userId, name } }, update: { unit, stock, minQty, category }, create: { userId, name, unit, stock, minQty, category } }));
}));

r.delete("/inventory/:id", wrap(async (req, res) => { await prisma.item.deleteMany({ where: { id: +req.params.id, userId: uid(req) } }); res.json({ ok: true }); }));
r.post("/inventory/seed", wrap(async (req, res) => res.json({ added: await seedInventory(uid(req)) })));

// ----- dashboard widget data -----
r.get("/dashboard", wrap(async (req, res) => {
  const userId = uid(req);
  const [items, list] = await Promise.all([prisma.item.findMany({ where: { userId } }), activeList(userId)]);
  const low = items.filter((i) => i.minQty > 0 && i.stock <= i.minQty).sort((a, b) => a.stock / a.minQty - b.stock / b.minQty);
  const onList = new Set(list.items.filter((i) => !i.bought).map((i) => i.name));
  res.json({ low: low.map((i) => ({ ...i, onList: onList.has(i.name) })), totalItems: items.length,
    list: { total: list.items.length, bought: list.items.filter((i) => i.bought).length } });
}));

export default r;
