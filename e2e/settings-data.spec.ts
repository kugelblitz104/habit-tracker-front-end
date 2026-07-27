import { expect, request as pwRequest, test, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Click-tests the extended Manage data + Danger zone settings: per-entity JSON
 * export and profile-scoped bulk delete for entity types beyond habits.
 *   register + seed (project, task, countdown) via the API  ->  log in
 *   ->  export "Countdowns" (download + validate the sliced JSON)
 *   ->  "Delete all countdowns" through the confirm modal, assert the toast.
 *
 * Self-contained: creates its own user each run. Requires the backend at
 * API_BASE; the frontend dev server comes from playwright.config's webServer.
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

    const countdown = await api.post('/countdowns/', {
        headers,
        data: { profile_id: profileId, title: 'E2E countdown', target_date: '2030-01-01' }
    });
    expect(countdown.ok(), `countdown seed failed: ${countdown.status()}`).toBeTruthy();

    return { username, password };
}

async function login(page: import('@playwright/test').Page, seed: Seeded) {
    await page.goto('/login');
    await page.getByLabel('Username').fill(seed.username);
    await page.getByLabel('Password').fill(seed.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test('per-entity export and profile-scoped bulk delete in settings', async ({ page }) => {
    const api = await pwRequest.newContext({ baseURL: API_BASE });
    const seed = await seedAccount(api);
    await api.dispose();

    await login(page, seed);
    await page.goto('/settings');

    // Every entity's profile-scoped bulk-delete button renders under "This profile".
    for (const name of [
        'Delete all tasks',
        'Delete all projects',
        'Delete all countdowns',
        'Delete all time entries',
        'Delete all habits',
        'Delete all trackers'
    ]) {
        await expect(page.getByRole('button', { name })).toBeVisible();
    }

    // Per-entity JSON export: download and validate the sliced document.
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Countdowns', exact: true }).click()
    ]);
    const savePath = path.join(os.tmpdir(), `e2e-${download.suggestedFilename()}`);
    await download.saveAs(savePath);
    const doc = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
    expect(doc.format).toBe('habit-tracker-countdowns-export');
    expect(doc.count).toBe(1);
    expect(doc.countdowns.length).toBe(1);
    expect(doc.countdowns[0].title).toBe('E2E countdown');

    // Bulk delete: open the confirm modal, confirm, assert the count toast.
    await page.getByRole('button', { name: 'Delete all countdowns' }).click();
    await expect(page.getByText(/Delete all countdowns in/i)).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(/Deleted 1 countdowns/)).toBeVisible({
        timeout: 15_000
    });
});
