import type { TaskUpdate } from '@/api';
import { POPOVER_PANEL_CLASS, popoverPanelStyle } from '@/components/ui/menu';
import { apiErrorMessage } from '@/lib/api-error-message';
import { TaskStatus, type TaskBand } from '@/types/types';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useUpdateTask } from '../api/update-tasks';
import {
    buildFollowUpPatch,
    statusFollowUpKind,
    type FollowUpKind,
    type FollowUpValues
} from '../utils/status-follow-up';
import { STATUS_META, STATUS_ORDER } from './status-config';
import { StatusFollowUpPanel } from './status-follow-up-panel';
import { StatusGlyph } from './status-glyph';

type StatusControlProps = {
    status: TaskStatus;
    onSelect: (status: TaskStatus) => void;
    band: Exclude<TaskBand, 'hidden'>;
    /**
     * Offer the second field Blocked and Scheduled need, prefilled from the
     * values here. Omit it to write `status` alone: subtask rows do, because a
     * subtask surfaces only its status and a block reason or scheduled date
     * would have nowhere to render. A subtask that needs either gets promoted
     * to a full task instead.
     *
     * `onSaved` fires once the field is persisted, for hosts keeping their own
     * editable copy of it. See TaskEditor, where a stale local copy would be
     * sent back as null on the next save.
     */
    followUp?: {
        taskId: number;
        blockReason?: string | null;
        scheduledDate?: string | null;
        scheduledTime?: string | null;
        onSaved?: (patch: TaskUpdate) => void;
    };
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
    followUp,
    openUpward = false,
    disabled = false,
    withLabel = false
}: StatusControlProps) => {
    const current = STATUS_META[status] ?? STATUS_META[TaskStatus.OPEN];
    const size = CONTROL_SIZE[band];
    const updateTask = useUpdateTask();

    // Which second field step two is asking for; null means the status list.
    const [step, setStep] = useState<FollowUpKind | null>(null);

    /**
     * Pick a status. The write happens NOW, unconditionally, because step two is an
     * offer, so dismissing it must leave the status changed rather than
     * silently dropping it.
     */
    const handleSelect = (next: TaskStatus, close: () => void) => {
        onSelect(next);
        const kind = followUp ? statusFollowUpKind(next) : null;
        if (kind) setStep(kind);
        else close();
    };

    const saveFollowUp = (values: FollowUpValues, close: () => void) => {
        if (!step || !followUp) return;
        const patch = buildFollowUpPatch(step, values);
        close();
        updateTask.mutate(
            { taskId: followUp.taskId, data: patch },
            {
                onSuccess: () => followUp.onSaved?.(patch),
                onError: (error) => toast.error(apiErrorMessage(error, 'Failed to save changes'))
            }
        );
    };

    return (
        <Popover className='relative shrink-0'>
            {withLabel ? (
                <PopoverButton
                    disabled={disabled}
                    // Always reopen on the status list, never on a step two left
                    // behind by an earlier dismissal.
                    onClick={() => setStep(null)}
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
                    // Always reopen on the status list, never on a step two left
                    // behind by an earlier dismissal.
                    onClick={() => setStep(null)}
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
                // The scheduled step renders the context menu's own DateSubmenu,
                // so it takes that menu's width rather than the status list's.
                className={`${step === 'scheduled' ? 'w-56' : 'w-52'} ${POPOVER_PANEL_CLASS}`}
                style={popoverPanelStyle}
            >
                {({ close }) =>
                    step && followUp ? (
                        <StatusFollowUpPanel
                            kind={step}
                            initial={{
                                blockReason: followUp.blockReason ?? '',
                                scheduledDate: followUp.scheduledDate ?? '',
                                scheduledTime: followUp.scheduledTime ?? ''
                            }}
                            onBack={() => setStep(null)}
                            onSave={(values) => saveFollowUp(values, close)}
                        />
                    ) : (
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
                                                handleSelect(s, close);
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
                    )
                }
            </PopoverPanel>
        </Popover>
    );
};
