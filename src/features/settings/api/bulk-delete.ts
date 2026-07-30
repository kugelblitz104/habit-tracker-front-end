import {
    CountdownsService,
    HabitsService,
    ProjectsService,
    TasksService,
    TimeEntriesService,
    TrackersService
} from '@/api';

/**
 * Profile-scoped bulk-delete wrappers. Each removes every row of one entity
 * type in the active profile (the backend endpoints honor the same FK side
 * effects as single-row delete: deleting all projects unassigns their tasks,
 * deleting all tasks cascades their time entries and unlinks their countdowns,
 * deleting all habits cascades their trackers). Returns the deleted count for
 * the caller's toast.
 */

const deletedCount = (result: unknown): number =>
    typeof result === 'object' && result !== null && 'deleted' in result
        ? Number((result as { deleted: number }).deleted) || 0
        : 0;

export const deleteAllProjects = async (profileId: number): Promise<number> =>
    deletedCount(await ProjectsService.deleteAllProjectsProjectsDelete(profileId));

export const deleteAllTasks = async (profileId: number): Promise<number> =>
    deletedCount(await TasksService.deleteAllTasksTasksDelete(profileId));

export const deleteAllCountdowns = async (profileId: number): Promise<number> =>
    deletedCount(await CountdownsService.deleteAllCountdownsCountdownsDelete(profileId));

export const deleteAllTimeEntries = async (profileId: number): Promise<number> =>
    deletedCount(await TimeEntriesService.deleteAllTimeEntriesTimeEntriesDelete(profileId));

export const deleteAllHabits = async (profileId: number): Promise<number> =>
    deletedCount(await HabitsService.deleteAllHabitsHabitsDelete(profileId));

export const deleteAllTrackers = async (profileId: number): Promise<number> =>
    deletedCount(await TrackersService.deleteAllTrackersTrackersDelete(profileId));
