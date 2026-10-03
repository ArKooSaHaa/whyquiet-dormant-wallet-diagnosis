import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:5173" },
  webServer: [
    { command: "cd .. && uv run uvicorn src.api.main:app --port 8008", url: "http://localhost:8008/api/health", reuseExistingServer: true, timeout: 60000 },
    { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true, timeout: 60000 },
  ],
});
