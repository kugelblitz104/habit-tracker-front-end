import { describe, expect, it } from 'vitest';

import { TaskStatus } from '@/types/types';
import { buildFollowUpPatch, statusFollowUpKind } from './status-follow-up';

describe('statusFollowUpKind', () => {
    it('asks for a reason on Blocked', () => {
        expect(statusFollowUpKind(TaskStatus.BLOCKED)).toBe('blocked');
    });

    it('asks for a date on Scheduled', () => {
        expect(statusFollowUpKind(TaskStatus.SCHEDULED)).toBe('scheduled');
    });

    it('asks for nothing on every other status', () => {
        // Pinned exhaustively rather than spot-checked: a new status that needs a
        // second field must be added to this module, and this is what notices.
        const noFollowUp = [
            TaskStatus.OPEN,
            TaskStatus.IN_PROGRESS,
            TaskStatus.NEEDS_INFO,
            TaskStatus.DEFERRED,
            TaskStatus.DONE,
            TaskStatus.CANCELLED,
            TaskStatus.PENDING
        ];
        for (const status of noFollowUp) {
            expect(statusFollowUpKind(status)).toBeNull();
        }
    });
});

describe('buildFollowUpPatch', () => {
    it('trims a block reason', () => {
        expect(buildFollowUpPatch('blocked', { blockReason: '  waiting on DBA  ' })).toEqual({
            block_reason: 'waiting on DBA'
        });
    });

    it('stores a blank block reason as null rather than an invisible half-value', () => {
        expect(buildFollowUpPatch('blocked', { blockReason: '   ' })).toEqual({
            block_reason: null
        });
    });

    it('carries the scheduled date and time', () => {
        expect(
            buildFollowUpPatch('scheduled', { scheduledDate: '2026-09-01', scheduledTime: '09:30' })
        ).toEqual({ scheduled_date: '2026-09-01', scheduled_time: '09:30' });
    });

    it('allows a scheduled date with no time', () => {
        expect(buildFollowUpPatch('scheduled', { scheduledDate: '2026-09-01' })).toEqual({
            scheduled_date: '2026-09-01',
            scheduled_time: null
        });
    });

    it('nulls a scheduled date the user cleared', () => {
        expect(buildFollowUpPatch('scheduled', { scheduledDate: '' })).toEqual({
            scheduled_date: null,
            scheduled_time: null
        });
    });

    it('never mixes the two kinds, so a blocked patch cannot carry a date', () => {
        expect(
            buildFollowUpPatch('blocked', {
                blockReason: 'waiting',
                scheduledDate: '2026-09-01'
            })
        ).toEqual({ block_reason: 'waiting' });
    });
});
