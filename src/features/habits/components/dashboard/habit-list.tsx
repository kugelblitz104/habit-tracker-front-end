import type { HabitRead, TrackerLite, TrackerUpdate } from '@/api';
import { FilterList } from '@/components/ui/filter-list';
import { SortList } from '@/components/ui/sort-list';
import { ToggleButton } from '@/components/ui/buttons/toggle-button';
import { NoteDialog } from '@/features/habits/components/modals/note-dialog';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import { createNewTracker } from '@/features/trackers/utils/tracker-utils';
import {
    DisplayStatus,
    TrackerStatus,
    type DropdownOption,
    type SortDirection
} from '@/types/types';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { HabitListElement } from './habit-list-element';
import { useQuery } from '@tanstack/react-query';
import { getTracker } from '@/features/trackers/api/get-trackers';

const sortOptions: DropdownOption[] = [
    { field: 'sort_order', label: 'Custom Order' },
    { field: 'name', label: 'Name' },
    { field: 'color', label: 'Color' },
    { field: 'status', label: "Today's Status" },
    { field: 'streak', label: 'Streak' },
    { field: 'created', label: 'Created Date' },
    { field: 'updated', label: 'Updated Date' },
    { field: 'frequency', label: 'Frequency' },
    { field: 'range', label: 'Range' }
];

const filterOptions: DropdownOption[] = [
    { field: 'incomplete', label: 'Incomplete' },
    { field: 'archived', label: 'Archived' }
];

const UNCATEGORIZED = 'Uncategorized';

