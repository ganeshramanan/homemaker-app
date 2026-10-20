import { cloneElement, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { pad, ymd, daysIn, parseYmd, localToday, nowMin, addDays, weekday, fmtTime, occurrences, statusOf } from "./calendar-utils.js";

const api = async (url, method = "GET", body) => {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body), cache: "no-store" });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !url.startsWith("/api/auth")) window.dispatchEvent(new Event("unauth"));
    throw Object.assign(new Error(j.error || r.statusText), { status: r.status, code: j.code });
  }
  return r.json();
};

const T = {
  en: { home: "Home", list: "List", stock: "Stock", low: "Running low", lowEmpty: "All stocked up 🎉", addList: "Add to list", onList: "On list ✓",
    thisList: "This month's list", toBuy: "To buy", bought: "Bought", send: "Send on WhatsApp", newMonth: "Start next month's list", empty: "Your list is empty. Tap + and type your items.",
    tap: "Tap and speak", listening: "Listening… speak now", typeHere: "Type your items, e.g. 2 kg rice, 1 litre oil, half kilo sugar", read: "Read list", addAll: "Add to list",
    cancel: "Cancel", more: "More", removeAsk: "Remove {n} from your stock?", mySections: "My sections", sectionsHint: "Choose what you want to see. Your admin decides which sections are available to you.", noneAllowed: "Your admin has not turned on any sections for you yet.", noneShown: "No sections are switched on.", chooseSections: "Choose sections", sectionsFor: "Sections", sections: "Your sections", attention: "Needs attention", seeAll: "See all", nToBuy: "{n} to buy", nLow: "{n} running low", allDone: "All bought", listEmpty: "List is empty", nToday: "{n} today", nothingPlanned: "Nothing today", leftN: "{n} left", overN: "{n} over", nothingYet: "No entries yet", tapOpen: "Tap to open", groceries: "Groceries", item: "item", tapAgain: "Tap a ticked item again to remove it.", toBuyTab: "To buy", dragHint: "Clear the filters to rearrange the list.", okTab: "In stock", showing: "Showing", signIn: "Sign in", signUp: "Sign up", createAcct: "Create free account", createBtn: "Create account", tryDemo: "✨ Try demo", loading: "Loading…", heroBadge: "For every home maker", heroA: "Your whole home, ", heroB: "in one place", heroText: "Plan the groceries, track the monthly budget and never miss a birthday or a bill. Simple, in Tamil and English.", already: "Already registered?", featTitle: "Everything your home needs, in one place", howTitle: "How it works", soon: "Coming soon: family diary and fitness tracker.", ctaTitle: "Ready to organise your home?", yourName: "Your name", phone: "Phone number", password: "Password", approveNote: "New accounts are approved by the admin before you can sign in.", thanks: "Thank you!", waitApproval: "Your account is waiting for approval. You can sign in once it is approved.", backSignin: "Back to sign in", adminUsers: "Admin: users", users: "users", waiting: "waiting for approval", approve: "Approve", enable: "Enable", disable: "Disable", reject: "Reject", del: "Delete", confirmDel: "Delete {n} and all their data?", demoAccts: "demo accounts (auto-deleted after a day)", st_pending: "pending", st_active: "active", st_disabled: "disabled", history: "History", historyEmpty: "Finished lists are saved here, month by month.", copyToList: "Copy to current list", copied: "Added to your list", nextTitle: "Start next month's list", nextNote: "This month's list is saved in History. Untick what you don't need.", startList: "Start new list", lowTag: "low stock", signOut: "Sign out", demoNote: "Demo account. Data is deleted after one day.", back: "Back", search: "Search items…", allTab: "All", lowTab: "Low", mineTab: "My items", done: "Done", readList: "Add typed text as a list", seed: "Load 100 sample items", noMatch: "No items found", min: "Min", addItem: "Add item", name: "Name", unit: "Unit", save: "Save", noSpeech: "Voice not supported in this browser. Please type.",
    check: "Please check these items", items: "items", boughtOf: "bought", stockEmpty: "No stock yet. Mark list items as bought and they appear here.", left: "left" },
  ta: { home: "முகப்பு", list: "பட்டியல்", stock: "இருப்பு", low: "குறைவான பொருட்கள்", lowEmpty: "எல்லாம் இருக்கு 🎉", addList: "பட்டியலில் சேர்", onList: "சேர்க்கப்பட்டது ✓",
    thisList: "இந்த மாத பட்டியல்", toBuy: "வாங்க வேண்டியவை", bought: "வாங்கியவை", send: "வாட்ஸ்அப்பில் அனுப்பு", newMonth: "அடுத்த மாத பட்டியல்", empty: "பட்டியல் காலி. + தட்டி பொருட்களை டைப் செய்யுங்கள்.",
    tap: "தட்டிப் பேசுங்கள்", listening: "கேட்கிறேன்… பேசுங்கள்", typeHere: "பொருட்களை டைப் செய்யுங்கள், எ.கா. 2 கிலோ அரிசி, 1 லிட்டர் எண்ணெய்", read: "பட்டியலாக்கு", addAll: "பட்டியலில் சேர்",
    cancel: "ரத்து", more: "மேலும்", removeAsk: "{n} பொருளை இருப்பிலிருந்து நீக்கவா?", mySections: "என் பிரிவுகள்", sectionsHint: "நீங்கள் பார்க்க விரும்புவதைத் தேர்ந்தெடுங்கள். எந்த பிரிவுகள் உங்களுக்குக் கிடைக்கும் என்பதை நிர்வாகி தீர்மானிப்பார்.", noneAllowed: "உங்களுக்கு எந்த பிரிவையும் நிர்வாகி இன்னும் இயக்கவில்லை.", noneShown: "எந்த பிரிவும் இயக்கப்படவில்லை.", chooseSections: "பிரிவுகளைத் தேர்ந்தெடு", sectionsFor: "பிரிவுகள்", sections: "உங்கள் பிரிவுகள்", attention: "கவனிக்க வேண்டியவை", seeAll: "அனைத்தையும் காண்", nToBuy: "{n} வாங்க வேண்டும்", nLow: "{n} குறைவாக உள்ளது", allDone: "எல்லாம் வாங்கியாச்சு", listEmpty: "பட்டியல் காலி", nToday: "இன்று {n}", nothingPlanned: "இன்று எதுவும் இல்லை", leftN: "{n} மீதம்", overN: "{n} அதிகம்", nothingYet: "இன்னும் பதிவுகள் இல்லை", tapOpen: "திறக்க தட்டவும்", groceries: "மளிகை", item: "பொருள்", tapAgain: "தேர்ந்தெடுத்த பொருளை மீண்டும் தட்டினால் நீக்கப்படும்.", toBuyTab: "வாங்க வேண்டியவை", dragHint: "வரிசையை மாற்ற வடிகட்டிகளை நீக்கவும்.", okTab: "போதுமான இருப்பு", showing: "காட்டுவது", signIn: "உள்நுழை", signUp: "பதிவு செய்", createAcct: "இலவச கணக்கை உருவாக்கு", createBtn: "கணக்கை உருவாக்கு", tryDemo: "✨ டெமோ பார்க்க", loading: "ஏற்றுகிறது…", heroBadge: "ஒவ்வொரு இல்லத்தரசிக்கும்", heroA: "உங்கள் இல்லம் முழுவதும், ", heroB: "ஒரே இடத்தில்", heroText: "மளிகையைத் திட்டமிடுங்கள், மாத பட்ஜெட்டைக் கண்காணியுங்கள், பிறந்தநாள் அல்லது பில் தேதியை மறக்காதீர்கள். எளிமையாக, தமிழிலும் ஆங்கிலத்திலும்.", already: "ஏற்கனவே பதிவு செய்துள்ளீர்களா?", featTitle: "உங்கள் இல்லத்துக்குத் தேவையான அனைத்தும், ஒரே இடத்தில்", howTitle: "எப்படி வேலை செய்கிறது", soon: "விரைவில்: குடும்ப டைரி மற்றும் உடற்பயிற்சி கண்காணிப்பு.", ctaTitle: "உங்கள் இல்லத்தை ஒழுங்குபடுத்தத் தயாரா?", yourName: "உங்கள் பெயர்", phone: "தொலைபேசி எண்", password: "கடவுச்சொல்", approveNote: "புதிய கணக்குகளை நிர்வாகி அனுமதித்த பிறகே உள்நுழையலாம்.", thanks: "நன்றி!", waitApproval: "உங்கள் கணக்கு அனுமதிக்காகக் காத்திருக்கிறது. அனுமதி கிடைத்ததும் உள்நுழையலாம்.", backSignin: "உள்நுழைவுக்குத் திரும்பு", adminUsers: "நிர்வாகி: பயனர்கள்", users: "பயனர்கள்", waiting: "அனுமதிக்காகக் காத்திருக்கின்றனர்", approve: "அனுமதி", enable: "இயக்கு", disable: "முடக்கு", reject: "நிராகரி", del: "நீக்கு", confirmDel: "{n} மற்றும் அவரது எல்லா தரவையும் நீக்கவா?", demoAccts: "டெமோ கணக்குகள் (ஒரு நாளில் தானாக நீக்கப்படும்)", st_pending: "காத்திருப்பு", st_active: "செயலில்", st_disabled: "முடக்கம்", history: "வரலாறு", historyEmpty: "முடிந்த பட்டியல்கள் மாதவாரியாக இங்கே சேமிக்கப்படும்.", copyToList: "இப்போதைய பட்டியலில் சேர்", copied: "பட்டியலில் சேர்க்கப்பட்டது", nextTitle: "அடுத்த மாத பட்டியல்", nextNote: "இந்த மாத பட்டியல் வரலாற்றில் சேமிக்கப்படும். தேவையில்லாததை நீக்குங்கள்.", startList: "புதிய பட்டியல்", lowTag: "குறைவு", signOut: "வெளியேறு", demoNote: "டெமோ கணக்கு. ஒரு நாளில் தரவு அழியும்.", back: "பின்", search: "பொருளைத் தேடுங்கள்…", allTab: "அனைத்தும்", lowTab: "குறைவு", mineTab: "என் பொருட்கள்", done: "முடிந்தது", readList: "டைப் செய்ததை பட்டியலாக்கு", seed: "100 மாதிரி பொருட்களை ஏற்று", noMatch: "பொருள் இல்லை", min: "குறைந்தபட்சம்", addItem: "பொருள் சேர்", name: "பெயர்", unit: "அலகு", save: "சேமி", noSpeech: "இந்த உலாவியில் குரல் இல்லை. டைப் செய்யுங்கள்.",
    check: "இவற்றை சரிபாருங்கள்", items: "பொருட்கள்", boughtOf: "வாங்கியது", stockEmpty: "இருப்பு இல்லை. வாங்கியதாக குறித்தால் இங்கே வரும்.", left: "உள்ளது" },
};
const EMOJI = { Rice: "🍚", "Wheat Flour": "🌾", "Toor Dal": "🫘", "Urad Dal": "🫘", Sugar: "🍬", Salt: "🧂", "Cooking Oil": "🛢️", "Tea Powder": "🍵", "Coffee Powder": "☕", Milk: "🥛", Curd: "🥣", Eggs: "🥚", Tomato: "🍅", Onion: "🧅", Potato: "🥔", Garlic: "🧄", Coconut: "🥥", "Chilli Powder": "🌶️", "Turmeric Powder": "🟡", Tamarind: "🟤", Bread: "🍞", Soap: "🧼", Detergent: "🧺" };
const CAT_EMOJI = { Grains: "🌾", Pulses: "🫘", Grocery: "🛒", Dairy: "🥛", Vegetables: "🥬", Spices: "🌶️", Household: "🧺", Fruits: "🍎", "Oil & Ghee": "🧈", "Personal Care": "🧴", "Dry Fruits": "🥜", "Snacks & Drinks": "🥤", "Meat & Fish": "🍗", "Baby Care": "👶", Other: "📦" };
let CAT = {}, LANG = "en";
const emoji = (n, c) => CAT[n]?.emoji ?? EMOJI[n] ?? CAT_EMOJI[c] ?? "📦";
const dn = (n) => (LANG === "ta" && CAT[n]?.ta) || n;
const UNITS = ["kg", "g", "L", "ml", "pcs", "pack", "dozen"];
const step = (u) => (u === "kg" || u === "L" ? 0.5 : u === "g" || u === "ml" ? 100 : 1);
const fmt = (n) => (Math.round(n * 100) / 100).toString();

