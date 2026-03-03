import { UsersService } from '@/api';

export const deleteUser = async (userId: number): Promise<void> => {
    if (!userId) throw new Error('userId is required');
    await UsersService.deleteUserUsersUserIdDelete(userId);
};

export const deleteUserTrackers = async (userId: number): Promise<void> => {
    if (!userId) throw new Error('userId is required');
    await UsersService.deleteAllTrackersForUserUsersTrackersDelete(userId);
};

export const deleteUserHabits = async (userId: number): Promise<void> => {
    if (!userId) throw new Error('userId is required');
    await UsersService.deleteAllHabitsForUserUsersHabitsDelete(userId);
};
