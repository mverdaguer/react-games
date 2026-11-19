import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./scripts/screenshots",
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
    },
  ],
  webServer: {
    command: "pnpm build && pnpm preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
