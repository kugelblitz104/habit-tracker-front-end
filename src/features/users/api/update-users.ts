import { UsersService, type UserRead, type UserUpdate } from '@/api';

export const updateUser = async (userID: number, userUpdate: UserUpdate): Promise<UserRead> => {
    if (!userID) throw new Error('userID is required');
    return await UsersService.patchUserUsersUserIdPatch(userID, userUpdate);
};
