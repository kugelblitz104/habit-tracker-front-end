import { UsersService } from '@/api';

export const deleteUser = async (userId: number): Promise<void> => {
    if (!userId) throw new Error('userId is required');
    await UsersService.deleteUserUsersUserIdDelete(userId);
};
