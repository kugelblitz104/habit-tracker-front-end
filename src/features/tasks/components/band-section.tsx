import type { ProjectRead, TaskRead } from '@/api';
import type { TaskStatus } from '@/types/types';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { TaskCard, type ActiveBand } from './task-card';

type BandMeta = {
    label: string;
    labelColor: string;
};

const BAND_META: Record<ActiveBand, BandMeta> = {
    now: { label: 'Needs attention', labelColor: 'var(--color-now-accent)' },
    soon: { label: 'Soon', labelColor: 'var(--color-soon-label)' },
    whenever: { label: 'Whenever', labelColor: 'var(--color-whenever-label)' }
};

export type BandSectionProps = {
    band: ActiveBand;
    tasks: TaskRead[];
    projectsById: Map<number, ProjectRead>;
    onStatusChange: (taskId: number, status: TaskStatus) => void;
    /** Task whose inline notes peek is open, or null. */
    notesTaskId: number | null;
    /** Task selected for the edit detail pane/overlay, or null. */
    selectedEditTaskId: number | null;
    onToggleNotes: (taskId: number) => void;
    onSelectEdit: (taskId: number, editing?: boolean) => void;
    /** Task whose subtask quick-clear checklist is open, or null. */
    subtasksTaskId?: number | null;
    onToggleSubtasks?: (taskId: number) => void;
    /** Start a timer attached to a task (from the context menu). */
    onStartTimer?: (taskId: number) => void;
    /** Extra node in the header (e.g. the 2c "also on Today ↗" note). */
    headerAccessory?: ReactNode;
    /** Show a subtle empty hint instead of hiding when there are no tasks. */
    emptyHint?: string;
    /** Make the section header a collapse toggle (used for Whenever on Today). */
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
};

/**
 * One urgency band: an uppercase mono label + count, then its tasks. Whenever is
 * dimmed via `opacity: var(--quiet)` so Focus mode can hush it. Empty bands are
 * hidden unless an `emptyHint` is supplied (Now only, per the README).
 *
 * Exported for reuse by the /projects/:id view (wave 2c).
 */
export const BandSection = ({
    band,
    tasks,
    projectsById,
    onStatusChange,
    notesTaskId,
    selectedEditTaskId,
    onToggleNotes,
    onSelectEdit,
    subtasksTaskId,
    onToggleSubtasks,
    onStartTimer,
    headerAccessory,
    emptyHint,
    collapsible,
    collapsed,
    onToggleCollapsed
}: BandSectionProps) => {
    if (tasks.length === 0 && !emptyHint) return null;

    const meta = BAND_META[band];
    const isQuiet = band === 'whenever';

    // The last row(s) open their status picker upward so it never covers the
    // section below.
    const upwardFrom = Math.max(tasks.length - 2, 0);

    const label = (
        <>
            <h2
                className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em]'
                style={{ color: meta.labelColor }}
            >
                {meta.label}
            </h2>
            <span className='font-mono text-[11px] text-text-faint'>{tasks.length}</span>
        </>
    );

    return (
        <section className='mb-[30px]' style={isQuiet ? { opacity: 'var(--quiet)' } : undefined}>
            <div className='mb-2.5 flex items-center gap-2'>
                {collapsible ? (
                    <button
                        type='button'
                        onClick={onToggleCollapsed}
                        aria-expanded={!collapsed}
                        className='flex items-center gap-2 rounded-[6px] py-0.5 pr-1 transition-colors hover:opacity-80'
                    >
                        {label}
                        <ChevronRight
                            size={13}
                            className={`text-text-faint transition-transform ${
                                collapsed ? '' : 'rotate-90'
                            }`}
                        />
                    </button>
                ) : (
                    label
                )}
                {headerAccessory}
            </div>

            {collapsed ? null : tasks.length === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>{emptyHint}</p>
            ) : (
                <div
                    className={band === 'whenever' ? '' : 'flex flex-col'}
                    style={band === 'whenever' ? undefined : { gap: 'var(--space-band-gap)' }}
                >
                    {tasks.map((task, i) => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            band={band}
                            project={
                                task.project_id != null
                                    ? projectsById.get(task.project_id)
                                    : undefined
                            }
                            onStatusChange={(status) => onStatusChange(task.id, status)}
                            notesOpen={notesTaskId === task.id}
                            editing={selectedEditTaskId === task.id}
                            onToggleNotes={() => onToggleNotes(task.id)}
                            onSelectEdit={(editing) => onSelectEdit(task.id, editing)}
                            subtasksOpen={subtasksTaskId === task.id}
                            onToggleSubtasks={
                                onToggleSubtasks ? () => onToggleSubtasks(task.id) : undefined
                            }
                            onStartTimer={onStartTimer ? () => onStartTimer(task.id) : undefined}
                            openUpward={i >= upwardFrom}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};
