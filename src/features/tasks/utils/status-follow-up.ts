import type { TaskUpdate } from '@/api';
import { TaskStatus } from '@/types/types';

/**
 * The two statuses that mean nothing on their own: Blocked needs a reason for
 * the detail header's banner, Scheduled needs a date that `compute_band` and
 * the Today schedule both read.
 */
export type FollowUpKind = 'blocked' | 'scheduled';

export type FollowUpValues = {
    blockReason?: string;
    scheduledDate?: string;
    scheduledTime?: string;
};

/** Which second field a status needs, or null when it needs none. */
export const statusFollowUpKind = (status: TaskStatus): FollowUpKind | null => {
    if (status === TaskStatus.BLOCKED) return 'blocked';
    if (status === TaskStatus.SCHEDULED) return 'scheduled';
    return null;
};

/**
 * The PATCH body for a resolved follow-up. Only the fields belonging to `kind`
 * are emitted, so a blocked patch can never carry scheduled data. A blank value
 * becomes null rather than an empty string, matching how the rest of the app
 * stores "not set".
 */
export const buildFollowUpPatch = (kind: FollowUpKind, values: FollowUpValues): TaskUpdate => {
    if (kind === 'blocked') {
        return { block_reason: values.blockReason?.trim() || null };
    }
    return {
        scheduled_date: values.scheduledDate?.trim() || null,
        scheduled_time: values.scheduledTime?.trim() || null
    };
};
