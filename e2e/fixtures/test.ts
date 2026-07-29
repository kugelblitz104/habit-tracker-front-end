import {
    expect,
    request,
    test as base,
    type APIRequestContext,
    type Page
} from '@playwright/test';

import { anchorNow } from './clock';
import { API_BASE, deleteUser, importGoldenProfile, register, type Account } from './api';
import { GOLDEN_PROFILE_NAME } from './golden-profile';

/**
 * The shared e2e fixture. Import `test` and `expect` from here, never from
 * `@playwright/test` directly, so every spec gets the same seeded account,
 * frozen clock and teardown.
 */

type Fixtures = {
    /** Backend client, authenticated as nobody — for registration and seeding. */
    api: APIRequestContext;
    /** The throwaway account this test owns, deleted afterwards. */
    account: Account;
    /** The instant the test is pinned to. See `clock.ts`. */
    anchor: Date;
    /** The imported golden profile's id — what `active_profile` is set to. */
    goldenProfileId: number;
    /** A page already signed in, on the golden profile, with the clock frozen. */
    authedPage: Page;
};

export const test = base.extend<Fixtures>({
    api: async ({ playwright }, use) => {
        const context = await playwright.request.newContext({ baseURL: API_BASE });
        await use(context);
        await context.dispose();
    },

    anchor: async ({}, use) => {
        await use(anchorNow());
    },

    account: async ({ api }, use) => {
        const account = await register(api);
        await use(account);
        // Runs even when the test fails, which is what stops the dev database
        // accumulating a user per run.
        await deleteUser(api, account);
    },

    goldenProfileId: async ({ api, account, anchor }, use) => {
        const summary = await importGoldenProfile(api, account, anchor);
        expect(summary.profile_name).toBe(GOLDEN_PROFILE_NAME);
        await use(summary.profile_id);
    },

    authedPage: async ({ page, account, anchor, goldenProfileId }, use) => {
        await signIn(page, account, anchor, goldenProfileId);
        await use(page);
    }
});

export { expect };

/**
 * Put the browser in a signed-in state without driving the login form.
 *
 * Three things here are load-bearing:
 *
 *  1. **`addInitScript`, not `goto` then `evaluate`.** SSR is on, so every
 *     protected route server-renders as `LoadingPage`, hydrates, and only then
 *     does `initAuth` read localStorage. The keys have to exist before hydration.
 *  2. **`user` is written, not just the token.** `isAuthenticated` is
 *     `!!token && !!user`; with a token but no `user` key, `initAuth` wipes the
 *     token and stays signed out — a silent no-op that looks like a redirect bug.
 *  3. **`active_profile` is set explicitly.** It self-heals to `profiles[0]`,
 *     but that is the empty "Personal" from registration — the golden data lives
 *     in the profile the backup import created.
 *
 * `refresh_token` is included so a 401 mid-test takes the refresh path rather
 * than falling through to a rejected promise with no redirect.
 */
export const signIn = async (
    page: Page,
    account: Account,
    anchor: Date,
    profileId: number
): Promise<void> => {
    // Before any navigation, so no script ever observes a moving clock.
    await page.clock.setFixedTime(anchor);

    await page.addInitScript(
        ([user, accessToken, refreshToken, activeProfile]) => {
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);
            localStorage.setItem('user', user);
            localStorage.setItem('active_profile', activeProfile);
        },
        [
            JSON.stringify(account.user),
            account.accessToken,
            account.refreshToken,
            String(profileId)
        ] as const
    );
};

/** Sign in through the login form — for the auth spec, which must cover the real flow. */
export const signInThroughForm = async (page: Page, account: Account): Promise<void> => {
    await page.goto('/login');
    await page.getByLabel('Username').fill(account.username);
    await page.getByLabel('Password').fill(account.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/);
};

/**
 * The sticky application header. `.first()` because several pages render their
 * own `<header>` for the page title block, so `banner` matches more than once —
 * the app header is always the outer one.
 */
export const appHeader = (page: Page) => page.getByRole('banner').first();

/**
 * Navigate and wait for the route to be past its loading state.
 *
 * Every protected route renders `LoadingPage` server-side and fetches only after
 * hydration, so `waitForLoadState('load')` lands too early — the DOM is a
 * spinner. Waiting for the app header's nav is the cheapest reliable signal that
 * the shell has hydrated and auth resolved; individual specs then wait on their
 * own content.
 */
export const gotoAppRoute = async (page: Page, path: string): Promise<void> => {
    await page.goto(path);
    await expect(appHeader(page)).toBeVisible();
};
