import type { Page } from '@playwright/test';

import { expect, gotoAppRoute, test } from '../fixtures/test';
import { GOLDEN, GOLDEN_HABIT_SLUGS } from '../fixtures/golden-profile';

/**
 * The habit reminder's time and weekdays in `HabitFormFields`: both controls
 * appear only while the Reminder switch is on, the last selected day cannot be
 * cleared (the API rejects an empty mask), and a saved schedule survives a
 * reload and shows as a chip in the detail header.
 */

const openEditor = async (page: Page) => {
    await gotoAppRoute(page, `/habits/${GOLDEN_HABIT_SLUGS.daily}`);
    await expect(page.getByRole('heading', { name: GOLDEN.habits.daily })).toBeVisible();
    await page.getByRole('button', { name: 'Edit habit' }).click();
};

const dayButton = (page: Page, name: string) =>
    page.getByRole('group', { name: 'Reminder days' }).getByRole('button', { name });

test('a saved reminder time and days survive a reload and show in the header', async ({
    authedPage
}) => {
    await openEditor(authedPage);
    // The golden daily habit has its reminder off.
    await authedPage.getByRole('switch', { name: 'Reminder' }).click();
    await authedPage.getByLabel('Reminder time').fill('07:15');
    await dayButton(authedPage, 'Saturday').click();
    await dayButton(authedPage, 'Sunday').click();
    await authedPage.getByRole('button', { name: 'Save', exact: true }).click();

    await authedPage.reload();
    await expect(authedPage.getByText('Reminder 07:15 weekdays')).toBeVisible();

    await authedPage.getByRole('button', { name: 'Edit habit' }).click();
    await expect(authedPage.getByLabel('Reminder time')).toHaveValue('07:15');
    await expect(dayButton(authedPage, 'Monday')).toHaveAttribute('aria-pressed', 'true');
    await expect(dayButton(authedPage, 'Saturday')).toHaveAttribute('aria-pressed', 'false');
});

test('the controls unmount while the reminder is off and come back with their values', async ({
    authedPage
}) => {
    await openEditor(authedPage);
    const reminder = authedPage.getByRole('switch', { name: 'Reminder' });
    const time = authedPage.getByLabel('Reminder time');

    await expect(time).toHaveCount(0);
    await reminder.click();
    await time.fill('21:30');
    await dayButton(authedPage, 'Friday').click();

    await reminder.click();
    await expect(time).toHaveCount(0);
    await expect(authedPage.getByRole('group', { name: 'Reminder days' })).toHaveCount(0);

    await reminder.click();
    await expect(time).toHaveValue('21:30');
    await expect(dayButton(authedPage, 'Friday')).toHaveAttribute('aria-pressed', 'false');
});

test('the last selected day cannot be cleared', async ({ authedPage }) => {
    await openEditor(authedPage);
    await authedPage.getByRole('switch', { name: 'Reminder' }).click();

    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
        await dayButton(authedPage, day).click();
    }

    const sunday = dayButton(authedPage, 'Sunday');
    await expect(sunday).toHaveAttribute('aria-pressed', 'true');
    await expect(sunday).toBeDisabled();
});

test('@touch the day toggles meet the 24px floor and the 44px coarse height', async ({
    authedPage
}) => {
    // `wide` runs every untagged-narrow spec, and its fine pointer never gets the 44px bump.
    test.skip(test.info().project.name !== 'touch', 'coarse-pointer project only');
    // target-size.spec.ts never opens the habit editor, so these are measured here.
    await openEditor(authedPage);
    await authedPage.getByRole('switch', { name: 'Reminder' }).click();

    for (const day of ['Monday', 'Sunday']) {
        const box = await dayButton(authedPage, day).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(24);
        expect(box!.height).toBeGreaterThanOrEqual(44);
    }
});
