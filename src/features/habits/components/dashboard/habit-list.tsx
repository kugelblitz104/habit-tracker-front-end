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

type SortField = 'name' | 'created' | 'updated' | 'frequency' | 'range';
type SortDirection = 'asc' | 'desc';

type SortOption = {
    field: SortField;
    label: string;
};

const sortOptions: SortOption[] = [
    { field: 'name', label: 'Name' },
    { field: 'created', label: 'Created Date' },
    { field: 'updated', label: 'Updated Date' },
    { field: 'frequency', label: 'Frequency' },
    { field: 'range', label: 'Range' }
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

    const [selectedSort, setSelectedSort] = useState<SortOption>(
        sortOptions[0]!
    );
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const handleSortChange = (option: SortOption) => {
        if (selectedSort.field === option.field) {
            // Toggle direction if same field
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // New field, reset to ascending
            setSelectedSort(option);
            setSortDirection('asc');
        }
    };

    const sortedHabits = useMemo(() => {
        if (!habits) return [];

        return [...habits].sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            switch (selectedSort.field) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
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

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [habits, selectedSort, sortDirection]);

    if (!habits || habits.length === 0) {
        return <div className='m-4'>No habits found.</div>;
    }

    return (
        <div className='m-4'>
            <div className='mb-2 flex items-center gap-2 justify-end'>
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
                                                {sortDirection === 'asc' && (
                                                    <ArrowUpRight />
                                                )}
                                                {sortDirection === 'desc' && (
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
