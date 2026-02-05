import type { UserRead, UserUpdate } from '@/api';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/forms/text-field';
import {
    sanitizeEmail,
    sanitizeFormData,
    sanitizeText,
    validationPatterns
} from '@/lib/input-sanitization';
import { Button, Fieldset } from '@headlessui/react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';

type UpdateUserFormProps = {
    user: UserRead;
    handleUpdateUser: (user: UserUpdate) => void;
};

interface IUpdateUserFormInput {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
}

export const UpdateUserForm = ({ user, handleUpdateUser }: UpdateUserFormProps) => {
    const methods = useForm<IUpdateUserFormInput>({
        values: {
            username: user.username || '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || ''
        }
    });
    const errors = methods.formState.errors;

    const onSubmit: SubmitHandler<IUpdateUserFormInput> = (data) => {
        const sanitizedData = sanitizeFormData(data, {
            username: sanitizeText,
            first_name: sanitizeText,
            last_name: sanitizeText,
            email: sanitizeEmail
        });

        handleUpdateUser({
            username: sanitizedData.username,
            first_name: sanitizedData.first_name,
            last_name: sanitizedData.last_name,
            email: sanitizedData.email
        });
    };

    return (
        <Card title='Update User Information'>
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} className='space-y-4'>
                    <Fieldset className='space-y-4'>
                        <TextField
                            name='username'
                            label='Username'
                            isValid={!errors.username}
                            validation={validationPatterns.username}
                        />
                        <TextField
                            name='first_name'
                            label='First Name'
                            isValid={!errors.first_name}
                            validation={validationPatterns.name}
                        />
                        <TextField
                            name='last_name'
                            label='Last Name'
                            isValid={!errors.last_name}
                            validation={validationPatterns.name}
                        />
                        <TextField
                            name='email'
                            label='Email'
                            type='email'
                            isValid={!errors.email}
                            validation={validationPatterns.email}
                        />
                    </Fieldset>
                    <Button
                        type='submit'
                        className='w-full bg-sky-500 hover:bg-sky-700 rounded-md px-2 py-1'
                    >
                        Submit
                    </Button>
                </form>
            </FormProvider>
        </Card>
    );
};
