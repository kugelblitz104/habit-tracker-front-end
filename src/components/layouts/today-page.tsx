import type { ProjectRead } from '@/api';
import { AppHeader } from '@/components/layouts/app-header';
import { TodaySchedule } from '@/features/calendar/components/today-schedule';
import { ActiveTimerPanel } from '@/features/time-entries/components/active-timer-panel';
import { HabitDetailPane } from '@/features/habits/components/details/habit-detail-pane';
import { TodayHabitsPanel } from '@/features/habits/components/today/today-habits-panel';
import { useHabitDetailPane } from '@/features/habits/hooks/use-habit-detail-pane';
import { useProjects } from '@/features/projects/api/get-projects';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
import { BandSection } from '@/features/tasks/components/band-section';
import { CompletedSection } from '@/features/tasks/components/completed-section';
import {
    TaskCaptureBar,
    type TaskCaptureDraft
} from '@/features/tasks/components/task-capture-bar';
import { TaskCaptureForm } from '@/features/tasks/components/task-capture-form';
import { TaskDetailPane } from '@/features/tasks/components/task-detail-pane';
import { useTaskDetailPane } from '@/features/tasks/hooks/use-task-detail-pane';
import { countGroupedTasks, groupTasksByBand } from '@/features/tasks/utils/task-bands';
import { formatShortDate } from '@/features/tasks/utils/task-format';
import { useCreateTimeEntry } from '@/features/time-entries/api/create-time-entries';
import { apiErrorMessage } from '@/features/settings/lib/api-error-message';
import { parseServerDate, toLocalDateString } from '@/lib/date-utils';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH, PAGE_MAX_WIDTH_PANE } from '@/lib/layout';
import { TaskStatus, TimeEntryKind } from '@/types/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TodayDashboard = () => {
    const { activeProfile, activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;

    const tasksQuery = useTasks({ profileId });
    const projectsQuery = useProjects({ profileId });
    // Closed tasks (for the "done today" count under the header).
    const closedQuery = useTasks({ profileId, includeClosed: true, band: 'hidden' });
    const updateTask = useUpdateTask();
    const createTimeEntry = useCreateTimeEntry();

    // Shift+Enter / + in the capture bar expands it into the full details form,
    // carrying the parsed draft along. `null` = collapsed (plain capture bar).
    const [captureDraft, setCaptureDraft] = useState<TaskCaptureDraft | null>(null);

    // Collapse state for the (hidable) Whenever band, persisted per browser.
    const [hideWhenever, setHideWhenever] = useState(false);
    useEffect(() => {
        setHideWhenever(localStorage.getItem('today_hide_whenever') === '1');
    }, []);
    const toggleHideWhenever = useCallback(() => {
        setHideWhenever((prev) => {
            const next = !prev;
            localStorage.setItem('today_hide_whenever', next ? '1' : '0');
            return next;
        });
    }, []);

    const {
        isWide,
        notesTaskId,
        subtasksTaskId,
        selectedEditTaskId,
        editIntent,
        toggleNotes,
        toggleSubtasks,
        selectEdit,
        closeEdit
    } = useTaskDetailPane();
    const { selectedHabitId, selectHabit, closeHabit } = useHabitDetailPane();

    // Only ONE side pane at a time: selecting a habit closes the task editor and
    // vice versa. Wrapped here at the page level so the hooks stay independent.
    const handleSelectHabit = useCallback(
        (habitId: number) => {
            closeEdit();
            selectHabit(habitId);
        },
        [closeEdit, selectHabit]
    );
    const handleSelectEdit = useCallback(
        (taskId: number, editing?: boolean) => {
            closeHabit();
            selectEdit(taskId, editing);
        },
        [closeHabit, selectEdit]
    );

    const handleStartTimer = useCallback(
        (taskId: number) => {
            if (!activeProfileId) return;
            createTimeEntry.mutate(
                {
                    profile_id: activeProfileId,
                    task_id: taskId,
                    kind: TimeEntryKind.STOPWATCH
                },
                {
                    onSuccess: () => toast.success('Timer started'),
                    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to start timer'))
                }
            );
        },
        [activeProfileId, createTimeEntry]
    );

    const tasks = tasksQuery.data?.tasks ?? [];
    // Keyed by id (not the task object) so the pane stays open even after a task
    // leaves the active list — e.g. once it's completed — instead of the layout
    // snapping back to full width.
    const showPane = isWide && (selectedEditTaskId !== null || selectedHabitId !== null);

    const projectsById = useMemo(() => {
        const map = new Map<number, ProjectRead>();
        for (const project of projectsQuery.data?.projects ?? []) {
            map.set(project.id, project);
        }
        return map;
    }, [projectsQuery.data]);

    const grouped = useMemo(() => groupTasksByBand(tasks), [tasks]);

    // Rendered-band count only, so the "N open" figure never includes tasks
    // (e.g. an unknown/hidden band) shown nowhere.
    const openCount = useMemo(() => countGroupedTasks(grouped), [grouped]);

    const headerDate = useMemo(() => {
        const now = new Date();
        return `${WEEKDAYS[now.getDay()]}, ${formatShortDate(now)}`;
    }, []);
    const subline = `${openCount} open`;

    // Status roll-up shown under the header: in-progress (incl. scheduled) and
    // blocked (incl. needs-info) count top-level tasks only; "done today" counts
    // every task and subtask completed today.
    const statusCounts = useMemo(() => {
        const topLevel = tasks.filter((t) => t.parent_id == null);
        const inProgress = topLevel.filter(
            (t) => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.SCHEDULED
        ).length;
        const blocked = topLevel.filter(
            (t) => t.status === TaskStatus.BLOCKED || t.status === TaskStatus.NEEDS_INFO
        ).length;
        const todayKey = toLocalDateString(new Date());
        // Counts both top-level tasks and subtasks completed today — finishing a
        // subtask is real progress and should show in the tally.
        const doneToday = (closedQuery.data?.tasks ?? []).filter(
            (t) =>
                t.status === TaskStatus.DONE &&
                t.closed_date != null &&
                toLocalDateString(parseServerDate(t.closed_date)) === todayKey
        ).length;
        return { inProgress, blocked, doneToday };
    }, [tasks, closedQuery.data]);

    const handleStatusChange = (taskId: number, status: TaskStatus) => {
        updateTask.mutate(
            { taskId, data: { status } },
            {
                // Only toast discrete, intentional completions — not every status
                // shuffle — so feedback stays meaningful rather than noisy.
                onSuccess: () => {
                    if (status === TaskStatus.DONE) toast.success('Task completed');
                    else if (status === TaskStatus.CANCELLED) toast.success('Task cancelled');
                },
                onError: (error) =>
                    toast.error(apiErrorMessage(error, 'Failed to update task status'))
            }
        );
    };

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH} />
            <div
                className={`mx-auto px-5 py-7 md:px-7 ${
                    showPane ? PAGE_MAX_WIDTH_PANE : PAGE_MAX_WIDTH
                }`}
            >
                <div className={isWide ? 'flex items-start gap-6' : undefined}>
                    <div className='min-w-0 flex-1'>
                        {/* Header */}
                        <header className='mb-[30px]'>
                            <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                                {headerDate}
                            </h1>
                            <div className='mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px]'>
                                <span className='text-text-muted'>{subline}</span>
                                <span className='text-text-faint'>·</span>
                                <span className='text-text-muted'>
                                    {statusCounts.inProgress} in progress
                                </span>
                                <span className='text-text-faint'>·</span>
                                <span
                                    style={
                                        statusCounts.blocked > 0
                                            ? { color: 'var(--color-danger)' }
                                            : { color: 'var(--color-text-muted)' }
                                    }
                                >
                                    {statusCounts.blocked} blocked
                                </span>
                                <span className='text-text-faint'>·</span>
                                <span className='text-text-muted'>
                                    {statusCounts.doneToday} done today
                                </span>
                            </div>
                        </header>

                        {captureDraft !== null && activeProfileId ? (
                            <TaskCaptureForm
                                profileId={activeProfileId}
                                initial={captureDraft}
                                onClose={() => setCaptureDraft(null)}
                            />
                        ) : (
                            <TaskCaptureBar
                                profileId={activeProfileId}
                                onExpand={setCaptureDraft}
                                disabled={!activeProfileId}
                            />
                        )}

                        {tasksQuery.isError && (
                            <p className='mb-6 font-mono text-[12px] text-danger'>
                                Failed to load tasks.
                            </p>
                        )}

                        {grouped.map(({ band, tasks: bandTasks }) => (
                            <BandSection
                                key={band}
                                band={band}
                                tasks={bandTasks}
                                projectsById={projectsById}
                                onStatusChange={handleStatusChange}
                                notesTaskId={notesTaskId}
                                selectedEditTaskId={selectedEditTaskId}
                                onToggleNotes={toggleNotes}
                                onSelectEdit={handleSelectEdit}
                                subtasksTaskId={subtasksTaskId}
                                onToggleSubtasks={toggleSubtasks}
                                onStartTimer={handleStartTimer}
                                emptyHint={
                                    band === 'now' ? 'Nothing needs you right now.' : undefined
                                }
                                collapsible={band === 'whenever'}
                                collapsed={band === 'whenever' ? hideWhenever : undefined}
                                onToggleCollapsed={
                                    band === 'whenever' ? toggleHideWhenever : undefined
                                }
                            />
                        ))}

                        <ActiveTimerPanel />

                        <TodayHabitsPanel
                            profile={activeProfile}
                            onSelectHabit={isWide ? handleSelectHabit : undefined}
                        />

                        <TodaySchedule />

                        <CompletedSection
                            profileId={activeProfileId}
                            onSelectTask={handleSelectEdit}
                            selectedTaskId={selectedEditTaskId}
                        />
                    </div>

                    <TaskDetailPane
                        taskId={selectedEditTaskId}
                        isWide={isWide}
                        onClose={closeEdit}
                        defaultEditing={editIntent}
                    />

                    <HabitDetailPane
                        habitId={selectedHabitId}
                        isWide={isWide}
                        onClose={closeHabit}
                    />
                </div>
            </div>
        </div>
    );
};
