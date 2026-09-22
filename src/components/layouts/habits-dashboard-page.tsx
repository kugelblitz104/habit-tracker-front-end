import type { HabitRead } from '@/api';
import { useCreateHabit } from '@/features/habits/api/create-habits';
import { useHabits } from '@/features/habits/api/get-habits';
import { habitKeys } from '@/features/habits/api/query-keys';
import { HabitCaptureForm } from '@/features/habits/components/habit-capture-form';
import { HabitDetailPane } from '@/features/habits/components/details/habit-detail-pane';
import { HabitList } from '@/features/habits/components/dashboard/habit-list';
import { HabitListSkeleton } from '@/features/habits/components/dashboard/habit-list-skeleton';
import { SortHabitModal } from '@/features/habits/components/modals/sort-habit-modal';
import { useHabitDetailPane } from '@/features/habits/hooks/use-habit-detail-pane';
import {
    readRememberedHabitCount,
    rememberHabitCount
} from '@/features/habits/utils/remembered-habit-count';
import {
    useHabitKpisBatch,
    useHabitTrackersBatch
} from '@/features/habits/hooks/use-habit-batch-data';
import {
    buildHabitRowData,
    countHabitsLeft,
    countHabitsLeftFromFlags
} from '@/features/habits/utils/habit-row-data';
import { CaptureBar } from '@/features/tasks/components/capture-bar';
import { PageShell } from '@/components/layouts/page-shell';
import { useAuth } from '@/lib/auth-context';
import { toLocalDateString } from '@/lib/date-utils';
import { useOpenFromSearchState } from '@/lib/use-open-from-search-state';
import { useResponsiveLayout, DASHBOARD_DAYS_BY_SIZE } from '@/lib/use-responsive-layout';
import { GripVertical } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Navigate } from 'react-router';
import { ErrorPage } from './error-page';
import { useSortHabits } from '@/features/habits/api/update-habits';
import { toast } from 'react-toastify';

const ghostButton =
    'inline-flex min-h-[36px] items-center gap-1.5 rounded-button border px-2.5 py-1.5 font-mono ' +
    'text-[11.5px] text-text-secondary transition-colors pointer-coarse:min-h-[44px]';

// Follows the active_profile localStorage key naming (see auth-context.tsx).
const GROUP_BY_CATEGORY_STORAGE_KEY = 'habits_group_by_category';

