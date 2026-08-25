import { formFieldClass, formFieldStyle } from '@/components/ui/forms/form-field-styles';
import { type KeyboardEvent, useState } from 'react';
import type { FollowUpKind, FollowUpValues } from '../utils/status-follow-up';
import { DateSubmenu } from './task-context-menu/date-submenu';
import { Divider, SubHeader } from './task-context-menu/shared';

type StatusFollowUpPanelProps = {
    kind: FollowUpKind;
    /** Current stored values, so the field opens on what the task already has. */
    initial: FollowUpValues;
    onBack: () => void;
    onSave: (values: FollowUpValues) => void;
};

/**
 * Step two of the status picker: the one extra field Blocked and Scheduled need.
 * Body only, no chrome: its hosts are a Headless UI PopoverPanel and the
 * context menu's own submenu shell, which are not interchangeable.
 *
 * Neither branch has a save button. Blocked commits on Enter, the same contract
 * `SubtaskQuickAdd` uses, and Scheduled commits on the pick itself. The status
 * has ALREADY been written by the time this renders, so dismissing without
 * saving is a valid outcome rather than a cancel.
 */
export const StatusFollowUpPanel = ({
    kind,
    initial,
    onBack,
    onSave
}: StatusFollowUpPanelProps) => {
    const [blockReason, setBlockReason] = useState(initial.blockReason ?? '');

    // Enter saves. Escape is left to Headless UI, which closes the popover; the
    // status is already saved, so that is a dismissal and not a cancel.
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        onSave({ blockReason });
    };

    if (kind === 'scheduled') {
        return (
            <DateSubmenu
                label='Scheduled for'
                currentDate={initial.scheduledDate}
                // Each pick is the whole interaction, so it saves rather than
                // staging a value for a button that no longer exists. The time
                // rides along unchanged: this submenu only picks a date, and
                // rebuilding the patch without it would clear a time the task
                // already had.
                onPick={(date) =>
                    onSave({ scheduledDate: date, scheduledTime: initial.scheduledTime })
                }
                // No clear row: this step exists to set a date. Leaving the task
                // scheduled with none is still reachable by dismissing.
                clearLabel='Clear scheduled date'
                dateAriaLabel='Scheduled for date'
                onBack={onBack}
            />
        );
    }

    return (
        <>
            <SubHeader label='Blocked on' onBack={onBack} />
            <Divider />
            <div className='px-2 py-1.5'>
                <input
                    type='text'
                    autoFocus
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='What is this blocked on? (Enter)'
                    aria-label='Blocked on'
                    className={`${formFieldClass} placeholder:text-text-faint`}
                    style={formFieldStyle}
                />
            </div>
        </>
    );
};
