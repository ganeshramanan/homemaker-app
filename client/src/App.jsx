import { cloneElement, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getMode, saveMode, isDark } from "./theme.js";
import { Home as HomeIcon, ShoppingCart, Wallet, CalendarDays, BookOpen, Menu as MenuIcon, LogOut, IndianRupee, AlertTriangle, Bell, ChevronRight, ChevronLeft, Sun, LayoutGrid, Plus, ShieldCheck, Wheat, Milk, Apple, Carrot, Beef, Cookie, Package, SprayCan, Baby, Nut, Droplets, Flame, Leaf, Soup, CupSoda, Shirt, Briefcase, Landmark, Gift, Lightbulb, Smartphone, CreditCard, GraduationCap, Stethoscope, Fuel, Bus, PiggyBank, Clapperboard, PartyPopper, Receipt, Cake, Heart, Users, Pin, Smile, Meh, Frown, Moon, Angry, Pill, Wrench, Boxes, Tag, Egg, Coffee, Fish, Utensils, Sparkles, Send, RefreshCw, Trash2, GripVertical, Check, Minus, ShoppingBasket, ArrowUpRight, ArrowDownLeft, CalendarPlus, PenLine, X as XIcon } from "lucide-react";
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
  en: { home: "Home", list: "List", stock: "Stock", low: "Running low", lowEmpty: "All stocked up", addList: "Add to list", onList: "On list ✓",
    thisList: "This month's list", toBuy: "To buy", bought: "Bought", send: "Send on WhatsApp", newMonth: "Start next month's list", empty: "Your list is empty. Tap + and type your items.",
    tap: "Tap and speak", listening: "Listening… speak now", typeHere: "Type your items, e.g. 2 kg rice, 1 litre oil, half kilo sugar", read: "Read list", addAll: "Add to list",
    cancel: "Cancel", more: "More", goodMorning: "Good morning", goodAfternoon: "Good afternoon", goodEvening: "Good evening", heroBalance: "Balance this month", heroToBuy: "Items to buy", quickAdd: "Quick add", qaItem: "Grocery item", qaExpense: "Expense", qaIncome: "Income", qaEvent: "Event", qaDiary: "Diary note", appearance: "Appearance", themeLight: "Light", themeDark: "Dark", themeAuto: "Phone", pickSections: "Choose your sections", pickHint: "The admin approves your account and can change these later.", pickAtLeast: "Choose at least one section", removeAsk: "Remove {n} from your stock?", mySections: "My sections", sectionsHint: "Choose what you want to see. Your admin decides which sections are available to you.", noneAllowed: "Your admin has not turned on any sections for you yet.", noneShown: "No sections are switched on.", chooseSections: "Choose sections", sectionsFor: "Sections", sections: "Your sections", attention: "Needs attention", seeAll: "See all", nToBuy: "{n} to buy", nLow: "{n} running low", allDone: "All bought", listEmpty: "List is empty", nToday: "{n} today", nothingPlanned: "Nothing today", leftN: "{n} left", overN: "{n} over", nothingYet: "No entries yet", tapOpen: "Tap to open", groceries: "Groceries", item: "item", tapAgain: "Tap a ticked item again to remove it.", toBuyTab: "To buy", dragHint: "Clear the filters to rearrange the list.", okTab: "In stock", showing: "Showing", signIn: "Sign in", signUp: "Sign up", createAcct: "Create free account", createBtn: "Create account", tryDemo: "Try demo", loading: "Loading…", heroBadge: "For every home maker", heroA: "Your whole home, ", heroB: "in one place", heroText: "Plan the groceries, track the monthly budget and never miss a birthday or a bill. Simple, in Tamil and English.", already: "Already registered?", featTitle: "Everything your home needs, in one place", howTitle: "How it works", soon: "Coming soon: fitness tracker.", ctaTitle: "Ready to organise your home?", yourName: "Your name", phone: "Phone number", password: "Password", approveNote: "New accounts are approved by the admin before you can sign in.", thanks: "Thank you!", waitApproval: "Your account is waiting for approval. You can sign in once it is approved.", backSignin: "Back to sign in", adminUsers: "Admin: users", users: "users", waiting: "waiting for approval", approve: "Approve", enable: "Enable", disable: "Disable", reject: "Reject", del: "Delete", confirmDel: "Delete {n} and all their data?", demoAccts: "demo accounts (auto-deleted after a day)", st_pending: "pending", st_active: "active", st_disabled: "disabled", history: "History", historyEmpty: "Finished lists are saved here, month by month.", copyToList: "Copy to current list", copied: "Added to your list", nextTitle: "Start next month's list", nextNote: "This month's list is saved in History. Untick what you don't need.", startList: "Start new list", lowTag: "low stock", signOut: "Sign out", demoNote: "Demo account. Data is deleted after one day.", back: "Back", search: "Search items…", allTab: "All", lowTab: "Low", mineTab: "My items", done: "Done", readList: "Add typed text as a list", seed: "Load 100 sample items", noMatch: "No items found", min: "Min", addItem: "Add item", name: "Name", unit: "Unit", save: "Save", noSpeech: "Voice not supported in this browser. Please type.",
    check: "Please check these items", items: "items", boughtOf: "bought", stockEmpty: "No stock yet. Mark list items as bought and they appear here.", left: "left" },
  ta: { home: "முகப்பு", list: "பட்டியல்", stock: "இருப்பு", low: "குறைவான பொருட்கள்", lowEmpty: "எல்லாம் இருக்கு", addList: "பட்டியலில் சேர்", onList: "சேர்க்கப்பட்டது ✓",
    thisList: "இந்த மாத பட்டியல்", toBuy: "வாங்க வேண்டியவை", bought: "வாங்கியவை", send: "வாட்ஸ்அப்பில் அனுப்பு", newMonth: "அடுத்த மாத பட்டியல்", empty: "பட்டியல் காலி. + தட்டி பொருட்களை டைப் செய்யுங்கள்.",
    tap: "தட்டிப் பேசுங்கள்", listening: "கேட்கிறேன்… பேசுங்கள்", typeHere: "பொருட்களை டைப் செய்யுங்கள், எ.கா. 2 கிலோ அரிசி, 1 லிட்டர் எண்ணெய்", read: "பட்டியலாக்கு", addAll: "பட்டியலில் சேர்",
    cancel: "ரத்து", more: "மேலும்", goodMorning: "காலை வணக்கம்", goodAfternoon: "மதிய வணக்கம்", goodEvening: "மாலை வணக்கம்", heroBalance: "இந்த மாத மீதம்", heroToBuy: "வாங்க வேண்டியவை", quickAdd: "விரைவு சேர்", qaItem: "மளிகைப் பொருள்", qaExpense: "செலவு", qaIncome: "வருமானம்", qaEvent: "நிகழ்வு", qaDiary: "டைரி குறிப்பு", appearance: "தோற்றம்", themeLight: "வெளிர்", themeDark: "இருண்ட", themeAuto: "போன்", pickSections: "உங்கள் பிரிவுகளைத் தேர்ந்தெடுக்கவும்", pickHint: "நிர்வாகி உங்கள் கணக்கை அனுமதிப்பார்; இவற்றை பின்னர் மாற்றவும் முடியும்.", pickAtLeast: "குறைந்தது ஒரு பிரிவைத் தேர்ந்தெடுக்கவும்", removeAsk: "{n} பொருளை இருப்பிலிருந்து நீக்கவா?", mySections: "என் பிரிவுகள்", sectionsHint: "நீங்கள் பார்க்க விரும்புவதைத் தேர்ந்தெடுங்கள். எந்த பிரிவுகள் உங்களுக்குக் கிடைக்கும் என்பதை நிர்வாகி தீர்மானிப்பார்.", noneAllowed: "உங்களுக்கு எந்த பிரிவையும் நிர்வாகி இன்னும் இயக்கவில்லை.", noneShown: "எந்த பிரிவும் இயக்கப்படவில்லை.", chooseSections: "பிரிவுகளைத் தேர்ந்தெடு", sectionsFor: "பிரிவுகள்", sections: "உங்கள் பிரிவுகள்", attention: "கவனிக்க வேண்டியவை", seeAll: "அனைத்தையும் காண்", nToBuy: "{n} வாங்க வேண்டும்", nLow: "{n} குறைவாக உள்ளது", allDone: "எல்லாம் வாங்கியாச்சு", listEmpty: "பட்டியல் காலி", nToday: "இன்று {n}", nothingPlanned: "இன்று எதுவும் இல்லை", leftN: "{n} மீதம்", overN: "{n} அதிகம்", nothingYet: "இன்னும் பதிவுகள் இல்லை", tapOpen: "திறக்க தட்டவும்", groceries: "மளிகை", item: "பொருள்", tapAgain: "தேர்ந்தெடுத்த பொருளை மீண்டும் தட்டினால் நீக்கப்படும்.", toBuyTab: "வாங்க வேண்டியவை", dragHint: "வரிசையை மாற்ற வடிகட்டிகளை நீக்கவும்.", okTab: "போதுமான இருப்பு", showing: "காட்டுவது", signIn: "உள்நுழை", signUp: "பதிவு செய்", createAcct: "இலவச கணக்கை உருவாக்கு", createBtn: "கணக்கை உருவாக்கு", tryDemo: "டெமோ பார்க்க", loading: "ஏற்றுகிறது…", heroBadge: "ஒவ்வொரு இல்லத்தரசிக்கும்", heroA: "உங்கள் இல்லம் முழுவதும், ", heroB: "ஒரே இடத்தில்", heroText: "மளிகையைத் திட்டமிடுங்கள், மாத பட்ஜெட்டைக் கண்காணியுங்கள், பிறந்தநாள் அல்லது பில் தேதியை மறக்காதீர்கள். எளிமையாக, தமிழிலும் ஆங்கிலத்திலும்.", already: "ஏற்கனவே பதிவு செய்துள்ளீர்களா?", featTitle: "உங்கள் இல்லத்துக்குத் தேவையான அனைத்தும், ஒரே இடத்தில்", howTitle: "எப்படி வேலை செய்கிறது", soon: "விரைவில்: உடற்பயிற்சி கண்காணிப்பு.", ctaTitle: "உங்கள் இல்லத்தை ஒழுங்குபடுத்தத் தயாரா?", yourName: "உங்கள் பெயர்", phone: "தொலைபேசி எண்", password: "கடவுச்சொல்", approveNote: "புதிய கணக்குகளை நிர்வாகி அனுமதித்த பிறகே உள்நுழையலாம்.", thanks: "நன்றி!", waitApproval: "உங்கள் கணக்கு அனுமதிக்காகக் காத்திருக்கிறது. அனுமதி கிடைத்ததும் உள்நுழையலாம்.", backSignin: "உள்நுழைவுக்குத் திரும்பு", adminUsers: "நிர்வாகி: பயனர்கள்", users: "பயனர்கள்", waiting: "அனுமதிக்காகக் காத்திருக்கின்றனர்", approve: "அனுமதி", enable: "இயக்கு", disable: "முடக்கு", reject: "நிராகரி", del: "நீக்கு", confirmDel: "{n} மற்றும் அவரது எல்லா தரவையும் நீக்கவா?", demoAccts: "டெமோ கணக்குகள் (ஒரு நாளில் தானாக நீக்கப்படும்)", st_pending: "காத்திருப்பு", st_active: "செயலில்", st_disabled: "முடக்கம்", history: "வரலாறு", historyEmpty: "முடிந்த பட்டியல்கள் மாதவாரியாக இங்கே சேமிக்கப்படும்.", copyToList: "இப்போதைய பட்டியலில் சேர்", copied: "பட்டியலில் சேர்க்கப்பட்டது", nextTitle: "அடுத்த மாத பட்டியல்", nextNote: "இந்த மாத பட்டியல் வரலாற்றில் சேமிக்கப்படும். தேவையில்லாததை நீக்குங்கள்.", startList: "புதிய பட்டியல்", lowTag: "குறைவு", signOut: "வெளியேறு", demoNote: "டெமோ கணக்கு. ஒரு நாளில் தரவு அழியும்.", back: "பின்", search: "பொருளைத் தேடுங்கள்…", allTab: "அனைத்தும்", lowTab: "குறைவு", mineTab: "என் பொருட்கள்", done: "முடிந்தது", readList: "டைப் செய்ததை பட்டியலாக்கு", seed: "100 மாதிரி பொருட்களை ஏற்று", noMatch: "பொருள் இல்லை", min: "குறைந்தபட்சம்", addItem: "பொருள் சேர்", name: "பெயர்", unit: "அலகு", save: "சேமி", noSpeech: "இந்த உலாவியில் குரல் இல்லை. டைப் செய்யுங்கள்.",
    check: "இவற்றை சரிபாருங்கள்", items: "பொருட்கள்", boughtOf: "வாங்கியது", stockEmpty: "இருப்பு இல்லை. வாங்கியதாக குறித்தால் இங்கே வரும்.", left: "உள்ளது" },
};
let CAT = {}, LANG = "en";
// Line icons replace emoji across the app. Items show their category's icon.
const CAT_ICON = { Grains: Wheat, Pulses: Nut, Grocery: ShoppingCart, Dairy: Milk, Vegetables: Carrot, Fruits: Apple, Spices: Flame, "Oil & Ghee": Droplets, Household: SprayCan, "Personal Care": Sparkles, "Dry Fruits": Nut, "Snacks & Drinks": CupSoda, "Meat & Fish": Beef, "Baby Care": Baby, Other: Package };
const catIcon = (c) => CAT_ICON[c] || Package;
// A small tinted square holding a line icon (the MotoBill pattern).
function IconBox({ Icon, size = 18, className = "bg-gray-100 text-gray-600" }) {
  return <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${className}`}><Icon size={size} strokeWidth={2} /></span>;
}
function SkeletonRows({ n = 4 }) {
  return (
    <div className="rounded-xl bg-surface border border-line divide-y divide-line overflow-hidden" aria-busy="true" aria-label="loading">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3.5 py-3">
          <span className="skeleton w-9 h-9 rounded-lg shrink-0" />
          <span className="flex-1 space-y-2"><span className="skeleton block h-3 w-1/3" /><span className="skeleton block h-3.5 w-2/3" /></span>
          <span className="skeleton w-14 h-4" />
        </div>
      ))}
    </div>
  );
}
const itemCat = (name, category) => category || CAT[name]?.category || "Other";
const dn = (n) => (LANG === "ta" && CAT[n]?.ta) || n;
const UNITS = ["kg", "g", "L", "ml", "pcs", "pack", "dozen"];
const step = (u) => (u === "kg" || u === "L" ? 0.5 : u === "g" || u === "ml" ? 100 : 1);
const fmt = (n) => (Math.round(n * 100) / 100).toString();

// ---------- small pieces ----------
const Btn = ({ className = "", ...p }) => <button {...p} className={`active:scale-95 transition rounded-lg font-semibold ${className}`} />;
const Stepper = ({ value, unit, onChange }) => (
  <div className="shrink-0 flex items-center gap-0.5">
    <Btn onClick={() => onChange(Math.max(step(unit), +(value - step(unit)).toFixed(3)))} className="shrink-0 w-7 h-7 rounded-md border border-gray-300 bg-surface text-gray-700 flex items-center justify-center" aria-label="decrease"><Minus size={16} /></Btn>
    <span className="w-[3.75rem] flex items-baseline justify-center gap-0.5">
      <input key={value} type="number" inputMode="decimal" defaultValue={fmt(value)} onBlur={(e) => { const v = +e.target.value; if (v > 0 && v !== value) onChange(v); }}
        className="w-9 min-w-0 text-right text-sm font-bold bg-transparent outline-none" />
      <span className="text-[11px] text-gray-500 w-6 text-left truncate">{unit}</span>
    </span>
    <Btn onClick={() => onChange(+(value + step(unit)).toFixed(3))} className="shrink-0 w-7 h-7 rounded-md border border-gray-300 bg-surface text-gray-700 flex items-center justify-center" aria-label="increase"><Plus size={16} /></Btn>
  </div>
);

function Row({ item, t, canDrag, onQty, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: !canDrag });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 0 }}
      className={`flex items-center gap-1.5 bg-surface px-2 py-2.5 ${isDragging ? "shadow-xl ring-2 ring-brand rounded-lg" : ""}`}>
      {canDrag ? <span {...attributes} {...listeners} className="shrink-0 text-gray-300 touch-none select-none cursor-grab flex items-center" aria-label="drag"><GripVertical size={18} /></span> : <span className="shrink-0 w-1" />}
      <Btn onClick={() => onToggle(item)} className="shrink-0 w-7 h-7 rounded-md border-2 border-gray-300 text-transparent hover:text-gray-400 flex items-center justify-center" aria-label="bought"><Check size={16} strokeWidth={3} /></Btn>
      <span className="flex-1 min-w-0 font-medium leading-tight text-gray-900 line-clamp-2 break-words" title={dn(item.name)}>{dn(item.name)}</span>
      <Stepper value={item.qty} unit={item.unit} onChange={(q) => onQty(item, q)} />
      <Btn onClick={() => onDelete(item)} className="shrink-0 w-7 h-8 text-gray-400 hover:text-red-600 flex items-center justify-center" aria-label="delete"><Trash2 size={17} /></Btn>
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
  const all = [...catalog, ...inv.filter((i) => !known.has(i.name)).map((i) => ({ name: i.name, ta: "", category: i.category, unit: i.unit, min: i.minQty, emoji: "", aliases: [] }))];
  const mine = new Set(inv.map((i) => i.name));
  const low = new Set(inv.filter((i) => i.minQty > 0 && i.stock <= i.minQty).map((i) => i.name));
  const cats = [...new Set(all.map((c) => c.category))];
  const s = q.trim().toLowerCase();
  const shown = all.filter((c) => (!s || c.name.toLowerCase().includes(s) || c.ta.includes(q.trim()) || c.aliases.some((a) => a.includes(s)))
    && (tab === "low" ? low.has(c.name) : tab === "mine" ? mine.has(c.name) : true) && (!cat || c.category === cat));
  const looksList = /[\d,]/.test(q) || s.split(/\s+/).length > 2;
  const upd = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch, unknown: false } : r)));
  const chip = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${on ? "bg-brand text-white border border-brand" : "bg-surface text-gray-700 border border-gray-300"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onDone}>
      <div className="w-full max-w-xl mx-auto bg-sheet rounded-t-3xl h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {!rows ? (
          <>
            <div className="p-4 pb-2 space-y-2">
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-full rounded-lg bg-surface border border-gray-300 px-4 py-3 text-lg outline-none focus:ring-2 ring-brand" />
              <div className="flex gap-2">
                {[["all", t.allTab], ["low", `${t.lowTab} (${low.size})`], ["mine", t.mineTab]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={chip(tab === k)}>{l}</button>)}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                <button onClick={() => setCat("")} className={chip(!cat)}>{t.allTab}</button>
                {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}
              </div>
              {listNames.size > 0 && <p className="text-xs text-gray-400">{t.tapAgain}</p>}
              {looksList && <Btn onClick={async () => setRows(await api("/api/provisions/parse", "POST", { text: q }))} className="w-full py-2.5 bg-surface border-2 border-brand text-brand text-sm">✍️ {t.readList}</Btn>}
            </div>
            <div className="flex-1 overflow-auto px-4 pb-2">
              {!shown.length && <p className="text-center text-gray-400 py-8">{t.noMatch}</p>}
              <div className="grid grid-cols-3 gap-2">
                {shown.map((c) => {
                  const on = listNames.has(c.name);
                  return (
                    <button key={c.name} onClick={() => (on ? onRemove(c.name) : onQuick(c))} className={`relative flex flex-col items-center gap-1 rounded-lg p-3 text-center transition active:scale-95 ${on ? "bg-gray-100 ring-2 ring-brand" : "bg-surface border border-line"}`}>
                      <IconBox Icon={catIcon(c.category)} />
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
                <div key={i} className={`flex items-center gap-2 rounded-lg bg-surface p-2 ${r.unknown ? "ring-2 ring-amber-300" : ""}`}>
                  <IconBox Icon={catIcon(itemCat(r.name, r.category))} />
                  <input value={r.name} onChange={(e) => upd(i, { name: e.target.value })} className="flex-1 min-w-0 font-semibold outline-none" />
                  <input type="number" inputMode="decimal" value={r.qty} onChange={(e) => upd(i, { qty: +e.target.value })} className="w-16 text-center rounded-xl bg-gray-50 py-1" />
                  <select value={r.unit} onChange={(e) => upd(i, { unit: e.target.value })} className="rounded-xl bg-gray-50 py-1">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
                  <Btn onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 px-1 flex items-center" aria-label="remove row"><Trash2 size={16} /></Btn>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Btn onClick={() => setRows(null)} className="flex-1 py-3 bg-surface border border-gray-300 text-gray-700 flex items-center justify-center" aria-label="back"><ChevronLeft size={18} /></Btn>
              <Btn onClick={() => onParsed(rows.map(({ unknown, category, ...r }) => r))} disabled={!rows.length} className="flex-[3] py-3 bg-brand text-white disabled:opacity-40">{t.addAll} ({rows.length})</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- tabs ----------
function Tile({ icon, title, lines, tone = "bg-surface", className = "", onClick, children }) {
  return (
    <button onClick={onClick} className={`${tone} rounded-xl p-4 text-left active:scale-[.97] transition flex flex-col min-h-[7.5rem] ${className}`}>
      <span className="text-3xl leading-none">{icon}</span>
      <span className="mt-2 font-bold text-gray-900">{title}</span>
      {lines.map((l, i) => <span key={i} className={`text-sm leading-snug ${i === 0 ? "text-gray-700 font-semibold" : "text-gray-500"}`}>{l}</span>)}
      {children}
    </button>
  );
}
const fill = (str, n) => str.replace("{n}", n);

function Home({ t, lang, user, inv, list, cal, onGo, onQuick }) {
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

  // Each tile: small uppercase label, one big figure, one line of detail (the MotoBill dashboard pattern).
  const budgetOver = bs && bs.balance < 0;
  const tiles = [];
  if (has("provisions")) tiles.push({
    key: "g", Icon: ShoppingCart, tint: "bg-emerald-50 text-emerald-700", label: t.groceries,
    big: !total ? "—" : toBuy === 0 ? "0" : String(toBuy),
    sub: !total ? t.listEmpty : toBuy === 0 ? t.allDone : `${t.toBuy}${low.length ? ` · ${fill(t.nLow, low.length)}` : ""}`,
    bar: total ? pct : null, go: () => onGo("groceries", toBuy === 0 && low.length ? "low" : "list"),
  });
  if (has("budget")) tiles.push({
    key: "b", Icon: Wallet, tint: budgetOver ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700", label: b.balance,
    big: bs === null ? "…" : bs === false || (!bs.income && !bs.expense) ? "—" : inr(bs.balance),
    sub: bs && (bs.income || bs.expense) ? (budgetOver ? t.overN.replace("{n}", inr(-bs.balance)) : `${b.expenses}: ${inr(bs.expense)}`) : t.nothingYet,
    danger: budgetOver, go: () => onGo("budget"),
  });
  if (has("calendar")) tiles.push({
    key: "c", Icon: CalendarDays, tint: "bg-sky-50 text-sky-700", label: c.title,
    big: !cal?.events ? "…" : String(todays.length),
    sub: !cal?.events ? "" : todays.length ? todays[0].title : next ? `${next.title} · ${dayLabel(next.date, today, c, lang)}` : t.nothingPlanned,
    badge: nowCount > 0 ? c.now : null, go: () => onGo("calendar"),
  });
  if (has("diary")) tiles.push({ key: "d", Icon: BookOpen, tint: "bg-violet-50 text-violet-700", label: DT[lang].title, big: "", sub: DT[lang].tile, go: () => onGo("diary") });

  // Hero: a greeting and the one number that matters most today.
  const hr = new Date(now).getHours();
  const greet = hr < 12 ? t.goodMorning : hr < 17 ? t.goodAfternoon : t.goodEvening;
  const hero = has("budget") && bs && (bs.income || bs.expense)
    ? { label: t.heroBalance, big: inr(bs.balance), sub: `${b.income} ${inr(bs.income)} · ${b.expenses} ${inr(bs.expense)}`, danger: bs.balance < 0 }
    : has("provisions") && total
      ? { label: t.heroToBuy, big: String(toBuy), sub: toBuy === 0 ? t.allDone : low.length ? fill(t.nLow, low.length) : t.toBuy }
      : null;
  const firstName = (user.name || "").split(" ")[0];
  const shortcuts = [];
  if (has("provisions")) shortcuts.push({ k: "item", Icon: ShoppingBasket, label: t.qaItem });
  if (has("budget")) shortcuts.push({ k: "expense", Icon: ArrowUpRight, label: t.qaExpense }, { k: "income", Icon: ArrowDownLeft, label: t.qaIncome });
  if (has("calendar")) shortcuts.push({ k: "event", Icon: CalendarPlus, label: t.qaEvent });
  if (has("diary")) shortcuts.push({ k: "diary", Icon: PenLine, label: t.qaDiary });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-brand text-white p-5 shadow-[0_8px_24px_-12px_rgba(22,101,52,0.7)]">
        <p className="text-sm text-white/80">{greet}{firstName ? `, ${firstName}` : ""}</p>
        {hero ? (
          <>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/70">{hero.label}</p>
            <p className={`text-3xl font-bold tracking-tight ${hero.danger ? "text-red-200" : ""}`}>{hero.big}</p>
            <p className="mt-0.5 text-xs text-white/80">{hero.sub}</p>
          </>
        ) : <p className="mt-2 text-lg font-semibold">{longDate(today, lang)}</p>}
      </div>

      {shortcuts.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t.quickAdd}</p>
          <div className="grid grid-cols-5 gap-2">
            {shortcuts.map((a) => (
              <button key={a.k} onClick={() => onQuick(a.k)} className="flex flex-col items-center gap-1.5 active:scale-95 transition">
                <span className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center"><a.Icon size={22} /></span>
                <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!tiles.length ? (
        <div className="rounded-xl border border-line bg-surface p-5 text-center space-y-3">
          <p className="text-gray-500">{t.noneShown}</p>
          <Btn onClick={() => onGo("more", null, "sections")} className="px-5 py-2.5 bg-brand text-white rounded-lg">{t.chooseSections}</Btn>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map(({ key, Icon, tint, label, big, sub, bar, badge, danger, go }) => (
            <button key={key} onClick={go} className="text-left rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-gray-300 active:bg-gray-50 transition flex flex-col min-h-[7.5rem]">
              <span className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 leading-tight">{label}</span>
                <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${tint}`}><Icon size={18} strokeWidth={2} /></span>
              </span>
              {big !== "" && <span className={`mt-2 text-2xl font-bold tracking-tight ${danger ? "text-red-600" : "text-gray-900"}`}>{big}</span>}
              <span className="mt-1 text-xs text-gray-500 line-clamp-2">{sub}</span>
              {badge && <span className="mt-1.5 self-start rounded-md bg-brand text-white text-[11px] font-semibold px-2 py-0.5">{badge}</span>}
              {bar != null && <span className="mt-auto pt-3 block"><span className="block h-1.5 rounded-full bg-gray-100"><span className="block h-full rounded-full bg-brand transition-all" style={{ width: bar + "%" }} /></span></span>}
            </button>
          ))}
        </div>
      )}

      {cal && <CalendarCard lang={lang} cal={cal} onOpen={() => onGo("calendar")} />}
    </div>
  );
}

