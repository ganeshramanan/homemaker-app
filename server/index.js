import express from "express";
import path from "node:path";
import fs from "node:fs";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import baseBrand from "../shared/brand.config.js";
import { parseList } from "./parser.js";
import { CATALOG } from "./catalog.js";

const prisma = new PrismaClient();
const app = express();
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const brand = () => ({ ...baseBrand, name: process.env.BRAND_NAME || baseBrand.name });
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e); res.status(500).json({ error: e.message }); });

app.use(express.json());
// No service worker, no offline cache: always fetch fresh.
app.use((req, res, next) => { if (!req.path.startsWith("/assets/")) res.set("Cache-Control", "no-cache, no-store, must-revalidate"); next(); });

// ---------- brand, manifest, icons ----------
app.get("/api/brand", (_, res) => res.json(brand()));
app.get("/manifest.webmanifest", (_, res) => {
  const b = brand();
  res.type("application/manifest+json").json({
    name: b.name, short_name: b.name.slice(0, 12), description: b.tagline, start_url: "/", scope: "/",
    display: "standalone", orientation: "portrait", theme_color: b.themeColor, background_color: b.backgroundColor,
    icons: [192, 512].map((s) => ({ src: `/icon-${s}.png`, sizes: `${s}x${s}`, type: "image/png", purpose: "any maskable" })),
  });
});
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); };
function png(size, hex) { // theme-colour square with a white basket-like ring
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2, y - size / 2) / size, ring = d > 0.2 && d < 0.3;
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = ring ? 255 : r; raw[o + 1] = ring ? 255 : g; raw[o + 2] = ring ? 255 : b;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
app.get("/icon-:size.png", (req, res) => res.type("png").send(png(Math.min(512, +req.params.size || 192), brand().themeColor)));

// ---------- helpers ----------
const FACTOR = { "kg>g": 1000, "g>kg": 0.001, "L>ml": 1000, "ml>L": 0.001 };
const convert = (qty, from, to) => (from === to ? qty : qty * (FACTOR[`${from}>${to}`] ?? 1));
const activeList = async () =>
  (await prisma.list.findFirst({ where: { status: "active" }, include: { items: { orderBy: { position: "asc" } } } })) ??
  prisma.list.create({ data: {}, include: { items: true } });
const dict = Object.fromEntries(CATALOG.map((c) => [c.name, { category: c.category, unit: c.unit, minQty: c.min }]));

// ---------- voice text -> rows ----------
app.post("/api/parse", (req, res) => res.json(parseList(req.body.text)));

// ---------- shopping list ----------
app.get("/api/list", wrap(async (_, res) => res.json(await activeList())));

app.post("/api/list/items", wrap(async (req, res) => {
  const list = await activeList();
  let pos = list.items.length;
  const rows = [].concat(req.body.items ?? req.body);
  for (const r of rows) {
    const item = r.itemId ? { id: r.itemId } : await prisma.item.findUnique({ where: { name: r.name } });
    const existing = list.items.find((i) => !i.bought && i.name.toLowerCase() === r.name.toLowerCase());
    if (existing) {
      await prisma.listItem.update({ where: { id: existing.id }, data: { qty: existing.qty + convert(r.qty ?? 1, r.unit ?? existing.unit, existing.unit) } });
    } else {
      await prisma.listItem.create({ data: { listId: list.id, itemId: item?.id ?? null, name: r.name, qty: r.qty ?? 1, unit: r.unit ?? "pcs", position: pos++ } });
    }
  }
  res.json(await activeList());
}));

app.patch("/api/list/items/:id", wrap(async (req, res) => {
  const id = +req.params.id, { qty, unit, name } = req.body;
  await prisma.listItem.update({ where: { id }, data: { ...(qty != null && { qty }), ...(unit && { unit }), ...(name && { name }) } });
  res.json(await activeList());
}));

app.delete("/api/list/items/:id", wrap(async (req, res) => {
  await prisma.listItem.delete({ where: { id: +req.params.id } });
  res.json(await activeList());
}));

app.put("/api/list/order", wrap(async (req, res) => {
  await prisma.$transaction(req.body.ids.map((id, position) => prisma.listItem.update({ where: { id }, data: { position } })));
  res.json(await activeList());
}));

