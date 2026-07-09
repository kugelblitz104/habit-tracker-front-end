import type { HabitRead, ProfileRead } from '@/api';
import { getHabits } from '@/features/habits/api/get-habits';
import { useAuth } from '@/lib/auth-context';
import { useResponsiveLayout } from '@/lib/use-responsive-layout';
import { DisplayStatus } from '@/types/types';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { HabitCheckboxRow } from './habit-checkbox-row';

type TodayHabitsPanelProps = {
    profile: ProfileRead | null;
};

const UNCATEGORIZED = 'Uncategorized';

/**
 * Cool-toned "Today's habits" panel. Fetches the active profile's habits, groups
 * them by category into a responsive grid, and shows a done/auto/skipped summary.
 * When the profile has habits disabled it renders the dashed off-state note.
 * Dimmed via `opacity: var(--quiet)`.
 */
export const TodayHabitsPanel = ({ profile }: TodayHabitsPanelProps) => {
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
            <div className='mb-4 flex items-center gap-3'>
                <h2 className='font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-habit-label'>
                    Today&apos;s habits
                </h2>
                <span className='font-mono text-[10.5px] text-text-faint'>
                    {summary.done} done · {summary.auto} auto · {summary.skipped} skipped
                </span>
            </div>

            {habitsQuery.isLoading ? (
                <p className='font-mono text-[12px] text-text-faint'>Loading habits…</p>
            ) : habits.length === 0 ? (
                <p className='font-mono text-[12px] text-text-faint'>No habits yet.</p>
            ) : (
                <div
                    className={`grid gap-x-8 gap-y-5 ${isPhone ? 'grid-cols-1' : 'grid-cols-2'}`}
                >
                    {grouped.map(([category, categoryHabits]) => (
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
