import { ResetPasswordPage } from '@/components/layouts/reset-password-page';
import type { Route } from './+types/reset-password';

export function meta({}: Route.MetaArgs) {
    return [
        { title: 'Reset password' },
        {
            description: 'Choose a new password',
            content: 'Set a new password for your Habit Tracker account'
        }
    ];
}

export default function ResetPassword() {
    return <ResetPasswordPage />;
}
