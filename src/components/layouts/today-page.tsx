import type { ProjectRead } from '@/api';
import { AppHeader } from '@/components/layouts/app-header';
import { TodaySchedule } from '@/features/calendar/components/today-schedule';
import { HabitDetailPane } from '@/features/habits/components/details/habit-detail-pane';
import { TodayHabitsPanel } from '@/features/habits/components/today/today-habits-panel';
import { useHabitDetailPane } from '@/features/habits/hooks/use-habit-detail-pane';
import { useProjects } from '@/features/projects/api/get-projects';
import { useCreateTask } from '@/features/tasks/api/create-tasks';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
import { BandSection } from '@/features/tasks/components/band-section';
import { CaptureBar } from '@/features/tasks/components/capture-bar';
import { CompletedSection } from '@/features/tasks/components/completed-section';
import { TaskCaptureForm } from '@/features/tasks/components/task-capture-form';
import { TaskDetailPane } from '@/features/tasks/components/task-detail-pane';
import { useTaskDetailPane } from '@/features/tasks/hooks/use-task-detail-pane';
import { countGroupedTasks, groupTasksByBand } from '@/features/tasks/utils/task-bands';
import { formatShortDate } from '@/features/tasks/utils/task-format';
import { useAuth } from '@/lib/auth-context';
import { PAGE_MAX_WIDTH, PAGE_MAX_WIDTH_PANE } from '@/lib/layout';
import { TaskStatus } from '@/types/types';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TodayDashboard = () => {
    const { activeProfile, activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;

    const tasksQuery = useTasks({ profileId });
    const projectsQuery = useProjects({ profileId });
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();

    // Shift+Enter in the capture bar expands it into the full details form,
    // carrying the typed text along. `null` = collapsed (plain capture bar).
    const [captureDraft, setCaptureDraft] = useState<string | null>(null);

    const { isWide, notesTaskId, selectedEditTaskId, toggleNotes, selectEdit, closeEdit } =
        useTaskDetailPane();
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
        (taskId: number) => {
            closeHabit();
            selectEdit(taskId);
        },
        [closeHabit, selectEdit]
    );

    const tasks = tasksQuery.data?.tasks ?? [];
    const selectedTask = tasks.find((task) => task.id === selectedEditTaskId) ?? null;
    const showPane = isWide && (selectedTask !== null || selectedHabitId !== null);

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

    const subline = useMemo(() => {
        const now = new Date();
        const weekday = WEEKDAYS[now.getDay()];
        return `${weekday} · ${formatShortDate(now)} · ${openCount} open`;
    }, [openCount]);

    const handleCapture = async (title: string) => {
        if (!activeProfileId) return;
        try {
            await createTask.mutateAsync({ profile_id: activeProfileId, title });
            toast.success('Task created');
        } catch (error) {
            toast.error('Failed to add task. Please try again.');
            // Re-throw so the capture bar keeps the typed text for a retry.
            throw error;
        }
    };

    const handleStatusChange = (taskId: number, status: TaskStatus) => {
        updateTask.mutate(
            { taskId, data: { status } },
            {
                // Only toast discrete, intentional completions — not every status
                // shuffle — so feedback stays meaningful rather than noisy.
                onSuccess: () => {
                    if (status === TaskStatus.DONE) toast.success('Task completed');
                    else if (status === TaskStatus.CANCELLED) toast.success('Task cancelled');
                }
            }
        );
    };

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'var(--bg)' }}>
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
                                Today
                            </h1>
                            <p className='mt-0.5 font-mono text-[12px] text-text-muted'>
                                {subline}
                            </p>
                        </header>

                        {captureDraft !== null && activeProfileId ? (
                            <TaskCaptureForm
                                profileId={activeProfileId}
                                initialTitle={captureDraft}
                                onClose={() => setCaptureDraft(null)}
                            />
                        ) : (
                            <CaptureBar
                                onCapture={handleCapture}
                                onExpand={setCaptureDraft}
                                disabled={!activeProfileId}
                                isPending={createTask.isPending}
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
                                emptyHint={
                                    band === 'now' ? 'Nothing needs you right now.' : undefined
                                }
                            />
                        ))}

                        <TodayHabitsPanel
                            profile={activeProfile}
                            onSelectHabit={isWide ? handleSelectHabit : undefined}
                        />

                        <TodaySchedule />

                        <CompletedSection profileId={activeProfileId} />
                    </div>

                    <TaskDetailPane task={selectedTask} isWide={isWide} onClose={closeEdit} />

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
