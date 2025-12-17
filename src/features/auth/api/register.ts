import { AuthenticationService, type Token, type UserCreate } from '@/api';

export const Register = async (user: UserCreate): Promise<Token> => {
    return await AuthenticationService.registerAuthRegisterPost(user);
};
