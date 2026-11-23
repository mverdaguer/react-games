import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "src"),
    },
  },
  // Prebundle these so the browser test server does not reload mid-run.
  // A reload on CI left the Pang iframe uninitialized until its 60s timeout.
  optimizeDeps: {
    include: ["react-dom/client", "react-router", "vitest-browser-react"],
  },
  server: process.env.VITEST
    ? {}
    : {
        // `/api`, `/api/...`, and `/api?...` go to the Worker. `/apiary` stays with the SPA.
        proxy: {
          "^/api(?:[/?]|$)": "http://localhost:8787",
        },
      },
  // Preview has no Worker. An empty proxy stops Vite from inheriting the dev
  // proxy, so /api falls through to index.html and the panel shows unavailable.
  preview: {
    proxy: {},
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "worker/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "browser",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./src/test/setup.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
})
