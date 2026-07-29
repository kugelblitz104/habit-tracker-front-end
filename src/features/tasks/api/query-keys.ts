import type { QueryClient } from '@tanstack/react-query';

/**
 * Query keys for the tasks feature. `lists` must stay the 1-element
 * `['tasks']` tuple — it's a prefix match over every `['tasks', {...}]`
 * filtered list variant, not a specific one.
 */
export const taskKeys = {
    lists: () => ['tasks'] as const,
    detail: (taskId: number) => ['task', { taskId }] as const
};

export const invalidateTasks = (queryClient: QueryClient) =>
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
