import type { TaskList, TaskRead } from '@/api';
import { TasksService } from '@/api';
import type { QueryConfig } from '@/lib/react-query';
import type { TaskBand } from '@/types/types';
import { queryOptions, useQuery } from '@tanstack/react-query';

export type TaskListParams = {
    profileId: number | null | undefined;
    projectId?: number | null;
    band?: TaskBand | null;
    status?: number | null;
    includeClosed?: boolean;
    limit?: number;
    offset?: number;
};

export const getTasks = async (params: TaskListParams): Promise<TaskList> => {
    const { profileId, projectId, band, status, includeClosed, limit, offset } = params;
    return await TasksService.listTasksTasksGet(
        profileId!,
        projectId,
        band,
        status,
        includeClosed,
        limit,
        offset
    );
};

export const getTask = async (taskId: number): Promise<TaskRead> => {
    if (!taskId) throw new Error('taskId is required');
    return await TasksService.readTaskTasksTaskIdGet(taskId);
};

export const getTasksQueryOptions = (params: TaskListParams) => {
    const {
        profileId,
        projectId = null,
        band = null,
        status = null,
        includeClosed = false
    } = params;
    return queryOptions({
        queryKey: ['tasks', { profileId, projectId, band, status, includeClosed }],
        queryFn: () => getTasks(params),
        enabled: !!profileId
    });
};

export const getTaskQueryOptions = (taskId: number | null | undefined) => {
    return queryOptions({
        queryKey: ['task', { taskId }],
        queryFn: () => getTask(taskId!),
        enabled: !!taskId
    });
};

type UseTasksOptions = TaskListParams & {
    queryConfig?: QueryConfig<typeof getTasksQueryOptions>;
};

export const useTasks = ({ queryConfig, ...params }: UseTasksOptions) => {
    return useQuery({
        ...getTasksQueryOptions(params),
        ...queryConfig
    });
};

type UseTaskOptions = {
    taskId: number | null | undefined;
    queryConfig?: QueryConfig<typeof getTaskQueryOptions>;
};

export const useTask = ({ taskId, queryConfig }: UseTaskOptions) => {
    return useQuery({
        ...getTaskQueryOptions(taskId),
        ...queryConfig
    });
};
