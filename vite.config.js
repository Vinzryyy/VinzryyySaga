import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
});
