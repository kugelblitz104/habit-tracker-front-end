import type { ProjectRead, TaskRead } from '@/api';
import { parseLocalDate } from '@/lib/date-utils';
import { TaskStatus } from '@/types/types';
import { ClipboardCopy, Pencil, X } from 'lucide-react';
import { Link } from 'react-router';
import { toActiveBand } from '../utils/task-bands';
import { getCountdown, URGENCY_META } from '../utils/countdown';
import { formatShortDate } from '../utils/task-format';
import { PRIORITY_LABELS } from '../utils/priority-config';
import { PriorityMeter } from './priority-meter';
import { STATUS_META } from './status-config';

// Only now/soon get a colored band chip; whenever is implied (no chip), and
// closed tasks show their status instead.
const BAND_CHIP: Record<string, { label: string; color: string }> = {
    now: { label: 'Needs attention', color: 'var(--color-now-accent)' },
    soon: { label: 'Soon', color: 'var(--color-soon-label)' }
};

const MetaChip = ({ children }: { children: React.ReactNode }) => (
    <span
        className='inline-flex items-center gap-1 rounded-chip border px-2 py-0.5 font-mono text-[11px] text-text-secondary'
        style={{ borderColor: 'var(--surface-input-border)' }}
    >
        {children}
    </span>
);

type TaskDetailHeaderProps = {
    task: TaskRead;
    project: ProjectRead | null;
    /** Current route path — carried through the project link's `from` state. */
    pathname: string;
    showEstimatedEffort: boolean;
    onEdit: () => void;
    onClose?: () => void;
    /** Copy this task (and its subtasks) to the clipboard as Markdown. */
    onCopy?: () => void;
};

/**
 * TaskDetailBody's header block: title + edit/close controls, the due/
 * scheduled/project subheader, and the status · band · priority meta row.
 * Purely presentational — TaskDetailBody owns all the state.
 */
export const TaskDetailHeader = ({
    task,
    project,
    pathname,
    showEstimatedEffort,
    onEdit,
    onClose,
    onCopy
}: TaskDetailHeaderProps) => {
    const status = (task.status ?? TaskStatus.OPEN) as TaskStatus;
    const meta = STATUS_META[status];
    const priority = task.priority ?? 0;
    const bandChip = task.band ? BAND_CHIP[task.band] : undefined;
    const meterBand = toActiveBand(task.band);

    return (
        <div className='flex flex-col gap-1.5'>
            {/* Title + edit/close controls */}
            <div className='flex items-start justify-between gap-3'>
                <h1 className='min-w-0 flex-1 font-display text-[19px] font-bold leading-snug text-text-primary'>
                    {task.title}
                </h1>
                <div className='flex shrink-0 items-center gap-1.5'>
                    {onCopy && (
                        <button
                            type='button'
                            onClick={onCopy}
                            aria-label='Copy task as Markdown'
                            title='Copy as Markdown'
                            className='rounded-button border p-1.5 text-text-muted transition-colors hover:text-text-primary'
                            style={{ borderColor: 'var(--surface-input-border)' }}
                        >
                            <ClipboardCopy size={14} />
                        </button>
                    )}
                    <button
                        type='button'
                        onClick={onEdit}
                        aria-label='Edit task'
                        title='Edit task'
                        className='rounded-button border p-1.5 text-text-muted transition-colors hover:text-text-primary'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        type='button'
                        onClick={onClose}
                        aria-label='Close'
                        className='rounded-full p-1 text-text-faint transition-colors hover:text-text-secondary'
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Due / scheduled / project — a quieter subheader below status. */}
            {(task.due_date || task.scheduled_date || project) && (
                <div className='flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-text-faint'>
                    {project && (
                        <Link
                            to={`/projects/${project.id}`}
                            state={{ from: pathname }}
                            className='font-semibold transition-opacity hover:opacity-80'
                            style={{ color: project.color }}
                        >
                            {project.name}
                        </Link>
                    )}
                    {task.due_date &&
                        (() => {
                            const cd = getCountdown(task.due_date, task.due_time);
                            return (
                                <span>
                                    Due {formatShortDate(parseLocalDate(task.due_date))}
                                    {cd && (
                                        <span
                                            className='ml-1.5 font-semibold'
                                            style={{ color: URGENCY_META[cd.urgency].color }}
                                        >
                                            · {cd.label}
                                        </span>
                                    )}
                                </span>
                            );
                        })()}
                    {task.scheduled_date && (
                        <span>
                            Scheduled {formatShortDate(parseLocalDate(task.scheduled_date))}
                        </span>
                    )}
                </div>
            )}

            {/* Status · band · priority — right under the title. */}
            <div className='flex flex-wrap items-center gap-2'>
                <MetaChip>
                    <span
                        className='h-1.5 w-1.5 rounded-full'
                        style={{ backgroundColor: meta.color }}
                    />
                    <span style={{ color: meta.color }}>{meta.label}</span>
                </MetaChip>
                {bandChip && (
                    <span
                        className='inline-flex items-center rounded-chip border px-2 py-0.5 font-mono text-[11px] font-semibold'
                        style={{ color: bandChip.color, borderColor: bandChip.color }}
                    >
                        {bandChip.label}
                    </span>
                )}
                {priority > 0 && (
                    <span
                        className='inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 font-mono text-[11px] text-text-secondary'
                        style={{ borderColor: 'var(--surface-input-border)' }}
                    >
                        <PriorityMeter priority={priority} band={meterBand} />
                        {PRIORITY_LABELS[priority]}
                    </span>
                )}
                {showEstimatedEffort && task.estimated_effort != null && (
                    <MetaChip>Est. {task.estimated_effort}m</MetaChip>
                )}
            </div>
        </div>
    );
};
