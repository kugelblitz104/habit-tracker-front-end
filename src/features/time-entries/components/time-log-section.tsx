import type { TimeEntryRead } from '@/api';
import type { ReactNode } from 'react';
import { formatHumanDuration } from '../utils/format-duration';
import { EditableTimeLog } from './editable-time-log';

type EntriesQueryLike = {
    data?: { time_entries?: TimeEntryRead[] } | undefined;
    isError: boolean;
};

type TimeLogSectionProps = {
    /** Outer <section> className — top/bottom spacing differs by placement. */
    className?: string;
    title: string;
    /** 'h2' for page-level sections (project, recent); 'h3' for the quieter task view. */
    titleAs?: 'h2' | 'h3';
    titleClassName: string;
    headerClassName?: string;
    /** Right-aligned summary next to the title, e.g. "3 entries · 1h 25m". Defaults
     *  to "<duration> tracked" computed from `totalSeconds`. */
    summary?: ReactNode;
    summaryClassName: string;
    entriesQuery: EntriesQueryLike;
    /** Precomputed total; defaults to summing the fetched entries' durations.
     *  RecentEntries instead has a dedicated summary endpoint (its entries list
     *  is capped) and passes that total in. */
    totalSeconds?: number;
    contextNameFor?: (entry: TimeEntryRead) => string | null;
    errorMessage: string;
    errorClassName: string;
    emptyMessage: string;
    emptyClassName: string;
    /** Card surface around the log (project/recent); the task view renders bare. */
    card?: boolean;
};

/**
 * Shared shape behind ProjectTimeLog, TaskTimeLog and RecentEntries: fetch
 * entries → header with a title + total → isError/empty states → (optionally
 * card-wrapped) EditableTimeLog. Callers own their own query, copy and
 * styling via props; this component only captures the common structure.
 */
export const TimeLogSection = ({
    className,
    title,
    titleAs = 'h2',
    titleClassName,
    headerClassName = 'mb-2.5 flex items-center justify-between',
    summary,
    summaryClassName,
    entriesQuery,
    totalSeconds,
    contextNameFor,
    errorMessage,
    errorClassName,
    emptyMessage,
    emptyClassName,
    card = true
}: TimeLogSectionProps) => {
    const Title = titleAs;
    const entries = entriesQuery.data?.time_entries ?? [];
    const total =
        totalSeconds ?? entries.reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0);
    const log = <EditableTimeLog entries={entries} contextNameFor={contextNameFor} />;

    return (
        <section className={className}>
            <div className={headerClassName}>
                <Title className={titleClassName}>{title}</Title>
                <span className={summaryClassName}>
                    {summary ?? `${formatHumanDuration(total)} tracked`}
                </span>
            </div>

            {entriesQuery.isError && <p className={errorClassName}>{errorMessage}</p>}

            {!entriesQuery.isError && entries.length === 0 && (
                <p className={emptyClassName}>{emptyMessage}</p>
            )}

            {entries.length > 0 &&
                (card ? (
                    <div
                        className='rounded-card border px-4'
                        style={{
                            backgroundColor: 'var(--surface-card-bg)',
                            borderColor: 'var(--surface-card-border)'
                        }}
                    >
                        {log}
                    </div>
                ) : (
                    log
                ))}
        </section>
    );
};
