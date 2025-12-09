import type { HabitRead } from '@/api';
import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions
} from '@headlessui/react';
import { ArrowDownRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { HabitListElement } from './habit-list-element';
import { ToggleButton } from '@/components/ui/buttons/toggle-button';

type SortDirection = 'asc' | 'desc';

type DropdownOption = {
    field: string;
    label: string;
};

const sortOptions: DropdownOption[] = [
    { field: 'name', label: 'Name' },
    { field: 'color', label: 'Color' },
    { field: 'status', label: "Today's Status" },
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
};

export const HabitList = ({ habits, days = 0 }: HabitListProps) => {
    // hooks - use useMemo to prevent hydration mismatch
    const today = useMemo(() => new Date(), []);
    const date_formatter = new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit'
    });

    const [selectedSort, setSelectedSort] = useState<DropdownOption>(
        sortOptions[0]!
    );
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

    const handleSortChange = (option: DropdownOption) => {
        if (selectedSort.field === option.field) {
            // Toggle direction if same field
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, reset to ascending
            setSelectedSort(option);
            setSortDirection('asc');
        }
    };

    const handleFilterChange = (option: DropdownOption) => {
        setSelectedFilters((prev) => {
            if (prev.includes(option.field)) {
                return prev.filter((field) => field !== option.field);
            } else {
                return [...prev, option.field];
            }
        });
    };

    const sortedHabits = useMemo(() => {
        if (!habits) return [];

        return [...habits]
            .sort((a, b) => {
                let aValue: string | number;
                let bValue: string | number;

                switch (selectedSort.field) {
                    case 'name':
                        aValue = a.name.toLowerCase();
                        bValue = b.name.toLowerCase();
                        break;
                    case 'color':
                        aValue = a.color.toLowerCase();
                        bValue = b.color.toLowerCase();
                        break;
                    case 'status':
                        aValue = a.completed_today
                            ? 2
                            : a.skipped_today
                            ? 1
                            : 0;
                        bValue = b.completed_today
                            ? 2
                            : b.skipped_today
                            ? 1
                            : 0;
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
                // Apply filters
                if (
                    selectedFilters.includes('incomplete') &&
                    habit.completed_today
                ) {
                    return false;
                }
                if (!selectedFilters.includes('archived') && habit.archived) {
                    return false;
                }
                return true;
            });
    }, [habits, selectedSort, sortDirection, selectedFilters]);

    if (!habits || habits.length === 0) {
        return <div className='m-4'>No habits found.</div>;
    }

    return (
        <div className='m-4'>
            <div className='mb-4 flex items-center gap-4 justify-between'>
                <div className='flex items-center gap-2'>
                    {filterOptions.map((option) => (
                        <ToggleButton
                            key={option.field}
                            isActive={selectedFilters.includes(option.field)}
                            onClick={() => handleFilterChange(option)}
                        >
                            {option.label}
                        </ToggleButton>
                    ))}
                </div>
                <div className='flex items-center gap-2'>
                    Sort by:
                    <Listbox value={selectedSort} onChange={handleSortChange}>
                        <div className='relative w-64'>
                            <ListboxButton className='relative w-full p-2 rounded-md bg-slate-800 flex justify-start'>
                                {selectedSort.label}
                                <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                                    <ChevronDown
                                        className='text-gray-400'
                                        aria-hidden='true'
                                    />
                                </span>
                            </ListboxButton>
                            <ListboxOptions className='absolute z-10 w-full overflow-auto rounded-b-md bg-slate-800 py-1'>
                                {sortOptions.map((option) => (
                                    <ListboxOption
                                        key={option.field}
                                        value={option}
                                        className='cursor-pointer select-none py-2 px-4'
                                    >
                                        <span className='flex items-center justify-between gap-2'>
                                            {option.label}
                                            {selectedSort.field ===
                                                option.field && (
                                                <span className='text-gray-400'>
                                                    {sortDirection ===
                                                        'asc' && (
                                                        <ArrowUpRight />
                                                    )}
                                                    {sortDirection ===
                                                        'desc' && (
                                                        <ArrowDownRight />
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                    </ListboxOption>
                                ))}
                            </ListboxOptions>
                        </div>
                    </Listbox>
                </div>
            </div>
            <div className='overflow-x-auto'>
                <table className='min-w-full table-auto'>
                    <thead>
                        <tr>
                            <th className='px-4 py-2 text-left'>Habit</th>
                            {Array.from({ length: days }, (_, i) => (
                                <th key={i} className='px-4 py-2 text-center'>
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
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
