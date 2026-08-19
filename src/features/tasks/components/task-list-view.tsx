import type { ProjectRead, TaskRead } from '@/api';
import type { TaskStatus } from '@/types/types';
import { useMemo } from 'react';
import { computeBand, toActiveBand } from '../utils/compute-band';
import { upwardFrom } from '../utils/task-bands';
import { buildTaskSections, type TaskControlsState } from '../utils/task-controls';
import type { SluggedEntity } from '@/lib/entity-ref';
import { SectionHeader } from './section-header';
import { TaskRow } from './task-row';

type TaskListViewProps = {
    tasks: TaskRead[];
    projectsById: Map<number, ProjectRead>;
    controls: TaskControlsState;
    onStatusChange: (taskId: number, status: TaskStatus) => void;
    notesTaskId: number | null;
    selectedEditTaskId: number | null;
    onToggleNotes: (taskId: number) => void;
    /** Passed the task, not just its id, so the detail URL can use its slug. */
    onSelectEdit: (task: SluggedEntity, editing?: boolean) => void;
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
    /** Multi-select mode: render per-card selection checkboxes. */
    selectionMode?: boolean;
    /** The currently-selected task ids (only meaningful in selection mode). */
    selectedIds?: Set<number>;
    /** Toggle a task's selection. */
    onToggleSelect?: (taskId: number) => void;
};

/**
 * Flat task surface renderer: applies the sort/group/filter controls and paints
 * the resulting sections with the same TaskRow used on Today. Grouping headers
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
    showProject = true,
    selectionMode = false,
    selectedIds,
    onToggleSelect
}: TaskListViewProps) => {
    const sections = useMemo(
        () => buildTaskSections(tasks, controls, projectsById),
        [tasks, controls, projectsById]
    );

    // Prominence only reads as ranking when the list is in band order, so any
    // other sort renders every row at the neutral `soon` tier.
    const flattenTiers = controls.sortBy !== 'smart';

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
                        <div
                            className='overflow-hidden rounded-card border'
                            style={{
                                backgroundColor: 'var(--surface-card-bg)',
                                borderColor: 'var(--surface-card-border)'
                            }}
                        >
                            {section.tasks.map((task, i) => (
                                <div
                                    key={task.id}
                                    className={i === 0 ? '' : 'border-t'}
                                    style={{ borderColor: 'var(--surface-card-border)' }}
                                >
                                    <TaskRow
                                        task={task}
                                        band={
                                            flattenTiers ? 'soon' : toActiveBand(computeBand(task))
                                        }
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
                                        onSelectEdit={(editing) => onSelectEdit(task, editing)}
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
                                        isFirst={i === 0}
                                        isLast={i === section.tasks.length - 1}
                                        selectable={selectionMode}
                                        selected={selectedIds?.has(task.id) ?? false}
                                        onToggleSelect={
                                            onToggleSelect
                                                ? () => onToggleSelect(task.id)
                                                : undefined
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};
