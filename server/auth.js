import crypto from "node:crypto";
import { Router } from "express";
import { prisma } from "./db.js";
import { seedInventory, addRows, activeList } from "./provisions.js";

// Add new section ids here as modules are built (budget, reminders, diary, fitness).
export const ALL_MODULES = ["provisions", "budget", "calendar"];
const SESSION_DAYS = 30;

const hashPw = (pw) => { const salt = crypto.randomBytes(16); return `${salt.toString("hex")}:${crypto.scryptSync(pw, salt, 64).toString("hex")}`; };
const checkPw = (pw, stored) => {
  const [s, h] = String(stored).split(":");
  if (!s || !h) return false;
  const a = crypto.scryptSync(pw, Buffer.from(s, "hex"), 64), b = Buffer.from(h, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
export const normPhone = (p = "") => String(p).replace(/\D/g, "").slice(-10);
const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");
const cookies = (req) => Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split(/=(.*)/s)).filter((x) => x[0]).map(([k, v]) => [k, decodeURIComponent(v ?? "")]));

export const publicUser = (u) => ({
  id: u.id, name: u.name, phone: u.phone, role: u.role, status: u.status, isDemo: u.isDemo,
  modules: u.role === "admin" ? ALL_MODULES : u.modules.split(",").filter((m) => ALL_MODULES.includes(m)),
});

async function startSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await prisma.session.create({ data: { id: sha(token), userId, expiresAt } });
  res.cookie("sid", token, { httpOnly: true, sameSite: "lax", secure: req.secure, maxAge: SESSION_DAYS * 864e5, path: "/" });
}

// Short in-memory cache so most requests skip the session lookup in the database.
const sessionCache = new Map();
const SESSION_TTL = 30_000;
export async function loadUser(req, _res, next) {
  try {
    const token = cookies(req).sid;
    if (token) {
      const key = sha(token), hit = sessionCache.get(key);
      if (hit && Date.now() - hit.at < SESSION_TTL && hit.expiresAt > new Date()) req.user = hit.user;
      else {
        sessionCache.delete(key);
        const s = await prisma.session.findUnique({ where: { id: key }, include: { user: true } });
        if (s && s.expiresAt > new Date() && s.user.status === "active") {
          req.user = s.user;
          if (sessionCache.size > 2000) sessionCache.clear();
          sessionCache.set(key, { user: s.user, expiresAt: s.expiresAt, at: Date.now() });
        }
      }
    }
    next();
  } catch (e) { next(e); }
}
export const requireUser = (req, res, next) => (req.user ? next() : res.status(401).json({ error: "Please sign in" }));
export const requireAdmin = (req, res, next) => (req.user?.role === "admin" ? next() : res.status(403).json({ error: "Admin only" }));
export const requireModule = (m) => (req, res, next) =>
  req.user && publicUser(req.user).modules.includes(m) ? next() : res.status(403).json({ error: "This section is not enabled for your account" });

const tries = new Map();
const limited = (key) => {
  const now = Date.now(), arr = (tries.get(key) || []).filter((t) => now - t < 15 * 60e3);
  tries.set(key, arr);
  return arr.length >= 8;
};

export const authRouter = Router();
const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

authRouter.post("/signup", wrap(async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 60), phone = normPhone(req.body.phone), pw = String(req.body.password || "");
  if (!name) return res.status(400).json({ error: "Please enter your name" });
  if (phone.length !== 10) return res.status(400).json({ error: "Enter a 10 digit phone number" });
  if (pw.length < 6) return res.status(400).json({ error: "Password needs at least 6 characters" });
  if (await prisma.user.findUnique({ where: { phone } })) return res.status(409).json({ error: "This phone number is already registered" });
  await prisma.user.create({ data: { name, phone, passwordHash: hashPw(pw) } });
  res.json({ status: "pending" });
}));

authRouter.post("/login", wrap(async (req, res) => {
  const phone = normPhone(req.body.phone), key = `${req.ip}|${phone}`;
  if (limited(key)) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  const u = await prisma.user.findUnique({ where: { phone } });
  if (!u || u.isDemo || !checkPw(String(req.body.password || ""), u.passwordHash)) {
    tries.get(key).push(Date.now());
    return res.status(401).json({ error: "Wrong phone number or password" });
  }
  if (u.status === "pending") return res.status(403).json({ error: "Your account is waiting for admin approval", code: "pending" });
  if (u.status !== "active") return res.status(403).json({ error: "This account is disabled. Please contact admin." });
  await startSession(req, res, u.id);
  res.json({ user: publicUser(u) });
}));

authRouter.post("/logout", wrap(async (req, res) => {
  const token = cookies(req).sid;
  if (token) { sessionCache.delete(sha(token)); await prisma.session.deleteMany({ where: { id: sha(token) } }); }
  res.clearCookie("sid", { path: "/" });
  res.json({ ok: true });
}));

