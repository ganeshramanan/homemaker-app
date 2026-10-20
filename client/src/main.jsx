import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { applyMode, getMode } from "./theme.js";

// Apply the saved (or phone) theme before the first paint, and follow the phone while the choice is "system".
applyMode(getMode());
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (getMode() === "system") applyMode("system"); });

createRoot(document.getElementById("root")).render(<App />);
