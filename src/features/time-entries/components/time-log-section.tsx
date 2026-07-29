import type { TimeEntryRead } from '@/api';
import { CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import type { ReactNode } from 'react';
import type { EntryProject } from '../hooks/use-entry-project';
import { formatHumanDuration } from '../utils/format-duration';
import { EditableTimeLog } from './editable-time-log';

type EntriesQueryLike = {
    data?: { time_entries?: TimeEntryRead[] } | undefined;
    isError: boolean;
};

type TimeLogVariant = 'task' | 'project' | 'recent';

type VariantConfig = {
    /** Outer <section> className — top/bottom spacing differs by placement. */
    className?: string;
    /** 'h2' for page-level sections (project, recent); 'h3' for the quieter task view. */
    titleAs: 'h2' | 'h3';
    titleClassName: string;
    headerClassName: string;
    summaryClassName: string;
    /** Shared prefix for the error/empty `<p>` lines; `text-danger`/`text-text-faint`
     *  is appended, in that concatenation order, to build the two class strings. */
    messageClass: string;
    /** Card surface around the log (project/recent); the task view renders bare. */
    card: boolean;
};

/** Three-variant design system for TimeLogSection's callers — every value here
 *  is preserved exactly from what each caller passed before this table existed. */
const TIME_LOG_VARIANTS: Record<TimeLogVariant, VariantConfig> = {
    task: {
        titleAs: 'h3',
        titleClassName: 'font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint',
        headerClassName: 'mb-2 flex items-center justify-between',
        summaryClassName: 'font-mono text-[11px] text-text-faint',
        messageClass: 'font-mono text-[11.5px]',
        card: false
    },
    project: {
        className: 'mt-[30px]',
        titleAs: 'h2',
        titleClassName:
            'font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-text-muted',
        headerClassName: 'mb-2.5 flex items-center justify-between',
        summaryClassName: 'font-mono text-[11px] text-text-faint',
        messageClass: 'font-mono text-[12px]',
        card: true
    },
    recent: {
        className: 'mt-8',
        titleAs: 'h2',
        titleClassName: 'font-mono text-[11.5px] uppercase tracking-[0.16em] text-text-muted',
        headerClassName: 'mb-3 flex items-center justify-between',
        summaryClassName: 'font-mono text-[11.5px] text-text-faint',
        messageClass: 'font-mono text-[12px]',
        card: true
    }
};

type TimeLogSectionProps = {
    /** Which caller's styling tier to use — see `TIME_LOG_VARIANTS`. */
    variant: TimeLogVariant;
    title: string;
    /** Extra controls rendered next to the title (e.g. RecentEntries' "add
     *  entry" button). Omit for a bare title — the task/project views do. */
    headerActions?: ReactNode;
    /** Right-aligned summary next to the title, e.g. "3 entries · 1h 25m". Defaults
     *  to "<duration> tracked" computed from `totalSeconds`. */
    summary?: ReactNode;
    entriesQuery: EntriesQueryLike;
    /** Precomputed total; defaults to summing the fetched entries' durations.
     *  RecentEntries instead has a dedicated summary endpoint (its entries list
     *  is capped) and passes that total in. */
    totalSeconds?: number;
    contextNameFor?: (entry: TimeEntryRead) => string | null;
    /** Resolves an entry's project for the pip; only consulted when `showProject`. */
    projectFor?: (entry: TimeEntryRead) => EntryProject | null;
    /** Render the project pip on each row/group — see EditableTimeLog. Off by
     *  default; RecentEntries (timer page) is the only caller that sets it. */
    showProject?: boolean;
    errorMessage: string;
    emptyMessage: string;
};

/**
 * Shared shape behind ProjectTimeLog, TaskTimeLog and RecentEntries: fetch
 * entries → header with a title + total → isError/empty states → (optionally
 * card-wrapped) EditableTimeLog. Callers own their own query and copy; styling
 * comes from their `variant`.
 */
export const TimeLogSection = ({
    variant,
    title,
    headerActions,
    summary,
    entriesQuery,
    totalSeconds,
    contextNameFor,
    projectFor,
    showProject,
    errorMessage,
    emptyMessage
}: TimeLogSectionProps) => {
    const {
        className,
        titleAs,
        titleClassName,
        headerClassName,
        summaryClassName,
        messageClass,
        card
    } = TIME_LOG_VARIANTS[variant];
    const Title = titleAs;
    const entries = entriesQuery.data?.time_entries ?? [];
    const total =
        totalSeconds ?? entries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0);
    const log = (
        <EditableTimeLog
            entries={entries}
            contextNameFor={contextNameFor}
            projectFor={projectFor}
            showProject={showProject}
        />
    );

    return (
        <section className={className}>
            <div className={headerClassName}>
                <div className='flex items-center gap-2'>
                    <Title className={titleClassName}>{title}</Title>
                    {headerActions}
                </div>
                <span className={summaryClassName}>
                    {summary ?? `${formatHumanDuration(total)} tracked`}
                </span>
            </div>

            {entriesQuery.isError && (
                <p className={`${messageClass} text-danger`}>{errorMessage}</p>
            )}

            {!entriesQuery.isError && entries.length === 0 && (
                <p className={`${messageClass} text-text-faint`}>{emptyMessage}</p>
            )}

            {entries.length > 0 &&
                (card ? (
                    <div className='rounded-card border px-4' style={CARD_SURFACE_STYLE}>
                        {log}
                    </div>
                ) : (
                    log
                ))}
        </section>
    );
};
