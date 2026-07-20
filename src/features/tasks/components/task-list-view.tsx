import type { ProjectRead, TaskRead } from '@/api';
import type { TaskStatus } from '@/types/types';
import { useMemo } from 'react';
import { toActiveBand, upwardFrom } from '../utils/task-bands';
import { buildTaskSections, type TaskControlsState } from '../utils/task-controls';
import { SectionHeader } from './section-header';
import { TaskCard } from './task-card';

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
    /** Shown when the surface has no tasks at all (nothing to filter). */
    emptyHint?: string;
    /** Shown when there ARE tasks but the current filters exclude them all. */
    noMatchesHint?: string;
    /** Whether to render each card's project pip. Default true; the project
     *  view passes false since every card already shares that one project. */
    showProject?: boolean;
};

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
    emptyHint = 'No tasks yet.',
    noMatchesHint = 'No tasks match these filters.',
    showProject = true
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
        // Distinguish a genuinely empty surface from one whose tasks are all
        // filtered out — the fix is different (add one vs. loosen filters).
        const hint = tasks.length === 0 ? emptyHint : noMatchesHint;
        return <p className='font-mono text-[12px] text-text-faint'>{hint}</p>;
    }

    return (
        <div className='flex flex-col gap-[26px]'>
            {sections.map((section) => {
                const upwardIdx = upwardFrom(section.tasks.length);
                return (
                    <section key={section.key}>
                        {section.label && (
                            <div className='mb-2.5 flex items-center gap-2'>
                                <SectionHeader
                                    label={section.label}
                                    color={section.color}
                                    count={section.tasks.length}
                                    dot
                                />
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
                                    showProject={showProject}
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
                                    openUpward={i >= upwardIdx}
                                />
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};
