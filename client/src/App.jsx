import { useEffect, useMemo, useState, useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
    cancel: "Cancel", more: "More", toBuyTab: "To buy", dragHint: "Clear the filters to rearrange the list.", okTab: "In stock", showing: "Showing", signIn: "Sign in", signUp: "Sign up", createAcct: "Create free account", createBtn: "Create account", tryDemo: "✨ Try demo", loading: "Loading…", heroBadge: "For every home maker", heroA: "Your monthly provisions, ", heroB: "sorted in minutes", heroText: "Make your list on the phone, send it to the shop on WhatsApp, and always know what is left at home. No more writing the list by hand.", already: "Already registered?", featTitle: "Everything for your kitchen, in one place", howTitle: "How it works", soon: "Coming soon: budget charts, reminders for bills and birthdays, and a family diary.", ctaTitle: "Ready to make this month's list?", yourName: "Your name", phone: "Phone number", password: "Password", approveNote: "New accounts are approved by the admin before you can sign in.", thanks: "Thank you!", waitApproval: "Your account is waiting for approval. You can sign in once it is approved.", backSignin: "Back to sign in", adminUsers: "Admin: users", users: "users", waiting: "waiting for approval", approve: "Approve", enable: "Enable", disable: "Disable", reject: "Reject", del: "Delete", confirmDel: "Delete {n} and all their data?", demoAccts: "demo accounts (auto-deleted after a day)", st_pending: "pending", st_active: "active", st_disabled: "disabled", history: "History", historyEmpty: "Finished lists are saved here, month by month.", copyToList: "Copy to current list", copied: "Added to your list", nextTitle: "Start next month's list", nextNote: "This month's list is saved in History. Untick what you don't need.", startList: "Start new list", lowTag: "low stock", signOut: "Sign out", demoNote: "Demo account. Data is deleted after one day.", back: "Back", search: "Search items…", allTab: "All", lowTab: "Low", mineTab: "My items", done: "Done", readList: "Add typed text as a list", seed: "Load 100 sample items", noMatch: "No items found", min: "Min", addItem: "Add item", name: "Name", unit: "Unit", save: "Save", noSpeech: "Voice not supported in this browser. Please type.",
    check: "Please check these items", items: "items", boughtOf: "bought", stockEmpty: "No stock yet. Mark list items as bought and they appear here.", left: "left" },
  ta: { home: "முகப்பு", list: "பட்டியல்", stock: "இருப்பு", low: "குறைவான பொருட்கள்", lowEmpty: "எல்லாம் இருக்கு 🎉", addList: "பட்டியலில் சேர்", onList: "சேர்க்கப்பட்டது ✓",
    thisList: "இந்த மாத பட்டியல்", toBuy: "வாங்க வேண்டியவை", bought: "வாங்கியவை", send: "வாட்ஸ்அப்பில் அனுப்பு", newMonth: "அடுத்த மாத பட்டியல்", empty: "பட்டியல் காலி. + தட்டி பொருட்களை டைப் செய்யுங்கள்.",
    tap: "தட்டிப் பேசுங்கள்", listening: "கேட்கிறேன்… பேசுங்கள்", typeHere: "பொருட்களை டைப் செய்யுங்கள், எ.கா. 2 கிலோ அரிசி, 1 லிட்டர் எண்ணெய்", read: "பட்டியலாக்கு", addAll: "பட்டியலில் சேர்",
    cancel: "ரத்து", more: "மேலும்", toBuyTab: "வாங்க வேண்டியவை", dragHint: "வரிசையை மாற்ற வடிகட்டிகளை நீக்கவும்.", okTab: "போதுமான இருப்பு", showing: "காட்டுவது", signIn: "உள்நுழை", signUp: "பதிவு செய்", createAcct: "இலவச கணக்கை உருவாக்கு", createBtn: "கணக்கை உருவாக்கு", tryDemo: "✨ டெமோ பார்க்க", loading: "ஏற்றுகிறது…", heroBadge: "ஒவ்வொரு இல்லத்தரசிக்கும்", heroA: "உங்கள் மாத மளிகை, ", heroB: "நிமிடங்களில் தயார்", heroText: "போனில் பட்டியல் தயாரித்து, வாட்ஸ்அப்பில் கடைக்கு அனுப்புங்கள். வீட்டில் என்ன மீதம் உள்ளது என்றும் எப்போதும் தெரியும். இனி கையால் எழுத வேண்டாம்.", already: "ஏற்கனவே பதிவு செய்துள்ளீர்களா?", featTitle: "உங்கள் சமையலறைக்குத் தேவையான அனைத்தும், ஒரே இடத்தில்", howTitle: "எப்படி வேலை செய்கிறது", soon: "விரைவில்: பட்ஜெட் வரைபடங்கள், பில் மற்றும் பிறந்தநாள் நினைவூட்டல்கள், குடும்ப டைரி.", ctaTitle: "இந்த மாத பட்டியலைத் தயாரிக்கத் தயாரா?", yourName: "உங்கள் பெயர்", phone: "தொலைபேசி எண்", password: "கடவுச்சொல்", approveNote: "புதிய கணக்குகளை நிர்வாகி அனுமதித்த பிறகே உள்நுழையலாம்.", thanks: "நன்றி!", waitApproval: "உங்கள் கணக்கு அனுமதிக்காகக் காத்திருக்கிறது. அனுமதி கிடைத்ததும் உள்நுழையலாம்.", backSignin: "உள்நுழைவுக்குத் திரும்பு", adminUsers: "நிர்வாகி: பயனர்கள்", users: "பயனர்கள்", waiting: "அனுமதிக்காகக் காத்திருக்கின்றனர்", approve: "அனுமதி", enable: "இயக்கு", disable: "முடக்கு", reject: "நிராகரி", del: "நீக்கு", confirmDel: "{n} மற்றும் அவரது எல்லா தரவையும் நீக்கவா?", demoAccts: "டெமோ கணக்குகள் (ஒரு நாளில் தானாக நீக்கப்படும்)", st_pending: "காத்திருப்பு", st_active: "செயலில்", st_disabled: "முடக்கம்", history: "வரலாறு", historyEmpty: "முடிந்த பட்டியல்கள் மாதவாரியாக இங்கே சேமிக்கப்படும்.", copyToList: "இப்போதைய பட்டியலில் சேர்", copied: "பட்டியலில் சேர்க்கப்பட்டது", nextTitle: "அடுத்த மாத பட்டியல்", nextNote: "இந்த மாத பட்டியல் வரலாற்றில் சேமிக்கப்படும். தேவையில்லாததை நீக்குங்கள்.", startList: "புதிய பட்டியல்", lowTag: "குறைவு", signOut: "வெளியேறு", demoNote: "டெமோ கணக்கு. ஒரு நாளில் தரவு அழியும்.", back: "பின்", search: "பொருளைத் தேடுங்கள்…", allTab: "அனைத்தும்", lowTab: "குறைவு", mineTab: "என் பொருட்கள்", done: "முடிந்தது", readList: "டைப் செய்ததை பட்டியலாக்கு", seed: "100 மாதிரி பொருட்களை ஏற்று", noMatch: "பொருள் இல்லை", min: "குறைந்தபட்சம்", addItem: "பொருள் சேர்", name: "பெயர்", unit: "அலகு", save: "சேமி", noSpeech: "இந்த உலாவியில் குரல் இல்லை. டைப் செய்யுங்கள்.",
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
function AddSheet({ t, lang, catalog, inv, listNames, onQuick, onParsed, onDone }) {
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
              {looksList && <Btn onClick={async () => setRows(await api("/api/provisions/parse", "POST", { text: q }))} className="w-full py-2.5 bg-white border-2 border-brand text-brand text-sm">✍️ {t.readList}</Btn>}
            </div>
            <div className="flex-1 overflow-auto px-4 pb-2">
              {!shown.length && <p className="text-center text-gray-400 py-8">{t.noMatch}</p>}
              <div className="grid grid-cols-3 gap-2">
                {shown.map((c) => {
                  const on = listNames.has(c.name);
                  return (
                    <button key={c.name} onClick={() => !on && onQuick(c)} className={`relative flex flex-col items-center gap-1 rounded-2xl p-3 text-center transition active:scale-95 ${on ? "bg-green-100 ring-2 ring-brand" : "bg-white shadow-sm"}`}>
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
function Home({ t, dash, onRestock }) {
  const pct = dash.list.total ? Math.round((dash.list.bought / dash.list.total) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-green-500 to-brand text-white p-5 shadow-md">
        <p className="text-sm opacity-90">{t.thisList}</p>
        <p className="text-3xl font-extrabold">{dash.list.bought}/{dash.list.total} <span className="text-base font-medium">{t.boughtOf}</span></p>
        <div className="mt-3 h-2.5 rounded-full bg-white/30"><div className="h-full rounded-full bg-white transition-all" style={{ width: pct + "%" }} /></div>
      </div>
      <section>
        <h2 className="font-bold text-lg mb-2">🔴 {t.low} <span className="text-gray-400 text-sm">({dash.low.length})</span></h2>
        {!dash.low.length && <p className="rounded-2xl bg-white p-4 text-gray-500">{t.lowEmpty}</p>}
        <div className="space-y-2">
          {dash.low.map((i) => (
            <div key={i.id} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm">
              <span className="text-3xl">{emoji(i.name, i.category)}</span>
              <div className="flex-1">
                <p className="font-semibold">{dn(i.name)}</p>
                <p className={`text-sm ${i.stock === 0 ? "text-red-600" : "text-amber-600"}`}>{fmt(i.stock)} {i.unit} {t.left} · {t.min} {fmt(i.minQty)}</p>
              </div>
              <Btn onClick={() => onRestock(i)} disabled={i.onList} className={`px-3 py-2 text-sm ${i.onList ? "bg-green-100 text-green-700" : "bg-brand text-white"}`}>{i.onList ? t.onList : t.addList}</Btn>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ListTab({ t, brand, list, setList, refresh }) {
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
    await api("/api/provisions/list/order", "PUT", { ids }); refresh();
  };
  const qty = async (i, q) => { setList({ ...list, items: list.items.map((x) => (x.id === i.id ? { ...x, qty: q } : x)) }); await api(`/api/provisions/list/items/${i.id}`, "PATCH", { qty: q }); };
  const del = async (i) => setList(await api(`/api/provisions/list/items/${i.id}`, "DELETE"));
  const toggle = async (i) => { setList(await api(`/api/provisions/list/items/${i.id}/bought`, "POST", {})); refresh(); };
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

function Stock({ t, items, refresh, onSeed }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", unit: "kg", minQty: 1 });
  const patch = async (i, body) => { await api(`/api/provisions/inventory/${i.id}`, "PATCH", body); refresh(); };
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
          <span className="flex-1"><span className="block font-bold">{monthOf(h.closedAt)}</span><span className="text-sm text-gray-500">{h.count} {t.items} · {h.bought} {t.boughtOf}</span></span>
          <span className="text-gray-300 text-xl">›</span>
        </button>
      ))}
    </div>
  );
}

// ---------- admin ----------
function Admin({ t }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => api("/api/admin/users").then(setData).catch((e) => setErr(e.message)), []);
  useEffect(() => { load(); }, [load]);
  const act = async (fn) => { try { await fn(); await load(); } catch (e) { setErr(e.message); } };
  const set = (u, status) => act(() => api(`/api/admin/users/${u.id}`, "PATCH", { status }));
  const del = (u) => confirm(t.confirmDel.replace("{n}", u.name)) && act(() => api(`/api/admin/users/${u.id}`, "DELETE"));
  if (err) return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>;
  if (!data) return <p className="text-center text-gray-400 py-6">…</p>;
  const pending = data.users.filter((u) => u.status === "pending").length;
  const badge = { pending: "bg-amber-100 text-amber-800", active: "bg-green-100 text-green-800", disabled: "bg-gray-200 text-gray-600" };
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">{data.users.length} {t.users} · {pending} {t.waiting}</p>
      {data.users.map((u) => (
        <div key={u.id} className={`rounded-2xl bg-white p-3 shadow-sm ${u.status === "pending" ? "ring-2 ring-amber-300" : ""}`}>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0"><p className="font-bold truncate">{u.name} {u.role === "admin" && "👑"}</p><p className="text-sm text-gray-500">{u.phone} · {new Date(u.createdAt).toLocaleDateString("en-IN")}</p></div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge[u.status]}`}>{t["st_" + u.status]}</span>
          </div>
          {u.role !== "admin" && (
            <div className="flex gap-2 mt-2.5">
              {u.status !== "active" && <Btn onClick={() => set(u, "active")} className="flex-1 py-2 bg-brand text-white text-sm">{u.status === "pending" ? t.approve : t.enable}</Btn>}
              {u.status === "active" && <Btn onClick={() => set(u, "disabled")} className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm">{t.disable}</Btn>}
              {u.status === "pending" && <Btn onClick={() => set(u, "disabled")} className="flex-1 py-2 bg-gray-100 text-gray-700 text-sm">{t.reject}</Btn>}
              <Btn onClick={() => del(u)} className="px-4 py-2 bg-red-50 text-red-600 text-sm">{t.del}</Btn>
            </div>
          )}
        </div>
      ))}
      {data.demoCount > 0 && <p className="text-xs text-gray-400 text-center pt-2">{data.demoCount} {t.demoAccts}</p>}
    </div>
  );
}

function More({ t, brand, user, onLogout, onCopied }) {
  const [view, setView] = useState(null);
  if (view) return (
    <div className="space-y-3">
      <Btn onClick={() => setView(null)} className="text-brand px-1">← {t.back}</Btn>
      {view === "history" ? <History t={t} brand={brand} onCopied={onCopied} /> : <Admin t={t} />}
    </div>
  );
  const Row2 = ({ icon, label, onClick, danger }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm text-left font-semibold active:scale-[.99] ${danger ? "text-red-600" : ""}`}><span className="text-2xl">{icon}</span><span className="flex-1">{label}</span><span className="text-gray-300 text-xl">›</span></button>
  );
  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="font-bold text-lg">{user.name}</p><p className="text-sm text-gray-500">{user.isDemo ? t.demoNote : user.phone}</p></div>
      <Row2 icon="🗓️" label={t.history} onClick={() => setView("history")} />
      {user.role === "admin" && <Row2 icon="👑" label={t.adminUsers} onClick={() => setView("admin")} />}
      <Row2 icon="🚪" label={t.signOut} onClick={onLogout} danger />
    </div>
  );
}

// ---------- landing page + sign in / sign up / demo ----------
const FEATURES = {
  en: [
    ["📝", "Smart shopping list", "Pick from 100+ common items or type “2 kg rice, 1 litre oil”. Drag to arrange the list the way your shop is laid out."],
    ["💬", "Send on WhatsApp", "One tap sends a clean, numbered list to your provision shop. No more writing it out every month."],
    ["📦", "Home stock tracker", "Know what is left in the kitchen. Items running low show up on your dashboard with an Add to list button."],
    ["🗓️", "Monthly history", "Every month's list is saved. Start next month's list from last month's in a few taps."],
    ["🌐", "Tamil and English", "Switch language any time. Item names show in Tamil too."],
    ["🔒", "Private to your family", "Your lists and stock belong to your account only."],
  ],
  ta: [
    ["📝", "எளிய பொருள் பட்டியல்", "100+ பொதுவான பொருட்களில் தேர்ந்தெடுக்கவும் அல்லது “2 கிலோ அரிசி, 1 லிட்டர் எண்ணெய்” என்று டைப் செய்யவும். கடையின் வரிசைப்படி இழுத்து அமைக்கலாம்."],
    ["💬", "வாட்ஸ்அப்பில் அனுப்புங்கள்", "ஒரே தட்டலில் அழகான எண்ணிட்ட பட்டியல் மளிகைக் கடைக்குச் செல்லும். இனி ஒவ்வொரு மாதமும் எழுத வேண்டாம்."],
    ["📦", "வீட்டு இருப்பு கண்காணிப்பு", "சமையலறையில் என்ன மீதம் உள்ளது என்று தெரியும். குறைந்த பொருட்கள் முகப்பில் ‘பட்டியலில் சேர்’ பொத்தானுடன் தோன்றும்."],
    ["🗓️", "மாதாந்திர வரலாறு", "ஒவ்வொரு மாத பட்டியலும் சேமிக்கப்படும். சில தட்டலில் அடுத்த மாத பட்டியலை தொடங்கலாம்."],
    ["🌐", "தமிழ் மற்றும் ஆங்கிலம்", "எப்போது வேண்டுமானாலும் மொழியை மாற்றலாம். பொருட்களின் பெயர்கள் தமிழிலும் தெரியும்."],
    ["🔒", "உங்கள் குடும்பத்திற்கு மட்டும்", "உங்கள் பட்டியல்கள் மற்றும் இருப்பு உங்கள் கணக்கிற்கு மட்டுமே சொந்தம்."],
  ],
};
const STEPS = {
  en: [["1", "Make your list", "Tap + and choose items"], ["2", "Send to the shop", "Share on WhatsApp"], ["3", "Tick off and relax", "Stock updates itself"]],
  ta: [["1", "பட்டியல் தயாரிக்கவும்", "+ தட்டி பொருட்களைத் தேர்ந்தெடுக்கவும்"], ["2", "கடைக்கு அனுப்பவும்", "வாட்ஸ்அப்பில் பகிரவும்"], ["3", "டிக் செய்து நிம்மதியாக இருங்கள்", "இருப்பு தானாக மாறும்"]],
};
const MOCK = [["🍚", "Rice", "அரிசி", "5 kg"], ["🛢️", "Cooking Oil", "சமையல் எண்ணெய்", "1 L"], ["🍬", "Sugar", "சர்க்கரை", "1 kg"], ["🫘", "Toor Dal", "துவரம் பருப்பு", "1 kg"], ["🥚", "Eggs", "முட்டை", "12 pcs"]];

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
          <span className="text-xl font-extrabold text-brand truncate">🛒 {brand.name}</span>
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
          <div className="rounded-[2rem] bg-white p-4 shadow-2xl border-4 border-green-900/10 rotate-1">
            <p className="font-bold text-brand mb-2">{brand.name}</p>
            {MOCK.map(([e, en, ta, q], i) => (
              <div key={en} className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 mb-1.5">
                <span className={`w-5 h-5 rounded-full border-2 ${i < 2 ? "bg-brand border-brand" : "border-green-300"}`} /><span className="text-xl">{e}</span>
                <span className={`flex-1 text-sm font-semibold ${i < 2 ? "line-through text-gray-400" : ""}`}>{lang === "ta" ? ta : en}</span><span className="text-xs text-gray-500">{q}</span>
              </div>
            ))}
            <div className="mt-3 rounded-xl bg-[#25D366] text-white text-center font-bold py-2.5 text-sm">💬 {t.send}</div>
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

// ---------- app ----------
function Main({ user, brand, onLogout, lang, onLang }) {
  const [tab, setTab] = useState("home");
  const [list, setList] = useState({ items: [] });
  const [dash, setDash] = useState({ low: [], list: { total: 0, bought: 0 } });
  const [inv, setInv] = useState([]);
  const [mic, setMic] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [err, setErr] = useState("");
  const t = T[lang];
  LANG = lang;

  const refresh = useCallback(async () => {
    try { const [l, d, i] = await Promise.all([api("/api/provisions/list"), api("/api/provisions/dashboard"), api("/api/provisions/inventory")]); setList(l); setDash(d); setInv(i); setErr(""); }
    catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { api("/api/provisions/catalog").then((c) => { CAT = Object.fromEntries(c.map((x) => [x.name, x])); setCatalog(c); }).catch(() => {}); refresh(); }, [refresh]);
  useEffect(() => { document.title = brand.name || document.title; }, [brand]);

  const addRows = async (rows) => { setList(await api("/api/provisions/list/items", "POST", { items: rows })); setMic(false); setTab("list"); refresh(); };
  const quick = async (c) => { setList(await api("/api/provisions/list/items", "POST", { items: [{ name: c.name, qty: Math.max(c.min || 0, step(c.unit)), unit: c.unit }] })); refresh(); };
  const seed = async () => { if (confirm(t.seed + "?")) { await api("/api/provisions/inventory/seed", "POST", {}); refresh(); } };
  const closePicker = () => { setMic(false); setTab("list"); };
  const restock = async (i) => { await api("/api/provisions/list/items", "POST", { items: [{ name: i.name, itemId: i.id, qty: Math.max(i.minQty * 2 - i.stock, step(i.unit)), unit: i.unit }] }); refresh(); };

  const Tab = ({ id, icon, label }) => (
    <button onClick={() => setTab(id)} className={`flex-1 flex flex-col items-center py-2 ${tab === id ? "text-brand font-bold" : "text-gray-400"}`}>
      <span className="text-2xl leading-none">{icon}</span><span className="text-xs mt-0.5">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen max-w-xl mx-auto pb-28 text-gray-800">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-green-50/90 backdrop-blur" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <div><h1 className="text-xl font-extrabold text-brand leading-tight">{brand.name}</h1></div>
        <LangToggle lang={lang} onLang={onLang} />
      </header>
      <main className="px-4 pt-2">
        {user.isDemo && <p className="mb-3 rounded-xl bg-amber-50 p-2.5 text-center text-xs text-amber-800">{t.demoNote}</p>}
        {err && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
        {tab === "home" && <Home t={t} dash={dash} onRestock={restock} />}
        {tab === "list" && <ListTab t={t} brand={brand} list={list} setList={setList} refresh={refresh} />}
        {tab === "more" && <More t={t} brand={brand} user={user} onLogout={onLogout} onCopied={refresh} />}
        {tab === "stock" && <Stock t={t} items={inv} refresh={refresh} onSeed={seed} />}
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-green-100" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-xl mx-auto flex items-end">
          <Tab id="home" icon="🏠" label={t.home} />
          <Tab id="list" icon="📋" label={t.list} />
          <div className="flex-1 flex justify-center"><Btn onClick={() => setMic(true)} className="-mt-8 w-16 h-16 rounded-full bg-brand text-white text-4xl font-light shadow-xl ring-4 ring-green-50" aria-label="add">＋</Btn></div>
          <Tab id="stock" icon="📦" label={t.stock} />
          <Tab id="more" icon="☰" label={t.more} />
        </div>
      </nav>
      {mic && <AddSheet t={t} lang={lang} catalog={catalog} inv={inv} listNames={new Set(list.items.filter((i) => !i.bought).map((i) => i.name))} onQuick={quick} onParsed={addRows} onDone={closePicker} />}
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
  return <Main key={user.id} user={user} brand={brand} onLogout={logout} lang={lang} onLang={onLang} />;
}
