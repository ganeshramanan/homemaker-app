// Email reminders for calendar events.
//  - Each person chooses who gets the emails and how many days ahead (settings routes, signed in).
//  - A daily job (GitHub Actions) calls POST /api/internal/send-reminders with a secret key.
import { Router } from "express";
import nodemailer from "nodemailer";
import { prisma } from "./db.js";
import { requireModule } from "./auth.js";
import { occurrences, addDays, localToday } from "../client/src/calendar-utils.js";

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/;
const ALLOWED_DAYS = [0, 1, 2, 3, 7, 14];
const MAX_EMAILS = 5;

export const parseEmails = (s) => [...new Set(String(s || "").split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean))];
export const parseDays = (s) => [...new Set(String(s || "").split(",").map((x) => Number(x.trim())).filter((n) => ALLOWED_DAYS.includes(n)))].sort((a, b) => b - a);
const settingsOf = (u) => ({ emails: parseEmails(u.reminderEmails), days: parseDays(u.reminderDays), allowedDays: ALLOWED_DAYS, max: MAX_EMAILS, mailReady: mailReady() });

// ----- mail -----
const fromAddr = () => process.env.MAIL_FROM || process.env.SMTP_USER || "";
const mailReady = () => !!((process.env.BREVO_API_KEY && fromAddr()) || (process.env.SMTP_USER && process.env.SMTP_PASS));
let transport = null;
const getTransport = () => transport ||= nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com", port: Number(process.env.SMTP_PORT || 465), secure: Number(process.env.SMTP_PORT || 465) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000, // never hang: fail fast with a clear message
});

// One place that sends mail. Brevo's HTTPS API works on hosts that block SMTP ports (such as Render's free plan).
async function deliver({ to, subject, text, html }) {
  const brand = process.env.BRAND_NAME || "Illam";
  const list = Array.isArray(to) ? to : [to];
  if (process.env.BREVO_API_KEY) {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST", signal: AbortSignal.timeout(20000),
      headers: { "api-key": process.env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: brand, email: fromAddr() }, to: list.map((email) => ({ email })), subject, textContent: text, htmlContent: html }),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error("Brevo said: " + (j.message || r.status)); }
    return;
  }
  try {
    await getTransport().sendMail({ from: '"' + brand + '" <' + fromAddr() + ">", to: list.join(", "), subject, text, html });
  } catch (e) {
    const slow = /timeout|ETIMEDOUT|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH/i.test(String(e.code || "") + " " + e.message);
    throw new Error(slow ? "Could not reach the mail server. Render's free plan may block email on this port; set BREVO_API_KEY to send over the web instead." : "Mail server said: " + e.message);
  }
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtDate = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtTime = (t) => { if (!t) return "All day"; const [h, m] = t.split(":").map(Number); return (h % 12 || 12) + ":" + String(m).padStart(2, "0") + " " + (h < 12 ? "AM" : "PM"); };
const when = (n) => (n === 0 ? "today" : n === 1 ? "tomorrow" : "in " + n + " days");

export function buildEmail(brandName, name, groups) { // groups: [{ daysAhead, date, items:[occ] }]
  const total = groups.reduce((t, g) => t + g.items.length, 0);
  const first = groups[0];
  const subject = total === 1 ? brandName + ": " + first.items[0].title + " " + when(first.daysAhead) : brandName + ": " + total + " upcoming events";
  const lines = [], rows = [];
  for (const g of groups) {
    lines.push("", fmtDate(g.date).toUpperCase() + " (" + when(g.daysAhead) + ")");
    rows.push('<h3 style="margin:18px 0 6px;font-size:13px;color:#555;text-transform:uppercase;letter-spacing:.04em">' + esc(fmtDate(g.date)) + ' <span style="font-weight:normal;color:#888;text-transform:none">(' + when(g.daysAhead) + ")</span></h3>");
    for (const o of g.items) {
      lines.push("  - " + o.title + " (" + fmtTime(o.time) + ")" + (o.note ? " - " + o.note : ""));
      rows.push('<div style="padding:10px 12px;margin:4px 0;border:1px solid #e5e7eb;border-radius:8px"><b>' + esc(o.title) + '</b><br><span style="color:#666;font-size:13px">' + esc(fmtTime(o.time)) + (o.category ? " · " + esc(o.category) : "") + (o.note ? " · " + esc(o.note) : "") + "</span></div>");
    }
  }
  const text = "Hello " + name + ",\n\nHere is what is coming up:" + lines.join("\n") + "\n\n- " + brandName;
  const html = '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:auto;color:#111"><p>Hello ' + esc(name) + ",</p><p>Here is what is coming up:</p>" + rows.join("") + '<p style="color:#888;font-size:12px;margin-top:22px">Sent by ' + esc(brandName) + ". You can change who gets these emails in More → Email reminders.</p></div>";
  return { subject, text, html };
}

