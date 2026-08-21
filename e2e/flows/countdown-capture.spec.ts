import type { APIRequestContext } from '@playwright/test';

import { authHeaders, type Account } from '../fixtures/api';
import { dayFrom } from '../fixtures/clock';
import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * The countdown page's quick-add capture bar (`CountdownCaptureBar`, with its
 * `>date` / `@group` token grammar) and its inline expanded form
 * (`CountdownCaptureForm`). Enter creates directly only when a `>date` parsed
 * and any typed `@group` matched an existing one; everything else, including a
 * bare title, expands into the form instead.
 *
 * No assertion here depends on a time of day: the target date is always derived
 * from the `anchor` fixture (never hardcoded), and the one exact-date assertion
 * is checked through the API rather than the UI's rendered date format.
 */

const CAPTURE_LABEL = 'Add a countdown';
const FRIDAY = 5;

/**
 * ISO date of the next Friday at/after the anchor, mirroring the app's own
 * weekday-token resolution (`src/lib/date-tokens.ts`). Computed in UTC to match
 * the browser's pinned timezone, the same way `dayFrom` does.
 */
const nextFriday = (anchor: Date): string => {
    const delta = (FRIDAY - anchor.getUTCDay() + 7) % 7 || 7;
    return dayFrom(anchor, delta);
};

type CountdownRow = { id: number; title: string; target_date: string; category_id: number | null };

const findCountdown = async (
    api: APIRequestContext,
    account: Account,
    profileId: number,
    title: string
): Promise<CountdownRow | undefined> => {
    const response = await api.get('/countdowns/', {
        headers: authHeaders(account),
        params: { profile_id: profileId }
    });
    expect(response.ok(), `list countdowns: ${response.status()}`).toBeTruthy();
    const countdowns: CountdownRow[] = (await response.json()).countdowns;
    return countdowns.find((c) => c.title === title);
};

const findCategoryId = async (
    api: APIRequestContext,
    account: Account,
    profileId: number,
    name: string
): Promise<number | undefined> => {
    const response = await api.get('/countdown-categories/', {
        headers: authHeaders(account),
        params: { profile_id: profileId }
    });
    expect(response.ok(), `list countdown categories: ${response.status()}`).toBeTruthy();
    const categories: { id: number; name: string }[] = (await response.json()).categories;
    return categories.find((c) => c.name === name)?.id;
};

test('`Dentist >fri` on Enter creates a countdown dated that Friday', async ({
    api,
    account,
    goldenProfileId,
    anchor,
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/countdown');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Dentist >fri');
    await input.press('Enter');

    await expect(authedPage.getByText('Countdown created')).toBeVisible();
    await expect(authedPage.getByText('Dentist', { exact: true })).toBeVisible();

    const created = await findCountdown(api, account, goldenProfileId, 'Dentist');
    expect(created, 'the created countdown should be in the list').toBeTruthy();
    expect(created!.target_date).toBe(nextFriday(anchor));
});

test('a bare `Dentist` on Enter opens the inline form instead of creating, with the title pre-filled and no new card in the grid', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/countdown');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Dentist');
    await input.press('Enter');

    await expect(authedPage.getByLabel('Countdown title')).toHaveValue('Dentist');
    await expect(authedPage.getByRole('button', { name: 'Add countdown' })).toBeDisabled();
    // No date means nothing could have been created: no card by this title exists.
    await expect(authedPage.getByText('Dentist', { exact: true })).toHaveCount(0);
});

test('`Dentist >fri @<existing group>` on Enter creates it in that group', async ({
    api,
    account,
    goldenProfileId,
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/countdown');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill(`Dentist >fri @${GOLDEN.countdownGroups.family}`);
    await input.press('Enter');

    await expect(authedPage.getByText('Countdown created')).toBeVisible();

    const created = await findCountdown(api, account, goldenProfileId, 'Dentist');
    const familyId = await findCategoryId(
        api,
        account,
        goldenProfileId,
        GOLDEN.countdownGroups.family
    );
    expect(
        familyId,
        `${GOLDEN.countdownGroups.family} should exist in the golden import`
    ).toBeTruthy();
    expect(created?.category_id).toBe(familyId);
});

test('`Dentist >fri @Nonexistent` on Enter opens the form with the group create row pre-filled with `Nonexistent`', async ({
    authedPage
}) => {
    await gotoAppRoute(authedPage, '/countdown');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Dentist >fri @Nonexistent');
    await input.press('Enter');

    await expect(authedPage.getByLabel('Countdown title')).toHaveValue('Dentist');
    await expect(authedPage.getByLabel('New group name')).toHaveValue('Nonexistent');
});

test('the X on a token pill removes that token from the input text', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/countdown');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill(`Dentist @${GOLDEN.countdownGroups.family}`);

    await authedPage
        .getByRole('button', { name: `Remove @${GOLDEN.countdownGroups.family}` })
        .click();

    await expect(input).toHaveValue('Dentist');
});

test('Escape in the form collapses it and creates nothing', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/countdown');

    const input = authedPage.getByRole('textbox', { name: CAPTURE_LABEL });
    await input.fill('Should not be created');
    await input.press('Enter');

    const titleField = authedPage.getByLabel('Countdown title');
    await expect(titleField).toHaveValue('Should not be created');
    await titleField.press('Escape');

    await expect(authedPage.getByRole('textbox', { name: CAPTURE_LABEL })).toBeVisible();
    await expect(authedPage.getByText('Should not be created', { exact: true })).toHaveCount(0);
});
