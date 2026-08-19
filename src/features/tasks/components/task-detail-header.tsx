import type { ProjectRead, TaskRead } from '@/api';
import { parseLocalDate } from '@/lib/date-utils';
import { TaskStatus } from '@/types/types';
import { Ban, ClipboardCopy, Pencil, TriangleAlert, X } from 'lucide-react';
import { Link } from 'react-router';
import { getCountdown } from '@/features/countdowns/utils/countdown';
import { attentionReasons } from '../utils/attention-reasons';
import { formatShortDate } from '../utils/task-format';
import { PRIORITY_LABELS } from '../utils/priority-config';
import { PriorityMeter } from './priority-meter';
import { STATUS_META } from './status-config';
import { projectDetailPath } from '@/lib/entity-ref';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <p className='font-mono text-[11px] uppercase tracking-[0.04em] text-text-muted'>{label}</p>
        <div className='mt-[2px] flex items-center gap-[6px] text-[13px] text-text-primary'>
            {children}
        </div>
    </div>
);

const DimSuffix = ({ children }: { children: React.ReactNode }) => (
    // Never urgency-coloured: the attention block above already carries the red.
    <span className='text-text-muted'>· {children}</span>
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
 * TaskDetailBody's header block: a project kicker above the title, the
 * needs-attention block (label + reason chips, only when banded `now`), and a
 * labelled meta row (status always, due/scheduled/priority/estimate only when
 * present). Purely presentational; TaskDetailBody owns all the state.
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
    const blockReason = status === TaskStatus.BLOCKED ? task.block_reason?.trim() : null;
    // The banner below carries the reason in full, so the chip that would say it
    // again (truncated) is dropped rather than shown twice.
    const reasons = attentionReasons(task).filter(
        (reason) => !blockReason || !reason.startsWith('Blocked')
    );
    const dueCountdown = task.due_date ? getCountdown(task.due_date, task.due_time) : null;
    const scheduledCountdown = task.scheduled_date
        ? getCountdown(task.scheduled_date, task.scheduled_time)
        : null;

    return (
        <div className='flex flex-col gap-1.5'>
            {/* Kicker and title share a column so the action buttons can sit level
                with the top of the pane whether or not there is a project. */}
            <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0 flex-1'>
                    {project && (
                        <p className='mb-[3px] flex items-center gap-[6px] text-[12px] text-text-secondary'>
                            <span
                                aria-hidden='true'
                                className='h-[7px] w-[7px] shrink-0 rounded-full'
                                style={{ backgroundColor: project.color }}
                            />
                            <Link
                                to={projectDetailPath(project)}
                                state={{ from: pathname }}
                                className='truncate transition-opacity hover:opacity-80'
                            >
                                {project.name}
                            </Link>
                        </p>
                    )}
                    <h1
                        className='truncate font-display text-[19px] leading-snug font-semibold text-text-primary'
                        title={task.title}
                    >
                        {task.title}
                    </h1>
                </div>
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

            {reasons.length > 0 && (
                <div
                    className='flex flex-wrap items-center gap-[9px] rounded-cell px-[11px] py-[7px]'
                    style={{ backgroundColor: 'var(--danger-bg)' }}
                >
                    <span
                        className='inline-flex items-center gap-[6px] text-[13px] font-semibold'
                        style={{ color: 'var(--color-danger)' }}
                    >
                        <TriangleAlert size={14} />
                        Needs attention
                    </span>
                    <span
                        aria-hidden='true'
                        className='h-[14px] w-px'
                        style={{ backgroundColor: 'var(--danger-border)' }}
                    />
                    {reasons.map((reason) => (
                        <span
                            key={reason}
                            className='max-w-[220px] truncate rounded-chip border px-[9px] py-[2px] text-[12px]'
                            style={{
                                color: 'var(--color-danger)',
                                borderColor: 'var(--danger-border)'
                            }}
                            title={reason}
                        >
                            {reason}
                        </span>
                    ))}
                </div>
            )}

            {/* Above the labelled meta row on purpose: why the task is stuck is
                the first thing to read, before its status/due/priority facts. */}
            {blockReason && (
                <div
                    className='flex items-start gap-2 rounded-button border px-3 py-2'
                    style={{
                        borderColor: 'var(--danger-border)',
                        backgroundColor: 'var(--danger-bg)',
                        color: 'var(--color-danger)'
                    }}
                >
                    <Ban size={14} className='mt-0.5 shrink-0' />
                    <span className='font-mono text-[12px] leading-snug'>
                        Blocked: {blockReason}
                    </span>
                </div>
            )}

            <div
                className=' flex flex-wrap gap-[20px] border-t pt-[12px]'
                style={{ borderColor: 'var(--surface-card-border)' }}
            >
                <Field label='Status'>
                    <span
                        className='h-1.5 w-1.5 rounded-full'
                        style={{ backgroundColor: meta.color }}
                    />
                    <span style={{ color: meta.color }}>{meta.label}</span>
                </Field>

                {task.due_date && (
                    <Field label='Due'>
                        {formatShortDate(parseLocalDate(task.due_date))}
                        {dueCountdown && <DimSuffix>{dueCountdown.label}</DimSuffix>}
                    </Field>
                )}

                {task.scheduled_date && (
                    <Field label='Scheduled'>
                        {formatShortDate(parseLocalDate(task.scheduled_date))}
                        {scheduledCountdown && <DimSuffix>{scheduledCountdown.label}</DimSuffix>}
                    </Field>
                )}

                {priority > 0 && (
                    <Field label='Priority'>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                            <PriorityMeter priority={priority} />
                        </span>
                        {PRIORITY_LABELS[priority]}
                    </Field>
                )}

                {showEstimatedEffort && task.estimated_effort != null && (
                    <Field label='Estimate'>{task.estimated_effort}m</Field>
                )}
            </div>
        </div>
    );
};