// ----- settings (signed in, calendar section) -----
export const settingsRouter = Router();
settingsRouter.use(requireModule("calendar"));
settingsRouter.get("/", wrap(async (req, res) => res.json(settingsOf(await prisma.user.findUnique({ where: { id: req.user.id } })))));
settingsRouter.put("/", wrap(async (req, res) => {
  const raw = Array.isArray(req.body.emails) ? req.body.emails : parseEmails(req.body.emails);
  const emails = [...new Set(raw.map((x) => String(x).trim().toLowerCase()).filter(Boolean))];
  const bad = emails.find((e) => !EMAIL.test(e) || e.length > 120);
  if (bad) return res.status(400).json({ error: "That does not look like an email address: " + bad.slice(0, 60) });
  if (emails.length > MAX_EMAILS) return res.status(400).json({ error: "At most " + MAX_EMAILS + " email addresses" });
  const days = parseDays(Array.isArray(req.body.days) ? req.body.days.join(",") : req.body.days);
  if (emails.length && !days.length) return res.status(400).json({ error: "Pick at least one reminder time" });
  const u = await prisma.user.update({ where: { id: req.user.id }, data: { reminderEmails: emails.join(","), reminderDays: days.join(",") } });
  res.json(settingsOf(u));
}));
settingsRouter.post("/test", wrap(async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user.id } });
  const emails = parseEmails(u.reminderEmails);
  if (!emails.length) return res.status(400).json({ error: "Add an email address first" });
  if (!mailReady()) return res.status(503).json({ error: "Email sending is not set up on the server yet" });
  const brand = process.env.BRAND_NAME || "Illam";
  const mail = buildEmail(brand, u.name, [{ daysAhead: 7, date: addDays(localToday(), 7), items: [{ title: "Test reminder", time: "09:00", category: "Reminder", note: "If you can read this, reminders work." }] }]);
  try { await deliver({ to: emails, subject: "Test: " + mail.subject, text: mail.text, html: mail.html }); }
  catch (e) { console.error("test email failed:", e.message); return res.status(502).json({ error: e.message }); }
  res.json({ ok: true, sentTo: emails.length });
}));

// ----- the daily job -----
const istToday = () => { const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); return p; };
const safeEqual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && (x.length > 0) && Buffer.compare(x, y) === 0; };

export const internalRouter = Router();
internalRouter.post("/send-reminders", wrap(async (req, res) => {
  const key = process.env.CRON_KEY;
  if (!key || key.length < 16) return res.status(503).json({ error: "CRON_KEY is not set (needs 16+ characters)" });
  const sent = String(req.get("x-cron-key") || "");
  if (!safeEqual(sent, key)) return res.status(401).json({ error: "Wrong key" });
  if (!mailReady()) return res.status(503).json({ error: "Email is not set up: set BREVO_API_KEY + MAIL_FROM, or SMTP_USER + SMTP_PASS" });

  const dry = req.query.dry === "1";
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.today || "")) ? String(req.query.today) : istToday();
  const brand = process.env.BRAND_NAME || "Illam";
  const users = await prisma.user.findMany({ where: { status: "active", reminderEmails: { not: "" } } });
  const out = { today, users: 0, emailsSent: 0, events: 0, skipped: 0, failed: 0 };
  for (const u of users) {
    const emails = parseEmails(u.reminderEmails), days = parseDays(u.reminderDays);
    if (!emails.length || !days.length) continue;
    out.users++;
    const events = await prisma.calendarEvent.findMany({ where: { userId: u.id } });
    const groups = [];
    for (const n of days) {
      const date = addDays(today, n);
      const items = occurrences(events, date, date);
      const fresh = [];
      for (const o of items) {
        const done = await prisma.reminderSent.findUnique({ where: { userId_eventId_onDate_daysAhead: { userId: u.id, eventId: o.id, onDate: date, daysAhead: n } } });
        if (done) out.skipped++; else fresh.push(o);
      }
      if (fresh.length) groups.push({ daysAhead: n, date, items: fresh });
    }
    if (!groups.length) continue;
    const mail = buildEmail(brand, u.name, groups);
    out.events += groups.reduce((t, g) => t + g.items.length, 0);
    if (dry) continue;
    try {
      await deliver({ to: emails, subject: mail.subject, text: mail.text, html: mail.html });
      for (const g of groups) for (const o of g.items) await prisma.reminderSent.create({ data: { userId: u.id, eventId: o.id, onDate: g.date, daysAhead: g.daysAhead } }).catch(() => {});
      out.emailsSent++;
    } catch (e) { out.failed++; console.error("reminder email failed for user", u.id, e.message); }
  }
  // tidy: forget reminders for dates long past
  await prisma.reminderSent.deleteMany({ where: { onDate: { lt: addDays(today, -30) } } }).catch(() => {});
  res.json(out);
}));
