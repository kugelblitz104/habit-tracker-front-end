import { UsersService, type UserRead } from '@/api';

export const getUser = async (userId?: number): Promise<UserRead> => {
    if (!userId) throw new Error('userId is required');
    return await UsersService.readUserUsersUserIdGet(userId);
};
