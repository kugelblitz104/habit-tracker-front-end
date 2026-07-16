import { AuthSubmitButton } from '@/components/ui/buttons/auth-submit-button';
import { ResetPassword } from '@/features/auth/api/reset-password';
import { validationPatterns } from '@/lib/input-sanitization';
import { Fieldset } from '@headlessui/react';
import { useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';
import { TextField } from '../ui/forms/text-field';
import { AuthCardLayout } from './auth-card-layout';

interface IResetPasswordFormInput {
    password: string;
    confirmPassword: string;
}

/**
 * Consume the `?token=` from the emailed reset link and set a new password.
 * A missing token (link opened without one) shows a dead-end with a path back
 * to request a fresh link; a bad/expired token surfaces the backend's 400.
 */
export const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const methods = useForm<IResetPasswordFormInput>();
    const errors = methods.formState.errors;

    const onSubmit: SubmitHandler<IResetPasswordFormInput> = async (data) => {
        if (!token) return;
        setIsSubmitting(true);
        setError(null);

        try {
            await ResetPassword({ token, new_password: data.password.trim() });
            toast.success('Password reset. Please sign in.');
            navigate('/login', { replace: true });
        } catch (err) {
            console.error('Reset-password error:', err);
            const apiError = err as { body?: { detail?: string } };
            setError(
                (typeof apiError.body?.detail === 'string' && apiError.body.detail) ||
                    'This reset link is invalid or has expired. Request a new one.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!token) {
        return (
            <AuthCardLayout subtitle='Reset your password'>
                <div className='space-y-4'>
                    <p className='text-[13px] leading-relaxed text-text-secondary'>
                        This reset link is missing or malformed. Request a new one to
                        continue.
                    </p>
                    <div className='text-center text-[13px] text-text-muted'>
                        <Link
                            to='/forgot-password'
                            className='text-text-secondary-soft transition-colors hover:text-now-accent'
                        >
                            Request a new link
                        </Link>
                    </div>
                </div>
            </AuthCardLayout>
        );
    }

    return (
        <AuthCardLayout subtitle='Choose a new password'>
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className='space-y-4'>
                    <Fieldset className='space-y-4'>
                        <TextField
                            isRequired
                            label='New password'
                            name='password'
                            type='password'
                            isValid={!errors.password}
                            validation={validationPatterns.password}
                        />
                        <TextField
                            isRequired
                            label='Confirm password'
                            name='confirmPassword'
                            type='password'
                            isValid={!errors.confirmPassword}
                            validation={{
                                validate: (value: string) =>
                                    value === methods.getValues('password') ||
                                    'Passwords do not match'
                            }}
                        />
                    </Fieldset>
                    <div className='flex flex-col gap-3'>
                        <AuthSubmitButton
                            isSubmitting={isSubmitting}
                            submittingLabel='Resetting...'
                            label='Reset password'
                        />
                        {error && (
                            <div className='font-mono text-[11px] text-danger'>{error}</div>
                        )}
                        <div className='text-center text-[13px] text-text-muted'>
                            <Link
                                to='/login'
                                className='text-text-secondary-soft transition-colors hover:text-now-accent'
                            >
                                Back to sign in
                            </Link>
                        </div>
                    </div>
                </form>
            </FormProvider>
        </AuthCardLayout>
    );
};
