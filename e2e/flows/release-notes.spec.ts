import { expect, gotoAppRoute, test } from '../fixtures/test';
import type { Page } from '@playwright/test';

/**
 * The unlisted /release-notes route: a signed-out visitor holding the URL can
 * read it (it is the one non-auth page that isn't a form), the Settings card is
 * a working way in (it is the only link to it anywhere), and the pager steps
 * backwards through the history.
 *
 * Nothing here imports the release data. That module is built on
 * `import.meta.glob`, which only exists once Vite has transformed it, and Playwright
 * compiles specs with esbuild, so the import would be `undefined` at runtime.
 * The expected version is read off the page instead, which also keeps the spec
 * from needing an edit every time a release is added.
 */

const SEMVER = /^\d+\.\d+\.\d+$/;

const releaseHeading = (page: Page) => page.getByRole('heading', { name: SEMVER });
const pager = (page: Page) => page.getByRole('navigation', { name: 'Release history' });

/** The `1 of 3` counter, as numbers. */
const position = async (page: Page): Promise<{ index: number; total: number }> => {
    const text = await pager(page)
        .getByText(/^\d+ of \d+$/)
        .innerText();
    const [index, total] = text.split(' of ').map(Number);
    return { index: index!, total: total! };
};

test('a signed-out visitor can read the newest release', async ({ page }) => {
    // A raw `page`, deliberately: no `signIn`, nothing in localStorage.
    await page.goto('/release-notes');

    await expect(releaseHeading(page)).toBeVisible();

    // The protected routes bounce to /login; this one must not.
    await expect(page).toHaveURL(/\/release-notes$/);

    // It opens on the newest release, so there is nothing newer to step to.
    const { index } = await position(page);
    expect(index).toBe(1);
    await expect(pager(page).getByRole('button', { name: 'Newer' })).toBeDisabled();
});

test('the pager steps backwards through the history', async ({ page }) => {
    await page.goto('/release-notes');
    await expect(releaseHeading(page)).toBeVisible();

    const newest = await releaseHeading(page).innerText();
    const { total } = await position(page);
    const older = pager(page).getByRole('button', { name: 'Older' });

    // Branching on `total` so this stays honest as releases accumulate: with a
    // single release there is genuinely nothing to page to, and asserting either
    // shape unconditionally would be wrong half the life of the page.
    if (total === 1) {
        await expect(older).toBeDisabled();
        return;
    }

    await older.click();
    await expect(releaseHeading(page)).not.toHaveText(newest);
    expect((await position(page)).index).toBe(2);

    await pager(page).getByRole('button', { name: 'Newer' }).click();
    await expect(releaseHeading(page)).toHaveText(newest);
    expect((await position(page)).index).toBe(1);
});

test('settings links to the release notes it names', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/settings');

    // The About card's version must be the release the page opens on.
    const settingsVersion = await authedPage.getByText(/^v\d+\.\d+\.\d+$/).innerText();
    await authedPage.getByRole('link', { name: 'Release notes' }).click();

    await expect(authedPage).toHaveURL(/\/release-notes$/);
    await expect(releaseHeading(authedPage)).toHaveText(settingsVersion.slice(1));
});
