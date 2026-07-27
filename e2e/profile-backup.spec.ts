import { expect, request as pwRequest, test, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * End-to-end round trip for the Full backup settings card:
 *   register a fresh account + seed data via the API  ->  log in through the UI
 *   ->  export the profile (download + validate the JSON)  ->  import that file
 *   ->  assert it lands as a new "(imported)" profile.
 *
 * Self-contained: it creates its own user each run, so it needs no fixture
 * account. Requires the backend up at API_BASE (podman compose); the frontend
 * dev server is started by playwright.config's webServer.
 */

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:8080';

type Seeded = { username: string; password: string };

async function seedAccount(api: APIRequestContext): Promise<Seeded> {
    const uniq = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const username = `e2e_${uniq}`;
    const password = 'password123!';
    const reg = await api.post('/auth/register', {
        data: {
            username,
            email: `${username}@example.com`,
            first_name: 'E2E',
            last_name: 'Test',
            plaintext_password: password
        }
    });
    expect(reg.ok(), `register failed: ${reg.status()}`).toBeTruthy();
    const { access_token } = await reg.json();
    const headers = { Authorization: `Bearer ${access_token}` };

    const profiles = await (await api.get('/profiles/', { headers })).json();
    const profileId: number = profiles.profiles[0].id;

    const project = await api.post('/projects/', {
        headers,
        data: { profile_id: profileId, name: 'E2E Project', color: '#3366cc' }
    });
    expect(project.ok()).toBeTruthy();
    const projectId: number = (await project.json()).id;

    const task = await api.post('/tasks/', {
        headers,
        data: { profile_id: profileId, title: 'E2E seeded task', project_id: projectId }
    });
    expect(task.ok()).toBeTruthy();

    const habit = await api.post('/habits/', {
        headers,
        data: {
            profile_id: profileId,
            name: 'E2E habit',
            question: 'Did you test today?',
            color: '#e0763f',
            frequency: 1,
            range: 1
        }
    });
    expect(habit.ok()).toBeTruthy();

    return { username, password };
}

async function login(page: import('@playwright/test').Page, seed: Seeded) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(seed.username);
    await page.getByLabel('Password').fill(seed.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    // Lands on the app; wait until we're off the login route.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test('export a profile and import it back as a new profile', async ({ page }) => {
    const api = await pwRequest.newContext({ baseURL: API_BASE });
    const seed = await seedAccount(api);
    await api.dispose();

    await login(page, seed);

    await page.goto('/settings');
    await expect(page.getByText('Full backup')).toBeVisible();

    // Export: capture the download and validate the JSON document.
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Export backup' }).click()
    ]);
    const savePath = path.join(os.tmpdir(), `e2e-${download.suggestedFilename()}`);
    await download.saveAs(savePath);

    const backup = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
    expect(backup.format).toBe('habit-tracker-profile-backup');
    expect(backup.profile.name).toBe('Personal');
    expect(backup.tasks.length).toBeGreaterThan(0);
    expect(backup.habits.length).toBeGreaterThan(0);
    expect(backup.projects.length).toBeGreaterThan(0);

    // Import the exported file back in; it should become a new "(imported)"
    // profile and the success toast reports that name.
    await page
        .getByLabel('Import profile backup JSON file')
        .setInputFiles(savePath);
    await expect(
        page.getByText(/Imported "Personal \(imported\)"/)
    ).toBeVisible({ timeout: 15_000 });
});
