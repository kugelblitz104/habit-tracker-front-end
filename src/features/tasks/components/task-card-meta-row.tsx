import type { ProjectRead, TaskRead } from '@/api';
import { TaskStatus } from '@/types/types';
import { ChevronRight, ListChecks } from 'lucide-react';
import { Link } from 'react-router';
import type { DueInfo } from '../utils/task-format';
import { STATUS_META, type StatusMeta } from './status-config';

type TaskCardMetaRowProps = {
    task: TaskRead;
    project?: ProjectRead;
    /** Whether to render the project pip at all. Default true; the project
     *  view (every card shares one project) passes false to hide it. */
    showProject?: boolean;
    /** Current route path — carried through the project link's `from` state. */
    pathname: string;
    statusMeta: StatusMeta;
    status: TaskStatus;
    /** Pre-merged status pill text (folds in block reason / scheduled date). */
    pillLabel: string;
    due: DueInfo | null;
    subtaskCount: number;
    subtaskDoneCount: number;
    allSubtasksDone: boolean;
    /** Whether the inline subtask quick-clear checklist is open. */
    subtasksOpen?: boolean;
    /** Toggle the subtask quick-clear checklist (omit to render a static chip). */
    onToggleSubtasks?: () => void;
    hasNotes: boolean;
    notesOpen: boolean;
    onToggleNotes: () => void;
};

/**
 * TaskCard's meta row: project tag, status pill, due chip, subtask-count chip,
 * external-ref link, and the notes toggle — always directly beneath the title,
 * left-aligned, chips never pushed right. Purely presentational; TaskCard owns
 * all the derived state (pillLabel, due, subtask counts, etc).
 */
export const TaskCardMetaRow = ({
    task,
    project,
    showProject = true,
    pathname,
    statusMeta,
    status,
    pillLabel,
    due,
    subtaskCount,
    subtaskDoneCount,
    allSubtasksDone,
    subtasksOpen,
    onToggleSubtasks,
    hasNotes,
    notesOpen,
    onToggleNotes
}: TaskCardMetaRowProps) => {
    const doneMeta = STATUS_META[TaskStatus.DONE];

    return (
        <div className='mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]'>
            {showProject && project && (
                <Link
                    to={`/projects/${project.id}`}
                    state={{ from: pathname }}
                    className='font-semibold transition-opacity hover:opacity-80'
                    style={{ color: project.color }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {project.name}
                </Link>
            )}

            {statusMeta.pillText && statusMeta.pillBg && (
                <span
                    className='inline-block max-w-[220px] truncate rounded-chip px-2 py-0.5 align-bottom'
                    style={
                        // A blocked task's pill is a hard-to-miss red so its
                        // reason jumps out.
                        status === TaskStatus.BLOCKED
                            ? {
                                  color: 'var(--color-danger)',
                                  backgroundColor: 'var(--danger-bg, rgba(193,78,106,0.14))',
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
            )}

            {due && (
                <span
                    className='rounded-chip px-2 py-0.5'
                    style={
                        due.hot
                            ? {
                                  color: 'var(--color-status-duetoday)',
                                  backgroundColor: 'var(--status-duetoday-bg)'
                              }
                            : { color: 'var(--color-text-muted)' }
                    }
                >
                    {due.label}
                </span>
            )}

            {subtaskCount > 0 &&
                (onToggleSubtasks ? (
                    <button
                        type='button'
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSubtasks();
                        }}
                        aria-expanded={subtasksOpen}
                        className='inline-flex items-center gap-1 rounded-chip px-2 py-0.5 transition-colors'
                        style={
                            allSubtasksDone
                                ? {
                                      color: doneMeta.pillText ?? undefined,
                                      backgroundColor: doneMeta.pillBg ?? undefined
                                  }
                                : { color: 'var(--color-text-muted)' }
                        }
                        title={`${subtaskDoneCount} of ${subtaskCount} subtasks done`}
                    >
                        <ListChecks size={11} />
                        {subtaskDoneCount}/{subtaskCount}
                        <ChevronRight
                            size={11}
                            className={`transition-transform ${subtasksOpen ? 'rotate-90' : ''}`}
                        />
                    </button>
                ) : (
                    <span
                        className='inline-flex items-center gap-1 rounded-chip px-2 py-0.5'
                        style={
                            allSubtasksDone
                                ? {
                                      color: doneMeta.pillText ?? undefined,
                                      backgroundColor: doneMeta.pillBg ?? undefined
                                  }
                                : { color: 'var(--color-text-muted)' }
                        }
                        title={`${subtaskDoneCount} of ${subtaskCount} subtasks done`}
                    >
                        <ListChecks size={11} />
                        {subtaskDoneCount}/{subtaskCount}
                    </span>
                ))}

            {task.external_ref && task.external_url && (
                <a
                    href={task.external_url}
                    target='_blank'
                    rel='noreferrer'
                    onClick={(e) => e.stopPropagation()}
                    className='rounded-chip px-2 py-0.5'
                    style={
                        task.source === 'github'
                            ? {
                                  color: 'var(--color-github-text)',
                                  backgroundColor: 'var(--github-bg)',
                                  border: '1px solid var(--github-border)'
                              }
                            : {
                                  color: 'var(--color-azure-text)',
                                  backgroundColor: 'var(--azure-bg)',
                                  border: '1px solid var(--azure-border)'
                              }
                    }
                >
                    {task.external_ref} ↗
                </a>
            )}

            {hasNotes && (
                <button
                    type='button'
                    onClick={onToggleNotes}
                    aria-expanded={notesOpen}
                    className='inline-flex items-center gap-0.5 text-text-faint hover:text-text-muted'
                >
                    notes
                    <ChevronRight
                        size={12}
                        className={`transition-transform ${notesOpen ? 'rotate-90' : ''}`}
                    />
                </button>
            )}
        </div>
    );
};
