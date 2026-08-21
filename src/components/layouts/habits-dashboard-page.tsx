import type { HabitRead } from '@/api';
import { useCreateHabit } from '@/features/habits/api/create-habits';
import { useHabits } from '@/features/habits/api/get-habits';
import { HabitCaptureForm } from '@/features/habits/components/habit-capture-form';
import { HabitDetailPane } from '@/features/habits/components/details/habit-detail-pane';
import { HabitList } from '@/features/habits/components/dashboard/habit-list';
import { SortHabitModal } from '@/features/habits/components/modals/sort-habit-modal';
import { useHabitDetailPane } from '@/features/habits/hooks/use-habit-detail-pane';
import { CaptureBar } from '@/features/tasks/components/capture-bar';
import { PageShell } from '@/components/layouts/page-shell';
import { useAuth } from '@/lib/auth-context';
import { useOpenFromSearchState } from '@/lib/use-open-from-search-state';
import { useResponsiveLayout, DASHBOARD_DAYS_BY_SIZE } from '@/lib/use-responsive-layout';
import { GripVertical } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { ErrorPage } from './error-page';
import { LoadingPage } from './loading-page';
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

    // hooks
    const [habits, setHabits] = useState<HabitRead[]>([]);
    const [sortModalOpen, setSortModalOpen] = useState(false);
    // Group-by-category display mode; hydrated from localStorage after mount
    // (SSR renders the default flat list, same pattern as active_profile).
    const [groupByCategory, setGroupByCategory] = useState(false);
    // Draft name from the capture bar's Shift+Enter; non-null swaps the bar for
    // the expanded HabitCaptureForm.
    const [captureName, setCaptureName] = useState<string | null>(null);
    // "Habits left today" count reported up from HabitList, computed with the
    // same logic as the Incomplete filter (auto-skip aware). null until settled.
    const [incompleteCount, setIncompleteCount] = useState<number | null>(null);

    useEffect(() => {
        setGroupByCategory(localStorage.getItem(GROUP_BY_CATEGORY_STORAGE_KEY) === 'true');
    }, []);

    const handleToggleGroupByCategory = () => {
        const next = !groupByCategory;
        localStorage.setItem(GROUP_BY_CATEGORY_STORAGE_KEY, String(next));
        setGroupByCategory(next);
    };
    // Scope habits to the active profile (keyed per profile so it caches
    // separately and matches the Today panel). Gate until a profile resolves.
    const habitsQuery = useHabits({ profileId: activeProfileId });

    const habitsAdd = useCreateHabit({
        mutationConfig: {
            onSuccess: (data) => {
                setHabits((prev) => [...prev, data]);
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

    // Effect to set habits from query data
    useEffect(() => {
        if (habitsQuery.data?.habits) {
            setHabits(habitsQuery.data.habits);
        }
    }, [habitsQuery.data]);

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

    if (habitsQuery.isLoading) {
        return <LoadingPage />;
    }

    if (habitsQuery.isError) {
        return <ErrorPage message='Error loading habits' />;
    }

    const showPane = isWide && selectedHabitId != null;
    const subline = `${habits.length} ${habits.length === 1 ? 'habit' : 'habits'}`;
    // Header = how many of today's habits still need doing, using the SAME rule
    // as the Incomplete filter (HabitList reports it; auto-skipped habits don't
    // count). Until rows settle (`null`), fall back to a server-field
    // approximation so the title doesn't flash a wrong figure.
    const approxLeft = habits.filter(
        (habit) => !habit.archived && !habit.completed_today && !habit.skipped_today
    ).length;
    const habitsLeft = incompleteCount ?? approxLeft;
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

            <HabitList
                habits={habits}
                days={days}
                isSmall={isSmall}
                isWide={isWide}
                selectedHabitId={selectedHabitId}
                onSelectHabit={selectHabit}
                groupByCategory={groupByCategory}
                onToggleGroupByCategory={handleToggleGroupByCategory}
                onIncompleteCountChange={setIncompleteCount}
            />
        </PageShell>
    );
};
