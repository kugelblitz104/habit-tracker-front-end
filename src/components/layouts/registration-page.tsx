import type { UserCreate } from '@/api';
import { AuthSubmitButton } from '@/components/ui/buttons/auth-submit-button';
import { Register } from '@/features/auth/api/register';
import { useAuth } from '@/lib/auth-context';
import {
    sanitizeEmail,
    sanitizeFormData,
    sanitizeUsername,
    validationPatterns
} from '@/lib/input-sanitization';
import { Fieldset } from '@headlessui/react';
import { useEffect, useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { TextField } from '../ui/forms/text-field';
import { AuthCardLayout } from './auth-card-layout';

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
        <AuthCardLayout subtitle='Create your account'>
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
                        <AuthSubmitButton
                            isSubmitting={isSubmitting}
                            submittingLabel='Creating account...'
                            label='Create account'
                        />
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
        </AuthCardLayout>
    );
};