function RunningLow({ t, inv, list, onRestock, onUnrestock }) {
  const names = new Set(list.items.filter((i) => !i.bought).map((i) => i.name));
  const low = inv.filter((i) => i.minQty > 0 && i.stock <= i.minQty).sort((a, b) => a.stock / a.minQty - b.stock / b.minQty).map((i) => ({ ...i, onList: names.has(i.name) }));
  return (
    <div className="space-y-2">
      {!low.length && <p className="rounded-lg bg-surface p-4 text-gray-500">{t.lowEmpty}</p>}
      {low.map((i) => (
        <div key={i.id} className="flex items-center gap-3 bg-surface rounded-lg p-3 border border-line">
          <IconBox Icon={catIcon(itemCat(i.name, i.category))} />
          <div className="flex-1">
            <p className="font-semibold">{dn(i.name)}</p>
            <p className={`text-sm ${i.stock === 0 ? "text-red-600" : "text-amber-600"}`}>{fmt(i.stock)} {i.unit} {t.left} · {t.min} {fmt(i.minQty)}</p>
          </div>
          <Btn onClick={() => (i.onList ? onUnrestock(i.name) : onRestock(i))} className={`px-3 py-2 text-sm ${i.onList ? "bg-gray-100 text-green-700" : "bg-brand text-white"}`}>{i.onList ? t.onList : t.addList}</Btn>
        </div>
      ))}
    </div>
  );
}

