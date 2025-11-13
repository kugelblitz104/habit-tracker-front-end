import { AuthenticationService, type Token } from '@/api';

export const Login = async (
    username: string,
    password: string
): Promise<Token> => {
    return await AuthenticationService.loginAuthLoginPost({
        username,
        password
    });
};
