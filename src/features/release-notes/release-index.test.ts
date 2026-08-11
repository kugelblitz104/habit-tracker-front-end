import { describe, expect, it } from 'vitest';
import { compareSemver } from './compare-semver';
import { CHANGE_KINDS, CURRENT_VERSION, loadRelease, RELEASE_VERSIONS } from './release-index';

/** The same folder the index globs, read independently so the two can disagree. */
const files = import.meta.glob('./releases/*.json');
const fileNames = Object.keys(files).map((path) => path.split('/').pop());

describe('RELEASE_VERSIONS', () => {
    it('has at least one release', () => {
        expect(RELEASE_VERSIONS.length).toBeGreaterThan(0);
    });

    // A file the index skipped (misnamed, wrong extension) shows up here as a
    // count mismatch rather than silently vanishing from the page.
    it('picks up every file in the releases folder', () => {
        expect(RELEASE_VERSIONS.length).toBe(fileNames.length);
        expect([...RELEASE_VERSIONS].sort()).toEqual(
            fileNames.map((name) => name?.replace(/\.json$/, '')).sort()
        );
    });

    it('is ordered newest first', () => {
        for (let i = 1; i < RELEASE_VERSIONS.length; i++) {
            const newer = RELEASE_VERSIONS[i - 1]!;
            const older = RELEASE_VERSIONS[i]!;
            expect(compareSemver(newer, older)).toBeGreaterThan(0);
        }
    });

    it('holds no duplicates', () => {
        expect(new Set(RELEASE_VERSIONS).size).toBe(RELEASE_VERSIONS.length);
    });

    it('exposes the newest version as CURRENT_VERSION', () => {
        expect(CURRENT_VERSION).toBe(RELEASE_VERSIONS[0]);
    });
});

describe('loadRelease', () => {
    // Every release file is validated here, so a typo in one lands on this test
    // rather than on the page as an error line.
    it.each(RELEASE_VERSIONS)('%s loads and is well formed', async (version) => {
        const release = await loadRelease(version);

        expect(release.version).toBe(version);
        expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(release.changes.length).toBeGreaterThan(0);

        for (const change of release.changes) {
            expect(CHANGE_KINDS).toContain(change.kind);
            expect(change.text.trim()).not.toBe('');
        }
    });

    it('rejects a version with no file', async () => {
        await expect(loadRelease('99.99.99')).rejects.toThrow(/99\.99\.99/);
    });
});
