import { Field, Input, Label } from '@headlessui/react';
import { useFormContext, type RegisterOptions } from 'react-hook-form';

type TextFieldProps = {
    name: string;
    label?: string;
    placeholder?: string;
    isRequired?: boolean;
    isValid?: boolean;
    type?: string;
    validation?: RegisterOptions;
    errorMessage?: string;
};

export const TextField = ({
    name,
    label,
    placeholder = '',
    isRequired = false,
    isValid = true,
    type = 'text',
    validation,
    errorMessage
}: TextFieldProps) => {
    const {
        register,
        formState: { errors }
    } = useFormContext();

    const fieldError = errors[name];

    return (
        <Field className='my-2'>
            {label && <Label className='block'>{label}</Label>}
            <Input
                className={`block bg-black 
                    ${!isValid && 'border-2 border-red-500'}
                    ${isValid && 'border-slate'} 
                    rounded-md py-1 px-2 w-full`}
                {...register(name, {
                    required: isRequired ? 'This field is required' : false,
                    ...validation
                })}
                type={type}
                placeholder={placeholder}
            />
            {fieldError && (
                <span className='text-red-400 text-sm'>
                    {(fieldError.message as string) || errorMessage}
                </span>
            )}
        </Field>
    );
};