// ---------- small pieces ----------
const Btn = ({ className = "", ...p }) => <button {...p} className={`active:scale-95 transition rounded-2xl font-semibold ${className}`} />;
const Stepper = ({ value, unit, onChange }) => (
  <div className="flex items-center gap-1">
    <Btn onClick={() => onChange(Math.max(step(unit), +(value - step(unit)).toFixed(3)))} className="w-9 h-9 bg-green-100 text-brand text-xl">−</Btn>
    <input key={value} type="number" inputMode="decimal" defaultValue={fmt(value)} onBlur={(e) => { const v = +e.target.value; if (v > 0 && v !== value) onChange(v); }}
      className="w-12 text-center text-sm font-bold bg-transparent outline-none" />
    <span className="text-xs text-gray-500 -ml-1 w-7">{unit}</span>
    <Btn onClick={() => onChange(+(value + step(unit)).toFixed(3))} className="w-9 h-9 bg-green-100 text-brand text-xl">+</Btn>
  </div>
);

function Row({ item, t, canDrag, onQty, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !canDrag });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 0 }}
      className={`flex items-center gap-2 bg-white rounded-2xl p-2 shadow-sm ${isDragging ? "shadow-xl ring-2 ring-brand" : ""}`}>
      {canDrag ? <span {...attributes} {...listeners} className="px-1 text-2xl text-green-300 touch-none select-none cursor-grab" aria-label="drag">⋮⋮</span> : <span className="w-2" />}
      <Btn onClick={() => onToggle(item)} className="w-9 h-9 border-2 border-green-300 text-transparent hover:text-green-300" aria-label="bought">✓</Btn>
      <span className="text-2xl">{emoji(item.name)}</span>
      <span className="flex-1 font-semibold leading-tight">{dn(item.name)}</span>
      <Stepper value={item.qty} unit={item.unit} onChange={(q) => onQty(item, q)} />
      <Btn onClick={() => onDelete(item)} className="w-8 h-9 text-gray-300 text-lg" aria-label="delete">✕</Btn>
    </div>
  );
}

