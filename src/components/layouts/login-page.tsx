import { Login } from '@/features/auth/api/login';
import { useAuth } from '@/lib/auth-context';
import { sanitizeFormData, sanitizeUsername } from '@/lib/input-sanitization';
import { Button, Fieldset } from '@headlessui/react';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { TextField } from '../ui/forms/text-field';
import { TitleBar } from '../ui/title-bar';
import { PageShell } from '../ui/page-shell';

interface ILoginFormInput {
    username: string;
    password: string;
}

export const LoginForm = () => {
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
        <PageShell title='Login'>
            <div className='flex items-center justify-center mt-8 mx-4'>
                <div className='w-full max-w-md '>
                    <FormProvider {...methods}>
                        <form
                            className='bg-slate-800 rounded-md p-4'
                            onSubmit={methods.handleSubmit(onSubmit)}
                        >
                            <Fieldset className='space-y-1'>
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
                            <div className='flex items-center gap-3'>
                                <Button
                                    disabled={isSubmitting}
                                    type='submit'
                                    className={classNames('bg-sky-500 rounded-md px-4 py-2', {
                                        'bg-sky-950': isSubmitting
                                    })}
                                >
                                    {isSubmitting ? 'Logging in...' : 'Login'}
                                </Button>
                                {isSubmitting && (
                                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500'></div>
                                )}
                            </div>
                        </form>
                    </FormProvider>
                    {loginError && <div className='text-red-500 mt-2'>{loginError}</div>}
                    <div className='mt-4 text-center'>
                        Don't have an account?{' '}
                        <Link to='/register' className='text-sky-400 underline'>
                            Register
                        </Link>
                    </div>
                </div>
            </div>
        </PageShell>
    );
};