function ListTab({ t, brand, list, setList, mutate, refresh, onAdd }) {
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
  const chip = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${on ? "bg-brand text-white border border-brand" : "bg-surface text-gray-700 border border-gray-300"}`;
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
      {!list.items.length && <p className="rounded-lg bg-surface p-6 text-center text-gray-500">{t.empty}</p>}
      <div className="sticky top-14 z-10 -mx-4 px-4 py-2 space-y-2 bg-page/95 backdrop-blur">
        <div className="flex gap-2">
          {!!list.items.length && (
            <div className="relative flex-1 min-w-0">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-full rounded-lg bg-surface border border-gray-300 pl-3 pr-9 py-2.5 outline-none focus:ring-2 ring-brand" />
              {q && <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-label="clear"><XIcon size={16} /></button>}
            </div>
          )}
          <Btn onClick={onAdd} className={`shrink-0 h-[2.75rem] px-3.5 bg-brand text-white flex items-center gap-1.5 text-sm ${list.items.length ? "" : "flex-1 justify-center"}`}><Plus size={18} />{t.addItem}</Btn>
        </div>
        {!!list.items.length && (
          <div className="flex gap-2 items-center">
            <div className="flex gap-2 overflow-x-auto flex-1 min-w-0">
              {[["all", `${t.allTab} (${list.items.length})`], ["todo", `${t.toBuyTab} (${allTodo.length})`], ["bought", `${t.bought} (${allDone.length})`]].map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={`${chip(status === k)} whitespace-nowrap`}>{l}</button>)}
            </div>
            {cats.length > 1 && (
              <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="category" className="shrink-0 max-w-[8.5rem] rounded-lg border border-gray-300 bg-surface py-1.5 pl-2 pr-1 text-sm text-gray-700">
                <option value="">{t.allTab}</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        )}
      </div>
      {!!list.items.length && !todo.length && !done.length && <p className="rounded-lg bg-surface p-6 text-center text-gray-500">{t.noMatch}</p>}
      {filtered && !!todo.length && <p className="text-xs text-gray-400">{t.dragHint}</p>}
      {!!todo.length && (
        <>
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t.toBuy} <span className="text-gray-400">({todo.length})</span></h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={todo.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="rounded-xl bg-surface border border-line divide-y divide-line overflow-hidden">{todo.map((i) => <Row key={i.id} item={i} t={t} canDrag={!filtered} onQty={qty} onDelete={del} onToggle={toggle} />)}</div>
            </SortableContext>
          </DndContext>
          </>
      )}
      {!!allTodo.length && <Btn onClick={share} className="w-full py-3.5 bg-[#25D366] text-white text-base flex items-center justify-center gap-2"><Send size={18} />{t.send}</Btn>}
      {!!done.length && (
        <>
          <h2 className="px-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t.bought} <span className="text-gray-400">({done.length})</span></h2>
          <div className="rounded-xl bg-surface border border-line divide-y divide-line overflow-hidden">
            {done.map((i) => (
              <div key={i.id} className="flex items-center gap-2.5 px-2.5 py-2.5">
                <Btn onClick={() => toggle(i)} className="shrink-0 w-7 h-7 rounded-md bg-brand text-white flex items-center justify-center" aria-label="undo bought"><Check size={16} strokeWidth={3} /></Btn>
                <span className="flex-1 min-w-0 truncate line-through text-gray-400">{dn(i.name)}</span>
                <span className="shrink-0 text-sm text-gray-400">{fmt(i.qty)} {i.unit}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {!!list.items.length && <Btn onClick={() => setNextOpen(true)} className="w-full py-3 border border-dashed border-gray-300 text-brand flex items-center justify-center gap-2"><RefreshCw size={17} />{t.newMonth}</Btn>}
    </div>
  );
}

function Stock({ t, items, setItems, mutate, refresh, onSeed, onAdd }) {
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
  const chip = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${on ? "bg-brand text-white border border-brand" : "bg-surface text-gray-700 border border-gray-300"}`;
  return (
    <div className="space-y-4">
      {!items.length && <p className="rounded-lg bg-surface p-6 text-center text-gray-500">{t.stockEmpty}</p>}
      {!!items.length && (
        <div className="sticky top-14 z-10 -mx-4 px-4 py-2 space-y-2 bg-page/95 backdrop-blur">
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} className="w-full rounded-lg bg-surface border border-gray-300 pl-3 pr-9 py-2.5 outline-none focus:ring-2 ring-brand" />
              {q && <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-label="clear"><XIcon size={16} /></button>}
            </div>
            <Btn onClick={onAdd} className="shrink-0 h-[2.75rem] px-3.5 bg-brand text-white flex items-center gap-1.5 text-sm"><Plus size={18} />{t.addItem}</Btn>
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
            {[["all", `${t.allTab} (${items.length})`], ["low", `${t.lowTab} (${lowCount})`], ["ok", `${t.okTab} (${items.length - lowCount})`]].map(([k, l]) => <button key={k} onClick={() => setStatus(k)} className={chip(status === k)}>{l}</button>)}
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
            <button onClick={() => setCat("")} className={chip(!cat)}>{t.allTab}</button>
            {cats.map((c) => <button key={c} onClick={() => setCat(cat === c ? "" : c)} className={chip(cat === c)}>{c}</button>)}
          </div>
        </div>
      )}
      {!!items.length && !shown.length && <p className="rounded-lg bg-surface p-6 text-center text-gray-500">{t.noMatch}</p>}
      {Object.entries(groups).map(([cat, list]) => (
        <section key={cat}>
          <h2 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{cat} <span className="text-gray-400">({list.length})</span></h2>
          <div className="rounded-xl bg-surface border border-line divide-y divide-line overflow-hidden">
            {list.map((i) => {
              const low = i.minQty > 0 && i.stock <= i.minQty;
              return (
                <div key={i.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-tight text-gray-900 line-clamp-2 break-words">{dn(i.name)}</p>
                    <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <label className="flex items-center gap-1">{t.min}
                        <input type="number" inputMode="decimal" defaultValue={i.minQty} onBlur={(e) => +e.target.value !== i.minQty && patch(i, { minQty: +e.target.value })} className="w-11 rounded border border-gray-300 bg-surface text-center text-gray-700" />
                      </label>
                      {low && <span className="rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-600">{t.lowTab}</span>}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-0.5">
                    <Btn onClick={() => patch(i, { delta: -step(i.unit) })} className="shrink-0 w-7 h-7 rounded-md border border-gray-300 bg-surface text-gray-700 flex items-center justify-center" aria-label="decrease"><Minus size={16} /></Btn>
                    <span className={`w-[3.75rem] text-center text-sm font-bold ${low ? "text-red-600" : "text-gray-900"}`}>{fmt(i.stock)} <span className="text-[11px] font-normal text-gray-500">{i.unit}</span></span>
                    <Btn onClick={() => patch(i, { delta: step(i.unit) })} className="shrink-0 w-7 h-7 rounded-md border border-gray-300 bg-surface text-gray-700 flex items-center justify-center" aria-label="increase"><Plus size={16} /></Btn>
                  </div>
                  <Btn onClick={() => removeItem(i)} className="shrink-0 w-7 h-8 text-gray-400 hover:text-red-600 flex items-center justify-center" aria-label="remove"><Trash2 size={17} /></Btn>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <Btn onClick={onSeed} className="w-full py-3 bg-surface border border-gray-300 text-gray-600 text-sm">{t.seed}</Btn>
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
      <div className="w-full max-w-xl mx-auto bg-sheet rounded-t-3xl max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 pb-2"><h3 className="font-bold text-lg">{t.nextTitle}</h3><p className="text-sm text-gray-500">{t.nextNote}</p></div>
        <div className="flex-1 overflow-auto px-4 space-y-1.5">
          {rows === null && <SkeletonRows n={4} />}
          {(rows || []).map((r) => {
            const on = !off.has(r.name);
            return (
              <button key={r.name} onClick={() => { const n = new Set(off); on ? n.add(r.name) : n.delete(r.name); setOff(n); }}
                className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left ${on ? "bg-surface border border-line" : "bg-gray-100/60 opacity-60"}`}>
                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-sm ${on ? "bg-brand" : "border-2 border-gray-300"}`}>{on && "✓"}</span>
                <IconBox Icon={catIcon(itemCat(r.name))} />
                <span className="flex-1 font-semibold">{dn(r.name)}{r.reason === "low" && <span className="ml-2 text-xs font-bold text-red-500">{t.lowTag}</span>}</span>
                <span className="text-sm text-gray-500">{fmt(r.qty)} {r.unit}</span>
              </button>
            );
          })}
        </div>
        <div className="p-4 flex gap-2">
          <Btn onClick={onClose} className="flex-1 py-3 bg-surface text-gray-600">{t.cancel}</Btn>
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
        <Btn onClick={() => { setOpen(null); setNote(""); }} className="text-brand px-1 flex items-center gap-1"><ChevronLeft size={18} />{t.back}</Btn>
        <h2 className="font-bold text-lg">{monthOf(open.closedAt)}</h2>
        <div className="space-y-1.5">
          {open.items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 rounded-lg bg-surface p-2.5 border border-line">
              <IconBox Icon={catIcon(itemCat(i.name))} /><span className={`flex-1 font-semibold ${i.bought ? "text-gray-400 line-through" : ""}`}>{dn(i.name)}</span>
              <span className="text-sm text-gray-500">{fmt(i.qty)} {i.unit}</span>
            </div>
          ))}
        </div>
        {note && <p className="rounded-xl bg-gray-100 p-2.5 text-center text-sm text-gray-700">{note}</p>}
        <Btn onClick={async () => { await api(`/api/provisions/history/${open.id}/copy`, "POST"); setNote(t.copied); onCopied(); }} className="w-full py-3.5 bg-brand text-white">{t.copyToList}</Btn>
        <Btn onClick={share} className="w-full py-3 bg-[#25D366] text-white flex items-center justify-center gap-2"><Send size={18} />{t.send}</Btn>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rows === null && <SkeletonRows n={4} />}
      {rows?.length === 0 && <p className="rounded-lg bg-surface p-6 text-center text-gray-500">{t.historyEmpty}</p>}
      {rows?.map((h) => (
        <button key={h.id} onClick={() => view(h.id)} className="w-full flex items-center gap-3 rounded-lg bg-surface p-3.5 border border-line text-left active:scale-[.99]">
          <IconBox Icon={CalendarDays} />
          <span className="flex-1"><span className="block font-bold">{monthOf(h.closedAt)}</span><span className="text-sm text-gray-500">{h.count} {h.count === 1 ? t.item : t.items} · {h.bought} {t.boughtOf}</span></span>
          <ChevronRight size={18} className="text-gray-300" />
        </button>
      ))}
    </div>
  );
}

// ---------- admin ----------
const MODULE_LUCIDE = { provisions: ShoppingCart, budget: Wallet, calendar: CalendarDays, diary: BookOpen };
const ModIcon = ({ m, size = 16 }) => { const I = MODULE_LUCIDE[m] || Package; return <I size={size} />; };
// Sections that have a screen in the app.
const SHIPPED_MODULES = ["provisions", "budget", "calendar", "diary"];
const moduleLabel = (m, lang) => (m === "provisions" ? T[lang].groceries : m === "budget" ? BT[lang].title : m === "calendar" ? CT[lang].title : m === "diary" ? DT[lang].title : m);
const modList = (str) => (str || "").split(",").filter(Boolean);

function AdminView({ t, lang, data, err, onSet, onDel, onToggleMod }) {
  const pending = data.users.filter((u) => u.status === "pending").length;
  const badge = { pending: "bg-amber-100 text-amber-800", active: "bg-gray-100 text-gray-700", disabled: "bg-gray-200 text-gray-600" };
  return (
    <div className="space-y-2">
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
      <p className="text-sm text-gray-500">{data.users.length} {t.users} · {pending} {t.waiting}</p>
      {data.users.map((u) => (
        <div key={u.id} className={`rounded-lg bg-surface p-3 border border-line ${u.status === "pending" ? "ring-2 ring-amber-300" : ""}`}>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0"><p className="font-bold truncate">{u.name} {u.role === "admin" && <span className="ml-1 align-middle rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand">Admin</span>}</p><p className="text-sm text-gray-500">{u.phone} · {new Date(u.createdAt).toLocaleDateString("en-IN")}</p></div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge[u.status]}`}>{t["st_" + u.status]}</span>
          </div>
          {u.role !== "admin" && (
            <>
              <div className="mt-2.5">
                <p className="text-xs text-gray-400 mb-1">{t.sectionsFor}</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.modules.filter((m) => SHIPPED_MODULES.includes(m)).map((m) => {
                    const on = modList(u.modules).includes(m);
                    return <button key={m} onClick={() => onToggleMod(u, m)} aria-pressed={on} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${on ? "bg-brand text-white" : "bg-gray-100 text-gray-400 line-through"}`}><ModIcon m={m} size={14} /> {moduleLabel(m, lang)}</button>;
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
  if (!data) return err ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p> : <SkeletonRows n={3} />;
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
      {!user.allowed.filter((m) => SHIPPED_MODULES.includes(m)).length && <p className="rounded-lg bg-surface p-5 text-center text-gray-500">{t.noneAllowed}</p>}
      <div className="space-y-2">
        {user.allowed.filter((m) => SHIPPED_MODULES.includes(m)).map((m) => {
          const on = user.modules.includes(m);
          return (
            <button key={m} role="switch" aria-checked={on} onClick={() => toggle(m)} className="w-full flex items-center gap-3 rounded-lg bg-surface p-4 border border-line text-left active:scale-[.99]">
              <IconBox Icon={MODULE_LUCIDE[m] || Package} />
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

function More({ t, lang, user, onUser, view, setView, onLogout, extra = [], onOpen }) {
  if (view) return (
    <div className="space-y-3">
      <Btn onClick={() => setView(null)} className="text-brand px-1 flex items-center gap-1"><ChevronLeft size={18} />{t.back}</Btn>
      {view === "sections" ? <Sections t={t} lang={lang} user={user} onUser={onUser} /> : <Admin t={t} lang={lang} />}
    </div>
  );
  const Row2 = ({ Icon, label, onClick, danger }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 rounded-lg bg-surface p-3.5 border border-line text-left font-medium active:bg-gray-50 ${danger ? "text-red-600" : "text-gray-900"}`}>
      <IconBox Icon={Icon} className={danger ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"} /><span className="flex-1">{label}</span><ChevronRight size={18} className="text-gray-400" />
    </button>
  );
  return (
    <div className="space-y-2.5">
      <h1 className="text-2xl font-bold text-gray-900">{t.more}</h1>
      <div className="rounded-lg bg-surface p-4 border border-line"><p className="font-bold text-lg text-gray-900">{user.name}</p><p className="text-sm text-gray-500">{user.isDemo ? t.demoNote : user.phone}</p></div>
      {extra.length > 0 && <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t.sections}</p>}
      {extra.map(([id, Icon, label]) => <Row2 key={id} Icon={Icon} label={label} onClick={() => onOpen(id)} />)}
      <Row2 Icon={LayoutGrid} label={t.mySections} onClick={() => setView("sections")} />
      {user.role === "admin" && <Row2 Icon={ShieldCheck} label={t.adminUsers} onClick={() => setView("admin")} />}
      <Row2 Icon={LogOut} label={t.signOut} onClick={onLogout} danger />
    </div>
  );
}

// ---------- landing page + sign in / sign up / demo ----------
const FEATURES = {
  en: [
    ["ShoppingCart", "Groceries", "Make the monthly list from 275+ everyday items, send it to your shop on WhatsApp, and keep track of what is left at home."],
    ["Wallet", "Budget", "Add all your income and expenses, see where the money goes in a pie chart, and copy last month in one tap."],
    ["CalendarDays", "Calendar", "Save birthdays, bill dues and appointments. What is on today shows on your home screen and lights up when the time arrives."],
    ["LayoutGrid", "Only what you need", "Choose which sections you want to see. Your admin can switch sections on or off for each person."],
    ["Smartphone", "Tamil and English", "Switch language any time. Item names show in Tamil too."],
    ["BookOpen", "Daily diary", "Write about your day and read it back any time, by date, by month or with search. Private to your account."],
  ],
  ta: [
    ["ShoppingCart", "மளிகை", "275+ அன்றாடப் பொருட்களிலிருந்து மாத பட்டியலைத் தயாரித்து, வாட்ஸ்அப்பில் கடைக்கு அனுப்புங்கள். வீட்டில் என்ன மீதம் உள்ளது என்பதையும் கண்காணியுங்கள்."],
    ["Wallet", "பட்ஜெட்", "எல்லா வருமானம் மற்றும் செலவுகளையும் சேர்க்கவும். பணம் எங்கே போகிறது என்பதை வட்ட வரைபடத்தில் பார்க்கவும். கடந்த மாதத்தை ஒரே தட்டலில் நகலெடுக்கவும்."],
    ["CalendarDays", "நாட்காட்டி", "பிறந்தநாள், பில் தேதி, சந்திப்புகளை சேமிக்கவும். இன்றைய நிகழ்வுகள் முகப்பில் தெரியும்; நேரம் வந்ததும் ‘இப்போது’ என்று ஒளிரும்."],
    ["LayoutGrid", "உங்களுக்குத் தேவையானது மட்டும்", "எந்த பிரிவுகளைப் பார்க்க வேண்டும் என்பதை நீங்களே தேர்ந்தெடுக்கலாம். ஒவ்வொருவருக்கும் பிரிவுகளை நிர்வாகி இயக்கவோ முடக்கவோ முடியும்."],
    ["Smartphone", "தமிழ் மற்றும் ஆங்கிலம்", "எப்போது வேண்டுமானாலும் மொழியை மாற்றலாம். பொருட்களின் பெயர்கள் தமிழிலும் தெரியும்."],
    ["BookOpen", "தினசரி டைரி", "உங்கள் நாளைப் பற்றி எழுதுங்கள்; தேதி, மாதம் அல்லது தேடல் மூலம் எப்போது வேண்டுமானாலும் படியுங்கள். உங்கள் கணக்கிற்கு மட்டும்."],
  ],
};
const FEATURE_ICON = { ShoppingCart, Wallet, CalendarDays, LayoutGrid, Smartphone, BookOpen };
const STEPS = {
  en: [["1", "Create your account", "Sign up, or try the demo first"], ["2", "Pick your sections", "Groceries, Budget, Calendar, Diary"], ["3", "Run your home", "Everything on one dashboard"]],
  ta: [["1", "கணக்கை உருவாக்குங்கள்", "பதிவு செய்யுங்கள் அல்லது முதலில் டெமோ பாருங்கள்"], ["2", "பிரிவுகளைத் தேர்ந்தெடுங்கள்", "மளிகை, பட்ஜெட், நாட்காட்டி, டைரி"], ["3", "இல்லத்தை நிர்வகியுங்கள்", "எல்லாம் ஒரே முகப்பில்"]],
};
// The phone mock-up on the landing page: a dashboard tile for each section.
const MOCK_TILES = {
  en: [["ShoppingCart", "Groceries", "3", "bg-emerald-50 text-emerald-700"], ["Wallet", "Balance", "₹21,000", "bg-amber-50 text-amber-700"], ["CalendarDays", "Calendar", "2", "bg-sky-50 text-sky-700"]],
  ta: [["ShoppingCart", "மளிகை", "3", "bg-emerald-50 text-emerald-700"], ["Wallet", "மீதம்", "₹21,000", "bg-amber-50 text-amber-700"], ["CalendarDays", "நாட்காட்டி", "2", "bg-sky-50 text-sky-700"]],
};
const MOCK_EVENTS = {
  en: [["Amma's birthday", "All day"], ["Doctor visit", "6:30 PM"]],
  ta: [["அம்மா பிறந்தநாள்", "முழுநாள்"], ["மருத்துவர்", "6:30 PM"]],
};

function LangToggle({ lang, onLang, className = "" }) {
  return <Btn onClick={() => onLang(lang === "en" ? "ta" : "en")} className={`px-3 h-9 bg-surface border border-gray-300 text-sm ${className}`}>{lang === "en" ? "தமிழ்" : "English"}</Btn>;
}

// One tap switches light and dark. It is shown in every header, on every screen.
function ThemeToggle() {
  const [dark, setDark] = useState(() => isDark(getMode()));
  const flip = () => { const next = dark ? "light" : "dark"; saveMode(next); setDark(!dark); };
  return (
    <button onClick={flip} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}
      className="w-9 h-9 shrink-0 rounded-lg border border-gray-300 bg-surface text-gray-700 flex items-center justify-center active:scale-95 transition">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function HeaderTools({ lang, onLang }) {
  return <div className="flex items-center gap-2"><ThemeToggle /><LangToggle lang={lang} onLang={onLang} /></div>;
}

function AuthSheet({ t, lang, initial, onUser, onClose }) {
  const [mode, setMode] = useState(initial);
  const [f, setF] = useState({ name: "", phone: "", password: "" });
  const [picked, setPicked] = useState(SHIPPED_MODULES);
  const togglePick = (m) => setPicked((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]));
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async (fn) => { setErr(""); setBusy(true); try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  const submit = (e) => { e.preventDefault(); run(async () => {
    if (mode === "signup") {
      if (!picked.length) throw new Error(t.pickAtLeast);
      await api("/api/auth/signup", "POST", { ...f, modules: picked });
      setDone(true);
    }
    else onUser((await api("/api/auth/login", "POST", f)).user);
  }); };
  const input = "w-full rounded-lg bg-surface border border-gray-300 px-4 py-3.5 text-lg outline-none focus:ring-2 ring-brand";
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md bg-sheet rounded-t-3xl sm:rounded-xl p-5 pb-8 max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end"><button onClick={onClose} className="text-gray-400 p-1" aria-label="close"><XIcon size={20} /></button></div>
        {done ? (
          <div className="text-center space-y-3 pb-2">
            <div className="text-5xl">⏳</div><h2 className="font-bold text-xl">{t.thanks}</h2>
            <p className="text-gray-600">{t.waitApproval}</p>
            <Btn onClick={() => { setDone(false); setMode("login"); }} className="w-full py-3 bg-brand text-white">{t.backSignin}</Btn>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="flex rounded-lg bg-gray-100 p-1">
              {[["login", t.signIn], ["signup", t.signUp]].map(([k, l]) => <button type="button" key={k} onClick={() => { setMode(k); setErr(""); }} className={`flex-1 rounded-xl py-2 font-semibold ${mode === k ? "bg-surface shadow text-brand" : "text-gray-500"}`}>{l}</button>)}
            </div>
            {mode === "signup" && <input className={input} placeholder={t.yourName} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />}
            <input className={input} placeholder={t.phone} inputMode="numeric" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" />
            <input className={input} placeholder={t.password} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
            {mode === "signup" && (
              <div>
                <p className="text-sm font-semibold text-gray-700">{t.pickSections}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {SHIPPED_MODULES.map((m) => {
                    const on = picked.includes(m);
                    return (
                      <button type="button" key={m} role="checkbox" aria-checked={on} onClick={() => togglePick(m)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border ${on ? "bg-brand text-white border-brand" : "bg-surface text-gray-600 border-gray-300"}`}>
                        {on && <Check size={14} strokeWidth={3} />}<ModIcon m={m} size={14} />{moduleLabel(m, lang)}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-gray-500">{t.pickHint}</p>
              </div>
            )}
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
    <div className="min-h-screen bg-page text-gray-800">
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 px-4 py-3">
          <span className="flex items-center gap-2 min-w-0" translate="no"><span className="shrink-0 w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center"><HomeIcon size={18} /></span><span className="text-lg font-bold text-gray-900 truncate">{brand.name}</span></span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LangToggle lang={lang} onLang={onLang} />
            <Btn onClick={() => setSheet("login")} className="hidden sm:inline-flex items-center h-9 px-3 text-brand border border-gray-300 bg-surface text-sm">{t.signIn}</Btn>
            <Btn onClick={() => setSheet("signup")} className="inline-flex items-center h-9 px-3 bg-brand text-white text-sm">{t.signUp}</Btn>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 pt-8 pb-12 grid md:grid-cols-2 gap-8 items-center">
        <div className="text-center md:text-left">
          <span className="inline-block rounded-full bg-brand/10 text-brand text-xs font-semibold px-3 py-1 mb-4">{t.heroBadge}</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight text-gray-900">{t.heroA}<span className="text-brand">{t.heroB}</span></h1>
          <p className="mt-4 text-lg text-gray-600">{t.heroText}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Btn onClick={() => setSheet("signup")} className="px-6 py-3.5 bg-brand text-white text-base shadow-[0_8px_20px_-8px_rgba(22,101,52,0.8)]">{t.createAcct}</Btn>
            <Btn onClick={demo} disabled={busy} className="px-6 py-3.5 bg-surface border border-gray-300 text-gray-800 text-base disabled:opacity-50">{busy ? t.loading : t.tryDemo}</Btn>
          </div>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          <p className="mt-3 text-sm text-gray-500">{t.already} <button onClick={() => setSheet("login")} className="font-bold text-brand underline">{t.signIn}</button></p>
        </div>

        <div className="mx-auto w-full max-w-xs" aria-hidden="true">
          <div className="rounded-[2rem] bg-page p-3 shadow-2xl border border-line" translate="no">
            <div className="rounded-2xl bg-brand text-white p-4">
              <p className="text-xs text-white/80">{t.goodMorning}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-white/70">{t.heroBalance}</p>
              <p className="text-2xl font-bold tracking-tight">₹21,000</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {MOCK_TILES[lang].map(([ic, title, big, tint]) => { const I = FEATURE_ICON[ic]; return (
                <div key={title} className="rounded-xl border border-line bg-surface p-2.5 min-h-[5.5rem] flex flex-col">
                  <span className={`w-7 h-7 rounded-md flex items-center justify-center ${tint}`}><I size={15} /></span>
                  <span className="mt-auto text-[10px] font-semibold uppercase tracking-wider text-gray-500 leading-tight pt-2">{title}</span>
                  <span className="text-base font-bold text-gray-900 leading-tight">{big}</span>
                </div>
              ); })}
            </div>
            <div className="mt-3 rounded-xl border border-line bg-surface divide-y divide-line overflow-hidden">
              {MOCK_EVENTS[lang].map(([title, when], i) => (
                <div key={title} className="flex items-center gap-2 px-2.5 h-11">
                  <span className="shrink-0 w-7 h-7 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center"><Bell size={14} /></span>
                  <span className="flex-1 min-w-0 text-xs font-semibold text-gray-900 truncate">{title}</span>
                  <span className={`shrink-0 whitespace-nowrap text-[10px] font-semibold rounded-md px-1.5 py-0.5 ${i === 1 ? "bg-brand text-white" : "bg-gray-100 text-gray-600"}`}>{i === 1 ? CT[lang].now : when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center text-gray-900">{t.featTitle}</h2>
          <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES[lang].map(([i, h, d]) => (
              <div key={h} className="rounded-xl bg-gray-50 border border-line p-5">{(() => { const I = FEATURE_ICON[i] || BookOpen; return <span className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3"><I size={20} /></span>; })()}<h3 className="font-semibold text-base text-gray-900">{h}</h3><p className="text-sm text-gray-600 mt-1">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-center text-gray-900">{t.howTitle}</h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {STEPS[lang].map(([n, h, d]) => (
            <div key={n} className="rounded-xl bg-surface p-5 text-center border border-line"><div className="mx-auto w-10 h-10 rounded-full bg-brand text-white font-extrabold flex items-center justify-center mb-2">{n}</div><h3 className="font-bold">{h}</h3><p className="text-sm text-gray-500">{d}</p></div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-500">{t.soon}</p>
      </section>

      <section className="bg-brand text-white py-14 text-center px-4">
        <h2 className="text-2xl md:text-3xl font-extrabold">{t.ctaTitle}</h2>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Btn onClick={() => setSheet("signup")} className="px-6 py-3.5 bg-white text-brand text-base">{t.createAcct}</Btn>
          <Btn onClick={demo} disabled={busy} className="px-6 py-3.5 border border-white/70 text-white text-base disabled:opacity-50">{t.tryDemo}</Btn>
        </div>
      </section>
      <footer className="text-center text-xs text-gray-400 py-6">© {new Date().getFullYear()} {brand.name}</footer>

      {sheet && <AuthSheet t={t} lang={lang} initial={sheet} onUser={onUser} onClose={() => setSheet(null)} />}
    </div>
  );
}

// ---------- budget ----------
const INCOME_CATS = ["Salary", "Business", "Rent received", "Interest", "Gift", "Other"];
const EXPENSE_CATS = ["Rent", "Groceries", "Electricity", "Water", "Gas", "Mobile & Internet", "EMI / Loan", "School fees", "Medical", "Fuel", "Transport", "Insurance", "Savings", "Entertainment", "Festival", "Clothing", "Other"];
const BCAT_TA = { Salary: "சம்பளம்", Business: "தொழில்", "Rent received": "வாடகை வருமானம்", Interest: "வட்டி", Gift: "பரிசு", Other: "மற்றவை", Rent: "வாடகை", Groceries: "மளிகை", Electricity: "மின்சாரம்", Water: "தண்ணீர்", Gas: "கேஸ்", "Mobile & Internet": "மொபைல் & இணையம்", "EMI / Loan": "EMI / கடன்", "School fees": "பள்ளிக் கட்டணம்", Medical: "மருத்துவம்", Fuel: "பெட்ரோல்", Transport: "பயணம்", Insurance: "காப்பீடு", Savings: "சேமிப்பு", Entertainment: "பொழுதுபோக்கு", Festival: "பண்டிகை", Clothing: "உடைகள்" };
const BCAT_LUCIDE = { Salary: Briefcase, Business: Landmark, "Rent received": Home, Interest: Landmark, Gift: Gift, Other: Pin, Rent: Home, Groceries: ShoppingCart, Electricity: Lightbulb, Water: Droplets, Gas: Flame, "Mobile & Internet": Smartphone, "EMI / Loan": CreditCard, "School fees": GraduationCap, Medical: Stethoscope, Fuel: Fuel, Transport: Bus, Insurance: ShieldCheck, Savings: PiggyBank, Entertainment: Clapperboard, Festival: PartyPopper, Clothing: Shirt };
const bIcon = (c) => BCAT_LUCIDE[c] || Pin;
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
  const chip = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${on ? "bg-brand text-white border border-brand" : "bg-surface text-gray-700 border border-gray-300"}`;
  const save = () => {
    const n = Number(amount);
    if (!amount.trim() || !Number.isFinite(n) || n <= 0) return setErr(b.needAmount);
    const category = cat || "Other";
    onSave({ ...(editing && { id: initial.id }), type, category, title: title.trim() || category, amount: n, paid: type === "expense" && paid });
  };
  const input = "w-full rounded-lg bg-surface border border-gray-300 px-4 py-3 text-lg outline-none focus:ring-2 ring-brand";
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-xl mx-auto bg-sheet rounded-t-3xl p-4 pb-8 max-h-[92vh] overflow-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        {editing ? <h3 className="font-bold text-lg">{b.editEntry}</h3> : (
          <div className="flex rounded-lg bg-gray-100 p-1">
            {[["income", b.income], ["expense", b.expenses]].map(([k, l]) => (
              <button key={k} onClick={() => { setType(k); setCat(""); }} className={`flex-1 rounded-xl py-2 font-semibold ${type === k ? "bg-surface shadow text-brand" : "text-gray-500"}`}>{l}</button>
            ))}
          </div>
        )}
        <input autoFocus inputMode="decimal" className={input} placeholder={b.amount} value={amount} onChange={(e) => { setAmount(e.target.value); setErr(""); }} />
        <div>
          <p className="text-sm text-gray-500 mb-1.5">{b.category}</p>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{bcat(c, lang)}</button>)}
          </div>
        </div>
        <input className={input} placeholder={b.whatFor} value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
        {type === "expense" && (
          <button onClick={() => setPaid(!paid)} className="w-full flex items-center gap-3 rounded-lg bg-surface p-3 text-left">
            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-sm ${paid ? "bg-brand" : "border-2 border-gray-300"}`}>{paid && "✓"}</span>
            <span className="font-semibold">{b.markPaid}</span>
          </button>
        )}
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <div className="flex gap-2">
          {editing && <Btn onClick={() => onDelete(initial.id)} className="px-4 py-3 bg-red-50 text-red-600">{b.del}</Btn>}
          <Btn onClick={onClose} className="flex-1 py-3 bg-surface text-gray-600">{b.cancel}</Btn>
          <Btn onClick={save} className="flex-[2] py-3 bg-brand text-white">{b.save}</Btn>
        </div>
      </div>
    </div>
  );
}

function Budget({ t, lang, signal }) {
  const b = BT[lang];
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [sheet, setSheet] = useState(null);
  useEffect(() => { if (signal?.n && (signal.kind === "income" || signal.kind === "expense")) setSheet({ type: signal.kind }); }, [signal?.n]); // eslint-disable-line
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

  const Entry = ({ e }) => {
    const isInc = e.type === "income";
    return (
      <div className={`flex items-center gap-3 px-3.5 py-3 ${e.id < 0 ? "opacity-60" : ""}`}>
        <button onClick={() => e.id > 0 && setSheet(e)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
          <IconBox Icon={isInc ? ArrowDownLeft : bIcon(e.category)} className={isInc ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"} />
          <span className="min-w-0">
            <span className="block text-[11px] text-gray-500 truncate">{bcat(e.category, lang)}</span>
            <span className="block font-semibold text-gray-900 truncate">{e.title === e.category ? bcat(e.category, lang) : e.title}</span>
          </span>
        </button>
        <span className="shrink-0 text-right">
          <span className={`block font-bold ${isInc ? "text-green-700" : "text-gray-900"}`}>{isInc ? "+" : ""}{inr(e.amount)}</span>
          {isInc ? <span className="block text-[11px] text-gray-400">{b.income}</span> : (
            <button onClick={() => togglePaid(e)} aria-label="paid" className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium ${e.paid ? "text-green-700" : "text-amber-600"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${e.paid ? "bg-green-600" : "bg-amber-500"}`} />{e.paid ? b.paid : b.pending}
            </button>
          )}
        </span>
      </div>
    );
  };

  const savedPct = data.income > 0 ? Math.round((data.balance / data.income) * 100) : null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-surface p-2 border border-line">
        <Btn onClick={() => setMonth(shiftMonth(month, -1))} className="w-9 h-9 rounded-lg border border-gray-300 text-gray-700 flex items-center justify-center" aria-label="previous month"><ChevronLeft size={18} /></Btn>
        <div className="text-center"><p className="font-bold">{monthName(month, lang)}</p>{month === thisMonth() && <p className="text-xs text-green-700">{b.thisMonth}</p>}</div>
        <Btn onClick={() => setMonth(shiftMonth(month, 1))} className="w-9 h-9 rounded-lg border border-gray-300 text-gray-700 flex items-center justify-center" aria-label="next month"><ChevronRight size={18} /></Btn>
      </div>
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
      {rows === null ? <div className="space-y-4"><div className="grid grid-cols-3 gap-2"><span className="skeleton h-16" /><span className="skeleton h-16" /><span className="skeleton h-16" /></div><span className="skeleton block h-40" /><SkeletonRows n={3} /></div> : (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-gray-100 p-3"><p className="text-xs text-gray-700">{b.income}</p><p className="font-extrabold text-gray-900 text-sm sm:text-base">{inr(data.income)}</p></div>
            <div className="rounded-lg bg-amber-100 p-3"><p className="text-xs text-amber-800">{b.expenses}</p><p className="font-extrabold text-amber-900 text-sm sm:text-base">{inr(data.expense)}</p></div>
            <div className={`rounded-lg p-3 ${data.balance >= 0 ? "bg-surface" : "bg-red-100"}`}><p className="text-xs text-gray-500">{b.balance}</p><p className={`font-extrabold text-sm sm:text-base ${data.balance >= 0 ? "text-gray-700" : "text-red-700"}`}>{inr(data.balance)}</p></div>
          </div>
          {data.income > 0 && (
            <p className={`text-center text-sm ${data.balance < 0 ? "text-red-600 font-semibold" : "text-gray-500"}`}>
              {data.balance < 0 ? `⚠️ ${b.overspent}` : `${savedPct}% ${b.saved}`}
            </p>
          )}
          {data.expense > 0 && <p className="text-center text-xs text-gray-500">{b.paid}: {inr(data.paid)} · {b.pending}: {inr(data.expense - data.paid)}</p>}

          <section className="rounded-xl bg-surface p-4 border border-line">
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
                        <span className="flex-1 truncate">{bcat(sl.name, lang)}</span>
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
            <div className="flex items-center justify-between"><h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{b.income}</h2>
              <Btn onClick={() => setSheet({ type: "income" })} className="px-3 h-9 bg-brand text-white text-sm flex items-center gap-1.5"><Plus size={16} />{b.addIncome}</Btn></div>
            {!data.inc.length && <p className="rounded-lg bg-surface border border-line p-4 text-center text-sm text-gray-400">{b.noIncome}</p>}
            {!!data.inc.length && <div className="rounded-xl bg-surface border border-line divide-y divide-line overflow-hidden">{data.inc.map((e) => <Entry key={e.id} e={e} />)}</div>}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between"><h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{b.expenses}</h2>
              <Btn onClick={() => setSheet({ type: "expense" })} className="px-3 h-9 bg-brand text-white text-sm flex items-center gap-1.5"><Plus size={16} />{b.addExpense}</Btn></div>
            {!data.exp.length && <p className="rounded-lg bg-surface border border-line p-4 text-center text-sm text-gray-400">{b.noExpenses}</p>}
            {!!data.exp.length && <div className="rounded-xl bg-surface border border-line divide-y divide-line overflow-hidden">{data.exp.map((e) => <Entry key={e.id} e={e} />)}</div>}
          </section>

          {note && <p className="rounded-xl bg-gray-100 p-2.5 text-center text-sm text-gray-700">{note}</p>}
          <Btn onClick={copy} className="w-full py-3 border border-dashed border-gray-300 text-brand flex items-center justify-center gap-2"><RefreshCw size={17} />{b.copyPrev} ({monthName(shiftMonth(month, -1), lang)})</Btn>
        </>
      )}
      {sheet && <BudgetSheet key={sheet.id || sheet.type} b={b} lang={lang} initial={sheet} onSave={save} onDelete={remove} onClose={() => setSheet(null)} />}
    </div>
  );
}


// ---------- calendar ----------
const ECAT_LUCIDE = { Birthday: Cake, Anniversary: Heart, "Bill due": Receipt, "EMI due": CreditCard, "Credit card": CreditCard, Doctor: Stethoscope, Meeting: Users, School: GraduationCap, Festival: PartyPopper, Reminder: Bell, Other: Pin };
const eIcon = (c) => ECAT_LUCIDE[c] || Pin;
const EVENT_CATS = ["Birthday", "Anniversary", "Bill due", "EMI due", "Credit card", "Doctor", "Meeting", "School", "Festival", "Reminder", "Other"];
const ECAT_TA = { Birthday: "பிறந்தநாள்", Anniversary: "திருமண நாள்", "Bill due": "பில் கட்டணம்", "EMI due": "EMI தேதி", "Credit card": "கிரெடிட் கார்டு", Doctor: "மருத்துவர்", Meeting: "சந்திப்பு", School: "பள்ளி", Festival: "பண்டிகை", Reminder: "நினைவூட்டல்", Other: "மற்றவை" };
const CT = {
  en: { title: "Calendar", viewMonth: "Month", viewUpcoming: "Upcoming", range7: "7 days", range30: "30 days", range90: "3 months", rangeYear: "1 year", all: "All", sortDate: "By date", sortType: "By type", total: "events", thisWeek: "This week", nextMonth: "Next 30 days", nothingRange: "Nothing planned in this period", jumpToday: "Today", daysAway: "in {n} days", dayAway: "tomorrow", todayTag: "today", types: "Types", addEvent: "Add event", newEvent: "New event", editEvent: "Edit event", eventTitle: "What is it?", date: "Date", time: "Time", allDay: "All day", repeat: "Repeat", none: "Does not repeat", yearly: "Every year", monthly: "Every month", note: "Note (optional)", category: "Type", today: "Today", tomorrow: "Tomorrow", now: "Now", soon: "Later today", upcoming: "Coming up", nothingToday: "Nothing planned today", nothingSoon: "No events in the next 7 days", noEvents: "No events on this day", onThisDay: "On this day", viewAll: "Open calendar", save: "Save", cancel: "Cancel", del: "Delete", pickDate: "Choose a date", gotoToday: "Today", repeatsYearly: "every year", repeatsMonthly: "every month", wd: ["S", "M", "T", "W", "T", "F", "S"] },
  ta: { title: "நாட்காட்டி", viewMonth: "மாதம்", viewUpcoming: "வரவிருப்பவை", range7: "7 நாள்", range30: "30 நாள்", range90: "3 மாதம்", rangeYear: "1 வருடம்", all: "அனைத்தும்", sortDate: "தேதி வரிசை", sortType: "வகை வரிசை", total: "நிகழ்வுகள்", thisWeek: "இந்த வாரம்", nextMonth: "அடுத்த 30 நாள்", nothingRange: "இந்த காலத்தில் நிகழ்வுகள் இல்லை", jumpToday: "இன்று", daysAway: "{n} நாட்களில்", dayAway: "நாளை", todayTag: "இன்று", types: "வகைகள்", addEvent: "நிகழ்வு சேர்", newEvent: "புதிய நிகழ்வு", editEvent: "நிகழ்வைத் திருத்து", eventTitle: "என்ன நிகழ்வு?", date: "தேதி", time: "நேரம்", allDay: "நாள் முழுவதும்", repeat: "மீண்டும் வருமா", none: "மீண்டும் வராது", yearly: "ஒவ்வொரு ஆண்டும்", monthly: "ஒவ்வொரு மாதமும்", note: "குறிப்பு (விருப்பம்)", category: "வகை", today: "இன்று", tomorrow: "நாளை", now: "இப்போது", soon: "இன்று பின்னர்", upcoming: "வரவிருப்பவை", nothingToday: "இன்று எதுவும் இல்லை", nothingSoon: "அடுத்த 7 நாட்களில் நிகழ்வுகள் இல்லை", noEvents: "இந்த நாளில் நிகழ்வுகள் இல்லை", onThisDay: "இந்த நாளில்", viewAll: "நாட்காட்டியைத் திற", save: "சேமி", cancel: "ரத்து", del: "நீக்கு", pickDate: "தேதியைத் தேர்ந்தெடுக்கவும்", gotoToday: "இன்று", repeatsYearly: "ஒவ்வொரு ஆண்டும்", repeatsMonthly: "ஒவ்வொரு மாதமும்", wd: ["ஞா", "தி", "செ", "பு", "வி", "வெ", "ச"] },
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
  const chip = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${on ? "bg-brand text-white border border-brand" : "bg-surface text-gray-700 border border-gray-300"}`;
  const input = "w-full rounded-lg bg-surface border border-gray-300 px-4 py-3 text-lg outline-none focus:ring-2 ring-brand";
  const save = () => {
    if (!date) return setErr(c.pickDate);
    onSave({ ...(editing && { id: initial.id }), title: title.trim() || ecat(category, lang), category, date, time: allDay ? "" : time, repeat, note: note.trim() });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-xl mx-auto bg-sheet rounded-t-3xl p-4 pb-8 max-h-[92vh] overflow-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg">{editing ? c.editEvent : c.newEvent}</h3>
        <div>
          <p className="text-sm text-gray-500 mb-1.5">{c.category}</p>
          <div className="flex flex-wrap gap-2">{EVENT_CATS.map((k) => <button key={k} onClick={() => setCategory(k)} className={chip(category === k)}>{ecat(k, lang)}</button>)}</div>
        </div>
        <input className={input} placeholder={c.eventTitle} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className="text-sm text-gray-500">{c.date}</span><input type="date" className={input} value={date} onChange={(e) => { setDate(e.target.value); setErr(""); }} /></label>
          <label className="block"><span className="text-sm text-gray-500">{c.time}</span><input type="time" disabled={allDay} className={`${input} disabled:opacity-40`} value={time} onChange={(e) => setTime(e.target.value)} /></label>
        </div>
        <button onClick={() => setAllDay(!allDay)} className="w-full flex items-center gap-3 rounded-lg bg-surface p-3 text-left">
          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-sm ${allDay ? "bg-brand" : "border-2 border-gray-300"}`}>{allDay && "✓"}</span><span className="font-semibold">{c.allDay}</span>
        </button>
        <div>
          <p className="text-sm text-gray-500 mb-1.5">{c.repeat}</p>
          <div className="flex gap-2 flex-wrap">{[["none", c.none], ["yearly", c.yearly], ["monthly", c.monthly]].map(([k, l]) => <button key={k} onClick={() => setRepeat(k)} className={chip(repeat === k)}>{l}</button>)}</div>
        </div>
        <textarea className={`${input} text-base`} rows={2} placeholder={c.note} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <div className="flex gap-2">
          {editing && <Btn onClick={() => onDelete(initial.id)} className="px-4 py-3 bg-red-50 text-red-600">{c.del}</Btn>}
          <Btn onClick={onClose} className="flex-1 py-3 bg-surface text-gray-600">{c.cancel}</Btn>
          <Btn onClick={save} className="flex-[2] py-3 bg-brand text-white">{c.save}</Btn>
        </div>
      </div>
    </div>
  );
}

function EventRow({ o, c, lang, today, nowM, onOpen }) {
  const st = statusOf(o, today, nowM);
  return (
    <button onClick={() => onOpen(o)} className={`w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-gray-50 ${st === "now" ? "bg-emerald-50 shadow-[inset_3px_0_0_var(--color-brand)]" : st === "past" ? "opacity-50" : ""}`}>
      <IconBox Icon={eIcon(o.category)} />
      <span className="flex-1 min-w-0">
        <span className="block font-semibold text-gray-900 truncate">{o.title}</span>
        <span className="block text-xs text-gray-500 truncate">
          {o.time ? fmtTime(o.time) : c.allDay}{o.repeat === "yearly" ? ` · ${c.repeatsYearly}` : o.repeat === "monthly" ? ` · ${c.repeatsMonthly}` : ""}{o.note ? ` · ${o.note}` : ""}
        </span>
      </span>
      {st === "now" && <span className="shrink-0 rounded-md bg-brand text-white text-[11px] font-semibold px-2 py-0.5">{c.now}</span>}
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

function Calendar({ lang, cal, signal }) {
  const c = CT[lang], now = useClock(), today = localToday(now), nowM = nowMin(now);
  const { events, err, save, remove } = cal;
  const t0 = parseYmd(today);
  const [ym, setYm] = useState({ y: t0.y, m: t0.m });
  const [sel, setSel] = useState(today);
  const [sheet, setSheet] = useState(null);
  const [view, setView] = useState("month");
  useEffect(() => { if (signal?.n && signal.kind === "event") setSheet({ date: today }); }, [signal?.n]); // eslint-disable-line
  const first = ymd(ym.y, ym.m, 1), last = ymd(ym.y, ym.m, daysIn(ym.y, ym.m));
  const occ = useMemo(() => occurrences(events || [], first, last), [events, first, last]);
  const byDay = useMemo(() => { const m = {}; occ.forEach((o) => (m[o.date] ||= []).push(o)); return m; }, [occ]);
  const lead = weekday(first);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysIn(ym.y, ym.m) }, (_, i) => ymd(ym.y, ym.m, i + 1))];
  const go = (n) => { const d = new Date(ym.y, ym.m - 1 + n, 1); setYm({ y: d.getFullYear(), m: d.getMonth() + 1 }); };
  const openDay = (d) => { setSel(d); };
  const dayEvents = byDay[sel] || [];
  const awayFromToday = ym.y !== t0.y || ym.m !== t0.m || sel !== today;
  const jumpToday = () => { setYm({ y: t0.y, m: t0.m }); setSel(today); };
  const onOpen = (o) => { const ev = (events || []).find((e) => e.id === o.id); if (ev && ev.id > 0) setSheet(ev); }; // still-saving events have a temporary id
  const saveSheet = (e) => { setSheet(null); save(e); };
  const delSheet = (id) => { setSheet(null); remove(id); };
  return (
    <div className="space-y-3">
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
      <div className="flex rounded-lg bg-gray-100 p-1 text-sm font-medium" role="tablist">
        {[["month", c.viewMonth], ["upcoming", c.viewUpcoming]].map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`flex-1 rounded-md py-1.5 ${view === k ? "bg-surface text-gray-900 shadow-sm" : "text-gray-500"}`}>{l}</button>)}
      </div>
      {view === "upcoming" && <Upcoming c={c} lang={lang} events={events} today={today} onOpen={onOpen} />}
      {view === "month" && <>
      <div className="rounded-xl bg-surface p-3 border border-line">
        <div className="flex items-center justify-between mb-2">
          <Btn onClick={() => go(-1)} className="w-9 h-9 rounded-lg border border-gray-300 text-gray-700 flex items-center justify-center" aria-label="previous month"><ChevronLeft size={18} /></Btn>
          <button onClick={jumpToday} className="font-semibold text-gray-900 flex items-center gap-2">{monthTitle(ym.y, ym.m, lang)}{awayFromToday && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">{c.jumpToday}</span>}</button>
          <Btn onClick={() => go(1)} className="w-9 h-9 rounded-lg border border-gray-300 text-gray-700 flex items-center justify-center" aria-label="next month"><ChevronRight size={18} /></Btn>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{c.wd.map((w, i) => <span key={i}>{w}</span>)}</div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const n = (byDay[d] || []).length, isToday = d === today, isSel = d === sel;
            return (
              <button key={d} onClick={() => openDay(d)} className={`relative mx-auto w-10 h-11 rounded-lg flex flex-col items-center justify-center text-sm ${isSel ? "bg-brand text-white font-semibold" : isToday ? "border border-brand font-semibold text-brand" : "text-gray-700 hover:bg-gray-50"}`}>
                {parseYmd(d).d}
                {n > 0 && <span className={`absolute bottom-1 flex gap-0.5`}>{Array.from({ length: Math.min(n, 3) }).map((_, k) => <i key={k} className={`w-1 h-1 rounded-full ${isSel ? "bg-surface" : "bg-brand"}`} />)}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">{dayLabel(sel, today, c, lang)}</h2>
        <Btn onClick={() => setSheet({ date: sel })} className="px-3 h-9 bg-brand text-white text-sm flex items-center gap-1.5"><Plus size={16} />{c.addEvent}</Btn>
      </div>
      {events === null && <SkeletonRows n={2} />}
      {events && !dayEvents.length && <p className="rounded-lg bg-surface border border-line p-4 text-center text-sm text-gray-400">{c.noEvents}</p>}
      {!!dayEvents.length && <div className="rounded-xl bg-surface border border-line divide-y divide-line overflow-hidden">{dayEvents.map((o) => <EventRow key={o.key} o={o} c={c} lang={lang} today={today} nowM={nowM} onOpen={onOpen} />)}</div>}
      </>}
      {sheet && <EventSheet key={sheet.id || "new"} c={c} lang={lang} initial={sheet} onSave={saveSheet} onDelete={delSheet} onClose={() => setSheet(null)} />}
    </div>
  );
}

// Upcoming: every planned event in a chosen period, with totals, a type filter and sorting.
function Upcoming({ c, lang, events, today, onOpen }) {
  const [days, setDays] = useState(30);
  const [type, setType] = useState("");
  const [sort, setSort] = useState("date");
  const occ = useMemo(() => occurrences(events || [], today, addDays(today, days)), [events, today, days]);
  const types = useMemo(() => { const m = {}; occ.forEach((o) => { m[o.category] = (m[o.category] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [occ]);
  const shown = useMemo(() => { const l = occ.filter((o) => !type || o.category === type); return sort === "type" ? [...l].sort((a, b) => a.category.localeCompare(b.category) || a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || "")) : l; }, [occ, type, sort]);
  const week = occ.filter((o) => o.date <= addDays(today, 6)).length;
  const groups = useMemo(() => shown.reduce((a, o) => { const k = sort === "type" ? o.category : o.date; (a[k] ||= []).push(o); return a; }, {}), [shown, sort]);
  const dayNum = (d) => { const p = parseYmd(d); return Date.UTC(p.y, p.m - 1, p.d) / 864e5; };
  const away = (d) => { const n = dayNum(d) - dayNum(today); return n === 0 ? c.todayTag : n === 1 ? c.dayAway : c.daysAway.replace("{n}", n); };
  const pill = (on) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium border ${on ? "bg-brand text-white border-brand" : "bg-surface text-gray-700 border-gray-300"}`;
  if (events === null) return <SkeletonRows n={3} />;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[[occ.length, c.total], [week, c.thisWeek], [types.length, c.types]].map(([n, l], i) => (
          <div key={i} className="rounded-xl bg-surface border border-line px-3 py-2.5"><p className="text-xl font-bold text-gray-900 leading-none">{n}</p><p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{l}</p></div>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
        {[[7, c.range7], [30, c.range30], [90, c.range90], [365, c.rangeYear]].map(([d, l]) => <button key={d} onClick={() => setDays(d)} className={pill(days === d)}>{l}</button>)}
      </div>
      {!!types.length && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <button onClick={() => setType("")} className={pill(!type)}>{c.all} ({occ.length})</button>
          {types.map(([k, n]) => <button key={k} onClick={() => setType(type === k ? "" : k)} className={pill(type === k)}>{ecat(k, lang)} ({n})</button>)}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{shown.length} {c.total}</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-gray-300 bg-surface px-2.5 py-1.5 text-sm text-gray-700" aria-label="sort">
          <option value="date">{c.sortDate}</option><option value="type">{c.sortType}</option>
        </select>
      </div>
      {!shown.length && <p className="rounded-lg bg-surface border border-line p-4 text-center text-sm text-gray-400">{c.nothingRange}</p>}
      {Object.entries(groups).map(([k, list]) => (
        <section key={k}>
          <h3 className="mb-1.5 px-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            <span>{sort === "type" ? ecat(k, lang) : dayLabel(k, today, c, lang)}</span>
            {sort === "date" && <span className="font-medium normal-case tracking-normal text-gray-400">{away(k)}</span>}
          </h3>
          <div className="rounded-xl bg-surface border border-line divide-y divide-line overflow-hidden">
            {list.map((o) => (
              <button key={o.key} onClick={() => onOpen(o)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-gray-50">
                <IconBox Icon={eIcon(o.category)} />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-gray-900 truncate">{o.title}</span>
                  <span className="block text-xs text-gray-500 truncate">{sort === "type" ? `${longDate(o.date, lang)} · ` : ""}{o.time ? fmtTime(o.time) : c.allDay}{o.repeat === "yearly" ? ` · ${c.repeatsYearly}` : o.repeat === "monthly" ? ` · ${c.repeatsMonthly}` : ""}</span>
                </span>
                {sort === "type" && <span className="shrink-0 text-xs text-gray-400">{away(o.date)}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
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
    <section className="rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] space-y-3">
      <button onClick={onOpen} className="w-full flex items-center justify-between text-left">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{c.today} · {longDate(today, lang)}</span>
        <ChevronRight size={18} className="text-gray-400" />
      </button>
      {!todays.length && <p className="text-sm text-gray-400">{c.nothingToday}</p>}
      {todays.map((o) => {
        const st = statusOf(o, today, nowM);
        return (
          <button key={o.key} onClick={onOpen} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left border ${st === "now" ? "border-brand bg-emerald-50" : "border-line bg-gray-50"}`}>
            <span className="shrink-0 w-8 h-8 rounded-md bg-surface border border-line text-gray-600 flex items-center justify-center"><Bell size={16} /></span>
            <span className="flex-1 min-w-0 text-sm font-semibold text-gray-900 truncate">{o.title}</span>
            <span className={`text-xs font-semibold rounded-md px-2 py-0.5 ${st === "now" ? "bg-brand text-white" : "bg-surface border border-line text-gray-600"}`}>{label(o)}</span>
          </button>
        );
      })}
      <div className="border-t border-line pt-3">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{c.upcoming}</p>
        {!upcoming.length && <p className="text-sm text-gray-400">{c.nothingSoon}</p>}
        {upcoming.slice(0, 5).map((o) => (
          <div key={o.key} className="flex items-center gap-2 py-1.5 text-sm">
            <span className="flex-1 truncate text-gray-800">{o.title}</span>
            <span className="text-gray-500 text-xs shrink-0">{dayLabel(o.date, today, c, lang)}{o.time ? ` · ${fmtTime(o.time)}` : ""}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- diary ----------
const MOODS = [["happy", Smile, "Happy", "மகிழ்ச்சி"], ["calm", Heart, "Calm", "அமைதி"], ["tired", Moon, "Tired", "சோர்வு"], ["sad", Frown, "Sad", "சோகம்"], ["angry", Angry, "Angry", "கோபம்"]];
const DT = {
  en: { title: "Diary", tile: "Write about today", today: "Today", writeHere: "Write about your day…", saving: "Saving…", saved: "Saved", clear: "Delete this entry", clearAsk: "Delete this day's entry?", search: "Search your diary…", noEntries: "Nothing written this month.", onThisDay: "On this day", words: "words", charsLeft: "left", searchEmpty: "No matches.", jump: "Go to date", failed: "Could not save. Retrying…", tip: "Tip: tap the microphone on your keyboard to speak instead of typing." },
  ta: { title: "டைரி", tile: "இன்றைய நாளை எழுதுங்கள்", today: "இன்று", writeHere: "இன்றைய நாளைப் பற்றி எழுதுங்கள்…", saving: "சேமிக்கிறது…", saved: "சேமிக்கப்பட்டது", clear: "இந்த பதிவை நீக்கு", clearAsk: "இந்த நாளின் பதிவை நீக்கவா?", search: "டைரியில் தேடுங்கள்…", noEntries: "இந்த மாதம் எதுவும் எழுதவில்லை.", onThisDay: "இதே நாளில்", words: "சொற்கள்", charsLeft: "மீதம்", searchEmpty: "பொருத்தம் இல்லை.", jump: "தேதிக்குச் செல்", failed: "சேமிக்க முடியவில்லை. மீண்டும் முயல்கிறது…", tip: "குறிப்பு: தட்டச்சுக்கு பதிலாக பேச, விசைப்பலகையில் உள்ள மைக்ரோஃபோனைத் தட்டவும்." },
};
const DIARY_MAX = 8000;
const moodLabel = (m, lang) => { const x = MOODS.find((y) => y[0] === m); return x ? (lang === "ta" ? x[3] : x[2]) : ""; };
const dayTitle = (d, lang) => { const { y, m, d: dd } = parseYmd(d); return new Date(y, m - 1, dd).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
const shortDay = (d, lang) => { const { y, m, d: dd } = parseYmd(d); return new Date(y, m - 1, dd).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short" }); };
const preview = (s) => { const one = s.replace(/\s+/g, " ").trim(); return one.length > 110 ? one.slice(0, 110) + "…" : one; };

// One entry per day. It saves by itself a moment after you stop typing, and nothing is lost if you leave the page.
function DiaryEditor({ d, lang, date, onChanged, onBack }) {
  const [text, setText] = useState(null);
  const [mood, setMood] = useState("");
  const [state, setState] = useState("saved"); // saved | saving | failed
  const [memories, setMemories] = useState([]);
  const latest = useRef({ text: "", mood: "" }), saved = useRef({ text: "", mood: "" }), timer = useRef(null), inflight = useRef(Promise.resolve());

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const snap = { ...latest.current };
    if (snap.text === saved.current.text && snap.mood === saved.current.mood) return inflight.current;
    setState("saving");
    inflight.current = inflight.current.then(async () => {
      try {
        await api(`/api/diary/entries/${date}`, "PUT", snap);
        saved.current = snap;
        setState(latest.current.text === snap.text && latest.current.mood === snap.mood ? "saved" : "saving");
        onChanged?.();
      } catch { setState("failed"); timer.current = setTimeout(flush, 4000); }
    });
    return inflight.current;
  }, [date, onChanged]);

  useEffect(() => {
    let live = true;
    api(`/api/diary/entries/${date}`).then((e) => {
      if (!live) return;
      const v = { text: e?.text ?? "", mood: e?.mood ?? "" };
      latest.current = v; saved.current = v; setText(v.text); setMood(v.mood);
    }).catch(() => live && setText(""));
    api(`/api/diary/on-this-day?date=${date}`).then((m) => live && setMemories(m)).catch(() => {});
    return () => { live = false; flush(); }; // leaving the page saves what is pending
  }, [date]); // eslint-disable-line
  useEffect(() => {
    const h = () => { if (document.hidden) flush(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [flush]);

  const change = (nt, nm) => {
    latest.current = { text: nt, mood: nm };
    setState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  };
  const remove = async () => {
    if (!confirm(d.clearAsk)) return;
    clearTimeout(timer.current);
    latest.current = { text: "", mood: "" }; saved.current = { text: "", mood: "" };
    setText(""); setMood("");
    try { await api(`/api/diary/entries/${date}`, "DELETE"); onChanged?.(); onBack?.(); } catch { setState("failed"); }
  };

  if (text === null) return <div className="space-y-3"><span className="skeleton block h-10 w-2/3" /><span className="skeleton block h-12" /><span className="skeleton block h-64" /></div>;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Btn onClick={() => { flush(); onBack(); }} className="w-9 h-9 rounded-lg border border-gray-300 text-gray-700 flex items-center justify-center" aria-label="back"><ChevronLeft size={18} /></Btn>
        <h2 className="flex-1 font-bold leading-tight">{dayTitle(date, lang)}</h2>
        <span className={`text-xs font-semibold ${state === "failed" ? "text-red-600" : "text-gray-400"}`}>{state === "saved" ? `✓ ${d.saved}` : state === "saving" ? d.saving : d.failed}</span>
      </div>
      <div className="flex gap-2">
        {MOODS.map(([k, Icon, en, ta]) => (
          <button key={k} onClick={() => { const nm = mood === k ? "" : k; setMood(nm); change(text, nm); }} aria-pressed={mood === k}
            className={`flex-1 rounded-lg py-2 border flex flex-col items-center gap-0.5 ${mood === k ? "bg-brand/10 border-brand text-brand" : "bg-surface border-line text-gray-500"}`}>
            <Icon size={20} strokeWidth={1.9} /><span className="text-[10px] font-medium leading-none">{lang === "ta" ? ta : en}</span>
          </button>
        ))}
      </div>
      <textarea value={text} maxLength={DIARY_MAX} onChange={(e) => { setText(e.target.value); change(e.target.value, mood); }}
        placeholder={d.writeHere} rows={12} lang={lang === "ta" ? "ta" : "en"}
        className="w-full rounded-xl bg-surface p-4 text-lg leading-relaxed outline-none focus:ring-2 ring-brand border border-line resize-none" />
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span>{words} {d.words}</span><span>{DIARY_MAX - text.length} {d.charsLeft}</span>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-gray-500 px-1"><Lightbulb size={14} className="mt-0.5 shrink-0" />{d.tip}</p>
      {(text.trim() || mood) && <Btn onClick={remove} className="w-full py-2.5 text-sm text-red-600 bg-red-50">{d.clear}</Btn>}
      {memories.length > 0 && (
        <section className="space-y-2 pt-2">
          <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{d.onThisDay}</h3>
          {memories.map((m) => (
            <div key={m.id} className="rounded-lg bg-surface p-3 border border-line">
              <p className="text-xs font-bold text-brand">{parseYmd(m.date).y}{m.mood ? ` · ${moodLabel(m.mood, lang)}` : ""}</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{preview(m.text)}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Diary({ lang, signal }) {
  const d = DT[lang], now = useClock(), today = localToday(now), t0 = parseYmd(today);
  const [ym, setYm] = useState({ y: t0.y, m: t0.m });
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => { if (signal?.n && signal.kind === "diary") setOpen(today); }, [signal?.n]); // eslint-disable-line
  const [q, setQ] = useState("");
  const [hits, setHits] = useState(null);
  const [err, setErr] = useState("");
  const month = `${ym.y}-${pad(ym.m)}`;
  const gen = useRef(0);
  const load = useCallback(async () => {
    const my = ++gen.current;
    try { const r = await api(`/api/diary/entries?month=${month}`); if (my === gen.current) { setRows(r); setErr(""); } }
    catch (e) { if (my === gen.current) { setErr(e.message); setRows([]); } }
  }, [month]);
  useEffect(() => { setRows(null); load(); }, [load]);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setHits(null); return; }
    const id = setTimeout(() => api(`/api/diary/search?q=${encodeURIComponent(s)}`).then(setHits).catch(() => setHits([])), 350);
    return () => clearTimeout(id);
  }, [q]);
  const go = (n) => { const x = new Date(ym.y, ym.m - 1 + n, 1); setYm({ y: x.getFullYear(), m: x.getMonth() + 1 }); };

  if (open) return <DiaryEditor key={open} d={d} lang={lang} date={open} onChanged={load} onBack={() => setOpen(null)} />;
  const list = hits ?? rows;
  const hasToday = (rows || []).some((r) => r.date === today);
  return (
    <div className="space-y-3">
      {err && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
      <Btn onClick={() => setOpen(today)} className="w-full py-3.5 bg-brand text-white text-lg shadow">✏️ {hasToday ? d.today : `${d.today} · ${shortDay(today, lang)}`}</Btn>
      <div className="relative">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={d.search} className="w-full rounded-lg bg-surface border border-gray-300 pl-4 pr-10 py-2.5 outline-none focus:ring-2 ring-brand" />
        {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label="clear"><XIcon size={16} /></button>}
      </div>
      {hits === null && (
        <div className="flex items-center justify-between rounded-lg bg-surface p-2 border border-line">
          <Btn onClick={() => go(-1)} className="w-9 h-9 rounded-lg border border-gray-300 text-gray-700 flex items-center justify-center" aria-label="previous month"><ChevronLeft size={18} /></Btn>
          <label className="relative text-center font-bold cursor-pointer">
            {monthTitle(ym.y, ym.m, lang)}
            <input type="date" aria-label={d.jump} value="" onChange={(e) => e.target.value && setOpen(e.target.value)} className="absolute inset-0 opacity-0 w-full cursor-pointer" />
          </label>
          <Btn onClick={() => go(1)} className="w-9 h-9 rounded-lg border border-gray-300 text-gray-700 flex items-center justify-center" aria-label="next month"><ChevronRight size={18} /></Btn>
        </div>
      )}
      {list === null && <SkeletonRows n={4} />}
      {list && !list.length && <p className="rounded-lg bg-surface p-5 text-center text-gray-400">{hits ? d.searchEmpty : d.noEntries}</p>}
      {!!(list || []).length && (
        <div className="rounded-xl bg-surface border border-line divide-y divide-line overflow-hidden">
          {(list || []).map((e) => {
            const { d: dd } = parseYmd(e.date), wd = shortDay(e.date, lang).split(" ")[0];
            return (
              <button key={e.id} onClick={() => setOpen(e.date)} className="w-full flex items-start gap-3 px-3.5 py-3 text-left active:bg-gray-50">
                <span className="shrink-0 w-11 rounded-lg bg-gray-100 py-1.5 text-center leading-none">
                  <span className="block text-[10px] font-semibold uppercase text-gray-500">{wd.replace(",", "")}</span>
                  <span className="block mt-0.5 text-lg font-bold text-gray-900">{dd}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[11px] text-gray-500">
                    {hits ? parseYmd(e.date).y : monthTitle(ym.y, ym.m, lang)}{e.mood ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">{moodLabel(e.mood, lang)}</span> : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-gray-800 line-clamp-2 whitespace-pre-wrap">{preview(e.text) || "…"}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- app ----------
function Main({ user, brand, onLogout, onUser, lang, onLang }) {
  const [tab, setTab] = useState("home");
  const [sub, setSub] = useState("list"); // inside Groceries: list | stock
  const [list, setList] = useState({ items: [] });
  const [inv, setInv] = useState([]);
  const [mic, setMic] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [signal, setSignal] = useState({ kind: "", n: 0 });
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
  // Quick add: one tap from anywhere to the thing you do most.
  const quickActions = [];
  if (has("provisions")) quickActions.push({ k: "item", Icon: ShoppingBasket, label: t.qaItem, tab: "groceries", sub: "list" });
  if (has("budget")) quickActions.push({ k: "expense", Icon: ArrowUpRight, label: t.qaExpense, tab: "budget" }, { k: "income", Icon: ArrowDownLeft, label: t.qaIncome, tab: "budget" });
  if (has("calendar")) quickActions.push({ k: "event", Icon: CalendarPlus, label: t.qaEvent, tab: "calendar" });
  if (has("diary")) quickActions.push({ k: "diary", Icon: PenLine, label: t.qaDiary, tab: "diary" });
  const doQuick = (a) => {
    setQaOpen(false);
    go(a.tab, a.sub, null);
    if (a.k === "item") setMic(true); else setSignal((p) => ({ kind: a.k, n: p.n + 1 }));
  };
  const tabs = [["home", HomeIcon, t.home]];
  if (has("provisions")) tabs.push(["groceries", ShoppingCart, t.groceries]);
  if (has("budget")) tabs.push(["budget", Wallet, BT[lang].title]);
  if (has("calendar")) tabs.push(["calendar", CalendarDays, CT[lang].title]);
  if (has("diary")) tabs.push(["diary", BookOpen, DT[lang].title]);
  tabs.push(["more", MenuIcon, t.more]);
  const tabIds = tabs.map(([id]) => id).join(",");
  useEffect(() => { if (!tabIds.split(",").includes(tab)) setTab("home"); }, [tabIds, tab]); // a section that was switched off must not stay open

  // Bottom bar on phones: two section tabs, a raised + button, then one more tab and More.
  const Tab = ({ id, Icon, label, lit }) => (
    <button onClick={() => go(id, null, null)} className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2 ${tab === id || lit ? "text-brand" : "text-gray-400"}`}>
      <span className="relative">
        <Icon size={22} strokeWidth={tab === id ? 2.4 : 1.8} />
        {id === "groceries" && lowCount > 0 && <span className="absolute -top-1.5 -right-2.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[1.1rem] text-center">{lowCount > 9 ? "9+" : lowCount}</span>}
      </span>
      <span className={`text-[11px] max-w-full truncate px-0.5 ${tab === id ? "font-semibold" : ""}`}>{label}</span>
    </button>
  );
  const mainTabs = tabs.filter(([id]) => id !== "more");
  const barLeft = mainTabs.slice(0, 2), barRight = [...mainTabs.slice(2, 3), tabs.find(([id]) => id === "more")].filter(Boolean);
  // A section without its own phone tab (for example Diary) is opened from More, so More stays lit while it is open.
  const onBar = [...barLeft, ...barRight].some(([id]) => id === tab);
  // Sidebar on wide screens (the MotoBill layout).
  const SideItem = ({ id, Icon, label }) => (
    <button onClick={() => go(id, null, null)} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left ${tab === id ? "bg-brand/10 text-brand font-semibold" : "text-gray-600 hover:bg-gray-50"}`}>
      <Icon size={19} strokeWidth={tab === id ? 2.3 : 1.8} />{label}
    </button>
  );

  return (
    <div className="min-h-screen bg-page text-gray-800">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-line bg-surface px-3 py-4 z-30">
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <span className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center"><HomeIcon size={19} /></span>
          <span className="leading-tight"><span className="block font-bold text-gray-900" translate="no">{brand.name}</span><span className="block text-[11px] text-gray-500 truncate">{brand.tagline}</span></span>
        </div>
        <div className="mx-1 mb-3 rounded-lg bg-gray-50 px-3 py-2"><p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p><p className="text-[11px] text-gray-500">{user.isDemo ? "Demo" : user.role === "admin" ? "Admin" : user.phone}</p></div>
        <nav className="space-y-1 flex-1">{tabs.map(([id, Icon, label]) => <SideItem key={id} id={id} Icon={Icon} label={label} />)}</nav>
        <button onClick={onLogout} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"><LogOut size={19} strokeWidth={1.8} />{t.signOut}</button>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8 py-3 bg-surface/90 backdrop-blur border-b border-line" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <h1 className="lg:invisible font-bold text-gray-900" translate="no">{brand.name}</h1>
          <HeaderTools lang={lang} onLang={onLang} />
        </header>
        <main className={`max-w-5xl mx-auto px-4 lg:px-8 pt-5 ${tab === "groceries" && sub === "stock" ? "pb-44" : "pb-28"} lg:pb-10`}>
          {user.isDemo && <p className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-center text-xs text-amber-800">{t.demoNote}</p>}
          {err && <p className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{err}</p>}
          {tab === "home" && <Home t={t} lang={lang} user={user} inv={inv} list={list} cal={hasCal ? cal : null} onGo={go} onQuick={(k) => { const a = quickActions.find((x) => x.k === k); if (a) doQuick(a); }} />}
          {tab === "groceries" && (
            <>
              <div className="grid grid-cols-4 gap-1 rounded-lg bg-gray-100 p-1 mb-4">
                {[["list", t.list], ["stock", t.stock], ["low", `${t.lowTab}${lowCount ? ` (${lowCount})` : ""}`], ["history", t.history]].map(([k, l]) => (
                  <button key={k} onClick={() => setSub(k)} className={`rounded-md py-2 px-1 text-sm font-medium truncate ${sub === k ? "bg-surface border border-line text-gray-900" : "text-gray-500"}`}>{l}</button>
                ))}
              </div>
              {sub === "list"
                ? <ListTab t={t} brand={brand} list={list} setList={setList} mutate={mutate} refresh={refresh} onAdd={() => setMic(true)} />
                : sub === "low"
                  ? <RunningLow t={t} inv={inv} list={list} onRestock={restock} onUnrestock={unpick} />
                  : sub === "history"
                    ? <History t={t} brand={brand} onCopied={refresh} />
                    : <Stock t={t} items={inv} setItems={setInv} mutate={mutate} refresh={refresh} onSeed={seed} onAdd={() => setMic(true)} />}
            </>
          )}
          {tab === "budget" && <Budget t={t} lang={lang} signal={signal} />}
          {tab === "calendar" && <Calendar lang={lang} cal={cal} signal={signal} />}
          {tab === "diary" && <Diary lang={lang} signal={signal} />}
          {tab === "more" && <More t={t} lang={lang} user={user} onUser={onUser} view={moreView} setView={setMoreView} onLogout={onLogout} extra={mainTabs.filter(([id]) => ![...barLeft, ...barRight].some(([b]) => b === id) && id !== "home")} onOpen={(id) => go(id, null, null)} />}
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-xl mx-auto flex items-end">
          {barLeft.map(([id, Icon, label]) => <Tab key={id} id={id} Icon={Icon} label={label} />)}
          {quickActions.length > 0 && (
            <div className="flex-1 flex justify-center">
              <button onClick={() => setQaOpen(true)} aria-label={t.quickAdd} className="-mt-6 w-14 h-14 rounded-full bg-brand text-white shadow-lg ring-4 ring-page flex items-center justify-center active:scale-95 transition">
                <Plus size={28} strokeWidth={2.4} />
              </button>
            </div>
          )}
          {barRight.map(([id, Icon, label]) => <Tab key={id} id={id} Icon={Icon} label={label} lit={id === "more" && !onBar} />)}
        </div>
      </nav>
      {qaOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setQaOpen(false)}>
          <div className="w-full max-w-md bg-sheet rounded-t-2xl sm:rounded-2xl p-5" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">{t.quickAdd}</h3>
              <button onClick={() => setQaOpen(false)} aria-label="close" className="text-gray-400 p-1"><XIcon size={20} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {quickActions.map((a) => (
                <button key={a.k} onClick={() => doQuick(a)} className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface py-4 px-1 active:bg-gray-50">
                  <span className="w-11 h-11 rounded-full bg-brand/10 text-brand flex items-center justify-center"><a.Icon size={22} /></span>
                  <span className="text-xs font-medium text-gray-800 text-center leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
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
