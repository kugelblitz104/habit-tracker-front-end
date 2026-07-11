import type { HabitRead } from '@/api';
import { type DropdownOption, type SortDirection } from '@/types/types';
import { useCallback, useMemo, useState } from 'react';

export const sortOptions: DropdownOption[] = [
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

export const filterOptions: DropdownOption[] = [
    { field: 'incomplete', label: 'Incomplete' },
    { field: 'archived', label: 'Archived' }
];

const UNCATEGORIZED = 'Uncategorized';

export type UseHabitListSortResult = {
    selectedSort: DropdownOption;
    sortDirection: SortDirection;
    selectedFilters: string[];
    handleSortChange: (option: DropdownOption) => void;
    handleFilterChange: (option: DropdownOption) => void;
    /** Sorted (by `selectedSort`/`sortDirection`) and filtered (archived) habits. */
    sortedHabits: HabitRead[];
    /** `sortedHabits` grouped by category (alphabetical, Uncategorized last) when
     *  grouping is on; `null` otherwise so callers can fall back to a single
     *  ungrouped section. */
    groupedHabits: [string, HabitRead[]][] | null;
};

/**
 * Sort/filter/group derivation for the dashboard habit list: owns the sort
 * field + direction, the active filter chips, and derives the sorted/filtered
 * habit list plus its optional category grouping. Extracted from
 * `habit-list.tsx` so the component can focus on rendering.
 */
export const useHabitListSort = (
    habits: HabitRead[],
    habitStreaks: Map<number, number>,
    groupByCategory: boolean
): UseHabitListSortResult => {
    const [selectedSort, setSelectedSort] = useState<DropdownOption>(sortOptions[0]!);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

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

    return {
        selectedSort,
        sortDirection,
        selectedFilters,
        handleSortChange,
        handleFilterChange,
        sortedHabits,
        groupedHabits
    };
};
