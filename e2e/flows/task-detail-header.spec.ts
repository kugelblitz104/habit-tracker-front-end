import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, taskRowTitle, test } from '../fixtures/test';

/**
 * The rewritten detail-panel header (task-row-redesign, §5): the "Needs
 * attention" block with its reason chips, and the labelled meta row. Nothing
 * else in the suite asserts any of these words, so a regression here (an
 * invalid-HTML hydration error, a missing background token, a wrong reason)
 * would ship unnoticed.
 */

/**
 * A pre-existing, app-wide SSR/CSS-ordering hydration warning (the
 * react-toastify stylesheet's `__html` content differs in whitespace between
 * the server and client render) fires on every route, unrelated to anything
 * this spec touches. Filtered out so a genuine regression — e.g. the
 * `<div>`-in-`<p>` bug this spec exists to catch — isn't masked by it.
 */
const isKnownUnrelatedHydrationNoise = (message: string): boolean =>
    message.includes('A tree hydrated but some attributes of the server rendered HTML');

test('the attention block shows its label and reasons for a flagged task', async ({
    authedPage
}) => {
    const errors: string[] = [];
    authedPage.on('console', (msg) => {
        if (msg.type() === 'error' && !isKnownUnrelatedHydrationNoise(msg.text())) {
            errors.push(msg.text());
        }
    });
    authedPage.on('pageerror', (err) => errors.push(err.message));

    await gotoAppRoute(authedPage, '/');

    // priority 3, so computeBand === 'now' and the attention block renders.
    await taskRowTitle(authedPage, GOLDEN.tasks.now).click();

    const pane = authedPage.getByRole('complementary');
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.now, exact: true })).toBeVisible();

    await expect(pane.getByText('Needs attention')).toBeVisible();
    await expect(pane.getByText('High priority')).toBeVisible();

    // Labels render uppercase via CSS only; their text content is title case.
    await expect(pane.getByText('Status', { exact: true })).toBeVisible();
    await expect(pane.getByText('Open', { exact: true })).toBeVisible();
    await expect(pane.getByText('Priority', { exact: true })).toBeVisible();
    await expect(pane.getByText('High', { exact: true })).toBeVisible();

    expect(errors, `no console/page errors, got: ${errors.join('; ')}`).toEqual([]);
});

test('a task that is not flagged renders no "Needs attention" block', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/');

    // priority 2, no due/scheduled date, Open — computeBand === 'soon', not
    // 'now'. (Not `tasks.whenever`: that band is collapsed by default on
    // Today, so its row isn't clickable without expanding the section first.)
    await taskRowTitle(authedPage, GOLDEN.tasks.soon).click();

    const pane = authedPage.getByRole('complementary');
    await expect(pane.getByRole('heading', { name: GOLDEN.tasks.soon, exact: true })).toBeVisible();

    await expect(pane.getByText('Needs attention')).toHaveCount(0);
});
