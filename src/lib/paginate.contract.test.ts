import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every offset-paged endpoint must be walked to completion, because the UI
 * filters these lists in memory: a truncated page reads as missing data, not
 * as page one of many.
 *
 * The set of offset-paged endpoints is derived from the generated client rather
 * than listed here, so regenerating against a new paged endpoint extends this
 * test with no edit.
 */

const SERVICES_DIR = 'src/api/services';
const SEARCH_ROOTS = readdirSync('src', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'api')
    .map((entry) => join('src', entry.name));

/**
 * Files allowed to call an offset-paged endpoint without `pagedList`, each with
 * the reason it is bounded on purpose.
 */
const BOUNDED_READS: Record<string, string> = {
    'src/features/tasks/api/get-closed-tasks.ts':
        'Infinite scroll for a disclosure that is collapsed by default and mounts on three screens. It renders the count as "100+" and offers Load more, so it reports its own partiality instead of hiding it.'
};

/**
 * The offset-paged methods found in the generated client as of 2026-08-17.
 * A regen that adds a paged endpoint is expected to fail the assertion below;
 * the fix is to give the new method a paged caller, then add its name here.
 */
const EXPECTED_METHODS = [
    'listCalendarConnectionsCalendarConnectionsGet',
    'listCountdownCategoriesCountdownCategoriesGet',
    'listCountdownsCountdownsGet',
    'listHabitsHabitsGet',
    'listHabitTrackersHabitsHabitIdTrackersGet',
    'listHabitTrackersLiteHabitsHabitIdTrackersLiteGet',
    'listIntegrationConnectionsIntegrationsGet',
    'listProfilesProfilesGet',
    'listProjectsProjectsGet',
    'listTasksTasksGet',
    'listTimeEntriesTimeEntriesGet',
    'listUsersUsersGet'
].sort();

const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return walk(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
    });

/** Generated methods whose query string carries an `offset`. */
const offsetPagedMethods = (): string[] => {
    const names: string[] = [];
    for (const file of readdirSync(SERVICES_DIR)) {
        if (!file.endsWith('Service.ts')) continue;
        const source = readFileSync(join(SERVICES_DIR, file), 'utf8');
        const methods = source.matchAll(/public static (\w+)\(([\s\S]*?)\n {4}\}/g);
        for (const method of methods) {
            if (method[2]!.includes("'offset':")) names.push(method[1]!);
        }
    }
    return names;
};

const sourceFiles = () => SEARCH_ROOTS.flatMap(walk).filter((path) => !/\.test\.tsx?$/.test(path));

const normalise = (path: string) => path.split('\\').join('/');

/**
 * Checks per file, not per call site: a file that pages one call and adds a
 * second unpaged call to a different offset-paged method still passes. Catching
 * that needs AST analysis, which is not worth it here.
 */
describe('offset-paged endpoints are walked to completion', () => {
    const methods = offsetPagedMethods();

    it('finds exactly the expected set of generated offset-paged methods', () => {
        expect([...methods].sort()).toEqual(EXPECTED_METHODS);
    });

    it('every call site pages, or is an allowlisted bounded read', () => {
        const offenders: string[] = [];

        for (const file of sourceFiles()) {
            const source = readFileSync(file, 'utf8');
            const called = methods.filter((method) => source.includes(`${method}(`));
            if (called.length === 0) continue;

            const key = normalise(file);
            if (key in BOUNDED_READS) continue;
            if (/import\s*\{[^}]*\bpagedList\b[^}]*\}\s*from '@\/lib\/paginate'/.test(source))
                continue;

            offenders.push(`${key} calls ${called.join(', ')} without pagedList`);
        }

        expect(offenders).toEqual([]);
    });

    it('every allowlist entry still has a call site', () => {
        const stale = Object.keys(BOUNDED_READS).filter((file) => {
            const source = readFileSync(file, 'utf8');
            return !methods.some((method) => source.includes(`${method}(`));
        });

        expect(stale).toEqual([]);
    });

    // A reason string clearing this floor is not verified to be a good reason:
    // that judgement is a code-review concern, not something a string-length
    // check can enforce. This only catches an empty or placeholder entry.
    it('every allowlist entry has a reason above a minimum length', () => {
        for (const [file, reason] of Object.entries(BOUNDED_READS)) {
            expect(reason.length, `${file} needs a reason`).toBeGreaterThan(40);
        }
    });
});
