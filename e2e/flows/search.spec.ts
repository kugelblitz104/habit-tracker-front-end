import { appHeader, expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * The ⌘K search palette's exits.
 *
 * On mobile the panel is full-screen (`h-[100dvh] w-full`) and there is no Esc
 * key, so without the close button the only way out is selecting a result —
 * navigating somewhere the user never asked to go. The button is `sm:hidden`,
 * so the desktop palette gains no chrome and keeps Escape; both halves are
 * asserted here.
 *
 * Clicking the backdrop does not close the palette at any width. That is
 * pre-existing behaviour, not something this spec asserts either way.
 */

const SEARCH_PLACEHOLDER = 'Search tasks, habits, projects…';

test('the close button exits the search palette on mobile @narrow', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');
    const url = authedPage.url();

    await appHeader(authedPage).getByRole('button', { name: 'Search' }).click();
    const input = authedPage.getByPlaceholder(SEARCH_PLACEHOLDER);
    await expect(input).toBeVisible();

    // The point of the button: it exits from a typed query as well as an empty
    // one, in a single tap, without selecting a result.
    await input.fill('gro');
    await authedPage.getByRole('button', { name: 'Close search' }).click();

    await expect(input).toBeHidden();
    expect(authedPage.url(), 'closing the palette must not navigate').toBe(url);

    // Reopening starts clean rather than restoring the abandoned query.
    await appHeader(authedPage).getByRole('button', { name: 'Search' }).click();
    await expect(authedPage.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue('');
});

test('the desktop palette gains no close button and still closes on Escape', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/');

    await appHeader(authedPage).getByRole('button', { name: 'Search' }).click();
    const input = authedPage.getByPlaceholder(SEARCH_PLACEHOLDER);
    await expect(input).toBeVisible();

    await expect(authedPage.getByRole('button', { name: 'Close search' })).toBeHidden();

    // Characterization, not intent: the footer hint says "esc close", but the
    // first Escape is swallowed by `ComboboxInput` closing its own option list
    // and only the second reaches the `Dialog`. Pre-existing and desktop-only,
    // so it is pinned rather than fixed here; if it is ever fixed, this becomes
    // a single press.
    await authedPage.keyboard.press('Escape');
    await expect(input).toBeVisible();
    await authedPage.keyboard.press('Escape');
    await expect(input).toBeHidden();
});
