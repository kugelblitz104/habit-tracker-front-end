import type { TaskTokenType } from '../utils/parse-task-input';

/** Accent per recognized quick-add token, painted by the highlight overlay. */
export const TASK_TOKEN_COLORS: Record<TaskTokenType, string> = {
    priority: 'var(--color-now-accent)',
    scheduled: 'var(--color-status-scheduled)',
    due: 'var(--color-status-duetoday)',
    project: 'var(--color-status-needsinfo)',
    estimate: 'var(--color-soon-label)',
    notes: 'var(--color-text-muted)'
};
