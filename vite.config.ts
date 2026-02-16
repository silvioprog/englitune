import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { beasties } from "vite-plugin-beasties";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { env, html, pwa } from "./vite-plugins";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    env(),
    html(),
    react(),
    tailwindcss(),
    beasties({ options: { pruneSource: false } }),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm",
          dest: "."
        }
      ]
    }),
    pwa()
  ],
  worker: {
    format: "es"
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  }
});
