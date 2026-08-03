import { describe, expect, it } from 'vitest';
import { habitDetailPath, parseEntityRef, projectDetailPath, taskDetailPath } from './entity-ref';

describe('taskDetailPath', () => {
    it('uses the slug when the task has one', () => {
        expect(taskDetailPath({ id: 172, slug: 'setup-utilities' })).toBe('/tasks/setup-utilities');
    });

    // Every task the API returns has a slug, so these two cover call sites that
    // hold an id without the task (a search-state `openTaskId`, a countdown's
    // `task_id`) rather than any real slug-less task.
    it('falls back to the id when the slug is absent', () => {
        expect(taskDetailPath({ id: 172 })).toBe('/tasks/172');
    });

    it('falls back to the id when the slug is null', () => {
        expect(taskDetailPath({ id: 172, slug: null })).toBe('/tasks/172');
    });
});

describe('projectDetailPath / habitDetailPath', () => {
    it('builds a project path under /projects', () => {
        expect(projectDetailPath({ id: 2, slug: 'alpha-project' })).toBe('/projects/alpha-project');
        expect(projectDetailPath({ id: 2 })).toBe('/projects/2');
    });

    it('builds a habit path under /habits, not the old /details', () => {
        expect(habitDetailPath({ id: 7, slug: 'daily-stretch' })).toBe('/habits/daily-stretch');
        expect(habitDetailPath({ id: 7 })).toBe('/habits/7');
    });
});

describe('parseEntityRef', () => {
    it('reads an all-digit segment as an id', () => {
        expect(parseEntityRef('172')).toEqual({ id: 172 });
    });

    it('reads a word segment as a slug', () => {
        expect(parseEntityRef('setup-utilities')).toEqual({ slug: 'setup-utilities' });
    });

    it('reads digits split by a hyphen as a slug, not an id', () => {
        // The bug this guards: parseInt('28-41') === 28, which would open a
        // different task. "28-41" is a legal slug (title "28 41").
        expect(parseEntityRef('28-41')).toEqual({ slug: '28-41' });
    });

    it('treats a slug that merely starts with digits as a slug', () => {
        expect(parseEntityRef('1099-forms')).toEqual({ slug: '1099-forms' });
    });

    it('rejects an empty segment', () => {
        expect(parseEntityRef('')).toBeNull();
        expect(parseEntityRef(undefined)).toBeNull();
    });

    it('rejects a zero id rather than issuing a query that cannot match', () => {
        expect(parseEntityRef('0')).toBeNull();
    });

    it('round-trips a slugged task through its own path', () => {
        const task = { id: 172, slug: 'setup-utilities' };
        const segment = taskDetailPath(task).replace('/tasks/', '');
        expect(parseEntityRef(segment)).toEqual({ slug: 'setup-utilities' });
    });

    it('round-trips an id-only ref through its own path', () => {
        const task = { id: 172, slug: null };
        const segment = taskDetailPath(task).replace('/tasks/', '');
        expect(parseEntityRef(segment)).toEqual({ id: 172 });
    });

    it('reads the fallback slug the backend gives an all-digit title as a slug', () => {
        // "2841" slugifies to "task-2841" precisely so this segment can never
        // collide with the numeric id form.
        expect(parseEntityRef('task-2841')).toEqual({ slug: 'task-2841' });
    });
});
