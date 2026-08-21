import type { ProjectRead, TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import { ChevronRight, Link2, ListChecks } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';
import { STATUS_META, type StatusMeta } from './status-config';
import { projectDetailPath } from '@/lib/entity-ref';

export type TaskRowMetaProps = {
    task: TaskRead;
    project?: ProjectRead;
    /** Whether to render the project pip at all. Default true; the project
     *  view (every row shares one project) passes false to hide it. */
    showProject?: boolean;
    /** Current route path: carried through the project link's `from` state. */
    pathname: string;
    statusMeta: StatusMeta;
    status: TaskStatus;
    /** Pre-merged status pill text (folds in block reason / scheduled date). */
    pillLabel: string;
    /** Line 2 text colour: the row's band tier, or muted when the task is done. */
    metaClass: string;
    subtaskCount: number;
    subtaskDoneCount: number;
    /** Whether the inline subtask quick-clear checklist is open. */
    subtasksOpen?: boolean;
    /** Toggle the subtask quick-clear checklist (omit to render static text). */
    onToggleSubtasks?: () => void;
    hasNotes: boolean;
    notesOpen: boolean;
    onToggleNotes: () => void;
};

/**
 * One entry on line 2. `hideBelowSm` is CSS-only rather than a dropped item so
 * the row reflows on resize without a JS breakpoint, which means the separator
 * logic below has to account for it: a separator whose every predecessor is
 * hidden must hide too, or the row opens with a stray middot.
 */
type MetaItem = {
    node: ReactNode;
    hideBelowSm?: boolean;
};

/**
 * TaskRow's line 2: status pill, project, subtasks, notes, external link, in
 * that order, as plain text separated by middots (the status pill keeps its
 * chip treatment, including the Blocked override; everything else is text).
 * Built into an array and joined so an absent item never leaves a stray
 * separator. Returns null when there is nothing to show, so a task with no
 * metadata renders as a genuinely single-line row. Purely presentational;
 * TaskRow owns all the derived state (pillLabel, subtask counts, etc).
 */
export const TaskRowMeta = ({
    task,
    project,
    showProject = true,
    pathname,
    statusMeta,
    status,
    pillLabel,
    metaClass,
    subtaskCount,
    subtaskDoneCount,
    subtasksOpen,
    onToggleSubtasks,
    hasNotes,
    notesOpen,
    onToggleNotes
}: TaskRowMetaProps) => {
    const items: MetaItem[] = [];

    if (statusMeta.pillText && statusMeta.pillBg) {
        // Dropped below `sm`, where the row runs out of width first: the status
        // is already readable from the status control, and the extras this pill
        // folds in (a block reason, a scheduled date) are a tap away in the
        // detail pane.
        items.push({
            hideBelowSm: true,
            node: (
                <span
                    className='hidden max-w-[220px] truncate rounded-chip px-2 py-0.5 align-bottom sm:inline-block'
                    style={
                        // A blocked task's pill is a hard-to-miss red so its
                        // reason jumps out.
                        status === TaskStatus.BLOCKED
                            ? {
                                  color: 'var(--color-danger)',
                                  backgroundColor: 'var(--danger-bg)',
                                  border: '1px solid var(--danger-border)'
                              }
                            : {
                                  color: statusMeta.pillText,
                                  backgroundColor: statusMeta.pillBg
                              }
                    }
                    title={pillLabel}
                >
                    {pillLabel}
                </span>
            )
        });
    }

    if (showProject && project) {
        items.push({
            node: (
                <span className='inline-flex items-center gap-[6px]'>
                    <span
                        aria-hidden='true'
                        className='h-[7px] w-[7px] shrink-0 rounded-full'
                        style={{ backgroundColor: project.color }}
                    />
                    <Link
                        to={projectDetailPath(project)}
                        state={{ from: pathname }}
                        data-target-exempt='inline'
                        className='inline-flex min-h-[24px] items-center transition-opacity hover:opacity-80'
                        onClick={(e) => e.stopPropagation()}
                    >
                        {project.name}
                    </Link>
                </span>
            )
        });
    }

    if (subtaskCount > 0) {
        items.push({
            node: onToggleSubtasks ? (
                <button
                    type='button'
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleSubtasks();
                    }}
                    aria-expanded={subtasksOpen}
                    data-target-exempt='inline'
                    className='inline-flex min-h-[24px] items-center gap-1 hover:opacity-80'
                    title={`${subtaskDoneCount} of ${subtaskCount} subtasks done`}
                >
                    <ListChecks size={12} />
                    {subtaskDoneCount}/{subtaskCount}
                    <ChevronRight
                        size={12}
                        className={`transition-transform ${subtasksOpen ? 'rotate-90' : ''}`}
                    />
                </button>
            ) : (
                <span
                    className='inline-flex items-center gap-1'
                    title={`${subtaskDoneCount} of ${subtaskCount} subtasks done`}
                >
                    <ListChecks size={12} />
                    {subtaskDoneCount}/{subtaskCount}
                </span>
            )
        });
    }

    if (hasNotes) {
        items.push({
            node: (
                <button
                    type='button'
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleNotes();
                    }}
                    aria-expanded={notesOpen}
                    data-target-exempt='inline'
                    className='inline-flex min-h-[24px] items-center gap-0.5 hover:opacity-80'
                >
                    notes
                    <ChevronRight
                        size={12}
                        className={`transition-transform ${notesOpen ? 'rotate-90' : ''}`}
                    />
                </button>
            )
        });
    }

    if (task.external_ref && task.external_url) {
        items.push({
            node: (
                <a
                    href={task.external_url}
                    target='_blank'
                    rel='noreferrer'
                    onClick={(e) => e.stopPropagation()}
                    data-target-exempt='inline'
                    className='inline-flex min-h-[24px] items-center gap-1 hover:opacity-80'
                >
                    <Link2 size={13} />
                    {task.external_ref}
                </a>
            )
        });
    }

    if (items.length === 0) return null;

    // Every item hidden below sm means the row itself has nothing to show there,
    // and an empty one would still cost its margin and line height.
    const allHiddenBelowSm = items.every((item) => item.hideBelowSm);

    return (
        <div
            className={`items-center gap-[6px] overflow-hidden font-mono text-[12px] whitespace-nowrap ${
                allHiddenBelowSm ? 'hidden sm:flex' : 'flex'
            } ${metaClass}`}
        >
            {items.map((item, i) => (
                <Fragment key={i}>
                    {i > 0 && (
                        <span
                            aria-hidden='true'
                            className={`text-text-faint ${
                                items.slice(0, i).every((prev) => prev.hideBelowSm)
                                    ? 'hidden sm:inline'
                                    : ''
                            }`}
                        >
                            ·
                        </span>
                    )}
                    {item.node}
                </Fragment>
            ))}
        </div>
    );
};