// ---------- item picker ----------
function AddSheet({ t, lang, catalog, inv, listNames, onQuick, onRemove, onParsed, onDone }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [cat, setCat] = useState("");
  const [rows, setRows] = useState(null);
  const known = new Set(catalog.map((c) => c.name));
  const all = [...catalog, ...inv.filter((i) => !known.has(i.name)).map((i) => ({ name: i.name, ta: "", category: i.category, unit: i.unit, min: i.minQty, emoji: "📦", aliases: [] }))];
  const mine = new Set(inv.map((i) => i.name));
  const low = new Set(inv.filter((i) => i.minQty > 0 && i.stock <= i.minQty).map((i) => i.name));
  const cats = [...new Set(all.map((c) => c.category))];
  const s = q.trim().toLowerCase();
  const shown = all.filter((c) => (!s || c.name.toLowerCase().includes(s) || c.ta.includes(q.trim()) || c.aliases.some((a) => a.includes(s)))
    && (tab === "low" ? low.has(c.name) : tab === "mine" ? mine.has(c.name) : true) && (!cat || c.category === cat));
  const looksList = /[\d,]/.test(q) || s.split(/\s+/).length > 2;
  const upd = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch, unknown: false } : r)));
  const chip = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-brand text-white" : "bg-white text-gray-600 border border-green-100"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onDone}>
      <div className="w-full max-w-xl mx-auto bg-green-50 rounded-t-3xl h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {!rows ? (
          <>
            <div className="p-4 pb-2 space-y-2">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-full rounded-2xl bg-white border border-green-200 px-4 py-3 text-lg outline-none focus:ring-2 ring-brand" />
              <div className="flex gap-2">
                {[["all", t.allTab], ["low", `${t.lowTab} (${low.size})`], ["mine", t.mineTab]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={chip(tab === k)}>{l}</button>)}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                <button onClick={() => setCat("")} className={chip(!cat)}>{t.allTab}</button>
                {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}
              </div>
              {listNames.size > 0 && <p className="text-xs text-gray-400">{t.tapAgain}</p>}
              {looksList && <Btn onClick={async () => setRows(await api("/api/provisions/parse", "POST", { text: q }))} className="w-full py-2.5 bg-white border-2 border-brand text-brand text-sm">✍️ {t.readList}</Btn>}
            </div>
            <div className="flex-1 overflow-auto px-4 pb-2">
              {!shown.length && <p className="text-center text-gray-400 py-8">{t.noMatch}</p>}
              <div className="grid grid-cols-3 gap-2">
                {shown.map((c) => {
                  const on = listNames.has(c.name);
                  return (
                    <button key={c.name} onClick={() => (on ? onRemove(c.name) : onQuick(c))} className={`relative flex flex-col items-center gap-1 rounded-2xl p-3 text-center transition active:scale-95 ${on ? "bg-green-100 ring-2 ring-brand" : "bg-white shadow-sm"}`}>
                      <span className="text-3xl">{c.emoji}</span>
                      <span className="text-xs font-semibold leading-tight">{lang === "ta" && c.ta ? c.ta : c.name}</span>
                      {low.has(c.name) && !on && <span className="absolute top-1 right-1.5 text-[10px] text-red-500">●</span>}
                      {on && <span className="absolute top-1 right-1.5 text-xs text-brand font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4 pt-2"><Btn onClick={onDone} className="w-full py-3.5 bg-brand text-white text-lg">{t.done} ({listNames.size})</Btn></div>
          </>
        ) : (
          <div className="p-4 overflow-auto">
            <h3 className="font-bold text-lg mb-2">{t.check}</h3>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-2xl bg-white p-2 ${r.unknown ? "ring-2 ring-amber-300" : ""}`}>
                  <span className="text-2xl">{emoji(r.name, r.category)}</span>
                  <input value={r.name} onChange={(e) => upd(i, { name: e.target.value })} className="flex-1 min-w-0 font-semibold outline-none" />
                  <input type="number" inputMode="decimal" value={r.qty} onChange={(e) => upd(i, { qty: +e.target.value })} className="w-16 text-center rounded-xl bg-green-50 py-1" />
                  <select value={r.unit} onChange={(e) => upd(i, { unit: e.target.value })} className="rounded-xl bg-green-50 py-1">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
                  <Btn onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-gray-300 px-1">✕</Btn>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Btn onClick={() => setRows(null)} className="flex-1 py-3 bg-white text-gray-600">←</Btn>
              <Btn onClick={() => onParsed(rows.map(({ unknown, category, ...r }) => r))} disabled={!rows.length} className="flex-[3] py-3 bg-brand text-white disabled:opacity-40">{t.addAll} ({rows.length})</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- tabs ----------
function Tile({ icon, title, lines, tone = "bg-white", className = "", onClick, children }) {
  return (
    <button onClick={onClick} className={`${tone} rounded-3xl p-4 text-left shadow-sm active:scale-[.97] transition flex flex-col min-h-[7.5rem] ${className}`}>
      <span className="text-3xl leading-none">{icon}</span>
      <span className="mt-2 font-bold text-green-950">{title}</span>
      {lines.map((l, i) => <span key={i} className={`text-sm leading-snug ${i === 0 ? "text-gray-700 font-semibold" : "text-gray-500"}`}>{l}</span>)}
      {children}
    </button>
  );
}
const fill = (str, n) => str.replace("{n}", n);

function Home({ t, lang, user, inv, list, cal, onGo }) {
  const has = (m) => user.modules.includes(m);
  const c = CT[lang], b = BT[lang];
  const now = useClock(), today = localToday(now), nowM = nowMin(now);
  const names = new Set(list.items.filter((i) => !i.bought).map((i) => i.name));
  const low = inv.filter((i) => i.minQty > 0 && i.stock <= i.minQty).sort((a2, b2) => a2.stock / a2.minQty - b2.stock / b2.minQty).map((i) => ({ ...i, onList: names.has(i.name) }));
  const total = list.items.length, bought = list.items.filter((i) => i.bought).length, toBuy = total - bought;
  const pct = total ? Math.round((bought / total) * 100) : 0;

  const [bs, setBs] = useState(null);
  useEffect(() => { if (has("budget")) api(`/api/budget/summary?m=${thisMonth()}`).then(setBs).catch(() => setBs(false)); }, []); // eslint-disable-line

  const occ = useMemo(() => (cal?.events ? occurrences(cal.events, today, addDays(today, 7)) : []), [cal?.events, today]);
  const todays = occ.filter((o) => o.date === today && statusOf(o, today, nowM) !== "past");
  const nowCount = todays.filter((o) => statusOf(o, today, nowM) === "now").length;
  const next = occ.find((o) => o.date > today);

  const groceryLines = !total ? [t.listEmpty] : toBuy === 0 ? [t.allDone] : [fill(t.nToBuy, toBuy), ...(low.length ? [fill(t.nLow, low.length)] : [])];
  const budgetLines = bs === null ? ["…"] : bs === false || (!bs.income && !bs.expense) ? [t.nothingYet] : bs.balance >= 0 ? [fill(t.leftN, inr(bs.balance)), `${b.expenses}: ${inr(bs.expense)}`] : [fill(t.overN, inr(-bs.balance)), `${b.income}: ${inr(bs.income)}`];
  const calLines = !cal?.events ? ["…"] : todays.length ? [fill(t.nToday, todays.length), todays[0].title] : next ? [t.nothingPlanned, `${next.title} · ${dayLabel(next.date, today, c, lang)}`] : [t.nothingPlanned];

  const tiles = [];
  if (has("provisions")) tiles.push(
    <Tile key="g" icon="🛒" title={t.groceries} lines={groceryLines} tone="bg-green-100" onClick={() => onGo("groceries", toBuy === 0 && low.length ? "low" : "list")}>
      {total > 0 && <span className="mt-auto pt-2 block h-2"><span className="block h-1.5 rounded-full bg-white/70"><span className="block h-full rounded-full bg-brand transition-all" style={{ width: pct + "%" }} /></span></span>}
    </Tile>);
  if (has("budget")) tiles.push(<Tile key="b" icon="💰" title={b.title} lines={budgetLines} tone={bs && bs.balance < 0 ? "bg-red-100" : "bg-amber-100"} onClick={() => onGo("budget")} />);
  if (has("calendar")) tiles.push(
    <Tile key="c" icon="📅" title={c.title} lines={calLines} tone="bg-sky-100" onClick={() => onGo("calendar")}>
      {nowCount > 0 && <span className="mt-1 inline-block self-start rounded-full bg-brand text-white text-xs font-bold px-2.5 py-0.5 animate-pulse">{c.now}</span>}
    </Tile>);

  return (
    <div className="space-y-5">
      <section>
        <h2 className="font-bold text-lg mb-2">{t.sections}</h2>
        {!tiles.length ? (
          <div className="rounded-3xl bg-white p-5 text-center shadow-sm space-y-3">
            <p className="text-gray-500">{t.noneShown}</p>
            <Btn onClick={() => onGo("more", null, "sections")} className="px-5 py-2.5 bg-brand text-white">{t.chooseSections}</Btn>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((el, i) => (i === tiles.length - 1 && tiles.length % 2 === 1 ? cloneElement(el, { className: "col-span-2" }) : el))}
          </div>
        )}
      </section>

      {cal && <CalendarCard lang={lang} cal={cal} onOpen={() => onGo("calendar")} />}

    </div>
  );
}

function RunningLow({ t, inv, list, onRestock, onUnrestock }) {
  const names = new Set(list.items.filter((i) => !i.bought).map((i) => i.name));
  const low = inv.filter((i) => i.minQty > 0 && i.stock <= i.minQty).sort((a, b) => a.stock / a.minQty - b.stock / b.minQty).map((i) => ({ ...i, onList: names.has(i.name) }));
  return (
    <div className="space-y-2">
      {!low.length && <p className="rounded-2xl bg-white p-4 text-gray-500">{t.lowEmpty}</p>}
      {low.map((i) => (
        <div key={i.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm">
          <span className="text-3xl">{emoji(i.name, i.category)}</span>
          <div className="flex-1">
            <p className="font-semibold">{dn(i.name)}</p>
            <p className={`text-sm ${i.stock === 0 ? "text-red-600" : "text-amber-600"}`}>{fmt(i.stock)} {i.unit} {t.left} · {t.min} {fmt(i.minQty)}</p>
          </div>
          <Btn onClick={() => (i.onList ? onUnrestock(i.name) : onRestock(i))} className={`px-3 py-2 text-sm ${i.onList ? "bg-green-100 text-green-700" : "bg-brand text-white"}`}>{i.onList ? t.onList : t.addList}</Btn>
        </div>
      ))}
    </div>
  );
}

function ListTab({ t, brand, list, setList, mutate, refresh }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }));
  const allTodo = list.items.filter((i) => !i.bought), allDone = list.items.filter((i) => i.bought);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("");
  const catOf = (i) => CAT[i.name]?.category || "Other";
  const cats = [...new Set(list.items.map(catOf))].sort();
  const match = (i) => {
    const s = q.trim().toLowerCase();
    return (!s || i.name.toLowerCase().includes(s) || (CAT[i.name]?.ta || "").includes(q.trim()) || (CAT[i.name]?.aliases || []).some((a) => a.includes(s))) && (!cat || catOf(i) === cat);
  };
  const filtered = !!q.trim() || !!cat;
  const todo = status === "bought" ? [] : allTodo.filter(match);
  const done = status === "todo" ? [] : allDone.filter(match);
  const chip = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-brand text-white" : "bg-white text-gray-600 border border-green-100"}`;
  const onDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids = arrayMove(allTodo.map((i) => i.id), allTodo.findIndex((i) => i.id === active.id), allTodo.findIndex((i) => i.id === over.id));
    setList({ ...list, items: [...ids.map((id) => allTodo.find((i) => i.id === id)), ...allDone] });
    mutate(() => api("/api/provisions/list/order", "PUT", { ids }));
  };
  const qty = (i, q) => { setList((p) => ({ ...p, items: p.items.map((x) => (x.id === i.id ? { ...x, qty: q } : x)) })); mutate(() => api(`/api/provisions/list/items/${i.id}`, "PATCH", { qty: q })); };
  const del = (i) => { setList((p) => ({ ...p, items: p.items.filter((x) => x.id !== i.id) })); mutate(() => api(`/api/provisions/list/items/${i.id}`, "DELETE")); };
  const toggle = (i) => { setList((p) => ({ ...p, items: p.items.map((x) => (x.id === i.id ? { ...x, bought: !i.bought } : x)) })); mutate(() => api(`/api/provisions/list/items/${i.id}/bought`, "POST", { bought: !i.bought })); };
  const share = () => {
    const lines = allTodo.map((i, n) => `${n + 1}. ${i.name} - ${fmt(i.qty)} ${i.unit}`).join("\n");
    const msg = `🛒 *${brand.name}*\n${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}\n\n${lines}\n\n_Sent via ${brand.name}_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };
  const [nextOpen, setNextOpen] = useState(false);

  return (
    <div className="space-y-3">
      {nextOpen && <NextSheet t={t} onClose={() => setNextOpen(false)} onDone={(l) => { setList(l); setNextOpen(false); refresh(); }} />}
      {!list.items.length && <p className="rounded-2xl bg-white p-6 text-center text-gray-500">{t.empty}</p>}
      {!!list.items.length && (
        <div className="sticky top-14 z-10 -mx-4 px-4 py-2 space-y-2 bg-green-50/95 backdrop-blur">
          <div className="relative">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-full rounded-2xl bg-white border border-green-200 pl-4 pr-10 py-2.5 outline-none focus:ring-2 ring-brand" />
            {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label="clear">✕</button>}
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
            {[["all", `${t.allTab} (${list.items.length})`], ["todo", `${t.toBuyTab} (${allTodo.length})`], ["bought", `✓ ${t.bought} (${allDone.length})`]].map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={chip(status === k)}>{l}</button>)}
          </div>
          {cats.length > 1 && (
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
              <button onClick={() => setCat("")} className={chip(!cat)}>{t.allTab}</button>
              {cats.map((c) => <button key={c} onClick={() => setCat(cat === c ? "" : c)} className={chip(cat === c)}>{CAT_EMOJI[c] ?? "📦"} {c}</button>)}
            </div>
          )}
        </div>
      )}
      {!!list.items.length && !todo.length && !done.length && <p className="rounded-2xl bg-white p-6 text-center text-gray-500">{t.noMatch}</p>}
      {filtered && !!todo.length && <p className="text-xs text-gray-400">{t.dragHint}</p>}
      {!!todo.length && (
        <>
          <h2 className="font-bold">{t.toBuy} <span className="text-gray-400 text-sm">({todo.length})</span></h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={todo.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">{todo.map((i) => <Row key={i.id} item={i} t={t} canDrag={!filtered} onQty={qty} onDelete={del} onToggle={toggle} />)}</div>
            </SortableContext>
          </DndContext>
          </>
      )}
      {!!allTodo.length && <Btn onClick={share} className="w-full py-4 bg-[#25D366] text-white text-lg shadow-md">💬 {t.send}</Btn>}
      {!!done.length && (
        <>
          <h2 className="font-bold pt-2 text-gray-500">{t.bought} ({done.length})</h2>
          <div className="space-y-1.5">
            {done.map((i) => (
              <div key={i.id} className="flex items-center gap-2 rounded-2xl bg-green-50 p-2 opacity-80">
                <Btn onClick={() => toggle(i)} className="w-9 h-9 bg-green-500 text-white">✓</Btn>
                <span className="text-xl">{emoji(i.name)}</span>
                <span className="flex-1 line-through text-gray-500">{dn(i.name)}</span>
                <span className="text-sm text-gray-500">{fmt(i.qty)} {i.unit}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {!!list.items.length && <Btn onClick={() => setNextOpen(true)} className="w-full py-3 border-2 border-dashed border-green-300 text-brand">🔁 {t.newMonth}</Btn>}
    </div>
  );
}

function Stock({ t, items, setItems, mutate, refresh, onSeed }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", unit: "kg", minQty: 1 });
  const patch = (i, body) => {
    setItems((p) => p.map((x) => (x.id !== i.id ? x : { ...x, ...(body.delta != null && { stock: Math.max(0, +(x.stock + body.delta).toFixed(3)) }), ...(body.minQty != null && { minQty: body.minQty }) })));
    mutate(() => api(`/api/provisions/inventory/${i.id}`, "PATCH", body));
  };
  const removeItem = (i) => {
    if (!confirm(t.removeAsk.replace("{n}", dn(i.name)))) return;
    setItems((p) => p.filter((x) => x.id !== i.id));
    mutate(() => api(`/api/provisions/inventory/${i.id}`, "DELETE"));
  };
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("");
  const isLow = (i) => i.minQty > 0 && i.stock <= i.minQty;
  const cats = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => (!s || i.name.toLowerCase().includes(s) || (CAT[i.name]?.ta || "").includes(q.trim()) || (CAT[i.name]?.aliases || []).some((a) => a.includes(s)))
      && (status === "all" || (status === "low" ? isLow(i) : !isLow(i))) && (!cat || i.category === cat));
  }, [items, q, status, cat]);
  const lowCount = items.filter(isLow).length;
  const groups = useMemo(() => shown.reduce((a, i) => ((a[i.category] ??= []).push(i), a), {}), [shown]);
  const chip = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-brand text-white" : "bg-white text-gray-600 border border-green-100"}`;
  const save = async () => { if (!f.name.trim()) return; await api("/api/provisions/inventory", "POST", { ...f, name: f.name.trim() }); setAdding(false); setF({ name: "", unit: "kg", minQty: 1 }); refresh(); };
  return (
    <div className="space-y-4">
      {!items.length && <p className="rounded-2xl bg-white p-6 text-center text-gray-500">{t.stockEmpty}</p>}
      {!!items.length && (
        <div className="sticky top-14 z-10 -mx-4 px-4 py-2 space-y-2 bg-green-50/95 backdrop-blur">
          <div className="relative">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-full rounded-2xl bg-white border border-green-200 pl-4 pr-10 py-2.5 outline-none focus:ring-2 ring-brand" />
            {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label="clear">✕</button>}
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
            {[["all", `${t.allTab} (${items.length})`], ["low", `🔴 ${t.lowTab} (${lowCount})`], ["ok", `${t.okTab} (${items.length - lowCount})`]].map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={chip(status === k)}>{l}</button>)}
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
            <button onClick={() => setCat("")} className={chip(!cat)}>{t.allTab}</button>
            {cats.map((c) => <button key={c} onClick={() => setCat(cat === c ? "" : c)} className={chip(cat === c)}>{CAT_EMOJI[c] ?? "📦"} {c}</button>)}
          </div>
        </div>
      )}
      {!!items.length && !shown.length && <p className="rounded-2xl bg-white p-6 text-center text-gray-500">{t.noMatch}</p>}
      {Object.entries(groups).map(([cat, list]) => (
        <section key={cat}>
          <h2 className="font-bold mb-1.5">{CAT_EMOJI[cat] ?? "📦"} {cat}</h2>
          <div className="space-y-2">
            {list.map((i) => {
              const low = i.minQty > 0 && i.stock <= i.minQty;
              return (
                <div key={i.id} className={`flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow-sm ${low ? "ring-2 ring-red-200" : ""}`}>
                  <span className="text-2xl">{emoji(i.name, i.category)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight">{dn(i.name)}</p>
                    <label className="text-xs text-gray-400">{t.min} <input type="number" inputMode="decimal" defaultValue={i.minQty} onBlur={(e) => +e.target.value !== i.minQty && patch(i, { minQty: +e.target.value })} className="w-12 rounded bg-green-50 text-center text-gray-600" /></label>
                  </div>
                  <Btn onClick={() => patch(i, { delta: -step(i.unit) })} className="w-9 h-9 bg-green-100 text-brand text-xl">−</Btn>
                  <span className={`min-w-16 text-center font-bold ${low ? "text-red-600" : ""}`}>{fmt(i.stock)} {i.unit}</span>
                  <Btn onClick={() => patch(i, { delta: step(i.unit) })} className="w-9 h-9 bg-green-100 text-brand text-xl">+</Btn>
                  <Btn onClick={() => removeItem(i)} className="w-8 h-9 text-gray-300 hover:text-red-500 text-lg" aria-label="remove">✕</Btn>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {adding ? (
        <div className="rounded-2xl bg-white p-3 space-y-2 shadow">
          <input autoFocus placeholder={t.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="w-full rounded-xl bg-green-50 p-2.5" />
          <div className="flex gap-2">
            <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="flex-1 rounded-xl bg-green-50 p-2.5">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
            <input type="number" inputMode="decimal" value={f.minQty} onChange={(e) => setF({ ...f, minQty: +e.target.value })} className="w-24 rounded-xl bg-green-50 p-2.5 text-center" />
          </div>
          <div className="flex gap-2">
            <Btn onClick={() => setAdding(false)} className="flex-1 py-2.5 bg-gray-100">{t.cancel}</Btn>
            <Btn onClick={save} className="flex-1 py-2.5 bg-brand text-white">{t.save}</Btn>
          </div>
        </div>
      ) : <Btn onClick={() => setAdding(true)} className="w-full py-3 border-2 border-dashed border-green-300 text-brand">＋ {t.addItem}</Btn>}
      <Btn onClick={onSeed} className="w-full py-3 bg-white border border-green-200 text-gray-600 text-sm">📥 {t.seed}</Btn>
    </div>
  );
}


// ---------- next-month preview ----------
function NextSheet({ t, onClose, onDone }) {
  const [rows, setRows] = useState(null);
  const [off, setOff] = useState(new Set());
  const [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/provisions/list/next-preview").then((r) => setRows(r.items)).catch(() => setRows([])); }, []);
  const chosen = (rows || []).filter((r) => !off.has(r.name));
  const go = async () => { setBusy(true); try { onDone(await api("/api/provisions/list/new", "POST", { items: chosen.map(({ name, qty, unit }) => ({ name, qty, unit })) })); } finally { setBusy(false); } };
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-xl mx-auto bg-green-50 rounded-t-3xl max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 pb-2"><h3 className="font-bold text-lg">{t.nextTitle}</h3><p className="text-sm text-gray-500">{t.nextNote}</p></div>
        <div className="flex-1 overflow-auto px-4 space-y-1.5">
          {rows === null && <p className="text-center text-gray-400 py-6">…</p>}
          {(rows || []).map((r) => {
            const on = !off.has(r.name);
            return (
              <button key={r.name} onClick={() => { const n = new Set(off); on ? n.add(r.name) : n.delete(r.name); setOff(n); }}
                className={`w-full flex items-center gap-3 rounded-2xl p-2.5 text-left ${on ? "bg-white shadow-sm" : "bg-green-100/50 opacity-60"}`}>
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-sm ${on ? "bg-brand" : "border-2 border-green-300"}`}>{on && "✓"}</span>
                <span className="text-2xl">{emoji(r.name)}</span>
                <span className="flex-1 font-semibold">{dn(r.name)}{r.reason === "low" && <span className="ml-2 text-xs font-bold text-red-500">{t.lowTag}</span>}</span>
                <span className="text-sm text-gray-500">{fmt(r.qty)} {r.unit}</span>
              </button>
            );
          })}
        </div>
        <div className="p-4 flex gap-2">
          <Btn onClick={onClose} className="flex-1 py-3 bg-white text-gray-600">{t.cancel}</Btn>
          <Btn onClick={go} disabled={busy} className="flex-[2] py-3 bg-brand text-white disabled:opacity-50">{t.startList} ({chosen.length})</Btn>
        </div>
      </div>
    </div>
  );
}

// ---------- history ----------
const monthOf = (d) => new Date(d).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
function History({ t, brand, onCopied }) {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState("");
  useEffect(() => { api("/api/provisions/history").then(setRows).catch(() => setRows([])); }, []);
  const view = async (id) => setOpen(await api(`/api/provisions/history/${id}`));
  if (open) {
    const share = () => {
      const lines = open.items.map((i, n) => `${n + 1}. ${i.name} - ${fmt(i.qty)} ${i.unit}`).join("\n");
      window.open(`https://wa.me/?text=${encodeURIComponent(`🛒 *${brand.name}* · ${monthOf(open.closedAt)}\n\n${lines}`)}`, "_blank");
    };
    return (
      <div className="space-y-3">
        <Btn onClick={() => { setOpen(null); setNote(""); }} className="text-brand px-1">← {t.back}</Btn>
        <h2 className="font-bold text-lg">{monthOf(open.closedAt)}</h2>
        <div className="space-y-1.5">
          {open.items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow-sm">
              <span className="text-2xl">{emoji(i.name)}</span><span className={`flex-1 font-semibold ${i.bought ? "text-gray-400 line-through" : ""}`}>{dn(i.name)}</span>
              <span className="text-sm text-gray-500">{fmt(i.qty)} {i.unit}</span>
            </div>
          ))}
        </div>
        {note && <p className="rounded-xl bg-green-100 p-2.5 text-center text-sm text-green-800">{note}</p>}
        <Btn onClick={async () => { await api(`/api/provisions/history/${open.id}/copy`, "POST"); setNote(t.copied); onCopied(); }} className="w-full py-3.5 bg-brand text-white">{t.copyToList}</Btn>
        <Btn onClick={share} className="w-full py-3 bg-[#25D366] text-white">💬 {t.send}</Btn>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rows === null && <p className="text-center text-gray-400 py-6">…</p>}
      {rows?.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-gray-500">{t.historyEmpty}</p>}
      {rows?.map((h) => (
        <button key={h.id} onClick={() => view(h.id)} className="w-full flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm text-left active:scale-[.99]">
          <span className="text-2xl">🗓️</span>
          <span className="flex-1"><span className="block font-bold">{monthOf(h.closedAt)}</span><span className="text-sm text-gray-500">{h.count} {h.count === 1 ? t.item : t.items} · {h.bought} {t.boughtOf}</span></span>
          <span className="text-gray-300 text-xl">›</span>
        </button>
      ))}
    </div>
  );
}

// ---------- admin ----------
const MODULE_ICON = { provisions: "🛒", budget: "💰", calendar: "📅" };
const moduleLabel = (m, lang) => (m === "provisions" ? T[lang].groceries : m === "budget" ? BT[lang].title : m === "calendar" ? CT[lang].title : m);
const modList = (str) => (str || "").split(",").filter(Boolean);

function AdminView({ t, lang, data, err, onSet, onDel, onToggleMod }) {
  const pending = data.users.filter((u) => u.status === "pending").length;
  const badge = { pending: "bg-amber-100 text-amber-800", active: "bg-green-100 text-green-800", disabled: "bg-gray-200 text-gray-600" };
  return (
    <div className="space-y-2">
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
      <p className="text-sm text-gray-500">{data.users.length} {t.users} · {pending} {t.waiting}</p>
      {data.users.map((u) => (
        <div key={u.id} className={`rounded-2xl bg-white p-3 shadow-sm ${u.status === "pending" ? "ring-2 ring-amber-300" : ""}`}>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0"><p className="font-bold truncate">{u.name} {u.role === "admin" && "👑"}</p><p className="text-sm text-gray-500">{u.phone} · {new Date(u.createdAt).toLocaleDateString("en-IN")}</p></div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge[u.status]}`}>{t["st_" + u.status]}</span>
          </div>
          {u.role !== "admin" && (
            <>
              <div className="mt-2.5">
                <p className="text-xs text-gray-400 mb-1">{t.sectionsFor}</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.modules.map((m) => {
                    const on = modList(u.modules).includes(m);
                    return <button key={m} onClick={() => onToggleMod(u, m)} aria-pressed={on} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-brand text-white" : "bg-gray-100 text-gray-400 line-through"}`}>{MODULE_ICON[m]} {moduleLabel(m, lang)}</button>;
                  })}
                </div>
              </div>
              <div className="flex gap-2 mt-2.5">
                {u.status !== "active" && <Btn onClick={() => onSet(u, "active")} className="flex-1 py-2 bg-brand text-white text-sm">{u.status === "pending" ? t.approve : t.enable}</Btn>}
                {u.status === "active" && <Btn onClick={() => onSet(u, "disabled")} className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm">{t.disable}</Btn>}
                {u.status === "pending" && <Btn onClick={() => onSet(u, "disabled")} className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm">{t.reject}</Btn>}
                <Btn onClick={() => onDel(u)} className="px-4 py-2 bg-red-50 text-red-600 text-sm">{t.del}</Btn>
              </div>
            </>
          )}
        </div>
      ))}
      {data.demoCount > 0 && <p className="text-xs text-gray-400 text-center pt-2">{data.demoCount} {t.demoAccts}</p>}
    </div>
  );
}

function Admin({ t, lang }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const q = useRef(Promise.resolve()); // admin taps are sent one after another, so the last tap wins
  const load = useCallback(() => api("/api/admin/users").then((d) => { setData(d); setErr(""); }).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const send = (fn) => { q.current = q.current.then(fn).catch((e) => { setErr(e.message); return load(); }); };
  const onSet = (u, status) => send(async () => { await api(`/api/admin/users/${u.id}`, "PATCH", { status }); await load(); });
  const onDel = (u) => confirm(t.confirmDel.replace("{n}", u.name)) && send(async () => { await api(`/api/admin/users/${u.id}`, "DELETE"); await load(); });
  const onToggleMod = (u, m) => {
    const cur = modList(u.modules), next = cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m];
    setData((d) => ({ ...d, users: d.users.map((x) => (x.id === u.id ? { ...x, modules: next.join(",") } : x)) }));
    send(() => api(`/api/admin/users/${u.id}`, "PATCH", { modules: next }));
  };
  if (!data) return err ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p> : <p className="text-center text-gray-400 py-6">…</p>;
  return <AdminView t={t} lang={lang} data={data} err={err} onSet={onSet} onDel={onDel} onToggleMod={onToggleMod} />;
}

// Each user chooses which of the sections their admin allowed they want to see.
function Sections({ t, lang, user, onUser }) {
  const [err, setErr] = useState("");
  const q = useRef(Promise.resolve());
  const toggle = (m) => {
    const hidden = user.hidden.includes(m) ? user.hidden.filter((x) => x !== m) : [...user.hidden, m];
    onUser({ ...user, hidden, modules: user.allowed.filter((x) => !hidden.includes(x)) });
    q.current = q.current.then(() => api("/api/auth/modules", "PATCH", { hidden })).catch(async (e) => {
      setErr(e.message);
      try { onUser((await api("/api/auth/me")).user); } catch { /* keep what is on screen */ }
    });
  };
  return (
    <div className="space-y-3">
      <h2 className="font-bold text-lg">{t.mySections}</h2>
      <p className="text-sm text-gray-500">{t.sectionsHint}</p>
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
      {!user.allowed.length && <p className="rounded-2xl bg-white p-5 text-center text-gray-500">{t.noneAllowed}</p>}
      <div className="space-y-2">
        {user.allowed.map((m) => {
          const on = user.modules.includes(m);
          return (
            <button key={m} role="switch" aria-checked={on} onClick={() => toggle(m)} className="w-full flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm text-left active:scale-[.99]">
              <span className="text-2xl">{MODULE_ICON[m]}</span>
              <span className="flex-1 font-semibold">{moduleLabel(m, lang)}</span>
              <span className={`relative inline-block w-12 h-7 rounded-full transition-colors ${on ? "bg-brand" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? "left-[1.4rem]" : "left-0.5"}`} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function More({ t, lang, user, onUser, view, setView, onLogout }) {
  if (view) return (
    <div className="space-y-3">
      <Btn onClick={() => setView(null)} className="text-brand px-1">← {t.back}</Btn>
      {view === "sections" ? <Sections t={t} lang={lang} user={user} onUser={onUser} /> : <Admin t={t} lang={lang} />}
    </div>
  );
  const Row2 = ({ icon, label, onClick, danger }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm text-left font-semibold active:scale-[.99] ${danger ? "text-red-600" : ""}`}><span className="text-2xl">{icon}</span><span className="flex-1">{label}</span><span className="text-gray-300 text-xl">›</span></button>
  );
  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="font-bold text-lg">{user.name}</p><p className="text-sm text-gray-500">{user.isDemo ? t.demoNote : user.phone}</p></div>
      <Row2 icon="🧩" label={t.mySections} onClick={() => setView("sections")} />
      {user.role === "admin" && <Row2 icon="👑" label={t.adminUsers} onClick={() => setView("admin")} />}
      <Row2 icon="🚪" label={t.signOut} onClick={onLogout} danger />
    </div>
  );
}

// ---------- landing page + sign in / sign up / demo ----------
const FEATURES = {
  en: [
    ["🛒", "Groceries", "Make the monthly list from 275+ everyday items, send it to your shop on WhatsApp, and keep track of what is left at home."],
    ["💰", "Budget", "Add all your income and expenses, see where the money goes in a pie chart, and copy last month in one tap."],
    ["📅", "Calendar", "Save birthdays, bill dues and appointments. What is on today shows on your home screen and lights up when the time arrives."],
    ["🧩", "Only what you need", "Choose which sections you want to see. Your admin can switch sections on or off for each person."],
    ["🌐", "Tamil and English", "Switch language any time. Item names show in Tamil too."],
    ["🔒", "Private to your family", "Your lists, budget and events belong to your account only."],
  ],
  ta: [
    ["🛒", "மளிகை", "275+ அன்றாடப் பொருட்களிலிருந்து மாத பட்டியலைத் தயாரித்து, வாட்ஸ்அப்பில் கடைக்கு அனுப்புங்கள். வீட்டில் என்ன மீதம் உள்ளது என்பதையும் கண்காணியுங்கள்."],
    ["💰", "பட்ஜெட்", "எல்லா வருமானம் மற்றும் செலவுகளையும் சேர்க்கவும். பணம் எங்கே போகிறது என்பதை வட்ட வரைபடத்தில் பார்க்கவும். கடந்த மாதத்தை ஒரே தட்டலில் நகலெடுக்கவும்."],
    ["📅", "நாட்காட்டி", "பிறந்தநாள், பில் தேதி, சந்திப்புகளை சேமிக்கவும். இன்றைய நிகழ்வுகள் முகப்பில் தெரியும்; நேரம் வந்ததும் ‘இப்போது’ என்று ஒளிரும்."],
    ["🧩", "உங்களுக்குத் தேவையானது மட்டும்", "எந்த பிரிவுகளைப் பார்க்க வேண்டும் என்பதை நீங்களே தேர்ந்தெடுக்கலாம். ஒவ்வொருவருக்கும் பிரிவுகளை நிர்வாகி இயக்கவோ முடக்கவோ முடியும்."],
    ["🌐", "தமிழ் மற்றும் ஆங்கிலம்", "எப்போது வேண்டுமானாலும் மொழியை மாற்றலாம். பொருட்களின் பெயர்கள் தமிழிலும் தெரியும்."],
    ["🔒", "உங்கள் குடும்பத்திற்கு மட்டும்", "உங்கள் பட்டியல்கள், பட்ஜெட் மற்றும் நிகழ்வுகள் உங்கள் கணக்கிற்கு மட்டுமே சொந்தம்."],
  ],
};
const STEPS = {
  en: [["1", "Create your account", "Sign up, or try the demo first"], ["2", "Pick your sections", "Groceries, Budget, Calendar"], ["3", "Run your home", "Everything on one dashboard"]],
  ta: [["1", "கணக்கை உருவாக்குங்கள்", "பதிவு செய்யுங்கள் அல்லது முதலில் டெமோ பாருங்கள்"], ["2", "பிரிவுகளைத் தேர்ந்தெடுங்கள்", "மளிகை, பட்ஜெட், நாட்காட்டி"], ["3", "இல்லத்தை நிர்வகியுங்கள்", "எல்லாம் ஒரே முகப்பில்"]],
};
// The phone mock-up on the landing page: a dashboard tile for each section.
const MOCK_TILES = {
  en: [["🛒", "Groceries", "3 to buy", "bg-green-100"], ["💰", "Budget", "₹21,000 left", "bg-amber-100"], ["📅", "Calendar", "2 today", "bg-sky-100"]],
  ta: [["🛒", "மளிகை", "3 வாங்க வேண்டும்", "bg-green-100"], ["💰", "பட்ஜெட்", "₹21,000 மீதம்", "bg-amber-100"], ["📅", "நாட்காட்டி", "இன்று 2", "bg-sky-100"]],
};
const MOCK_EVENTS = {
  en: [["🎂", "Amma's birthday", "All day"], ["🩺", "Doctor visit", "6:30 PM"]],
  ta: [["🎂", "அம்மா பிறந்தநாள்", "நாள் முழுவதும்"], ["🩺", "மருத்துவர் சந்திப்பு", "6:30 PM"]],
};

function LangToggle({ lang, onLang, className = "" }) {
  return <Btn onClick={() => onLang(lang === "en" ? "ta" : "en")} className={`px-3 py-1.5 bg-white shadow-sm text-sm border border-green-200 ${className}`}>{lang === "en" ? "தமிழ்" : "English"}</Btn>;
}

function AuthSheet({ t, initial, onUser, onClose }) {
  const [mode, setMode] = useState(initial);
  const [f, setF] = useState({ name: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (fn) => { setErr(""); setBusy(true); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const submit = (e) => { e.preventDefault(); run(async () => {
    if (mode === "signup") { await api("/api/auth/signup", "POST", f); setDone(true); }
    else onUser((await api("/api/auth/login", "POST", f)).user);
  }); };
  const input = "w-full rounded-2xl bg-white border border-green-200 px-4 py-3.5 text-lg outline-none focus:ring-2 ring-brand";
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md bg-green-50 rounded-t-3xl sm:rounded-3xl p-5 pb-8 max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end"><button onClick={onClose} className="text-gray-400 text-2xl px-2" aria-label="close">✕</button></div>
        {done ? (
          <div className="text-center space-y-3 pb-2">
            <div className="text-5xl">⏳</div><h2 className="font-bold text-xl">{t.thanks}</h2>
            <p className="text-gray-600">{t.waitApproval}</p>
            <Btn onClick={() => { setDone(false); setMode("login"); }} className="w-full py-3 bg-brand text-white">{t.backSignin}</Btn>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex rounded-2xl bg-green-100 p-1">
              {[["login", t.signIn], ["signup", t.signUp]].map(([k, l]) => <button type="button" key={k} onClick={() => { setMode(k); setErr(""); }} className={`flex-1 rounded-xl py-2 font-semibold ${mode === k ? "bg-white shadow text-brand" : "text-gray-500"}`}>{l}</button>)}
            </div>
            {mode === "signup" && <input className={input} placeholder={t.yourName} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />}
            <input className={input} placeholder={t.phone} inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
            <input className={input} placeholder={t.password} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            {mode === "signup" && <p className="text-xs text-gray-500">{t.approveNote}</p>}
            {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
            <Btn type="submit" disabled={busy} className="w-full py-3.5 bg-brand text-white text-lg disabled:opacity-50">{mode === "login" ? t.signIn : t.createBtn}</Btn>
          </form>
        )}
      </div>
    </div>
  );
}

function Landing({ brand, lang, onLang, onUser }) {
  const t = T[lang];
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const demo = async () => { setErr(""); setBusy(true); try { onUser((await api("/api/auth/demo", "POST")).user); } catch (e) { setErr(e.message); setBusy(false); } };
  return (
    <div className="min-h-screen bg-green-50 text-gray-800">
      <header className="sticky top-0 z-20 bg-green-50/90 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 px-4 py-3">
          <span className="text-xl font-extrabold text-brand truncate" translate="no">🏡 {brand.name}</span>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} onLang={onLang} />
            <Btn onClick={() => setSheet("login")} className="px-3 py-1.5 text-brand border border-green-300 bg-white text-sm">{t.signIn}</Btn>
            <Btn onClick={() => setSheet("signup")} className="px-3 py-1.5 bg-brand text-white text-sm">{t.signUp}</Btn>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 pt-8 pb-12 grid md:grid-cols-2 gap-8 items-center">
        <div className="text-center md:text-left">
          <span className="inline-block rounded-full bg-green-100 text-green-800 text-xs font-bold px-3 py-1 mb-4">{t.heroBadge}</span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-green-950">{t.heroA}<span className="text-brand">{t.heroB}</span></h1>
          <p className="mt-4 text-lg text-gray-600">{t.heroText}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Btn onClick={() => setSheet("signup")} className="px-6 py-3.5 bg-brand text-white text-lg shadow-lg">{t.createAcct}</Btn>
            <Btn onClick={demo} disabled={busy} className="px-6 py-3.5 bg-white border-2 border-brand text-brand text-lg disabled:opacity-50">{busy ? t.loading : t.tryDemo}</Btn>
          </div>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          <p className="mt-3 text-sm text-gray-500">{t.already} <button onClick={() => setSheet("login")} className="font-bold text-brand underline">{t.signIn}</button></p>
        </div>

        <div className="mx-auto w-full max-w-xs" aria-hidden="true">
          <div className="rounded-[2rem] bg-white p-4 shadow-2xl border-4 border-green-900/10 rotate-1" translate="no">
            <p className="font-bold text-brand mb-2">{brand.name}</p>
            <div className="grid grid-cols-2 gap-2">
              {MOCK_TILES[lang].map(([e, title, line, tone], i, all) => (
                <div key={title} className={`${tone} rounded-2xl p-3 ${i === all.length - 1 && all.length % 2 === 1 ? "col-span-2" : ""}`}>
                  <div className="text-2xl leading-none">{e}</div>
                  <div className="mt-1.5 font-bold text-sm text-green-950">{title}</div>
                  <div className="text-xs text-gray-600">{line}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl bg-green-50/70 p-2.5 space-y-1.5">
              {MOCK_EVENTS[lang].map(([e, title, when], i) => (
                <div key={title} className={`flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 ${i === 1 ? "ring-2 ring-brand" : ""}`}>
                  <span className="text-xl">{e}</span>
                  <span className="flex-1 text-sm font-semibold truncate">{title}</span>
                  <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${i === 1 ? "bg-brand text-white" : "bg-green-50 text-gray-600"}`}>{i === 1 ? CT[lang].now : when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-green-950">{t.featTitle}</h2>
          <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES[lang].map(([i, h, d]) => (
              <div key={h} className="rounded-3xl bg-green-50 p-5"><div className="text-3xl mb-2">{i}</div><h3 className="font-bold text-lg">{h}</h3><p className="text-sm text-gray-600 mt-1">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-extrabold text-center text-green-950">{t.howTitle}</h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {STEPS[lang].map(([n, h, d]) => (
            <div key={n} className="rounded-3xl bg-white p-5 text-center shadow-sm"><div className="mx-auto w-10 h-10 rounded-full bg-brand text-white font-extrabold flex items-center justify-center mb-2">{n}</div><h3 className="font-bold">{h}</h3><p className="text-sm text-gray-500">{d}</p></div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-500">{t.soon}</p>
      </section>

      <section className="bg-gradient-to-br from-green-600 to-green-800 text-white py-12 text-center px-4">
        <h2 className="text-2xl md:text-3xl font-extrabold">{t.ctaTitle}</h2>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Btn onClick={() => setSheet("signup")} className="px-6 py-3.5 bg-white text-green-800 text-lg">{t.createAcct}</Btn>
          <Btn onClick={demo} disabled={busy} className="px-6 py-3.5 border-2 border-white text-white text-lg disabled:opacity-50">{t.tryDemo}</Btn>
        </div>
      </section>
      <footer className="text-center text-xs text-gray-400 py-6">© {new Date().getFullYear()} {brand.name}</footer>

      {sheet && <AuthSheet t={t} initial={sheet} onUser={onUser} onClose={() => setSheet(null)} />}
    </div>
  );
}

// ---------- budget ----------
const INCOME_CATS = ["Salary", "Business", "Rent received", "Interest", "Gift", "Other"];
const EXPENSE_CATS = ["Rent", "Groceries", "Electricity", "Water", "Gas", "Mobile & Internet", "EMI / Loan", "School fees", "Medical", "Fuel", "Transport", "Insurance", "Savings", "Entertainment", "Festival", "Clothing", "Other"];
const BCAT_TA = { Salary: "சம்பளம்", Business: "தொழில்", "Rent received": "வாடகை வருமானம்", Interest: "வட்டி", Gift: "பரிசு", Other: "மற்றவை", Rent: "வாடகை", Groceries: "மளிகை", Electricity: "மின்சாரம்", Water: "தண்ணீர்", Gas: "கேஸ்", "Mobile & Internet": "மொபைல் & இணையம்", "EMI / Loan": "EMI / கடன்", "School fees": "பள்ளிக் கட்டணம்", Medical: "மருத்துவம்", Fuel: "பெட்ரோல்", Transport: "பயணம்", Insurance: "காப்பீடு", Savings: "சேமிப்பு", Entertainment: "பொழுதுபோக்கு", Festival: "பண்டிகை", Clothing: "உடைகள்" };
const BCAT_ICON = { Salary: "💼", Business: "🏪", "Rent received": "🏠", Interest: "🏦", Gift: "🎁", Other: "📌", Rent: "🏠", Groceries: "🛒", Electricity: "💡", Water: "🚰", Gas: "🔥", "Mobile & Internet": "📱", "EMI / Loan": "💳", "School fees": "🎓", Medical: "💊", Fuel: "⛽", Transport: "🚌", Insurance: "🛡️", Savings: "🐷", Entertainment: "🎬", Festival: "🪔", Clothing: "👗" };
const PIE_COLORS = ["#15803d", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6", "#ec4899", "#84cc16", "#f97316", "#6366f1", "#0ea5e9", "#a3a3a3"];
const BT = {
  en: { title: "Budget", income: "Income", expenses: "Expenses", balance: "Balance", paid: "Paid", pending: "Pending", addIncome: "Add income", addExpense: "Add expense", newIncome: "New income", newExpense: "New expense", editEntry: "Edit", whatFor: "Details (optional)", amount: "Amount (₹)", category: "Category", markPaid: "Already paid", copyPrev: "Copy from last month", where: "Where the money goes", noExpenses: "No expenses yet. Add your first one.", noIncome: "No income yet. Add your first one.", needAmount: "Enter a valid amount", added: "Added", nothingToCopy: "Nothing new to copy", saved: "of income saved", overspent: "Spending is more than income", thisMonth: "This month", open: "Open", save: "Save", cancel: "Cancel", del: "Delete", other: "Other" },
  ta: { title: "பட்ஜெட்", income: "வருமானம்", expenses: "செலவுகள்", balance: "மீதம்", paid: "செலுத்தியது", pending: "பாக்கி", addIncome: "வருமானம் சேர்", addExpense: "செலவு சேர்", newIncome: "புதிய வருமானம்", newExpense: "புதிய செலவு", editEntry: "திருத்து", whatFor: "விவரம் (விருப்பம்)", amount: "தொகை (₹)", category: "வகை", markPaid: "ஏற்கனவே செலுத்திவிட்டேன்", copyPrev: "கடந்த மாதத்திலிருந்து நகலெடு", where: "பணம் எங்கே போகிறது", noExpenses: "இன்னும் செலவுகள் இல்லை. முதல் செலவைச் சேர்க்கவும்.", noIncome: "இன்னும் வருமானம் இல்லை. முதல் வருமானத்தைச் சேர்க்கவும்.", needAmount: "சரியான தொகையை உள்ளிடவும்", added: "சேர்க்கப்பட்டது", nothingToCopy: "நகலெடுக்க புதிதாக எதுவும் இல்லை", saved: "வருமானத்தில் சேமிப்பு", overspent: "செலவு வருமானத்தை விட அதிகம்", thisMonth: "இந்த மாதம்", open: "திற", save: "சேமி", cancel: "ரத்து", del: "நீக்கு", other: "மற்றவை" },
};
const bcat = (c, lang) => (lang === "ta" && BCAT_TA[c]) || c;
const inr = (n) => "₹" + (Math.round(n * 100) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const shiftMonth = (m, n) => { const d = new Date(+m.slice(0, 4), +m.slice(5) - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
const monthName = (m, lang) => new Date(+m.slice(0, 4), +m.slice(5) - 1, 1).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { month: "long", year: "numeric" });

function Pie({ slices, total, center }) {
  const R = 70, r = 42, c = 80;
  const pt = (rad, a) => [c + rad * Math.cos(a), c + rad * Math.sin(a)];
  let a0 = -Math.PI / 2;
  return (
    <svg viewBox="0 0 160 160" className="w-44 h-44 shrink-0" role="img" aria-label="expenses by category">
      {slices.length === 1 ? (
        <circle cx={c} cy={c} r={(R + r) / 2} fill="none" stroke={slices[0].color} strokeWidth={R - r} />
      ) : slices.map((sl) => {
        const a1 = a0 + (sl.value / total) * 2 * Math.PI, large = a1 - a0 > Math.PI ? 1 : 0;
        const [x0, y0] = pt(R, a0), [x1, y1] = pt(R, a1), [x2, y2] = pt(r, a1), [x3, y3] = pt(r, a0);
        const d = `M${x0} ${y0}A${R} ${R} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${large} 0 ${x3} ${y3}Z`;
        a0 = a1;
        return <path key={sl.name} d={d} fill={sl.color} />;
      })}
      <text x={c} y={c - 2} textAnchor="middle" fontSize="11" fill="#6b7280">{center[0]}</text>
      <text x={c} y={c + 14} textAnchor="middle" fontSize="13" fontWeight="700" fill="#14532d">{center[1]}</text>
    </svg>
  );
}

function BudgetSheet({ b, lang, initial, onSave, onDelete, onClose }) {
  const editing = !!initial.id;
  const [type, setType] = useState(initial.type);
  const [cat, setCat] = useState(initial.category || "");
  const [title, setTitle] = useState(initial.title && initial.title !== initial.category ? initial.title : "");
  const [amount, setAmount] = useState(initial.amount != null ? String(initial.amount) : "");
  const [paid, setPaid] = useState(!!initial.paid);
  const [err, setErr] = useState("");
  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS;
  const chip = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-brand text-white" : "bg-white text-gray-600 border border-green-100"}`;
  const save = () => {
    const n = Number(amount);
    if (!amount.trim() || !Number.isFinite(n) || n <= 0) return setErr(b.needAmount);
    const category = cat || "Other";
    onSave({ ...(editing && { id: initial.id }), type, category, title: title.trim() || category, amount: n, paid: type === "expense" && paid });
  };
  const input = "w-full rounded-2xl bg-white border border-green-200 px-4 py-3 text-lg outline-none focus:ring-2 ring-brand";
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-xl mx-auto bg-green-50 rounded-t-3xl p-4 pb-8 max-h-[92vh] overflow-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        {editing ? <h3 className="font-bold text-lg">{b.editEntry}</h3> : (
          <div className="flex rounded-2xl bg-green-100 p-1">
            {[["income", b.income], ["expense", b.expenses]].map(([k, l]) => (
              <button key={k} onClick={() => { setType(k); setCat(""); }} className={`flex-1 rounded-xl py-2 font-semibold ${type === k ? "bg-white shadow text-brand" : "text-gray-500"}`}>{l}</button>
            ))}
          </div>
        )}
        <input autoFocus inputMode="decimal" className={input} placeholder={b.amount} value={amount} onChange={(e) => { setAmount(e.target.value); setErr(""); }} />
        <div>
          <p className="text-sm text-gray-500 mb-1.5">{b.category}</p>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{BCAT_ICON[c]} {bcat(c, lang)}</button>)}
          </div>
        </div>
        <input className={input} placeholder={b.whatFor} value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
        {type === "expense" && (
          <button onClick={() => setPaid(!paid)} className="w-full flex items-center gap-3 rounded-2xl bg-white p-3 text-left">
            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-sm ${paid ? "bg-brand" : "border-2 border-green-300"}`}>{paid && "✓"}</span>
            <span className="font-semibold">{b.markPaid}</span>
          </button>
        )}
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <div className="flex gap-2">
          {editing && <Btn onClick={() => onDelete(initial.id)} className="px-4 py-3 bg-red-50 text-red-600">{b.del}</Btn>}
          <Btn onClick={onClose} className="flex-1 py-3 bg-white text-gray-600">{b.cancel}</Btn>
          <Btn onClick={save} className="flex-[2] py-3 bg-brand text-white">{b.save}</Btn>
        </div>
      </div>
    </div>
  );
}

function Budget({ t, lang }) {
  const b = BT[lang];
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [sheet, setSheet] = useState(null);
  const gen = useRef(0);
  const load = useCallback(async (m) => {
    const my = ++gen.current;
    try { const r = await api(`/api/budget/month?m=${m}`); if (my === gen.current) { setRows(r); setErr(""); } }
    catch (e) { if (my === gen.current) { setErr(e.message); setRows([]); } }
  }, []);
  useEffect(() => { setRows(null); setNote(""); load(month); }, [month, load]);
  const run = async (fn) => { try { await fn(); } catch (e) { setErr(e.message); load(month); } };

  const save = (e) => {
    setSheet(null);
    if (e.id) {
      setRows((p) => p.map((x) => (x.id === e.id ? { ...x, ...e } : x)));
      run(() => api(`/api/budget/entries/${e.id}`, "PATCH", { title: e.title, category: e.category, amount: e.amount, paid: e.paid }));
    } else {
      const tmp = -Date.now();
      setRows((p) => [...p, { ...e, id: tmp, month }]);
      run(async () => { const real = await api("/api/budget/entries", "POST", { ...e, month }); setRows((p) => p.map((x) => (x.id === tmp ? real : x))); });
    }
  };
  const remove = (id) => { setSheet(null); setRows((p) => p.filter((x) => x.id !== id)); if (id > 0) run(() => api(`/api/budget/entries/${id}`, "DELETE")); };
  const togglePaid = (e) => { if (e.id < 0) return; setRows((p) => p.map((x) => (x.id === e.id ? { ...x, paid: !e.paid } : x))); run(() => api(`/api/budget/entries/${e.id}`, "PATCH", { paid: !e.paid })); };
  const copy = async () => {
    try { const r = await api("/api/budget/copy", "POST", { from: shiftMonth(month, -1), to: month }); setNote(r.added ? `${b.added}: ${r.added}` : b.nothingToCopy); load(month); }
    catch (e) { setErr(e.message); }
  };

  const data = useMemo(() => {
    const list = rows || [];
    const inc = list.filter((e) => e.type === "income"), exp = list.filter((e) => e.type === "expense");
    const sum = (a) => a.reduce((n, e) => n + e.amount, 0);
    const income = sum(inc), expense = sum(exp), paid = sum(exp.filter((e) => e.paid));
    const byCat = {};
    exp.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const slices = Object.entries(byCat).sort((a, c) => c[1] - a[1]).map(([name, value], i) => ({ name, value, color: PIE_COLORS[Math.min(i, PIE_COLORS.length - 1)] }));
    return { inc, exp, income, expense, paid, balance: income - expense, slices };
  }, [rows]);

  const Entry = ({ e }) => (
    <div className={`flex items-center gap-2 rounded-2xl bg-white p-2.5 shadow-sm ${e.id < 0 ? "opacity-60" : ""}`}>
      {e.type === "expense" ? (
        <button onClick={() => togglePaid(e)} aria-label="paid" className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm ${e.paid ? "bg-brand text-white" : "border-2 border-green-300 text-transparent"}`}>✓</button>
      ) : <span className="w-7 shrink-0" />}
      <button onClick={() => e.id > 0 && setSheet(e)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
        <span className="text-2xl">{BCAT_ICON[e.category] ?? "📌"}</span>
        <span className="min-w-0">
          <span className="block font-semibold truncate">{e.title === e.category ? bcat(e.category, lang) : e.title}</span>
          <span className="block text-xs text-gray-400 truncate">{bcat(e.category, lang)}{e.type === "expense" && !e.paid ? ` · ${b.pending}` : ""}</span>
        </span>
      </button>
      <span className={`font-bold ${e.type === "income" ? "text-green-700" : "text-gray-800"}`}>{e.type === "income" ? "+" : ""}{inr(e.amount)}</span>
    </div>
  );

  const savedPct = data.income > 0 ? Math.round((data.balance / data.income) * 100) : null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl bg-white p-2 shadow-sm">
        <Btn onClick={() => setMonth(shiftMonth(month, -1))} className="w-11 h-11 text-2xl text-brand" aria-label="previous month">‹</Btn>
        <div className="text-center"><p className="font-bold">{monthName(month, lang)}</p>{month === thisMonth() && <p className="text-xs text-green-700">{b.thisMonth}</p>}</div>
        <Btn onClick={() => setMonth(shiftMonth(month, 1))} className="w-11 h-11 text-2xl text-brand" aria-label="next month">›</Btn>
      </div>
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
      {rows === null ? <p className="text-center text-gray-400 py-6">…</p> : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-green-100 p-3"><p className="text-xs text-green-800">{b.income}</p><p className="font-extrabold text-green-900 text-sm sm:text-base">{inr(data.income)}</p></div>
            <div className="rounded-2xl bg-amber-100 p-3"><p className="text-xs text-amber-800">{b.expenses}</p><p className="font-extrabold text-amber-900 text-sm sm:text-base">{inr(data.expense)}</p></div>
            <div className={`rounded-2xl p-3 ${data.balance >= 0 ? "bg-white" : "bg-red-100"}`}><p className="text-xs text-gray-500">{b.balance}</p><p className={`font-extrabold text-sm sm:text-base ${data.balance >= 0 ? "text-green-800" : "text-red-700"}`}>{inr(data.balance)}</p></div>
          </div>
          {data.income > 0 && (
            <p className={`text-center text-sm ${data.balance < 0 ? "text-red-600 font-semibold" : "text-gray-500"}`}>
              {data.balance < 0 ? `⚠️ ${b.overspent}` : `${savedPct}% ${b.saved}`}
            </p>
          )}
          {data.expense > 0 && <p className="text-center text-xs text-gray-500">{b.paid}: {inr(data.paid)} · {b.pending}: {inr(data.expense - data.paid)}</p>}

          <section className="rounded-3xl bg-white p-4 shadow-sm">
            <h2 className="font-bold mb-2">{b.where}</h2>
            {!data.slices.length ? <p className="text-gray-400 text-sm py-4 text-center">{b.noExpenses}</p> : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Pie slices={data.slices} total={data.expense} center={[b.expenses, inr(data.expense)]} />
                <ul className="flex-1 w-full space-y-1.5">
                  {data.slices.map((sl) => {
                    const pct = (sl.value / data.expense) * 100;
                    return (
                      <li key={sl.name} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: sl.color }} />
                        <span className="flex-1 truncate">{BCAT_ICON[sl.name]} {bcat(sl.name, lang)}</span>
                        <span className="text-gray-500">{inr(sl.value)}</span>
                        <span className="w-10 text-right font-bold">{pct < 1 ? "<1" : Math.round(pct)}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between"><h2 className="font-bold">💰 {b.income}</h2>
              <Btn onClick={() => setSheet({ type: "income" })} className="px-3 py-1.5 bg-brand text-white text-sm">＋ {b.addIncome}</Btn></div>
            {!data.inc.length && <p className="rounded-2xl bg-white p-4 text-center text-sm text-gray-400">{b.noIncome}</p>}
            {data.inc.map((e) => <Entry key={e.id} e={e} />)}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between"><h2 className="font-bold">🧾 {b.expenses}</h2>
              <Btn onClick={() => setSheet({ type: "expense" })} className="px-3 py-1.5 bg-brand text-white text-sm">＋ {b.addExpense}</Btn></div>
            {!data.exp.length && <p className="rounded-2xl bg-white p-4 text-center text-sm text-gray-400">{b.noExpenses}</p>}
            {data.exp.map((e) => <Entry key={e.id} e={e} />)}
          </section>

          {note && <p className="rounded-xl bg-green-100 p-2.5 text-center text-sm text-green-800">{note}</p>}
          <Btn onClick={copy} className="w-full py-3 border-2 border-dashed border-green-300 text-brand">🔁 {b.copyPrev} ({monthName(shiftMonth(month, -1), lang)})</Btn>
        </>
      )}
      {sheet && <BudgetSheet key={sheet.id || sheet.type} b={b} lang={lang} initial={sheet} onSave={save} onDelete={remove} onClose={() => setSheet(null)} />}
    </div>
  );
}


// ---------- calendar ----------
const EVENT_CATS = ["Birthday", "Anniversary", "Bill due", "EMI due", "Credit card", "Doctor", "Meeting", "School", "Festival", "Reminder", "Other"];
const ECAT_ICON = { Birthday: "🎂", Anniversary: "💑", "Bill due": "🧾", "EMI due": "💳", "Credit card": "💳", Doctor: "🩺", Meeting: "👥", School: "🎓", Festival: "🪔", Reminder: "⏰", Other: "📌" };
const ECAT_TA = { Birthday: "பிறந்தநாள்", Anniversary: "திருமண நாள்", "Bill due": "பில் கட்டணம்", "EMI due": "EMI தேதி", "Credit card": "கிரெடிட் கார்டு", Doctor: "மருத்துவர்", Meeting: "சந்திப்பு", School: "பள்ளி", Festival: "பண்டிகை", Reminder: "நினைவூட்டல்", Other: "மற்றவை" };
const CT = {
  en: { title: "Calendar", addEvent: "Add event", newEvent: "New event", editEvent: "Edit event", eventTitle: "What is it?", date: "Date", time: "Time", allDay: "All day", repeat: "Repeat", none: "Does not repeat", yearly: "Every year", monthly: "Every month", note: "Note (optional)", category: "Type", today: "Today", tomorrow: "Tomorrow", now: "Now", soon: "Later today", upcoming: "Coming up", nothingToday: "Nothing planned today", nothingSoon: "No events in the next 7 days", noEvents: "No events on this day", onThisDay: "On this day", viewAll: "Open calendar", save: "Save", cancel: "Cancel", del: "Delete", pickDate: "Choose a date", gotoToday: "Today", repeatsYearly: "every year", repeatsMonthly: "every month", wd: ["S", "M", "T", "W", "T", "F", "S"] },
  ta: { title: "நாட்காட்டி", addEvent: "நிகழ்வு சேர்", newEvent: "புதிய நிகழ்வு", editEvent: "நிகழ்வைத் திருத்து", eventTitle: "என்ன நிகழ்வு?", date: "தேதி", time: "நேரம்", allDay: "நாள் முழுவதும்", repeat: "மீண்டும் வருமா", none: "மீண்டும் வராது", yearly: "ஒவ்வொரு ஆண்டும்", monthly: "ஒவ்வொரு மாதமும்", note: "குறிப்பு (விருப்பம்)", category: "வகை", today: "இன்று", tomorrow: "நாளை", now: "இப்போது", soon: "இன்று பின்னர்", upcoming: "வரவிருப்பவை", nothingToday: "இன்று எதுவும் இல்லை", nothingSoon: "அடுத்த 7 நாட்களில் நிகழ்வுகள் இல்லை", noEvents: "இந்த நாளில் நிகழ்வுகள் இல்லை", onThisDay: "இந்த நாளில்", viewAll: "நாட்காட்டியைத் திற", save: "சேமி", cancel: "ரத்து", del: "நீக்கு", pickDate: "தேதியைத் தேர்ந்தெடுக்கவும்", gotoToday: "இன்று", repeatsYearly: "ஒவ்வொரு ஆண்டும்", repeatsMonthly: "ஒவ்வொரு மாதமும்", wd: ["ஞா", "தி", "செ", "பு", "வி", "வெ", "ச"] },
};
const ecat = (c, lang) => (lang === "ta" && ECAT_TA[c]) || c;
const longDate = (d, lang) => { const { y, m, d: dd } = parseYmd(d); return new Date(y, m - 1, dd).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" }); };
const monthTitle = (y, m, lang) => new Date(y, m - 1, 1).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { month: "long", year: "numeric" });
const dayLabel = (d, today, c, lang) => (d === today ? c.today : d === addDays(today, 1) ? c.tomorrow : longDate(d, lang));

// Re-renders every 30 seconds so "Now" and "Later today" stay correct while the app is open.
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 30_000);
    const vis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, []);
  return now;
}

function EventSheet({ c, lang, initial, onSave, onDelete, onClose }) {
  const editing = !!initial.id;
  const [title, setTitle] = useState(initial.title || "");
  const [category, setCategory] = useState(initial.category || "Reminder");
  const [date, setDate] = useState(initial.date || localToday());
  const [allDay, setAllDay] = useState(editing ? !initial.time : false);
  const [time, setTime] = useState(initial.time || "09:00");
  const [repeat, setRepeat] = useState(initial.repeat || "none");
  const [note, setNote] = useState(initial.note || "");
  const [err, setErr] = useState("");
  const chip = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${on ? "bg-brand text-white" : "bg-white text-gray-600 border border-green-100"}`;
  const input = "w-full rounded-2xl bg-white border border-green-200 px-4 py-3 text-lg outline-none focus:ring-2 ring-brand";
  const save = () => {
    if (!date) return setErr(c.pickDate);
    onSave({ ...(editing && { id: initial.id }), title: title.trim() || ecat(category, lang), category, date, time: allDay ? "" : time, repeat, note: note.trim() });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-xl mx-auto bg-green-50 rounded-t-3xl p-4 pb-8 max-h-[92vh] overflow-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg">{editing ? c.editEvent : c.newEvent}</h3>
        <div>
          <p className="text-sm text-gray-500 mb-1.5">{c.category}</p>
          <div className="flex flex-wrap gap-2">{EVENT_CATS.map((k) => <button key={k} onClick={() => setCategory(k)} className={chip(category === k)}>{ECAT_ICON[k]} {ecat(k, lang)}</button>)}</div>
        </div>
        <input className={input} placeholder={c.eventTitle} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className="text-sm text-gray-500">{c.date}</span><input type="date" className={input} value={date} onChange={(e) => { setDate(e.target.value); setErr(""); }} /></label>
          <label className="block"><span className="text-sm text-gray-500">{c.time}</span><input type="time" disabled={allDay} className={`${input} disabled:opacity-40`} value={time} onChange={(e) => setTime(e.target.value)} /></label>
        </div>
        <button onClick={() => setAllDay(!allDay)} className="w-full flex items-center gap-3 rounded-2xl bg-white p-3 text-left">
          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-sm ${allDay ? "bg-brand" : "border-2 border-green-300"}`}>{allDay && "✓"}</span><span className="font-semibold">{c.allDay}</span>
        </button>
        <div>
          <p className="text-sm text-gray-500 mb-1.5">{c.repeat}</p>
          <div className="flex gap-2 flex-wrap">{[["none", c.none], ["yearly", c.yearly], ["monthly", c.monthly]].map(([k, l]) => <button key={k} onClick={() => setRepeat(k)} className={chip(repeat === k)}>{l}</button>)}</div>
        </div>
        <textarea className={`${input} text-base`} rows={2} placeholder={c.note} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <div className="flex gap-2">
          {editing && <Btn onClick={() => onDelete(initial.id)} className="px-4 py-3 bg-red-50 text-red-600">{c.del}</Btn>}
          <Btn onClick={onClose} className="flex-1 py-3 bg-white text-gray-600">{c.cancel}</Btn>
          <Btn onClick={save} className="flex-[2] py-3 bg-brand text-white">{c.save}</Btn>
        </div>
      </div>
    </div>
  );
}

function EventRow({ o, c, lang, today, nowM, onOpen }) {
  const st = statusOf(o, today, nowM);
  const ring = st === "now" ? "ring-2 ring-brand bg-green-50" : st === "past" ? "opacity-50" : "";
  return (
    <button onClick={() => onOpen(o)} className={`w-full flex items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm active:scale-[.99] ${ring}`}>
      <span className="text-2xl">{ECAT_ICON[o.category] ?? "📌"}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold truncate">{o.title}</span>
        <span className="block text-xs text-gray-500 truncate">
          {o.time ? fmtTime(o.time) : c.allDay}{o.repeat === "yearly" ? ` · ${c.repeatsYearly}` : o.repeat === "monthly" ? ` · ${c.repeatsMonthly}` : ""}{o.note ? ` · ${o.note}` : ""}
        </span>
      </span>
      {st === "now" && <span className="rounded-full bg-brand text-white text-xs font-bold px-2.5 py-1 animate-pulse">{c.now}</span>}
    </button>
  );
}

function useEvents(enabled) {
  const [events, setEvents] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => api("/api/calendar/events").then((r) => { setEvents(r); setErr(""); }).catch((e) => { setErr(e.message); setEvents((p) => p ?? []); }), []);
  useEffect(() => { if (enabled) load(); }, [enabled, load]);
  const mutate = async (fn) => { try { await fn(); } catch (e) { setErr(e.message); load(); } };
  const save = (e) => {
    const body = { title: e.title, category: e.category, date: e.date, time: e.time, repeat: e.repeat, note: e.note };
    if (e.id) {
      setEvents((p) => p.map((x) => (x.id === e.id ? { ...x, ...body, time: body.time || null } : x)));
      return mutate(() => api(`/api/calendar/events/${e.id}`, "PATCH", body));
    }
    const tmp = -Date.now();
    setEvents((p) => [...p, { ...body, time: body.time || null, id: tmp }]);
    return mutate(async () => { const real = await api("/api/calendar/events", "POST", body); setEvents((p) => p.map((x) => (x.id === tmp ? real : x))); });
  };
  const remove = (id) => { setEvents((p) => p.filter((x) => x.id !== id)); if (id > 0) return mutate(() => api(`/api/calendar/events/${id}`, "DELETE")); };
  return { events, err, save, remove };
}

function Calendar({ lang, cal }) {
  const c = CT[lang], now = useClock(), today = localToday(now), nowM = nowMin(now);
  const { events, err, save, remove } = cal;
  const t0 = parseYmd(today);
  const [ym, setYm] = useState({ y: t0.y, m: t0.m });
  const [sel, setSel] = useState(today);
  const [sheet, setSheet] = useState(null);
  const first = ymd(ym.y, ym.m, 1), last = ymd(ym.y, ym.m, daysIn(ym.y, ym.m));
  const occ = useMemo(() => occurrences(events || [], first, last), [events, first, last]);
  const byDay = useMemo(() => { const m = {}; occ.forEach((o) => (m[o.date] ||= []).push(o)); return m; }, [occ]);
  const lead = weekday(first);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysIn(ym.y, ym.m) }, (_, i) => ymd(ym.y, ym.m, i + 1))];
  const go = (n) => { const d = new Date(ym.y, ym.m - 1 + n, 1); setYm({ y: d.getFullYear(), m: d.getMonth() + 1 }); };
  const openDay = (d) => { setSel(d); };
  const dayEvents = byDay[sel] || [];
  const onOpen = (o) => { const ev = (events || []).find((e) => e.id === o.id); if (ev && ev.id > 0) setSheet(ev); }; // still-saving events have a temporary id
  const saveSheet = (e) => { setSheet(null); save(e); };
  const delSheet = (id) => { setSheet(null); remove(id); };
  return (
    <div className="space-y-3">
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
      <div className="rounded-3xl bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <Btn onClick={() => go(-1)} className="w-10 h-10 text-2xl text-brand" aria-label="previous month">‹</Btn>
          <button onClick={() => { setYm({ y: t0.y, m: t0.m }); setSel(today); }} className="font-bold">{monthTitle(ym.y, ym.m, lang)}</button>
          <Btn onClick={() => go(1)} className="w-10 h-10 text-2xl text-brand" aria-label="next month">›</Btn>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">{c.wd.map((w, i) => <span key={i}>{w}</span>)}</div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const n = (byDay[d] || []).length, isToday = d === today, isSel = d === sel;
            return (
              <button key={d} onClick={() => openDay(d)} className={`relative mx-auto w-10 h-11 rounded-xl flex flex-col items-center justify-center text-sm ${isSel ? "bg-brand text-white font-bold" : isToday ? "ring-2 ring-brand font-bold text-brand" : "text-gray-700"}`}>
                {parseYmd(d).d}
                {n > 0 && <span className={`absolute bottom-1 flex gap-0.5`}>{Array.from({ length: Math.min(n, 3) }).map((_, k) => <i key={k} className={`w-1 h-1 rounded-full ${isSel ? "bg-white" : "bg-brand"}`} />)}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{dayLabel(sel, today, c, lang)}</h2>
        <Btn onClick={() => setSheet({ date: sel })} className="px-3 py-1.5 bg-brand text-white text-sm">＋ {c.addEvent}</Btn>
      </div>
      {events === null && <p className="text-center text-gray-400 py-4">…</p>}
      {events && !dayEvents.length && <p className="rounded-2xl bg-white p-4 text-center text-sm text-gray-400">{c.noEvents}</p>}
      <div className="space-y-2">{dayEvents.map((o) => <EventRow key={o.key} o={o} c={c} lang={lang} today={today} nowM={nowM} onOpen={onOpen} />)}</div>
      {sheet && <EventSheet key={sheet.id || "new"} c={c} lang={lang} initial={sheet} onSave={saveSheet} onDelete={delSheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

// Home dashboard: what is on today, what is happening now, and the next 7 days.
function CalendarCard({ lang, cal, onOpen }) {
  const c = CT[lang], now = useClock(), today = localToday(now), nowM = nowMin(now);
  const { events } = cal;
  const occ = useMemo(() => occurrences(events || [], today, addDays(today, 7)), [events, today]);
  if (events === null) return null;
  const todays = occ.filter((o) => o.date === today && statusOf(o, today, nowM) !== "past");
  const upcoming = occ.filter((o) => o.date > today);
  const label = (o) => { const st = statusOf(o, today, nowM); return st === "now" ? c.now : st === "soon" ? fmtTime(o.time) : o.time ? fmtTime(o.time) : c.allDay; };
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm space-y-2">
      <button onClick={onOpen} className="w-full flex items-center justify-between text-left">
        <h2 className="font-bold">📅 {c.today} · {longDate(today, lang)}</h2><span className="text-gray-300 text-xl">›</span>
      </button>
      {!todays.length && <p className="text-sm text-gray-400">{c.nothingToday}</p>}
      {todays.map((o) => {
        const st = statusOf(o, today, nowM);
        return (
          <button key={o.key} onClick={onOpen} className={`w-full flex items-center gap-3 rounded-2xl p-2.5 text-left ${st === "now" ? "bg-green-50 ring-2 ring-brand" : "bg-green-50/50"}`}>
            <span className="text-2xl">{ECAT_ICON[o.category] ?? "📌"}</span>
            <span className="flex-1 min-w-0 font-semibold truncate">{o.title}</span>
            <span className={`text-xs font-bold rounded-full px-2.5 py-1 ${st === "now" ? "bg-brand text-white animate-pulse" : "bg-white text-gray-600"}`}>{label(o)}</span>
          </button>
        );
      })}
      <div className="pt-1">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{c.upcoming}</p>
        {!upcoming.length && <p className="text-sm text-gray-400">{c.nothingSoon}</p>}
        {upcoming.slice(0, 5).map((o) => (
          <div key={o.key} className="flex items-center gap-2 py-1 text-sm">
            <span>{ECAT_ICON[o.category] ?? "📌"}</span><span className="flex-1 truncate">{o.title}</span>
            <span className="text-gray-400 text-xs shrink-0">{dayLabel(o.date, today, c, lang)}{o.time ? ` · ${fmtTime(o.time)}` : ""}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- app ----------
function Main({ user, brand, onLogout, onUser, lang, onLang }) {
  const [tab, setTab] = useState("home");
  const [sub, setSub] = useState("list"); // inside Groceries: list | stock
  const [list, setList] = useState({ items: [] });
  const [inv, setInv] = useState([]);
  const [mic, setMic] = useState(false);
  const [moreView, setMoreView] = useState(null);
  const hasCal = user.modules.includes("calendar");
  const hasProv = user.modules.includes("provisions");
  const cal = useEvents(hasCal);
  const [catalog, setCatalog] = useState([]);
  const [err, setErr] = useState("");
  const t = T[lang];
  LANG = lang;

  const seq = useRef(0), pending = useRef(0), queue = useRef(Promise.resolve());
  const refresh = useCallback(async () => {
    const my = ++seq.current;
    try {
      const st = await api("/api/provisions/state");
      if (my !== seq.current || pending.current > 0) return; // a newer tap is still in flight
      setList(st.list); setInv(st.inventory); setErr("");
    } catch (e) { if (my === seq.current) setErr(e.message); }
  }, []);
  // Taps update the screen at once; the server calls run one after another in the background.
  const mutate = useCallback((fn) => {
    pending.current++;
    queue.current = queue.current.then(fn).catch((e) => setErr(e.message)).finally(() => { if (--pending.current === 0) refresh(); });
  }, [refresh]);
  useEffect(() => { if (!hasProv) return; api("/api/provisions/catalog").then((c) => { CAT = Object.fromEntries(c.map((x) => [x.name, x])); setCatalog(c); }).catch(() => {}); refresh(); }, [refresh, hasProv]);
  useEffect(() => { document.title = brand.name || document.title; }, [brand]);

  const addRows = async (rows) => { setList(await api("/api/provisions/list/items", "POST", { items: rows })); setMic(false); setTab("groceries"); setSub("list"); refresh(); };
  const quick = (c) => {
    const row = { name: c.name, qty: Math.max(c.min || 0, step(c.unit)), unit: c.unit };
    setList((p) => ({ ...p, items: [...p.items, { ...row, id: -Date.now(), bought: false, position: 9999 }] }));
    mutate(() => api("/api/provisions/list/items", "POST", { items: [row] }));
  };
  const seed = async () => { if (confirm(t.seed + "?")) { await api("/api/provisions/inventory/seed", "POST", {}); refresh(); } };
  const unpick = (name) => {
    setList((p) => ({ ...p, items: p.items.filter((i) => i.bought || i.name !== name) }));
    mutate(() => api("/api/provisions/list/remove", "POST", { name }));
  };
  const closePicker = () => { setMic(false); setTab("groceries"); setSub("list"); };
  const restock = (i) => {
    const row = { name: i.name, itemId: i.id, qty: Math.max(+(i.minQty * 2 - i.stock).toFixed(2), step(i.unit)), unit: i.unit };
    setList((p) => ({ ...p, items: [...p.items, { name: row.name, qty: row.qty, unit: row.unit, id: -Date.now(), bought: false, position: 9999 }] }));
    mutate(() => api("/api/provisions/list/items", "POST", { items: [row] }));
  };

  const lowCount = inv.filter((i) => i.minQty > 0 && i.stock <= i.minQty).length;
  const go = (id, subTab, view) => { setTab(id); if (subTab) setSub(subTab); if (id === "more") setMoreView(view || null); window.scrollTo(0, 0); };
  const has = (m) => user.modules.includes(m);
  const tabs = [["home", "🏠", t.home]];
  if (has("provisions")) tabs.push(["groceries", "🛒", t.groceries]);
  if (has("budget")) tabs.push(["budget", "💰", BT[lang].title]);
  if (has("calendar")) tabs.push(["calendar", "📅", CT[lang].title]);
  tabs.push(["more", "☰", t.more]);
  const tabIds = tabs.map(([id]) => id).join(",");
  useEffect(() => { if (!tabIds.split(",").includes(tab)) setTab("home"); }, [tabIds, tab]); // a section that was switched off must not stay open

  const Tab = ({ id, icon, label }) => (
    <button onClick={() => go(id, null, null)} className={`flex-1 flex flex-col items-center py-2 ${tab === id ? "text-brand font-bold" : "text-gray-400"}`}>
      <span className="text-2xl leading-none">{icon}</span><span className="text-xs mt-0.5">{label}</span>
    </button>
  );

  return (
    <div className={`min-h-screen max-w-xl mx-auto ${tab === "groceries" ? "pb-44" : "pb-28"} text-gray-800`}>
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-green-50/90 backdrop-blur" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <div><h1 className="text-xl font-extrabold text-brand leading-tight">{brand.name}</h1></div>
        <LangToggle lang={lang} onLang={onLang} />
      </header>
      <main className="px-4 pt-2">
        {user.isDemo && <p className="mb-3 rounded-xl bg-amber-50 p-2.5 text-center text-xs text-amber-800">{t.demoNote}</p>}
        {err && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
        {tab === "home" && <Home t={t} lang={lang} user={user} inv={inv} list={list} cal={hasCal ? cal : null} onGo={go} />}
        {tab === "groceries" && (
          <>
            <div className="grid grid-cols-4 gap-1 rounded-2xl bg-green-100 p-1 mb-3">
              {[["list", t.list], ["stock", t.stock], ["low", `🔴 ${t.lowTab} (${lowCount})`], ["history", t.history]].map(([k, l]) => (
                <button key={k} onClick={() => setSub(k)} className={`rounded-xl py-2 px-1 text-sm font-semibold truncate ${sub === k ? "bg-white shadow text-brand" : "text-gray-500"}`}>{l}</button>
              ))}
            </div>
            {sub === "list"
              ? <ListTab t={t} brand={brand} list={list} setList={setList} mutate={mutate} refresh={refresh} />
              : sub === "low"
                ? <RunningLow t={t} inv={inv} list={list} onRestock={restock} onUnrestock={unpick} />
                : sub === "history"
                  ? <History t={t} brand={brand} onCopied={refresh} />
                  : <Stock t={t} items={inv} setItems={setInv} mutate={mutate} refresh={refresh} onSeed={seed} />}
          </>
        )}
        {tab === "budget" && <Budget t={t} lang={lang} />}
        {tab === "calendar" && <Calendar lang={lang} cal={cal} />}
        {tab === "more" && <More t={t} lang={lang} user={user} onUser={onUser} view={moreView} setView={setMoreView} onLogout={onLogout} />}
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-green-100" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-xl mx-auto flex items-end">
          {tabs.map(([id, icon, label]) => <Tab key={id} id={id} icon={icon} label={label} />)}
        </div>
      </nav>
      {tab === "groceries" && sub !== "history" && (
        <div className="fixed inset-x-0 bottom-20 z-30 pointer-events-none" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
          <div className="max-w-xl mx-auto px-4 flex justify-end">
            <Btn onClick={() => setMic(true)} className="pointer-events-auto w-14 h-14 rounded-full bg-brand text-white text-3xl font-light shadow-xl" aria-label="add">＋</Btn>
          </div>
        </div>
      )}
      {mic && <AddSheet t={t} lang={lang} catalog={catalog} inv={inv} listNames={new Set(list.items.filter((i) => !i.bought).map((i) => i.name))} onQuick={quick} onRemove={unpick} onParsed={addRows} onDone={closePicker} />}
    </div>
  );
}

export default function App() {
  const [brand, setBrand] = useState({ name: "", tagline: "" });
  const [user, setUser] = useState(undefined);
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  const onLang = (l) => { setLang(l); localStorage.setItem("lang", l); document.documentElement.lang = l; };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    api("/api/brand").then(setBrand).catch(() => {});
    api("/api/auth/me").then((r) => setUser(r.user)).catch(() => setUser(null));
    const h = () => setUser(null);
    window.addEventListener("unauth", h);
    return () => window.removeEventListener("unauth", h);
  }, []);
  useEffect(() => { if (brand.name) document.title = brand.name; }, [brand]);
  const logout = async () => { await api("/api/auth/logout", "POST").catch(() => {}); setUser(null); };
  if (user === undefined) return <div className="min-h-screen flex items-center justify-center text-gray-400">…</div>;
  if (!user) return <Landing brand={brand} lang={lang} onLang={onLang} onUser={setUser} />;
  return <Main key={user.id} user={user} brand={brand} onLogout={logout} onUser={setUser} lang={lang} onLang={onLang} />;
}
