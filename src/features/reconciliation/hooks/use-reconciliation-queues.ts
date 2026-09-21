import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { HabitRead, ProjectRead, TaskRead } from '@/api';
import { useHabits } from '@/features/habits/api/get-habits';
import { useProjects } from '@/features/projects/api/get-projects';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { getTrackersLite } from '@/features/trackers/api/get-trackers';
import { calculateCompletionRate } from '@/features/trackers/utils/kpi-utils';
import { useAuth } from '@/lib/auth-context';
import { toLocalDateString } from '@/lib/date-utils';

import type { HabitCandidate, ReconciliationWindows } from '../utils/queues';
import {
    orphanedSubtasks,
    quietProjects,
    staleTasks,
    strugglingHabits,
    windowsFromProfile
} from '../utils/queues';

export type ReconciliationQueues = {
    windows: ReconciliationWindows;
    staleTasks: TaskRead[];
    quietProjects: ProjectRead[];
    strugglingHabits: HabitRead[];
    /** Completion rate by habit id, so a row can show the figure it was judged
     *  on rather than asserting "struggling" without evidence. */
    habitRates: Map<number, number>;
    orphanedSubtasks: TaskRead[];
    /** Rows across the three queues that cost no extra requests. The Today card
     *  offers itself on this rather than on the total. */
    cheapCount: number;
    /** Whether the habit queue was computed at all (see `includeHabits`). */
    habitsIncluded: boolean;
    isLoading: boolean;
    isError: boolean;
};

type UseReconciliationQueuesOptions = {
    /**
     * Pay for the habit queue's per-habit tracker fan-out.
     *
     * The Today card passes `false` on purpose: one request per active habit to
     * decorate a nudge is the wrong trade on the app's most-visited page, and a
     * struggling habit is both the least urgent of the four and already visible
     * on Insights. The page itself passes `true`.
     */
    includeHabits: boolean;
};

/**
 * The four queues, composed from reads Today already holds in cache.
 *
 * `useTasks`, `useTasks({ closedOnly })` and `useProjects` are the identical
 * hook calls `today-page.tsx` makes, so on Today they are cache hits and cost
 * nothing. Only the tracker fan-out is new, which is why it is opt-in.
 */
export const useReconciliationQueues = ({
    includeHabits
}: UseReconciliationQueuesOptions): ReconciliationQueues => {
    const { activeProfile, activeProfileId } = useAuth();
    const profileId = activeProfileId ?? undefined;

    // Stable per mount: every window is measured in weeks, so a ticking clock
    // would only churn renders.
    const now = useMemo(() => new Date(), []);
    const windows = useMemo(() => windowsFromProfile(activeProfile), [activeProfile]);

    const activeTasksQuery = useTasks({ profileId });
    const closedTasksQuery = useTasks({ profileId, closedOnly: true });
    const projectsQuery = useProjects({ profileId });
    const habitsQuery = useHabits({ profileId, queryConfig: { enabled: includeHabits } });

    const habitsForRate = useMemo(
        () => (habitsQuery.data?.habits ?? []).filter((habit) => !habit.archived),
        [habitsQuery.data]
    );

    // endDate is sent EXPLICITLY so the resolved day lands in the query key;
    // three existing getTrackersLite callers omit it, and a session open across
    // midnight then serves the previous day. The window is in the key too, so
    // changing the setting refetches rather than serving a stale rate.
    const today = toLocalDateString(now);
    const trackerQueries = useQueries({
        queries: habitsForRate.map((habit) => ({
            queryKey: ['trackers-lite', { habitId: habit.id }, windows.staleHabitDays, today],
            queryFn: () => getTrackersLite(habit.id, today, windows.staleHabitDays),
            enabled: includeHabits,
            staleTime: 1000 * 60
        }))
    });

    const trackersReady = includeHabits && trackerQueries.every((query) => query.isSuccess);
    // The query objects are new references every render, so key the memo on a
    // primitive snapshot rather than on the array.
    const trackerFingerprint = trackerQueries
        .map((query) => query.data?.trackers?.length ?? -1)
        .join(',');

    const habitCandidates = useMemo<HabitCandidate[]>(() => {
        if (!trackersReady) return [];
        return habitsForRate.map((habit, index) => ({
            habit,
            completionRate: calculateCompletionRate(
                trackerQueries[index]?.data?.trackers ?? [],
                habit.frequency,
                habit.range,
                habit.created_date,
                windows.staleHabitDays
            )
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [habitsForRate, trackersReady, trackerFingerprint, windows.staleHabitDays]);

    const activeTasks = activeTasksQuery.data?.tasks ?? [];
    const closedTasks = closedTasksQuery.data?.tasks ?? [];
    const projects = projectsQuery.data?.projects ?? [];

    const stale = useMemo(
        () => staleTasks(activeTasks, windows.staleTaskDays, now),
        [activeTasks, windows.staleTaskDays, now]
    );
    const quiet = useMemo(
        () => quietProjects(projects, closedTasks, windows.staleProjectDays, now),
        [projects, closedTasks, windows.staleProjectDays, now]
    );
    const orphans = useMemo(
        () => orphanedSubtasks(activeTasks, closedTasks),
        [activeTasks, closedTasks]
    );
    const struggling = useMemo(
        () => strugglingHabits(habitCandidates, windows.staleHabitDays, now),
        [habitCandidates, windows.staleHabitDays, now]
    );

    const cheapQueries = [activeTasksQuery, closedTasksQuery, projectsQuery];
    const habitQueries = includeHabits ? [habitsQuery, ...trackerQueries] : [];

    return {
        windows,
        staleTasks: stale,
        quietProjects: quiet,
        strugglingHabits: struggling,
        habitRates: new Map(
            habitCandidates.map(({ habit, completionRate }) => [habit.id, completionRate])
        ),
        orphanedSubtasks: orphans,
        cheapCount: stale.length + quiet.length + orphans.length,
        habitsIncluded: includeHabits,
        isLoading: [...cheapQueries, ...habitQueries].some((query) => query.isLoading),
        isError: [...cheapQueries, ...habitQueries].some((query) => query.isError)
    };
};
