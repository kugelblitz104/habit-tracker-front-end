import type { HabitRead, TrackerLite, TrackerUpdate } from '@/api';
import { FilterList } from '@/components/ui/filter-list';
import { SortList } from '@/components/ui/sort-list';
import { ToggleButton } from '@/components/ui/buttons/toggle-button';
import { NoteDialog } from '@/features/habits/components/modals/note-dialog';
import {
    filterOptions,
    sortOptions,
    useHabitListSort
} from '@/features/habits/hooks/use-habit-list-sort';
import { useNoteDialog } from '@/features/habits/hooks/use-note-dialog';
import { getHabitKpis } from '@/features/habits/api/get-habit-kpis';
import type { HabitRowData } from '@/features/habits/utils/habit-row-data';
import { streakMap } from '@/features/habits/utils/habit-row-data';
import { invalidateHabitTrackers } from '@/features/trackers/api/query-keys';
import { useTrackerMutations } from '@/features/trackers/hooks/use-tracker-mutations';
import {
    cycleTrackerOptimistically,
    trackerCellKey
} from '@/features/trackers/utils/cycle-tracker';
import {
    patchHabitTrackersBatch,
    reconcileHabitKpis
} from '@/features/trackers/utils/habit-kpi-cache';
import { createNewTracker } from '@/features/trackers/utils/tracker-utils';
import { DisplayStatus, TrackerStatus } from '@/types/types';
import { Fragment, useCallback, useMemo, useRef } from 'react';
import { HabitListElement } from './habit-list-element';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTracker } from '@/features/trackers/api/get-trackers';
import { toast } from 'react-toastify';

export type HabitListProps = {
    habits: HabitRead[];
    days?: number;
    isSmall?: boolean;
    /** Wide (lg/xl) master-detail: name clicks open the pane instead of navigating. */
    isWide?: boolean;
    selectedHabitId?: number | null;
    onSelectHabit?: (habitId: number) => void;
    /** When true, render one section per category (alphabetical, Uncategorized last). */
    groupByCategory?: boolean;
    /** Renders the "Group by category" toggle next to the filters when provided. */
    onToggleGroupByCategory?: () => void;
    /** Everything each row renders, derived once by the page from the batch reads. */
    rowData: Map<number, HabitRowData>;
};

