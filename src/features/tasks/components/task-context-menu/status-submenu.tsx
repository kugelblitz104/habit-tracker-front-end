import { TaskStatus } from '@/types/types';
import { Check } from 'lucide-react';
import { STATUS_META, STATUS_ORDER } from '../status-config';
import { StatusGlyph } from '../status-glyph';
import { CURRENT_BG, Divider, SubHeader, itemClass } from './shared';

type StatusSubmenuProps = {
    status: TaskStatus;
    onSelect: (status: TaskStatus) => void;
    onBack: () => void;
};

/** Status submenu: the 8 task statuses (glyph + label), current one checked. */
export const StatusSubmenu = ({ status, onSelect, onBack }: StatusSubmenuProps) => (
    <>
        <SubHeader label='Status' onBack={onBack} />
        <Divider />
        {STATUS_ORDER.map((s) => {
            const meta = STATUS_META[s];
            const isCurrent = s === status;
            return (
                <button
                    key={s}
                    type='button'
                    onClick={() => onSelect(s)}
                    className={itemClass}
                    style={isCurrent ? { backgroundColor: CURRENT_BG } : undefined}
                >
                    <StatusGlyph status={s} size={16} color={meta.color} />
                    <span
                        style={{
                            color: isCurrent ? meta.color : 'var(--color-text-secondary)'
                        }}
                    >
                        {meta.label}
                    </span>
                    {isCurrent && (
                        <Check
                            size={14}
                            className='ml-auto'
                            style={{ color: meta.color }}
                            strokeWidth={3}
                        />
                    )}
                </button>
            );
        })}
    </>
);