// Mark bought / not bought. Bought adds to inventory, un-bought reverses it.
app.post("/api/list/items/:id/bought", wrap(async (req, res) => {
  const li = await prisma.listItem.findUnique({ where: { id: +req.params.id } });
  if (!li) return res.status(404).json({ error: "not found" });
  const bought = req.body.bought ?? !li.bought;
  if (bought !== li.bought) {
    const d = dict[li.name];
    let item = li.itemId ? await prisma.item.findUnique({ where: { id: li.itemId } }) : await prisma.item.findUnique({ where: { name: li.name } });
    if (!item) item = await prisma.item.create({ data: { name: li.name, unit: li.unit, category: d?.category ?? "Other", minQty: d ? convert(d.minQty, d.unit, li.unit) : 0 } });
    const delta = convert(li.qty, li.unit, item.unit) * (bought ? 1 : -1);
    await prisma.item.update({ where: { id: item.id }, data: { stock: Math.max(0, item.stock + delta) } });
    await prisma.listItem.update({ where: { id: li.id }, data: { bought, itemId: item.id } });
  }
  res.json(await activeList());
}));

// Start next month's list: copies everything from the finished one.
app.post("/api/list/new", wrap(async (req, res) => {
  const old = await activeList();
  await prisma.list.update({ where: { id: old.id }, data: { status: "done" } });
  const copy = req.body.copy ? old.items.map((i, position) => ({ itemId: i.itemId, name: i.name, qty: i.qty, unit: i.unit, position })) : [];
  await prisma.list.create({ data: { items: { create: copy } } });
  res.json(await activeList());
}));

// ---------- inventory ----------
app.get("/api/inventory", wrap(async (_, res) => res.json(await prisma.item.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }))));

app.patch("/api/inventory/:id", wrap(async (req, res) => {
  const { stock, minQty, delta } = req.body, id = +req.params.id;
  const cur = await prisma.item.findUnique({ where: { id } });
  const data = {};
  if (delta != null) data.stock = Math.max(0, +(cur.stock + delta).toFixed(3));
  if (stock != null) data.stock = Math.max(0, stock);
  if (minQty != null) data.minQty = Math.max(0, minQty);
  res.json(await prisma.item.update({ where: { id }, data }));
}));

app.post("/api/inventory", wrap(async (req, res) => {
  const { name, unit = "pcs", stock = 0, minQty = 0, category = "Other" } = req.body;
  res.json(await prisma.item.upsert({ where: { name }, update: { unit, stock, minQty, category }, create: { name, unit, stock, minQty, category } }));
}));

app.delete("/api/inventory/:id", wrap(async (req, res) => { await prisma.item.delete({ where: { id: +req.params.id } }); res.json({ ok: true }); }));

// 100-item catalog (for the picker) and a demo loader that puts it into inventory.
app.get("/api/catalog", (_, res) => res.json(CATALOG));
app.post("/api/inventory/seed", wrap(async (_, res) => {
  const data = CATALOG.map((c, i) => ({ name: c.name, category: c.category, unit: c.unit, minQty: c.min, stock: +(c.min * (i % 6 === 0 ? 0.5 : 3)).toFixed(2) }));
  res.json({ added: (await prisma.item.createMany({ data, skipDuplicates: true })).count });
}));

// ---------- dashboard ----------
app.get("/api/dashboard", wrap(async (_, res) => {
  const [items, list] = await Promise.all([prisma.item.findMany(), activeList()]);
  const low = items.filter((i) => i.minQty > 0 && i.stock <= i.minQty).sort((a, b) => a.stock / a.minQty - b.stock / b.minQty);
  const onList = new Set(list.items.filter((i) => !i.bought).map((i) => i.name));
  res.json({
    low: low.map((i) => ({ ...i, onList: onList.has(i.name) })),
    totalItems: items.length,
    list: { total: list.items.length, bought: list.items.filter((i) => i.bought).length },
  });
}));

// ---------- static frontend ----------
app.use(express.static(dist, { index: false, maxAge: "1y", setHeaders: (res, p) => { if (!p.includes("/assets/")) res.set("Cache-Control", "no-cache"); } }));
app.get(/^(?!\/api).*/, (_, res) => {
  const b = brand();
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8").replaceAll("__BRAND__", b.name).replaceAll("__THEME__", b.themeColor).replaceAll("__TAGLINE__", b.tagline);
  res.type("html").send(html);
});

app.listen(process.env.PORT || 3000, () => console.log("up"));
