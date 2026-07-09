import type { ProjectRead } from '@/api';
import { ProtectedRoute } from '@/features/auth/components/protected-route';
import { TodayHabitsPanel } from '@/features/habits/components/today/today-habits-panel';
import { useProjects } from '@/features/projects/api/get-projects';
import { useCreateTask } from '@/features/tasks/api/create-tasks';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useUpdateTask } from '@/features/tasks/api/update-tasks';
import { BandSection } from '@/features/tasks/components/band-section';
import { CaptureBar } from '@/features/tasks/components/capture-bar';
import { CompletedSection } from '@/features/tasks/components/completed-section';
import { TaskDetailPane } from '@/features/tasks/components/task-detail-pane';
import { TodaySchedule } from '@/features/tasks/components/today-schedule';
import { useTaskDetailPane } from '@/features/tasks/hooks/use-task-detail-pane';
import { formatShortDate } from '@/features/tasks/utils/task-format';
import { ProfileSwitcher } from '@/features/profiles/components/profile-switcher';
import { useAuth } from '@/lib/auth-context';
import { ACTIVE_TASK_BANDS, type TaskStatus } from '@/types/types';
import { useMemo } from 'react';
import { toast } from 'react-toastify';
import type { Route } from './+types/today';

export function meta({}: Route.MetaArgs) {
    return [{ title: 'Today' }, { name: 'description', content: 'Your tasks for today' }];
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function TodayContent() {
    const { activeProfile, activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;

    const tasksQuery = useTasks({ profileId });
    const projectsQuery = useProjects({ profileId });
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();

    const { isWide, notesTaskId, selectedEditTaskId, toggleNotes, selectEdit, closeEdit } =
        useTaskDetailPane();

    const tasks = tasksQuery.data?.tasks ?? [];
    const selectedTask = tasks.find((task) => task.id === selectedEditTaskId) ?? null;
    const showPane = isWide && selectedTask !== null;

    const projectsById = useMemo(() => {
        const map = new Map<number, ProjectRead>();
        for (const project of projectsQuery.data?.projects ?? []) {
            map.set(project.id, project);
        }
        return map;
    }, [projectsQuery.data]);

    // Group by the server-computed band (the UI never sets or computes a band).
    const grouped = useMemo(
        () =>
            ACTIVE_TASK_BANDS.map((band) => ({
                band,
                tasks: tasks.filter((task) => task.band === band)
            })),
        [tasks]
    );

    // Count only tasks that actually land in a rendered band, so the "N open"
    // figure never includes tasks (e.g. an unknown/hidden band) shown nowhere.
    const openCount = useMemo(
        () => grouped.reduce((sum, group) => sum + group.tasks.length, 0),
        [grouped]
    );

    const subline = useMemo(() => {
        const now = new Date();
        const weekday = WEEKDAYS[now.getDay()];
        return `${weekday} · ${formatShortDate(now)} · ${openCount} open`;
    }, [openCount]);

    const handleCapture = async (title: string) => {
        if (!activeProfileId) return;
        try {
            await createTask.mutateAsync({ profile_id: activeProfileId, title });
        } catch (error) {
            toast.error('Failed to add task. Please try again.');
            // Re-throw so the capture bar keeps the typed text for a retry.
            throw error;
        }
    };

    const handleStatusChange = (taskId: number, status: TaskStatus) => {
        updateTask.mutate({ taskId, data: { status } });
    };

    return (
        <div className='min-h-screen' style={{ backgroundColor: 'var(--bg)' }}>
            <div
                className={`mx-auto px-5 py-7 md:px-7 ${
                    showPane ? 'max-w-[1400px]' : 'max-w-[1000px]'
                }`}
            >
                <div className={isWide ? 'flex items-start gap-6' : undefined}>
                    <div className='min-w-0 flex-1'>
                        {/* Header */}
                        <header className='mb-[30px] flex items-start justify-between gap-4'>
                            <div>
                                <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                                    Today
                                </h1>
                                <p className='mt-0.5 font-mono text-[12px] text-text-muted'>
                                    {subline}
                                </p>
                            </div>
                            <ProfileSwitcher />
                        </header>

                        <CaptureBar
                            onCapture={handleCapture}
                            disabled={!activeProfileId}
                            isPending={createTask.isPending}
                        />

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
                                onSelectEdit={selectEdit}
                                emptyHint={
                                    band === 'now' ? 'Nothing needs you right now.' : undefined
                                }
                            />
                        ))}

                        <TodayHabitsPanel profile={activeProfile} />

                        <TodaySchedule />

                        <CompletedSection profileId={activeProfileId} />
                    </div>

                    <TaskDetailPane task={selectedTask} isWide={isWide} onClose={closeEdit} />
                </div>
            </div>
        </div>
    );
}

export default function Today() {
    return (
        <ProtectedRoute>
            <TodayContent />
        </ProtectedRoute>
    );
}
