import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config. Tests drive the app at http://localhost:5173 against the real
 * backend (http://localhost:8080). The dev server is auto-started (and reused
 * locally if already running); the backend must be up separately (podman compose).
 *
 * Specs come in three groups under ./e2e:
 *   fixtures/  — the shared `authedPage` fixture + golden dataset (no tests)
 *   flows/     — behavioural specs
 *   structure/ — className / aria-structure locks
 *
 * Determinism (see e2e/fixtures/clock.ts for the full reasoning):
 *  - `timezoneId` is pinned to UTC so the browser's "today" matches the API
 *    container's clock. The tasks router computes bands from `date.today()` and
 *    accepts no `tz` param, while habits/users/calendar do — so on any machine
 *    whose local date differs from UTC those two disagree by a day. Pinning UTC
 *    removes the split rather than papering over it.
 *  - `locale` is pinned because `Intl` formatting feeds visible date and weekday
 *    strings that specs assert on.
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_BASE = process.env.E2E_API_BASE || 'http://localhost:8080';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    // Serial for now: every test creates its own user, so parallelism is safe in
    // principle, but the dev Postgres is shared with the backend pytest suite.
    // Raise this once the suite has proven stable.
    workers: 1,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
    // Previously hand-written as `{ timeout: 15_000 }` on individual assertions:
    // every protected route server-renders as LoadingPage and only fetches after
    // hydration, so first content genuinely takes a moment.
    expect: { timeout: 15_000 },
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        headless: true,
        timezoneId: 'UTC',
        locale: 'en-US'
    },
    projects: [
        {
            // Everything except the explicitly narrow specs.
            name: 'wide',
            use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
            grepInvert: /@narrow/
        },
        {
            // Only specs tagged @narrow. The detail panes and the pane-aware page
            // shell behave differently below lg, so those are separate tests
            // rather than the same test run at two widths.
            name: 'narrow',
            use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
            grep: /@narrow/
        }
    ],
    webServer: {
        command: 'npm run dev',
        url: BASE_URL,
        // `__API_BASE_URL__` is a BUILD-TIME Vite define, so a reused dev server
        // keeps whatever API base it was started with — passing it here only
        // takes effect for a server this config actually starts.
        env: { API_BASE_URL: API_BASE },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
    }
});