authRouter.get("/me", (req, res) => (req.user ? res.json({ user: publicUser(req.user) }) : res.status(401).json({ error: "Not signed in" })));

// Try-it-now household with sample data. Cleaned up after a day.
authRouter.post("/demo", wrap(async (req, res) => {
  if (limited(`demo|${req.ip}`)) return res.status(429).json({ error: "Too many demo accounts. Try again later." });
  tries.get(`demo|${req.ip}`).push(Date.now());
  await prisma.user.deleteMany({ where: { isDemo: true, createdAt: { lt: new Date(Date.now() - 864e5) } } });
  const id = crypto.randomBytes(5).toString("hex");
  const u = await prisma.user.create({ data: { name: "Demo", phone: `demo-${id}`, passwordHash: "x", status: "active", isDemo: true } });
  await seedInventory(u.id);
  await addRows(u.id, await activeList(u.id), [
    { name: "Rice", qty: 5, unit: "kg" }, { name: "Cooking Oil", qty: 1, unit: "L" }, { name: "Sugar", qty: 1, unit: "kg" },
    { name: "Toor Dal", qty: 1, unit: "kg" }, { name: "Eggs", qty: 12, unit: "pcs" },
  ]);
  await startSession(req, res, u.id);
  res.json({ user: publicUser(u) });
}));

// ---------- admin ----------
export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/users", wrap(async (_, res) => {
  const users = await prisma.user.findMany({ where: { isDemo: false }, orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, role: true, status: true, modules: true, createdAt: true } });
  const rank = { pending: 0, active: 1, disabled: 2 };
  users.sort((a, b) => rank[a.status] - rank[b.status]);
  res.json({ users, modules: ALL_MODULES, demoCount: await prisma.user.count({ where: { isDemo: true } }) });
}));

adminRouter.patch("/users/:id", wrap(async (req, res) => {
  const id = +req.params.id, data = {};
  if (id === req.user.id) return res.status(400).json({ error: "You can't change your own account" });
  if (req.body.status) {
    if (!["active", "disabled"].includes(req.body.status)) return res.status(400).json({ error: "Bad status" });
    data.status = req.body.status;
  }
  if (Array.isArray(req.body.modules)) data.modules = req.body.modules.filter((m) => ALL_MODULES.includes(m)).join(",");
  const u = await prisma.user.update({ where: { id }, data });
  sessionCache.clear(); // status or section changes apply at once
  if (data.status === "disabled") { sessionCache.clear(); await prisma.session.deleteMany({ where: { userId: id } }); }
  res.json({ ok: true, status: u.status });
}));

adminRouter.delete("/users/:id", wrap(async (req, res) => {
  const id = +req.params.id;
  if (id === req.user.id) return res.status(400).json({ error: "You can't delete your own account" });
  sessionCache.clear();
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
}));

// ---------- first admin from env vars; adopts data created before logins existed ----------
export async function bootstrapAdmin() {
  // old finished lists had no finish date; use their creation date
  await prisma.$executeRaw`UPDATE "List" SET "closedAt" = "createdAt" WHERE "status" = 'done' AND "closedAt" IS NULL`;
  const phone = normPhone(process.env.ADMIN_PHONE), pw = process.env.ADMIN_PASSWORD;
  if (phone.length !== 10 || !pw) return console.warn("ADMIN_PHONE / ADMIN_PASSWORD not set: no admin account.");
  let admin = await prisma.user.findUnique({ where: { phone } });
  if (!admin) admin = await prisma.user.create({ data: { name: "Admin", phone, passwordHash: hashPw(pw), role: "admin", status: "active" } });
  else if (admin.role !== "admin" || admin.status !== "active" || !checkPw(pw, admin.passwordHash))
    admin = await prisma.user.update({ where: { id: admin.id }, data: { role: "admin", status: "active", passwordHash: hashPw(pw) } });

  const orphans = await prisma.list.findMany({ where: { userId: null, status: "active" }, orderBy: { id: "asc" }, include: { _count: { select: { items: true } } } });
  if (orphans.length > 1) {
    const keep = [...orphans].sort((a, b) => b._count.items - a._count.items)[0];
    for (const l of orphans.filter((x) => x.id !== keep.id)) {
      await prisma.listItem.updateMany({ where: { listId: l.id }, data: { listId: keep.id } });
      await prisma.list.delete({ where: { id: l.id } });
    }
  }
  const a = await prisma.item.updateMany({ where: { userId: null }, data: { userId: admin.id } });
  const b = await prisma.list.updateMany({ where: { userId: null }, data: { userId: admin.id } });
  if (a.count || b.count) console.log(`Adopted ${a.count} items and ${b.count} lists into admin account`);
}
