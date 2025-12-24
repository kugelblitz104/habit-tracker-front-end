import type { UserCreate } from '@/api';
import { Register } from '@/features/auth/api/register';
import { useAuth } from '@/lib/auth-context';
import {
    sanitizeEmail,
    sanitizeFormData,
    sanitizeUsername,
    validationPatterns
} from '@/lib/input-sanitization';
import { Button, Fieldset } from '@headlessui/react';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { TextField } from '../ui/forms/text-field';
import { TitleBar } from '../ui/title-bar';

interface IRegistrationFormInput {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    plaintext_password: string;
}

export const RegistrationForm = () => {
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
        <>
            <TitleBar title='Create Account' />
            <div className='flex items-center justify-center mt-8 mx-4'>
                <div className='w-full max-w-md'>
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
                            <div className='flex items-center gap-3'>
                                <Button
                                    disabled={isSubmitting}
                                    type='submit'
                                    className={classNames('bg-sky-500 rounded-md px-4 py-2', {
                                        'bg-sky-950': isSubmitting
                                    })}
                                >
                                    {isSubmitting ? 'Registering...' : 'Create Account'}
                                </Button>
                                {isSubmitting && (
                                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500'></div>
                                )}
                            </div>
                        </form>
                    </FormProvider>
                    {registrationError && (
                        <div className='text-red-500 mt-2'>{registrationError}</div>
                    )}
                    <div className='mt-4 text-center'>
                        Already have an account?{' '}
                        <Link to='/login' className='text-sky-400 underline'>
                            Login
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};
