import { defineConfig, devices } from "@playwright/test";

// Chromium preinstalado en el entorno; se puede sobrescribir con CHROMIUM_PATH.
const EXECUTABLE = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "off",
    screenshot: "only-on-failure",
    launchOptions: { executablePath: EXECUTABLE, args: ["--no-sandbox"] },
  },
  projects: [
    { name: "api", testMatch: /api\.spec\.ts/, use: { baseURL: BASE_URL } },
    { name: "desktop", testMatch: /ui\.spec\.ts/, use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: EXECUTABLE, args: ["--no-sandbox"] } } },
    { name: "mobile", testMatch: /responsive\.spec\.ts/, use: { ...devices["Pixel 5"], launchOptions: { executablePath: EXECUTABLE, args: ["--no-sandbox"] } } },
  ],
  webServer: {
    command: "npx next start -p 3000",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { RATE_LIMIT_FACTOR: "200" },
  },
});
