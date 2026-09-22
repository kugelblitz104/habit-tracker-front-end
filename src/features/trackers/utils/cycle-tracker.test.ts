import { describe, expect, it } from 'vitest';
import type { TrackerLite, TrackerRead } from '@/api';
import { TrackerStatus } from '@/types/types';
import { cycleTrackerOptimistically } from './cycle-tracker';

const DATE = new Date(2026, 8, 21);

const serverRow = (id: number, status: number = TrackerStatus.COMPLETED): TrackerRead => ({
    id,
    habit_id: 5,
    dated: '2026-09-21',
    status,
    note: null,
    created_date: '2026-09-21T00:00:00'
});

/** Lets the settled promise's `.finally`/`.then` continuations run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type CallOptions = {
    onSuccess?: (data: TrackerRead) => void;
    onError?: (error: unknown) => void;
};

type FakeCall = {
    vars: unknown;
    /** Per-call callbacks, nulled once a later call takes the observer over. */
    opts: CallOptions | null;
    succeed: (data: TrackerRead) => void;
    fail: (error: unknown) => void;
};

/**
 * A stand-in for one TanStack mutation, modelling the observer takeover that
 * makes per-call callbacks unreliable here.
 *
 * `MutationObserver.mutate` keeps the caller's callbacks in a single
 * `#mutateOptions` slot and re-points the observer at a fresh `Mutation`, so a
 * second call while the first is pending leaves the first call's callbacks
 * unreachable: they never fire. The promise handed back by `mutateAsync` comes
 * from `Mutation.execute` and settles either way. This fake reproduces both:
 * starting a call nulls the pending call's `opts`, while every call's promise
 * still settles when the test drives `succeed` / `fail`.
 */
const fakeMutation = () => {
    const calls: FakeCall[] = [];
    let pending: FakeCall | null = null;

    const start = (vars: unknown, opts: CallOptions | null): Promise<TrackerRead> => {
        if (pending) pending.opts = null;
        let resolve!: (data: TrackerRead) => void;
        let reject!: (error: unknown) => void;
        const promise = new Promise<TrackerRead>((res, rej) => {
            resolve = res;
            reject = rej;
        });
        const call: FakeCall = {
            vars,
            opts,
            succeed: (data) => {
                if (pending === call) pending = null;
                call.opts?.onSuccess?.(data);
                resolve(data);
            },
            fail: (error) => {
                if (pending === call) pending = null;
                call.opts?.onError?.(error);
                reject(error);
            }
        };
        pending = call;
        calls.push(call);
        return promise;
    };

    return {
        calls,
        // `useMutation`'s own `mutate` swallows the rejection (`.catch(noop)`).
        mutate: (vars: unknown, opts: CallOptions = {}) => {
            void start(vars, opts).catch(() => {});
        },
        mutateAsync: (vars: unknown) => start(vars, null)
    };
};

const store = (initial: TrackerLite[] = []) => {
    let value = initial;
    return {
        get: () => value,
        patch: (update: (t: TrackerLite[]) => TrackerLite[]) => {
            value = update(value);
        }
    };
};

