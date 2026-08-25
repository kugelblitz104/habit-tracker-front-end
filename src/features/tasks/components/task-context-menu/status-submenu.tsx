import type { TaskUpdate } from '@/api';
import { apiErrorMessage } from '@/lib/api-error-message';
import { TaskStatus } from '@/types/types';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useUpdateTask } from '../../api/update-tasks';
import {
    buildFollowUpPatch,
    statusFollowUpKind,
    type FollowUpKind
} from '../../utils/status-follow-up';
import { STATUS_META, STATUS_ORDER } from '../status-config';
import { StatusFollowUpPanel } from '../status-follow-up-panel';
import { StatusGlyph } from '../status-glyph';
import { CURRENT_BG, Divider, SubHeader, itemClass } from './shared';

type StatusSubmenuProps = {
    status: TaskStatus;
    onSelect: (status: TaskStatus) => void;
    onBack: () => void;
    /**
     * Single-task hosts pass this to offer the second field Blocked and
     * Scheduled need. The bulk action bar deliberately omits it: one reason
     * across N selected tasks is its own decision, so bulk keeps writing
     * `status` alone.
     */
    followUp?: {
        taskId: number;
        blockReason?: string | null;
        scheduledDate?: string | null;
        scheduledTime?: string | null;
    };
    /** Close the whole menu, once the follow-up is resolved. */
    onFollowUpDone?: () => void;
};

/** Status submenu: the 9 task statuses (glyph + label), current one checked. */
export const StatusSubmenu = ({
    status,
    onSelect,
    onBack,
    followUp,
    onFollowUpDone
}: StatusSubmenuProps) => {
    const [kind, setKind] = useState<FollowUpKind | null>(null);
    const updateTask = useUpdateTask();

    const pick = (s: TaskStatus) => {
        // The status is written first and unconditionally; step two is an offer,
        // so dismissing the menu must leave the change in place.
        onSelect(s);
        if (followUp) setKind(statusFollowUpKind(s));
    };

    const save = (patch: TaskUpdate) => {
        if (!followUp) return;
        onFollowUpDone?.();
        updateTask.mutate(
            { taskId: followUp.taskId, data: patch },
            { onError: (error) => toast.error(apiErrorMessage(error, 'Failed to save changes')) }
        );
    };

    if (kind && followUp) {
        return (
            <StatusFollowUpPanel
                kind={kind}
                initial={{
                    blockReason: followUp.blockReason ?? '',
                    scheduledDate: followUp.scheduledDate ?? '',
                    scheduledTime: followUp.scheduledTime ?? ''
                }}
                onBack={() => setKind(null)}
                onSave={(values) => save(buildFollowUpPatch(kind, values))}
            />
        );
    }

    return (
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
                        onClick={() => pick(s)}
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
};
