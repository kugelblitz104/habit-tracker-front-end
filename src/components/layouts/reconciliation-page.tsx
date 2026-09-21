import { AppHeader } from '@/components/layouts/app-header';
import { Button } from '@/components/ui/buttons/button';
import { CARD_SURFACE_CLASS, CARD_SURFACE_STYLE } from '@/components/ui/surface-styles';
import { useUpdateHabit } from '@/features/habits/api/update-habits';
import { useUpdateProfile } from '@/features/profiles/api/update-profiles';
import { useUpdateProject } from '@/features/projects/api/update-projects';
import { DATE_QUICK_SETS } from '@/features/tasks/components/task-context-menu/shared';
import { useBulkTaskActions } from '@/features/tasks/hooks/use-bulk-task-actions';
import { useTaskSelection } from '@/features/tasks/hooks/use-task-selection';
import { useAuth } from '@/lib/auth-context';
import { shiftDay, toLocalDateString } from '@/lib/date-utils';
import { PAGE_MAX_WIDTH } from '@/lib/layout';
import { TaskStatus } from '@/types/types';
import { useCallback, useMemo, useState } from 'react';

import type { QueueRow } from '@/features/reconciliation/components/queue-step';
import { QueueStep } from '@/features/reconciliation/components/queue-step';
import type { QueueSummary } from '@/features/reconciliation/components/reconciliation-entry';
import { ReconciliationEntry } from '@/features/reconciliation/components/reconciliation-entry';
import type { SummaryTally } from '@/features/reconciliation/components/reconciliation-summary';
import { ReconciliationSummary } from '@/features/reconciliation/components/reconciliation-summary';
import { useReconciliationQueues } from '@/features/reconciliation/hooks/use-reconciliation-queues';
import { writeLastRun } from '@/features/reconciliation/utils/last-run';
import { daysSinceLastRun, readLastRun } from '@/features/reconciliation/utils/last-run';
import type { ReconciliationWindows } from '@/features/reconciliation/utils/queues';
import { lastTouched } from '@/features/reconciliation/utils/queues';

type Phase = 'entry' | 'queues' | 'summary';

/** Display only: how long ago a row was last touched, in whole days. */
const untouchedDays = (
    row: { created_date: string; updated_date?: string | null },
    now: Date
): number => Math.floor((now.getTime() - lastTouched(row).getTime()) / 86_400_000);

const emptyTally = {
    cancelled: 0,
    rescheduled: 0,
    promoted: 0,
    projectsArchived: 0,
    habitsArchived: 0,
    kept: 0
};

type Tally = typeof emptyTally;

const TALLY_LABEL: Record<keyof Tally, string> = {
    cancelled: 'Tasks cancelled',
    rescheduled: 'Tasks rescheduled',
    promoted: 'Subtasks promoted to tasks',
    projectsArchived: 'Projects archived',
    habitsArchived: 'Habits archived',
    kept: 'Kept, and marked as reviewed'
};

/**
 * The reconciliation: a ritual you enter, which asks for decisions rather than
 * showing insights.
 *
 * Unlisted - no nav tab, reached from the Today card - because a page you want
 * every few weeks does not belong beside ones you visit daily.
 *
 * Stepped rather than four stacked sections on purpose: you cannot reach queue
 * three while avoiding queue two, and the summary is where "the list got
 * smaller" actually lands.
 */
