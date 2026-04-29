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
import "remixicon/fonts/remixicon.css";
import { initMonitoring } from "./utils/monitoring";

initMonitoring();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
