import { compareSemver } from './compare-semver';

export type ChangeKind = 'added' | 'changed' | 'fixed' | 'removed';

export type Change = {
    kind: ChangeKind;
    text: string;
};

/** What a `releases/<version>.json` file holds. The version comes from its name. */
export type ReleaseBody = {
    /** `YYYY-MM-DD`. Never parsed into a `Date`; see `format-release-date.ts`. */
    date: string;
    summary?: string;
    changes: Change[];
};

export type Release = ReleaseBody & { version: string };

// A Record keyed by ChangeKind, so adding a kind to the union fails the build
// here until it is listed. The runtime guard below reads this rather than its
// own literal list, which is what stops the two drifting apart.
const KIND_KEYS: Record<ChangeKind, true> = {
    added: true,
    changed: true,
    fixed: true,
    removed: true
};

/** Every valid change kind. */
export const CHANGE_KINDS = Object.keys(KIND_KEYS) as ChangeKind[];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VERSION_FROM_PATH = /\/(\d+\.\d+\.\d+)\.json$/;

/**
 * Deliberately NOT `{ eager: true }`. Eager would inline every release into the
 * main bundle, so the page would ship the entire history to show one release.
 * Lazy gives a map of loaders instead: Vite emits each JSON as its own chunk,
 * the keys (i.e. the filenames) are free, and a body is fetched only when its
 * page is opened.
 */
const loaders = import.meta.glob<{ default: unknown }>('./releases/*.json');

const byVersion = new Map<string, () => Promise<{ default: unknown }>>();
for (const [path, load] of Object.entries(loaders)) {
    const version = path.match(VERSION_FROM_PATH)?.[1];
    // A file whose name isn't a bare semver is skipped rather than thrown on:
    // this module is imported by the Settings card, so throwing here would take
    // out a page that has nothing to do with release notes.
    // `release-index.test.ts` asserts every file in the folder survives.
    if (version) byVersion.set(version, load);
}

/** Every release, newest first. Derived from filenames, so it costs no fetch. */
export const RELEASE_VERSIONS: readonly string[] = [...byVersion.keys()].sort((a, b) =>
    compareSemver(b, a)
);

/** The newest release's version, or null when there are no releases at all. */
export const CURRENT_VERSION: string | null = RELEASE_VERSIONS[0] ?? null;

const isChange = (value: unknown): value is Change => {
    if (typeof value !== 'object' || value === null) return false;
    const change = value as Partial<Change>;
    return (
        typeof change.text === 'string' &&
        change.text.trim() !== '' &&
        typeof change.kind === 'string' &&
        CHANGE_KINDS.includes(change.kind as ChangeKind)
    );
};

const isReleaseBody = (value: unknown): value is ReleaseBody => {
    if (typeof value !== 'object' || value === null) return false;
    const body = value as Partial<ReleaseBody>;
    return (
        typeof body.date === 'string' &&
        ISO_DATE.test(body.date) &&
        (body.summary === undefined || typeof body.summary === 'string') &&
        Array.isArray(body.changes) &&
        body.changes.length > 0 &&
        body.changes.every(isChange)
    );
};

/**
 * Fetch one release's chunk. Rejects on an unknown version or a file that
 * isn't shaped like a release, so the page shows an error line instead of
 * rendering blanks.
 */
export const loadRelease = async (version: string): Promise<Release> => {
    const load = byVersion.get(version);
    if (!load) throw new Error(`No release notes for version ${version}`);

    const body = (await load()).default;
    if (!isReleaseBody(body)) throw new Error(`Malformed release notes for version ${version}`);

    return { version, ...body };
};
