import type { HabitRead, TrackerLite, TrackerRead, TrackerUpdate } from '@/api';
import { FilterList } from '@/components/ui/filter-list';
import { SortList } from '@/components/ui/sort-list';
import { NoteDialog } from '@/features/habits/components/modals/note-dialog';
import { createTracker } from '@/features/trackers/api/create-trackers';
import { updateTracker } from '@/features/trackers/api/update-trackers';
import { createNewTracker } from '@/features/trackers/utils/tracker-utils';
import { TrackerStatus, type DropdownOption, type SortDirection } from '@/types/types';
import { useCallback, useMemo, useState } from 'react';
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

export type HabitListProps = {
    habits: HabitRead[];
    days?: number;
    isSmall?: boolean;
};

export const HabitList = ({ habits, days = 0, isSmall = false }: HabitListProps) => {
    // hooks - use useMemo to prevent hydration mismatch
    const today = useMemo(() => new Date(), []);
    const date_formatter = new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit'
    });

    const [selectedSort, setSelectedSort] = useState<DropdownOption>(sortOptions[0]!);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
    const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
    const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null); // needed in case tracker doesn't exist yet
    const [selectedDate, setSelectedDate] = useState<Date | null>(null); // needed in case tracker doesn't exist yet
    const [selectedNote, setSelectedNote] = useState('');
    const [selectedTrackerID, setSelectedTrackerID] = useState<number | null>(null);
    const [habitStreaks, setHabitStreaks] = useState<Map<number, number>>(new Map());

    const selectedTrackerQuery = useQuery({
        queryKey: ['tracker', selectedTrackerID],
        queryFn: () => getTracker(selectedTrackerID!),
        enabled: !!selectedTrackerID && isNoteDialogOpen,
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

    const handleNoteOpen = useCallback(
        (habitId: number, date: Date, tracker: TrackerLite | undefined) => {
            setSelectedHabitId(habitId);
            setSelectedDate(date);
            setSelectedTrackerID(tracker?.id || null);
            setSelectedNote(selectedTrackerQuery.data?.note || '');
            setIsNoteDialogOpen(true);
        },
        []
    );

    const handleNoteSave = useCallback(
        (note: string) => {
            if (!selectedHabitId || !selectedDate) return;
            const habit = habits.find((h) => h.id === selectedHabitId);
            if (!habit) return;

            if (!selectedTrackerQuery.data && selectedTrackerQuery.isFetched) {
                // Create tracker with note
                const newTracker = createNewTracker(
                    habit.id,
                    selectedDate,
                    TrackerStatus.NOT_COMPLETED
                );
                newTracker.note = note;
                createTracker(newTracker);
            } else {
                // Update existing tracker's note
                const update: TrackerUpdate = { note: note };
                updateTracker(selectedTrackerQuery.data!.id, update);
            }

            setIsNoteDialogOpen(false);
        },
        [selectedHabitId, selectedDate, selectedTrackerQuery, habits]
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

    if (!habits || habits.length === 0) {
        return <div className='m-4'>No habits found.</div>;
    }

    return (
        <div className='m-4'>
            <div
                className='
                    mb-4 
                    flex
                    flex-wrap-reverse md:flex-row
                    items-start sm:items-center 
                    gap-4 sm:justify-between
                    
                '
            >
                <FilterList
                    filterOptions={filterOptions}
                    selectedFilters={selectedFilters}
                    onFilterChange={handleFilterChange}
                />
                <SortList
                    sortOptions={sortOptions}
                    selectedSort={selectedSort}
                    sortDirection={sortDirection}
                    onSortChange={handleSortChange}
                />
            </div>
            <div className='overflow-x-auto'>
                <table className='min-w-full table-auto'>
                    <thead>
                        <tr>
                            <th scope='col' className='px-4 py-2 w-1/3 md:w-1/5 text-left'>
                                Habit
                            </th>
                            {!isSmall && (
                                <th scope='col' className='w-12 text-center'>
                                    Streak
                                </th>
                            )}
                            {Array.from({ length: days }, (_, i) => (
                                <th
                                    key={i}
                                    scope='col'
                                    className='w-8 text-center text-xs md:text-sm'
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
                        {sortedHabits.map((habit) => (
                            <HabitListElement
                                key={habit.id}
                                habit={habit}
                                days={days}
                                isSmall={isSmall}
                                filterIncomplete={selectedFilters.includes('incomplete')}
                                onStreakChange={handleStreakChange}
                                onNoteOpen={handleNoteOpen}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
            <div className='mx-4 mt-2 text-slate-500'>Right click to add or edit notes</div>
            <NoteDialog
                isOpen={isNoteDialogOpen}
                date={selectedDate || new Date()}
                note={selectedNote}
                onClose={() => setIsNoteDialogOpen(false)}
                onSave={handleNoteSave}
            />
        </div>
    );
};
