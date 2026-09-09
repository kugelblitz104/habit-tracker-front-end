import { parseServerDate } from '@/lib/date-utils';
import { formatAbsolute, formatRelative } from '@/lib/relative-time';
import { useNow } from '@/lib/use-now';

type TaskDetailTimestampsProps = {
    createdDate: string;
    /** Null until the task has been edited once (server-stamped, never client-set). */
    updatedDate?: string | null;
    /** Set on entering done/cancelled, cleared on reopen. */
    closedDate?: string | null;
};

/**
 * The task detail pane's record-keeping line: when the task was created, last
 * edited and closed, as relative labels with the full date and time on hover.
 *
 * Relative on purpose: "what happened to this recently" is the question a
 * detail pane answers. It refreshes on `useNow`'s minute tick so the label
 * doesn't go stale in a pane left open. The tooltip renders in the browser's
 * zone; see `formatAbsolute` for why that must not follow the profile's
 * timezone.
 */
export const TaskDetailTimestamps = ({
    createdDate,
    updatedDate,
    closedDate
}: TaskDetailTimestampsProps) => {
    const now = useNow();

    // Resolved before rendering rather than per-field: a value that can't be
    // formatted drops out of the list entirely, so it can't leave a stray
    // separator behind.
    const stamps = (
        [
            ['Created', createdDate],
            ['Updated', updatedDate],
            ['Closed', closedDate]
        ] as const
    ).flatMap(([label, value]) => {
        const relative = formatRelative(value, now);
        return relative && value ? [{ label, value, relative }] : [];
    });

    if (stamps.length === 0) return null;

    return (
        <div
            // Located by testid in e2e, as the priority meter is: every label
            // here is time-relative, so there is no stable string to match on.
            data-testid='task-detail-timestamps'
            className='flex flex-wrap items-center gap-x-[6px] gap-y-[2px] border-t pt-[10px] font-mono text-[11px] text-text-faint'
            style={{ borderColor: 'var(--surface-card-border)' }}
        >
            {stamps.map(({ label, value, relative }, index) => (
                <span key={label} className='inline-flex items-center gap-x-[6px]'>
                    {index > 0 && <span aria-hidden='true'>·</span>}
                    <span>
                        {label}{' '}
                        <time
                            dateTime={parseServerDate(value).toISOString()}
                            title={formatAbsolute(value) ?? undefined}
                        >
                            {relative}
                        </time>
                    </span>
                </span>
            ))}
        </div>
    );
};
