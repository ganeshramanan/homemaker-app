import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const api = async (url, method = "GET", body) => {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body && JSON.stringify(body), cache: "no-store" });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
};

const T = {
  en: { home: "Home", list: "List", stock: "Stock", low: "Running low", lowEmpty: "All stocked up 🎉", addList: "Add to list", onList: "On list ✓",
    thisList: "This month's list", toBuy: "To buy", bought: "Bought", send: "Send on WhatsApp", newMonth: "Start next month's list", empty: "Your list is empty. Tap the mic and speak.",
    tap: "Tap and speak", listening: "Listening… speak now", typeHere: "Or type here, e.g. 2 kg rice, 1 litre oil", read: "Read list", addAll: "Add to list",
    cancel: "Cancel", min: "Min", addItem: "Add item", name: "Name", unit: "Unit", save: "Save", noSpeech: "Voice not supported in this browser. Please type.",
    check: "Please check these items", items: "items", boughtOf: "bought", stockEmpty: "No stock yet. Mark list items as bought and they appear here.", hello: "Namaste 🙏", left: "left" },
  ta: { home: "முகப்பு", list: "பட்டியல்", stock: "இருப்பு", low: "குறைவான பொருட்கள்", lowEmpty: "எல்லாம் இருக்கு 🎉", addList: "பட்டியலில் சேர்", onList: "சேர்க்கப்பட்டது ✓",
    thisList: "இந்த மாத பட்டியல்", toBuy: "வாங்க வேண்டியவை", bought: "வாங்கியவை", send: "வாட்ஸ்அப்பில் அனுப்பு", newMonth: "அடுத்த மாத பட்டியல்", empty: "பட்டியல் காலி. மைக்கை தட்டி பேசுங்கள்.",
    tap: "தட்டிப் பேசுங்கள்", listening: "கேட்கிறேன்… பேசுங்கள்", typeHere: "அல்லது இங்கே டைப் செய்யுங்கள்", read: "பட்டியலாக்கு", addAll: "பட்டியலில் சேர்",
    cancel: "ரத்து", min: "குறைந்தபட்சம்", addItem: "பொருள் சேர்", name: "பெயர்", unit: "அலகு", save: "சேமி", noSpeech: "இந்த உலாவியில் குரல் இல்லை. டைப் செய்யுங்கள்.",
    check: "இவற்றை சரிபாருங்கள்", items: "பொருட்கள்", boughtOf: "வாங்கியது", stockEmpty: "இருப்பு இல்லை. வாங்கியதாக குறித்தால் இங்கே வரும்.", hello: "வணக்கம் 🙏", left: "உள்ளது" },
};
const EMOJI = { Rice: "🍚", "Wheat Flour": "🌾", "Toor Dal": "🫘", "Urad Dal": "🫘", Sugar: "🍬", Salt: "🧂", "Cooking Oil": "🛢️", "Tea Powder": "🍵", "Coffee Powder": "☕", Milk: "🥛", Curd: "🥣", Eggs: "🥚", Tomato: "🍅", Onion: "🧅", Potato: "🥔", Garlic: "🧄", Coconut: "🥥", "Chilli Powder": "🌶️", "Turmeric Powder": "🟡", Tamarind: "🟤", Bread: "🍞", Soap: "🧼", Detergent: "🧺" };
const CAT_EMOJI = { Grains: "🌾", Pulses: "🫘", Grocery: "🛒", Dairy: "🥛", Vegetables: "🥬", Spices: "🌶️", Household: "🧺", Other: "📦" };
const emoji = (n, c) => EMOJI[n] ?? CAT_EMOJI[c] ?? "📦";
const UNITS = ["kg", "g", "L", "ml", "pcs", "pack", "dozen"];
const step = (u) => (u === "kg" || u === "L" ? 0.5 : u === "g" || u === "ml" ? 100 : 1);
const fmt = (n) => (Math.round(n * 100) / 100).toString();

// ---------- small pieces ----------
const Btn = ({ className = "", ...p }) => <button {...p} className={`active:scale-95 transition rounded-2xl font-semibold ${className}`} />;
const Stepper = ({ value, unit, onChange }) => (
  <div className="flex items-center gap-1">
    <Btn onClick={() => onChange(Math.max(step(unit), +(value - step(unit)).toFixed(3)))} className="w-9 h-9 bg-orange-100 text-brand text-xl">−</Btn>
    <span className="min-w-14 text-center text-sm font-bold">{fmt(value)} {unit}</span>
    <Btn onClick={() => onChange(+(value + step(unit)).toFixed(3))} className="w-9 h-9 bg-orange-100 text-brand text-xl">+</Btn>
  </div>
);

