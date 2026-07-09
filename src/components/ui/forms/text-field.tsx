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

// Shared theme tokens so form fields read like the task editor surface
// (mono uppercase micro-labels + themed input treatment) instead of the old
// black-background inputs.
const labelClass =
    'mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint';

const fieldClass =
    'block w-full rounded-button border px-2.5 py-1.5 font-mono text-[12px] text-text-secondary outline-none transition-colors placeholder:text-text-faint focus-visible:ring-1 focus-visible:ring-now-accent';

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
        <Field className='mb-3'>
            {label && <Label className={labelClass}>{label}</Label>}
            <Input
                className={fieldClass}
                style={{
                    backgroundColor: 'var(--surface-input-bg)',
                    borderColor: isValid ? 'var(--surface-input-border)' : 'var(--color-danger)'
                }}
                {...register(name, {
                    required: isRequired ? 'This field is required' : false,
                    ...validation
                })}
                type={type}
                placeholder={placeholder}
                aria-invalid={!isValid}
                aria-describedby={`${name}-error`}
            />
            {fieldError && (
                <span id={`${name}-error`} className='mt-1 block text-[11px] text-red-400'>
                    {(fieldError.message as string) || errorMessage}
                </span>
            )}
        </Field>
    );
};
