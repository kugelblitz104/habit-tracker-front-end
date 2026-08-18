import type { APIRequestContext, Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { authHeaders, type Account } from '../fixtures/api';
import { isoDate } from '../fixtures/clock';
import { GOLDEN, GOLDEN_PROFILE_NAME } from '../fixtures/golden-profile';
import { expect, gotoAppRoute, taskRowTitle, test } from '../fixtures/test';

/**
 * Locks the client-side Markdown export on both flat task surfaces. Two things
 * are being pinned ahead of the `useTaskMarkdownExport` extraction:
 *
 *  1. The document content — heading, and only the tasks actually on screen.
 *  2. The FILENAME, because the slug comes from three separate `slugify`
 *     definitions with different fallbacks (`'tasks'` in task-markdown.ts,
 *     `'profile'` in export-tasks.ts and profile-backup.ts). All-tasks slugs the
 *     PROFILE name, the project view slugs the PROJECT name — merging the three
 *     must not quietly swap one for the other.
 */

/** Mirrors the app's slugify for the non-empty case (fallbacks differ per copy). */
const slugify = (value: string): string =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const alphaProjectId = async (
    api: APIRequestContext,
    account: Account,
    profileId: number
): Promise<number> => {
    const response = await api.get('/projects/', {
        headers: authHeaders(account),
        params: { profile_id: profileId }
    });
    expect(response.ok(), `GET /projects/ failed: ${response.status()}`).toBeTruthy();
    const { projects } = await response.json();
    const alpha = projects.find((p: { name: string }) => p.name === GOLDEN.projects.alpha);
    expect(alpha, `no project named ${GOLDEN.projects.alpha}`).toBeTruthy();
    return alpha.id as number;
};

/** Click Export, save the download and return its filename + text. */
const exportMarkdown = async (page: Page) => {
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Export', exact: true }).click()
    ]);
    const filename = download.suggestedFilename();
    const savePath = path.join(os.tmpdir(), `e2e-${filename}`);
    await download.saveAs(savePath);
    return { filename, markdown: fs.readFileSync(savePath, 'utf-8') };
};

test('the two task surfaces export distinct, correctly-named Markdown documents', async ({
    api,
    account,
    anchor,
    goldenProfileId,
    authedPage
}) => {
    const projectId = await alphaProjectId(api, account, goldenProfileId);
    // The filenames embed `toLocalDateString(new Date())`; the clock is frozen to
    // the anchor and the browser is pinned to UTC, so that is the anchor's date.
    const stamp = isoDate(anchor);

    // --- All tasks: the whole profile, slugged from the PROFILE name ------------
    await gotoAppRoute(authedPage, '/tasks');
    await expect(taskRowTitle(authedPage, GOLDEN.tasks.now)).toBeVisible();

    const all = await exportMarkdown(authedPage);
    expect(all.filename).toBe(`tasks-${slugify(GOLDEN_PROFILE_NAME)}-${stamp}.md`);
    expect(all.markdown).toContain('# All tasks — Tasks');
    // Every band, both projects and the unassigned task — the flat view's contents.
    for (const title of [
        GOLDEN.tasks.now,
        GOLDEN.tasks.soon,
        GOLDEN.tasks.whenever,
        GOLDEN.tasks.deferred,
        GOLDEN.tasks.parent,
        GOLDEN.tasks.unassigned,
        GOLDEN.tasks.estimated,
        GOLDEN.tasks.longTitle
    ]) {
        expect(all.markdown, `missing "${title}"`).toContain(`- [ ] ${title}`);
    }
    // Subtasks nest two spaces under their parent, done ones ticked.
    expect(all.markdown).toContain(`  - [ ] ${GOLDEN.tasks.subtaskOpen}`);
    expect(all.markdown).toContain(`  - [x] ${GOLDEN.tasks.subtaskDone}`);
    // The Closed section is off by default, so the closed task must NOT be in the
    // document — the export mirrors the screen, it doesn't re-query.
    expect(all.markdown).not.toContain(GOLDEN.tasks.closed);

    // --- Project view: one project, slugged from the PROJECT name ---------------
    await gotoAppRoute(authedPage, `/projects/${projectId}`);
    await expect(taskRowTitle(authedPage, GOLDEN.tasks.now)).toBeVisible();

    const project = await exportMarkdown(authedPage);
    expect(project.filename).toBe(`tasks-${slugify(GOLDEN.projects.alpha)}-${stamp}.md`);
    expect(project.markdown).toContain(`# ${GOLDEN.projects.alpha} — Tasks`);
    for (const title of [GOLDEN.tasks.now, GOLDEN.tasks.soon, GOLDEN.tasks.estimated]) {
        expect(project.markdown, `missing "${title}"`).toContain(`- [ ] ${title}`);
    }
    // Scoped to Alpha: Beta's tasks are absent.
    expect(project.markdown).not.toContain(GOLDEN.tasks.deferred);
    expect(project.markdown).not.toContain(GOLDEN.tasks.parent);

    // The whole point of keeping two slug sources: same date, different name.
    expect(project.filename).not.toBe(all.filename);
});
