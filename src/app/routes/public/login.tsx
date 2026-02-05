import { LoginPage } from '@/components/layouts/login-page';
import type { Route } from './+types/login';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Login' },
        {
            description: 'Login to your account',
            content: 'Login page for users to access their accounts'
        }
    ];
}

export default function Login() {
    return <LoginPage />;
}
