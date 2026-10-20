// Light / dark / follow-the-phone. The choice is remembered on this device. New visitors start in light.
const KEY = "theme";
export const getMode = () => localStorage.getItem(KEY) || "light";
export const isDark = (mode) => mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

export function applyMode(mode) {
  const dark = isDark(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    if (!meta.dataset.light) meta.dataset.light = meta.getAttribute("content");
    meta.setAttribute("content", dark ? "#0e0f12" : meta.dataset.light);
  }
}

export function saveMode(mode) {
  localStorage.setItem(KEY, mode);
  applyMode(mode);
}
