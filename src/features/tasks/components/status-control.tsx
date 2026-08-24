import { POPOVER_PANEL_CLASS, popoverPanelStyle } from '@/components/ui/menu';
import { TaskStatus, type TaskBand } from '@/types/types';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
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
    /**
     * Render the trigger as a labelled pill (glyph + status name + chevron)
     * instead of the bare round glyph, for surfaces that showed the status as
     * text rather than as a row control.
     */
    withLabel?: boolean;
};

const CONTROL_SIZE: Record<Exclude<TaskBand, 'hidden'>, number> = {
    now: 24,
    soon: 20,
    whenever: 18
};

/**
 * Round status control (or a labelled pill with `withLabel`). Clicking it opens
 * a popover listing the task statuses
 * (glyph + label); the current one is highlighted with its color and a check.
 * Selecting a status calls `onSelect`.
 *
 * Both the trigger and the options keep their click to themselves, because every
 * consumer nests this inside a row that is itself a click target.
 */
export const StatusControl = ({
    status,
    onSelect,
    band,
    openUpward = false,
    disabled = false,
    withLabel = false
}: StatusControlProps) => {
    const current = STATUS_META[status] ?? STATUS_META[TaskStatus.OPEN];
    const size = CONTROL_SIZE[band];

    return (
        <Popover className='relative shrink-0'>
            {withLabel ? (
                <PopoverButton
                    disabled={disabled}
                    aria-label={`Status: ${current.label}. Change status`}
                    // No hit-target here: the labelled pill sits in a meta row
                    // beside other fields, and a 44px overlay would extend over
                    // them. It grows with min-height instead.
                    className='flex min-h-[24px] items-center gap-[5px] rounded-button border px-[6px] text-[13px] leading-none outline-none transition-colors hover:brightness-125 focus-visible:ring-2 focus-visible:ring-now-accent disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-[44px]'
                    style={{ borderColor: 'var(--surface-input-border)' }}
                >
                    <StatusGlyph status={status} size={16} color={current.color} />
                    <span style={{ color: current.color }}>{current.label}</span>
                    <ChevronDown size={12} className='text-text-faint' aria-hidden='true' />
                </PopoverButton>
            ) : (
                <PopoverButton
                    disabled={disabled}
                    aria-label={`Status: ${current.label}. Change status`}
                    // hit-target rather than a Button conversion: the per-status color
                    // lives on the glyph, not the button, and Button's variant chrome
                    // (border/background) would visually grow an isolated round glyph
                    // that every task row repeats.
                    className='hit-target flex items-center justify-center rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-now-accent disabled:cursor-not-allowed disabled:opacity-50'
                >
                    <StatusGlyph status={status} size={size} color={current.color} />
                </PopoverButton>
            )}
            <PopoverPanel
                anchor={{ to: openUpward ? 'top start' : 'bottom start', gap: 8 }}
                className={`w-52 ${POPOVER_PANEL_CLASS}`}
                style={popoverPanelStyle}
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
                                        onClick={(e) => {
                                            // Headless UI portals this panel out
                                            // of the row, but React routes events
                                            // through the component tree rather
                                            // than the DOM tree, so the click
                                            // still reaches an ancestor row's
                                            // onClick unless it is stopped here.
                                            e.stopPropagation();
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
                                        <StatusGlyph status={s} size={16} color={meta.color} />
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
