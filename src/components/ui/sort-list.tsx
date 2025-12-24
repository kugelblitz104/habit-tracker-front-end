import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ArrowDownRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import type { DropdownOption, SortDirection } from '@/types/types';

type SortListProps = {
    sortOptions: DropdownOption[];
    selectedSort: DropdownOption;
    sortDirection: SortDirection;
    onSortChange: (option: DropdownOption) => void;
};

export const SortList = ({
    sortOptions,
    selectedSort,
    sortDirection,
    onSortChange
}: SortListProps) => {
    return (
        <div className='flex flex-wrap items-center md:justify-end gap-2 w-full md:w-auto'>
            <span className='hidden md:flex'>Sort by:</span>
            <Listbox value={selectedSort} onChange={onSortChange}>
                <div className='relative w-full md:w-64'>
                    <ListboxButton className='relative w-full p-2 rounded-md bg-slate-800 flex justify-start'>
                        {selectedSort.label}
                        <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                            <ChevronDown className='text-gray-400' aria-hidden='true' />
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
                                    {selectedSort.field === option.field && (
                                        <span className='text-gray-400'>
                                            {sortDirection === 'asc' && <ArrowUpRight />}
                                            {sortDirection === 'desc' && <ArrowDownRight />}
                                        </span>
                                    )}
                                </span>
                            </ListboxOption>
                        ))}
                    </ListboxOptions>
                </div>
            </Listbox>
        </div>
    );
};