export const ReconciliationPage = () => {
    const { activeProfile, activeProfileId } = useAuth();
    const queues = useReconciliationQueues({ includeHabits: true });
    const { selectedIds, toggle, selectMany, clear } = useTaskSelection();

    const [phase, setPhase] = useState<Phase>('entry');
    const [stepIndex, setStepIndex] = useState(0);
    const [tally, setTally] = useState<Tally>(emptyTally);

    const bulkTasks = useBulkTaskActions();
    const updateProject = useUpdateProject();
    const updateHabit = useUpdateHabit();
    const updateProfile = useUpdateProfile();

    const now = useMemo(() => new Date(), []);
    const today = toLocalDateString(now);
    const daysSince = daysSinceLastRun(
        activeProfileId ? readLastRun(activeProfileId) : null,
        today
    );

    const bump = useCallback((key: keyof Tally, count: number) => {
        setTally((prev) => ({ ...prev, [key]: prev[key] + count }));
    }, []);

    const onChangeWindow = useCallback(
        (key: keyof ReconciliationWindows, days: number) => {
            if (!activeProfileId) return;
            const field = {
                staleTaskDays: 'reconciliation_stale_task_days',
                staleProjectDays: 'reconciliation_stale_project_days',
                staleHabitDays: 'reconciliation_stale_habit_days'
            }[key];
            updateProfile.mutate({ profileId: activeProfileId, data: { [field]: days } });
        },
        [activeProfileId, updateProfile]
    );

    const ids = useMemo(() => Array.from(selectedIds), [selectedIds]);

    /** Every action ends the same way: clear the selection so the next verb
     *  cannot be applied to rows that have already left the queue. */
    const after = useCallback(
        (key: keyof Tally, count: number) => {
            bump(key, count);
            clear();
        },
        [bump, clear]
    );

    // Keep is an empty PATCH. The server stamps updated_date unconditionally,
    // which is the only thing that moves a row out of a staleness queue - so
    // "I looked at this and it stays" is a real write, not a dismissal.
    const keepTasks = async () => {
        const count = ids.length;
        await bulkTasks.updateMany(ids, {});
        after('kept', count);
    };

    const steps = useMemo(() => {
        const staleRows: QueueRow[] = queues.staleTasks.map((task) => ({
            id: task.id,
            title: task.title,
            meta: `untouched ${untouchedDays(task, now)} days`
        }));

        const projectRows: QueueRow[] = queues.quietProjects.map((project) => ({
            id: project.id,
            title: project.name,
            meta: `${project.open_count ?? 0} open · no closures in ${queues.windows.staleProjectDays} days`
        }));

        const habitRows: QueueRow[] = queues.strugglingHabits.map((habit) => ({
            id: habit.id,
            title: habit.name,
            meta: `${Math.round(queues.habitRates.get(habit.id) ?? 0)}% over ${queues.windows.staleHabitDays} days`
        }));

        const orphanRows: QueueRow[] = queues.orphanedSubtasks.map((task) => ({
            id: task.id,
            title: task.title,
            meta: `parent is closed · untouched ${untouchedDays(task, now)} days`
        }));

        return [
            {
                key: 'stale',
                label: 'Stale tasks',
                detail: `untouched ${queues.windows.staleTaskDays}+ days`,
                hint: 'Cancel it, give it a date, or keep it and put it out of mind for another window.',
                rows: staleRows,
                actions: (
                    <>
                        <Button
                            size='sm'
                            variant='subtle'
                            disabled={bulkTasks.isPending}
                            onClick={async () => {
                                const count = ids.length;
                                await bulkTasks.updateMany(ids, {
                                    status: TaskStatus.CANCELLED
                                });
                                after('cancelled', count);
                            }}
                        >
                            Cancel
                        </Button>
                        {/* The date grammar comes from the context menu's own
                            DATE_QUICK_SETS, so there is one set of offsets in the
                            app rather than two to keep in step. */}
                        {DATE_QUICK_SETS.map(({ label, offset }) => (
                            <Button
                                key={label}
                                size='sm'
                                variant='subtle'
                                disabled={bulkTasks.isPending}
                                onClick={async () => {
                                    const count = ids.length;
                                    await bulkTasks.updateMany(ids, {
                                        status: TaskStatus.SCHEDULED,
                                        scheduled_date: shiftDay(today, offset)
                                    });
                                    after('rescheduled', count);
                                }}
                            >
                                {label}
                            </Button>
                        ))}
                        <Button
                            size='sm'
                            variant='ghost'
                            disabled={bulkTasks.isPending}
                            onClick={keepTasks}
                        >
                            Keep
                        </Button>
                    </>
                )
            },
            {
                key: 'projects',
                label: 'Quiet projects',
                detail: `nothing closed in ${queues.windows.staleProjectDays} days`,
                hint: 'Archiving a project leaves its open tasks alone — they will turn up in the stale queue on their own.',
                rows: projectRows,
                actions: (
                    <>
                        <Button
                            size='sm'
                            variant='subtle'
                            disabled={updateProject.isPending}
                            onClick={async () => {
                                const count = ids.length;
                                await Promise.allSettled(
                                    ids.map((projectId) =>
                                        updateProject.mutateAsync({
                                            projectId,
                                            data: { archived: true }
                                        })
                                    )
                                );
                                after('projectsArchived', count);
                            }}
                        >
                            Archive
                        </Button>
                        <Button
                            size='sm'
                            variant='ghost'
                            disabled={updateProject.isPending}
                            onClick={async () => {
                                const count = ids.length;
                                await Promise.allSettled(
                                    ids.map((projectId) =>
                                        updateProject.mutateAsync({ projectId, data: {} })
                                    )
                                );
                                after('kept', count);
                            }}
                        >
                            Keep
                        </Button>
                    </>
                )
            },
            {
                key: 'habits',
                label: 'Struggling habits',
                detail: `under 20% over ${queues.windows.staleHabitDays} days`,
                hint: 'A habit you are not doing is costing you the dashboard, not just the habit.',
                rows: habitRows,
                actions: (
                    <>
                        <Button
                            size='sm'
                            variant='subtle'
                            disabled={updateHabit.isPending}
                            onClick={async () => {
                                const count = ids.length;
                                await Promise.allSettled(
                                    ids.map((habitId) =>
                                        updateHabit.mutateAsync({
                                            habitId,
                                            data: { archived: true }
                                        })
                                    )
                                );
                                after('habitsArchived', count);
                            }}
                        >
                            Archive
                        </Button>
                        <Button
                            size='sm'
                            variant='ghost'
                            disabled={updateHabit.isPending}
                            onClick={async () => {
                                const count = ids.length;
                                await Promise.allSettled(
                                    ids.map((habitId) =>
                                        updateHabit.mutateAsync({ habitId, data: {} })
                                    )
                                );
                                after('kept', count);
                            }}
                        >
                            Keep
                        </Button>
                    </>
                )
            },
            {
                key: 'orphans',
                label: 'Orphaned subtasks',
                detail: 'still open under a closed parent',
                hint: 'Promote it to a task of its own, or cancel it along with the parent it belonged to.',
                rows: orphanRows,
                actions: (
                    <>
                        <Button
                            size='sm'
                            variant='subtle'
                            disabled={bulkTasks.isPending}
                            onClick={async () => {
                                const count = ids.length;
                                await bulkTasks.updateMany(ids, { parent_id: null });
                                after('promoted', count);
                            }}
                        >
                            Promote
                        </Button>
                        <Button
                            size='sm'
                            variant='subtle'
                            disabled={bulkTasks.isPending}
                            onClick={async () => {
                                const count = ids.length;
                                await bulkTasks.updateMany(ids, {
                                    status: TaskStatus.CANCELLED
                                });
                                after('cancelled', count);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size='sm'
                            variant='ghost'
                            disabled={bulkTasks.isPending}
                            onClick={keepTasks}
                        >
                            Keep
                        </Button>
                    </>
                )
            }
        ];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        queues,
        ids,
        now,
        today,
        bulkTasks.isPending,
        updateProject.isPending,
        updateHabit.isPending
    ]);

    const summaries: QueueSummary[] = steps.map((step) => ({
        key: step.key,
        count: step.rows.length,
        label: step.label,
        detail: step.detail
    }));
    const total = summaries.reduce((sum, entry) => sum + entry.count, 0);

    const begin = () => {
        if (activeProfileId) writeLastRun(activeProfileId, today);
        setTally(emptyTally);
        clear();
        setStepIndex(0);
        setPhase('queues');
    };

    const next = () => {
        clear();
        if (stepIndex + 1 >= steps.length) setPhase('summary');
        else setStepIndex(stepIndex + 1);
    };

    const tallyList: SummaryTally[] = (Object.keys(TALLY_LABEL) as (keyof Tally)[]).map((key) => ({
        verb: TALLY_LABEL[key],
        count: tally[key]
    }));

    const step = steps[stepIndex];

    // Not PageShell: that component is for the master-detail surfaces and its
    // own docstring says pane-less pages (insights, projects) stay out of it
    // rather than widening its remit. This page has no pane, so it takes the
    // same scaffold projects-page.tsx uses.
    return (
        <div className='min-h-screen' style={{ backgroundColor: 'transparent' }}>
            <AppHeader maxWidthClass={PAGE_MAX_WIDTH} />
            <div className={`mx-auto px-5 py-7 md:px-7 ${PAGE_MAX_WIDTH}`}>
                <div className={CARD_SURFACE_CLASS} style={CARD_SURFACE_STYLE}>
                    {phase === 'entry' && (
                        <ReconciliationEntry
                            queues={summaries}
                            windows={queues.windows}
                            onChangeWindow={onChangeWindow}
                            daysSince={daysSince}
                            total={total}
                            isLoading={queues.isLoading}
                            onBegin={begin}
                        />
                    )}

                    {phase === 'queues' && step && (
                        <div className='flex flex-col gap-5'>
                            <p className='font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-faint'>
                                Step {stepIndex + 1} of {steps.length}
                                {activeProfile ? ` · ${activeProfile.name}` : ''}
                            </p>

                            <QueueStep
                                title={step.label}
                                hint={step.hint}
                                rows={step.rows}
                                selectedIds={selectedIds}
                                onToggle={toggle}
                                onSelectAll={() =>
                                    step.rows.every((row) => selectedIds.has(row.id))
                                        ? clear()
                                        : selectMany(step.rows.map((row) => row.id))
                                }
                                actions={step.actions}
                                isLoading={queues.isLoading}
                                isError={queues.isError}
                            />

                            <div className='flex justify-end'>
                                <Button size='md' variant='primary' onClick={next}>
                                    {stepIndex + 1 >= steps.length ? 'Finish' : 'Next'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {phase === 'summary' && (
                        <ReconciliationSummary
                            tally={tallyList}
                            onRestart={() => {
                                setTally(emptyTally);
                                setPhase('entry');
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
