import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ArrowDownRight, ArrowUpRight, ChevronDown } from 'lucide-react';
import type { DropdownOption, SortDirection } from '@/types/types';
import { POPOVER_MOTION_CLASS } from '@/components/ui/menu';

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
            <span className='hidden font-mono text-label uppercase tracking-[0.12em] text-text-muted md:flex'>
                Sort by
            </span>
            <Listbox value={selectedSort} onChange={onSortChange}>
                <div className='relative w-full md:w-64'>
                    <ListboxButton
                        className='relative flex min-h-[36px] w-full items-center justify-start rounded-button border px-3 py-2 font-mono text-meta text-text-secondary outline-none transition-colors pointer-coarse:min-h-[44px]'
                        style={{
                            backgroundColor: 'var(--surface-input-bg)',
                            borderColor: 'var(--surface-input-border)'
                        }}
                    >
                        {selectedSort.label}
                        <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                            <ChevronDown size={16} className='text-text-muted' aria-hidden='true' />
                        </span>
                    </ListboxButton>
                    <ListboxOptions
                        transition
                        className={`absolute z-10 mt-1 w-full origin-top overflow-auto rounded-button border py-1 shadow-popover ${POPOVER_MOTION_CLASS}`}
                        style={{
                            backgroundColor: 'var(--bg)',
                            borderColor: 'var(--surface-card-border)'
                        }}
                    >
                        {sortOptions.map((option) => (
                            <ListboxOption
                                key={option.field}
                                value={option}
                                className='cursor-pointer select-none px-4 py-2 font-mono text-meta text-text-secondary transition-colors data-focus:bg-[rgba(120,168,205,0.10)] data-focus:text-text-primary'
                            >
                                <span className='flex items-center justify-between gap-2'>
                                    {option.label}
                                    {selectedSort.field === option.field && (
                                        <span className='text-habit-label'>
                                            {sortDirection === 'asc' && <ArrowUpRight size={15} />}
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
