import { RegistrationPage } from '@/components/layouts/registration-page';
import type { Route } from './+types/register';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Register' },
        {
            description: 'Register a new account',
            content: 'Registration page for new users to create an account'
        }
    ];
}

export default function Register() {
    return <RegistrationPage />;
}
