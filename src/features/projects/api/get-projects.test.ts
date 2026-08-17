import { ProjectsService, type ProjectRead } from '@/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProjects } from './get-projects';

const project = (id: number) => ({ id, name: `Project ${id}` }) as ProjectRead;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getProjects', () => {
    it('walks every page so a client-side lookup sees all projects', async () => {
        const total = 250;
        const spy = vi.spyOn(ProjectsService, 'listProjectsProjectsGet').mockImplementation((async (
            _profileId: number,
            _includeArchived: boolean,
            limit: number,
            offset: number
        ) => ({
            projects: Array.from({ length: Math.min(limit, total - offset) }, (_, i) =>
                project(offset + i)
            ),
            total,
            limit,
            offset
        })) as never);

        const result = await getProjects(1, true);

        expect(result.projects).toHaveLength(total);
        expect(result.total).toBe(total);
        expect(spy).toHaveBeenCalledTimes(3);
        // includeArchived must survive the walk, on every request.
        expect(spy.mock.calls.every((call) => call[1] === true)).toBe(true);
    });

    it('makes one request when everything fits on a page', async () => {
        const spy = vi.spyOn(ProjectsService, 'listProjectsProjectsGet').mockResolvedValue({
            projects: [project(1)],
            total: 1,
            limit: 100,
            offset: 0
        } as never);

        const result = await getProjects(1);

        expect(result.projects).toHaveLength(1);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
