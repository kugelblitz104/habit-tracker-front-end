import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GOLDEN } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * Click-tests the extended Manage data + Danger zone settings: per-entity JSON
 * export and profile-scoped bulk delete for entity types beyond habits.
 *   golden profile  ->  export "Countdowns" (download + validate the sliced JSON)
 *   ->  "Delete all countdowns" through the confirm modal, assert the toast.
 *
 * The counts below are the golden dataset's four countdowns, so the export and
 * the delete are checked against a known figure rather than "more than zero".
 */

test('per-entity export and profile-scoped bulk delete in settings', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/settings');

    // Every entity's profile-scoped bulk-delete button renders under "This profile".
    for (const name of [
        'Delete all tasks',
        'Delete all projects',
        'Delete all countdowns',
        'Delete all time entries',
        'Delete all habits',
        'Delete all trackers'
    ]) {
        await expect(authedPage.getByRole('button', { name })).toBeVisible();
    }

    // Per-entity JSON export: download and validate the sliced document.
    const [download] = await Promise.all([
        authedPage.waitForEvent('download'),
        authedPage.getByRole('button', { name: 'Countdowns', exact: true }).click()
    ]);
    const savePath = path.join(os.tmpdir(), `e2e-${download.suggestedFilename()}`);
    await download.saveAs(savePath);
    const doc = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
    expect(doc.format).toBe('habit-tracker-countdowns-export');
    expect(doc.count).toBe(4);
    expect(doc.countdowns.length).toBe(4);
    expect(doc.countdowns.map((countdown: { title: string }) => countdown.title).sort()).toEqual(
        [
            GOLDEN.countdowns.future,
            GOLDEN.countdowns.linked,
            GOLDEN.countdowns.past,
            GOLDEN.countdowns.yearly
        ].sort()
    );

    // Bulk delete: open the confirm modal, confirm, assert the count toast.
    await authedPage.getByRole('button', { name: 'Delete all countdowns' }).click();
    await expect(authedPage.getByText(/Delete all countdowns in/i)).toBeVisible();
    await authedPage.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(authedPage.getByText('Deleted 4 countdowns')).toBeVisible();
});
