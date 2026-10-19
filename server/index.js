import express from "express";
import path from "node:path";
import fs from "node:fs";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import baseBrand from "../shared/brand.config.js";
import { prisma } from "./db.js";
import { authRouter, adminRouter, loadUser, requireUser, requireModule, bootstrapAdmin } from "./auth.js";
import provisions from "./provisions.js";
import budget from "./budget.js";
import calendar from "./calendar.js";

const app = express();
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const brand = () => ({ ...baseBrand, name: process.env.BRAND_NAME || baseBrand.name });

app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));
app.use(loadUser);
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

// ---------- API ----------
app.use("/api/auth", authRouter);
app.use("/api", requireUser);
app.use("/api/provisions", requireModule("provisions"), provisions);   // future: /api/budget, /api/reminders, /api/diary ...
app.use("/api/budget", budget);
app.use("/api/calendar", calendar);
app.use("/api/admin", adminRouter);
app.use("/api", (_, res) => res.status(404).json({ error: "Not found" }));
app.use((e, _req, res, _next) => { console.error(e); res.status(e.status || 500).json({ error: e.status ? e.message : "Something went wrong. Please try again." }); });

// ---------- static frontend ----------
app.use(express.static(dist, { index: false, maxAge: "1y", setHeaders: (res, p) => { if (!p.includes("/assets/")) res.set("Cache-Control", "no-cache"); } }));
app.get(/^(?!\/api).*/, (_, res) => {
  const b = brand();
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8").replaceAll("__BRAND__", b.name).replaceAll("__THEME__", b.themeColor).replaceAll("__TAGLINE__", b.tagline);
  res.type("html").send(html);
});

bootstrapAdmin()
  .catch((e) => console.error("bootstrapAdmin failed:", e))
  .finally(() => app.listen(process.env.PORT || 3000, () => console.log("up")));
