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
        <div className='flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end'>
            <span className='hidden font-mono text-[10.5px] uppercase tracking-[0.12em] text-text-muted md:flex'>
                Sort by
            </span>
            <Listbox value={selectedSort} onChange={onSortChange}>
                <div className='relative w-full md:w-64'>
                    <ListboxButton
                        className='relative flex w-full justify-start rounded-button border px-3 py-2 font-mono text-[12px] text-text-secondary outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[var(--color-habit-accent)]'
                        style={{
                            backgroundColor: 'var(--surface-input-bg)',
                            borderColor: 'var(--surface-input-border)'
                        }}
                    >
                        {selectedSort.label}
                        <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                            <ChevronDown
                                size={16}
                                className='text-text-muted'
                                aria-hidden='true'
                            />
                        </span>
                    </ListboxButton>
                    <ListboxOptions
                        className='absolute z-10 mt-1 w-full overflow-auto rounded-button border py-1 shadow-popover'
                        style={{
                            backgroundColor: 'var(--bg)',
                            borderColor: 'var(--surface-card-border)'
                        }}
                    >
                        {sortOptions.map((option) => (
                            <ListboxOption
                                key={option.field}
                                value={option}
                                className='cursor-pointer select-none px-4 py-2 font-mono text-[12px] text-text-secondary transition-colors data-focus:bg-[rgba(120,168,205,0.10)] data-focus:text-text-primary'
                            >
                                <span className='flex items-center justify-between gap-2'>
                                    {option.label}
                                    {selectedSort.field === option.field && (
                                        <span className='text-habit-label'>
                                            {sortDirection === 'asc' && (
                                                <ArrowUpRight size={15} />
                                            )}
                                            {sortDirection === 'desc' && (
                                                <ArrowDownRight size={15} />
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
    );
};
