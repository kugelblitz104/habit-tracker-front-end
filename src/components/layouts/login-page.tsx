import { Login } from '@/features/auth/api/login';
import {
    settingsPrimaryButtonClass,
    settingsPrimaryButtonStyle
} from '@/features/settings/components/settings-card';
import { useAuth } from '@/lib/auth-context';
import { sanitizeFormData, sanitizeUsername } from '@/lib/input-sanitization';
import { Button, Fieldset } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { TextField } from '../ui/forms/text-field';

interface ILoginFormInput {
    username: string;
    password: string;
}

export const LoginPage = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const { authorize, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const methods = useForm<ILoginFormInput>();
    const errors = methods.formState.errors;
    const onSubmit: SubmitHandler<ILoginFormInput> = async (data) => {
        setIsSubmitting(true);
        setLoginError(null);

        // Sanitize form inputs
        const sanitizedData = sanitizeFormData(data, {
            username: sanitizeUsername,
            password: (pwd: string) => pwd.trim() // Don't modify password too much
        });

        try {
            const response = await Login(sanitizedData.username, sanitizedData.password);

            // Store tokens using auth context
            authorize(response.access_token, response.refresh_token);

            // Redirect to home page
            navigate('/', { replace: true });
        } catch (error) {
            console.error('Login error:', error);
            setLoginError('Login failed. Please check your credentials and try again.');
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
            style={{ backgroundColor: 'var(--bg)' }}
        >
            <div className='w-full max-w-[400px]'>
                <header className='mb-6 text-center'>
                    <h1 className='font-display text-[24px] font-bold text-text-primary'>
                        Habit Tracker
                    </h1>
                    <p className='mt-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted'>
                        Sign in to continue
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
                                />
                                <TextField
                                    isRequired
                                    label='Password'
                                    name='password'
                                    type='password'
                                    isValid={!errors.password}
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
                                    {isSubmitting ? 'Signing in...' : 'Sign in'}
                                </Button>
                                {loginError && (
                                    <div className='font-mono text-[11px] text-danger'>
                                        {loginError}
                                    </div>
                                )}
                                <div className='text-center text-[13px] text-text-muted'>
                                    Don't have an account?{' '}
                                    <Link
                                        to='/register'
                                        className='text-text-secondary-soft transition-colors hover:text-now-accent'
                                    >
                                        Register
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
