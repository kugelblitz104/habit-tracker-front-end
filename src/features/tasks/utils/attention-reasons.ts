import type { TaskRead } from '@/api';
import { getCountdown } from '@/features/countdowns/utils/countdown';
import { parseLocalDate } from '@/lib/date-utils';
import { TaskStatus } from '@/types/types';

import { computeBand, isStale, STALE_AFTER_DAYS, startOfToday } from './compute-band';

/**
 * Why a task needs attention, as chip text for the detail header.
 *
 * The first four are the conditions that band a task `now`; staleness is extra
 * context that never bands on its own. An empty result means the block does not
 * render, which is what keeps a banding-neutral reason from producing a bare
 * block with no cause.
 *
 * `today` (local midnight) decides *whether* a reason applies, via the `<=
 * today` day-boundary tests. `now` is the real current instant, used only for
 * the countdown *text*, so a timed task whose due time has already passed
 * today reads "Overdue" rather than "Due today".
 */
export const attentionReasons = (
    task: TaskRead,
    today: Date = startOfToday(),
    now: Date = new Date()
): string[] => {
    if (computeBand(task, today) !== 'now') return [];

    const reasons: string[] = [];
    const status = task.status ?? TaskStatus.OPEN;

    if (task.due_date && parseLocalDate(task.due_date) <= today) {
        const countdown = getCountdown(task.due_date, task.due_time, now);
        const days = Math.abs(countdown?.daysUntil ?? 0);
        reasons.push(
            days === 0 ? (countdown?.overdue ? 'Overdue' : 'Due today') : `${days}d overdue`
        );
    }

    if (task.scheduled_date && parseLocalDate(task.scheduled_date) <= today) {
        const scheduled = parseLocalDate(task.scheduled_date);
        const days = Math.round((today.getTime() - scheduled.getTime()) / 86_400_000);
        reasons.push(days === 0 ? 'Scheduled today' : `Scheduled ${days}d ago`);
    }

    if ((task.priority ?? 0) === 3) reasons.push('High priority');

    if (status === TaskStatus.BLOCKED) {
        const reason = task.block_reason?.trim();
        reasons.push(reason ? `Blocked: ${reason}` : 'Blocked');
    }

    if (isStale(task, today)) reasons.push(`No activity in ${STALE_AFTER_DAYS}d`);

    return reasons;
};
