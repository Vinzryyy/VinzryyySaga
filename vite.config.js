import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";

// Dev-only plugin: serves api/*.js as if Vercel was hosting them, so
// /api/arme-chat (and friends) work under `npm run dev` without needing
// `vercel dev` in a second terminal. Production still goes through
// real Vercel functions — this plugin is a no-op outside dev.
//
// Loads .env.local into process.env so handlers can read OPENROUTER_API_KEY
// the same way they do on Vercel (Vite normally only exposes VITE_* to
// the client via import.meta.env, never to process.env).
const vercelApiDev = (envFromVite) => ({
  name: "armeniaca-vercel-api-dev",
  apply: "serve",
  configureServer(server) {
    // Mirror .env.local entries into process.env so api handlers can
    // read non-VITE_ secrets (OPENROUTER_API_KEY, etc.) without each
    // handler having to load dotenv. Vercel injects these at runtime
    // in production; we replicate that locally.
    for (const [k, v] of Object.entries(envFromVite || {})) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
    const apiDir = path.resolve(server.config.root, "api");
    server.middlewares.use(async (req, res, next) => {
      if (!req.url || !req.url.startsWith("/api/")) return next();
      const [pathname, search = ""] = req.url.split("?");
      const route = pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
      if (!route) return next();
      const filePath = path.join(apiDir, `${route}.js`);
      if (!fs.existsSync(filePath)) return next();

      try {
        // Cache-bust on every request so edits to api/*.js take effect
        // without restarting the dev server.
        const mod = await import(
          `${pathToFileURL(filePath).href}?t=${Date.now()}`
        );

        // Parse JSON body for POST/PUT/PATCH. Best-effort — empty body
        // → req.body = {}.
        if (["POST", "PUT", "PATCH"].includes(req.method)) {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            req.body = raw ? JSON.parse(raw) : {};
          } catch {
            req.body = {};
          }
        }

        // Parse query params Vercel-style: req.query = { key: string }
        const params = new URLSearchParams(search);
        req.query = Object.fromEntries(params);

        // Vercel-style res helpers — .status(code).json(payload), etc.
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (payload) => {
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify(payload));
          return res;
        };
        const origSetHeader = res.setHeader.bind(res);
        res.setHeader = (name, value) => origSetHeader(name, value);

        await mod.default(req, res);
      } catch (err) {
        console.error(`[vercelApiDev] ${route} threw:`, err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(JSON.stringify({ error: err.message || "handler crashed" }));
        }
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  // Load all env (no prefix filter) so process.env can pick up
  // OPENROUTER_API_KEY and other server-side secrets for api/ handlers
  // during local dev.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      tailwindcss(),
      vercelApiDev(env),
      visualizer({
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    server: {
      port: 3821,
      strictPort: true,
    },
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            firebase: ["firebase/app", "firebase/database"],
            helmet: ["react-helmet-async"],
            // Three.js + R3F + drei dibundle eksplisit ke chunk vendor
            // sendiri. Tanpa ini, auto-chunking nempelin lib 3D ke shared
            // component pertama yang ke-pick (e.g. RotateRecommendation) →
            // chunk ~977KB dengan nama menyesatkan. Eksplisit-ny vendor
            // chunk juga bikin cache stabil: update app code gak invalidate
            // vendor Three.js (jarang berubah).
            "three-vendor": [
              "three",
              "@react-three/fiber",
              "@react-three/drei",
              "@react-three/postprocessing",
            ],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.js",
      css: false,
    },
  };
});
