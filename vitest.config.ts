import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Unit-test config, deliberately separate from `vite.config.ts`.
 *
 * The app config loads the `reactRouter()` plugin, which runs route typegen and
 * expects the full app environment; pulling it into a test run is both slow and
 * fragile. Only `tsconfigPaths` is needed here, to resolve the `@/` alias.
 *
 * File-suffix convention, since both runners live in this repo:
 *   *.test.ts  -> vitest   (pure logic, no DOM, no backend)
 *   *.spec.ts  -> Playwright (e2e, in ./e2e)
 */
export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        // Every target module is pure — no jsdom/happy-dom needed.
        environment: 'node',
        include: ['src/**/*.test.ts'],
        // `e2e/` is Playwright's; never let vitest pick those up.
        exclude: ['node_modules', 'build', '.react-router', 'e2e'],
        reporters: ['default']
    }
});
