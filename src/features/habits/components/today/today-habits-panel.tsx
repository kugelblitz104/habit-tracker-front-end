import type { HabitRead, ProfileRead } from '@/api';
import { getHabits } from '@/features/habits/api/get-habits';
import { useAuth } from '@/lib/auth-context';
import { useResponsiveLayout } from '@/lib/use-responsive-layout';
import { DisplayStatus } from '@/types/types';
import { Switch } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { HabitCheckboxRow } from './habit-checkbox-row';

type TodayHabitsPanelProps = {
    profile: ProfileRead | null;
    /** Wide (lg/xl) master-detail: name clicks open the side pane instead of
     *  navigating. Leave undefined on narrow layouts so rows keep their Link. */
    onSelectHabit?: (habitId: number) => void;
};

const UNCATEGORIZED = 'Uncategorized';

/**
 * Cool-toned "Today's habits" panel. Fetches the active profile's habits, groups
 * them by category into a responsive grid, and shows a done/auto/skipped summary.
 * When the profile has habits disabled it renders the dashed off-state note.
 * Dimmed via `opacity: var(--quiet)`.
 */
export const TodayHabitsPanel = ({ profile, onSelectHabit }: TodayHabitsPanelProps) => {
    const { user } = useAuth();
    const userId = user?.id ?? 0;
    const layoutSize = useResponsiveLayout();
    const isPhone = layoutSize === 'sm';

    const habitsQuery = useQuery({
        queryKey: ['habits', { userId, profileId: profile?.id }],
        queryFn: () => getHabits(userId, 100, profile?.id),
        enabled: !!userId && !!profile?.id && profile?.habits_enabled !== false,
        staleTime: 1000 * 60
    });

    // Per-habit today status, reported up from each row, for the summary counts.
    const [statuses, setStatuses] = useState<Map<number, DisplayStatus>>(new Map());
    // Auto-skipped habits are hidden by default; toggle reveals them.
    const [showAutoSkipped, setShowAutoSkipped] = useState(false);
    const handleStatusChange = useCallback((habitId: number, status: DisplayStatus) => {
        setStatuses((prev) => {
            if (prev.get(habitId) === status) return prev;
            const next = new Map(prev);
            next.set(habitId, status);
            return next;
        });
    }, []);

    const habits = useMemo(
        () => (habitsQuery.data?.habits ?? []).filter((h) => !h.archived),
        [habitsQuery.data]
    );

    const grouped = useMemo(() => {
        const map = new Map<string, HabitRead[]>();
        for (const habit of habits) {
            const key = habit.category?.trim() || UNCATEGORIZED;
            const list = map.get(key) ?? [];
            list.push(habit);
            map.set(key, list);
        }
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [habits]);

    const summary = useMemo(() => {
        let done = 0;
        let auto = 0;
        let skipped = 0;
        for (const habit of habits) {
            const status = statuses.get(habit.id);
            if (status === DisplayStatus.COMPLETED) done += 1;
            else if (status === DisplayStatus.AUTO_SKIPPED) auto += 1;
            else if (status === DisplayStatus.SKIPPED) skipped += 1;
        }
        return { done, auto, skipped };
    }, [habits, statuses]);

    // Rendered groups with auto-skipped rows filtered out (unless revealed).
    // Categories left empty after filtering are dropped so their header hides.
    // Keys off the reactive status map — counts above stay on the full set.
    const visibleGroups = useMemo(() => {
        if (showAutoSkipped) return grouped;
        return grouped
            .map(
                ([category, categoryHabits]) =>
                    [
                        category,
                        categoryHabits.filter(
                            (h) => statuses.get(h.id) !== DisplayStatus.AUTO_SKIPPED
                        )
                    ] as const
            )
            .filter(([, categoryHabits]) => categoryHabits.length > 0);
    }, [grouped, statuses, showAutoSkipped]);

    // Per-profile feature toggle: habits off → dashed placeholder, no panel.
    if (profile && profile.habits_enabled === false) {
        return (
            <section className='mb-[30px]' style={{ opacity: 'var(--quiet)' }}>
                <div
                    className='rounded-row border border-dashed px-4 py-6 text-center font-mono text-[12px] text-text-faint'
                    style={{ borderColor: 'var(--habit-container-border)' }}
                >
                    Habits are off for this profile — turn them on in Settings.
                </div>
            </section>
        );
    }

    return (
        <section
            className='mb-[30px] rounded-card border p-5'
            style={{
                opacity: 'var(--quiet)',
                backgroundColor: 'var(--habit-container-bg)',
                borderColor: 'var(--habit-container-border)'
            }}
        >
            <div className='mb-4 flex items-start justify-between gap-3'>
                <div className='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
                    <h2 className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-habit-label'>
                        Today&apos;s habits
                    </h2>
                    <span className='font-mono text-[10.5px] text-text-faint'>
                        {summary.done} done · {summary.auto} auto · {summary.skipped} skipped
                    </span>
                </div>
                {summary.auto > 0 && (
                    <label className='flex shrink-0 cursor-pointer items-center gap-2'>
                        <span
                            className={`font-mono text-[10.5px] uppercase tracking-[0.12em] ${
                                showAutoSkipped ? 'text-habit-label' : 'text-text-muted'
                            }`}
                        >
                            Auto-skipped ({summary.auto})
                        </span>
                        <Switch
                            checked={showAutoSkipped}
                            onChange={setShowAutoSkipped}
                            aria-label='Show auto-skipped habits'
                            className='relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border transition-colors outline-none focus-visible:opacity-80'
                            style={{
                                borderColor: showAutoSkipped
                                    ? 'var(--color-habit-accent)'
                                    : 'var(--habit-container-border)',
                                backgroundColor: showAutoSkipped
                                    ? 'var(--color-habit-accent)'
                                    : 'transparent'
                            }}
                        >
                            <span
                                aria-hidden='true'
                                className='pointer-events-none inline-block h-3 w-3 rounded-full transition-transform'
                                style={{
                                    backgroundColor: '#eef3f7',
                                    transform: showAutoSkipped
                                        ? 'translateX(16px)'
                                        : 'translateX(2px)'
                                }}
                            />
                        </Switch>
                    </label>
                )}
            </div>

            {habitsQuery.isLoading ? (
                <p className='font-mono text-[12px] text-text-faint'>Loading habits…</p>
            ) : habits.length === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>No habits yet.</p>
            ) : visibleGroups.length === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>
                    All caught up — {summary.auto} auto-skipped hidden
                </p>
            ) : (
                <div className={`grid gap-x-8 gap-y-5 ${isPhone ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {visibleGroups.map(([category, categoryHabits]) => (
                        <div key={category}>
                            <p className='mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-habit-label'>
                                {category}
                            </p>
                            <div className='flex flex-col'>
                                {categoryHabits.map((habit) => (
                                    <HabitCheckboxRow
                                        key={habit.id}
                                        habit={habit}
                                        onStatusChange={handleStatusChange}
                                        onSelectHabit={onSelectHabit}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};
