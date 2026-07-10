import type { UserCreate } from '@/api';
import { Register } from '@/features/auth/api/register';
import {
    settingsPrimaryButtonClass,
    settingsPrimaryButtonStyle
} from '@/features/settings/components/settings-card';
import { useAuth } from '@/lib/auth-context';
import {
    sanitizeEmail,
    sanitizeFormData,
    sanitizeUsername,
    validationPatterns
} from '@/lib/input-sanitization';
import { Button, Fieldset } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { TextField } from '../ui/forms/text-field';

interface IRegistrationFormInput {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    plaintext_password: string;
}

export const RegistrationPage = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [registrationError, setRegistrationError] = useState<string | null>(null);
    const { authorize, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const methods = useForm<IRegistrationFormInput>();
    const errors = methods.formState.errors;
    const onSubmit: SubmitHandler<IRegistrationFormInput> = async (data) => {
        setIsSubmitting(true);
        setRegistrationError(null);

        // Sanitize form inputs
        const registrationRequest: UserCreate = sanitizeFormData(data, {
            username: sanitizeUsername,
            first_name: (fname: string) => fname.trim(),
            last_name: (lname: string) => lname.trim(),
            email: sanitizeEmail,
            plaintext_password: (pwd: string) => pwd.trim() // Don't modify password too much
        });

        try {
            const response = await Register(registrationRequest);

            authorize(response.access_token, response.refresh_token);
        } catch (error) {
            console.error('Registration Error:', error);

            // Extract error message from API error
            if (error && typeof error === 'object' && 'body' in error) {
                const apiError = error as { body?: { detail?: string } };
                setRegistrationError(apiError.body?.detail || 'Registration failed');
            } else {
                setRegistrationError('Registration failed');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    return (
        <div
            className='flex min-h-screen flex-col items-center justify-center px-4 py-10'
            style={{ backgroundColor: 'transparent' }}
        >
            <div className='w-full max-w-[400px]'>
                <header className='mb-6 text-center'>
                    <h1 className='font-display text-[24px] font-bold text-text-primary'>
                        Habit Tracker
                    </h1>
                    <p className='mt-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted'>
                        Create your account
                    </p>
                </header>
                <div
                    className='rounded-card border p-5 md:p-6'
                    style={{
                        backgroundColor: 'var(--surface-card-bg)',
                        borderColor: 'var(--surface-card-border)'
                    }}
                >
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)} className='space-y-4'>
                            <Fieldset className='space-y-4'>
                                <TextField
                                    isRequired
                                    label='Username'
                                    name='username'
                                    isValid={!errors.username}
                                    validation={validationPatterns.username}
                                />
                                <TextField
                                    isRequired
                                    label='First Name'
                                    name='first_name'
                                    isValid={!errors.first_name}
                                />
                                <TextField
                                    isRequired
                                    label='Last Name'
                                    name='last_name'
                                    isValid={!errors.last_name}
                                />
                                <TextField
                                    isRequired
                                    label='Email'
                                    name='email'
                                    isValid={!errors.email}
                                    validation={validationPatterns.email}
                                />
                                <TextField
                                    isRequired
                                    label='Password'
                                    name='plaintext_password'
                                    type='password'
                                    isValid={!errors.plaintext_password}
                                    validation={validationPatterns.password}
                                />
                            </Fieldset>
                            <div className='flex flex-col gap-3'>
                                <Button
                                    disabled={isSubmitting}
                                    type='submit'
                                    className={`${settingsPrimaryButtonClass} flex w-full items-center justify-center gap-2`}
                                    style={settingsPrimaryButtonStyle}
                                >
                                    {isSubmitting && (
                                        <span
                                            aria-hidden='true'
                                            className='h-3.5 w-3.5 animate-spin rounded-full border-b-2'
                                            style={{ borderColor: 'var(--button-primary-text)' }}
                                        ></span>
                                    )}
                                    {isSubmitting ? 'Creating account...' : 'Create account'}
                                </Button>
                                {registrationError && (
                                    <div className='font-mono text-[11px] text-danger'>
                                        {registrationError}
                                    </div>
                                )}
                                <div className='text-center text-[13px] text-text-muted'>
                                    Already have an account?{' '}
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
                </div>
            </div>
        </div>
    );
};
