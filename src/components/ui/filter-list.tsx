import { ToggleButton } from '@/components/ui/buttons/toggle-button';
import type { DropdownOption } from '@/types/types';

type FilterListProps = {
    filterOptions: DropdownOption[];
    selectedFilters: string[];
    onFilterChange: (option: DropdownOption) => void;
};

export const FilterList = ({ filterOptions, selectedFilters, onFilterChange }: FilterListProps) => {
    return (
        <div className='flex items-center gap-2 w-full md:w-auto'>
            {filterOptions.map((option) => (
                <ToggleButton
                    key={option.field}
                    isActive={selectedFilters.includes(option.field)}
                    onClick={() => onFilterChange(option)}
                >
                    {option.label}
                </ToggleButton>
            ))}
        </div>
    );
};
