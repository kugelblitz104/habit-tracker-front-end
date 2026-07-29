import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { GOLDEN_PROFILE_NAME } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, test } from '../fixtures/test';

/**
 * End-to-end round trip for the Full backup settings card:
 *   golden profile  ->  export it (download + validate the JSON)
 *   ->  import that same file back  ->  assert it lands as a new profile.
 *
 * The active profile is the imported golden one, so the exported document must
 * carry ITS name — not the empty "Personal" profile registration creates.
 */

test('export a profile and import it back as a new profile', async ({ authedPage }) => {
    await gotoAppRoute(authedPage, '/settings');
    await expect(authedPage.getByText('Full backup', { exact: true })).toBeVisible();

    // Export: capture the download and validate the JSON document.
    const [download] = await Promise.all([
        authedPage.waitForEvent('download'),
        authedPage.getByRole('button', { name: 'Export backup' }).click()
    ]);
    const savePath = path.join(os.tmpdir(), `e2e-${download.suggestedFilename()}`);
    await download.saveAs(savePath);

    const backup = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
    expect(backup.format).toBe('habit-tracker-profile-backup');
    expect(backup.profile.name).toBe(GOLDEN_PROFILE_NAME);
    expect(backup.tasks.length).toBeGreaterThan(0);
    expect(backup.habits.length).toBeGreaterThan(0);
    expect(backup.projects.length).toBeGreaterThan(0);

    // Import the exported file back in. The name collides with the profile it
    // came from, so the server appends " (imported)" — derived from the document
    // rather than hard-coded, since the suffix only appears on a collision.
    await authedPage.getByLabel('Import profile backup JSON file').setInputFiles(savePath);
    await expect(
        authedPage.getByText(`Imported "${backup.profile.name} (imported)"`)
    ).toBeVisible();
});
