import { RegistrationForm } from '@/components/layouts/registration-form';
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
    return <RegistrationForm />;
}
