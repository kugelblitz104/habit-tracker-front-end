import type { Page } from '@playwright/test';

import { appHeader, expect, signInThroughForm, test } from '../fixtures/test';

/**
 * The real login flow — the one thing the rest of the suite stops covering the
 * moment it switches to token injection (`signIn` in `fixtures/test.ts`).
 *
 * These tests take the `account` fixture, NOT `authedPage`: they must start from
 * a genuinely signed-out browser. That also means no golden dataset is imported,
 * so the app lands on the empty "Personal" profile registration created — which
 * is fine, nothing here asserts on data.
 */

const AUTH_KEYS = ['access_token', 'refresh_token', 'user', 'active_profile'] as const;

const storedKeys = (page: Page) =>
    page.evaluate(
        (keys) => Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])),
        AUTH_KEYS as unknown as string[]
    );

test('signing in through the form lands on the app', async ({ page, account }) => {
    await signInThroughForm(page, account);

    await expect(page).toHaveURL(/\/$/);
    await expect(appHeader(page)).toBeVisible();
    // The profile pill carries the auto-created profile's name, which only
    // renders once /profiles/ has resolved with the new token.
    await expect(page.getByRole('button', { name: /Personal/ })).toBeVisible();

    const stored = await storedKeys(page);
    expect(stored.access_token).toBeTruthy();
    expect(stored.refresh_token).toBeTruthy();
    // `authorize()` re-fetches the user from /users/me rather than decoding it
    // out of the token, so this is the API's record, not a client-side guess.
    expect(JSON.parse(stored.user!).username).toBe(account.username);
    // Never written by the login path itself — auth-context heals it to
    // `profiles[0]` once the list loads.
    expect(stored.active_profile).toBe(String(account.personalProfileId));
});

test('a wrong password shows an error and stays on /login', async ({ page, account }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill(account.username);
    await page.getByLabel('Password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(
        page.getByText('Login failed. Please check your credentials and try again.', {
            exact: true
        })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    // A 401 on /auth/login must NOT be treated as an expired session: with no
    // refresh token in storage the axios interceptor has to fall through and
    // reject, leaving the form in place rather than bouncing anywhere.
    const stored = await storedKeys(page);
    expect(stored.access_token).toBeNull();
    expect(stored.user).toBeNull();
    // The button returns to its idle label, so the form is retryable.
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('logging out clears all four storage keys and returns to login', async ({ page, account }) => {
    await signInThroughForm(page, account);
    // Wait for `active_profile` to have been healed in, otherwise "cleared" could
    // be true simply because it was never written.
    await expect(page.getByRole('button', { name: /Personal/ })).toBeVisible();
    const before = await storedKeys(page);
    for (const key of AUTH_KEYS) {
        expect(before[key], `${key} should be set before logout`).toBeTruthy();
    }

    await page.getByRole('button', { name: /Personal/ }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    // Logout is confirmed through a MODAL, unlike the connection rows' inline
    // confirm — signing out by accident is expensive. (Asserted via its copy
    // rather than the `dialog` role: Headless UI's panel is mid-transition here
    // and reports as hidden for a beat.)
    await expect(page.getByText('Are you sure that you want to log out?')).toBeVisible();
    await page.getByRole('button', { name: 'Log Out' }).click();

    await expect(page).toHaveURL(/\/login$/);
    const after = await storedKeys(page);
    for (const key of AUTH_KEYS) {
        expect(after[key], `${key} should be cleared by logout`).toBeNull();
    }
    // `active_profile` in particular: leaving it behind would leak this user's
    // profile selection into whoever logs in next on this browser.
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('a protected route redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/tasks');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    // The app shell never renders — no nav tabs, no profile pill. (The auth card
    // has a `<header>` of its own, so the `banner` role is NOT a useful signal
    // for "the app header is absent".)
    await expect(page.getByRole('link', { name: 'Today' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Search' })).toHaveCount(0);
});

test('an access_token with no `user` key leaves the app signed out', async ({ page, account }) => {
    // The silent no-op `fixtures/test.ts` exists to avoid: `isAuthenticated` is
    // `!!token && !!user`, so a token on its own never authenticates, and
    // `initAuth` then wipes the token on the way to /login. A spec that injected
    // only the token would look like a redirect bug rather than a missing key.
    await page.addInitScript((accessToken) => {
        localStorage.setItem('access_token', accessToken);
    }, account.accessToken);

    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    // initAuth clears the unusable token rather than leaving it to 401 later.
    const stored = await storedKeys(page);
    expect(stored.access_token).toBeNull();
    expect(stored.user).toBeNull();
});
