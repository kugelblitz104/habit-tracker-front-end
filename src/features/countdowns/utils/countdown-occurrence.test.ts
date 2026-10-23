import { describe, expect, it } from 'vitest';

import { parseLocalDate } from '@/lib/date-utils';
import parityDoc from '@/test-support/countdown-occurrence-cases.json';

import { type CountdownRepeat, nextOccurrence } from './countdown';

/**
 * Cross-repo parity for countdown recurrence.
 *
 * The API re-implements `nextOccurrence` as `services/notifications.next_occurrence`
 * so it knows when a repeating countdown next fires a push reminder. Both repos run
 * this committed table (`src/test-support/countdown-occurrence-cases.json`), read
 * by the API's `tests/test_countdown_occurrence.py` too, so a change to either side
 * without the other turns one suite red.
 *
 * The zone is pinned to America/New_York, because two cases cross its 2026 DST
 * changes and a zone without DST would pass them vacuously. Node re-reads
 * `process.env.TZ` when it is assigned, and vitest runs each file in its own worker.
 */
process.env.TZ = 'America/New_York';

describe('nextOccurrence parity', () => {
    it.each(parityDoc.cases)('$name', ({ anchor, repeat, on_or_after, expected }) => {
        expect(nextOccurrence(anchor, repeat as CountdownRepeat, parseLocalDate(on_or_after))).toBe(
            expected
        );
    });
});
