import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
// Self-hosted fonts replace the render-blocking Google Fonts @import
// previously in index.css. Only the weights actually used in the
// design tokens are pulled in to keep the bundle lean.
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/800.css";
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import { initMonitoring } from "./utils/monitoring";

initMonitoring();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