type NoteDialogState = {
    isOpen: boolean;
    habitId: number | null;
    date: Date | null;
    note: string;
    trackerId: number | null;
};

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
    /** Reports how many (non-archived) habits are still "to do" today — the same
     *  logic as the Incomplete filter (today status is not-completed or skipped,
     *  auto-skipped excluded). `null` until every row has reported. */
    onIncompleteCountChange?: (count: number | null) => void;
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
    onIncompleteCountChange
}: HabitListProps) => {
    // hooks - use useMemo to prevent hydration mismatch
    const today = useMemo(() => new Date(), []);
    const date_formatter = new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit'
    });

    const [selectedSort, setSelectedSort] = useState<DropdownOption>(sortOptions[0]!);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
    const [noteDialogState, setNoteDialogState] = useState<NoteDialogState>({
        isOpen: false,
        habitId: null,
        date: null,
        note: '',
        trackerId: null
    });
    const [habitStreaks, setHabitStreaks] = useState<Map<number, number>>(new Map());
    const [visibility, setVisibility] = useState<Map<number, boolean>>(new Map());
    const [todayStatuses, setTodayStatuses] = useState<Map<number, DisplayStatus>>(new Map());

    const selectedTrackerQuery = useQuery({
        queryKey: ['tracker', noteDialogState.trackerId],
        queryFn: () => getTracker(noteDialogState.trackerId!),
        enabled: !!noteDialogState.trackerId && noteDialogState.isOpen,
        staleTime: 0
    });

    // Callback for child components to report their streak values
    const handleStreakChange = useCallback((habitId: number, streak: number) => {
        setHabitStreaks((prev) => {
            // Only update if value actually changed to prevent unnecessary re-renders
            if (prev.get(habitId) === streak) return prev;
            const next = new Map(prev);
            next.set(habitId, streak);
            return next;
        });
    }, []);

    // Callback for child components to report whether they are visible under the
    // current filter. Deduped like handleStreakChange to avoid render loops.
    const handleVisibilityChange = useCallback((habitId: number, visible: boolean) => {
        setVisibility((prev) => {
            // Only update if value actually changed to prevent unnecessary re-renders
            if (prev.get(habitId) === visible) return prev;
            const next = new Map(prev);
            next.set(habitId, visible);
            return next;
        });
    }, []);

    // Rows report today's resolved status (incl. auto-skip); deduped to avoid loops.
    const handleTodayStatusChange = useCallback((habitId: number, status: DisplayStatus) => {
        setTodayStatuses((prev) => {
            if (prev.get(habitId) === status) return prev;
            const next = new Map(prev);
            next.set(habitId, status);
            return next;
        });
    }, []);

    // "Habits left today" = same rule as the Incomplete filter: a non-archived
    // habit whose today status is not-completed or (manually) skipped. Reported
    // to the page header. `null` until every non-archived row has reported so the
    // header shows a settled figure rather than flashing a partial count.
    const nonArchived = useMemo(() => habits.filter((h) => !h.archived), [habits]);
    useEffect(() => {
        if (!onIncompleteCountChange) return;
        const allReported = nonArchived.every((h) => todayStatuses.has(h.id));
        if (!allReported) {
            onIncompleteCountChange(null);
            return;
        }
        const count = nonArchived.filter((h) => {
            const status = todayStatuses.get(h.id);
            return status === DisplayStatus.NOT_COMPLETED || status === DisplayStatus.SKIPPED;
        }).length;
        onIncompleteCountChange(count);
    }, [nonArchived, todayStatuses, onIncompleteCountChange]);

    const handleNoteOpen = useCallback(
        (habitId: number, date: Date, tracker: TrackerLite | undefined) => {
            setNoteDialogState({
                isOpen: true,
                habitId,
                date,
                note: selectedTrackerQuery.data?.note || '',
                trackerId: tracker?.id || null
            });
        },
        []
    );

    const handleNoteSave = useCallback(
        (note: string) => {
            if (!noteDialogState.habitId || !noteDialogState.date) return;
            const habit = habits.find((h) => h.id === noteDialogState.habitId);
            if (!habit) return;

            if (!selectedTrackerQuery.data && selectedTrackerQuery.isFetched) {
                // Create tracker with note
                const newTracker = createNewTracker(
                    habit.id,
                    noteDialogState.date,
                    TrackerStatus.NOT_COMPLETED
                );
                newTracker.note = note;
                createTracker(newTracker);
            } else {
                // Update existing tracker's note
                const update: TrackerUpdate = { note: note };
                updateTracker(selectedTrackerQuery.data!.id, update);
            }

            setNoteDialogState((prev) => ({ ...prev, isOpen: false }));
        },
        [noteDialogState, selectedTrackerQuery, habits]
    );

    const handleSortChange = useCallback(
        (option: DropdownOption) => {
            if (selectedSort.field === option.field) {
                // Toggle direction if same field
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                // New field, reset to ascending
                setSelectedSort(option);
                setSortDirection('asc');
            }
        },
        [selectedSort, sortDirection]
    );

    const handleFilterChange = useCallback((option: DropdownOption) => {
        setSelectedFilters((prev) => {
            if (prev.includes(option.field)) {
                return prev.filter((field) => field !== option.field);
            } else {
                return [...prev, option.field];
            }
        });
    }, []);

    const sortedHabits = useMemo(() => {
        if (!habits) return [];

        return [...habits]
            .sort((a, b) => {
                let aValue: string | number;
                let bValue: string | number;

                switch (selectedSort.field) {
                    case 'sort_order':
                        aValue = a.sort_order || 0;
                        bValue = b.sort_order || 0;
                        break;
                    case 'name':
                        aValue = a.name.toLowerCase();
                        bValue = b.name.toLowerCase();
                        break;
                    case 'color':
                        aValue = a.color.toLowerCase();
                        bValue = b.color.toLowerCase();
                        break;
                    case 'status':
                        aValue = a.completed_today ? 2 : a.skipped_today ? 1 : 0;
                        bValue = b.completed_today ? 2 : b.skipped_today ? 1 : 0;
                        break;
                    case 'streak':
                        aValue = habitStreaks.get(a.id) || 0;
                        bValue = habitStreaks.get(b.id) || 0;
                        break;
                    case 'created':
                        aValue = new Date(a.created_date).getTime();
                        bValue = new Date(b.created_date).getTime();
                        break;
                    case 'updated':
                        aValue = new Date(
                            a.updated_date ? a.updated_date : a.created_date
                        ).getTime();
                        bValue = new Date(
                            b.updated_date ? b.updated_date : b.created_date
                        ).getTime();
                        break;
                    case 'frequency':
                        aValue = a.frequency;
                        bValue = b.frequency;
                        break;
                    case 'range':
                        aValue = a.range;
                        bValue = b.range;
                        break;
                    default:
                        return 0;
                }

                const primarySort =
                    aValue < bValue
                        ? sortDirection === 'asc'
                            ? -1
                            : 1
                        : aValue > bValue
                        ? sortDirection === 'asc'
                            ? 1
                            : -1
                        : 0;

                // If primary sort values are equal, use name as secondary sort
                if (primarySort === 0) {
                    const aName = a.name.toLowerCase();
                    const bName = b.name.toLowerCase();
                    return aName < bName ? -1 : aName > bName ? 1 : 0;
                }

                return primarySort;
            })
            .filter((habit) => {
                // Apply filters (incomplete filter is handled by HabitListElement)
                if (!selectedFilters.includes('archived') && habit.archived) {
                    return false;
                }
                return true;
            });
    }, [habits, selectedSort, sortDirection, selectedFilters, habitStreaks]);

    // Category sections (same grouping as the Today panel): built from the already
    // sorted list so habits within a group follow the selected sort. Alphabetical
    // by category, with Uncategorized always last.
    const groupedHabits = useMemo(() => {
        if (!groupByCategory) return null;
        const map = new Map<string, HabitRead[]>();
        for (const habit of sortedHabits) {
            const key = habit.category?.trim() || UNCATEGORIZED;
            const list = map.get(key) ?? [];
            list.push(habit);
            map.set(key, list);
        }
        return [...map.entries()].sort(([a], [b]) => {
            if (a === UNCATEGORIZED) return b === UNCATEGORIZED ? 0 : 1;
            if (b === UNCATEGORIZED) return -1;
            return a.localeCompare(b);
        });
    }, [groupByCategory, sortedHabits]);

    if (!habits || habits.length === 0) {
        return (
            <div className='rounded-card border border-dashed border-[var(--habit-container-border)] px-5 py-10 text-center font-mono text-[13px] text-[#8ba3b5]'>
                No habits found.
            </div>
        );
    }

    // When the incomplete filter is active, each element reports whether it is still
    // visible. Treat not-yet-reported habits as visible so the empty state doesn't
    // flash before children report.
    const incompleteActive = selectedFilters.includes('incomplete');
    const anyVisible = sortedHabits.some((h) => visibility.get(h.id) !== false);
    const showAllDone = incompleteActive && sortedHabits.length > 0 && !anyVisible;

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
                                {groupedHabits
                                    ? groupedHabits.map(([category, categoryHabits]) => {
                                          // Rows self-hide under the incomplete filter and
                                          // report visibility up; drop the header when every
                                          // row in the group is hidden so the section
                                          // disappears entirely. Not-yet-reported rows count
                                          // as visible, matching the empty-state logic.
                                          const groupVisible = categoryHabits.some(
                                              (h) => visibility.get(h.id) !== false
                                          );
                                          return (
                                              <Fragment key={category}>
                                                  {groupVisible && (
                                                      <tr className='border-b border-[rgba(120,168,205,.08)]'>
                                                          <td
                                                              colSpan={1 + (isSmall ? 0 : 1) + days}
                                                              className='px-4 pb-1.5 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-habit-label'
                                                          >
                                                              {category}
                                                          </td>
                                                      </tr>
                                                  )}
                                                  {categoryHabits.map((habit) => (
                                                      <HabitListElement
                                                          key={habit.id}
                                                          habit={habit}
                                                          days={days}
                                                          isSmall={isSmall}
                                                          isWide={isWide}
                                                          isSelected={selectedHabitId === habit.id}
                                                          onSelectHabit={onSelectHabit}
                                                          filterIncomplete={selectedFilters.includes(
                                                              'incomplete'
                                                          )}
                                                          onStreakChange={handleStreakChange}
                                                          onVisibilityChange={
                                                              handleVisibilityChange
                                                          }
                                                          onTodayStatusChange={
                                                              handleTodayStatusChange
                                                          }
                                                          onNoteOpen={handleNoteOpen}
                                                      />
                                                  ))}
                                              </Fragment>
                                          );
                                      })
                                    : sortedHabits.map((habit) => (
                                          <HabitListElement
                                              key={habit.id}
                                              habit={habit}
                                              days={days}
                                              isSmall={isSmall}
                                              isWide={isWide}
                                              isSelected={selectedHabitId === habit.id}
                                              onSelectHabit={onSelectHabit}
                                              filterIncomplete={selectedFilters.includes(
                                                  'incomplete'
                                              )}
                                              onStreakChange={handleStreakChange}
                                              onVisibilityChange={handleVisibilityChange}
                                              onTodayStatusChange={handleTodayStatusChange}
                                              onNoteOpen={handleNoteOpen}
                                          />
                                      ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <div className='font-mono text-[10.5px] text-[#5f7688]'>
                Right click to add or edit notes
            </div>
            <NoteDialog
                isOpen={noteDialogState.isOpen}
                date={noteDialogState.date || new Date()}
                note={noteDialogState.note}
                onClose={() => setNoteDialogState((prev) => ({ ...prev, isOpen: false }))}
                onSave={handleNoteSave}
            />
        </div>
    );
};