function Row({ item, t, onQty, onDelete, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 0 }}
      className={`flex items-center gap-2 bg-white rounded-2xl p-2 shadow-sm ${isDragging ? "shadow-xl ring-2 ring-brand" : ""}`}>
      <span {...attributes} {...listeners} className="px-1 text-2xl text-orange-300 touch-none select-none cursor-grab" aria-label="drag">⋮⋮</span>
      <Btn onClick={() => onToggle(item)} className="w-9 h-9 border-2 border-orange-300 text-transparent hover:text-orange-300" aria-label="bought">✓</Btn>
      <span className="text-2xl">{emoji(item.name)}</span>
      <span className="flex-1 font-semibold leading-tight">{item.name}</span>
      <Stepper value={item.qty} unit={item.unit} onChange={(q) => onQty(item, q)} />
      <Btn onClick={() => onDelete(item)} className="w-8 h-9 text-gray-300 text-lg" aria-label="delete">✕</Btn>
    </div>
  );
}

// ---------- voice sheet ----------
function MicSheet({ t, lang, onClose, onAdd }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState(null);
  const [live, setLive] = useState(false);
  const rec = useRef(null);
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = () => {
    if (!SR) return alert(t.noSpeech);
    const r = new SR();
    r.lang = lang === "ta" ? "ta-IN" : "en-IN"; r.interimResults = true; r.continuous = true;
    let base = text ? text + " " : "";
    r.onresult = (e) => { let s = ""; for (const x of e.results) s += x[0].transcript + " "; setText(base + s.trim()); };
    r.onend = () => setLive(false);
    r.onerror = () => setLive(false);
    rec.current = r; r.start(); setLive(true);
  };
  const stop = () => rec.current?.stop();
  useEffect(() => () => rec.current?.abort(), []);

  const read = async () => { rec.current?.stop(); setRows(await api("/api/parse", "POST", { text })); };
  const upd = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch, unknown: false } : r)));

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-xl mx-auto bg-orange-50 rounded-t-3xl p-4 pb-8 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        {!rows ? (
          <>
            <div className="flex flex-col items-center py-3">
              <Btn onClick={live ? stop : start} className={`w-24 h-24 rounded-full text-4xl text-white shadow-lg bg-brand ${live ? "animate-pulse ring-8 ring-orange-200" : ""}`}>🎤</Btn>
              <p className="mt-3 font-semibold text-orange-900">{live ? t.listening : t.tap}</p>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t.typeHere}
              className="w-full rounded-2xl border border-orange-200 p-3 text-lg bg-white outline-none focus:ring-2 ring-brand" />
            <div className="flex gap-2 mt-3">
              <Btn onClick={onClose} className="flex-1 py-3 bg-white text-gray-600">{t.cancel}</Btn>
              <Btn onClick={read} disabled={!text.trim()} className="flex-1 py-3 bg-brand text-white disabled:opacity-40">{t.read}</Btn>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-bold text-lg mb-2">{t.check}</h3>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-2xl bg-white p-2 ${r.unknown ? "ring-2 ring-amber-300" : ""}`}>
                  <span className="text-2xl">{emoji(r.name, r.category)}</span>
                  <input value={r.name} onChange={(e) => upd(i, { name: e.target.value })} className="flex-1 min-w-0 font-semibold outline-none" />
                  <input type="number" inputMode="decimal" value={r.qty} onChange={(e) => upd(i, { qty: +e.target.value })} className="w-16 text-center rounded-xl bg-orange-50 py-1" />
                  <select value={r.unit} onChange={(e) => upd(i, { unit: e.target.value })} className="rounded-xl bg-orange-50 py-1">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
                  <Btn onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-gray-300 px-1">✕</Btn>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Btn onClick={() => setRows(null)} className="flex-1 py-3 bg-white text-gray-600">←</Btn>
              <Btn onClick={() => onAdd(rows.map(({ unknown, category, ...r }) => r))} disabled={!rows.length} className="flex-[3] py-3 bg-brand text-white disabled:opacity-40">{t.addAll} ({rows.length})</Btn>
            </div>
          </>
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
      <div className="rounded-3xl bg-gradient-to-br from-orange-400 to-brand text-white p-5 shadow-md">
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
                <p className="font-semibold">{i.name}</p>
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
  const todo = list.items.filter((i) => !i.bought), done = list.items.filter((i) => i.bought);
  const onDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids = arrayMove(todo.map((i) => i.id), todo.findIndex((i) => i.id === active.id), todo.findIndex((i) => i.id === over.id));
    setList({ ...list, items: [...ids.map((id) => todo.find((i) => i.id === id)), ...done] });
    await api("/api/list/order", "PUT", { ids }); refresh();
  };
  const qty = async (i, q) => { setList({ ...list, items: list.items.map((x) => (x.id === i.id ? { ...x, qty: q } : x)) }); await api(`/api/list/items/${i.id}`, "PATCH", { qty: q }); };
  const del = async (i) => setList(await api(`/api/list/items/${i.id}`, "DELETE"));
  const toggle = async (i) => { setList(await api(`/api/list/items/${i.id}/bought`, "POST", {})); refresh(); };
  const share = () => {
    const lines = todo.map((i, n) => `${n + 1}. ${i.name} - ${fmt(i.qty)} ${i.unit}`).join("\n");
    const msg = `🛒 *${brand.name}*\n${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}\n\n${lines}\n\n_Sent via ${brand.name}_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };
  const next = async () => { setList(await api("/api/list/new", "POST", { copy: true })); refresh(); };

  return (
    <div className="space-y-3">
      {!list.items.length && <p className="rounded-2xl bg-white p-6 text-center text-gray-500">{t.empty}</p>}
      {!!todo.length && (
        <>
          <h2 className="font-bold">{t.toBuy} <span className="text-gray-400 text-sm">({todo.length})</span></h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={todo.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">{todo.map((i) => <Row key={i.id} item={i} t={t} onQty={qty} onDelete={del} onToggle={toggle} />)}</div>
            </SortableContext>
          </DndContext>
          <Btn onClick={share} className="w-full py-4 bg-green-500 text-white text-lg shadow-md">💬 {t.send}</Btn>
        </>
      )}
      {!!done.length && (
        <>
          <h2 className="font-bold pt-2 text-gray-500">{t.bought} ({done.length})</h2>
          <div className="space-y-1.5">
            {done.map((i) => (
              <div key={i.id} className="flex items-center gap-2 rounded-2xl bg-green-50 p-2 opacity-80">
                <Btn onClick={() => toggle(i)} className="w-9 h-9 bg-green-500 text-white">✓</Btn>
                <span className="text-xl">{emoji(i.name)}</span>
                <span className="flex-1 line-through text-gray-500">{i.name}</span>
                <span className="text-sm text-gray-500">{fmt(i.qty)} {i.unit}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {!!list.items.length && <Btn onClick={next} className="w-full py-3 border-2 border-dashed border-orange-300 text-brand">🔁 {t.newMonth}</Btn>}
    </div>
  );
}

function Stock({ t, items, refresh }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", unit: "kg", minQty: 1 });
  const patch = async (i, body) => { await api(`/api/inventory/${i.id}`, "PATCH", body); refresh(); };
  const groups = useMemo(() => items.reduce((a, i) => ((a[i.category] ??= []).push(i), a), {}), [items]);
  const save = async () => { if (!f.name.trim()) return; await api("/api/inventory", "POST", { ...f, name: f.name.trim() }); setAdding(false); setF({ name: "", unit: "kg", minQty: 1 }); refresh(); };
  return (
    <div className="space-y-4">
      {!items.length && <p className="rounded-2xl bg-white p-6 text-center text-gray-500">{t.stockEmpty}</p>}
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
                    <p className="font-semibold leading-tight">{i.name}</p>
                    <label className="text-xs text-gray-400">{t.min} <input type="number" inputMode="decimal" defaultValue={i.minQty} onBlur={(e) => +e.target.value !== i.minQty && patch(i, { minQty: +e.target.value })} className="w-12 rounded bg-orange-50 text-center text-gray-600" /></label>
                  </div>
                  <Btn onClick={() => patch(i, { delta: -step(i.unit) })} className="w-9 h-9 bg-orange-100 text-brand text-xl">−</Btn>
                  <span className={`min-w-16 text-center font-bold ${low ? "text-red-600" : ""}`}>{fmt(i.stock)} {i.unit}</span>
                  <Btn onClick={() => patch(i, { delta: step(i.unit) })} className="w-9 h-9 bg-orange-100 text-brand text-xl">+</Btn>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {adding ? (
        <div className="rounded-2xl bg-white p-3 space-y-2 shadow">
          <input autoFocus placeholder={t.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="w-full rounded-xl bg-orange-50 p-2.5" />
          <div className="flex gap-2">
            <select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className="flex-1 rounded-xl bg-orange-50 p-2.5">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
            <input type="number" inputMode="decimal" value={f.minQty} onChange={(e) => setF({ ...f, minQty: +e.target.value })} className="w-24 rounded-xl bg-orange-50 p-2.5 text-center" />
          </div>
          <div className="flex gap-2">
            <Btn onClick={() => setAdding(false)} className="flex-1 py-2.5 bg-gray-100">{t.cancel}</Btn>
            <Btn onClick={save} className="flex-1 py-2.5 bg-brand text-white">{t.save}</Btn>
          </div>
        </div>
      ) : <Btn onClick={() => setAdding(true)} className="w-full py-3 border-2 border-dashed border-orange-300 text-brand">＋ {t.addItem}</Btn>}
    </div>
  );
}

// ---------- app ----------
export default function App() {
  const [brand, setBrand] = useState({ name: "", tagline: "" });
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");
  const [tab, setTab] = useState("home");
  const [list, setList] = useState({ items: [] });
  const [dash, setDash] = useState({ low: [], list: { total: 0, bought: 0 } });
  const [inv, setInv] = useState([]);
  const [mic, setMic] = useState(false);
  const [err, setErr] = useState("");
  const t = T[lang];

  const refresh = useCallback(async () => {
    try { const [l, d, i] = await Promise.all([api("/api/list"), api("/api/dashboard"), api("/api/inventory")]); setList(l); setDash(d); setInv(i); setErr(""); }
    catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { api("/api/brand").then(setBrand).catch(() => {}); refresh(); }, [refresh]);
  useEffect(() => { document.title = brand.name || document.title; }, [brand]);
  const toggleLang = () => { const n = lang === "en" ? "ta" : "en"; setLang(n); localStorage.setItem("lang", n); };

  const addRows = async (rows) => { setList(await api("/api/list/items", "POST", { items: rows })); setMic(false); setTab("list"); refresh(); };
  const restock = async (i) => { await api("/api/list/items", "POST", { items: [{ name: i.name, itemId: i.id, qty: Math.max(i.minQty * 2 - i.stock, step(i.unit)), unit: i.unit }] }); refresh(); };

  const Tab = ({ id, icon, label }) => (
    <button onClick={() => setTab(id)} className={`flex-1 flex flex-col items-center py-2 ${tab === id ? "text-brand font-bold" : "text-gray-400"}`}>
      <span className="text-2xl leading-none">{icon}</span><span className="text-xs mt-0.5">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen max-w-xl mx-auto pb-28 text-gray-800">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-orange-50/90 backdrop-blur" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <div><h1 className="text-xl font-extrabold text-brand leading-tight">{brand.name}</h1><p className="text-xs text-gray-500">{t.hello}</p></div>
        <Btn onClick={toggleLang} className="px-3 py-1.5 bg-white shadow-sm text-sm border border-orange-200">{lang === "en" ? "தமிழ்" : "English"}</Btn>
      </header>
      <main className="px-4 pt-2">
        {err && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">⚠️ {err}</p>}
        {tab === "home" && <Home t={t} dash={dash} onRestock={restock} />}
        {tab === "list" && <ListTab t={t} brand={brand} list={list} setList={setList} refresh={refresh} />}
        {tab === "stock" && <Stock t={t} items={inv} refresh={refresh} />}
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-orange-100" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-xl mx-auto flex items-end">
          <Tab id="home" icon="🏠" label={t.home} />
          <Tab id="list" icon="📋" label={t.list} />
          <div className="flex-1 flex justify-center"><Btn onClick={() => setMic(true)} className="-mt-8 w-16 h-16 rounded-full bg-brand text-white text-3xl shadow-xl ring-4 ring-orange-50" aria-label="mic">🎤</Btn></div>
          <Tab id="stock" icon="📦" label={t.stock} />
          <div className="flex-1" />
        </div>
      </nav>
      {mic && <MicSheet t={t} lang={lang} onClose={() => setMic(false)} onAdd={addRows} />}
    </div>
  );
}
