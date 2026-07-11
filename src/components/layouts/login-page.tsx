import { AuthSubmitButton } from '@/components/ui/buttons/auth-submit-button';
import { Login } from '@/features/auth/api/login';
import { useAuth } from '@/lib/auth-context';
import { sanitizeFormData, sanitizeUsername } from '@/lib/input-sanitization';
import { Fieldset } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { TextField } from '../ui/forms/text-field';
import { AuthCardLayout } from './auth-card-layout';

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
        <AuthCardLayout subtitle='Sign in to continue'>
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
                        <AuthSubmitButton
                            isSubmitting={isSubmitting}
                            submittingLabel='Signing in...'
                            label='Sign in'
                        />
                        {loginError && (
                            <div className='font-mono text-[11px] text-danger'>{loginError}</div>
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
        </AuthCardLayout>
    );
};
