import { VitePWA } from "vite-plugin-pwa";

import { displayName, description } from "../package.json";

const pwa = () =>
  VitePWA({
    registerType: "autoUpdate",
    injectRegister: "script-defer",
    manifestFilename: "manifest.webmanifest",
    manifest: {
      id: "/",
      name: displayName,
      short_name: displayName,
      description,
      theme_color: "#fafafa",
      background_color: "#fafafa",
      start_url: "/",
      lang: "en-US",
      orientation: "natural",
      display_override: ["window-controls-overlay"],
      categories: ["education"],
      icons: [
        {
          src: "pwa-64x64.png",
          sizes: "64x64",
          type: "image/png"
        },
        {
          src: "pwa-192x192.png",
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: "maskable-icon.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ],
      screenshots: [
        {
          src: "screenshot.png",
          sizes: "1024x520",
          type: "image/png",
          form_factor: "wide",
          label: description
        },
        {
          src: "screenshot.png",
          sizes: "1024x520",
          type: "image/png",
          form_factor: "narrow",
          label: description
        }
      ]
    },
    workbox: {
      disableDevLogs: true,
      maximumFileSizeToCacheInBytes: 30 * 1024 * 1024,
      runtimeCaching: [
        {
          urlPattern: /\.(?:onnx|wasm)$/,
          handler: "CacheFirst",
          options: {
            cacheName: "stt-model-cache",
            expiration: {
              maxEntries: 5,
              maxAgeSeconds: 30 * 24 * 60 * 60
            }
          }
        }
      ]
    },
    devOptions: {
      enabled: true,
      type: "module"
    }
  });

export default pwa;
