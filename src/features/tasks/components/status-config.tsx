import { TaskStatus } from '@/types/types';

export type StatusMeta = {
    status: TaskStatus;
    label: string;
    /** Accent color (CSS value) for the round control glyph + picker highlight. */
    color: string;
    /** Meta-pill text/bg CSS values; null when the status shows no pill (open). */
    pillText: string | null;
    pillBg: string | null;
};

/**
 * Per-status presentation — mirrors the README task-status palette. The glyph
 * itself lives in `StatusGlyph` (keyed off `status`); this map carries the
 * accent color + meta-pill tokens.
 */
export const STATUS_META: Record<TaskStatus, StatusMeta> = {
    [TaskStatus.OPEN]: {
        status: TaskStatus.OPEN,
        label: 'Open',
        color: 'var(--color-text-muted)',
        pillText: null,
        pillBg: null
    },
    [TaskStatus.IN_PROGRESS]: {
        status: TaskStatus.IN_PROGRESS,
        label: 'In progress',
        color: 'var(--color-status-inprogress)',
        pillText: 'var(--status-inprogress-pill-text)',
        pillBg: 'var(--status-inprogress-pill-bg)'
    },
    [TaskStatus.SCHEDULED]: {
        status: TaskStatus.SCHEDULED,
        label: 'Scheduled',
        color: 'var(--color-status-scheduled)',
        pillText: 'var(--status-scheduled-pill-text)',
        pillBg: 'var(--status-scheduled-pill-bg)'
    },
    [TaskStatus.BLOCKED]: {
        status: TaskStatus.BLOCKED,
        label: 'Blocked',
        color: 'var(--color-status-blocked)',
        pillText: 'var(--status-blocked-pill-text)',
        pillBg: 'var(--status-blocked-pill-bg)'
    },
    [TaskStatus.NEEDS_INFO]: {
        status: TaskStatus.NEEDS_INFO,
        label: 'Needs info',
        color: 'var(--color-status-needsinfo)',
        pillText: 'var(--status-needsinfo-pill-text)',
        pillBg: 'var(--status-needsinfo-pill-bg)'
    },
    [TaskStatus.DEFERRED]: {
        status: TaskStatus.DEFERRED,
        label: 'Deferred',
        color: 'var(--color-status-deferred)',
        pillText: 'var(--status-deferred-pill-text)',
        pillBg: 'rgba(138, 129, 119, 0.14)'
    },
    [TaskStatus.DONE]: {
        status: TaskStatus.DONE,
        label: 'Done',
        color: 'var(--color-status-done-check)',
        pillText: 'var(--color-status-done-check)',
        pillBg: 'rgba(63, 107, 74, 0.35)'
    },
    [TaskStatus.CANCELLED]: {
        status: TaskStatus.CANCELLED,
        label: 'Cancelled',
        color: 'var(--color-status-cancelled)',
        pillText: 'var(--color-status-cancelled)',
        pillBg: 'rgba(87, 82, 74, 0.2)'
    }
};

/** Picker order — matches the README's 8-status list. */
export const STATUS_ORDER: TaskStatus[] = [
    TaskStatus.OPEN,
    TaskStatus.IN_PROGRESS,
    TaskStatus.SCHEDULED,
    TaskStatus.BLOCKED,
    TaskStatus.NEEDS_INFO,
    TaskStatus.DEFERRED,
    TaskStatus.DONE,
    TaskStatus.CANCELLED
];
