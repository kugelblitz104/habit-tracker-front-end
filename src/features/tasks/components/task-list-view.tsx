import type { ProjectRead, TaskRead } from '@/api';
import type { TaskStatus } from '@/types/types';
import { useMemo } from 'react';
import { buildTaskSections, type TaskControlsState } from '../utils/task-controls';
import { TaskCard, type ActiveBand } from './task-card';

type TaskListViewProps = {
    tasks: TaskRead[];
    projectsById: Map<number, ProjectRead>;
    controls: TaskControlsState;
    onStatusChange: (taskId: number, status: TaskStatus) => void;
    notesTaskId: number | null;
    selectedEditTaskId: number | null;
    onToggleNotes: (taskId: number) => void;
    onSelectEdit: (taskId: number, editing?: boolean) => void;
    subtasksTaskId?: number | null;
    onToggleSubtasks?: (taskId: number) => void;
    onStartTimer?: (taskId: number) => void;
    /** Shown when the (filtered) list is empty. */
    emptyHint?: string;
};

// TaskCard styles off an active band; closed tasks (band 'hidden') fall back to
// the quiet 'whenever' look.
const toActiveBand = (band: TaskRead['band']): ActiveBand =>
    band === 'now' || band === 'soon' ? band : 'whenever';

/**
 * Flat task surface renderer: applies the sort/group/filter controls and paints
 * the resulting sections with the same TaskCard used on Today. Grouping headers
 * carry an optional color dot (project color / status accent).
 */
export const TaskListView = ({
    tasks,
    projectsById,
    controls,
    onStatusChange,
    notesTaskId,
    selectedEditTaskId,
    onToggleNotes,
    onSelectEdit,
    subtasksTaskId,
    onToggleSubtasks,
    onStartTimer,
    emptyHint = 'No tasks match these filters.'
}: TaskListViewProps) => {
    const sections = useMemo(
        () => buildTaskSections(tasks, controls, projectsById),
        [tasks, controls, projectsById]
    );

    // Band styling (Now's orange glow, Whenever's dim) only reads right when the
    // list is in urgency order. Under any other sort it looks arbitrary, so the
    // cards render in the neutral "Soon" style instead.
    const uniformBand = controls.sortBy !== 'smart';

    const total = sections.reduce((sum, section) => sum + section.tasks.length, 0);
    if (total === 0) {
        return <p className='font-mono text-[12px] text-text-faint'>{emptyHint}</p>;
    }

    return (
        <div className='flex flex-col gap-[26px]'>
            {sections.map((section) => {
                const upwardFrom = Math.max(section.tasks.length - 2, 0);
                return (
                    <section key={section.key}>
                        {section.label && (
                            <div className='mb-2.5 flex items-center gap-2'>
                                {section.color && (
                                    <span
                                        className='h-2 w-2 rounded-[2px]'
                                        style={{ backgroundColor: section.color }}
                                    />
                                )}
                                <h2
                                    className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em]'
                                    style={{ color: section.color ?? 'var(--color-text-muted)' }}
                                >
                                    {section.label}
                                </h2>
                                <span className='font-mono text-[11px] text-text-faint'>
                                    {section.tasks.length}
                                </span>
                            </div>
                        )}
                        <div className='flex flex-col' style={{ gap: 'var(--space-band-gap)' }}>
                            {section.tasks.map((task, i) => (
                                <TaskCard
                                    key={task.id}
                                    task={task}
                                    band={uniformBand ? 'soon' : toActiveBand(task.band)}
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
                                        onToggleSubtasks
                                            ? () => onToggleSubtasks(task.id)
                                            : undefined
                                    }
                                    onStartTimer={
                                        onStartTimer ? () => onStartTimer(task.id) : undefined
                                    }
                                    openUpward={i >= upwardFrom}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};
