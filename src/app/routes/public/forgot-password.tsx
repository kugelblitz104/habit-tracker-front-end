import { ForgotPasswordPage } from '@/components/layouts/forgot-password-page';
import type { Route } from './+types/forgot-password';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Forgot password' },
        {
            description: 'Request a password reset link',
            content: 'Request a link to reset your Habit Tracker password'
        }
    ];
}

export default function ForgotPassword() {
    return <ForgotPasswordPage />;
}
