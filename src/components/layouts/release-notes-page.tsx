import { SECTION_LABEL_COLOR } from '@/components/ui/forms/input-styles';
import { QueryState } from '@/components/ui/query-state';
import { CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import { formatReleaseDate } from '@/features/release-notes/format-release-date';
import {
    loadRelease,
    RELEASE_VERSIONS,
    type ChangeKind,
    type Release
} from '@/features/release-notes/release-index';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

/** Groups render in this order; one with no changes is omitted. */
const KIND_ORDER: ChangeKind[] = ['added', 'changed', 'fixed', 'removed'];

const KIND_LABELS: Record<ChangeKind, string> = {
    added: 'Added',
    changed: 'Changed',
    fixed: 'Fixed',
    removed: 'Removed'
};

const pagerButtonClass =
    'inline-flex items-center gap-1 rounded-[9px] border px-[13px] py-[7px] text-[12px] ' +
    'text-text-secondary transition-colors hover:text-text-primary ' +
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-text-secondary';

const pagerButtonStyle = {
    backgroundColor: 'rgba(255,255,255,.05)',
    borderColor: 'rgba(255,255,255,.12)'
} as const;

const ReleaseCard = ({ release }: { release: Release }) => (
    <section className='rounded-card border p-4 md:px-[22px] md:py-5' style={CARD_SURFACE_STYLE}>
        <div className='flex flex-wrap items-baseline gap-x-2.5 gap-y-1'>
            <h2 className='font-display text-[16px] font-bold text-text-primary'>
                {release.version}
            </h2>
            <span className='font-mono text-[11px] text-text-muted'>
                {formatReleaseDate(release.date)}
            </span>
        </div>

        {release.summary && (
            <p className='mt-2 text-[13px] leading-relaxed text-text-secondary'>
                {release.summary}
            </p>
        )}

        <div className='mt-[15px] flex flex-col gap-3.5'>
            {KIND_ORDER.map((kind) => {
                const changes = release.changes.filter((change) => change.kind === kind);
                if (changes.length === 0) return null;

                return (
                    <div key={kind}>
                        <div
                            className='font-mono text-[10px] font-medium uppercase tracking-[0.14em]'
                            style={{ color: SECTION_LABEL_COLOR }}
                        >
                            {KIND_LABELS[kind]}
                        </div>
                        <ul className='mt-2 flex list-disc flex-col gap-1.5 pl-[18px] marker:text-text-faint'>
                            {changes.map((change) => (
                                <li
                                    key={change.text}
                                    className='text-[13px] leading-relaxed text-text-secondary'
                                >
                                    {change.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    </section>
);

/**
 * The unlisted `/release-notes` page: one release at a time, newest first, with
 * Older/Newer stepping backwards through the history.
 *
 * One release per page is what keeps the payload flat as releases accumulate.
 * `RELEASE_VERSIONS` comes from the filenames in `releases/`, so the pager knows
 * how many pages exist without fetching anything; only the release being read is
 * fetched, as its own chunk. Pages already visited come back from the query
 * cache, so stepping back and forth doesn't re-flash a loading line.
 *
 * Public and free of `useAuth`, which is what lets a signed-out visitor holding
 * the URL read it, and rules out `AppHeader`: its profile switcher, search
 * palette and tabs all assume a session. The page carries its own header in the
 * same centered column `SettingsPage` uses.
 *
 * The "Back" link is unconditional on purpose: a signed-in reader lands on
 * Today, and an anonymous one is bounced to /login by the usual gate, which is
 * where they need to go anyway.
 */
export const ReleaseNotesPage = () => {
    const [index, setIndex] = useState(0);
    const version = RELEASE_VERSIONS[index];

    const { data, isLoading, isError } = useQuery({
        queryKey: ['release-notes', version],
        queryFn: () => loadRelease(version!),
        enabled: version !== undefined,
        // The releases are bundled files; they cannot change while the page is open.
        staleTime: Infinity
    });

    const total = RELEASE_VERSIONS.length;
    const isNewest = index === 0;
    const isOldest = index >= total - 1;

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                <div className='mx-auto max-w-[820px]'>
                    <header className='mb-[22px]'>
                        <h1 className='font-display text-[24px] font-bold tracking-[-0.01em] text-text-primary'>
                            Ergosphere
                        </h1>
                        <p className='mt-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted'>
                            Release notes
                        </p>
                        <Link
                            to='/'
                            className='mt-3 inline-flex items-center gap-1.5 text-[13px] text-text-secondary-soft transition-colors hover:text-now-accent'
                        >
                            <ArrowLeft size={14} aria-hidden='true' />
                            Back to Ergosphere
                        </Link>
                    </header>

                    {total === 0 ? (
                        <p className='font-mono text-[12px] text-text-faint'>
                            No release notes yet.
                        </p>
                    ) : (
                        <>
                            <QueryState
                                size='md'
                                isLoading={isLoading}
                                isError={isError}
                                loadingMessage='Loading release notes…'
                                errorMessage="These release notes couldn't be loaded."
                            />
                            {data && <ReleaseCard release={data} />}

                            <nav
                                aria-label='Release history'
                                className='mt-3.5 flex items-center justify-between gap-3'
                            >
                                <button
                                    type='button'
                                    className={pagerButtonClass}
                                    style={pagerButtonStyle}
                                    disabled={isOldest}
                                    onClick={() => setIndex((current) => current + 1)}
                                >
                                    <ChevronLeft size={14} aria-hidden='true' />
                                    Older
                                </button>

                                <span className='font-mono text-[11px] text-text-faint'>
                                    {index + 1} of {total}
                                </span>

                                <button
                                    type='button'
                                    className={pagerButtonClass}
                                    style={pagerButtonStyle}
                                    disabled={isNewest}
                                    onClick={() => setIndex((current) => current - 1)}
                                >
                                    Newer
                                    <ChevronRight size={14} aria-hidden='true' />
                                </button>
                            </nav>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
