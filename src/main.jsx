import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
// Self-hosted fonts via @fontsource. Variable variants give us the full
// weight + axis range from a single woff2 each — smaller total bytes
// than loading 5+ static weights of Poppins/Playfair did, plus richer
// expressive control (Fraunces SOFT axis, opsz; Jakarta Sans weight).
//   Fraunces             — display serif for headlines
//   Plus Jakarta Sans    — body sans (Indonesian-designed, optimized
//                          for Bahasa diacritics + ng/ny ligatures)
import "@fontsource-variable/fraunces";
import "@fontsource-variable/plus-jakarta-sans";
import "./index.css";
import "./remixicon.css";
import { initMonitoring } from "./utils/monitoring";

initMonitoring();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Fade out the inline preloader once React has painted AND the splash
// has been visible for at least PRELOADER_MIN_MS (so it's a deliberate
// brand moment, not a flash). performance.now() measures ms since the
// browser began navigating — so the math accounts for time the user
// has already been looking at the splash before main.jsx executes.
const PRELOADER_MIN_MS = 800;
const hidePreloader = () => {
  const el = document.getElementById("preloader");
  if (!el) return;
  el.classList.add("is-hidden");
  // Mark splash as seen so the next route change / refresh in this
  // tab session skips it via the inline gate in index.html.
  try {
    sessionStorage.setItem("armeniaca-preloader-seen", "1");
  } catch {
    /* sessionStorage blocked — no-op, splash shows again next visit */
  }
  setTimeout(() => el.remove(), 900);
};
const scheduleHide = () => {
  const remaining = Math.max(0, PRELOADER_MIN_MS - performance.now());
  setTimeout(hidePreloader, remaining);
};
requestAnimationFrame(() => requestAnimationFrame(scheduleHide));
