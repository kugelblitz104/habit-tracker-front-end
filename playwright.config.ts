import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Tests drive the app at http://localhost:5173 against the real
 * backend (http://localhost:8080). The dev server is auto-started (and reused
 * if already running); the backend must be up separately (podman compose).
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [['list']],
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        headless: true
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
    ],
    webServer: {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000
    }
});