describe('cycleTrackerOptimistically', () => {
    it('adds a row before the request resolves, then swaps in the server row', async () => {
        const s = store();
        const trackerCreate = fakeMutation();
        const trackerUpdate = fakeMutation();

        cycleTrackerOptimistically({
            habitId: 5,
            date: DATE,
            trackers: s.get(),
            patch: s.patch,
            inFlight: new Set<string>(),
            trackerCreate: trackerCreate as never,
            trackerUpdate: trackerUpdate as never
        });

        expect(s.get()).toHaveLength(1);
        expect(s.get()[0]!.id).toBeLessThan(0);

        trackerCreate.calls[0]!.succeed(serverRow(42));
        await flush();

        expect(s.get()[0]!.id).toBe(42);
    });

    it('rolls the optimistic row back when the create fails', async () => {
        const s = store();
        const trackerCreate = fakeMutation();

        cycleTrackerOptimistically({
            habitId: 5,
            date: DATE,
            trackers: s.get(),
            patch: s.patch,
            inFlight: new Set<string>(),
            trackerCreate: trackerCreate as never,
            trackerUpdate: fakeMutation() as never
        });
        trackerCreate.calls[0]!.fail(new Error('nope'));
        await flush();

        expect(s.get()).toEqual([]);
    });

    it('restores the previous status when an update fails', async () => {
        const existing: TrackerLite = {
            id: 7,
            dated: '2026-09-21',
            status: TrackerStatus.COMPLETED,
            has_note: false
        };
        const s = store([existing]);
        const trackerUpdate = fakeMutation();

        cycleTrackerOptimistically({
            habitId: 5,
            date: DATE,
            trackers: s.get(),
            patch: s.patch,
            inFlight: new Set<string>(),
            trackerCreate: fakeMutation() as never,
            trackerUpdate: trackerUpdate as never
        });

        expect(s.get()[0]!.status).not.toBe(TrackerStatus.COMPLETED);

        trackerUpdate.calls[0]!.fail(new Error('nope'));
        await flush();

        expect(s.get()).toEqual([existing]);
    });

    it('ignores a second click on the same cell while its write is in flight', () => {
        const s = store();
        const inFlight = new Set<string>();
        const trackerCreate = fakeMutation();

        const click = () =>
            cycleTrackerOptimistically({
                habitId: 5,
                date: DATE,
                trackers: s.get(),
                patch: s.patch,
                inFlight,
                trackerCreate: trackerCreate as never,
                trackerUpdate: fakeMutation() as never
            });

        click();
        click();

        expect(trackerCreate.calls).toHaveLength(1);
        expect(s.get()).toHaveLength(1);
    });

    it('still accepts a click on another habit while one write is in flight', () => {
        const inFlight = new Set<string>();
        const first = store();
        const second = store();
        const firstCreate = fakeMutation();
        const secondCreate = fakeMutation();

        cycleTrackerOptimistically({
            habitId: 5,
            date: DATE,
            trackers: first.get(),
            patch: first.patch,
            inFlight,
            trackerCreate: firstCreate as never,
            trackerUpdate: fakeMutation() as never
        });
        cycleTrackerOptimistically({
            habitId: 6,
            date: DATE,
            trackers: second.get(),
            patch: second.patch,
            inFlight,
            trackerCreate: secondCreate as never,
            trackerUpdate: fakeMutation() as never
        });

        expect(firstCreate.calls).toHaveLength(1);
        expect(secondCreate.calls).toHaveLength(1);
        expect(inFlight).toEqual(new Set(['5:2026-09-21', '6:2026-09-21']));
    });

    it('frees the cell again on success and on error', async () => {
        const inFlight = new Set<string>();
        const s = store();
        const create = fakeMutation();
        const update = fakeMutation();

        const click = (mutations: { create: unknown; update: unknown }) =>
            cycleTrackerOptimistically({
                habitId: 5,
                date: DATE,
                trackers: s.get(),
                patch: s.patch,
                inFlight,
                trackerCreate: mutations.create as never,
                trackerUpdate: mutations.update as never
            });

        click({ create, update });
        expect(inFlight.size).toBe(1);
        create.calls[0]!.succeed(serverRow(42));
        await flush();
        expect(inFlight.size).toBe(0);

        // The row now exists, so this takes the update path.
        click({ create, update });
        expect(inFlight.size).toBe(1);
        update.calls[0]!.fail(new Error('nope'));
        await flush();
        expect(inFlight.size).toBe(0);
    });

    it('frees both cells when a second click takes the mutation observer over', async () => {
        // The dashboard grid shares ONE mutation pair across every row, so the
        // second cell's write takes the observer over while the first is still
        // pending. Both cells must still unlock, or a cell that lost its
        // callbacks stops responding to clicks until the surface remounts.
        const inFlight = new Set<string>();
        const first = store();
        const second = store();
        const create = fakeMutation();

        const click = (habitId: number, s: ReturnType<typeof store>) =>
            cycleTrackerOptimistically({
                habitId,
                date: DATE,
                trackers: s.get(),
                patch: s.patch,
                inFlight,
                trackerCreate: create as never,
                trackerUpdate: fakeMutation() as never
            });

        click(5, first);
        click(6, second);
        expect(create.calls).toHaveLength(2);
        expect(inFlight).toEqual(new Set(['5:2026-09-21', '6:2026-09-21']));

        // Settle in flight order: the first call is the one whose per-call
        // callbacks the takeover discarded.
        create.calls[0]!.succeed(serverRow(42));
        create.calls[1]!.succeed(serverRow(43));
        await flush();

        expect(inFlight).toEqual(new Set());
        expect(first.get()[0]!.id).toBe(42);
        expect(second.get()[0]!.id).toBe(43);
    });

    it('rolls back the taken-over cell when its write fails', async () => {
        // Same takeover, error path: the rollback rides the promise too, so a
        // failed write cannot leave a false completion on screen.
        const inFlight = new Set<string>();
        const first = store();
        const second = store();
        const create = fakeMutation();

        const click = (habitId: number, s: ReturnType<typeof store>) =>
            cycleTrackerOptimistically({
                habitId,
                date: DATE,
                trackers: s.get(),
                patch: s.patch,
                inFlight,
                trackerCreate: create as never,
                trackerUpdate: fakeMutation() as never
            });

        click(5, first);
        click(6, second);

        create.calls[0]!.fail(new Error('nope'));
        create.calls[1]!.succeed(serverRow(43));
        await flush();

        expect(inFlight).toEqual(new Set());
        expect(first.get()).toEqual([]);
        expect(second.get()[0]!.id).toBe(43);
    });
});
