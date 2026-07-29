import { expect, type APIRequestContext } from '@playwright/test';

import { buildGoldenProfile } from './golden-profile';

/**
 * Node-side backend helpers. These talk to the API directly with Playwright's
 * `APIRequestContext` — never through the browser — so a test can arrive at a
 * screen with known data without clicking its way there.
 */

export const API_BASE = process.env.E2E_API_BASE || 'http://localhost:8080';

/** The shape `auth-context` stores under the `user` localStorage key. */
export type StoredUser = {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    created_date: string;
    updated_date?: string | null;
};

export type Account = {
    userId: number;
    username: string;
    password: string;
    accessToken: string;
    refreshToken: string;
    user: StoredUser;
    /** The auto-created "Personal" profile from registration. */
    personalProfileId: number;
};

const PASSWORD = 'password123!';

/**
 * Register a throwaway user.
 *
 * `POST /auth/register` has no verification gate — it returns a usable token
 * pair immediately and creates a default "Personal" profile in the same
 * transaction. The username carries a timestamp+random suffix because nothing
 * cleans the dev database between runs if a teardown is ever missed.
 */
export const register = async (api: APIRequestContext): Promise<Account> => {
    const uniq = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const username = `e2e_${uniq}`;

    const registration = await api.post('/auth/register', {
        data: {
            username,
            email: `${username}@example.com`,
            first_name: 'E2E',
            last_name: 'Test',
            plaintext_password: PASSWORD
        }
    });
    expect(
        registration.ok(),
        `register failed: ${registration.status()} ${await registration.text()}`
    ).toBeTruthy();
    const { access_token: accessToken, refresh_token: refreshToken } = await registration.json();

    const headers = { Authorization: `Bearer ${accessToken}` };

    // Fetch the user exactly as `authorize()` does, so the injected localStorage
    // value is byte-identical to what a real UI login would have stored.
    const me = await api.get('/users/me', { headers });
    expect(me.ok(), `GET /users/me failed: ${me.status()}`).toBeTruthy();
    const user: StoredUser = await me.json();

    const profiles = await api.get('/profiles/', { headers });
    expect(profiles.ok(), `GET /profiles/ failed: ${profiles.status()}`).toBeTruthy();
    const personalProfileId: number = (await profiles.json()).profiles[0].id;

    return {
        userId: user.id,
        username,
        password: PASSWORD,
        accessToken,
        refreshToken,
        user,
        personalProfileId
    };
};

export type ImportSummary = {
    success: boolean;
    profile_id: number;
    profile_name: string;
    projects_imported: number;
    tasks_imported: number;
    subtasks_imported: number;
    countdowns_imported: number;
    time_entries_imported: number;
    habits_imported: number;
    trackers_imported: number;
    warnings: string[];
};

/**
 * Import the golden dataset, returning the summary.
 *
 * Note `POST /backup/profiles` (no trailing slash, unlike the entity routes)
 * ALWAYS creates a new profile — it never restores into an existing one. So the
 * account ends up with two profiles, and the caller must point `active_profile`
 * at the returned id; `profiles[0]` is still the empty "Personal".
 */
export const importGoldenProfile = async (
    api: APIRequestContext,
    account: Account,
    anchor: Date
): Promise<ImportSummary> => {
    const response = await api.post('/backup/profiles', {
        headers: { Authorization: `Bearer ${account.accessToken}` },
        data: buildGoldenProfile(anchor)
    });
    expect(
        response.ok(),
        `golden profile import failed: ${response.status()} ${await response.text()}`
    ).toBeTruthy();

    const summary: ImportSummary = await response.json();
    // A tracker whose habit_id doesn't resolve is skipped with a warning rather
    // than failing the request, so a silently-partial import would otherwise look
    // like a pass here.
    expect(summary.warnings, `import warnings: ${summary.warnings.join('; ')}`).toEqual([]);
    return summary;
};

/**
 * Delete the user, and with it every profile-scoped row (all `profile_id` FKs
 * are ON DELETE CASCADE). Best-effort: a teardown failure must not mask the
 * test's own result, so this reports rather than throws.
 */
export const deleteUser = async (api: APIRequestContext, account: Account): Promise<void> => {
    const response = await api.delete(`/users/${account.userId}`, {
        headers: { Authorization: `Bearer ${account.accessToken}` }
    });
    if (!response.ok()) {
        console.warn(
            `[e2e teardown] failed to delete user ${account.userId} (${account.username}): ` +
                `${response.status()} ${await response.text()}`
        );
    }
};

/** Authorization header for ad-hoc per-spec seeding. */
export const authHeaders = (account: Account): Record<string, string> => ({
    Authorization: `Bearer ${account.accessToken}`
});
