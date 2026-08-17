import { describe, expect, it } from 'vitest';
import { rankHabits, timeByProject } from './insights-utils';
import { makeProject, makeTimeEntry } from '@/test-support/factories';

const WINDOW_START = new Date(2026, 7, 1).getTime();
const WINDOW_END = new Date(2026, 7, 8).getTime();
const inWindow = '2026-08-04T09:00:00';

describe('timeByProject', () => {
    it('attributes an entry to its resolved project, not its stored one', () => {
        const project = makeProject({ name: 'Alpha' });
        // The API nulls project_id on any task-attached entry and reports the
        // rollup in resolved_project_id.
        const entry = makeTimeEntry({
            started_at: inWindow,
            duration_seconds: 300,
            task_id: 7,
            project_id: null,
            resolved_project_id: project.id
        });

        const result = timeByProject([entry], [project], WINDOW_START, WINDOW_END);

        expect(result).toEqual([
            { projectId: project.id, name: 'Alpha', color: project.color, seconds: 300 }
        ]);
    });

    it('sums a parent task entry and a subtask entry into one project', () => {
        const project = makeProject({ name: 'Alpha' });
        // task_id is set on both, so the API's stored project_id is null on
        // both (task-attached entries never carry one) - only resolved_project_id
        // carries the rollup.
        const onParent = makeTimeEntry({
            started_at: inWindow,
            duration_seconds: 100,
            task_id: 1,
            resolved_project_id: project.id
        });
        const onSubtask = makeTimeEntry({
            started_at: inWindow,
            duration_seconds: 25,
            task_id: 2,
            resolved_project_id: project.id
        });

        const result = timeByProject([onParent, onSubtask], [project], WINDOW_START, WINDOW_END);

        expect(result).toHaveLength(1);
        expect(result[0]!.projectId).toBe(project.id);
        expect(result[0]!.seconds).toBe(125);
    });

    it('keeps an adhoc entry on its own project', () => {
        const project = makeProject({ name: 'Alpha' });
        const entry = makeTimeEntry({
            started_at: inWindow,
            duration_seconds: 60,
            task_id: null,
            project_id: project.id,
            resolved_project_id: project.id
        });

        const result = timeByProject([entry], [project], WINDOW_START, WINDOW_END);

        expect(result[0]!.projectId).toBe(project.id);
        expect(result[0]!.seconds).toBe(60);
    });

    it('buckets an unresolved entry under No project', () => {
        // A null resolved_project_id always implies a null stored project_id
        // (the API only leaves it unresolved when the entry, and its task's
        // parent chain, never had one), so this case can't distinguish the two
        // keys and isn't trying to - it pins the "No project" bucket naming.
        const entry = makeTimeEntry({
            started_at: inWindow,
            duration_seconds: 45,
            resolved_project_id: null
        });

        const result = timeByProject([entry], [], WINDOW_START, WINDOW_END);

        expect(result[0]!.projectId).toBeNull();
        expect(result[0]!.name).toBe('No project');
    });

    it('treats a missing resolved_project_id as No project', () => {
        // Same reasoning as above: an unresolved entry's stored project_id is
        // also null, so this pins undefined-handling, not the key choice.
        // The field is optional in the generated client, so undefined is
        // reachable from an older cached payload.
        const entry = makeTimeEntry({ started_at: inWindow, duration_seconds: 10 });
        delete (entry as { resolved_project_id?: number | null }).resolved_project_id;

        const result = timeByProject([entry], [], WINDOW_START, WINDOW_END);

        expect(result[0]!.projectId).toBeNull();
    });

    it('excludes entries outside the window', () => {
        const project = makeProject();
        const entry = makeTimeEntry({
            started_at: '2026-07-01T09:00:00',
            duration_seconds: 999,
            task_id: 3,
            resolved_project_id: project.id
        });

        expect(timeByProject([entry], [project], WINDOW_START, WINDOW_END)).toEqual([]);
    });

    it('sorts projects by descending time', () => {
        const small = makeProject({ name: 'Small' });
        const big = makeProject({ name: 'Big' });
        const entries = [
            makeTimeEntry({
                started_at: inWindow,
                duration_seconds: 10,
                resolved_project_id: small.id
            }),
            makeTimeEntry({
                started_at: inWindow,
                duration_seconds: 500,
                resolved_project_id: big.id
            })
        ];

        const result = timeByProject(entries, [small, big], WINDOW_START, WINDOW_END);

        expect(result.map((p) => p.name)).toEqual(['Big', 'Small']);
    });
});

describe('rankHabits', () => {
    const habit = (name: string, currentStreak: number, completionRate: number) => ({
        name,
        currentStreak,
        completionRate
    });

    it('ranks by streak ahead of completion rate', () => {
        const result = rankHabits(
            [habit('perfect-no-streak', 0, 100), habit('short-streak', 3, 20)],
            5
        );

        expect(result.map((h) => h.name)).toEqual(['short-streak', 'perfect-no-streak']);
    });

    it('ranks by completion rate when nothing is on a streak', () => {
        const result = rankHabits([habit('low', 0, 10), habit('high', 0, 90)], 5);

        expect(result.map((h) => h.name)).toEqual(['high', 'low']);
    });

    it('breaks a streak tie with the completion rate', () => {
        const result = rankHabits([habit('worse', 4, 30), habit('better', 4, 80)], 5);

        expect(result.map((h) => h.name)).toEqual(['better', 'worse']);
    });

    it('keeps only the first `limit` habits', () => {
        const habits = [1, 2, 3, 4, 5, 6, 7].map((n) => habit(`h${n}`, n, 0));

        const result = rankHabits(habits, 5);

        expect(result.map((h) => h.name)).toEqual(['h7', 'h6', 'h5', 'h4', 'h3']);
    });

    it('leaves the input array untouched', () => {
        const habits = [habit('a', 0, 10), habit('b', 5, 10)];

        rankHabits(habits, 5);

        expect(habits.map((h) => h.name)).toEqual(['a', 'b']);
    });
});
