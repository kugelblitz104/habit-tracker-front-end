import type { QueryClient } from '@tanstack/react-query';

/**
 * Query keys for the projects feature. `lists`/`details` stay the 1-element
 * `['projects']`/`['project']` tuples — prefix matches over every filtered
 * list and every single-project detail query, not one specific query.
 */
export const projectKeys = {
    lists: () => ['projects'] as const,
    details: () => ['project'] as const,
    detail: (projectId: number) => ['project', { projectId }] as const
};

export const invalidateProjects = (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    queryClient.invalidateQueries({ queryKey: projectKeys.details() });
};
