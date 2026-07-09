import { TaskStatus, type TaskBand } from '@/types/types';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Check } from 'lucide-react';
import { STATUS_META, STATUS_ORDER } from './status-config';
import { StatusGlyph } from './status-glyph';

type StatusControlProps = {
    status: TaskStatus;
    onSelect: (status: TaskStatus) => void;
    band: Exclude<TaskBand, 'hidden'>;
    /**
     * Open the picker upward. BandSection sets this for the last row(s) of a
     * band so the popover never covers the section below (README).
     */
    openUpward?: boolean;
    disabled?: boolean;
};

const CONTROL_SIZE: Record<Exclude<TaskBand, 'hidden'>, number> = {
    now: 24,
    soon: 20,
    whenever: 18
};

/**
 * Round status control. Clicking it opens a popover listing the 8 task statuses
 * (glyph + label); the current one is highlighted with its color and a check.
 * Selecting a status calls `onSelect`.
 */
export const StatusControl = ({
    status,
    onSelect,
    band,
    openUpward = false,
    disabled = false
}: StatusControlProps) => {
    const current = STATUS_META[status] ?? STATUS_META[TaskStatus.OPEN];
    const size = CONTROL_SIZE[band];

    return (
        <Popover className='relative shrink-0'>
            <PopoverButton
                disabled={disabled}
                aria-label={`Status: ${current.label}. Change status`}
                className='flex items-center justify-center rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-now-accent disabled:cursor-not-allowed disabled:opacity-50'
            >
                <StatusGlyph status={status} size={size} color={current.color} />
            </PopoverButton>
            <PopoverPanel
                anchor={{ to: openUpward ? 'top start' : 'bottom start', gap: 8 }}
                className='z-50 w-52 rounded-button border p-1 shadow-popover outline-none'
                style={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--surface-card-border)'
                }}
            >
                {({ close }) => (
                    <ul className='font-display text-[13px]'>
                        {STATUS_ORDER.map((s) => {
                            const meta = STATUS_META[s];
                            const isCurrent = s === status;
                            return (
                                <li key={s}>
                                    <button
                                        type='button'
                                        onClick={() => {
                                            onSelect(s);
                                            close();
                                        }}
                                        className='flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left hover:bg-white/5'
                                        style={
                                            isCurrent
                                                ? { backgroundColor: 'rgba(255,255,255,0.05)' }
                                                : undefined
                                        }
                                    >
                                        <StatusGlyph
                                            status={s}
                                            size={16}
                                            color={meta.color}
                                        />
                                        <span
                                            style={{
                                                color: isCurrent
                                                    ? meta.color
                                                    : 'var(--color-text-secondary)'
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
                                </li>
                            );
                        })}
                    </ul>
                )}
            </PopoverPanel>
        </Popover>
    );
};
