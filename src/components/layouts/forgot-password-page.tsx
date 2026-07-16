import { AuthSubmitButton } from '@/components/ui/buttons/auth-submit-button';
import { ForgotPassword } from '@/features/auth/api/forgot-password';
import { sanitizeEmail, sanitizeFormData, validationPatterns } from '@/lib/input-sanitization';
import { Fieldset } from '@headlessui/react';
import { useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { Link } from 'react-router';
import { TextField } from '../ui/forms/text-field';
import { AuthCardLayout } from './auth-card-layout';

interface IForgotPasswordFormInput {
    email: string;
}

/**
 * Request a password-reset link. The backend returns the same generic response
 * whether or not the email is registered, so on success we always show the same
 * neutral confirmation (never confirming an account exists).
 */
export const ForgotPasswordPage = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const methods = useForm<IForgotPasswordFormInput>();
    const errors = methods.formState.errors;

    const onSubmit: SubmitHandler<IForgotPasswordFormInput> = async (data) => {
        setIsSubmitting(true);
        setError(null);

        const { email } = sanitizeFormData(data, { email: sanitizeEmail });

        try {
            await ForgotPassword({ email });
            setSubmitted(true);
        } catch (err) {
            console.error('Forgot-password error:', err);
            // A failure here is a server/network problem — the request itself
            // never reveals whether the account exists.
            setError('Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <AuthCardLayout subtitle='Check your email'>
                <div className='space-y-4'>
                    <p className='text-[13px] leading-relaxed text-text-secondary'>
                        If an account exists for that email, we've sent a link to reset your
                        password. The link expires in 30 minutes.
                    </p>
                    <p className='font-mono text-[11px] text-text-faint'>
                        Didn't get it? Check your spam folder, or try again.
                    </p>
                    <div className='text-center text-[13px] text-text-muted'>
                        <Link
                            to='/login'
                            className='text-text-secondary-soft transition-colors hover:text-now-accent'
                        >
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </AuthCardLayout>
        );
    }

    return (
        <AuthCardLayout subtitle='Reset your password'>
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className='space-y-4'>
                    <p className='text-[13px] leading-relaxed text-text-secondary'>
                        Enter your account email and we'll send you a link to choose a new
                        password.
                    </p>
                    <Fieldset className='space-y-4'>
                        <TextField
                            isRequired
                            label='Email'
                            name='email'
                            type='email'
                            isValid={!errors.email}
                            validation={validationPatterns.email}
                        />
                    </Fieldset>
                    <div className='flex flex-col gap-3'>
                        <AuthSubmitButton
                            isSubmitting={isSubmitting}
                            submittingLabel='Sending...'
                            label='Send reset link'
                        />
                        {error && (
                            <div className='font-mono text-[11px] text-danger'>{error}</div>
                        )}
                        <div className='text-center text-[13px] text-text-muted'>
                            Remembered it?{' '}
                            <Link
                                to='/login'
                                className='text-text-secondary-soft transition-colors hover:text-now-accent'
                            >
                                Sign in
                            </Link>
                        </div>
                    </div>
                </form>
            </FormProvider>
        </AuthCardLayout>
    );
};
