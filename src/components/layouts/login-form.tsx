import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { TitleBar } from '../ui/title-bar';
import { useAuth } from '@/lib/auth-context';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { Button, Fieldset } from '@headlessui/react';
import { Login } from '@/features/auth/api/login';
import { TextField } from '../ui/forms/text-field';

type LoginFormProps = {};

interface ILoginFormInput {
    username: string;
    password: string;
}

export const LoginForm = (props: LoginFormProps) => {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const methods = useForm<ILoginFormInput>();
    const errors = methods.formState.errors;
    const onSubmit: SubmitHandler<ILoginFormInput> = async (data) => {
        const response = await Login(data.username, data.password);

        // Store tokens using auth context
        login(response.access_token, response.refresh_token);

        // Redirect to home page
        navigate('/', { replace: true });
    };

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    return (
        <>
            <TitleBar title='Login' />
            <FormProvider {...methods}>
                <form
                    className='
                            bg-slate-800
                            rounded-md
                            p-4
                            max-w-lg
                            mx-auto
                            mt-8
                            '
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
                    <Button
                        type='submit'
                        className='bg-sky-500 rounded-md px-4 py-2'
                    >
                        Login
                    </Button>
                </form>
            </FormProvider>
        </>
    );
};