export const HabitsDashboard = () => {
    const layoutSize = useResponsiveLayout();
    const days = DASHBOARD_DAYS_BY_SIZE[layoutSize];
    const isSmall = layoutSize === 'sm';
    const { user, activeProfile, activeProfileId } = useAuth();

    const { isWide, selectedHabitId, selectHabit, closeHabit } = useHabitDetailPane();

    // Open a habit's detail pane when arriving from global search (wide screens
    // route here with the id in router state; narrow goes to /details/:id).
    useOpenFromSearchState('openHabitId', selectHabit);

    const queryClient = useQueryClient();

    // hooks
    const [sortModalOpen, setSortModalOpen] = useState(false);
    // Group-by-category display mode; hydrated from localStorage after mount
    // (SSR renders the default flat list, same pattern as active_profile).
    const [groupByCategory, setGroupByCategory] = useState(false);
    // Draft name from the capture bar's Shift+Enter; non-null swaps the bar for
    // the expanded HabitCaptureForm.
    const [captureName, setCaptureName] = useState<string | null>(null);

    useEffect(() => {
        setGroupByCategory(localStorage.getItem(GROUP_BY_CATEGORY_STORAGE_KEY) === 'true');
    }, []);

    // Size the skeleton from what this profile had last time, so the
    // placeholder table is the height the real one will be. Read during
    // render rather than in an effect: an effect would paint the fallback
    // first, which is the shift this is meant to avoid.
    const skeletonRows = useMemo(
        () => readRememberedHabitCount(activeProfileId),
        [activeProfileId]
    );

    const handleToggleGroupByCategory = () => {
        const next = !groupByCategory;
        localStorage.setItem(GROUP_BY_CATEGORY_STORAGE_KEY, String(next));
        setGroupByCategory(next);
    };
    // Scope habits to the active profile (keyed per profile so it caches
    // separately and matches the Today panel). Gate until a profile resolves.
    const habitsQuery = useHabits({ profileId: activeProfileId });
    const habits = habitsQuery.data?.habits ?? [];

    useEffect(() => {
        if (habitsQuery.isSuccess) rememberHabitCount(activeProfileId, habits.length);
    }, [habitsQuery.isSuccess, habits.length, activeProfileId]);

    const habitsAdd = useCreateHabit({
        mutationConfig: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: habitKeys.all });
                toast.success('Habit created');
            }
        }
    });

    const habitsSort = useSortHabits({
        mutationConfig: {
            onSuccess: () => {
                habitsQuery.refetch();
            }
        }
    });

    // Send it explicitly so a session open across midnight doesn't serve the
    // previous day.
    const endDate = toLocalDateString(new Date());
    const trackersBatch = useHabitTrackersBatch({ profileId: activeProfileId, days, endDate });
    const kpisBatch = useHabitKpisBatch({ profileId: activeProfileId });

    const rowData = useMemo(
        () => buildHabitRowData(habits, trackersBatch.byHabit, kpisBatch.byHabit, new Date()),
        [habits, trackersBatch.byHabit, kpisBatch.byHabit]
    );
    // `habits` and the two batches are independent queries and the batches are
    // heavier, so there is a window where every row's trackers read as empty
    // and every habit counts as outstanding. Approximate from the flags already
    // on HabitRead until the trackers batch lands, or the header counts up from
    // "All habits done" to a wrong figure and then down to the right one.
    const habitsLeft = trackersBatch.isSuccess
        ? countHabitsLeft(habits, rowData)
        : countHabitsLeftFromFlags(habits);

    // Quick-capture create path: a daily habit with a cool default color. Full
    // options (question, frequency, category…) live in the detail-pane editor.
    const handleCaptureHabit = async (name: string) => {
        if (!activeProfileId) return;
        try {
            await habitsAdd.mutateAsync({
                name,
                question: '',
                color: '#7fa8c9',
                frequency: 1,
                range: 1,
                profile_id: activeProfileId
            });
        } catch (error) {
            toast.error('Failed to add habit. Please try again.');
            // Re-throw so the capture bar keeps the typed text for a retry.
            throw error;
        }
    };

    // Habits disabled for this profile → the feature is hidden wholesale, so the
    // dashboard route itself bounces to Today (the nav tab is already gone).
    if (activeProfile && activeProfile.habits_enabled === false) {
        return <Navigate to='/' replace />;
    }

    if (!user) {
        return <ErrorPage message='User not authenticated' />;
    }

    if (habitsQuery.isError) {
        return <ErrorPage message='Error loading habits' />;
    }

    const showPane = isWide && selectedHabitId != null;
    const subline = `${habits.length} ${habits.length === 1 ? 'habit' : 'habits'}`;
    // Header = how many of today's habits still need doing, using the SAME rule
    // as the Incomplete filter (auto-skipped habits don't count).
    const headerTitle =
        habitsLeft > 0
            ? `${habitsLeft} ${habitsLeft === 1 ? 'habit' : 'habits'} left`
            : 'All habits done';

    return (
        <PageShell
            isWide={isWide}
            showPane={showPane}
            pane={
                <HabitDetailPane habitId={selectedHabitId} isWide={isWide} onClose={closeHabit} />
            }
            afterRow={
                <SortHabitModal
                    key={sortModalOpen ? 'open' : 'closed'} // Force remount to reset state
                    isOpen={sortModalOpen}
                    onClose={() => setSortModalOpen(false)}
                    handleSortHabits={(reorderedHabits: HabitRead[]) =>
                        habitsSort.mutate(reorderedHabits.map((h) => h.id))
                    }
                    habits={habits}
                />
            }
        >
            {/* Header */}
            <header className='mb-[30px] flex items-start justify-between gap-4'>
                <div>
                    <h1 className='font-display text-[23px] font-bold tracking-[-0.01em] text-text-primary'>
                        {headerTitle}
                    </h1>
                    <p className='mt-0.5 font-mono text-[12px] text-text-muted'>{subline}</p>
                </div>
                <button
                    type='button'
                    onClick={() => setSortModalOpen(true)}
                    disabled={groupByCategory}
                    title={groupByCategory ? 'Disable grouping to reorder' : 'Change custom order'}
                    className={`${ghostButton} ${
                        groupByCategory
                            ? 'cursor-not-allowed opacity-45'
                            : 'hover:text-text-primary'
                    }`}
                    style={{ borderColor: 'var(--habit-container-border)' }}
                >
                    <GripVertical size={13} />
                    Reorder
                </button>
            </header>

            {captureName !== null && activeProfileId ? (
                <HabitCaptureForm
                    profileId={activeProfileId}
                    initialName={captureName}
                    onClose={() => setCaptureName(null)}
                />
            ) : (
                <CaptureBar
                    onCapture={handleCaptureHabit}
                    onExpand={setCaptureName}
                    disabled={!activeProfileId}
                    isPending={habitsAdd.isPending}
                    placeholder='Add a habit'
                />
            )}

            {habitsQuery.isLoading ? (
                <HabitListSkeleton rows={skeletonRows} days={days} isSmall={isSmall} />
            ) : (
                <HabitList
                    habits={habits}
                    days={days}
                    isSmall={isSmall}
                    isWide={isWide}
                    selectedHabitId={selectedHabitId}
                    onSelectHabit={selectHabit}
                    groupByCategory={groupByCategory}
                    onToggleGroupByCategory={handleToggleGroupByCategory}
                    rowData={rowData}
                />
            )}
        </PageShell>
    );
};
