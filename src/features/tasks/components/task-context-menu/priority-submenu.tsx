import { Check } from 'lucide-react';
import { PRIORITY_LEVELS } from '../../utils/priority-config';
import { CURRENT_BG, Divider, SubHeader, itemClass } from './shared';

type PrioritySubmenuProps = {
    priority: number;
    onSelect: (priority: number) => void;
    onBack: () => void;
};

/** Priority submenu: the 4 priority levels (accent dot + label), current one checked. */
export const PrioritySubmenu = ({ priority, onSelect, onBack }: PrioritySubmenuProps) => (
    <>
        <SubHeader label='Priority' onBack={onBack} />
        <Divider />
        {PRIORITY_LEVELS.map((option) => {
            const isCurrent = option.value === priority;
            return (
                <button
                    key={option.value}
                    type='button'
                    onClick={() => onSelect(option.value)}
                    className={itemClass}
                    style={isCurrent ? { backgroundColor: CURRENT_BG } : undefined}
                >
                    <span
                        className='inline-block h-2 w-2 shrink-0 rounded-full'
                        style={{ backgroundColor: option.accent }}
                    />
                    <span
                        style={{
                            color: isCurrent ? option.accent : 'var(--color-text-secondary)'
                        }}
                    >
                        {option.label}
                    </span>
                    {isCurrent && (
                        <Check
                            size={14}
                            className='ml-auto'
                            style={{ color: option.accent }}
                            strokeWidth={3}
                        />
                    )}
                </button>
            );
        })}
    </>
);