export const HabitList = ({
    habits,
    days = 0,
    isSmall = false,
    isWide = false,
    selectedHabitId = null,
    onSelectHabit,
    groupByCategory = false,
    onToggleGroupByCategory,
    rowData
}: HabitListProps) => {
    // hooks - use useMemo to prevent hydration mismatch
    const today = useMemo(() => new Date(), []);
    const date_formatter = new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit'
    });

    const queryClient = useQueryClient();

    // Memoized: `useHabitListSort` lists this in its sort/filter deps, and a
    // fresh Map every render re-runs the sort, the filter and the grouping.
    const streaks = useMemo(() => streakMap(rowData), [rowData]);

    const {
        selectedSort,
        sortDirection,
        selectedFilters,
        handleSortChange,
        handleFilterChange,
        sortedHabits,
        groupedHabits
    } = useHabitListSort(habits, streaks, groupByCategory);

    // Note dialog: `target` carries the habit id being annotated, since this one
    // dialog instance serves every row in the grid.
    const noteDialog = useNoteDialog<number>();

    const selectedTrackerQuery = useQuery({
        queryKey: ['tracker', noteDialog.trackerId],
        queryFn: () => getTracker(noteDialog.trackerId!),
        enabled: !!noteDialog.trackerId && noteDialog.isOpen,
        staleTime: 0
    });

    // Shared optimistic mutations so a note saved from this dashboard-level
    // dialog gets the same error handling + cache invalidation as every other
    // tracker write, instead of firing the raw API calls with no feedback.
    const { trackerCreate: noteTrackerCreate, trackerUpdate: noteTrackerUpdate } =
        useTrackerMutations({
            onSuccess: (data) => invalidateHabitTrackers(queryClient, data.habit_id),
            onError: () => toast.error('Failed to save note. Please try again.')
        });

    // Cells with a write in flight, keyed by habit and date. One mutation pair
    // serves the whole grid, so a single `isPending` boolean would silently
    // discard a click on a different habit.
    const inFlightRef = useRef(new Set<string>());

    // The windowed trackers batch carries auto_skipped_dates, and auto-skip for
    // a habit's OTHER days changes when one day is completed, so
    // `invalidateHabitTrackers` refetches it. The KPI batch is not invalidated
    // (that reruns a whole-profile full-history scan on every click); the one
    // habit that changed is refetched and written back instead. That read is
    // the only thing that moves the streak column, because the optimistic patch
    // deliberately leaves KPI figures alone rather than deriving them from the
    // rendered window.
    const { trackerCreate, trackerUpdate } = useTrackerMutations({
        onSuccess: (data) => {
            invalidateHabitTrackers(queryClient, data.habit_id);
            void reconcileHabitKpis(queryClient, data.habit_id, getHabitKpis);
        },
        onError: () => toast.error('Failed to update habit. Please try again.')
    });

    const handleToggle = useCallback(
        (habitId: number, date: Date) => {
            if (inFlightRef.current.has(trackerCellKey(habitId, date))) return;
            const row = rowData.get(habitId);
            if (!row) return;

            cycleTrackerOptimistically({
                habitId,
                date,
                trackers: row.trackers,
                patch: (update) => patchHabitTrackersBatch(queryClient, habitId, update),
                inFlight: inFlightRef.current,
                trackerCreate,
                trackerUpdate
            });
        },
        [rowData, queryClient, trackerCreate, trackerUpdate]
    );

    const handleNoteOpen = useCallback(
        (habitId: number, date: Date, tracker: TrackerLite | undefined) => {
            noteDialog.open({ date, trackerId: tracker?.id ?? null, target: habitId });
        },
        []
    );

    const handleNoteSave = useCallback(
        (noteText: string) => {
            if (!noteDialog.target || !noteDialog.date) return;
            const habit = habits.find((h) => h.id === noteDialog.target);
            if (!habit) return;

            if (noteDialog.trackerId === null) {
                // Create tracker with note
                const newTracker = createNewTracker(
                    habit.id,
                    noteDialog.date,
                    TrackerStatus.NOT_COMPLETED
                );
                newTracker.note = noteText;
                noteTrackerCreate.mutate(newTracker);
            } else {
                // Update existing tracker's note
                const update: TrackerUpdate = { note: noteText };
                noteTrackerUpdate.mutate({ id: noteDialog.trackerId, update });
            }

            noteDialog.close();
        },
        [noteDialog, habits, noteTrackerCreate, noteTrackerUpdate]
    );

    if (!habits || habits.length === 0) {
        return (
            <div className='rounded-card border border-dashed border-[var(--habit-container-border)] px-5 py-10 text-center font-mono text-[13px] text-[#8ba3b5]'>
                No habits found.
            </div>
        );
    }

    // When the incomplete filter is active, a habit that is completed or
    // auto-skipped for today is hidden. Rows report today's resolved status
    // in `rowData`, so visibility is derived directly rather than reported up.
    const incompleteActive = selectedFilters.includes('incomplete');
    const isRowVisible = (habit: HabitRead) =>
        !(
            incompleteActive &&
            (rowData.get(habit.id)?.status === DisplayStatus.COMPLETED ||
                rowData.get(habit.id)?.status === DisplayStatus.AUTO_SKIPPED)
        );
    const anyVisible = sortedHabits.some((h) => isRowVisible(h));
    const showAllDone = incompleteActive && sortedHabits.length > 0 && !anyVisible;

    // One section per category when grouping is on; otherwise a single
    // (uncategorized) section holding every sorted habit, so the render below
    // can loop over sections instead of branching.
    const sections: [string | null, HabitRead[]][] = groupedHabits ?? [[null, sortedHabits]];

    return (
        <div className='flex flex-col gap-4'>
            <div
                className='
                    flex
                    flex-wrap-reverse md:flex-row
                    items-start sm:items-center
                    gap-4 sm:justify-between

                '
            >
                <div className='flex w-full flex-wrap items-center gap-2 md:w-auto'>
                    <FilterList
                        filterOptions={filterOptions}
                        selectedFilters={selectedFilters}
                        onFilterChange={handleFilterChange}
                    />
                    {onToggleGroupByCategory && (
                        <ToggleButton isActive={groupByCategory} onClick={onToggleGroupByCategory}>
                            Group by category
                        </ToggleButton>
                    )}
                </div>
                <SortList
                    sortOptions={sortOptions}
                    selectedSort={selectedSort}
                    sortDirection={sortDirection}
                    onSortChange={handleSortChange}
                />
            </div>
            {showAllDone ? (
                <div className='rounded-card border border-dashed border-[var(--habit-container-border)] px-5 py-10 text-center font-mono text-[13px] text-[#8ba3b5]'>
                    Everything done for today! 🎉
                </div>
            ) : (
                <div className='overflow-hidden rounded-card border border-[var(--habit-container-border)] bg-[var(--habit-container-bg)]'>
                    <div className='overflow-x-auto'>
                        <table className='min-w-full table-auto'>
                            <thead>
                                <tr className='border-b border-[var(--habit-container-border)]'>
                                    <th
                                        scope='col'
                                        className={`px-4 py-3 text-left font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-habit-label)] ${
                                            isSmall ? 'w-[42%] max-w-[42%]' : 'w-1/4'
                                        }`}
                                    >
                                        Habit
                                    </th>
                                    {!isSmall && (
                                        <th
                                            scope='col'
                                            className='w-12 py-3 text-center font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-habit-label)]'
                                        >
                                            Streak
                                        </th>
                                    )}
                                    {Array.from({ length: days }, (_, i) => (
                                        <th
                                            key={i}
                                            scope='col'
                                            className={`w-9 py-3 text-center font-mono text-[10px] ${
                                                i === 0
                                                    ? 'text-[var(--color-habit-accent)]'
                                                    : 'text-[#5f7688]'
                                            }`}
                                        >
                                            {date_formatter.format(
                                                new Date(
                                                    today.getFullYear(),
                                                    today.getMonth(),
                                                    today.getDate() - i
                                                )
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sections.map(([category, categoryHabits]) => {
                                    // Rows self-hide under the incomplete filter; drop the
                                    // header when every row in the group is hidden so the
                                    // section disappears entirely. Ungrouped mode never has
                                    // a category label, so it never renders a header row.
                                    const groupVisible = categoryHabits.some((h) =>
                                        isRowVisible(h)
                                    );
                                    return (
                                        <Fragment key={category ?? '__all__'}>
                                            {category && groupVisible && (
                                                <tr className='border-b border-[rgba(120,168,205,.08)]'>
                                                    <td
                                                        colSpan={1 + (isSmall ? 0 : 1) + days}
                                                        className='px-4 pb-1.5 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-habit-label'
                                                    >
                                                        {category}
                                                    </td>
                                                </tr>
                                            )}
                                            {categoryHabits.map((habit) => {
                                                const row = rowData.get(habit.id);
                                                if (!row) return null;
                                                return (
                                                    <HabitListElement
                                                        key={habit.id}
                                                        habit={habit}
                                                        days={days}
                                                        isSmall={isSmall}
                                                        isWide={isWide}
                                                        isSelected={selectedHabitId === habit.id}
                                                        onSelectHabit={onSelectHabit}
                                                        filterIncomplete={incompleteActive}
                                                        row={row}
                                                        onToggle={handleToggle}
                                                        onNoteOpen={handleNoteOpen}
                                                    />
                                                );
                                            })}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <div className='font-mono text-[10.5px] text-[#5f7688]'>
                Right click to add or edit notes
            </div>
            <NoteDialog
                isOpen={noteDialog.isOpen}
                date={noteDialog.date || new Date()}
                note={selectedTrackerQuery.data?.note || ''}
                onClose={noteDialog.close}
                onSave={handleNoteSave}
            />
        </div>
    );
};
