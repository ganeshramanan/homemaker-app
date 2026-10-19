// Rule-based voice-text -> list rows. English, Tanglish and Tamil script.
// [name, category, defaultUnit, minQty, aliases]
export const DICTIONARY = [
  ["Rice", "Grains", "kg", 1, "rice|arisi|அரிசி"],
  ["Wheat Flour", "Grains", "kg", 1, "wheat|atta|godhumai|கோதுமை"],
  ["Toor Dal", "Pulses", "kg", 0.5, "toor dal|tur dal|thuvaram paruppu|dal paruppu|பருப்பு"],
  ["Urad Dal", "Pulses", "kg", 0.5, "urad dal|ulundu|ulutham|உளுந்து"],
  ["Sugar", "Grocery", "kg", 0.5, "sugar|sakkarai|சர்க்கரை"],
  ["Salt", "Grocery", "kg", 0.5, "salt|uppu|உப்பு"],
  ["Cooking Oil", "Grocery", "L", 0.5, "oil|ennai|ennei|எண்ணெய்"],
  ["Tea Powder", "Grocery", "pack", 1, "tea|tea powder|tea thool|டீ"],
  ["Coffee Powder", "Grocery", "pack", 1, "coffee|coffee powder|காபி"],
  ["Milk", "Dairy", "L", 1, "milk|paal|பால்"],
  ["Curd", "Dairy", "pack", 1, "curd|thayir|தயிர்"],
  ["Eggs", "Dairy", "pcs", 6, "egg|eggs|muttai|முட்டை"],
  ["Tomato", "Vegetables", "kg", 0.5, "tomato|thakkali|தக்காளி"],
  ["Onion", "Vegetables", "kg", 1, "onion|vengayam|வெங்காயம்"],
  ["Potato", "Vegetables", "kg", 0.5, "potato|urulai|urulaikizhangu|உருளை"],
  ["Garlic", "Vegetables", "g", 100, "garlic|poondu|பூண்டு"],
  ["Coconut", "Vegetables", "pcs", 1, "coconut|thengai|தேங்காய்"],
  ["Chilli Powder", "Spices", "g", 100, "chilli powder|chilli|milagai|milagaithool|மிளகாய்"],
  ["Turmeric Powder", "Spices", "g", 50, "turmeric|manjal|மஞ்சள்"],
  ["Tamarind", "Spices", "g", 250, "tamarind|puli|புளி"],
  ["Bread", "Grocery", "pack", 1, "bread"],
  ["Soap", "Household", "pcs", 2, "soap"],
  ["Detergent", "Household", "pack", 1, "detergent|washing powder"],
];

const ALIAS = {};
for (const [name, category, unit, , al] of DICTIONARY)
  for (const a of al.split("|")) ALIAS[a.trim()] = { name, category, unit };

const NUM = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, twenty: 20,
  half: 0.5, quarter: 0.25, onru: 1, ondru: 1, oru: 1, rendu: 2, irandu: 2, moonu: 3, moondru: 3, naalu: 4, nangu: 4,
  anju: 5, aindhu: 5, aaru: 6, ezhu: 7, yezhu: 8, ettu: 8, onbathu: 9, pathu: 10, arai: 0.5, kaal: 0.25,
  ஒன்று: 1, ஒரு: 1, இரண்டு: 2, மூன்று: 3, நான்கு: 4, ஐந்து: 5, ஆறு: 6, ஏழு: 7, எட்டு: 8, ஒன்பது: 9, பத்து: 10, அரை: 0.5, கால்: 0.25,
};
const UNIT = {
  kg: "kg", kilo: "kg", kilos: "kg", kgs: "kg", கிலோ: "kg",
  g: "g", gm: "g", gram: "g", grams: "g", கிராம்: "g",
  l: "L", ltr: "L", litre: "L", liter: "L", litres: "L", liters: "L", லிட்டர்: "L",
  ml: "ml", pack: "pack", packet: "pack", packets: "pack", pkt: "pack", பாக்கெட்: "pack",
  pcs: "pcs", piece: "pcs", pieces: "pcs", nos: "pcs", dozen: "dozen",
};
const STOP = new Set(("and also add need want please i we to buy get of the a an ok okay kindly more " +
  "வேண்டும் மற்றும் வாங்க venum vendum matrum mattrum ku").split(" "));

export function parseList(text = "") {
  const toks = text.toLowerCase().replace(/[.,;]+(\s|$)/g, " ").split(/[\s,;]+/).filter(Boolean);
  const out = [];
  let pend = { qty: null, unit: null };
  let last = null;
  const fill = (row, p) => { row.qty = p.qty; row.unit = p.unit; };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    let hit = i + 1 < toks.length ? ALIAS[t + " " + toks[i + 1]] : null;
    if (hit) i++; else hit = ALIAS[t];
    const n = /^\d+\/\d+$/.test(t) ? t.split("/").reduce((a, b) => a / b)
      : /^\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NUM[t];
    if (hit) {
      const row = { name: hit.name, category: hit.category, defUnit: hit.unit, qty: null, unit: null };
      if (pend.qty != null || pend.unit) { fill(row, pend); pend = { qty: null, unit: null }; last = null; }
      else last = row;
      out.push(row);
    } else if (n !== undefined) {
      if (last && last.qty == null) last.qty = n; else pend.qty = n;
    } else if (UNIT[t]) {
      if (last && !last.unit && last.qty != null) { last.unit = UNIT[t]; last = null; } else pend.unit = UNIT[t];
    } else if (!STOP.has(t)) {
      const row = { name: t[0].toUpperCase() + t.slice(1), category: "Other", defUnit: "pcs", qty: null, unit: null, unknown: true };
      if (pend.qty != null || pend.unit) { fill(row, pend); pend = { qty: null, unit: null }; last = null; }
      else last = row;
      out.push(row);
    }
  }
  return out.map(({ defUnit, ...r }) => ({ ...r, qty: r.qty ?? 1, unit: r.unit ?? defUnit }));
}
